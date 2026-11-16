import React, { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';
import { Colors } from '../src/theme/colors';
import { sanitizeDeepLink } from '../src/utils/deepLinkSanitizer';

export default function RootLayout() {
    useEffect(() => {
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

    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar style="dark" />
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
            </AuthProvider>
        </SafeAreaProvider>
    );
}
