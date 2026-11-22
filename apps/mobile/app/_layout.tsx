import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { NotificationNavigationHandler } from '../src/components/NotificationNavigationHandler';
import { Colors } from '../src/theme/colors';

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
        'Montserrat-SemiBold': require('../assets/fonts/Montserrat-600.ttf'),
        'Montserrat-Bold': require('../assets/fonts/Montserrat-700.ttf'),
        'Montserrat-ExtraBold': require('../assets/fonts/Montserrat-800.ttf'),
        'Nunito-Regular': require('../assets/fonts/Nunito-400.ttf'),
        'Nunito-SemiBold': require('../assets/fonts/Nunito-600.ttf'),
        'Nunito-Bold': require('../assets/fonts/Nunito-700.ttf'),
    });

    useEffect(() => {
        if (fontError) {
            console.warn(
                '[RootLayout] Custom font load fallback to system fonts:',
                fontError.message,
            );
        }
    }, [fontError]);

    if (!fontsLoaded && !fontError) {
        return (
            <SafeAreaProvider>
                <View style={styles.loading}>
                    <StatusBar style="light" />
                    <ActivityIndicator color={Colors.coral} size="large" />
                </View>
            </SafeAreaProvider>
        );
    }

    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <AuthProvider>
                    <NotificationNavigationHandler />
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
                        <Stack.Screen
                            name="help"
                            options={{ headerTitle: 'Help Centre' }}
                        />
                        <Stack.Screen
                            name="legal/[slug]"
                            options={{ headerTitle: 'TIJUM' }}
                        />
                    </Stack>
                </AuthProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        backgroundColor: Colors.deepPlum,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
