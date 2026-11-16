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

export default function CustomerRegisterScreen() {
    const router = useRouter();
    const { registerCustomer } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

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
                terms_accepted: true,
                marketing_consent: false,
            });
            PushNotificationService.registerForPushNotifications(
                'customer',
            ).catch(() => {});
            router.replace('/(customer)/explore');
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
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Join TIJUM</Text>
                    <Text style={styles.subtitle}>
                        Create your customer account to book verified
                        accommodations with daily homestyle meals included.
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

                    {/* Terms & Conditions Acceptance */}
                    <TouchableOpacity
                        style={styles.termsRow}
                        activeOpacity={0.8}
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
                        <Text style={styles.termsText}>
                            I accept the{' '}
                            <Text style={styles.termsLink}>
                                Terms & Conditions
                            </Text>{' '}
                            and{' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                            .
                        </Text>
                    </TouchableOpacity>

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
                        onPress={() => router.push('/(auth)/customer-login')}
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
        marginVertical: Spacing.sm,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: Colors.gray400,
        marginRight: Spacing.sm,
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
        fontSize: Typography.fontSize.xs,
        color: Colors.gray700,
        lineHeight: 16,
    },
    termsLink: {
        color: Colors.coral,
        fontWeight: '700',
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
});
