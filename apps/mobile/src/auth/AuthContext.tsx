import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiClient, setUnauthorizedHandler } from '../api/client';
import { ApiResponse, CustomerProfile, OwnerProfile } from '../api/types';
import {
    PrincipalType,
    SecureTokenStorage,
    reconcilePendingRevocationQueue,
} from './SecureTokenStorage';
import { PushNotificationService } from '../notifications/PushNotificationService';
import {
    buildLoginPayload,
    TwoFactorCredentials,
    withPasswordConfirmation,
} from './payloads';

export type AuthState =
    | 'idle'
    | 'guest'
    | 'customer_authenticated'
    | 'owner_authenticated'
    | 'logging_out'
    | 'session_expired';

interface AuthContextType {
    authState: AuthState;
    token: string | null;
    principalType: PrincipalType | null;
    accountType: 'customer' | 'partner' | null;
    customerUser: CustomerProfile | null;
    partnerUser: OwnerProfile | null;
    user?: CustomerProfile | null;
    owner?: OwnerProfile | null;
    isLoading: boolean;
    loginCustomer: (
        email: string,
        password: string,
        twoFactor?: TwoFactorCredentials,
    ) => Promise<void>;
    registerCustomer: (data: {
        name: string;
        email: string;
        phone: string;
        password: string;
        terms_accepted: boolean;
        consent_version?: string;
        marketing_consent?: boolean;
    }) => Promise<void>;
    loginPartner: (email: string, password: string) => Promise<void>;
    registerPartner: (data: {
        name: string;
        email: string;
        phone: string;
        password: string;
        property_name: string;
        property_type: string;
        available_for: string;
        city_id?: number | string;
        location?: string;
        locality: string;
        description?: string;
        terms: boolean;
        terms_accepted?: boolean;
    }) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>('idle');
    const [token, setToken] = useState<string | null>(null);
    const [principalType, setPrincipalType] = useState<PrincipalType | null>(
        null,
    );
    const [customerUser, setCustomerUser] = useState<CustomerProfile | null>(
        null,
    );
    const [partnerUser, setPartnerUser] = useState<OwnerProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        void restoreAndVerifySession();
    }, []);

    useEffect(() => {
        setUnauthorizedHandler(() => {
            setToken(null);
            setPrincipalType(null);
            setCustomerUser(null);
            setPartnerUser(null);
            setAuthState('session_expired');
        });

        return () => setUnauthorizedHandler(null);
    }, []);

    /**
     * Safe Session Restoration on App Boot:
     * 1. Read single active session record from hardware-backed SecureStore.
     * 2. Authoritatively validate the bearer token with the backend.
     * 3. Confirm the authenticated principal type.
     * 4. Restore state or safely purge credentials if revoked/expired.
     */
    const restoreAndVerifySession = async () => {
        let currentSession: {
            token: string;
            principalType: PrincipalType;
        } | null = null;
        try {
            setIsLoading(true);

            // Reconcile any pending offline revocations first
            await reconcilePendingRevocations();

            const session = await SecureTokenStorage.getActiveSession();
            currentSession = session;
            if (!session) {
                setAuthState('guest');
                return;
            }

            if (session.token.startsWith('demo_')) {
                await SecureTokenStorage.clearActiveSession();
                setToken(null);
                setPrincipalType(null);
                setAuthState('guest');
                return;
            }

            setToken(session.token);
            setPrincipalType(session.principalType);

            if (session.principalType === 'customer') {
                const res =
                    await ApiClient.get<ApiResponse<CustomerProfile>>(
                        'customer/profile',
                    );
                if (res.data) {
                    setCustomerUser(res.data);
                    setPartnerUser(null);
                    setAuthState('customer_authenticated');
                } else {
                    throw new Error('Invalid customer session');
                }
            } else if (session.principalType === 'owner') {
                const res =
                    await ApiClient.get<ApiResponse<OwnerProfile>>(
                        'owner/profile',
                    );
                if (res.data) {
                    setPartnerUser(res.data);
                    setCustomerUser(null);
                    setAuthState('owner_authenticated');
                } else {
                    throw new Error('Invalid partner session');
                }
            }
        } catch (err: any) {
            // Only clear session if server explicitly rejects token with 401 Unauthenticated
            if (
                err?.status === 401 ||
                err?.errorCode === 'UNAUTHENTICATED' ||
                err?.message?.includes('Unauthenticated')
            ) {
                await SecureTokenStorage.clearActiveSession();
                setToken(null);
                setPrincipalType(null);
                setCustomerUser(null);
                setPartnerUser(null);
                setAuthState('session_expired');
            } else if (currentSession) {
                // Network failure or temporary server timeout: keep the token and
                // principal so requests can resume, but do not invent an identity.
                setToken(currentSession.token);
                setPrincipalType(currentSession.principalType);
                setCustomerUser(null);
                setPartnerUser(null);
                setAuthState(
                    currentSession.principalType === 'customer'
                        ? 'customer_authenticated'
                        : 'owner_authenticated',
                );
            } else {
                setAuthState('guest');
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Reconcile all pending server-side revocations queued during offline logouts.
     */
    const reconcilePendingRevocations = async () => {
        try {
            await reconcilePendingRevocationQueue((endpoint, options) =>
                ApiClient.request(endpoint, options),
            );
        } catch {
            // Ignored
        }
    };

    /**
     * Authenticate Customer: Establishes single Customer principal.
     * Supports login with Email OR Phone number.
     */
    const loginCustomer = async (
        emailOrPhone: string,
        password: string,
        twoFactor?: TwoFactorCredentials,
    ) => {
        setIsLoading(true);
        try {
            // If another session was active, clear it first
            if (token) {
                await logoutInternal(false);
            }

            const res = await ApiClient.post<
                ApiResponse<{ token: string; user: CustomerProfile }>
            >(
                'auth/customer/login',
                buildLoginPayload(
                    emailOrPhone,
                    password,
                    'TIJUM Mobile App',
                    twoFactor,
                ),
            );

            if (!res.success || !res.data) {
                throw new Error(
                    res.message || 'Login failed. Please try again.',
                );
            }

            const newToken = res.data.token;
            if (!newToken || typeof newToken !== 'string') {
                throw new Error('Authentication failed: no token received.');
            }
            if (!res.data.user) {
                throw new Error(
                    'Authentication failed: no user profile received.',
                );
            }

            await SecureTokenStorage.setActiveSession(newToken, 'customer');

            setToken(newToken);
            setPrincipalType('customer');
            setCustomerUser(res.data.user);
            setPartnerUser(null);
            setAuthState('customer_authenticated');

            // Register device for push alerts under this customer principal
            PushNotificationService.registerForPushNotifications(
                'customer',
            ).catch(() => {});
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Register Customer Account with mandatory phone and terms acceptance.
     */
    const registerCustomer = async (data: {
        name: string;
        email: string;
        phone: string;
        password: string;
        terms_accepted: boolean;
        consent_version?: string;
        marketing_consent?: boolean;
    }) => {
        setIsLoading(true);
        try {
            if (token) {
                await logoutInternal(false);
            }

            const res = await ApiClient.post<
                ApiResponse<{ token: string; user: CustomerProfile }>
            >('auth/customer/register', {
                name: data.name,
                email: data.email,
                phone: data.phone,
                password: data.password,
                terms: data.terms_accepted,
                terms_accepted: data.terms_accepted,
                consent_version: data.consent_version ?? 'mobile-1.0',
                marketing_consent: data.marketing_consent ?? false,
                device_name: 'TIJUM Mobile App',
            });

            if (!res.success || !res.data) {
                throw new Error(
                    res.message || 'Registration failed. Please try again.',
                );
            }

            const newToken = res.data.token;
            if (!newToken || typeof newToken !== 'string') {
                throw new Error('Registration failed: no token received.');
            }
            if (!res.data.user) {
                throw new Error(
                    'Registration failed: no user profile received.',
                );
            }

            await SecureTokenStorage.setActiveSession(newToken, 'customer');

            setToken(newToken);
            setPrincipalType('customer');
            setCustomerUser(res.data.user);
            setPartnerUser(null);
            setAuthState('customer_authenticated');

            PushNotificationService.registerForPushNotifications(
                'customer',
            ).catch(() => {});
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Authenticate Partner (Host): Establishes single Owner principal.
     * Supports login with Email OR Phone number.
     */
    const loginPartner = async (emailOrPhone: string, password: string) => {
        setIsLoading(true);
        try {
            if (token) {
                await logoutInternal(false);
            }

            const res = await ApiClient.post<
                ApiResponse<{ token: string; owner: OwnerProfile }>
            >(
                'auth/owner/login',
                buildLoginPayload(
                    emailOrPhone,
                    password,
                    'TIJUM Partner Mobile',
                ),
            );

            if (!res.success || !res.data) {
                throw new Error(
                    res.message || 'Login failed. Please try again.',
                );
            }

            const newToken = res.data.token;
            if (!newToken || typeof newToken !== 'string') {
                throw new Error('Authentication failed: no token received.');
            }
            if (!res.data.owner) {
                throw new Error(
                    'Authentication failed: no owner profile received.',
                );
            }

            await SecureTokenStorage.setActiveSession(newToken, 'owner');

            setToken(newToken);
            setPrincipalType('owner');
            setPartnerUser(res.data.owner);
            setCustomerUser(null);
            setAuthState('owner_authenticated');

            PushNotificationService.registerForPushNotifications(
                'partner',
            ).catch(() => {});
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Register Partner (Host) Account with 10 fields and canonical categories.
     */
    const registerPartner = async (data: {
        name: string;
        email: string;
        phone: string;
        password: string;
        property_name: string;
        property_type: string;
        available_for: string;
        city_id?: number | string;
        location?: string;
        locality: string;
        description?: string;
        terms?: boolean;
        terms_accepted?: boolean;
    }) => {
        setIsLoading(true);
        try {
            if (token) {
                await logoutInternal(false);
            }

            const res = await ApiClient.post<
                ApiResponse<{ token: string; owner: OwnerProfile }>
            >(
                'auth/owner/register',
                withPasswordConfirmation({
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    password: data.password,
                    property_name: data.property_name,
                    property_type: data.property_type,
                    available_for: data.available_for,
                    city_id: data.city_id,
                    location: data.location,
                    locality: data.locality,
                    description: data.description,
                    terms: true,
                    terms_accepted: true,
                    device_name: 'TIJUM Partner Mobile',
                }),
            );

            if (!res.success || !res.data) {
                throw new Error(
                    res.message || 'Registration failed. Please try again.',
                );
            }

            const newToken = res.data.token;
            if (!newToken || typeof newToken !== 'string') {
                throw new Error('Registration failed: no token received.');
            }
            if (!res.data.owner) {
                throw new Error(
                    'Registration failed: no owner profile received.',
                );
            }

            await SecureTokenStorage.setActiveSession(newToken, 'owner');

            setToken(newToken);
            setPrincipalType('owner');
            setPartnerUser(res.data.owner);
            setCustomerUser(null);
            setAuthState('owner_authenticated');

            PushNotificationService.registerForPushNotifications(
                'partner',
            ).catch(() => {});
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Internal Logout: Revokes backend token, disassociates device push registration,
     * purges SecureStore and local caches.
     */
    const logoutInternal = async (transitionToGuest: boolean = true) => {
        setAuthState('logging_out');
        const currentToken = token;
        const currentPrincipal = principalType;

        // Disassociate mobile push registration for this principal
        if (currentPrincipal) {
            await PushNotificationService.unregisterDevice(
                currentPrincipal === 'owner' ? 'partner' : 'customer',
            ).catch(() => {});
        }

        // Call backend revocation API
        if (currentToken && currentPrincipal) {
            const endpoint =
                currentPrincipal === 'customer'
                    ? 'auth/customer/logout'
                    : 'auth/owner/logout';
            try {
                await ApiClient.post(endpoint);
            } catch {
                // If network failed, attempt to record token in persistent queue for later reconciliation
                try {
                    await SecureTokenStorage.recordPendingRevocation(
                        currentToken,
                        currentPrincipal,
                    );
                } catch (storageErr) {
                    console.warn(
                        '[AuthContext] SecureStore write failure while queueing pending revocation:',
                        storageErr,
                    );
                }
            }
        }

        // Purge local secure storage
        await SecureTokenStorage.clearActiveSession();

        setToken(null);
        setPrincipalType(null);
        setCustomerUser(null);
        setPartnerUser(null);

        if (transitionToGuest) {
            setAuthState('guest');
        }
    };

    const logout = async () => {
        await logoutInternal(true);
    };

    const refreshProfile = async () => {
        if (principalType === 'customer') {
            const res =
                await ApiClient.get<ApiResponse<CustomerProfile>>(
                    'customer/profile',
                );
            setCustomerUser(res.data);
        } else if (principalType === 'owner') {
            const res =
                await ApiClient.get<ApiResponse<OwnerProfile>>('owner/profile');
            setPartnerUser(res.data);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                authState,
                token,
                principalType,
                accountType:
                    principalType === 'owner'
                        ? 'partner'
                        : principalType === 'customer'
                          ? 'customer'
                          : null,
                customerUser,
                partnerUser,
                user: customerUser,
                owner: partnerUser,
                isLoading,
                loginCustomer,
                registerCustomer,
                loginPartner,
                registerPartner,
                logout,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
