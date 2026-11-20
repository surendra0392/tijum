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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { Badge } from '../../../src/components/Badge';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import {
    ArrowLeft,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    IndianRupee,
    Info,
    Receipt,
} from 'lucide-react-native';

export default function SettlementDetailScreen() {
    const router = useRouter();
    const { reference } = useLocalSearchParams<{ reference: string }>();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statement, setStatement] = useState<any>(null);

    const fetchStatement = async () => {
        if (!reference) return;
        try {
            const res = await OwnerApi.getSettlement(reference);
            if (res.data) {
                setStatement(res.data);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load settlement statement.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStatement();
    }, [reference]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStatement();
    };

    const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'error' | 'neutral' => {
        switch (status?.toLowerCase()) {
            case 'settled':
            case 'completed':
            case 'processed':
                return 'success';
            case 'pending':
            case 'processing':
                return 'warning';
            case 'failed':
                return 'error';
            default:
                return 'info';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    accessibilityLabel="Back to Settlements"
                >
                    <ArrowLeft size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Settlement Statement</Text>
                    <Text style={styles.headerSubtitle}>{reference}</Text>
                </View>
                {statement?.status && (
                    <Badge variant={getStatusVariant(statement.status)} size="sm">
                        {statement.status_label || statement.status.toUpperCase()}
                    </Badge>
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading statement breakdown...</Text>
                </View>
            ) : !statement ? (
                <View style={styles.centered}>
                    <Info size={40} color={Colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Statement Not Found</Text>
                    <Text style={styles.emptySubtitle}>Could not retrieve details for {reference}.</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Period Banner */}
                    <View style={styles.periodBanner}>
                        <Calendar size={18} color={Colors.primary} />
                        <Text style={styles.periodText}>
                            Period: {statement.period_start} to {statement.period_end}
                        </Text>
                    </View>

                    {/* Net Payout Highlight Card */}
                    <View style={styles.netCard}>
                        <Text style={styles.netLabel}>Net Settlement Payout</Text>
                        <Text style={styles.netAmount}>
                            ₹{((statement.net_settlement_amount_minor || statement.net_payable_minor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                        {statement.provider_transfer_id ? (
                            <View style={styles.utrRow}>
                                <CheckCircle2 size={14} color={Colors.success} />
                                <Text style={styles.utrText}>
                                    Transfer ID / UTR: {statement.provider_transfer_id}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.utrRow}>
                                <Clock size={14} color={Colors.warning} />
                                <Text style={[styles.utrText, { color: Colors.warning }]}>
                                    Transfer processing via Razorpay Route
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Financial Computation Breakdown */}
                    <View style={styles.breakdownCard}>
                        <Text style={styles.sectionTitle}>Payout Computation</Text>

                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>Gross Booking Value</Text>
                            <Text style={styles.calcValue}>
                                ₹{((statement.gross_booking_value_minor || statement.gross_amount_minor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>

                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>TIJUM Platform Commission</Text>
                            <Text style={[styles.calcValue, { color: Colors.error }]}>
                                - ₹{((statement.commission_amount_minor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>

                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>GST on Commission (18%)</Text>
                            <Text style={[styles.calcValue, { color: Colors.error }]}>
                                - ₹{((statement.commission_tax_amount_minor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>

                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>TDS / Statutory Deduction (194-O)</Text>
                            <Text style={[styles.calcValue, { color: Colors.error }]}>
                                - ₹{((statement.statutory_deductions_minor || statement.tds_amount_minor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>

                        {((statement.refund_adjustments_minor || 0) + (statement.other_adjustments_minor || 0)) > 0 && (
                            <View style={styles.calcRow}>
                                <Text style={styles.calcLabel}>Refund / Relocation Adjustments</Text>
                                <Text style={[styles.calcValue, { color: Colors.error }]}>
                                    - ₹{(((statement.refund_adjustments_minor || 0) + (statement.other_adjustments_minor || 0)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                        )}

                        <View style={[styles.calcRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Total Net Transferred</Text>
                            <Text style={styles.totalValue}>
                                ₹{((statement.net_settlement_amount_minor || statement.net_payable_minor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>

                    {/* Associated Reservations List */}
                    <View style={styles.itemsCard}>
                        <View style={styles.itemsHeader}>
                            <Receipt size={18} color={Colors.primary} />
                            <Text style={styles.sectionTitle}>
                                Included Reservations ({statement.items?.length || 0})
                            </Text>
                        </View>

                        {(!statement.items || statement.items.length === 0) ? (
                            <Text style={styles.noItemsText}>
                                No itemized reservations recorded for this settlement period.
                            </Text>
                        ) : (
                            statement.items.map((item: any) => (
                                <View key={item.id} style={styles.itemRow}>
                                    <View style={styles.itemTop}>
                                        <Text style={styles.itemRef}>
                                            {item.booking_reference || `Booking #${item.reservation_id}`}
                                        </Text>
                                        <Text style={styles.itemNet}>
                                            ₹{((item.net_payable_minor || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </View>

                                    {item.property_name && (
                                        <Text style={styles.itemProperty}>{item.property_name}</Text>
                                    )}

                                    {item.stay_dates && (
                                        <Text style={styles.itemStay}>Stay: {item.stay_dates}</Text>
                                    )}

                                    <View style={styles.itemSubCalc}>
                                        <Text style={styles.itemSubText}>
                                            Gross: ₹{((item.gross_amount_minor || 0) / 100).toLocaleString('en-IN')}
                                        </Text>
                                        <Text style={styles.itemSubText}>
                                            Comm: ₹{((item.commission_amount_minor || 0) / 100).toLocaleString('en-IN')}
                                        </Text>
                                        <Text style={styles.itemSubText}>
                                            TDS: ₹{((item.tax_deduction_minor || 0) / 100).toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    backButton: {
        padding: Spacing.xs,
        marginRight: Spacing.xs,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    scrollContent: {
        padding: Spacing.md,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    emptyTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    periodBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    periodText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    netCard: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    netLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.surface + 'CC',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    netAmount: {
        fontSize: Typography.fontSize.xxl,
        fontWeight: '800',
        color: Colors.surface,
        marginTop: 4,
    },
    utrRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: Spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.sm,
    },
    utrText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.surface,
        fontWeight: '500',
    },
    breakdownCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    calcRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    calcLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    calcValue: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    totalRow: {
        marginTop: Spacing.xs,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    totalLabel: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    totalValue: {
        fontSize: Typography.fontSize.md,
        fontWeight: '800',
        color: Colors.primary,
    },
    itemsCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
    },
    itemsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    noItemsText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        paddingVertical: Spacing.sm,
    },
    itemRow: {
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border + '60',
    },
    itemTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemRef: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    itemNet: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.success,
    },
    itemProperty: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    itemStay: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textTertiary,
        marginTop: 2,
    },
    itemSubCalc: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: 4,
    },
    itemSubText: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
});
