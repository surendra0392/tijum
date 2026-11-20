import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { Badge } from '../../../src/components/Badge';
import { AppHeader } from '../../../src/components/AppHeader';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { Wallet } from 'lucide-react-native';

export default function PartnerSettlementsScreen() {
    const router = useRouter();
    const [summary, setSummary] = useState<any>(null);
    const [settlements, setSettlements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadFinances();
    }, []);

    const loadFinances = async () => {
        try {
            setLoading(true);
            const [sumRes, setRes] = await Promise.all([
                OwnerApi.getFinancialSummary().catch(() => ({ data: null })),
                OwnerApi.getSettlements().catch(() => ({ data: [] })),
            ]);

            if (sumRes.data) {
                setSummary(sumRes.data);
            }
            if (setRes.data) {
                setSettlements(setRes.data);
            }
        } catch (e) {
            console.error('Failed to load finances', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadFinances();
        setRefreshing(false);
    };

    const renderSettlementCard = ({ item }: { item: any }) => {
        const ref = item.settlement_reference || item.reference || `SET-${item.id}`;
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/(partner)/settlements/${ref}`)}
                activeOpacity={0.8}
            >
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.refText}>
                            {ref}
                        </Text>
                        <Text style={styles.periodText}>
                            {item.period_start_date || item.period_start} to {item.period_end_date || item.period_end}
                        </Text>
                    </View>
                    <Badge
                        label={item.status || 'settled'}
                        variant={item.status === 'settled' ? 'accent' : 'secondary'}
                    />
                </View>

                <View style={styles.calcBox}>
                    <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>Gross Booking Revenue:</Text>
                        <Text style={styles.calcValue}>
                            ₹
                            {((item.gross_amount_paise || item.gross_booking_value_minor || 0) / 100).toLocaleString(
                                'en-IN',
                            )}
                        </Text>
                    </View>
                    <View style={styles.calcRow}>
                        <Text style={styles.calcLabel}>TIJUM Platform Fee:</Text>
                        <Text style={[styles.calcValue, { color: Colors.coral }]}>
                            - ₹
                            {(
                                (item.commission_amount_paise || item.commission_amount_minor || 0) / 100
                            ).toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <View style={[styles.calcRow, styles.netRow]}>
                        <Text style={styles.netLabel}>Net Payout:</Text>
                        <Text style={styles.netValue}>
                            ₹
                            {((item.net_amount_paise || item.net_settlement_amount_minor || 0) / 100).toLocaleString(
                                'en-IN',
                            )}
                        </Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    {item.utr_number || item.provider_transfer_id ? (
                        <Text style={styles.utrText}>
                            UTR: {item.utr_number || item.provider_transfer_id}
                        </Text>
                    ) : (
                        <Text style={styles.utrText}>Tap to view statement breakdown →</Text>
                    )}
                    <Text style={{ fontSize: 11, color: Colors.deepPlum, fontWeight: '700' }}>Details →</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Payouts & Settlements"
                subtitle="Razorpay Route weekly automated payouts"
                variant="plum"
            />
            {/* Top Financial Summary Cards */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Settled</Text>
                    <Text
                        style={[
                            styles.summaryValue,
                            { color: Colors.forestGreen },
                        ]}
                    >
                        ₹
                        {(
                            (summary?.total_settled_paise || 0) / 100
                        ).toLocaleString('en-IN')}
                    </Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Pending Clearance</Text>
                    <Text style={styles.summaryValue}>
                        ₹
                        {(
                            (summary?.pending_payout_paise || 0) / 100
                        ).toLocaleString('en-IN')}
                    </Text>
                </View>
            </View>

            <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Settlement History</Text>
                <Text style={styles.historySubtitle}>
                    Automated weekly payouts via Razorpay Route
                </Text>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>
                        Loading settlement statements...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={settlements}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={renderSettlementCard}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.deepPlum]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Wallet
                                size={48}
                                color={Colors.gray300}
                                style={{ marginBottom: Spacing.md }}
                            />
                            <Text style={styles.emptyTitle}>
                                No settlements generated yet
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Settlement statements are generated on scheduled
                                cycles for confirmed and completed guest stays.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.warmOffWhite,
    },
    summaryContainer: {
        flexDirection: 'row',
        padding: Spacing.md,
        gap: Spacing.md,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    summaryCard: {
        flex: 1,
        padding: Spacing.md,
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    summaryLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    summaryValue: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        marginTop: 4,
    },
    historyHeader: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xs,
    },
    historyTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
    },
    historySubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    listContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 10,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.xs,
    },
    refText: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    periodText: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginTop: 2,
    },
    calcBox: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 8,
        padding: Spacing.sm,
        marginVertical: Spacing.xs,
        gap: 4,
    },
    calcRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    calcLabel: {
        ...Typography.bodySmall,
        color: Colors.gray600,
    },
    calcValue: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        fontWeight: '600',
    },
    netRow: {
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        paddingTop: 6,
        marginTop: 2,
    },
    netLabel: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    netValue: {
        ...Typography.titleSmall,
        color: Colors.forestGreen,
        fontWeight: '800',
    },
    utrText: {
        ...Typography.bodySmall,
        color: Colors.gray400,
        fontSize: 11,
        marginTop: Spacing.xs,
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
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
    },
    emptySubtitle: {
        ...Typography.bodyMedium,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
});
