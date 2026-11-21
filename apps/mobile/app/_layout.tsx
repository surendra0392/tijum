import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';
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
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(customer)" options={{ headerShown: false }} />
            <Stack.Screen name="(partner)" options={{ headerShown: false }} />
            <Stack.Screen
                name="help"
                options={{ headerTitle: 'Help Centre' }}
            />
            <Stack.Screen
                name="legal/[slug]"
                options={{ headerTitle: 'TIJUM' }}
            />
        </Stack>
    );

    if (fontError) {
        throw fontError;
    }

    if (!fontsLoaded) {
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
        <SafeAreaProvider>
            <AuthProvider>
                <NotificationNavigationHandler />
                <StatusBar style="dark" />
                {Platform.OS === 'web' ? (
                    <View style={styles.webOuter}>
                        <View style={styles.webFrame}>{content}</View>
                    </View>
                ) : (
                    content
                )}
            </AuthProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        backgroundColor: Colors.deepPlum,
        alignItems: 'center',
        justifyContent: 'center',
    },
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
