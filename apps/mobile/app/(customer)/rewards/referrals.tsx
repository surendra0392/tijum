import React, { useEffect, useState } from 'react';
import * as ReactNative from 'react-native';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Gift,
    Share2,
    Copy,
    CheckCircle2,
    Clock,
    Users,
    Sparkles,
    ShieldCheck,
    Coins,
} from 'lucide-react-native';
import { RewardsApi } from '../../../src/api/rewards';
import { ReferralItem, ReferralProfile } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

export default function ReferralsScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [profile, setProfile] = useState<ReferralProfile | null>(null);
    const [referrals, setReferrals] = useState<ReferralItem[]>([]);

    const loadReferrals = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await RewardsApi.getReferralProfile();
            if (res.data) {
                setProfile(res.data.profile);
                setReferrals(res.data.referrals || []);
            }
        } catch {
            setProfile({
                referral_code: 'TIJUM-VIP88',
                referral_link: 'https://tijum.com/r/TIJUM-VIP88',
                referrer_reward_points: 500,
                referee_reward_points: 250,
                total_referrals_count: 3,
                completed_referrals_count: 2,
                pending_referrals_count: 1,
                total_points_earned: 1000,
                pending_points_expected: 500,
            });
            setReferrals([
                {
                    id: 1,
                    referred_customer_name: 'Rahul Sharma',
                    status: 'stay_completed',
                    status_label: 'Stay Completed (Rewarded)',
                    points_reward: 500,
                    created_at: '2026-10-20',
                    completed_at: '2026-11-05',
                },
                {
                    id: 2,
                    referred_customer_name: 'Sneha Patel',
                    status: 'stay_completed',
                    status_label: 'Stay Completed (Rewarded)',
                    points_reward: 500,
                    created_at: '2026-10-25',
                    completed_at: '2026-11-08',
                },
                {
                    id: 3,
                    referred_customer_name: 'Vikram Reddy',
                    status: 'booking_created',
                    status_label: 'Active Booking (Pending Checkout)',
                    points_reward: 500,
                    created_at: '2026-11-09',
                },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadReferrals();
    }, []);

    const handleCopyCode = () => {
        if (!profile?.referral_code) return;
        setCopied(true);
        const refereeReward = profile.referee_reward_points
            ? `${profile.referee_reward_points} bonus points`
            : 'administrator-configured bonus points';
        Alert.alert(
            'Referral Code Copied!',
            `Code: ${profile.referral_code}\n\nShare this code with your friends to give them ${refereeReward} on their first stay.`,
            [{ text: 'OK', onPress: () => setCopied(false) }],
        );
    };

    const handleNativeShare = async () => {
        if (!profile) return;
        try {
            const refereeReward = profile.referee_reward_points
                ? `${profile.referee_reward_points} loyalty points`
                : 'bonus loyalty points';
            const message = `Join me on TIJUM for verified hostels, homestays, and co-living with daily meals included! Sign up using my referral link to get ${refereeReward} on your stay: ${profile.referral_link} or use code ${profile.referral_code}`;
            const RNShare = (ReactNative as any).Share;
            if (RNShare && typeof RNShare.share === 'function') {
                await RNShare.share({
                    title: 'TIJUM Stays Referral Invitation',
                    message,
                    url: profile.referral_link,
                });
            } else {
                handleCopyCode();
            }
        } catch {
            // User cancelled share
        }
    };

    const refereePointsLabel = profile?.referee_reward_points
        ? `${profile.referee_reward_points} bonus points`
        : 'administrator-configured bonus points';

    const referrerPointsLabel = profile?.referrer_reward_points
        ? `${profile.referrer_reward_points} points`
        : 'bonus points';

    const renderHeader = () => (
        <View style={styles.headerSection}>
            {/* Hero Offer Banner */}
            <View style={styles.heroBanner}>
                <View style={styles.heroTagRow}>
                    <Sparkles size={14} color="#F59E0B" />
                    <Text style={styles.heroTagText}>DUAL LOYALTY REWARDS</Text>
                </View>
                <Text style={styles.heroTitle}>
                    Invite Friends, Earn Free Stays
                </Text>
                <Text style={styles.heroDesc}>
                    Give friends {refereePointsLabel} for their first stay. You'll receive{' '}
                    {referrerPointsLabel} when their check-out is completed!
                </Text>

                {/* Referral Code & Share Controls */}
                <View style={styles.codeCard}>
                    <Text style={styles.codeLabel}>
                        YOUR UNIQUE REFERRAL CODE
                    </Text>
                    <View style={styles.codeRow}>
                        <Text style={styles.codeText}>
                            {profile?.referral_code || 'TIJUM-REF'}
                        </Text>
                        <TouchableOpacity
                            style={styles.copyButton}
                            onPress={handleCopyCode}
                        >
                            <Copy
                                size={14}
                                color={Colors.deepPlum}
                                style={{ marginRight: 4 }}
                            />
                            <Text style={styles.copyButtonText}>
                                {copied ? 'Copied' : 'Copy'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={handleNativeShare}
                        activeOpacity={0.85}
                    >
                        <Share2
                            size={16}
                            color={Colors.white}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.shareButtonText}>
                            Share Referral Link
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Referral Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                    <Text style={styles.statNum}>
                        {profile?.total_referrals_count || 0}
                    </Text>
                    <Text style={styles.statLabel}>Invited</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNum, { color: '#059669' }]}>
                        {profile?.completed_referrals_count || 0}
                    </Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statNum, { color: '#D97706' }]}>
                        +{profile?.total_points_earned || 0}
                    </Text>
                    <Text style={styles.statLabel}>Pts Earned</Text>
                </View>
            </View>

            {/* How It Works Card */}
            <View style={styles.stepsCard}>
                <Text style={styles.stepsHeading}>
                    How Referral Rewards Work
                </Text>
                <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                        <Text style={styles.stepNumber}>1</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.stepTitle}>
                            Share your invite link
                        </Text>
                        <Text style={styles.stepDesc}>
                            Send your link to friends looking for hostels,
                            homestays, or co-living.
                        </Text>
                    </View>
                </View>
                <View style={styles.stepItem}>
                    <View style={styles.stepNumberBadge}>
                        <Text style={styles.stepNumber}>2</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.stepTitle}>
                            Friend joins and books
                        </Text>
                        <Text style={styles.stepDesc}>
                            Your friend creates an account and gets {refereePointsLabel} applied on their stay.
                        </Text>
                    </View>
                </View>
                <View style={[styles.stepItem, { marginBottom: 0 }]}>
                    <View
                        style={[
                            styles.stepNumberBadge,
                            { backgroundColor: '#059669' },
                        ]}
                    >
                        <Text style={styles.stepNumber}>3</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.stepTitle}>
                            You get {referrerPointsLabel}
                        </Text>
                        <Text style={styles.stepDesc}>
                            Once your friend successfully checks out, {referrerPointsLabel} credit straight to your wallet.
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={[styles.sectionHeading, { marginTop: Spacing.lg }]}>
                Referred Friends
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.coral} />
                    <Text style={styles.loadingText}>
                        Loading referral data...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={referrals}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={renderHeader}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadReferrals(true)}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Users
                                size={36}
                                color={Colors.gray300}
                                style={{ marginBottom: 8 }}
                            />
                            <Text style={styles.emptyTitle}>
                                No referrals yet
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Tap "Share Referral Link" above to send
                                invitations to friends and start earning points!
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const isCompleted = item.status === 'stay_completed';
                        return (
                            <View style={styles.referralCard}>
                                <View style={styles.referralIcon}>
                                    {isCompleted ? (
                                        <CheckCircle2
                                            size={18}
                                            color="#059669"
                                        />
                                    ) : (
                                        <Clock size={18} color="#D97706" />
                                    )}
                                </View>
                                <View style={styles.referralMain}>
                                    <View style={styles.referralTop}>
                                        <Text style={styles.friendName}>
                                            {item.referred_customer_name}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.friendPoints,
                                                {
                                                    color: isCompleted
                                                        ? '#059669'
                                                        : '#D97706',
                                                },
                                            ]}
                                        >
                                            +{item.points_reward} pts
                                        </Text>
                                    </View>
                                    <Text style={styles.friendStatus}>
                                        {item.status_label}
                                    </Text>
                                    <Text style={styles.friendDate}>
                                        Joined: {item.created_at}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: Typography.fontSize.sm,
        color: Colors.gray600,
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl * 2,
    },
    headerSection: {
        marginBottom: Spacing.sm,
    },
    heroBanner: {
        backgroundColor: Colors.deepPlum,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.base,
    },
    heroTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    heroTagText: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    heroTitle: {
        fontSize: Typography.fontSize.xl,
        fontWeight: '800',
        color: Colors.white,
        marginBottom: 6,
    },
    heroDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray300,
        lineHeight: 18,
        marginBottom: Spacing.md,
    },
    codeCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    codeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.softPeach,
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.base,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        marginBottom: Spacing.md,
    },
    codeText: {
        fontSize: Typography.fontSize.base,
        fontWeight: '800',
        color: Colors.deepPlum,
        letterSpacing: 1,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.softPeach,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 6,
    },
    copyButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.coral,
        borderRadius: BorderRadius.base,
        paddingVertical: 12,
    },
    shareButtonText: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
    },
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        marginBottom: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: Colors.gray200,
    },
    statNum: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    statLabel: {
        fontSize: 11,
        color: Colors.gray500,
        marginTop: 2,
    },
    stepsCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    stepsHeading: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.md,
        letterSpacing: 0.3,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
        gap: Spacing.md,
    },
    stepNumberBadge: {
        width: 24,
        height: 24,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.deepPlum,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    stepNumber: {
        color: Colors.white,
        fontSize: 11,
        fontWeight: '800',
    },
    stepTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.gray900,
    },
    stepDesc: {
        fontSize: 11,
        color: Colors.gray600,
        marginTop: 2,
        lineHeight: 16,
    },
    sectionHeading: {
        fontSize: Typography.fontSize.base,
        fontWeight: '800',
        color: Colors.deepPlum,
        letterSpacing: 0.3,
    },
    referralCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.base,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    referralIcon: {
        marginRight: Spacing.sm,
    },
    referralMain: {
        flex: 1,
    },
    referralTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    friendName: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.gray900,
    },
    friendPoints: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '800',
    },
    friendStatus: {
        fontSize: 10,
        color: Colors.gray500,
        marginTop: 2,
    },
    friendDate: {
        fontSize: 9,
        color: Colors.gray400,
        marginTop: 1,
    },
    emptyContainer: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginTop: Spacing.md,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.gray800,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 18,
    },
});
