import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import {
    User,
    Calendar,
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
} from 'lucide-react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { CustomerApi } from '../../../src/api/customer';
import { CustomerProfile } from '../../../src/api/types';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';

export default function CustomerProfileScreen() {
    const router = useRouter();
    const { user, token, authState, logout } = useAuth();
    const isFocused = useIsFocused();
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const isGuest =
        !token || authState === 'guest' || authState === 'session_expired';

    const loadProfile = useCallback(async () => {
        if (isGuest) {
            return;
        }

        setLoading(true);
        try {
            const [profileRes, wishlistRes] = await Promise.all([
                CustomerApi.getProfile(),
                CustomerApi.getWishlist().catch(() => null),
            ]);

            if (profileRes.data) {
                setProfile(profileRes.data);
            }
            if (Array.isArray(wishlistRes?.data)) {
                setWishlistCount(wishlistRes.data.length);
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
            <SafeAreaView style={styles.container}>
                <View style={styles.plumHeader}>
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
    const initial = displayName.trim().charAt(0).toUpperCase() || 'T';

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.plumHeader}>
                    <View style={styles.headerTopRow}>
                        <View style={{ width: 24 }} />
                        <Text style={styles.headerTitle}>My Profile</Text>
                        <TouchableOpacity
                            onPress={() =>
                                router.push('/(customer)/notifications')
                            }
                            activeOpacity={0.8}
                        >
                            <Bell size={22} color={Colors.white} />
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
                                onPress={() =>
                                    router.push('/(customer)/profile/edit')
                                }
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

                        {loading ? (
                            <ActivityIndicator
                                size="small"
                                color={Colors.coral}
                                style={{ marginTop: Spacing.sm }}
                            />
                        ) : null}
                    </View>
                </View>

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
                        icon={<Heart size={18} color={Colors.coral} />}
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
                        icon={<Bell size={18} color={Colors.coral} />}
                        label="Notification Settings"
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
                        icon={<Repeat size={18} color={Colors.coral} />}
                        label="Switch to Partner"
                        onPress={handleSwitchToPartner}
                    />
                </View>

                <TouchableOpacity
                    style={styles.authActionButton}
                    onPress={handleSignOut}
                    activeOpacity={0.85}
                >
                    <LogOut
                        size={18}
                        color={Colors.coral}
                        style={{ marginRight: 8 }}
                    />
                    <Text
                        style={[styles.authActionText, { color: Colors.coral }]}
                    >
                        Sign Out
                    </Text>
                </TouchableOpacity>

                <Text style={styles.copyrightText}>
                    © 2026 TIJUM. All rights reserved.
                </Text>
            </ScrollView>
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
});
