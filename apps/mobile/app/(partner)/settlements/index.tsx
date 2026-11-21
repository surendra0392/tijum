import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react-native';
import { OwnerApi } from '../../../src/api/owner';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import { SettlementDetail } from '../../../src/api/types';

const TABS = [
    { id: 'all', label: 'All' },
    { id: 'settled', label: 'Settled' },
    { id: 'pending', label: 'Pending' },
];

export default function PartnerSettlementsScreen() {
    const router = useRouter();
    const { token, authState } = useAuth();
    const [settlements, setSettlements] = useState<SettlementDetail[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isGuest = !token || authState !== 'owner_authenticated';

    useEffect(() => {
        if (!isGuest) {
            void loadFinances();
        }
    }, [isGuest]);

    const loadFinances = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const res = await OwnerApi.getSettlements();
            if (res.data && res.data.length > 0) {
                setSettlements(res.data);
            } else {
                setSettlements([]);
            }
        } catch {
            setErrorMessage(
                'Unable to load your settlements. Please try again.',
            );
            setSettlements([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredSettlements = settlements.filter((h: SettlementDetail) => {
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
            {errorMessage ? (
                <View style={styles.errorContainer}>
                    <AlertCircle size={48} color={Colors.coral} />
                    <Text style={styles.errorTitle}>
                        Unable to Load Settlements
                    </Text>
                    <Text style={styles.errorSubtitle}>{errorMessage}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={loadFinances}
                    >
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                </View>
            ) : settlements.length === 0 ? (
                <SafeAreaView style={styles.container}>
                    <View style={styles.emptyContainer}>
                        <Wallet size={48} color={Colors.gray400} />
                        <Text style={styles.emptyTitle}>
                            No Settlements Yet
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            Your settlement history will appear here once
                            payouts are processed.
                        </Text>
                    </View>
                </SafeAreaView>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                if (!isGuest) {
                                    setRefreshing(true);
                                    setErrorMessage(null);
                                    void loadFinances().then(() =>
                                        setRefreshing(false),
                                    );
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
                            <Text style={styles.headerTitle}>
                                Settlement Overview
                            </Text>
                            <View style={{ width: 24 }} />
                        </View>
                    </View>

                    {/* Settlement History Section */}
                    <View style={styles.historySection}>
                        <View style={styles.historyHeaderRow}>
                            <Text style={styles.historyHeading}>
                                Settlement History
                            </Text>
                            <View style={styles.historyTabsRow}>
                                {TABS.map((tab) => {
                                    const isSelected = activeTab === tab.id;
                                    return (
                                        <TouchableOpacity
                                            key={tab.id}
                                            style={[
                                                styles.historyTab,
                                                isSelected &&
                                                    styles.historyTabActive,
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

                        {filteredSettlements.map((item) => (
                            <View key={item.id} style={styles.historyCard}>
                                <View style={styles.historyLeft}>
                                    <View style={styles.historyCheckCircle}>
                                        <CheckCircle2
                                            size={16}
                                            color={Colors.success}
                                        />
                                    </View>
                                    <View style={{ marginLeft: 10 }}>
                                        <Text style={styles.historyDate}>
                                            {item.settled_at
                                                ? new Date(
                                                      item.settled_at,
                                                  ).toLocaleDateString()
                                                : item.period_end}
                                        </Text>
                                        <Text style={styles.historyRef}>
                                            Ref: {item.settlement_reference}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.historyRight}>
                                    <Text style={styles.historyAmount}>
                                        ₹
                                        {(
                                            item.net_payable_minor / 100
                                        ).toLocaleString('en-IN')}
                                    </Text>
                                    <View style={styles.settledBadge}>
                                        <Text style={styles.settledBadgeText}>
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.canvas,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginTop: Spacing.md,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 13,
        color: Colors.inkSecondary,
        marginTop: 4,
        textAlign: 'center',
        maxWidth: 280,
    },
    retryBtn: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs + 2,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
    },
    retryBtnText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.canvas,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginTop: Spacing.md,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 13,
        color: Colors.inkSecondary,
        marginTop: 4,
        textAlign: 'center',
        maxWidth: 280,
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
});
