import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
    Landmark,
    FileText,
    Bell,
    Headset,
    Info,
    Repeat,
    ChevronRight,
    Edit3,
    LogOut,
    LogIn,
    X,
    User,
    Building2,
    Lock,
    Laptop,
    ShieldAlert,
    Star,
} from 'lucide-react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { OwnerApi } from '../../src/api/owner';
import { MobileSessionToken, OwnerProfile } from '../../src/api/types';
import { Button } from '../../src/components/Button';
import { ExceptionalState } from '../../src/components/ExceptionalState';
import { Input } from '../../src/components/Input';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../src/theme/spacing';

export default function PartnerAccountScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const { owner, token, authState, logout, refreshProfile, sessionEpoch } =
        useAuth();
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'customer' | 'owner'>(
        'owner',
    );
    const [profile, setProfile] = useState<OwnerProfile | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Edit Profile Modal
    const [editProfileVisible, setEditProfileVisible] = useState(false);
    const [editName, setEditName] = useState(owner?.name ?? '');
    const [editPhone, setEditPhone] = useState(owner?.phone ?? '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState('');

    // Change Password Modal
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    // Active Sessions Modal
    const [sessionsModalVisible, setSessionsModalVisible] = useState(false);
    const [tokens, setTokens] = useState<MobileSessionToken[]>([]);
    const [tokensLoading, setTokensLoading] = useState(false);
    const [revokingAll, setRevokingAll] = useState(false);

    const isGuest = !token || authState !== 'owner_authenticated';

    useEffect(() => {
        setProfile(null);
        setUnreadCount(0);
        setTokens([]);
    }, [sessionEpoch]);

    const loadPartnerAccount = useCallback(async () => {
        if (isGuest) return;
        try {
            const [profileRes, unreadRes] = await Promise.all([
                OwnerApi.getProfile().catch(() => null),
                OwnerApi.getUnreadCount().catch(() => null),
            ]);
            if (profileRes?.data) {
                setProfile(profileRes.data);
                setEditName(profileRes.data.name || '');
                setEditPhone(profileRes.data.phone || '');
            }
            if (typeof unreadRes?.data?.unread_count === 'number') {
                setUnreadCount(unreadRes.data.unread_count);
            }
        } catch {
            // Keep cached profile
        }
    }, [isGuest]);

    useEffect(() => {
        if (isFocused && !isGuest) {
            void loadPartnerAccount();
        }
    }, [isFocused, isGuest, loadPartnerAccount]);

    const loadTokens = async () => {
        try {
            setTokensLoading(true);
            const res = await OwnerApi.getTokens();
            setTokens(Array.isArray(res.data) ? res.data : []);
        } catch {
            setTokens([]);
        } finally {
            setTokensLoading(false);
        }
    };

    const handleOpenEditProfile = () => {
        setEditName(profile?.name || owner?.name || '');
        setEditPhone(profile?.phone || owner?.phone || '');
        setProfileError('');
        setEditProfileVisible(true);
    };

    const handleSaveProfile = async () => {
        if (editName.trim().length < 2) {
            setProfileError('Please enter your full name.');
            return;
        }
        try {
            setSavingProfile(true);
            setProfileError('');
            await OwnerApi.updateProfile({
                name: editName.trim(),
                phone: editPhone.trim() || undefined,
            });
            await refreshProfile().catch(() => {});
            await loadPartnerAccount();
            setEditProfileVisible(false);
            Alert.alert('Profile Updated', 'Partner profile saved.');
        } catch (err: any) {
            setProfileError(
                err?.message || 'Could not update partner profile.',
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSavePassword = async () => {
        if (!currentPassword.trim()) {
            setPasswordError('Please enter your current password.');
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError('Your new password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('The new passwords do not match.');
            return;
        }
        try {
            setSavingPassword(true);
            setPasswordError('');
            await OwnerApi.changePassword({
                current_password: currentPassword,
                password: newPassword,
                password_confirmation: confirmPassword,
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordModalVisible(false);
            Alert.alert(
                'Password Updated',
                'Your partner password has been updated. Other sessions have been signed out.',
            );
        } catch (err: any) {
            setPasswordError(err?.message || 'Could not update password.');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleRevokeAllDevices = () => {
        Alert.alert(
            'Sign Out All Devices?',
            'All active partner sessions (including this device) will be signed out immediately.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setRevokingAll(true);
                            await OwnerApi.revokeAllTokens();
                            setSessionsModalVisible(false);
                            await logout();
                            router.replace('/(auth)/owner-login');
                        } catch (err: any) {
                            Alert.alert(
                                'Error',
                                err?.message || 'Could not revoke sessions.',
                            );
                        } finally {
                            setRevokingAll(false);
                        }
                    },
                },
            ],
        );
    };

    const partnerName = isGuest
        ? 'Partner'
        : profile?.name || owner?.name || '—';
    const partnerEmail = isGuest ? '' : profile?.email || owner?.email || '';
    const partnerId = isGuest
        ? '—'
        : String(profile?.id ?? owner?.id ?? '—');
    const partnerStatusLabel =
        profile?.status_label || owner?.status_label || 'Active';

    const handleSwitchRole = async () => {
        setRoleModalVisible(false);
        if (selectedRole === 'customer') {
            await logout();
            router.replace('/(auth)/customer-login');
        }
    };

    const handleLogOut = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out of Partner Portal?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/owner-login');
                    },
                },
            ],
        );
    };

    if (!token || authState !== 'owner_authenticated') {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View
                    style={[
                        styles.plumHeader,
                        { paddingTop: Math.max(insets.top, Spacing.sm) },
                    ]}
                >
                    <Text style={styles.headerTitle}>Partner Account</Text>
                </View>
                <ExceptionalState
                    type="auth-required"
                    title="Partner Access Required"
                    description="Please sign in to your verified partner portal to manage properties, reservations, and financial details."
                    actionLabel="Sign In as Partner"
                    onAction={() => router.push('/(auth)/owner-login')}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Curved Deep Plum Header */}
                <View
                    style={[
                        styles.plumHeader,
                        { paddingTop: Math.max(insets.top, Spacing.sm) },
                    ]}
                >
                    <View style={styles.headerTopRow}>
                        <View style={{ width: 44 }} />
                        <Text style={styles.headerTitle}>Profile</Text>
                        <TouchableOpacity
                            style={{
                                width: 44,
                                height: 44,
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                            }}
                            onPress={() =>
                                router.push('/(partner)/notifications')
                            }
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Open partner notifications"
                        >
                            <Bell size={22} color={Colors.white} />
                            {unreadCount > 0 ? (
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        minWidth: 18,
                                        height: 18,
                                        borderRadius: 9,
                                        backgroundColor: Colors.coral,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingHorizontal: 4,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: Colors.deepPlum,
                                            fontSize: 10,
                                            fontWeight: '800',
                                        }}
                                    >
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    </View>

                    {/* Partner Avatar & Info Card */}
                    <View style={styles.userCard}>
                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarImg}>
                                <User size={38} color={Colors.deepPlum} />
                            </View>
                            <TouchableOpacity
                                style={styles.editAvatarBadge}
                                hitSlop={{
                                    top: 10,
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                }}
                                onPress={handleOpenEditProfile}
                                accessibilityRole="button"
                                accessibilityLabel="Edit partner profile"
                            >
                                <Edit3 size={11} color={Colors.white} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.userName}>{partnerName}</Text>
                        {partnerEmail ? (
                            <Text style={styles.partnerIdText}>
                                {partnerEmail} • Partner ID: {partnerId}
                            </Text>
                        ) : (
                            <Text style={styles.partnerIdText}>
                                Partner ID: {partnerId}
                            </Text>
                        )}

                        {!isGuest && (
                            <View style={styles.guestNoticeBadge}>
                                <Text style={styles.guestNoticeText}>
                                    {partnerStatusLabel}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Menu List */}
                <View style={styles.menuCard}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleOpenEditProfile}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                    >
                        <View style={styles.menuItemLeft}>
                            <User size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Edit Partner Profile
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setPasswordError('');
                            setPasswordModalVisible(true);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                    >
                        <View style={styles.menuItemLeft}>
                            <Lock size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Change Password
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setSessionsModalVisible(true);
                            void loadTokens();
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                    >
                        <View style={styles.menuItemLeft}>
                            <Laptop size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Active Device Sessions
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 1. Bank Details & Tax Information */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            router.push('/(partner)/financial-profile')
                        }
                        activeOpacity={0.7}
                        accessibilityRole="button"
                    >
                        <View style={styles.menuItemLeft}>
                            <Landmark size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Bank & Tax Information (KYC)
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 2. Commission Agreements */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            router.push(
                                '/(partner)/financial-profile/agreements',
                            )
                        }
                        activeOpacity={0.7}
                        accessibilityRole="button"
                    >
                        <View style={styles.menuItemLeft}>
                            <FileText size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Commission Agreements
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(partner)/cases')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                    >
                        <View style={styles.menuItemLeft}>
                            <ShieldAlert size={18} color={Colors.coralDark} />
                            <Text style={styles.menuItemLabel}>
                                Support & Protection Cases
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(partner)/reviews')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                    >
                        <View style={styles.menuItemLeft}>
                            <Star size={18} color={Colors.amber} />
                            <Text style={styles.menuItemLabel}>
                                Guest Reviews
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 3. Notifications */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(partner)/notifications')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                    >
                        <View style={styles.menuItemLeft}>
                            <Bell size={18} color={Colors.coralDark} />
                            <Text style={styles.menuItemLabel}>
                                Notifications
                            </Text>
                        </View>
                        {unreadCount > 0 ? (
                            <View style={styles.badgeCountPill}>
                                <Text style={styles.badgeCountText}>
                                    {unreadCount}
                                </Text>
                            </View>
                        ) : (
                            <ChevronRight size={16} color={Colors.gray400} />
                        )}
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 4. Help & Support */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/help')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Headset size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Help & Support
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 5. About TIJUM */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/legal/about')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Info size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                About TIJUM
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 6. Terms & Conditions */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/legal/terms')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <FileText size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Terms & Conditions
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 7. Privacy Policy */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/legal/privacy')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Info size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Privacy Policy
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 8. Switch Role */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setRoleModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Repeat size={18} color={Colors.coral} />
                            <Text style={styles.menuItemLabel}>
                                Switch Role
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>
                </View>

                {/* Log Out or Sign In */}
                <TouchableOpacity
                    style={styles.authActionButton}
                    onPress={
                        isGuest
                            ? () => router.push('/(auth)/owner-login')
                            : handleLogOut
                    }
                    activeOpacity={0.85}
                >
                    {isGuest ? (
                        <>
                            <LogIn
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={styles.authActionText}>
                                Host Sign In
                            </Text>
                        </>
                    ) : (
                        <>
                            <LogOut
                                size={18}
                                color={Colors.coral}
                                style={{ marginRight: 8 }}
                            />
                            <Text
                                style={[
                                    styles.authActionText,
                                    { color: Colors.coral },
                                ]}
                            >
                                Log Out
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Footer Copyright */}
                <Text style={styles.copyrightText}>
                    © 2026 TIJUM Partner. All rights reserved.
                </Text>
            </ScrollView>

            {/* Switch Role Modal */}
            <Modal
                visible={roleModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setRoleModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.roleModalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Switch Role</Text>
                            <TouchableOpacity
                                onPress={() => setRoleModalVisible(false)}
                            >
                                <X size={20} color={Colors.gray600} />
                            </TouchableOpacity>
                        </View>

                        {/* Customer Option */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                selectedRole === 'customer' &&
                                    styles.roleCardActive,
                            ]}
                            onPress={() => setSelectedRole('customer')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.roleIconCircle}>
                                <User size={20} color={Colors.deepPlum} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.roleCardTitle}>
                                    Customer
                                </Text>
                                <Text style={styles.roleCardDesc}>
                                    Book stays, find properties and enjoy
                                    services.
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Owner Option */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                selectedRole === 'owner' &&
                                    styles.roleCardActive,
                            ]}
                            onPress={() => setSelectedRole('owner')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.roleIconCircle}>
                                <Building2 size={20} color={Colors.deepPlum} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.roleCardTitle}>Owner</Text>
                                <Text style={styles.roleCardDesc}>
                                    List properties, manage bookings and grow
                                    business.
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.switchConfirmBtn}
                            onPress={handleSwitchRole}
                        >
                            <Text style={styles.switchConfirmBtnText}>
                                {selectedRole === 'customer'
                                    ? 'Switch to Customer →'
                                    : 'Keep as Owner'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.roleFooterNote}>
                            You can switch roles anytime from your profile.
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* Edit Partner Profile Modal */}
            <Modal
                visible={editProfileVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setEditProfileVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.roleModalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Partner Profile</Text>
                            <TouchableOpacity
                                onPress={() => setEditProfileVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close edit profile modal"
                            >
                                <X size={20} color={Colors.inkSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {profileError ? (
                                <Text style={[styles.roleCardDesc, { color: Colors.coral, marginBottom: Spacing.sm }]}>
                                    {profileError}
                                </Text>
                            ) : null}
                            <Input
                                label="Full Name *"
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Owner / Authorized Signatory Name"
                            />
                            <Input
                                label="Phone Number"
                                value={editPhone}
                                onChangeText={setEditPhone}
                                keyboardType="phone-pad"
                                placeholder="10-digit mobile number"
                            />
                            <Button
                                title="Save Partner Profile"
                                onPress={handleSaveProfile}
                                loading={savingProfile}
                                fullWidth
                            />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                visible={passwordModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPasswordModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.roleModalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity
                                onPress={() => setPasswordModalVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close change password modal"
                            >
                                <X size={20} color={Colors.inkSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {passwordError ? (
                                <Text style={[styles.roleCardDesc, { color: Colors.coral, marginBottom: Spacing.sm }]}>
                                    {passwordError}
                                </Text>
                            ) : null}
                            <Input
                                label="Current Password *"
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry
                                placeholder="Enter current password"
                            />
                            <Input
                                label="New Password *"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                placeholder="At least 8 characters"
                            />
                            <Input
                                label="Confirm New Password *"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                placeholder="Repeat new password"
                            />
                            <Button
                                title="Update Password"
                                onPress={handleSavePassword}
                                loading={savingPassword}
                                fullWidth
                            />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Active Device Sessions Modal */}
            <Modal
                visible={sessionsModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSessionsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.roleModalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Active Device Sessions</Text>
                            <TouchableOpacity
                                onPress={() => setSessionsModalVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close device sessions modal"
                            >
                                <X size={20} color={Colors.inkSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.roleCardDesc, { marginBottom: Spacing.md }]}>
                            Manage mobile devices and active sessions authenticated on your partner account.
                        </Text>
                        <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                            {tokensLoading ? (
                                <ActivityIndicator size="small" color={Colors.deepPlum} />
                            ) : tokens.length === 0 ? (
                                <Text style={[styles.roleCardDesc, { textAlign: 'center', paddingVertical: Spacing.md }]}>
                                    No active device sessions found.
                                </Text>
                            ) : (
                                tokens.map((tok: MobileSessionToken) => (
                                    <View key={tok.id} style={styles.roleCard}>
                                        <View style={styles.roleIconCircle}>
                                            <Laptop size={18} color={Colors.deepPlum} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.roleCardTitle}>
                                                {tok.name || 'Partner Device Session'}
                                            </Text>
                                            <Text style={styles.roleCardDesc}>
                                                {tok.is_current ? 'Current Session' : 'Other Device'}
                                                {tok.last_used_at ? ` • ${tok.last_used_at}` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                        <Button
                            title="Sign Out All Registered Devices"
                            variant="outline"
                            onPress={handleRevokeAllDevices}
                            loading={revokingAll}
                            fullWidth
                            style={{ marginTop: Spacing.sm }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.canvas,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    plumHeader: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.base,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xl,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.white,
    },
    userCard: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: Spacing.sm,
    },
    avatarImg: {
        width: 82,
        height: 82,
        borderRadius: 41,
        borderWidth: 3,
        borderColor: Colors.coral,
        backgroundColor: Colors.warmCream,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editAvatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.deepPlum,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
    },
    userName: {
        fontSize: 19,
        fontWeight: '800',
        color: Colors.white,
    },
    partnerIdText: {
        fontSize: 13,
        color: Colors.warmCream,
        marginTop: 2,
        opacity: 0.9,
    },
    guestNoticeBadge: {
        backgroundColor: Colors.peachCream,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        marginTop: 6,
    },
    guestNoticeText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.plumPrimary,
    },
    menuCard: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.base,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.card,
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 15,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.inkPrimary,
        marginLeft: Spacing.md,
    },
    badgeCountPill: {
        backgroundColor: Colors.coral,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    badgeCountText: {
        color: Colors.white,
        fontSize: 11,
        fontWeight: '800',
    },
    menuDivider: {
        height: 1,
        backgroundColor: Colors.borderSubtle,
        marginHorizontal: Spacing.base,
    },
    authActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.base,
        paddingVertical: 14,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    authActionText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    copyrightText: {
        textAlign: 'center',
        fontSize: 11,
        color: Colors.inkMuted,
        marginTop: Spacing.xl,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    roleModalContainer: {
        backgroundColor: Colors.white,
        width: '100%',
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        ...Shadows.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.base,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.inkPrimary,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.borderSubtle,
        backgroundColor: Colors.surfaceSubtle,
        marginBottom: Spacing.md,
    },
    roleCardActive: {
        borderColor: Colors.deepPlum,
        backgroundColor: Colors.peachCream,
    },
    roleIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    roleCardDesc: {
        fontSize: 12,
        color: Colors.inkSecondary,
        marginTop: 2,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.gray400,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioCircleActive: {
        borderColor: Colors.deepPlum,
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.deepPlum,
    },
    switchConfirmBtn: {
        backgroundColor: Colors.deepPlum,
        paddingVertical: 13,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    switchConfirmBtnText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    roleFooterNote: {
        textAlign: 'center',
        fontSize: 11,
        color: Colors.inkMuted,
        marginTop: 10,
    },
});
