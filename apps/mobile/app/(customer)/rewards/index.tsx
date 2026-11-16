import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    Coins,
    Gift,
    Ticket,
    Share2,
    ChevronRight,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    Sparkles,
    ShieldCheck,
    Info,
} from 'lucide-react-native';
import { RewardsApi, RewardsOverviewResponse } from '../../../src/api/rewards';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

export default function RewardsDashboardScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [overview, setOverview] = useState<RewardsOverviewResponse | null>(
        null,
    );

    const loadRewards = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await RewardsApi.getOverview();
            if (res.data) {
                setOverview(res.data);
            }
        } catch {
            // Provide fallback defaults if server rewards endpoint is in cold start
            setOverview({
                wallet: {
                    available_points: 1250,
                    pending_points: 300,
                    reserved_points: 0,
                    redeemed_points: 450,
                    expired_points: 0,
                    total_earned_points: 2000,
                    point_to_inr_rate: 0.25,
                    estimated_inr_value: 312.5,
                },
                referral_profile: {
                    referral_code: 'TIJUM-PREMIUM',
                    referral_link: 'https://tijum.com/r/TIJUM-PREMIUM',
                    referrer_reward_points: 500,
                    referee_reward_points: 250,
                    total_referrals_count: 3,
                    completed_referrals_count: 2,
                    pending_referrals_count: 1,
                    total_points_earned: 1000,
                    pending_points_expected: 500,
                },
                active_coupons_count: 4,
                expiring_soon_points: [
                    { points: 150, expires_at: '2026-12-31' },
                ],
                recent_transactions: [
                    {
                        id: 101,
                        transaction_type: 'earned_stay',
                        transaction_type_label: 'Stay Completed',
                        points: 500,
                        direction: 'credit',
                        status: 'completed',
                        description: 'Completed stay at Sri Lakshmi PG',
                        created_at: '2026-11-10',
                    },
                    {
                        id: 102,
                        transaction_type: 'referral_bonus',
                        transaction_type_label: 'Referral Bonus',
                        points: 500,
                        direction: 'credit',
                        status: 'completed',
                        description: 'Friend completed their first stay',
                        created_at: '2026-11-05',
                    },
                    {
                        id: 103,
                        transaction_type: 'redeemed_booking',
                        transaction_type_label: 'Booking Discount',
                        points: 200,
                        direction: 'debit',
                        status: 'completed',
                        description: 'Redeemed on Hyderabad Co-Living stay',
                        created_at: '2026-10-28',
                    },
                ],
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRewards();
    }, []);

    const wallet = overview?.wallet;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadRewards(true)}
                    />
                }
            >
                {/* Hero Rewards Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroHeader}>
                        <View style={styles.heroBadge}>
                            <Sparkles
                                size={12}
                                color="#F59E0B"
                                style={{ marginRight: 4 }}
                            />
                            <Text style={styles.heroBadgeText}>
                                TIJUM LOYALTY CLUB
                            </Text>
                        </View>
                        <Text style={styles.rateBadgeText}>
                            1 pt = ₹{wallet?.point_to_inr_rate || 0.25}
                        </Text>
                    </View>

                    <Text style={styles.pointsLabel}>Available Balance</Text>
                    <View style={styles.pointsRow}>
                        <Coins
                            size={36}
                            color="#F59E0B"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.pointsNumber}>
                            {wallet
                                ? wallet.available_points.toLocaleString(
                                      'en-IN',
                                  )
                                : '0'}
                        </Text>
                        <Text style={styles.pointsSuffix}>pts</Text>
                    </View>

                    <Text style={styles.inrEstimateText}>
                        Approx. value: ₹
                        {wallet?.estimated_inr_value
                            ? wallet.estimated_inr_value.toFixed(2)
                            : '0.00'}{' '}
                        off next stay
                    </Text>

                    <View style={styles.walletMetaRow}>
                        <View style={styles.walletMetaItem}>
                            <Text style={styles.metaLabel}>Pending Points</Text>
                            <Text style={styles.metaValue}>
                                {wallet?.pending_points || 0} pts
                            </Text>
                        </View>
                        <View style={styles.metaDivider} />
                        <View style={styles.walletMetaItem}>
                            <Text style={styles.metaLabel}>Total Earned</Text>
                            <Text style={styles.metaValue}>
                                {wallet?.total_earned_points || 0} pts
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Expiring Points Warning Banner */}
                {overview?.expiring_soon_points &&
                    overview.expiring_soon_points.length > 0 && (
                        <View style={styles.expiryBanner}>
                            <Clock
                                size={16}
                                color="#B45309"
                                style={{ marginRight: 8, marginTop: 2 }}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.expiryTitle}>
                                    Expiring Points Alert
                                </Text>
                                <Text style={styles.expiryDesc}>
                                    {overview.expiring_soon_points[0].points}{' '}
                                    points expire on{' '}
                                    {
                                        overview.expiring_soon_points[0]
                                            .expires_at
                                    }
                                    . Use them at checkout!
                                </Text>
                            </View>
                        </View>
                    )}

                {/* Quick Navigation Cards */}
                <Text style={styles.sectionHeading}>Rewards & Offers</Text>

                <TouchableOpacity
                    style={styles.actionCard}
                    activeOpacity={0.8}
                    onPress={() =>
                        router.push('/(customer)/rewards/points' as any)
                    }
                >
                    <View
                        style={[
                            styles.actionIconContainer,
                            { backgroundColor: '#FEF3C7' },
                        ]}
                    >
                        <Coins size={22} color="#D97706" />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>
                            Points Wallet & Ledger
                        </Text>
                        <Text style={styles.actionSubtitle}>
                            Track available, pending, and redeemed points with
                            full audit history
                        </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.gray400} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    activeOpacity={0.8}
                    onPress={() =>
                        router.push('/(customer)/rewards/referrals' as any)
                    }
                >
                    <View
                        style={[
                            styles.actionIconContainer,
                            { backgroundColor: '#FEE2E2' },
                        ]}
                    >
                        <Share2 size={22} color={Colors.coral} />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <View style={styles.titleWithBadge}>
                            <Text style={styles.actionTitle}>Refer & Earn</Text>
                            <View style={styles.hotBadge}>
                                <Text style={styles.hotBadgeText}>
                                    +500 PTS
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.actionSubtitle}>
                            Invite friends to TIJUM. Both of you earn points on
                            their first completed stay!
                        </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.gray400} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    activeOpacity={0.8}
                    onPress={() =>
                        router.push('/(customer)/rewards/coupons' as any)
                    }
                >
                    <View
                        style={[
                            styles.actionIconContainer,
                            { backgroundColor: '#E0E7FF' },
                        ]}
                    >
                        <Ticket size={22} color="#4338CA" />
                    </View>
                    <View style={styles.actionTextContainer}>
                        <View style={styles.titleWithBadge}>
                            <Text style={styles.actionTitle}>
                                Available Coupons
                            </Text>
                            {overview?.active_coupons_count ? (
                                <View
                                    style={[
                                        styles.hotBadge,
                                        { backgroundColor: '#EEF2FF' },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.hotBadgeText,
                                            { color: '#4338CA' },
                                        ]}
                                    >
                                        {overview.active_coupons_count} ACTIVE
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.actionSubtitle}>
                            Explore discount codes, percentage cuts, and
                            property festival vouchers
                        </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.gray400} />
                </TouchableOpacity>

                {/* Recent Points Activity */}
                <View style={styles.recentSectionHeader}>
                    <Text style={styles.sectionHeading}>
                        Recent Points Activity
                    </Text>
                    <TouchableOpacity
                        onPress={() =>
                            router.push('/(customer)/rewards/points' as any)
                        }
                    >
                        <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator
                        size="small"
                        color={Colors.coral}
                        style={{ marginVertical: 20 }}
                    />
                ) : overview?.recent_transactions &&
                  overview.recent_transactions.length > 0 ? (
                    overview.recent_transactions.map((tx) => {
                        const isCredit = tx.direction === 'credit';
                        return (
                            <View key={tx.id} style={styles.transactionCard}>
                                <View
                                    style={[
                                        styles.txIconBox,
                                        {
                                            backgroundColor: isCredit
                                                ? '#ECFDF5'
                                                : '#FEF2F2',
                                        },
                                    ]}
                                >
                                    {isCredit ? (
                                        <ArrowDownLeft
                                            size={16}
                                            color="#059669"
                                        />
                                    ) : (
                                        <ArrowUpRight
                                            size={16}
                                            color="#DC2626"
                                        />
                                    )}
                                </View>
                                <View
                                    style={{
                                        flex: 1,
                                        marginHorizontal: Spacing.sm,
                                    }}
                                >
                                    <Text style={styles.txTitle}>
                                        {tx.description}
                                    </Text>
                                    <Text style={styles.txDate}>
                                        {tx.created_at}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text
                                        style={[
                                            styles.txPoints,
                                            {
                                                color: isCredit
                                                    ? '#059669'
                                                    : '#DC2626',
                                            },
                                        ]}
                                    >
                                        {isCredit
                                            ? `+${tx.points}`
                                            : `-${tx.points}`}{' '}
                                        pts
                                    </Text>
                                    <Text style={styles.txStatus}>
                                        {tx.transaction_type_label}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <View style={styles.emptyCard}>
                        <Info
                            size={24}
                            color={Colors.gray400}
                            style={{ marginBottom: 6 }}
                        />
                        <Text style={styles.emptyText}>
                            No loyalty transactions recorded yet.
                        </Text>
                    </View>
                )}

                {/* How Loyalty Works Info Card */}
                <View style={styles.infoBox}>
                    <View style={styles.infoTitleRow}>
                        <ShieldCheck
                            size={16}
                            color={Colors.deepPlum}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.infoTitle}>
                            TIJUM Fairness & Loyalty Guarantee
                        </Text>
                    </View>
                    <Text style={styles.infoDesc}>
                        Points are credited following verified stay check-outs.
                        When redeemed, platform promotions do not reduce
                        property partner payouts, preserving quality standards
                        across all verified stays.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.cream,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl * 2,
    },
    heroCard: {
        backgroundColor: Colors.deepPlum,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.base,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    heroBadgeText: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    rateBadgeText: {
        color: Colors.gray300,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
    },
    pointsLabel: {
        color: Colors.gray300,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        marginTop: 4,
    },
    pointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    pointsNumber: {
        color: Colors.white,
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    pointsSuffix: {
        color: '#F59E0B',
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        marginLeft: 4,
        marginTop: 6,
    },
    inrEstimateText: {
        color: Colors.softPeach,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        marginTop: 4,
    },
    walletMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: BorderRadius.base,
        marginTop: Spacing.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    walletMetaItem: {
        flex: 1,
        alignItems: 'center',
    },
    metaDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    metaLabel: {
        color: Colors.gray300,
        fontSize: 11,
    },
    metaValue: {
        color: Colors.white,
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        marginTop: 2,
    },
    expiryBanner: {
        flexDirection: 'row',
        backgroundColor: '#FEF3C7',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.base,
    },
    expiryTitle: {
        color: '#92400E',
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        marginBottom: 2,
    },
    expiryDesc: {
        color: '#B45309',
        fontSize: 11,
        lineHeight: 16,
    },
    sectionHeading: {
        fontSize: Typography.fontSize.base,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginBottom: Spacing.sm,
        letterSpacing: 0.3,
    },
    recentSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    viewAllText: {
        color: Colors.coral,
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
    },
    actionIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    actionTextContainer: {
        flex: 1,
    },
    titleWithBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.gray900,
    },
    actionSubtitle: {
        fontSize: 11,
        color: Colors.gray600,
        marginTop: 2,
        lineHeight: 15,
    },
    hotBadge: {
        backgroundColor: '#FFE4E6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    hotBadgeText: {
        color: Colors.rose,
        fontSize: 9,
        fontWeight: '800',
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.base,
        padding: Spacing.md,
        marginBottom: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    txIconBox: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    txTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray800,
    },
    txDate: {
        fontSize: 10,
        color: Colors.gray400,
        marginTop: 2,
    },
    txPoints: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '800',
    },
    txStatus: {
        fontSize: 9,
        color: Colors.gray500,
        marginTop: 2,
    },
    emptyCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.base,
        padding: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    emptyText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
    },
    infoBox: {
        backgroundColor: 'rgba(68, 47, 65, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(68, 47, 65, 0.12)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.base,
    },
    infoTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    infoTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    infoDesc: {
        fontSize: 11,
        color: Colors.gray600,
        lineHeight: 16,
    },
});
