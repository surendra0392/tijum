import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AlertCircle, X, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { PublicApi } from '../../src/api/public';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { PushNotificationService } from '../../src/notifications/PushNotificationService';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { Typography } from '../../src/theme/typography';

export default function CustomerLoginScreen() {
    const router = useRouter();
    const { loginCustomer } = useAuth();

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleLogin = async () => {
        if (!loginIdentifier.trim() || !password) {
            setErrorMessage(
                'Please enter your email or mobile phone and password.',
            );
            return;
        }

        setLoading(true);
        setErrorMessage('');
        try {
            await loginCustomer(loginIdentifier.trim(), password);
            // Register device for push notifications in background
            PushNotificationService.registerForPushNotifications(
                'customer',
            ).catch(() => {});
            router.replace('/(customer)/explore');
        } catch (err: any) {
            setErrorMessage(
                err?.message || 'Login failed. Please check your credentials.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!resetEmail.trim() || !resetEmail.includes('@')) {
            Alert.alert(
                'Required',
                'Please enter a valid registered email address.',
            );
            return;
        }

        try {
            setResetLoading(true);
            await PublicApi.forgotPassword(resetEmail.trim(), 'customer');
            Alert.alert(
                'Password Reset Link Sent',
                'If an account exists with this email, you will receive password reset instructions shortly.',
            );
            setShowForgotModal(false);
            setResetEmail('');
        } catch (err: any) {
            Alert.alert(
                'Request Failed',
                err.message ||
                    'Could not send reset link. Please check your email and try again.',
            );
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>
                        Sign in to manage your reservations with transparent
                        meal disclosures, payments, and verified reviews.
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
                        label="Email or Mobile Phone"
                        placeholder="aditya@example.com or 9876543210"
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

                    <View style={styles.forgotPasswordRow}>
                        <TouchableOpacity
                            onPress={() => setShowForgotModal(true)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.forgotPasswordText}>
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Button
                        title="Sign In as Customer"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        onPress={handleLogin}
                        style={styles.loginButton}
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Don't have a customer account?{' '}
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/(auth)/customer-register')}
                    >
                        <Text style={styles.linkText}>Create Account</Text>
                    </TouchableOpacity>
                </View>

                {/* Forgot Password Modal */}
                <Modal
                    visible={showForgotModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowForgotModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    Reset Password
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowForgotModal(false)}
                                >
                                    <X size={20} color={Colors.gray500} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubtitle}>
                                Enter your registered customer email address and
                                we'll send you instructions to reset your
                                password.
                            </Text>
                            <Input
                                label="Registered Email"
                                placeholder="name@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={resetEmail}
                                onChangeText={setResetEmail}
                            />
                            <Button
                                title="Send Reset Link"
                                loading={resetLoading}
                                onPress={handleForgotPassword}
                                style={{ marginTop: Spacing.sm }}
                            />
                        </View>
                    </View>
                </Modal>
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
        gap: Spacing.xs,
    },
    forgotPasswordRow: {
        alignItems: 'flex-end',
        marginVertical: Spacing.xs,
    },
    forgotPasswordText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.coral,
    },
    loginButton: {
        marginTop: Spacing.xs,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
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
        color: Colors.coral,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    modalTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    modalSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        lineHeight: 18,
        marginBottom: Spacing.md,
    },
});
