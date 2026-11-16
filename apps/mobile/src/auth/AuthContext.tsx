import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { ApiResponse, CustomerProfile, OwnerProfile } from '../api/types';
import {
    PrincipalType,
    SecureTokenStorage,
    reconcilePendingRevocationQueue,
} from './SecureTokenStorage';
import { PushNotificationService } from '../notifications/PushNotificationService';

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
    loginCustomer: (email: string, password: string) => Promise<void>;
    registerCustomer: (data: {
        name: string;
        email: string;
        phone: string;
        password: string;
        terms?: boolean;
        terms_accepted?: boolean;
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
        terms?: boolean;
        terms_accepted?: boolean;
    }) => Promise<void>;
    logout: () => Promise<void>;
    switchAccountDomain: (
        targetDomain: 'customer' | 'partner',
    ) => Promise<void>;
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
        restoreAndVerifySession();
    }, []);

    /**
     * Safe Session Restoration on App Boot:
     * 1. Read single active session record from hardware-backed SecureStore.
     * 2. Authoritatively validate the bearer token with the backend.
     * 3. Confirm the authenticated principal type.
     * 4. Restore state or safely purge credentials if revoked/expired.
     */
    const restoreAndVerifySession = async () => {
        try {
            setIsLoading(true);

            // Reconcile any pending offline revocations first
            await reconcilePendingRevocations();

            const session = await SecureTokenStorage.getActiveSession();
            if (!session) {
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
                    await ApiClient.get<ApiResponse<any>>('owner/dashboard');
                if (res.data && res.data.partner_profile) {
                    setPartnerUser(res.data.partner_profile as OwnerProfile);
                    setCustomerUser(null);
                    setAuthState('owner_authenticated');
                } else {
                    throw new Error('Invalid partner session');
                }
            }
        } catch {
            // Token is expired, invalid, or revoked
            await SecureTokenStorage.clearActiveSession();
            setToken(null);
            setPrincipalType(null);
            setCustomerUser(null);
            setPartnerUser(null);
            setAuthState('session_expired');
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
    const loginCustomer = async (emailOrPhone: string, password: string) => {
        setIsLoading(true);
        try {
            // If another session was active, clear it first
            if (token) {
                await logoutInternal(false);
            }

            const res = await ApiClient.post<
                ApiResponse<{ token: string; user: CustomerProfile }>
            >('auth/customer/login', {
                login: emailOrPhone,
                email: emailOrPhone,
                phone: emailOrPhone,
                password,
                device_name: 'TIJUM Mobile App',
            });

            const newToken = res.data.token;
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
        terms_accepted?: boolean;
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
                ...data,
                terms: true,
                terms_accepted: true,
                device_name: 'TIJUM Mobile App',
            });

            const newToken = res.data.token;
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
            >('auth/owner/login', {
                login: emailOrPhone,
                email: emailOrPhone,
                phone: emailOrPhone,
                password,
                device_name: 'TIJUM Partner Mobile',
            });

            const newToken = res.data.token;
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
            >('auth/owner/register', {
                ...data,
                terms: true,
                terms_accepted: true,
                device_name: 'TIJUM Partner Mobile',
            });

            const newToken = res.data.token;
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

    /**
     * Strict Account Domain Switching:
     * Requires complete logout of active principal before entering another domain.
     */
    const switchAccountDomain = async (
        targetDomain: 'customer' | 'partner',
    ) => {
        await logoutInternal(false);
        setAuthState('guest');
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
                await ApiClient.get<ApiResponse<any>>('owner/dashboard');
            setPartnerUser(res.data.partner_profile as OwnerProfile);
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
                switchAccountDomain,
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
