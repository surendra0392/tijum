import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { CustomerApi } from '../api/customer';
import { OwnerApi } from '../api/owner';
import { SecureTokenStorage } from '../auth/SecureTokenStorage';

// Configure notification presentation for foreground alerts
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

const PUSH_PROMPT_RECORD_KEY = 'tijum_push_prompt_history';

export interface DeepLinkValidationResult {
    allowed: boolean;
    targetRoute: string | null;
    reason?: string;
}

export type PushRequestContext =
    | 'booking_placed'
    | 'settings_toggle'
    | 'owner_onboarding'
    | 'in_app_prompt'
    | 'manual_refresh';

export class PushNotificationService {
    /**
     * Request permissions on initial app install / first launch.
     * Triggers native OS notification permission dialog on Android 13+ and iOS.
     */
    static async requestInitialPermissionsOnInstall(): Promise<boolean> {
        try {
            const currentStatus = await this.checkPermissionStatus();
            if (currentStatus === Notifications.PermissionStatus.GRANTED) {
                return true;
            }

            const { status } = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                },
            });

            return status === Notifications.PermissionStatus.GRANTED;
        } catch {
            return false;
        }
    }

    /**
     * Check OS permission status without triggering any user prompt.
     */
    static async checkPermissionStatus(): Promise<Notifications.PermissionStatus> {
        try {
            const settings = await Notifications.getPermissionsAsync();
            return settings.status;
        } catch {
            return Notifications.PermissionStatus.UNDETERMINED;
        }
    }

    /**
     * Request push notification permission contextually during high-intent user moments.
     * Avoids cold-start prompt nagging by caching previous user dismissals.
     */
    static async requestPushPermissionsContextually(
        context: PushRequestContext,
        accountType: 'customer' | 'partner',
        forcePrompt: boolean = false,
    ): Promise<{ granted: boolean; pushToken: string | null }> {
        try {
            const currentStatus = await this.checkPermissionStatus();

            // If already granted, ensure token is registered
            if (currentStatus === Notifications.PermissionStatus.GRANTED) {
                const token =
                    await this.registerForPushNotifications(accountType);
                return { granted: true, pushToken: token };
            }

            // If previously denied and not a direct user settings toggle, respect the choice and do not nag
            if (
                currentStatus === Notifications.PermissionStatus.DENIED &&
                !forcePrompt &&
                context !== 'settings_toggle'
            ) {
                return { granted: false, pushToken: null };
            }

            // Check if user has already declined in this session/app lifetime unless forcePrompt is requested
            const historyRaw = await SecureStore.getItemAsync(
                PUSH_PROMPT_RECORD_KEY,
            ).catch(() => null);
            if (historyRaw && !forcePrompt && context === 'in_app_prompt') {
                const history = JSON.parse(historyRaw);
                if (history[context]?.declinedCount >= 2) {
                    return { granted: false, pushToken: null };
                }
            }

            // Request permissions from OS
            const requestResult = await Notifications.requestPermissionsAsync({
                ios: {
                    allowAlert: true,
                    allowBadge: true,
                    allowSound: true,
                },
            });

            if (
                requestResult.status !== Notifications.PermissionStatus.GRANTED
            ) {
                // Record prompt outcome
                try {
                    const history = historyRaw ? JSON.parse(historyRaw) : {};
                    history[context] = {
                        lastPromptedAt: Date.now(),
                        declinedCount:
                            (history[context]?.declinedCount || 0) + 1,
                    };
                    await SecureStore.setItemAsync(
                        PUSH_PROMPT_RECORD_KEY,
                        JSON.stringify(history),
                    );
                } catch {
                    // Non-blocking
                }
                return { granted: false, pushToken: null };
            }

            // Permission granted - register token with backend
            const token = await this.registerForPushNotifications(accountType);
            return { granted: true, pushToken: token };
        } catch {
            return { granted: false, pushToken: null };
        }
    }

    /**
     * Register push token with backend bound to current authenticated principal.
     */
    static async registerForPushNotifications(
        accountType: 'customer' | 'partner',
    ): Promise<string | null> {
        try {
            const currentStatus = await this.checkPermissionStatus();
            if (currentStatus !== Notifications.PermissionStatus.GRANTED) {
                return null;
            }

            const tokenData = await Notifications.getExpoPushTokenAsync().catch(
                () => null,
            );
            if (!tokenData || !tokenData.data) {
                return null;
            }

            const pushToken = tokenData.data;
            const installationId = await SecureTokenStorage.getInstallationId();

            const payload = {
                device_installation_id: installationId,
                push_token: pushToken,
                platform:
                    Platform.OS === 'ios'
                        ? ('ios' as const)
                        : ('android' as const),
                app_version: '1.0.0',
                device_name: `${Platform.OS.toUpperCase()} Mobile Device`,
            };

            if (accountType === 'customer') {
                await CustomerApi.registerDevice(payload);
            } else {
                await OwnerApi.registerDevice(payload);
            }

            return pushToken;
        } catch {
            return null;
        }
    }

    /**
     * Unregister device on logout or session purge.
     */
    static async unregisterDevice(
        accountType: 'customer' | 'partner',
    ): Promise<void> {
        try {
            const installationId = await SecureTokenStorage.getInstallationId();
            if (accountType === 'customer') {
                await CustomerApi.unregisterDevice(installationId);
            } else {
                await OwnerApi.unregisterDevice(installationId);
            }
        } catch {
            // Ignore unregistration errors on logout
        }
    }

    /**
     * Validate incoming deep-link payloads to ensure strict session authorization
     * and guard against cross-role privilege access or open redirects.
     */
    static validateDeepLink(
        rawPayload:
            | { url?: string; route?: string; data?: Record<string, unknown> }
            | string,
        currentPrincipalType: 'customer' | 'owner' | null,
    ): DeepLinkValidationResult {
        let route = '';

        if (typeof rawPayload === 'string') {
            route = rawPayload;
        } else if (rawPayload?.route) {
            route = rawPayload.route;
        } else if (rawPayload?.url) {
            // Strip scheme (e.g. tijum:// or exp://)
            route = rawPayload.url.replace(/^[a-zA-Z0-9_-]+:\/\//, '/');
        }

        if (!route || typeof route !== 'string') {
            return {
                allowed: false,
                targetRoute: null,
                reason: 'Empty or invalid route target',
            };
        }

        // Ensure leading slash
        if (!route.startsWith('/')) {
            route = '/' + route;
        }

        // Sanitize and reject dangerous URI schemes
        if (
            route.includes('javascript:') ||
            route.includes('data:') ||
            route.includes('file:')
        ) {
            return {
                allowed: false,
                targetRoute: null,
                reason: 'Dangerous URI scheme detected',
            };
        }

        // Customer route verification
        if (route.startsWith('/customer') || route.startsWith('/(customer)')) {
            if (currentPrincipalType !== 'customer') {
                return {
                    allowed: false,
                    targetRoute: '/login',
                    reason: 'Customer authentication required for this destination',
                };
            }
            return { allowed: true, targetRoute: route };
        }

        // Partner/Owner route verification
        if (route.startsWith('/partner') || route.startsWith('/(partner)')) {
            if (currentPrincipalType !== 'owner') {
                return {
                    allowed: false,
                    targetRoute: '/login',
                    reason: 'Partner authentication required for this destination',
                };
            }
            return { allowed: true, targetRoute: route };
        }

        // Public / generic routes (e.g., search, property details, home)
        const allowedPublicPrefixes = [
            '/search',
            '/property',
            '/city',
            '/help',
            '/login',
            '/about',
        ];
        const isPublic =
            allowedPublicPrefixes.some((p) => route.startsWith(p)) ||
            route === '/';

        if (isPublic) {
            return { allowed: true, targetRoute: route };
        }

        return {
            allowed: false,
            targetRoute: null,
            reason: 'Route not recognized in application schema',
        };
    }

    /**
     * Add listener for foreground notification receipt.
     */
    static addNotificationReceivedListener(
        callback: (notification: Notifications.Notification) => void,
    ) {
        return Notifications.addNotificationReceivedListener(callback);
    }

    /**
     * Add listener for notification tap / interaction.
     */
    static addNotificationResponseReceivedListener(
        callback: (response: Notifications.NotificationResponse) => void,
    ) {
        return Notifications.addNotificationResponseReceivedListener(callback);
    }
}
