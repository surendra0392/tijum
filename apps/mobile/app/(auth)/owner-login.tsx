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
import { AlertCircle, Mail, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { PublicApi } from '../../src/api/public';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { PushNotificationService } from '../../src/notifications/PushNotificationService';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { Typography } from '../../src/theme/typography';

export default function OwnerLoginScreen() {
    const router = useRouter();
    const { loginPartner, loginDemoPartner } = useAuth();

    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

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
                                    onPress={() => setShowForgotModal(false)}
                                    hitSlop={{
                                        top: 10,
                                        bottom: 10,
                                        left: 10,
                                        right: 10,
                                    }}
                                >
                                    <X size={20} color={Colors.gray600} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubtitle}>
                                Enter your registered accommodation partner email.
                                We will send you instructions to securely reset
                                your dashboard password.
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
