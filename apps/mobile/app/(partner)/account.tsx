import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    Briefcase,
    Landmark,
    FileText,
    Bell,
    Headset,
    Info,
    Repeat,
    Settings,
    ChevronRight,
    Edit3,
    LogOut,
    LogIn,
    X,
    User,
    Building2,
    Check,
} from 'lucide-react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { OwnerApi } from '../../src/api/owner';
import { ExceptionalState } from '../../src/components/ExceptionalState';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../src/theme/spacing';
import { SHOWCASE_PARTNER } from '../../src/data/showcaseData.ts';

export default function PartnerAccountScreen() {
    const router = useRouter();
    const { owner, token, authState, logout, switchAccountDomain } = useAuth();
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'customer' | 'owner'>('owner');

    const isGuest = !token || authState !== 'owner_authenticated';
    const partnerName = isGuest
        ? SHOWCASE_PARTNER.name
        : owner?.name || SHOWCASE_PARTNER.name;
    const partnerId = isGuest
        ? SHOWCASE_PARTNER.partner_id
        : (owner as any)?.partner_id || SHOWCASE_PARTNER.partner_id || 'TP-001245';

    const handleSwitchRole = async () => {
        setRoleModalVisible(false);
        if (selectedRole === 'customer') {
            await switchAccountDomain('customer');
            router.replace('/(customer)/explore');
        }
    };

    const handleLogOut = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out of Partner Portal?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/(auth)/owner-login');
                },
            },
        ]);
    };

    if (!token || authState !== 'owner_authenticated') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.plumHeader}>
                    <Text style={styles.headerTitle}>Partner Account</Text>
                </View>
                <ExceptionalState
                    type="session-expired"
                    title="Partner Access Required"
                    description="Please sign in to your verified partner portal to manage business settings, bank details, and active sessions."
                    actionLabel="Sign In as Partner"
                    onAction={() => router.push('/(auth)/owner-login')}
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
                {/* Curved Deep Plum Header */}
                <View style={styles.plumHeader}>
                    <View style={styles.headerTopRow}>
                        <View style={{ width: 24 }} />
                        <Text style={styles.headerTitle}>Profile</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(partner)/notifications')}
                            activeOpacity={0.8}
                        >
                            <Settings size={22} color={Colors.white} />
                        </TouchableOpacity>
                    </View>

                    {/* Partner Avatar & Info Card */}
                    <View style={styles.userCard}>
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={{
                                    uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80',
                                }}
                                style={styles.avatarImg}
                            />
                            <View style={styles.editAvatarBadge}>
                                <Edit3 size={11} color={Colors.white} />
                            </View>
                        </View>

                        <Text style={styles.userName}>{partnerName}</Text>
                        <Text style={styles.partnerIdText}>
                            Partner ID: {partnerId}
                        </Text>

                        {isGuest && (
                            <View style={styles.guestNoticeBadge}>
                                <Text style={styles.guestNoticeText}>Preview Mode</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Menu List */}
                <View style={styles.menuCard}>
                    {/* 1. Business Profile */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            Alert.alert(
                                'Business Profile',
                                `Partner Name: ${partnerName}\nBusiness Type: Individual Owner\nPhone: +91 98765 43210`,
                            )
                        }
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Briefcase size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Business Profile
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 2. Bank Details */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            Alert.alert(
                                'Bank Details',
                                'Bank: State Bank of India\nA/C: 123456789012\nIFSC: SBIN0001234\nStatus: Verified',
                            )
                        }
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Landmark size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>Bank Details</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 3. Tax Information */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            Alert.alert(
                                'Tax Information',
                                'PAN: ABCDE1234F (Verified)\nGSTIN: 22ABCDE1234F1Z5\nTDS Rate: Section 393(1) 0.10%',
                            )
                        }
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <FileText size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>
                                Tax Information
                            </Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 4. Notifications */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => router.push('/(partner)/notifications')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Bell size={18} color={Colors.coral} />
                            <Text style={styles.menuItemLabel}>Notifications</Text>
                        </View>
                        <View style={styles.badgeCountPill}>
                            <Text style={styles.badgeCountText}>2</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 5. Help & Support */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            Alert.alert(
                                'Help & Support',
                                'Official Host Desk: support@tijum.com\nHelpline: +91 81423 34033',
                            )
                        }
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Headset size={18} color={Colors.deepPlum} />
                            <Text style={styles.menuItemLabel}>Help & Support</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    {/* 6. About TIJUM */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() =>
                            Alert.alert(
                                'About TIJUM Partner',
                                'TIJUM Partner Platform\nVersion 1.0.0 (Build 2)\nList • Manage • Grow',
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

                    <View style={styles.menuDivider} />

                    {/* 7. Switch Role */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => setRoleModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.menuItemLeft}>
                            <Repeat size={18} color={Colors.coral} />
                            <Text style={styles.menuItemLabel}>Switch Role</Text>
                        </View>
                        <ChevronRight size={16} color={Colors.gray400} />
                    </TouchableOpacity>
                </View>

                {/* Log Out or Sign In */}
                <TouchableOpacity
                    style={styles.authActionButton}
                    onPress={isGuest ? () => router.push('/(auth)/owner-login') : handleLogOut}
                    activeOpacity={0.85}
                >
                    {isGuest ? (
                        <>
                            <LogIn size={18} color={Colors.deepPlum} style={{ marginRight: 8 }} />
                            <Text style={styles.authActionText}>Host Sign In</Text>
                        </>
                    ) : (
                        <>
                            <LogOut size={18} color={Colors.coral} style={{ marginRight: 8 }} />
                            <Text style={[styles.authActionText, { color: Colors.coral }]}>
                                Log Out
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Footer Copyright */}
                <Text style={styles.copyrightText}>
                    © 2025 TIJUM Partner. All rights reserved.
                </Text>
            </ScrollView>

            {/* Switch Role Modal (Matching Showcase Flow) */}
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
                            <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                                <X size={20} color={Colors.gray600} />
                            </TouchableOpacity>
                        </View>

                        {/* Customer Option */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                selectedRole === 'customer' && styles.roleCardActive,
                            ]}
                            onPress={() => setSelectedRole('customer')}
                            activeOpacity={0.8}
                        >
                            <View style={styles.roleIconCircle}>
                                <User size={20} color={Colors.deepPlum} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.roleCardTitle}>Customer</Text>
                                <Text style={styles.roleCardDesc}>
                                    Book stays, find properties and enjoy services.
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.radioCircle,
                                    selectedRole === 'customer' && styles.radioCircleActive,
                                ]}
                            >
                                {selectedRole === 'customer' && (
                                    <View style={styles.radioDot} />
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Owner Option */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                selectedRole === 'owner' && styles.roleCardActive,
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
                                    List properties, manage bookings and grow business.
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.radioCircle,
                                    selectedRole === 'owner' && styles.radioCircleActive,
                                ]}
                            >
                                {selectedRole === 'owner' && (
                                    <View style={styles.radioDot} />
                                )}
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
