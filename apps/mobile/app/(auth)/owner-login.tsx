import React, { useEffect, useState } from 'react';
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
import { AlertCircle, ShieldCheck, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { classifyCustomerLoginError } from '../../src/auth/payloads';
import { PublicApi } from '../../src/api/public';
import { BrandLogo } from '../../src/components/BrandLogo';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { Typography } from '../../src/theme/typography';

export default function OwnerLoginScreen() {
    const router = useRouter();
    const { loginPartner, authNotice, clearAuthNotice, consumePendingRedirect } =
        useAuth();

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [retryCountdownSeconds, setRetryCountdownSeconds] = useState(0);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    useEffect(() => {
        if (retryCountdownSeconds <= 0) {
            return;
        }
        const timer = setInterval(() => {
            setRetryCountdownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [retryCountdownSeconds]);

    const handlePartnerLogin = async () => {
        if (retryCountdownSeconds > 0) {
            return;
        }

        if (!loginIdentifier.trim() || !password) {
            setErrorMessage(
                'Please enter your partner email or mobile phone and password.',
            );
            return;
        }

        setLoading(true);
        setErrorMessage('');
        clearAuthNotice();
        try {
            await loginPartner(loginIdentifier.trim(), password);
            const pendingTarget = consumePendingRedirect();
            router.replace((pendingTarget || '/(partner)/dashboard') as never);
        } catch (err: any) {
            const classification = classifyCustomerLoginError(err);
            if (
                classification.kind === 'rate_limited' &&
                classification.retryAfterSeconds &&
                classification.retryAfterSeconds > 0
            ) {
                setRetryCountdownSeconds(classification.retryAfterSeconds);
            }
            setErrorMessage(
                classification.message ||
                    'Partner sign in failed. Please verify your credentials.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!resetEmail.trim() || !resetEmail.includes('@')) {
            Alert.alert(
                'Required',
                'Please enter a valid registered partner email address.',
            );
            return;
        }

        try {
            setResetLoading(true);
            await PublicApi.forgotPassword(resetEmail.trim(), 'owner');
            Alert.alert(
                'Reset Link Dispatched',
                'If a partner account is registered with this email, password recovery instructions have been sent.',
            );
            setShowForgotModal(false);
            setResetEmail('');
        } catch (err: any) {
            Alert.alert(
                'Request Failed',
                err.message ||
                    'Could not dispatch reset email. Please verify your email and try again.',
            );
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <BrandLogo size={138} tone="dark" />

                    {/* Role Segmented Switch */}
                    <View style={styles.segmentedContainer}>
                        <TouchableOpacity
                            style={styles.segmentTab}
                            accessibilityRole="button"
                            accessibilityLabel="Switch to Customer Sign In"
                            onPress={() => {
                                clearAuthNotice();
                                router.replace('/(auth)/customer-login');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.segmentText}>Customer</Text>
                        </TouchableOpacity>
                        <View
                            style={[styles.segmentTab, styles.segmentTabActive]}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    styles.segmentTextActive,
                                ]}
                            >
                                Partner Portal
                            </Text>
                        </View>
                    </View>

                    <View style={styles.partnerBadge}>
                        <Text style={styles.partnerBadgeText}>
                            ACCOMMODATION PARTNER
                        </Text>
                    </View>
                    <Text style={styles.title}>Welcome Back, Partner</Text>
                    <Text style={styles.subtitle}>
                        Sign in to manage your properties, bookings, guests and
                        payouts.
                    </Text>
                </View>

                {authNotice && !errorMessage ? (
                    <View style={styles.noticeBox}>
                        <ShieldCheck
                            size={16}
                            color={Colors.deepPlum}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.noticeText}>{authNotice}</Text>
                    </View>
                ) : null}

                {errorMessage ? (
                    <View style={styles.errorBox}>
                        <AlertCircle
                            size={16}
                            color={Colors.danger}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.errorText}>
                            {retryCountdownSeconds > 0
                                ? `${errorMessage} (Retry available in ${retryCountdownSeconds}s)`
                                : errorMessage}
                        </Text>
                    </View>
                ) : null}

                <View style={styles.form}>
                    <Input
                        testID="partner-login-identifier-input"
                        label="Partner Email or Mobile Phone"
                        placeholder="partner@hostel.com or 9876543210"
                        keyboardType="default"
                        autoCapitalize="none"
                        value={loginIdentifier}
                        onChangeText={setLoginIdentifier}
                    />

                    <Input
                        testID="partner-login-password-input"
                        label="Password"
                        placeholder="••••••••"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <View style={styles.forgotPasswordRow}>
                        <TouchableOpacity
                            style={styles.textHitTarget}
                            accessibilityRole="button"
                            onPress={() => setShowForgotModal(true)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.forgotPasswordText}>
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Button
                        testID="partner-login-submit-button"
                        title={
                            retryCountdownSeconds > 0
                                ? `Try again in ${retryCountdownSeconds}s`
                                : 'Sign In as Partner'
                        }
                        variant="primary"
                        size="lg"
                        loading={loading}
                        disabled={loading || retryCountdownSeconds > 0}
                        onPress={handlePartnerLogin}
                        style={styles.loginButton}
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Want to list your property on TIJUM?{' '}
                    </Text>
                    <TouchableOpacity
                        testID="partner-register-link"
                        style={styles.textHitTarget}
                        accessibilityRole="button"
                        onPress={() =>
                            router.push('/(auth)/owner-register' as any)
                        }
                    >
                        <Text style={styles.linkText}>Register as Partner</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.textHitTarget}
                        accessibilityRole="button"
                        onPress={() => router.replace('/(customer)/explore')}
                    >
                        <Text style={styles.guestExploreText}>
                            Explore Verified Stays →
                        </Text>
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
                                    Partner Password Reset
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalCloseBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close password reset dialog"
                                    onPress={() => setShowForgotModal(false)}
                                >
                                    <X size={20} color={Colors.inkSecondary} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubtitle}>
                                Enter your registered accommodation partner
                                email. We will send you instructions to securely
                                reset your dashboard password.
                            </Text>

                            <Input
                                label="Registered Partner Email"
                                placeholder="partner@domain.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={resetEmail}
                                onChangeText={setResetEmail}
                            />

                            <Button
                                title="Send Reset Instructions"
                                variant="primary"
                                size="md"
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
        marginBottom: Spacing.lg,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surfaceSubtle,
        borderRadius: 14,
        padding: 4,
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    segmentTab: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    segmentTabActive: {
        backgroundColor: Colors.white,
    },
    segmentText: {
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: 14,
        color: Colors.inkSecondary,
    },
    segmentTextActive: {
        fontFamily: Typography.fontFamily.heading,
        color: Colors.deepPlum,
    },
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.peachCream,
        padding: Spacing.md,
        borderRadius: 10,
        marginBottom: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.softPeach,
    },
    noticeText: {
        flex: 1,
        color: Colors.deepPlum,
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: Typography.fontSize.sm,
    },
    textHitTarget: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    modalCloseBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestExploreText: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: 13,
        color: Colors.coralDark,
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
        gap: Spacing.xs,
    },
    forgotPasswordRow: {
        alignItems: 'flex-end',
        marginVertical: Spacing.xs,
    },
    forgotPasswordText: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: 13,
        color: Colors.coralDark,
    },
    loginButton: {
        marginTop: Spacing.xs,
        backgroundColor: Colors.deepPlum,
        borderRadius: 12,
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
