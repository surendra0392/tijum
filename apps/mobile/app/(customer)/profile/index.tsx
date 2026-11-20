import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    User,
    Calendar,
    Heart,
    Star,
    Headset,
    Bell,
    HelpCircle,
    Info,
    Settings,
    ChevronRight,
    Edit3,
    LogOut,
    LogIn,
} from 'lucide-react-native';
import { useAuth } from '../../../src/auth/AuthContext';
import { CustomerApi } from '../../../src/api/customer';
import { CustomerProfile } from '../../../src/api/types';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import { SHOWCASE_CUSTOMER } from '../../../src/data/showcaseData.ts';

export default function CustomerProfileScreen() {
    const router = useRouter();
    const { user, token, authState, logout } = useAuth();
    const [profile, setProfile] = useState<CustomerProfile>(SHOWCASE_CUSTOMER);
    const [wishlistCount, setWishlistCount] = useState(12);

    const isGuest = !token || authState === 'guest' || authState === 'session_expired';

    useEffect(() => {
        if (!isGuest) {
            CustomerApi.getProfile()
                .then((res) => {
                    if (res.data) setProfile(res.data);
                })
                .catch(() => {});

            CustomerApi.getWishlist()
                .then((res) => {
                    if (Array.isArray(res.data)) {
                        setWishlistCount(res.data.length);
                    }
                })
                .catch(() => {});
        }
    }, [isGuest]);

    const handleSignOut = async () => {
        Alert.alert('Sign Out', 'Are you sure you want to log out of your account?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/(auth)/customer-login');
                },
            },
        ]);
    };

    const displayName = isGuest ? 'Rahul Sharma' : profile.name || user?.name || 'Rahul Sharma';
    const displayEmail = isGuest ? 'rahul.sharma@gmail.com' : profile.email || user?.email || 'rahul.sharma@gmail.com';

    if (!token || authState === 'guest' || authState === 'session_expired') {
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Curved Plum Header with Profile & Settings Gear */}
                <View style={styles.plumHeader}>
                    <View style={styles.headerTopRow}>
                        <View style={{ width: 24 }} />
                        <Text style={styles.headerTitle}>My Profile</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(customer)/notifications')}
                            activeOpacity={0.8}
                        >
                            <Settings size={22} color={Colors.white} />
                        </TouchableOpacity>
                    </View>

                    {/* User Avatar & Info Card */}
                    <View style={styles.userCard}>
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={{
                                    uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
                                }}
                                style={styles.avatarImg}
                            />
                            <View style={styles.editAvatarBadge}>
                                <Edit3 size={11} color={Colors.white} />
                            </View>
                        </View>

                        <Text style={styles.userName}>{displayName}</Text>
                        <Text style={styles.userEmail}>{displayEmail}</Text>

                        {isGuest && (
                            <View style={styles.guestNoticeBadge}>
                                <Text style={styles.guestNoticeText}>Preview Mode</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Account Navigation Menu List */}
                <View style={styles.menuCard}>
                    {/* 1. Edit Profile */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            if (isGuest) {
                                router.push('/(auth)/customer-login');
                            } else {
                                Alert.alert('Edit Profile', `Name: ${displayName}\nEmail: ${displayEmail}\nPhone: ${profile.phone || '+91 98765 43210'}`);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <User size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>Edit Profile</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 2. My Bookings */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(customer)/bookings')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Calendar size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>My Bookings</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 3. My Wishlist with badge count */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(customer)/wishlist')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Heart size={18} color={Colors.coral} />
                            <Text style={styles.menuItemLabel}>My Wishlist</Text>
                        </View>
                        <View style={styles.badgeCountPill}>
                            <Text style={styles.badgeCountText}>{wishlistCount}</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 4. My Reviews */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            Alert.alert(
                                'My Reviews',
                                'Overall Rating: 4.6 (124 reviews)\nYour reviews help our verified food & stay community!',
                            )
                        }
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Star size={18} color={Colors.amber} />
                            <Text style={styles.menuItemLabel}>My Reviews</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 5. Support & Protection */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(customer)/support')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Headset size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Support & Protection
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 6. Notifications */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(customer)/notifications')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Bell size={18} color={Colors.coral} />
                            <Text style={styles.menuItemLabel}>Notifications</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 7. Help Centre */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            Alert.alert(
                                'Help Centre',
                                'Browse popular topics: Booking & Payment, Safety & Protection, Refund & Cancellation.',
                            )
                        }
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <HelpCircle size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>Help Centre</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 8. About TIJUM */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            Alert.alert(
                                'About TIJUM',
                                'TIJUM Stay • Dine • Belong\nVersion 1.0.0 (Build 2)\nA complete accommodation and food ecosystem.',
                            )
                        }
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Info size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>About TIJUM</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>
                </View>

                {/* Sign Out or Sign In Button */}
                <TouchableOpacity
                    style={styles.authActionButton}
                    onPress={isGuest ? () => router.push('/(auth)/customer-login') : handleSignOut}
                    activeOpacity={0.85}
                >
                    {isGuest ? (
                        <>
                            <LogIn size={18} color={Colors.deepPlum} style={{ marginRight: 8 }} />
                            <Text style={styles.authActionText}>Sign In to Account</Text>
                        </>
                    ) : (
                        <>
                            <LogOut size={18} color={Colors.coral} style={{ marginRight: 8 }} />
                            <Text style={[styles.authActionText, { color: Colors.coral }]}>
                                Sign Out
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Footer Copyright */}
                <Text style={styles.copyrightText}>
                    © 2025 TIJUM. All rights reserved.
                </Text>
            </ScrollView>
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
        backgroundColor: Colors.surfaceSubtle,
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
});
