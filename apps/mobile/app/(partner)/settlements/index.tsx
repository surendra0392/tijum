import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
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
    Wallet,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Download,
    LogIn,
} from 'lucide-react-native';
import { OwnerApi } from '../../../src/api/owner';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import { SHOWCASE_SETTLEMENTS } from '../../../src/data/showcaseData.ts';

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'settled', label: 'Settled' },
    { id: 'pending', label: 'Pending' },
];

export default function PartnerSettlementsScreen() {
    const router = useRouter();
    const { token, authState } = useAuth();
    const [finances, setFinances] = useState<any>(SHOWCASE_SETTLEMENTS);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const isGuest = !token || authState !== 'owner_authenticated';

    useEffect(() => {
        if (!isGuest) {
            loadFinances();
        }
    }, [isGuest]);

    const loadFinances = async () => {
        try {
            setLoading(true);
            const res = await OwnerApi.getSettlements();
            if (res.data && res.data.length > 0) {
                setFinances((prev: any) => ({
                    ...prev,
                    history: res.data,
                }));
            }
        } catch {
            setFinances(SHOWCASE_SETTLEMENTS);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSettlement = () => {
        Alert.alert(
            'Request Settlement',
            'Your available balance of ₹12,450 will be transferred to your registered bank account (SBI **1234) within 24 operational hours.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Transfer',
                    onPress: () =>
                        Alert.alert(
                            'Transfer Initiated',
                            'Settlement request has been queued.',
                        ),
                },
            ],
        );
    };

    const filteredHistory = finances.history.filter((h: any) => {
        if (activeTab === 'settled') return h.status === 'settled';
        if (activeTab === 'pending') return h.status === 'pending';
        return true;
    });

    if (!token || authState !== 'owner_authenticated') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.plumHeader}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            activeOpacity={0.8}
                        >
                            <ChevronLeft size={24} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Settlements</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </View>
                <ExceptionalState
                    type="auth-required"
                    title="Partner Access Required"
                    description="Please sign in to your partner account to view earnings, financial breakdowns, and withdrawal history."
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
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            if (!isGuest) {
                                setRefreshing(true);
                                loadFinances().then(() => setRefreshing(false));
                            }
                        }}
                    />
                }
            >
                {/* Curved Deep Plum Header */}
                <View style={styles.plumHeader}>
                    <View style={styles.headerTopRow}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            activeOpacity={0.8}
                        >
                            <ChevronLeft size={24} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Settlement Overview</Text>
                        <View style={{ width: 24 }} />
                    </View>
                </View>

                {/* Guest Banner */}
                {isGuest && (
                    <View style={styles.guestBanner}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.guestBannerTitle}>
                                Financials Preview Mode
                            </Text>
                            <Text style={styles.guestBannerDesc}>
                                Showing sample verified payouts. Sign in to view your
                                actual bank transfers.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.guestSignInBtn}
                            onPress={() => router.push('/(auth)/owner-login')}
                        >
                            <LogIn size={13} color={Colors.white} style={{ marginRight: 4 }} />
                            <Text style={styles.guestSignInBtnText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Available for Withdrawal Card */}
                <View style={styles.withdrawalCard}>
                    <View style={styles.walletIconCircle}>
                        <Wallet size={24} color={Colors.white} />
                    </View>
                    <Text style={styles.withdrawalLabel}>Available for Withdrawal</Text>
                    <Text style={styles.withdrawalAmount}>
                        ₹{finances.available_for_withdrawal.toLocaleString('en-IN')}
                    </Text>

                    {/* Breakdown Row */}
                    <View style={styles.breakdownRow}>
                        <View style={styles.breakdownCol}>
                            <Text style={styles.breakdownLabel}>Total Earnings</Text>
                            <Text style={styles.breakdownVal}>
                                ₹{finances.total_earnings.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.breakdownCol}>
                            <Text style={styles.breakdownLabel}>Settled</Text>
                            <Text style={styles.breakdownVal}>
                                ₹{finances.settled.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.breakdownCol}>
                            <Text style={styles.breakdownLabel}>Pending</Text>
                            <Text style={styles.breakdownVal}>
                                ₹{finances.pending.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Next Settlement Card */}
                <View style={styles.nextSettlementCard}>
                    <View style={styles.nextSettlementLeft}>
                        <Calendar size={18} color={Colors.deepPlum} />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.nextSettlementTitle}>Next Settlement</Text>
                            <Text style={styles.nextSettlementDate}>
                                {finances.next_settlement.date}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.nextSettlementRight}>
                        <Text style={styles.nextSettlementAmount}>
                            ₹{finances.next_settlement.amount.toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.viewDetailsText}>View Details &gt;</Text>
                    </View>
                </View>

                {/* Last 6 Months Earnings Bar Chart */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Last 6 Months Earnings</Text>
                    <View style={styles.barChartRow}>
                        {[
                            { m: 'Nov', h: 40 },
                            { m: 'Dec', h: 55 },
                            { m: 'Jan', h: 65 },
                            { m: 'Feb', h: 75 },
                            { m: 'Mar', h: 85 },
                            { m: 'Apr', h: 95 },
                        ].map((col) => (
                            <View key={col.m} style={styles.chartCol}>
                                <View
                                    style={[
                                        styles.chartBar,
                                        { height: `${col.h}%` },
                                    ]}
                                />
                                <Text style={styles.chartColLabel}>{col.m}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Primary Action Button */}
                <TouchableOpacity
                    style={styles.requestButton}
                    onPress={handleRequestSettlement}
                    activeOpacity={0.88}
                >
                    <Text style={styles.requestButtonText}>Request Settlement</Text>
                </TouchableOpacity>

                {/* Settlement History Section */}
                <View style={styles.historySection}>
                    <View style={styles.historyHeaderRow}>
                        <Text style={styles.historyHeading}>Settlement History</Text>
                        <View style={styles.historyTabsRow}>
                            {TABS.map((tab) => {
                                const isSelected = activeTab === tab.id;
                                return (
                                    <TouchableOpacity
                                        key={tab.id}
                                        style={[
                                            styles.historyTab,
                                            isSelected && styles.historyTabActive,
                                        ]}
                                        onPress={() => setActiveTab(tab.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.historyTabText,
                                                isSelected &&
                                                    styles.historyTabTextActive,
                                            ]}
                                        >
                                            {tab.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {filteredHistory.map((item: any) => (
                        <View key={item.id} style={styles.historyCard}>
                            <View style={styles.historyLeft}>
                                <View style={styles.historyCheckCircle}>
                                    <CheckCircle2 size={16} color={Colors.success} />
                                </View>
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.historyDate}>{item.date}</Text>
                                    <Text style={styles.historyRef}>Ref: {item.reference}</Text>
                                </View>
                            </View>

                            <View style={styles.historyRight}>
                                <Text style={styles.historyAmount}>
                                    ₹{item.amount.toLocaleString('en-IN')}
                                </Text>
                                <View style={styles.settledBadge}>
                                    <Text style={styles.settledBadgeText}>Settled</Text>
                                </View>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity
                        style={styles.downloadStatementBtn}
                        onPress={() =>
                            Alert.alert(
                                'Download Statement',
                                'Financial statement for FY 2024-25 downloaded in PDF format.',
                            )
                        }
                    >
                        <Download size={15} color={Colors.white} style={{ marginRight: 6 }} />
                        <Text style={styles.downloadStatementBtnText}>
                            Download Statement
                        </Text>
                    </TouchableOpacity>
                </View>
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
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.white,
    },
    guestBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.peachCream,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.peachSoft,
    },
    guestBannerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.plumPrimary,
    },
    guestBannerDesc: {
        fontSize: 11,
        color: Colors.inkSecondary,
        marginTop: 2,
    },
    guestSignInBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: BorderRadius.pill,
        marginLeft: 8,
    },
    guestSignInBtnText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    withdrawalCard: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: -Spacing.md,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.card,
    },
    walletIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.deepPlum,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    withdrawalLabel: {
        fontSize: 13,
        color: Colors.inkSecondary,
        fontWeight: '500',
    },
    withdrawalAmount: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginVertical: 4,
    },
    breakdownRow: {
        flexDirection: 'row',
        width: '100%',
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
        justifyContent: 'space-around',
    },
    breakdownCol: {
        alignItems: 'center',
    },
    breakdownLabel: {
        fontSize: 11,
        color: Colors.inkMuted,
        marginBottom: 2,
    },
    breakdownVal: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    verticalDivider: {
        width: 1,
        height: '80%',
        backgroundColor: Colors.borderSubtle,
    },
    nextSettlementCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    nextSettlementLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nextSettlementTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    nextSettlementDate: {
        fontSize: 12,
        color: Colors.inkMuted,
        marginTop: 2,
    },
    nextSettlementRight: {
        alignItems: 'flex-end',
    },
    nextSettlementAmount: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    viewDetailsText: {
        fontSize: 11,
        color: Colors.coral,
        fontWeight: '600',
        marginTop: 2,
    },
    chartCard: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.md,
        padding: Spacing.base,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    chartTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginBottom: Spacing.md,
    },
    barChartRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 100,
        paddingBottom: 16,
    },
    chartCol: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    chartBar: {
        width: 14,
        backgroundColor: Colors.deepPlum,
        borderRadius: 4,
        opacity: 0.8,
    },
    chartColLabel: {
        fontSize: 10,
        color: Colors.inkMuted,
        marginTop: 4,
    },
    requestButton: {
        backgroundColor: Colors.deepPlum,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.base,
        paddingVertical: 14,
        borderRadius: BorderRadius.pill,
        alignItems: 'center',
        ...Shadows.subtle,
    },
    requestButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '700',
    },
    historySection: {
        marginHorizontal: Spacing.base,
        marginTop: Spacing.lg,
    },
    historyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    historyHeading: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    historyTabsRow: {
        flexDirection: 'row',
        gap: 6,
    },
    historyTab: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.pill,
        backgroundColor: Colors.surfaceSubtle,
    },
    historyTabActive: {
        backgroundColor: Colors.deepPlum,
    },
    historyTabText: {
        fontSize: 11,
        color: Colors.inkSecondary,
        fontWeight: '600',
    },
    historyTabTextActive: {
        color: Colors.white,
        fontWeight: '700',
    },
    historyCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyCheckCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.successLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyDate: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    historyRef: {
        fontSize: 11,
        color: Colors.inkMuted,
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyAmount: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.inkPrimary,
    },
    settledBadge: {
        backgroundColor: Colors.successLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
        marginTop: 2,
    },
    settledBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.successText,
    },
    downloadStatementBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.deepPlum,
        paddingVertical: 12,
        borderRadius: BorderRadius.pill,
        marginTop: Spacing.sm,
    },
    downloadStatementBtnText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '700',
    },
});
