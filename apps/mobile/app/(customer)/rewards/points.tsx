import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Coins,
    ArrowDownLeft,
    ArrowUpRight,
    Clock,
    Lock,
    Filter,
    Info,
    Calendar,
} from 'lucide-react-native';
import { RewardsApi } from '../../../src/api/rewards';
import { PointsLedgerItem, PointsWallet } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

const FILTER_TABS = [
    { key: 'all', label: 'All Activity' },
    { key: 'earned', label: 'Earned' },
    { key: 'redeemed', label: 'Redeemed' },
    { key: 'pending', label: 'Pending' },
];

export default function PointsWalletScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState<
        'all' | 'earned' | 'redeemed' | 'pending'
    >('all');
    const [wallet, setWallet] = useState<PointsWallet | null>(null);
    const [ledger, setLedger] = useState<PointsLedgerItem[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setErrorMessage(null);

        try {
            const res = await RewardsApi.getPointsLedger();
            if (res.data) {
                setWallet(res.data.wallet);
                setLedger(res.data.ledger || []);
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to load points activity.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredLedger = ledger.filter((item) => {
        if (selectedTab === 'earned')
            return item.direction === 'credit' && item.status === 'completed';
        if (selectedTab === 'redeemed') return item.direction === 'debit';
        if (selectedTab === 'pending')
            return item.status === 'pending' || item.status === 'reserved';
        return true;
    });

    const renderHeader = () => (
        <View style={styles.headerArea}>
            {/* Wallet Stat Cards */}
            <View style={styles.statsGrid}>
                <View style={[styles.statBox, styles.statBoxPrimary]}>
                    <View style={styles.statIconRow}>
                        <Coins size={18} color="#F59E0B" />
                        <Text style={styles.statBoxTag}>AVAILABLE</Text>
                    </View>
                    <Text style={styles.statNumberPrimary}>
                        {wallet?.available_points.toLocaleString('en-IN') || 0}
                    </Text>
                    <Text style={styles.statSubPrimary}>
                        ≈ ₹{wallet?.estimated_inr_value.toFixed(2) || '0.00'}{' '}
                        off stays
                    </Text>
                </View>

                <View style={styles.statBox}>
                    <View style={styles.statIconRow}>
                        <Clock size={16} color="#D97706" />
                        <Text style={styles.statBoxTagMuted}>PENDING</Text>
                    </View>
                    <Text style={styles.statNumberMuted}>
                        {wallet?.pending_points || 0}
                    </Text>
                    <Text style={styles.statSubMuted}>Credits after stay</Text>
                </View>

                <View style={styles.statBox}>
                    <View style={styles.statIconRow}>
                        <Lock size={16} color={Colors.gray600} />
                        <Text style={styles.statBoxTagMuted}>RESERVED</Text>
                    </View>
                    <Text style={styles.statNumberMuted}>
                        {wallet?.reserved_points || 0}
                    </Text>
                    <Text style={styles.statSubMuted}>In 15-min hold</Text>
                </View>
            </View>

            {/* FEFO Policy Note */}
            <View style={styles.fefoNoteBox}>
                <Info
                    size={14}
                    color={Colors.gray600}
                    style={{ marginRight: 6, marginTop: 2 }}
                />
                <Text style={styles.fefoNoteText}>
                    <Text style={{ fontWeight: '700' }}>
                        FEFO Expiry Policy:{' '}
                    </Text>
                    Points are automatically consumed First-Expiring, First-Out
                    at checkout so you never lose accumulated rewards.
                </Text>
            </View>

            {/* Filter Pill Tabs */}
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
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.coral} />
                    <Text style={styles.loadingText}>
                        Loading points ledger...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredLedger}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={renderHeader}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadData(true)}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Coins
                                size={36}
                                color={Colors.gray300}
                                style={{ marginBottom: 8 }}
                            />
                            <Text style={styles.emptyTitle}>
                                No transactions in this category
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                As you complete stays and refer friends, loyalty
                                activity will appear here.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const isCredit = item.direction === 'credit';
                        const isPending = item.status === 'pending';
                        return (
                            <View style={styles.txRow}>
                                <View
                                    style={[
                                        styles.txIconContainer,
                                        {
                                            backgroundColor: isPending
                                                ? '#FEF3C7'
                                                : isCredit
                                                  ? '#ECFDF5'
                                                  : '#FEF2F2',
                                        },
                                    ]}
                                >
                                    {isPending ? (
                                        <Clock size={16} color="#D97706" />
                                    ) : isCredit ? (
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

                                <View style={styles.txMain}>
                                    <View style={styles.txTitleRow}>
                                        <Text style={styles.txTitle}>
                                            {item.transaction_type_label}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.txAmount,
                                                {
                                                    color: isPending
                                                        ? '#D97706'
                                                        : isCredit
                                                          ? '#059669'
                                                          : '#DC2626',
                                                },
                                            ]}
                                        >
                                            {isCredit
                                                ? `+${item.points}`
                                                : `-${item.points}`}{' '}
                                            pts
                                        </Text>
                                    </View>
                                    <Text style={styles.txDesc}>
                                        {item.description}
                                    </Text>
                                    <View style={styles.txFooter}>
                                        <View style={styles.dateRow}>
                                            <Calendar
                                                size={11}
                                                color={Colors.gray400}
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={styles.txDate}>
                                                {item.created_at}
                                            </Text>
                                        </View>
                                        {item.booking_reference && (
                                            <Text style={styles.txRef}>
                                                Ref: {item.booking_reference}
                                            </Text>
                                        )}
                                        {item.expires_at && (
                                            <Text style={styles.txExpires}>
                                                Exp: {item.expires_at}
                                            </Text>
                                        )}
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
    listContent: {
        padding: Spacing.base,
        paddingBottom: Spacing.xxl * 2,
    },
    headerArea: {
        marginBottom: Spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: Spacing.sm,
    },
    statBox: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    statBoxPrimary: {
        backgroundColor: Colors.deepPlum,
        borderColor: Colors.deepPlum,
        flex: 1.3,
    },
    statIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statBoxTag: {
        color: '#F59E0B',
        fontSize: 9,
        fontWeight: '800',
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    statBoxTagMuted: {
        color: Colors.gray500,
        fontSize: 9,
        fontWeight: '700',
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    statNumberPrimary: {
        color: Colors.white,
        fontSize: 22,
        fontWeight: '800',
    },
    statSubPrimary: {
        color: Colors.softPeach,
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    statNumberMuted: {
        color: Colors.gray900,
        fontSize: Typography.fontSize.lg,
        fontWeight: '800',
    },
    statSubMuted: {
        color: Colors.gray500,
        fontSize: 10,
        marginTop: 2,
    },
    fefoNoteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.gray200,
        borderRadius: BorderRadius.base,
        padding: Spacing.sm,
        marginBottom: Spacing.base,
    },
    fefoNoteText: {
        flex: 1,
        fontSize: 11,
        color: Colors.gray600,
        lineHeight: 16,
    },
    filterBar: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: Spacing.xs,
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
    txRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.base,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    txIconContainer: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    txMain: {
        flex: 1,
    },
    txTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    txTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.gray900,
    },
    txAmount: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '800',
    },
    txDesc: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray600,
        marginTop: 2,
    },
    txFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    txDate: {
        fontSize: 10,
        color: Colors.gray400,
    },
    txRef: {
        fontSize: 10,
        color: Colors.deepPlum,
        fontWeight: '600',
        backgroundColor: 'rgba(68, 47, 65, 0.08)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
    },
    txExpires: {
        fontSize: 10,
        color: '#B45309',
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
