import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
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
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import {
    User,
    Calendar,
    Gift,
    Heart,
    Star,
    Headset,
    Bell,
    HelpCircle,
    Info,
    ShieldCheck,
    ChevronRight,
    Edit3,
    LogOut,
    FileText,
    Lock,
    Repeat,
    Trash2,
    X,
} from 'lucide-react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { CustomerApi } from '../../../src/api/customer';
import { CustomerProfile } from '../../../src/api/types';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { Button } from '../../../src/components/Button';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';

export default function CustomerProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, token, authState, logout, sessionEpoch } = useAuth();
    const isFocused = useIsFocused();
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [resendingVerification, setResendingVerification] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

    const isGuest =
        !token ||
        authState === 'guest' ||
        authState === 'session_expired' ||
        authState === 'owner_authenticated';

    useEffect(() => {
        setProfile(null);
        setWishlistCount(0);
        setUnreadCount(0);
    }, [sessionEpoch]);

    const loadProfile = useCallback(async () => {
        if (isGuest) {
            return;
        }

        setLoading(true);
        try {
            const [profileRes, wishlistRes, unreadRes] = await Promise.all([
                CustomerApi.getProfile(),
                CustomerApi.getWishlist().catch(() => null),
                CustomerApi.getUnreadCount().catch(() => null),
            ]);

            if (profileRes.data) {
                setProfile(profileRes.data);
            }
            if (Array.isArray(wishlistRes?.data)) {
                setWishlistCount(wishlistRes.data.length);
            }
            if (typeof unreadRes?.data?.unread_count === 'number') {
                setUnreadCount(unreadRes.data.unread_count);
            }
        } catch {
            // Keep the last known profile; the screen remains usable offline.
        } finally {
            setLoading(false);
        }
    }, [isGuest]);

    useEffect(() => {
        if (isFocused) {
            void loadProfile();
        }
    }, [isFocused, loadProfile]);

    useEffect(() => {
        if (isGuest) {
            setProfile(null);
            setWishlistCount(0);
        }
    }, [isGuest]);

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to log out of your account?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/customer-login');
                    },
                },
            ],
        );
    };

    const handleResendVerification = async () => {
        try {
            setResendingVerification(true);
            const res = await CustomerApi.resendEmailVerification();
            Alert.alert(
                res.data?.email_verified
                    ? 'Email Already Verified'
                    : 'Verification Email Sent',
                res.message ||
                    'Please check your inbox for the email verification link.',
            );
            if (res.data?.email_verified) {
                await loadProfile();
            }
        } catch (err: any) {
            Alert.alert(
                'Verification Failed',
                err?.message ||
                    'Could not send the verification email right now. Please try again later.',
            );
        } finally {
            setResendingVerification(false);
        }
    };

    const handleSwitchToPartner = () => {
        Alert.alert(
            'Switch to Partner',
            'You will be signed out of your customer account and can sign in to the partner portal.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/owner-login');
                    },
                },
            ],
        );
    };

    if (isGuest) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View
                    style={[
                        styles.plumHeader,
                        { paddingTop: Math.max(insets.top, Spacing.sm) },
                    ]}
                >
                    <Text style={styles.headerTitle}>Profile</Text>
                </View>
                <ExceptionalState
                    type="auth-required"
                    title="Sign In to Your Account"
                    description="Please sign in to manage your bookings, reward points, saved stays, and account settings."
                    actionLabel="Sign In as Customer"
                    onAction={() => router.push('/(auth)/customer-login')}
                />
            </SafeAreaView>
        );
    }

    const displayName = profile?.name || user?.name || 'TIJUM Guest';
    const displayEmail = profile?.email || user?.email || 'Email not available';
    const displayPhone = profile?.phone || user?.phone || '';
    const isEmailVerified = profile?.email_verified ?? user?.email_verified;
    const initial = displayName.trim().charAt(0).toUpperCase() || 'T';

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View
                    style={[
                        styles.plumHeader,
                        { paddingTop: Math.max(insets.top, Spacing.sm) },
                    ]}
                >
                    <View style={styles.headerTopRow}>
                        <View style={{ width: 44 }} />
                        <Text style={styles.headerTitle}>My Profile</Text>
                        <TouchableOpacity
                            style={styles.headerBellBtn}
                            onPress={() =>
                                router.push('/(customer)/notifications')
                            }
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Open notifications"
                        >
                            <Bell size={22} color={Colors.white} />
                            {unreadCount > 0 ? (
                                <View style={styles.bellBadge}>
                                    <Text style={styles.bellBadgeText}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.userCard}>
                        <View style={styles.avatarWrapper}>
                            <View style={styles.avatarImg}>
                                <Text style={styles.avatarInitial}>
                                    {initial}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.editAvatarBadge}
                                hitSlop={{
                                    top: 10,
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                }}
                                onPress={() =>
                                    router.push('/(customer)/profile/edit')
                                }
                                accessibilityRole="button"
                                accessibilityLabel="Edit profile"
                            >
                                <Edit3 size={11} color={Colors.white} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.userName}>{displayName}</Text>
                        <Text style={styles.userEmail}>{displayEmail}</Text>
                        {displayPhone ? (
                            <Text style={styles.userPhone}>{displayPhone}</Text>
                        ) : null}
                        {isEmailVerified === true ? (
                            <View style={styles.verifiedPill}>
                                <Text style={styles.verifiedPillText}>
                                    Email Verified
                                </Text>
                            </View>
                        ) : null}

                        {loading ? (
                            <ActivityIndicator
                                size="small"
                                color={Colors.coral}
                                style={{ marginTop: Spacing.sm }}
                            />
                        ) : null}
                    </View>
                </View>

                {isEmailVerified === false ? (
                    <View style={styles.verificationBanner}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.verificationBannerTitle}>
                                Verify your email address
                            </Text>
                            <Text style={styles.verificationBannerDesc}>
                                Confirm your email so you receive booking
                                receipts and security alerts.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.verificationActionBtn}
                            onPress={handleResendVerification}
                            disabled={resendingVerification}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.verificationActionText}>
                                {resendingVerification
                                    ? 'Sending...'
                                    : 'Resend Verification Email'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <View style={styles.menuCard}>
                    <MenuRow
                        icon={<User size={18} color={Colors.deepPlum} />}
                        label="Edit Profile"
                        onPress={() => router.push('/(customer)/profile/edit')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<Lock size={18} color={Colors.deepPlum} />}
                        label="Change Password"
                        onPress={() =>
                            router.push('/(customer)/profile/security')
                        }
                    />
                    <Divider />
                    <MenuRow
                        icon={<Calendar size={18} color={Colors.deepPlum} />}
                        label="My Bookings"
                        onPress={() => router.push('/(customer)/bookings')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<Gift size={18} color={Colors.coralDark} />}
                        label="Rewards & Referrals"
                        onPress={() => router.push('/(customer)/rewards')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<Heart size={18} color={Colors.coralDark} />}
                        label="My Wishlist"
                        badge={wishlistCount}
                        onPress={() => router.push('/(customer)/wishlist')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<Star size={18} color={Colors.amber} />}
                        label="My Reviews"
                        onPress={() => router.push('/(customer)/reviews')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<Headset size={18} color={Colors.deepPlum} />}
                        label="Support & Protection"
                        onPress={() => router.push('/(customer)/support')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<Bell size={18} color={Colors.coralDark} />}
                        label="Notification Settings"
                        badge={unreadCount}
                        onPress={() => router.push('/(customer)/notifications')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<HelpCircle size={18} color={Colors.deepPlum} />}
                        label="Help Centre"
                        onPress={() => router.push('/help')}
                    />
                </View>

                <View style={styles.menuCard}>
                    <MenuRow
                        icon={<FileText size={18} color={Colors.deepPlum} />}
                        label="Terms & Conditions"
                        onPress={() => router.push('/legal/terms')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<ShieldCheck size={18} color={Colors.deepPlum} />}
                        label="Privacy Policy"
                        onPress={() => router.push('/legal/privacy')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<Info size={18} color={Colors.deepPlum} />}
                        label="About TIJUM"
                        onPress={() => router.push('/legal/about')}
                    />
                    <Divider />
                    <MenuRow
                        icon={<Repeat size={18} color={Colors.coralDark} />}
                        label="Switch to Partner"
                        onPress={handleSwitchToPartner}
                    />
                    <Divider />
                    <MenuRow
                        icon={<Trash2 size={18} color={Colors.dangerText} />}
                        label="Request Account Deletion"
                        onPress={() => setDeleteModalVisible(true)}
                    />
                </View>

                <TouchableOpacity
                    style={styles.authActionButton}
                    onPress={handleSignOut}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                >
                    <LogOut
                        size={18}
                        color={Colors.coralDark}
                        style={{ marginRight: 8 }}
                    />
                    <Text
                        style={[
                            styles.authActionText,
                            { color: Colors.coralDark },
                        ]}
                    >
                        Sign Out
                    </Text>
                </TouchableOpacity>

                <Text style={styles.copyrightText}>
                    © 2026 TIJUM. All rights reserved.
                </Text>
            </ScrollView>

            {/* Truthful Account Deletion Request Modal */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View
                        style={[
                            styles.modalCard,
                            {
                                paddingBottom: Math.max(
                                    insets.bottom,
                                    Spacing.lg,
                                ),
                            },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Account Deletion Request
                            </Text>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setDeleteModalVisible(false)}
                                accessibilityRole="button"
                                accessibilityLabel="Close account deletion dialog"
                            >
                                <X size={20} color={Colors.inkSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalBody}>
                            For statutory tax, GST invoice, and payment ledger
                            compliance, TIJUM reviews customer account deletion
                            requests through our privacy support desk once
                            active reservations and refunds are settled.
                        </Text>
                        <Text style={styles.modalSubBody}>
                            Personal profile data will be erased or anonymized
                            in accordance with the TIJUM Privacy Policy, while
                            regulated financial ledgers are retained where
                            legally required.
                        </Text>
                        <Button
                            title="Submit Request in Help Desk"
                            onPress={() => {
                                setDeleteModalVisible(false);
                                router.push('/(customer)/support/tickets');
                            }}
                            style={{ marginTop: Spacing.md }}
                        />
                        <Button
                            title="Email support@tijum.com"
                            variant="outline"
                            onPress={() => {
                                setDeleteModalVisible(false);
                                void Linking.openURL(
                                    `mailto:support@tijum.com?subject=${encodeURIComponent(
                                        `Account Deletion Request (${displayEmail})`,
                                    )}`,
                                );
                            }}
                            style={{ marginTop: Spacing.sm }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function MenuRow({
    icon,
    label,
    badge,
    onPress,
}: {
    icon: React.ReactNode;
    label: string;
    badge?: number;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={styles.menuItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.menuItemLeft}>
                {icon}
                <Text style={styles.menuItemLabel}>{label}</Text>
            </View>
            <View style={styles.menuItemRight}>
                {badge !== undefined && badge > 0 ? (
                    <View style={styles.badgeCountPill}>
                        <Text style={styles.badgeCountText}>{badge}</Text>
                    </View>
                ) : null}
                <ChevronRight size={16} color={Colors.gray400} />
            </View>
        </TouchableOpacity>
    );
}

function Divider() {
    return <View style={styles.menuDivider} />;
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
    headerBellBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    bellBadge: {
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
    },
    bellBadgeText: {
        color: Colors.deepPlum,
        fontSize: 10,
        fontWeight: '800',
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
        backgroundColor: Colors.peachSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 34,
        fontWeight: '800',
        color: Colors.deepPlum,
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
    userEmail: {
        fontSize: 13,
        color: Colors.warmCream,
        marginTop: 2,
        opacity: 0.9,
    },
    userPhone: {
        fontSize: 12,
        color: Colors.warmCream,
        marginTop: 2,
        opacity: 0.75,
    },
    verifiedPill: {
        marginTop: Spacing.xs,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgba(16, 185, 129, 0.5)',
        borderWidth: 1,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    verifiedPillText: {
        color: '#D1FAE5',
        fontSize: 11,
        fontWeight: '700',
    },
    verificationBanner: {
        backgroundColor: '#FFF7ED',
        marginHorizontal: Spacing.base,
        marginTop: Spacing.base,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: '#FED7AA',
        gap: Spacing.sm,
    },
    verificationBannerTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    verificationBannerDesc: {
        fontSize: 12,
        color: Colors.inkSecondary,
        marginTop: 2,
        lineHeight: 17,
    },
    verificationActionBtn: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.deepPlum,
        borderRadius: BorderRadius.pill,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    verificationActionText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
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
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuItemLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.inkPrimary,
        marginLeft: Spacing.md,
    },
    badgeCountPill: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    badgeCountText: {
        color: Colors.white,
        fontSize: 11,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.lg,
    },
    modalCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    modalCloseBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        fontSize: 13,
        lineHeight: 19,
        color: Colors.inkPrimary,
    },
    modalSubBody: {
        fontSize: 12,
        lineHeight: 18,
        color: Colors.inkSecondary,
        marginTop: Spacing.sm,
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
});
