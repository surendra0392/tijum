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
import {
    AlertCircle,
    X,
    Eye,
    EyeOff,
    Check,
    ShieldCheck,
} from 'lucide-react-native';
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
    const { loginCustomer, authState } = useAuth();

    const [activeTab, setActiveTab] = useState<'customer' | 'owner'>(
        'customer',
    );
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
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
                activeTab === 'customer'
                    ? 'Please enter your email or mobile phone and password.'
                    : 'Please enter your registered partner email and password.',
            );
            return;
        }

        if (activeTab === 'customer' && twoFactorRequired) {
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
        try {
            if (activeTab === 'customer') {
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
                router.replace('/(customer)/explore');
            } else {
                Alert.alert(
                    'Partner Login',
                    'Please use the Partner Portal sign-in page.',
                    [{ text: 'OK' }],
                );
                router.replace('/(auth)/owner-login');
            }
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
            await PublicApi.forgotPassword(resetEmail.trim(), activeTab);
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
            <ScrollView
                contentContainerStyle={styles.container}
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
                        Sign in to continue your journey
                    </Text>

                    {/* Role Segmented Switch: Customer vs Owner */}
                    <View style={styles.segmentedContainer}>
                        <TouchableOpacity
                            style={[
                                styles.segmentTab,
                                activeTab === 'customer' &&
                                    styles.segmentTabActive,
                            ]}
                            onPress={() => {
                                setActiveTab('customer');
                                setErrorMessage('');
                                resetTwoFactorChallenge();
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    activeTab === 'customer' &&
                                        styles.segmentTextActive,
                                ]}
                            >
                                Customer
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.segmentTab,
                                activeTab === 'owner' &&
                                    styles.segmentTabActive,
                            ]}
                            onPress={() => {
                                setActiveTab('owner');
                                setErrorMessage('');
                                resetTwoFactorChallenge();
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    activeTab === 'owner' &&
                                        styles.segmentTextActive,
                                ]}
                            >
                                Owner
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Disclosures Note */}
                    <Text style={styles.disclosureNotice}>
                        Sign in to manage your reservations with transparent
                        meal disclosures, payments, and verified reviews.
                    </Text>

                    {authState === 'session_expired' && !errorMessage ? (
                        <View style={styles.sessionNoticeBox}>
                            <ShieldCheck
                                size={16}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sessionNoticeText}>
                                Your session ended (for example, after a
                                password change or sign-out). Please sign in
                                again.
                            </Text>
                        </View>
                    ) : null}

                    {errorMessage ? (
                        <View style={styles.errorBox}>
                            <AlertCircle
                                size={16}
                                color={Colors.rose}
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
                            label={
                                activeTab === 'customer'
                                    ? 'Email Address or Mobile'
                                    : 'Partner Email Address'
                            }
                            placeholder={
                                activeTab === 'customer'
                                    ? 'name@example.com or 9876543210'
                                    : 'owner@property.com'
                            }
                            keyboardType={
                                activeTab === 'customer'
                                    ? 'default'
                                    : 'email-address'
                            }
                            autoCapitalize="none"
                            value={loginIdentifier}
                            onChangeText={(value) => {
                                setLoginIdentifier(value);
                                if (twoFactorRequired) {
                                    resetTwoFactorChallenge();
                                }
                            }}
                        />

                        <View style={{ position: 'relative' }}>
                            <Input
                                label="Password"
                                placeholder="••••••••"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={(value) => {
                                    setPassword(value);
                                    if (twoFactorRequired) {
                                        resetTwoFactorChallenge();
                                    }
                                }}
                            />
                            <TouchableOpacity
                                style={styles.eyeToggleBtn}
                                onPress={() => setShowPassword(!showPassword)}
                                activeOpacity={0.7}
                            >
                                {showPassword ? (
                                    <EyeOff size={18} color={Colors.gray500} />
                                ) : (
                                    <Eye size={18} color={Colors.gray500} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {twoFactorRequired && activeTab === 'customer' ? (
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

                        {/* Remember Me & Forgot Password Row */}
                        <View style={styles.forgotPasswordRow}>
                            <TouchableOpacity
                                style={styles.rememberMeRow}
                                onPress={() => setRememberMe(!rememberMe)}
                                activeOpacity={0.8}
                            >
                                <View
                                    style={[
                                        styles.checkbox,
                                        rememberMe && styles.checkboxActive,
                                    ]}
                                >
                                    {rememberMe ? (
                                        <Check size={12} color={Colors.white} />
                                    ) : null}
                                </View>
                                <Text style={styles.rememberMeText}>
                                    Remember Me
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
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
                                    : activeTab === 'customer'
                                      ? twoFactorRequired
                                          ? 'Verify & Sign In'
                                          : 'Log In'
                                      : 'Log In as Partner'
                            }
                            variant="primary"
                            size="lg"
                            loading={loading}
                            disabled={loading || retryCountdownSeconds > 0}
                            onPress={handleLogin}
                            style={styles.loginButton}
                        />

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>
                                or continue with
                            </Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Social Buttons */}
                        <View style={styles.socialButtonsRow}>
                            <TouchableOpacity
                                style={styles.socialBtn}
                                activeOpacity={0.8}
                                onPress={() =>
                                    Alert.alert(
                                        'Social Sign-In',
                                        'Google sign-in is available through web SSO.',
                                    )
                                }
                            >
                                <Text style={styles.socialBtnText}>Google</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.socialBtn}
                                activeOpacity={0.8}
                                onPress={() =>
                                    Alert.alert(
                                        'Social Sign-In',
                                        'Apple sign-in is available through Apple ID.',
                                    )
                                }
                            >
                                <Text style={styles.socialBtnText}>Apple</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer Link: Sign Up */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Don't have an account?{' '}
                        </Text>
                        <TouchableOpacity
                            onPress={() =>
                                router.push(
                                    activeTab === 'customer'
                                        ? '/(auth)/customer-register'
                                        : '/(auth)/owner-register',
                                )
                            }
                        >
                            <Text style={styles.linkText}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
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
                                Enter your registered{' '}
                                {activeTab === 'customer'
                                    ? 'customer'
                                    : 'partner'}{' '}
                                email address and we'll send you instructions to
                                reset your password.
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
        paddingVertical: 10,
        alignItems: 'center',
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
        fontSize: 14,
        fontWeight: '600',
        color: Colors.gray600,
    },
    segmentTextActive: {
        color: Colors.deepPlum,
        fontWeight: '800',
    },
    disclosureNotice: {
        fontSize: 11,
        color: Colors.gray500,
        textAlign: 'center',
        marginBottom: Spacing.md,
        lineHeight: 16,
    },
    form: {
        gap: Spacing.sm,
    },
    eyeToggleBtn: {
        position: 'absolute',
        right: 14,
        top: 36,
        padding: 6,
    },
    forgotPasswordRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
        marginBottom: Spacing.xs,
    },
    rememberMeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: Colors.gray400,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    rememberMeText: {
        ...Typography.bodySmall,
        color: Colors.gray700,
    },
    forgotPasswordText: {
        ...Typography.bodySmall,
        color: Colors.coral,
        fontWeight: '700',
    },
    loginButton: {
        marginTop: Spacing.sm,
        backgroundColor: Colors.deepPlum,
        borderRadius: 12,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F2',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: '#FECDD3',
    },
    errorText: {
        ...Typography.bodySmall,
        color: Colors.rose,
        flex: 1,
    },
    sessionNoticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F3FF',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: '#DDD6FE',
    },
    sessionNoticeText: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        flex: 1,
        lineHeight: 18,
    },
    twoFactorBox: {
        backgroundColor: '#FFF7ED',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: '#FED7AA',
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
        fontWeight: '800',
    },
    twoFactorSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray700,
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
        color: Colors.coral,
        fontWeight: '700',
    },
    twoFactorResetText: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        fontWeight: '600',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.gray200,
    },
    dividerText: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginHorizontal: Spacing.sm,
    },
    socialButtonsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    socialBtn: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: Colors.gray300,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.white,
    },
    socialBtnText: {
        ...Typography.labelMedium,
        color: Colors.gray700,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    footerText: {
        ...Typography.bodyMedium,
        color: Colors.gray600,
    },
    linkText: {
        ...Typography.bodyMedium,
        color: Colors.coral,
        fontWeight: '800',
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
