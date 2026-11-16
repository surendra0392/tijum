import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { PushNotificationService } from '../../src/notifications/PushNotificationService';
import { Colors } from '../../src/theme/colors';
import { Spacing } from '../../src/theme/spacing';
import { Typography } from '../../src/theme/typography';

export default function OwnerLoginScreen() {
    const router = useRouter();
    const { loginPartner } = useAuth();

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handlePartnerLogin = async () => {
        if (!loginIdentifier.trim() || !password) {
            setErrorMessage(
                'Please enter your partner email or mobile phone and password.',
            );
            return;
        }

        setLoading(true);
        setErrorMessage('');
        try {
            await loginPartner(loginIdentifier.trim(), password);
            PushNotificationService.registerForPushNotifications(
                'partner',
            ).catch(() => {});
            router.replace('/(partner)/dashboard');
        } catch (err: any) {
            setErrorMessage(
                err?.message ||
                    'Partner sign in failed. Please verify your credentials.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <View style={styles.partnerBadge}>
                        <Text style={styles.partnerBadgeText}>
                            ACCOMMODATION PARTNER
                        </Text>
                    </View>
                    <Text style={styles.title}>Partner Command Center</Text>
                    <Text style={styles.subtitle}>
                        Manage incoming reservation requests, room allocations,
                        property status, and settlement statements.
                    </Text>
                </View>

                {errorMessage ? (
                    <View style={styles.errorBox}>
                        <AlertCircle
                            size={16}
                            color={Colors.rose}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                <View style={styles.form}>
                    <Input
                        label="Partner Email or Mobile Phone"
                        placeholder="partner@hostel.com or 9876543210"
                        keyboardType="default"
                        autoCapitalize="none"
                        value={loginIdentifier}
                        onChangeText={setLoginIdentifier}
                    />

                    <Input
                        label="Password"
                        placeholder="••••••••"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <Button
                        title="Sign In as Partner"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        onPress={handlePartnerLogin}
                        style={styles.loginButton}
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Want to list your property on TIJUM?{' '}
                    </Text>
                    <TouchableOpacity
                        onPress={() =>
                            router.push('/(auth)/owner-register' as any)
                        }
                    >
                        <Text style={styles.linkText}>Register as Partner</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        backgroundColor: Colors.cream,
    },
    container: {
        padding: Spacing.xl,
        flexGrow: 1,
        justifyContent: 'center',
    },
    header: {
        marginBottom: Spacing.xl,
    },
    partnerBadge: {
        backgroundColor: Colors.softPeach,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: Spacing.xs,
    },
    partnerBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.deepPlum,
        letterSpacing: 0.5,
    },
    title: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
        lineHeight: 20,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.roseLight,
        padding: Spacing.md,
        borderRadius: 8,
        marginBottom: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.rose,
    },
    errorText: {
        flex: 1,
        color: '#9F1239',
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
    },
    form: {
        backgroundColor: Colors.white,
        padding: Spacing.xl,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.neutralSurface,
    },
    loginButton: {
        marginTop: Spacing.md,
    },
    footer: {
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    footerText: {
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    linkText: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.deepPlum,
        marginTop: 2,
    },
});
