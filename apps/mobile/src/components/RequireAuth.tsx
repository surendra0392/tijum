import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { Button } from './Button';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface RequireAuthProps {
    role: 'customer' | 'partner';
    children: React.ReactNode;
}

export function RequireAuth({ role, children }: RequireAuthProps) {
    const { authState, isLoading, principalType, setPendingRedirect } =
        useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const expectedPrincipal = role === 'customer' ? 'customer' : 'owner';
    const isAuthenticatedForRole =
        principalType === expectedPrincipal &&
        (authState === 'customer_authenticated' ||
            authState === 'owner_authenticated');

    const isRestoring =
        isLoading || authState === 'idle' || authState === 'logging_out';

    useEffect(() => {
        if (
            !isRestoring &&
            !isAuthenticatedForRole &&
            pathname &&
            !pathname.startsWith('/(auth)')
        ) {
            setPendingRedirect(pathname);
        }
    }, [isAuthenticatedForRole, isRestoring, pathname, setPendingRedirect]);

    if (isRestoring) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color={Colors.deepPlum} />
                <Text style={styles.loadingText}>Verifying your session…</Text>
            </SafeAreaView>
        );
    }

    if (isAuthenticatedForRole) {
        return <>{children}</>;
    }

    const isOppositeRoleSignedIn =
        (expectedPrincipal === 'customer' && principalType === 'owner') ||
        (expectedPrincipal === 'owner' && principalType === 'customer');

    const loginRoute =
        role === 'customer' ? '/(auth)/customer-login' : '/(auth)/owner-login';

    if (!isOppositeRoleSignedIn) {
        return <Redirect href={loginRoute} />;
    }

    const currentRoleLabel =
        principalType === 'owner' ? 'Partner Host' : 'Customer';
    const requiredRoleLabel =
        role === 'customer' ? 'Customer' : 'Partner Host';
    const homeRoute =
        principalType === 'owner'
            ? '/(partner)/dashboard'
            : '/(customer)/explore';

    return (
        <SafeAreaView style={styles.center}>
            <View style={styles.card}>
                <Text style={styles.title}>
                    {requiredRoleLabel} Sign-In Required
                </Text>
                <Text style={styles.body}>
                    You are currently signed in as a {currentRoleLabel}. Switch
                    accounts to access this area, or return to your active
                    workspace.
                </Text>
                <Button
                    title={`Sign in as ${requiredRoleLabel}`}
                    onPress={() => router.replace(loginRoute)}
                    style={{ width: '100%' }}
                />
                <View style={styles.spacer} />
                <Button
                    title={`Return to ${currentRoleLabel} Home`}
                    variant="outline"
                    onPress={() => router.replace(homeRoute)}
                    style={{ width: '100%' }}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        backgroundColor: Colors.cream,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    title: {
        fontFamily: Typography.fontFamily.heading,
        fontSize: 20,
        color: Colors.deepPlum,
        marginBottom: 8,
    },
    body: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 14,
        lineHeight: 20,
        color: Colors.textSecondary,
        marginBottom: 20,
    },
    spacer: {
        height: 12,
    },
});
