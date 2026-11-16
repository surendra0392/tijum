import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Switch,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/auth/AuthContext';
import { CustomerApi } from '../../../src/api/customer';
import { CustomerProfile } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import {
    User,
    Lock,
    ShieldCheck,
    ChevronRight,
    ChevronDown,
    Coins,
    Gift,
} from 'lucide-react-native';

export default function CustomerProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [marketingConsent, setMarketingConsent] = useState(false);

    // Change Password
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const res = await CustomerApi.getProfile();
            if (res.data) {
                setProfile(res.data);
                setName(res.data.name);
                setPhone(res.data.phone || '');
                setMarketingConsent(res.data.marketing_consent);
            }
        } catch (e: any) {
            console.error('Failed to load profile', e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            setSaving(true);
            const res = await CustomerApi.updateProfile({
                name,
                phone,
                marketing_consent: marketingConsent,
            });
            if (res.data) {
                setProfile(res.data);
                Alert.alert('Success', 'Profile updated successfully.');
            }
        } catch (e: any) {
            Alert.alert(
                'Update Failed',
                e.message || 'Could not update profile.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            Alert.alert(
                'Mismatch',
                'New password and confirmation do not match.',
            );
            return;
        }

        try {
            setPasswordSaving(true);
            await CustomerApi.changePassword({
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            });
            Alert.alert('Password Changed', 'Your password has been updated.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordSection(false);
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to update password.');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/');
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.coral} />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Avatar / Header */}
                <View style={styles.header}>
                    <View style={styles.avatarCircle}>
                        {name ? (
                            <Text style={styles.avatarText}>
                                {name.charAt(0).toUpperCase()}
                            </Text>
                        ) : (
                            <User size={28} color={Colors.white} />
                        )}
                    </View>
                    <Text style={styles.userName}>{name}</Text>
                    <Text style={styles.userEmail}>{profile?.email}</Text>
                </View>

                <View style={styles.contentPadding}>
                    {/* Rewards & Loyalty Quick Access Card */}
                    <TouchableOpacity
                        style={styles.rewardsCard}
                        activeOpacity={0.85}
                        onPress={() =>
                            router.push('/(customer)/rewards' as any)
                        }
                    >
                        <View style={styles.rewardsIconBox}>
                            <Coins size={22} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={styles.rewardsBadgeRow}>
                                <Text style={styles.rewardsTitle}>
                                    Rewards & Points Club
                                </Text>
                                <View style={styles.rewardsHotTag}>
                                    <Text style={styles.rewardsHotTagText}>
                                        ACTIVE
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.rewardsSubtitle}>
                                View wallet balance, refer friends, and explore
                                stay vouchers
                            </Text>
                        </View>
                        <ChevronRight size={18} color={Colors.white} />
                    </TouchableOpacity>

                    {/* Personal Information Form */}
                    <Text style={styles.sectionTitle}>Personal Details</Text>
                    <Input
                        label="Full Name"
                        value={name}
                        onChangeText={setName}
                        placeholder="Your name"
                    />
                    <Input
                        label="Phone Number"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+91 98765 43210"
                        keyboardType="phone-pad"
                    />

                    <View style={styles.consentRow}>
                        <View style={{ flex: 1, marginRight: Spacing.md }}>
                            <Text style={styles.consentTitle}>
                                Special Offers & Marketing
                            </Text>
                            <Text style={styles.consentSubtitle}>
                                Receive exclusive discount updates and food menu
                                announcements
                            </Text>
                        </View>
                        <Switch
                            value={marketingConsent}
                            onValueChange={setMarketingConsent}
                            trackColor={{
                                false: Colors.gray300,
                                true: Colors.coral,
                            }}
                            thumbColor={Colors.white}
                        />
                    </View>

                    <Button
                        title="Save Profile"
                        loading={saving}
                        onPress={handleUpdateProfile}
                        style={{ marginTop: Spacing.md }}
                    />

                    {/* Change Password Section */}
                    <View style={styles.divider} />
                    <TouchableOpacity
                        style={styles.toggleRow}
                        onPress={() =>
                            setShowPasswordSection(!showPasswordSection)
                        }
                    >
                        <View style={styles.inlineRow}>
                            <Lock
                                size={16}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.toggleText}>
                                {showPasswordSection
                                    ? 'Hide Password Settings'
                                    : 'Change Password'}
                            </Text>
                        </View>
                        {showPasswordSection ? (
                            <ChevronDown size={16} color={Colors.gray600} />
                        ) : (
                            <ChevronRight size={16} color={Colors.gray600} />
                        )}
                    </TouchableOpacity>

                    {showPasswordSection ? (
                        <View style={styles.passwordCard}>
                            <Input
                                label="Current Password"
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry
                            />
                            <Input
                                label="New Password"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                            />
                            <Input
                                label="Confirm New Password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                            <Button
                                title="Update Password"
                                loading={passwordSaving}
                                onPress={handleChangePassword}
                                variant="secondary"
                            />
                        </View>
                    ) : null}

                    {/* Customer Protection Support */}
                    <View style={styles.divider} />
                    <Text style={styles.sectionTitle}>Customer Support</Text>
                    <TouchableOpacity
                        style={styles.menuRow}
                        onPress={() => router.push('/(customer)/support/index')}
                    >
                        <View style={styles.inlineRow}>
                            <ShieldCheck
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={styles.menuLabel}>
                                Grievance & Customer Protection
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    {/* Account Switch & Logout */}
                    <View style={styles.divider} />
                    <Button
                        title="Switch to Partner (Host) Portal"
                        variant="outline"
                        onPress={() => {
                            logout();
                            router.replace('/(auth)/owner-login');
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
    rewardsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepPlum,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    rewardsIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    rewardsBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rewardsTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.white,
    },
    rewardsHotTag: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 3,
    },
    rewardsHotTagText: {
        color: Colors.deepPlum,
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    rewardsSubtitle: {
        fontSize: 10,
        color: Colors.softPeach,
        marginTop: 2,
    },
    sectionTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
        marginBottom: Spacing.md,
    },
    consentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        marginVertical: Spacing.xs,
    },
    consentTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    consentSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.gray200,
        marginVertical: Spacing.xl,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    inlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleText: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    toggleArrow: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    passwordCard: {
        backgroundColor: Colors.warmOffWhite,
        padding: Spacing.md,
        borderRadius: 10,
        marginTop: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    menuRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.warmOffWhite,
        padding: Spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    menuLabel: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    menuArrow: {
        ...Typography.labelMedium,
        color: Colors.gray400,
    },
    logoutBtn: {
        borderColor: Colors.coral,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        ...Typography.bodyMedium,
        color: Colors.gray600,
        marginTop: Spacing.md,
    },
});
