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
    Image,
} from 'react-native';
import { AlertCircle, X, Mail, Lock, Eye, EyeOff, Check, Sparkles } from 'lucide-react-native';
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
    const { loginCustomer, loginPartner, loginDemoCustomer, loginDemoPartner } = useAuth();

    const [activeTab, setActiveTab] = useState<'customer' | 'owner'>('customer');
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleLogin = async () => {
        if (!loginIdentifier.trim() || !password) {
            setErrorMessage(
                activeTab === 'customer'
                    ? 'Please enter your email or mobile phone and password.'
                    : 'Please enter your registered partner email and password.',
            );
            return;
        }

        setLoading(true);
        setErrorMessage('');
        try {
            if (activeTab === 'customer') {
                await loginCustomer(loginIdentifier.trim(), password);
                PushNotificationService.registerForPushNotifications('customer').catch(() => {});
                router.replace('/(customer)/explore');
            } else {
                await loginPartner(loginIdentifier.trim(), password);
                PushNotificationService.registerForPushNotifications('partner').catch(() => {});
                router.replace('/(partner)/dashboard');
            }
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
                    <View style={styles.brandLogoRow}>
                        <View style={styles.roofIcon} />
                        <Text style={styles.brandTitle}>TIJUM</Text>
                    </View>
                    <Text style={styles.brandTagline}>Stay • Dine • Belong</Text>
                    <Text style={styles.brandSubtag}>Your Stay. Our Priority.</Text>
                </View>

                {/* Main Card */}
                <View style={styles.cardContainer}>
                    {/* Role Segmented Switch: Customer vs Owner */}
                    <View style={styles.segmentedContainer}>
                        <TouchableOpacity
                            style={[
                                styles.segmentTab,
                                activeTab === 'customer' && styles.segmentTabActive,
                            ]}
                            onPress={() => {
                                setActiveTab('customer');
                                setErrorMessage('');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    activeTab === 'customer' && styles.segmentTextActive,
                                ]}
                            >
                                Customer
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.segmentTab,
                                activeTab === 'owner' && styles.segmentTabActive,
                            ]}
                            onPress={() => {
                                setActiveTab('owner');
                                setErrorMessage('');
                            }}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    activeTab === 'owner' && styles.segmentTextActive,
                                ]}
                            >
                                Owner
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Disclosures Note */}
                    <Text style={styles.disclosureNotice}>
                        Sign in to manage your reservations with transparent meal disclosures, payments, and verified reviews.
                    </Text>

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
                            keyboardType={activeTab === 'customer' ? 'default' : 'email-address'}
                            autoCapitalize="none"
                            value={loginIdentifier}
                            onChangeText={setLoginIdentifier}
                        />

                        <View style={{ position: 'relative' }}>
                            <Input
                                label="Password"
                                placeholder="••••••••"
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
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
                                <Text style={styles.rememberMeText}>Remember Me</Text>
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
                                activeTab === 'customer'
                                    ? 'Log In'
                                    : 'Log In as Partner'
                            }
                            variant="primary"
                            size="lg"
                            loading={loading}
                            onPress={handleLogin}
                            style={styles.loginButton}
                        />

                        {/* 1-Tap Quick Demo Access */}
                        <TouchableOpacity
                            style={styles.demoButton}
                            activeOpacity={0.88}
                            onPress={async () => {
                                setLoading(true);
                                try {
                                    if (activeTab === 'customer') {
                                        await loginDemoCustomer();
                                        router.replace('/(customer)/explore');
                                    } else {
                                        await loginDemoPartner();
                                        router.replace('/(partner)/dashboard');
                                    }
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            <Sparkles size={16} color={Colors.white} style={{ marginRight: 8 }} />
                            <Text style={styles.demoButtonText}>
                                {activeTab === 'customer'
                                    ? '1-Tap Demo Customer: Rahul Sharma'
                                    : '1-Tap Demo Host: Priya Sharma'}
                            </Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or continue with</Text>
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
                                <Text style={styles.modalTitle}>Reset Password</Text>
                                <TouchableOpacity
                                    onPress={() => setShowForgotModal(false)}
                                >
                                    <X size={20} color={Colors.gray500} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubtitle}>
                                Enter your registered {activeTab === 'customer' ? 'customer' : 'partner'} email address and we'll send you instructions to reset your password.
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
    roofIcon: {
        width: 16,
        height: 10,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderRightWidth: 3,
        borderColor: Colors.coral,
        marginRight: 6,
        borderRadius: 2,
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
    demoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.coral,
        paddingVertical: 13,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.pill,
        marginTop: Spacing.sm,
        shadowColor: '#E05A47',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 3,
    },
    demoButtonText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 13,
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
