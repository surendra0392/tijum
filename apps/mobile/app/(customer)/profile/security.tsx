import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Laptop, ShieldCheck } from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { MobileSessionToken } from '../../../src/api/types';
import { useAuth } from '../../../src/auth/AuthContext';
import { AppHeader } from '../../../src/components/AppHeader';
import { RequireAuth } from '../../../src/components/RequireAuth';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';

export default function CustomerSecurityScreen() {
    const router = useRouter();
    const { logout } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [tokens, setTokens] = useState<MobileSessionToken[]>([]);
    const [tokensLoading, setTokensLoading] = useState(true);
    const [tokensError, setTokensError] = useState<string | null>(null);
    const [revokingAll, setRevokingAll] = useState(false);

    const loadTokens = useCallback(async () => {
        try {
            setTokensLoading(true);
            setTokensError(null);
            const res = await CustomerApi.getTokens();
            setTokens(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            setTokensError(
                err?.message || 'Unable to load active device sessions.',
            );
        } finally {
            setTokensLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadTokens();
    }, [loadTokens]);

    const handleSubmit = async () => {
        if (!currentPassword.trim()) {
            setError('Please enter your current password.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Your new password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('The new passwords do not match.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await CustomerApi.changePassword({
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            void loadTokens();
            Alert.alert(
                'Password Updated',
                'Your password has been changed successfully. Other active sessions and devices have been signed out for your security.',
                [{ text: 'OK', onPress: () => router.back() }],
            );
        } catch (err: any) {
            setError(err?.message || 'Could not change your password.');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeAllDevices = () => {
        Alert.alert(
            'Sign Out All Devices?',
            'All active mobile and web API sessions (including this device) will be signed out immediately.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setRevokingAll(true);
                            await CustomerApi.revokeAllTokens();
                            await logout();
                            router.replace('/(auth)/customer-login');
                        } catch (err: any) {
                            Alert.alert(
                                'Session Revocation Failed',
                                err?.message ||
                                    'Could not revoke device sessions. Please try again.',
                            );
                        } finally {
                            setRevokingAll(false);
                        }
                    },
                },
            ],
        );
    };

    return (
        <RequireAuth role="customer">
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <AppHeader
                    title="Account Security"
                    showBack
                    fallbackRoute="/(customer)/profile"
                />
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.introCard}>
                            <Text style={styles.heading}>Account Security</Text>
                            <Text style={styles.subheading}>
                                Use at least 8 characters. Avoid reusing a
                                password from another service.
                            </Text>
                        </View>

                        <Input
                            label="Current Password"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                            placeholder="Enter current password"
                        />
                        <Input
                            label="New Password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            placeholder="At least 8 characters"
                        />
                        <Input
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            placeholder="Re-enter new password"
                        />

                        {error ? (
                            <Text style={styles.errorText}>{error}</Text>
                        ) : null}

                        <Button
                            title="Update Password"
                            onPress={handleSubmit}
                            loading={loading}
                            size="lg"
                        />

                        {/* Active Sessions */}
                        <View style={styles.sessionsSection}>
                            <View style={styles.sessionsHeaderRow}>
                                <ShieldCheck
                                    size={18}
                                    color={Colors.deepPlum}
                                    style={{ marginRight: 8 }}
                                />
                                <Text style={styles.sessionsHeading}>
                                    Active Device Sessions
                                </Text>
                            </View>
                            <Text style={styles.sessionsSubtitle}>
                                Devices currently signed in to your TIJUM
                                customer account.
                            </Text>

                            {tokensLoading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.deepPlum}
                                    style={{ marginVertical: Spacing.md }}
                                />
                            ) : tokensError ? (
                                <View style={styles.sessionErrorBox}>
                                    <Text style={styles.errorText}>
                                        {tokensError}
                                    </Text>
                                    <Button
                                        title="Retry"
                                        variant="outline"
                                        size="sm"
                                        onPress={() => void loadTokens()}
                                    />
                                </View>
                            ) : tokens.length === 0 ? (
                                <Text style={styles.emptyTokensText}>
                                    No active session details available.
                                </Text>
                            ) : (
                                <View style={styles.tokensList}>
                                    {tokens.map((tok) => (
                                        <View
                                            key={tok.id}
                                            style={styles.tokenRow}
                                        >
                                            <Laptop
                                                size={18}
                                                color={Colors.deepPlum}
                                                style={{ marginRight: 10 }}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <View
                                                    style={styles.tokenTitleRow}
                                                >
                                                    <Text
                                                        style={styles.tokenName}
                                                        numberOfLines={1}
                                                    >
                                                        {tok.name ||
                                                            'Mobile Session'}
                                                    </Text>
                                                    {tok.is_current ? (
                                                        <View
                                                            style={
                                                                styles.currentBadge
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.currentBadgeText
                                                                }
                                                            >
                                                                This Device
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                                <Text style={styles.tokenMeta}>
                                                    {tok.last_used_at
                                                        ? `Last active: ${new Date(tok.last_used_at).toLocaleString()}`
                                                        : `Signed in: ${new Date(tok.created_at).toLocaleString()}`}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Button
                                title="Sign Out All Devices"
                                variant="outline"
                                loading={revokingAll}
                                onPress={handleRevokeAllDevices}
                                style={{ marginTop: Spacing.md }}
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </RequireAuth>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    content: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl,
    },
    introCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.base,
        marginBottom: Spacing.lg,
    },
    heading: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
    },
    subheading: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkSecondary,
    },
    errorText: {
        color: Colors.dangerText,
        fontSize: 13,
        marginBottom: Spacing.sm,
    },
    sessionsSection: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        padding: Spacing.base,
        marginTop: Spacing.xl,
    },
    sessionsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    sessionsHeading: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    sessionsSubtitle: {
        fontSize: 12,
        color: Colors.inkSecondary,
        marginBottom: Spacing.md,
    },
    sessionErrorBox: {
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    emptyTokensText: {
        fontSize: 12,
        color: Colors.inkMuted,
    },
    tokensList: {
        gap: Spacing.sm,
    },
    tokenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.warmCream,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    tokenTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tokenName: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.inkPrimary,
        flexShrink: 1,
    },
    currentBadge: {
        backgroundColor: Colors.successLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    currentBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#065F46',
    },
    tokenMeta: {
        fontSize: 11,
        color: Colors.inkSecondary,
        marginTop: 2,
    },
});
