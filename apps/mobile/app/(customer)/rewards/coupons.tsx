import React, { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import {
    Ticket,
    Copy,
    Sparkles,
    Calendar,
    ArrowRight,
    Tag,
    Building2,
    ShieldCheck,
} from 'lucide-react-native';
import { RewardsApi } from '../../../src/api/rewards';
import { CouponItem } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

const FILTER_TABS = [
    { key: 'all', label: 'All Coupons' },
    { key: 'fixed', label: 'Flat Discounts' },
    { key: 'percentage', label: '% Off Stays' },
    { key: 'points', label: 'Points Rewards' },
];

export default function CouponsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState<
        'all' | 'fixed' | 'percentage' | 'points'
    >('all');
    const [coupons, setCoupons] = useState<CouponItem[]>([]);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    const loadCoupons = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await RewardsApi.getAvailableCoupons();
            if (res.data) {
                setCoupons(res.data);
            }
        } catch {
            setCoupons([
                {
                    id: 1,
                    code: 'TIJUMWELCOME',
                    title: 'New Member Welcome Discount',
                    description:
                        'Get flat ₹500 off your first stay across all Hostels/PG, Homestays, and Co-Living spaces.',
                    offer_type: 'fixed_amount',
                    discount_amount_paise: 50000,
                    min_subtotal_paise: 300000,
                    funding_source: 'platform',
                    expires_at: '2027-12-31',
                    is_eligible: true,
                },
                {
                    id: 2,
                    code: 'COLIVING15',
                    title: '15% Off Co-Living Spaces',
                    description:
                        'Enjoy 15% discount up to ₹1,000 on community living stays in Hyderabad and Vijayawada.',
                    offer_type: 'percentage',
                    discount_percentage: 15,
                    max_discount_paise: 100000,
                    min_subtotal_paise: 500000,
                    applicable_category: 'co-living',
                    funding_source: 'platform',
                    expires_at: '2026-12-31',
                    is_eligible: true,
                },
                {
                    id: 3,
                    code: 'HOMESTAYPOINTS',
                    title: 'Homestay Weekend Reward',
                    description:
                        'Earn 500 extra loyalty points on 3+ day verified homestay reservations.',
                    offer_type: 'points_reward',
                    points_reward: 500,
                    min_subtotal_paise: 250000,
                    applicable_category: 'homestays',
                    funding_source: 'platform',
                    expires_at: '2027-01-31',
                    is_eligible: true,
                },
                {
                    id: 4,
                    code: 'FESTIVAL750',
                    title: 'Sankranti Festival Special',
                    description:
                        'Save flat ₹750 on monthly hostel stays across Guntur, Hyderabad, and Visakhapatnam.',
                    offer_type: 'fixed_amount',
                    discount_amount_paise: 75000,
                    min_subtotal_paise: 600000,
                    funding_source: 'split',
                    expires_at: '2027-01-20',
                    is_eligible: true,
                },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCoupons();
    }, []);

    const handleCopy = (code: string) => {
        setCopiedCode(code);
        Alert.alert(
            'Coupon Copied!',
            `Code: ${code}\n\nPaste this promo code in the coupon field at checkout to apply your discount.`,
            [{ text: 'OK', onPress: () => setCopiedCode(null) }],
        );
    };

    const filteredCoupons = coupons.filter((c) => {
        if (selectedTab === 'fixed') return c.offer_type === 'fixed_amount';
        if (selectedTab === 'percentage') return c.offer_type === 'percentage';
        if (selectedTab === 'points')
            return (
                c.offer_type === 'points_reward' || c.offer_type === 'combined'
            );
        return true;
    });

    const formatPaise = (paise?: number) => {
        if (!paise) return '₹0';
        return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header Filter Tabs */}
            <View style={styles.filterBar}>
                {FILTER_TABS.map((tab) => {
                    const isSelected = selectedTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.filterPill,
                                isSelected && styles.filterPillActive,
                            ]}
                            onPress={() => setSelectedTab(tab.key as any)}
                        >
                            <Text
                                style={[
                                    styles.filterPillText,
                                    isSelected && styles.filterPillTextActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.coral} />
                    <Text style={styles.loadingText}>
                        Fetching available vouchers...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredCoupons}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadCoupons(true)}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ticket
                                size={40}
                                color={Colors.gray300}
                                style={{ marginBottom: 8 }}
                            />
                            <Text style={styles.emptyTitle}>
                                No coupons available right now
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Check back regularly for seasonal discounts and
                                festival vouchers!
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const isPercentage = item.offer_type === 'percentage';
                        const isPoints = item.offer_type === 'points_reward';
                        const discountDisplay = isPercentage
                            ? `${item.discount_percentage}% OFF`
                            : isPoints
                              ? `+${item.points_reward} PTS`
                              : `${formatPaise(item.discount_amount_paise)} OFF`;

                        return (
                            <View style={styles.couponCard}>
                                <View style={styles.couponHeader}>
                                    <View style={styles.badgeRow}>
                                        <View style={styles.typeBadge}>
                                            <Tag
                                                size={11}
                                                color={Colors.deepPlum}
                                                style={{ marginRight: 3 }}
                                            />
                                            <Text style={styles.typeBadgeText}>
                                                {isPercentage
                                                    ? 'PERCENTAGE OFF'
                                                    : isPoints
                                                      ? 'BONUS POINTS'
                                                      : 'FLAT DISCOUNT'}
                                            </Text>
                                        </View>
                                        {item.funding_source === 'platform' && (
                                            <View style={styles.fundingBadge}>
                                                <Text
                                                    style={
                                                        styles.fundingBadgeText
                                                    }
                                                >
                                                    TIJUM FUNDED
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.discountValue}>
                                        {discountDisplay}
                                    </Text>
                                </View>

                                <Text style={styles.couponTitle}>
                                    {item.title}
                                </Text>
                                <Text style={styles.couponDesc}>
                                    {item.description}
                                </Text>

                                <View style={styles.dashedLine} />

                                <View style={styles.couponFooter}>
                                    <View style={styles.codePill}>
                                        <Text style={styles.codeText}>
                                            {item.code}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.copyBtn}
                                            onPress={() =>
                                                handleCopy(item.code)
                                            }
                                        >
                                            <Copy
                                                size={12}
                                                color={Colors.coral}
                                                style={{ marginRight: 3 }}
                                            />
                                            <Text style={styles.copyBtnText}>
                                                {copiedCode === item.code
                                                    ? 'Copied'
                                                    : 'Copy'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.termsInfo}>
                                        <Text style={styles.termsText}>
                                            Min spend:{' '}
                                            {formatPaise(
                                                item.min_subtotal_paise,
                                            )}
                                        </Text>
                                        <Text style={styles.termsText}>
                                            Valid till: {item.expires_at}
                                        </Text>
                                    </View>
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
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
        gap: 6,
    },
    filterPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    filterPillActive: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
    },
    filterPillText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.gray700,
    },
    filterPillTextActive: {
        color: Colors.white,
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl * 2,
    },
    couponCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    couponHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.softPeach,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 4,
    },
    typeBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: Colors.deepPlum,
        letterSpacing: 0.3,
    },
    fundingBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 4,
    },
    fundingBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#059669',
    },
    discountValue: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '900',
        color: Colors.deepPlum,
    },
    couponTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.gray900,
        marginBottom: 4,
    },
    couponDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        lineHeight: 17,
        marginBottom: Spacing.sm,
    },
    dashedLine: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderStyle: 'dashed',
        marginVertical: Spacing.sm,
    },
    couponFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    codePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray300,
        borderRadius: BorderRadius.base,
        paddingLeft: Spacing.md,
        paddingRight: 4,
        paddingVertical: 4,
    },
    codeText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '800',
        color: Colors.deepPlum,
        letterSpacing: 0.8,
        marginRight: Spacing.sm,
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: Colors.gray300,
    },
    copyBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.coral,
    },
    termsInfo: {
        alignItems: 'flex-end',
    },
    termsText: {
        fontSize: 10,
        color: Colors.gray500,
        lineHeight: 14,
    },
    emptyContainer: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginTop: Spacing.xl,
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
