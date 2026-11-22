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
import { AlertCircle, X, ShieldCheck } from 'lucide-react-native';
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

export default function CustomerLoginScreen() {
    const router = useRouter();
    const {
        loginCustomer,
        authState,
        authNotice,
        clearAuthNotice,
        consumePendingRedirect,
    } = useAuth();

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [twoFactorMode, setTwoFactorMode] = useState<'totp' | 'recovery'>(
        'totp',
    );
    const [totpCode, setTotpCode] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
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

    const resetTwoFactorChallenge = () => {
        setTwoFactorRequired(false);
        setTwoFactorMode('totp');
        setTotpCode('');
        setRecoveryCode('');
    };

    const handleLogin = async () => {
        if (retryCountdownSeconds > 0) {
            return;
        }

        if (!loginIdentifier.trim() || !password) {
            setErrorMessage(
                'Please enter your email or mobile phone and password.',
            );
            return;
        }

        if (twoFactorRequired) {
            if (twoFactorMode === 'recovery' && !recoveryCode.trim()) {
                setErrorMessage('Please enter one of your recovery codes.');
                return;
            }
            if (twoFactorMode === 'totp' && !totpCode.trim()) {
                setErrorMessage(
                    'Please enter the 6-digit code from your authenticator app.',
                );
                return;
            }
        }

        setLoading(true);
        setErrorMessage('');
        clearAuthNotice();
        try {
            await loginCustomer(
                loginIdentifier.trim(),
                password,
                twoFactorRequired
                    ? twoFactorMode === 'recovery'
                        ? { recoveryCode }
                        : { code: totpCode }
                    : undefined,
            );
            resetTwoFactorChallenge();
            const pendingTarget = consumePendingRedirect();
            router.replace((pendingTarget || '/(customer)/explore') as never);
        } catch (err: any) {
            const classification = classifyCustomerLoginError(err);
            if (classification.kind === 'two_factor_required') {
                setTwoFactorRequired(true);
                setErrorMessage('');
            } else if (classification.kind === 'invalid_two_factor_code') {
                setTwoFactorRequired(true);
                setErrorMessage(classification.message);
            } else if (classification.kind === 'rate_limited') {
                if (
                    classification.retryAfterSeconds &&
                    classification.retryAfterSeconds > 0
                ) {
                    setRetryCountdownSeconds(classification.retryAfterSeconds);
                }
                setErrorMessage(classification.message);
            } else {
                setErrorMessage(classification.message);
            }
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Curved Plum Hero Banner with TIJUM Logo */}
                <View style={styles.plumHeroBanner}>
                    <BrandLogo size={158} tone="light" />
                </View>

                {/* Main Card */}
                <View style={styles.cardContainer}>
                    <Text style={styles.welcomeTitle}>Welcome Back!</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Sign in to continue your stay search
                    </Text>

                    {/* Role Segmented Switch: Customer vs Partner */}
                    <View style={styles.segmentedContainer}>
                        <View
                            style={[styles.segmentTab, styles.segmentTabActive]}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    styles.segmentTextActive,
                                ]}
                            >
                                Customer
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.segmentTab}
                            accessibilityRole="button"
                            accessibilityLabel="Switch to Partner Portal sign-in"
                            onPress={() => {
                                clearAuthNotice();
                                router.replace('/(auth)/owner-login');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.segmentText}>
                                Partner Portal
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Disclosures Note */}
                    <Text style={styles.disclosureNotice}>
                        Sign in to manage your reservations with transparent
                        meal disclosures, payments, and verified reviews.
                    </Text>

                    {(authState === 'session_expired' || authNotice) &&
                    !errorMessage ? (
                        <View style={styles.sessionNoticeBox}>
                            <ShieldCheck
                                size={16}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sessionNoticeText}>
                                {authNotice ||
                                    'Your session ended (for example, after a password change or sign-out). Please sign in again.'}
                            </Text>
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

                    {/* Form Fields */}
                    <View style={styles.form}>
                        <Input
                            label="Email Address or Mobile"
                            placeholder="name@example.com or 9876543210"
                            keyboardType="default"
                            autoCapitalize="none"
                            value={loginIdentifier}
                            onChangeText={(value) => {
                                setLoginIdentifier(value);
                                if (twoFactorRequired) {
                                    resetTwoFactorChallenge();
                                }
                            }}
                        />

                        <Input
                            label="Password"
                            placeholder="••••••••"
                            secureTextEntry
                            value={password}
                            onChangeText={(value) => {
                                setPassword(value);
                                if (twoFactorRequired) {
                                    resetTwoFactorChallenge();
                                }
                            }}
                        />

                        {twoFactorRequired ? (
                            <View style={styles.twoFactorBox}>
                                <View style={styles.twoFactorHeader}>
                                    <ShieldCheck
                                        size={16}
                                        color={Colors.deepPlum}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={styles.twoFactorTitle}>
                                        Two-Factor Authentication Required
                                    </Text>
                                </View>
                                <Text style={styles.twoFactorSubtitle}>
                                    {twoFactorMode === 'totp'
                                        ? 'Enter the 6-digit verification code from your authenticator app.'
                                        : 'Enter one of your single-use recovery codes to complete sign-in.'}
                                </Text>
                                {twoFactorMode === 'totp' ? (
                                    <Input
                                        label="Authenticator Code"
                                        placeholder="123456"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        value={totpCode}
                                        onChangeText={setTotpCode}
                                    />
                                ) : (
                                    <Input
                                        label="Recovery Code"
                                        placeholder="XXXXX-XXXXX"
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        value={recoveryCode}
                                        onChangeText={setRecoveryCode}
                                    />
                                )}
                                <View style={styles.twoFactorActions}>
                                    <TouchableOpacity
                                        style={styles.textHitTarget}
                                        accessibilityRole="button"
                                        onPress={() => {
                                            setTwoFactorMode((mode) =>
                                                mode === 'totp'
                                                    ? 'recovery'
                                                    : 'totp',
                                            );
                                            setErrorMessage('');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.twoFactorSwitchText}>
                                            {twoFactorMode === 'totp'
                                                ? 'Use a recovery code instead'
                                                : 'Use authenticator app code instead'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.textHitTarget}
                                        accessibilityRole="button"
                                        onPress={() => {
                                            resetTwoFactorChallenge();
                                            setErrorMessage('');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.twoFactorResetText}>
                                            Use a different account
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : null}

                        {/* Forgot Password Row */}
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

                        {/* Main Log In Button */}
                        <Button
                            title={
                                retryCountdownSeconds > 0
                                    ? `Try again in ${retryCountdownSeconds}s`
                                    : twoFactorRequired
                                      ? 'Verify & Sign In'
                                      : 'Log In'
                            }
                            variant="primary"
                            size="lg"
                            loading={loading}
                            disabled={loading || retryCountdownSeconds > 0}
                            onPress={handleLogin}
                            style={styles.loginButton}
                        />
                    </View>

                    {/* Footer Links */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Don&apos;t have an account?{' '}
                        </Text>
                        <TouchableOpacity
                            style={styles.textHitTarget}
                            accessibilityRole="button"
                            onPress={() =>
                                router.push('/(auth)/customer-register')
                            }
                        >
                            <Text style={styles.linkText}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.guestBrowseBtn}
                        accessibilityRole="button"
                        onPress={() => router.replace('/(customer)/explore')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.guestBrowseText}>
                            Browse Stays as Guest →
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
                                    Reset Password
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalCloseBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close reset password dialog"
                                    onPress={() => setShowForgotModal(false)}
                                >
                                    <X size={20} color={Colors.inkSecondary} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubtitle}>
                                Enter your registered customer email address and
                                we&apos;ll send you instructions to reset your
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
        backgroundColor: Colors.warmOffWhite,
    },
    container: {
        flexGrow: 1,
        paddingBottom: Spacing.xxl,
    },
    plumHeroBanner: {
        backgroundColor: Colors.deepPlum,
        paddingTop: Platform.OS === 'android' ? 44 : 20,
        paddingBottom: Spacing.xl + 20,
        alignItems: 'center',
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
    },
    brandLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    brandTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.white,
        letterSpacing: 2,
    },
    brandTagline: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.coral,
        letterSpacing: 1,
    },
    brandSubtag: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
    },
    cardContainer: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.lg,
        marginTop: -28,
        borderRadius: 20,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    welcomeTitle: {
        fontFamily: Typography.fontFamily.heading,
        fontSize: 24,
        lineHeight: 30,
        color: Colors.deepPlum,
        textAlign: 'center',
        marginTop: 2,
    },
    welcomeSubtitle: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 14,
        color: Colors.inkSecondary,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: Spacing.md,
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.surfaceSubtle,
        borderRadius: 14,
        padding: 4,
        marginBottom: Spacing.md,
    },
    segmentTab: {
        flex: 1,
        minHeight: 44,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    segmentTabActive: {
        backgroundColor: Colors.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontFamily: Typography.fontFamily.bodyMedium,
        fontSize: 14,
        color: Colors.inkSecondary,
    },
    segmentTextActive: {
        color: Colors.deepPlum,
        fontFamily: Typography.fontFamily.heading,
    },
    disclosureNotice: {
        fontFamily: Typography.fontFamily.body,
        fontSize: 12,
        color: Colors.inkMuted,
        textAlign: 'center',
        marginBottom: Spacing.md,
        lineHeight: 17,
    },
    form: {
        gap: Spacing.xs,
    },
    forgotPasswordRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    textHitTarget: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    forgotPasswordText: {
        ...Typography.bodySmall,
        color: Colors.coralDark,
        fontFamily: Typography.fontFamily.bodyBold,
    },
    loginButton: {
        marginTop: Spacing.xs,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.roseLight,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: '#FECDD3',
    },
    errorText: {
        ...Typography.bodySmall,
        color: Colors.dangerText,
        flex: 1,
    },
    sessionNoticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.peachCream,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.softPeach,
    },
    sessionNoticeText: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        flex: 1,
        lineHeight: 18,
    },
    twoFactorBox: {
        backgroundColor: Colors.peachCream,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.softPeach,
        padding: Spacing.md,
        marginTop: Spacing.xs,
    },
    twoFactorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    twoFactorTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    twoFactorSubtitle: {
        ...Typography.bodySmall,
        color: Colors.inkSecondary,
        marginBottom: Spacing.sm,
        lineHeight: 18,
    },
    twoFactorActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: 4,
    },
    twoFactorSwitchText: {
        ...Typography.bodySmall,
        color: Colors.coralDark,
        fontFamily: Typography.fontFamily.bodyBold,
    },
    twoFactorResetText: {
        ...Typography.bodySmall,
        color: Colors.inkSecondary,
        fontFamily: Typography.fontFamily.bodyMedium,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    footerText: {
        ...Typography.bodySmall,
        color: Colors.inkSecondary,
    },
    linkText: {
        ...Typography.bodySmall,
        color: Colors.coralDark,
        fontFamily: Typography.fontFamily.heading,
    },
    guestBrowseBtn: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.xs,
    },
    guestBrowseText: {
        fontFamily: Typography.fontFamily.bodyBold,
        fontSize: 13,
        color: Colors.deepPlum,
    },
    modalCloseBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        width: '100%',
        maxWidth: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    modalTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        fontWeight: '800',
    },
    modalSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        marginBottom: Spacing.md,
        lineHeight: 18,
    },
});
