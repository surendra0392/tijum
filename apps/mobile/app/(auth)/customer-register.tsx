import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Colors } from '../../src/theme/colors';
import { Spacing } from '../../src/theme/spacing';
import { Typography } from '../../src/theme/typography';

export default function CustomerRegisterScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ referral_code?: string }>();
    const { registerCustomer, consumePendingRedirect } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [referralCode, setReferralCode] = useState(
        typeof params.referral_code === 'string' ? params.referral_code : '',
    );
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (typeof params.referral_code === 'string' && params.referral_code) {
            setReferralCode(params.referral_code);
        }
    }, [params.referral_code]);

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password) {
            setErrorMessage('Please fill in your name, email, and password.');
            return;
        }

        if (!phone.trim()) {
            setErrorMessage('Please provide your mobile phone number.');
            return;
        }

        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters long.');
            return;
        }

        if (!termsAccepted) {
            setErrorMessage(
                'Please accept the Terms & Conditions and Privacy Policy.',
            );
            return;
        }

        setLoading(true);
        setErrorMessage('');
        try {
            await registerCustomer({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                password,
                terms_accepted: termsAccepted,
                marketing_consent: false,
                ...(referralCode.trim()
                    ? { referral_code: referralCode.trim().toUpperCase() }
                    : {}),
            });
            const pendingTarget = consumePendingRedirect();
            router.replace((pendingTarget || '/(customer)/explore') as never);
        } catch (err: any) {
            setErrorMessage(
                err?.message || 'Registration failed. Please check the form.',
            );
        } finally {
            setLoading(false);
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
                    <Text style={styles.title}>Join TIJUM</Text>
                    <Text style={styles.subtitle}>
                        Create your customer account to book verified stays with
                        clear food and meal details.
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
                        label="Full Name"
                        placeholder="Aditya Varma"
                        value={name}
                        onChangeText={setName}
                    />

                    <Input
                        label="Email Address"
                        placeholder="aditya@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Input
                        label="Mobile Phone (Required)"
                        placeholder="+91 98765 43210"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />

                    <Input
                        label="Password (min 8 characters)"
                        placeholder="••••••••"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <Input
                        label="Referral Code (Optional)"
                        placeholder="e.g. TIJUMFRIEND"
                        autoCapitalize="characters"
                        autoCorrect={false}
                        value={referralCode}
                        onChangeText={setReferralCode}
                    />

                    {/* Terms & Conditions Acceptance */}
                    <View style={styles.termsRow}>
                        <TouchableOpacity
                            style={styles.checkboxHitTarget}
                            activeOpacity={0.8}
                            accessibilityRole="checkbox"
                            accessibilityLabel="Accept Terms & Conditions and Privacy Policy"
                            accessibilityState={{ checked: termsAccepted }}
                            onPress={() => setTermsAccepted(!termsAccepted)}
                        >
                            <View
                                style={[
                                    styles.checkbox,
                                    termsAccepted && styles.checkboxActive,
                                ]}
                            >
                                {termsAccepted && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.termsText}>
                            <Text
                                onPress={() => setTermsAccepted(!termsAccepted)}
                            >
                                I accept the{' '}
                            </Text>
                            <Text
                                style={styles.termsLink}
                                onPress={() => router.push('/legal/terms')}
                            >
                                Terms & Conditions
                            </Text>
                            <Text
                                onPress={() => setTermsAccepted(!termsAccepted)}
                            >
                                {' '}
                                and{' '}
                            </Text>
                            <Text
                                style={styles.termsLink}
                                onPress={() => router.push('/legal/privacy')}
                            >
                                Privacy Policy
                            </Text>
                            .
                        </Text>
                    </View>

                    <Button
                        title="Create Customer Account"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        onPress={handleRegister}
                        style={styles.submitButton}
                    />
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Already have an account?{' '}
                    </Text>
                    <TouchableOpacity
                        style={styles.footerLinkBtn}
                        accessibilityRole="button"
                        onPress={() => router.replace('/(auth)/customer-login')}
                    >
                        <Text style={styles.linkText}>Sign In</Text>
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
    submitButton: {
        marginTop: Spacing.md,
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: Spacing.xs,
    },
    checkboxHitTarget: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: Colors.gray400,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
    },
    checkboxActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    checkmark: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '800',
        lineHeight: 14,
    },
    termsText: {
        flex: 1,
        fontFamily: Typography.fontFamily.body,
        fontSize: Typography.fontSize.xs,
        color: Colors.inkSecondary,
        lineHeight: 18,
    },
    termsLink: {
        color: Colors.coralDark,
        fontFamily: Typography.fontFamily.bodyBold,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    footerLinkBtn: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    footerText: {
        fontFamily: Typography.fontFamily.body,
        fontSize: Typography.fontSize.sm,
        color: Colors.inkSecondary,
    },
    linkText: {
        fontFamily: Typography.fontFamily.heading,
        fontSize: Typography.fontSize.sm,
        color: Colors.coralDark,
    },
});
