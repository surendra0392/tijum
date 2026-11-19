import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import { OwnerApi } from '../../src/api/owner';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { Typography } from '../../src/theme/typography';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Badge } from '../../src/components/Badge';
import { Building2, User, Lock, ShieldCheck } from 'lucide-react-native';

export default function PartnerAccountScreen() {
    const router = useRouter();
    const { owner, logout, refreshProfile } = useAuth();

    // Contact Profile State
    const [name, setName] = useState(owner?.name || '');
    const [phone, setPhone] = useState(owner?.phone || '');
    const [savingProfile, setSavingProfile] = useState(false);

    // Security Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        if (owner) {
            if (owner.name) setName(owner.name);
            if (owner.phone) setPhone(owner.phone);
        }
    }, [owner]);

    const handleUpdateContact = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter your contact name.');
            return;
        }

        try {
            setSavingProfile(true);
            const res = await OwnerApi.updateProfile({
                name: name.trim(),
                phone: phone.trim() || undefined,
            });

            if (res.data) {
                await refreshProfile();
                Alert.alert(
                    'Profile Updated',
                    'Your primary contact information has been updated successfully.',
                );
            }
        } catch (e: any) {
            Alert.alert(
                'Update Failed',
                e.message || 'Could not update contact profile.',
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword) {
            Alert.alert('Required', 'Please enter your current password.');
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            Alert.alert(
                'Invalid Password',
                'New password must be at least 8 characters long.',
            );
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert(
                'Mismatch',
                'New password and confirmation do not match.',
            );
            return;
        }

        try {
            setSavingPassword(true);
            await OwnerApi.changePassword({
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            });

            Alert.alert(
                'Password Updated',
                'Your host account security password has been changed successfully.',
            );
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (e: any) {
            Alert.alert(
                'Password Update Failed',
                e.message || 'Could not change password. Please verify current credentials.',
            );
        } finally {
            setSavingPassword(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out of the Host Portal?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/');
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Host Avatar / Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarCircle}>
                        {owner?.name ? (
                            <Text style={styles.avatarText}>
                                {owner.name.charAt(0).toUpperCase()}
                            </Text>
                        ) : (
                            <Building2 size={32} color={Colors.white} />
                        )}
                    </View>
                    <Text style={styles.userName}>
                        {owner?.name || 'Accommodation Partner'}
                    </Text>
                    <Text style={styles.userEmail}>{owner?.email}</Text>
                    <View style={{ marginTop: Spacing.xs }}>
                        <Badge label="VERIFIED HOST" variant="accent" />
                    </View>
                </View>

                <View style={styles.contentPadding}>
                    {/* Primary Contact Settings */}
                    <View style={styles.sectionTitleRow}>
                        <User
                            size={18}
                            color={Colors.deepPlum}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.sectionTitle}>
                            Primary Partner Contact
                        </Text>
                    </View>
                    <View style={styles.formCard}>
                        <Input
                            label="Full Name"
                            value={name}
                            onChangeText={setName}
                            placeholder="Primary host full name"
                        />
                        <Input
                            label="Contact Phone Number"
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+91 98765 43210"
                            keyboardType="phone-pad"
                        />
                        <View style={styles.readOnlyRow}>
                            <Text style={styles.readOnlyLabel}>
                                Registered Email:
                            </Text>
                            <Text style={styles.readOnlyValue}>
                                {owner?.email}
                            </Text>
                        </View>
                        <Text style={styles.helperNotice}>
                            Official email updates require administrative review.
                        </Text>
                        <Button
                            title="Save Contact Details"
                            loading={savingProfile}
                            onPress={handleUpdateContact}
                            style={{ marginTop: Spacing.xs }}
                        />
                    </View>

                    {/* Security & Password Settings */}
                    <View style={styles.divider} />
                    <View style={styles.sectionTitleRow}>
                        <Lock
                            size={18}
                            color={Colors.deepPlum}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.sectionTitle}>
                            Security & Credentials
                        </Text>
                    </View>
                    <View style={styles.formCard}>
                        <Input
                            label="Current Password"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Enter current password"
                            secureTextEntry
                        />
                        <Input
                            label="New Password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Min. 8 characters"
                            secureTextEntry
                        />
                        <Input
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Repeat new password"
                            secureTextEntry
                        />
                        <Button
                            title="Update Password"
                            variant="outline"
                            loading={savingPassword}
                            onPress={handleChangePassword}
                            style={{ marginTop: Spacing.xs }}
                        />
                    </View>

                    {/* Host Business Credentials */}
                    <View style={styles.divider} />
                    <View style={styles.sectionTitleRow}>
                        <Building2
                            size={18}
                            color={Colors.deepPlum}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.sectionTitle}>
                            Host Business Information
                        </Text>
                    </View>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Business Name:</Text>
                            <Text style={styles.infoValue}>
                                {owner?.business_name || 'Independent Accommodation Host'}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Account Status:</Text>
                            <Text style={[styles.infoValue, { color: Colors.forestGreen }]}>
                                {owner?.status_label || 'Active Partner'}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                                Marketplace Agreement:
                            </Text>
                            <Text
                                style={[
                                    styles.infoValue,
                                    { color: Colors.forestGreen },
                                ]}
                            >
                                Active & Verified
                            </Text>
                        </View>
                    </View>

                    {/* Settlement Account Status */}
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>
                        Settlement & Route Status
                    </Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                                Settlement Channel:
                            </Text>
                            <Text style={styles.infoValue}>
                                Razorpay Route Linked Account
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                                Payout Schedule:
                            </Text>
                            <Text style={styles.infoValue}>
                                T+3 Weekly Batch
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>
                                Payout Currency:
                            </Text>
                            <Text style={styles.infoValue}>INR (₹)</Text>
                        </View>
                    </View>

                    {/* Switch to Customer Portal */}
                    <View style={styles.divider} />
                    <Button
                        title="Switch to Customer (Guest) Portal"
                        variant="outline"
                        onPress={() => {
                            logout();
                            router.replace('/');
                        }}
                        style={{ marginBottom: Spacing.sm }}
                    />

                    <Button
                        title="Sign Out"
                        variant="outline"
                        onPress={handleLogout}
                        style={styles.logoutBtn}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    header: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        backgroundColor: Colors.warmOffWhite,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    avatarCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.deepPlum,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    avatarText: {
        fontSize: 28,
        color: Colors.white,
        fontWeight: '700',
    },
    userName: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
    },
    userEmail: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginTop: 2,
    },
    contentPadding: {
        padding: Spacing.lg,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    sectionTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
    },
    formCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    readOnlyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        marginTop: 4,
    },
    readOnlyLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    readOnlyValue: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        fontWeight: '600',
    },
    helperNotice: {
        fontSize: 11,
        color: Colors.gray500,
        marginBottom: Spacing.sm,
        fontStyle: 'italic',
    },
    infoCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    infoValue: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.gray200,
        marginVertical: Spacing.xl,
    },
    logoutBtn: {
        borderColor: Colors.coral,
    },
});
