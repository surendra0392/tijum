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
import { OwnerApi } from '../../../src/api/owner';
import { OwnerCommissionAgreement } from '../../../src/api/types';
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CheckCircle2,
    FileCheck2,
    FileText,
    Percent,
    Shield,
} from 'lucide-react-native';

export default function CommissionAgreementsScreen() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [agreements, setAgreements] = useState<OwnerCommissionAgreement[]>([]);
    const [acceptingId, setAcceptingId] = useState<number | null>(null);

    const fetchAgreements = async () => {
        try {
            const res = await OwnerApi.getCommissionAgreements();
            if (res.data) {
                setAgreements(res.data);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to load commission agreements.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAgreements();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAgreements();
    };

    const handleAccept = (agreement: OwnerCommissionAgreement) => {
        Alert.alert(
            'Electronic Agreement Acceptance',
            `By accepting, you agree to the TIJUM Partner Commission Terms (${agreement.terms_version}) with a commission rate of ${agreement.commission_rate_percentage}% on gross booking value.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept & Sign',
                    style: 'default',
                    onPress: async () => {
                        setAcceptingId(agreement.id);
                        try {
                            await OwnerApi.acceptCommissionAgreement(agreement.id);
                            Alert.alert('Agreement Signed', 'Commission agreement accepted successfully.');
                            fetchAgreements();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to accept agreement.');
                        } finally {
                            setAcceptingId(null);
                        }
                    },
                },
            ],
        );
    };

    const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'error' | 'neutral' => {
        switch (status?.toLowerCase()) {
            case 'active':
            case 'accepted':
                return 'success';
            case 'pending':
            case 'draft':
                return 'warning';
            case 'superseded':
            case 'expired':
                return 'neutral';
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
                    accessibilityLabel="Back to Financial Profile"
                >
                    <ArrowLeft size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Commission Agreements</Text>
                    <Text style={styles.headerSubtitle}>Contractual Rates & Service Terms</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading agreements...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {/* Notice */}
                    <View style={styles.noticeBanner}>
                        <Shield size={18} color={Colors.primary} />
                        <Text style={styles.noticeText}>
                            Platform commissions are deducted automatically from gross guest payments during settlement calculation.
                        </Text>
                    </View>

                    {agreements.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <FileText size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No Agreements Found</Text>
                            <Text style={styles.emptySubtitle}>
                                Standard platform commission terms will apply once your property is approved.
                            </Text>
                        </View>
                    ) : (
                        agreements.map((agreement) => {
                            const isPending =
                                agreement.status?.toLowerCase() === 'pending' ||
                                !agreement.accepted_at;

                            return (
                                <View key={agreement.id} style={styles.agreementCard}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.titleRow}>
                                            <FileCheck2 size={20} color={Colors.primary} />
                                            <Text style={styles.agreementTitle}>
                                                Terms {agreement.terms_version}
                                            </Text>
                                        </View>
                                        <Badge variant={getStatusVariant(agreement.status)} size="sm">
                                            {agreement.status.toUpperCase()}
                                        </Badge>
                                    </View>

                                    {/* Commission Metric Box */}
                                    <View style={styles.rateBox}>
                                        <View style={styles.rateRow}>
                                            <Text style={styles.rateLabel}>Commission Rate</Text>
                                            <Text style={styles.rateValue}>
                                                {agreement.commission_rate_percentage}%
                                            </Text>
                                        </View>
                                        <Text style={styles.rateSubtext}>
                                            Base: {agreement.base_type || 'Gross Booking Value'} • {agreement.gst_treatment || 'Exclusive of GST'}
                                        </Text>
                                    </View>

                                    {/* Agreement Details */}
                                    <View style={styles.detailsList}>
                                        <View style={styles.detailRow}>
                                            <Calendar size={14} color={Colors.textSecondary} />
                                            <Text style={styles.detailLabel}>Effective From:</Text>
                                            <Text style={styles.detailValue}>
                                                {agreement.effective_from || 'Platform Onboarding'}
                                            </Text>
                                        </View>

                                        {agreement.accepted_at ? (
                                            <>
                                                <View style={styles.detailRow}>
                                                    <CheckCircle2 size={14} color={Colors.success} />
                                                    <Text style={styles.detailLabel}>Accepted At:</Text>
                                                    <Text style={[styles.detailValue, { color: Colors.success, fontWeight: '700' }]}>
                                                        {agreement.accepted_at}
                                                    </Text>
                                                </View>
                                                {agreement.terms_hash ? (
                                                    <View style={styles.detailRow}>
                                                        <Shield size={14} color={Colors.primary} />
                                                        <Text style={styles.detailLabel}>SHA-256 Hash:</Text>
                                                        <Text style={[styles.detailValue, { fontSize: 11 }]} numberOfLines={1}>
                                                            {agreement.terms_hash.slice(0, 16)}...
                                                        </Text>
                                                    </View>
                                                ) : null}
                                            </>
                                        ) : (
                                            <View style={styles.detailRow}>
                                                <AlertCircle size={14} color={Colors.warning} />
                                                <Text style={styles.detailLabel}>Status:</Text>
                                                <Text style={[styles.detailValue, { color: Colors.warning, fontWeight: '700' }]}>
                                                    Signature Pending
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Action button if pending */}
                                    {isPending && (
                                        <Button
                                            title={acceptingId === agreement.id ? 'Accepting...' : 'Review & Sign Agreement'}
                                            onPress={() => handleAccept(agreement)}
                                            disabled={acceptingId === agreement.id}
                                            style={styles.acceptButton}
                                        />
                                    )}
                                </View>
                            );
                        })
                    )}
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
        fontSize: Typography.fontSize.lg,
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
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
    },
    noticeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '10',
        padding: Spacing.sm + 2,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
        gap: Spacing.xs,
    },
    noticeText: {
        flex: 1,
        fontSize: Typography.fontSize.xs,
        color: Colors.primary,
        fontWeight: '500',
        lineHeight: 16,
    },
    emptyContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: Typography.fontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: Spacing.md,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
    agreementCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    agreementTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    rateBox: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginVertical: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    rateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rateLabel: {
        fontSize: Typography.fontSize.sm,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    rateValue: {
        fontSize: Typography.fontSize.xl,
        fontWeight: '800',
        color: Colors.primary,
    },
    rateSubtext: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textTertiary,
        marginTop: 4,
    },
    detailsList: {
        marginVertical: Spacing.sm,
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailLabel: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        width: 100,
    },
    detailValue: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textPrimary,
        fontWeight: '500',
        flex: 1,
    },
    acceptButton: {
        marginTop: Spacing.sm,
    },
});
