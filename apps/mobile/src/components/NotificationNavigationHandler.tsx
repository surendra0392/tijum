import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import { useAuth } from '../auth/AuthContext';
import { PushNotificationService } from '../notifications/PushNotificationService';

export function NotificationNavigationHandler() {
    const router = useRouter();
    const { isLoading, principalType } = useAuth();
    const handledResponseIds = useRef(new Set<string>());

    useEffect(() => {
        if (Platform.OS === 'web' || isLoading) {
            return;
        }

        const handleResponse = (response: NotificationResponse) => {
            const request = response.notification
                .request as typeof response.notification.request & {
                identifier?: string;
            };
            const responseId =
                request.identifier ??
                JSON.stringify([
                    response.notification.date,
                    response.actionIdentifier,
                    request.content.data,
                ]);
            if (handledResponseIds.current.has(responseId)) {
                return;
            }

            handledResponseIds.current.add(responseId);
            const validation = PushNotificationService.validateDeepLink(
                request.content.data as {
                    url?: string;
                    route?: string;
                    action_url?: string;
                    booking_reference?: string;
                    case_reference?: string;
                    settlement_reference?: string;
                    data?: Record<string, unknown>;
                },
                principalType,
            );

            if (validation.allowed && validation.targetRoute) {
                router.push(validation.targetRoute as never);
            } else {
                console.warn(
                    '[NotificationNavigationHandler] Blocked notification deep link:',
                    validation.reason,
                );
            }
        };

        const subscription =
            PushNotificationService.addNotificationResponseReceivedListener(
                handleResponse,
            );

        void PushNotificationService.getLastNotificationResponseAsync().then(
            (response) => {
                if (response) {
                    handleResponse(response);
                }
            },
        );

        return () => subscription.remove();
    }, [isLoading, principalType, router]);

    return null;
}
