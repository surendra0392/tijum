import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CustomerApi } from '../../../src/api/customer';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';

export default function CustomerSecurityScreen() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
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

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.introCard}>
                    <Text style={styles.heading}>Account Security</Text>
                    <Text style={styles.subheading}>
                        Use at least 8 characters. Avoid reusing a password from
                        another service.
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

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Button
                    title="Update Password"
                    onPress={handleSubmit}
                    loading={loading}
                    size="lg"
                />
            </ScrollView>
        </KeyboardAvoidingView>
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
        color: Colors.rose,
        fontSize: 13,
        marginBottom: Spacing.sm,
    },
});
