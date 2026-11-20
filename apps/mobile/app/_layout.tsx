import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';
import { PushNotificationService } from '../src/notifications/PushNotificationService';
import { Colors } from '../src/theme/colors';
import { sanitizeDeepLink } from '../src/utils/deepLinkSanitizer';

export default function RootLayout() {
    useEffect(() => {
        PushNotificationService.requestInitialPermissionsOnInstall().catch(() => {});
        if (
            Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            (window as any).Notification.permission === 'default'
        ) {
            (window as any).Notification.requestPermission().catch(() => {});
        }
        if (
            Platform.OS === 'web' &&
            typeof navigator !== 'undefined' &&
            'geolocation' in navigator
        ) {
            navigator.geolocation.getCurrentPosition(() => {}, () => {});
        }

        Linking.getInitialURL().then((url) => {
            if (url) {
                const sanitized = sanitizeDeepLink(url);
                if (!sanitized.isValid) {
                    console.warn(
                        '[DeepLink] Rejected initial incoming URL:',
                        sanitized.rejectionReason,
                    );
                }
            }
        });

        const subscription = Linking.addEventListener('url', (event) => {
            const sanitized = sanitizeDeepLink(event.url);
            if (!sanitized.isValid) {
                console.warn(
                    '[DeepLink] Rejected live incoming URL:',
                    sanitized.rejectionReason,
                );
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const content = (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: Colors.white,
                },
                headerTintColor: Colors.deepPlum,
                headerTitleStyle: {
                    fontWeight: '700',
                },
                contentStyle: {
                    backgroundColor: Colors.cream,
                },
            }}
        >
            <Stack.Screen
                name="index"
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="(auth)"
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="(customer)"
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="(partner)"
                options={{ headerShown: false }}
            />
        </Stack>
    );

    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar style="dark" />
                {Platform.OS === 'web' ? (
                    <View style={styles.webOuter}>
                        <View style={styles.webFrame}>
                            {content}
                        </View>
                    </View>
                ) : (
                    content
                )}
            </AuthProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    webOuter: {
        flex: 1,
        backgroundColor: '#1E121E',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: '100vh' as any,
    },
    webFrame: {
        width: '100%',
        maxWidth: 440,
        height: '100%',
        minHeight: '100vh' as any,
        backgroundColor: Colors.cream,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 28,
        elevation: 10,
        overflow: 'hidden',
    },
});

