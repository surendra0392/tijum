import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { OwnerCase } from '../../../src/api/types';
import { AppHeader } from '../../../src/components/AppHeader';
import { Badge } from '../../../src/components/Badge';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { RequireAuth } from '../../../src/components/RequireAuth';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

const STATUTORY_ACKNOWLEDGEMENT_COPY =
    'Statutory formal acknowledgement within 48h; formal resolution tracking up to 30 days.';
import {
    AlertTriangle,
    Clock,
    HelpCircle,
    MessageSquare,
    Search,
    X,
} from 'lucide-react-native';

const STATUS_TABS = [
    { key: 'all', label: 'All Cases' },
    { key: 'action_required', label: 'Action Required' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'resolved', label: 'Resolved' },
];

export default function PartnerCasesScreen() {
    const router = useRouter();
    const isFocused = useIsFocused();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [cases, setCases] = useState<OwnerCase[]>([]);
    const [selectedTab, setSelectedTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchCases = async (overrideSearch?: string) => {
        try {
            setLoadError(null);
            const params: { status?: string; search?: string } = {};
            if (selectedTab !== 'all') {
                params.status = selectedTab;
            }
            const activeSearch =
                overrideSearch !== undefined ? overrideSearch : searchQuery;
            if (activeSearch.trim()) {
                params.search = activeSearch.trim();
            }

            const res = await OwnerApi.getCases(params);
            setCases(Array.isArray(res.data) ? res.data : []);
        } catch (error: any) {
            setLoadError(
                error?.message || 'Failed to load support cases.',
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            setLoading(true);
            void fetchCases();
        }
    }, [selectedTab, isFocused]);

    const onRefresh = () => {
        setRefreshing(true);
        void fetchCases();
    };

    const handleSearchSubmit = () => {
        setLoading(true);
        void fetchCases();
    };

    const getStatusVariant = (
        status: string,
    ): 'success' | 'warning' | 'info' | 'error' | 'neutral' => {
        switch (status?.toLowerCase()) {
            case 'action_required':
            case 'urgent':
                return 'warning';
            case 'under_review':
            case 'open':
            case 'in_progress':
                return 'info';
            case 'resolved':
            case 'closed':
                return 'success';
            default:
                return 'neutral';
        }
    };

    const getPriorityVariant = (
        priority: string,
    ): 'error' | 'warning' | 'neutral' => {
        switch (priority?.toLowerCase()) {
            case 'urgent':
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            default:
                return 'neutral';
        }
    };

    const getPrioritySlaTarget = (priority?: string) => {
        switch (priority?.toLowerCase()) {
            case 'urgent':
                return {
                    target: '2h',
                    label: 'First Action Target: 2 Hours (Urgent)',
                };
            case 'high':
                return {
                    target: '4h',
                    label: 'First Action Target: 4 Hours (High Priority)',
                };
            case 'medium':
                return {
                    target: '24h',
                    label: 'First Action Target: 24 Hours',
                };
            case 'low':
            default:
                return {
                    target: '48h',
                    label: 'First Action Target: 48 Hours',
                };
        }
    };

    const actionRequiredCases = cases.filter((c) => {
        const s = c.status?.toLowerCase();
        return (
            s === 'action_required' || s === 'open' || s === 'awaiting_owner'
        );
    });
    const actionRequiredCount = actionRequiredCases.length;

    const getActionRequiredSlaBannerText = (actionCases: OwnerCase[]) => {
        const hasUrgent = actionCases.some(
            (c) => c.priority?.toLowerCase() === 'urgent',
        );
        const hasHigh = actionCases.some(
            (c) => c.priority?.toLowerCase() === 'high',
        );
        const hasMedium = actionCases.some(
            (c) => c.priority?.toLowerCase() === 'medium',
        );

        if (hasUrgent) {
            return `${actionCases.length} case${actionCases.length > 1 ? 's require' : ' requires'} urgent attention (Internal Target: 2 hours). Immediate response required.`;
        }
        if (hasHigh) {
            return `${actionCases.length} high-priority case${actionCases.length > 1 ? 's require' : ' requires'} response within 4 hours.`;
        }
        if (hasMedium) {
            return `${actionCases.length} case${actionCases.length > 1 ? 's require' : ' requires'} response within 24 hours.`;
        }
        return `${actionCases.length} case${actionCases.length > 1 ? 's require' : ' requires'} response within 48 hours.`;
    };

    return (
        <RequireAuth role="partner">
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <AppHeader
                    title="Support & Grievances"
                    subtitle="Customer Protection & Dispute Desk"
                    showBack
                    fallbackRoute="/(partner)/dashboard"
                />

                {/* Search Input */}
                <View style={styles.searchBarContainer}>
                    <View style={styles.searchBox}>
                        <Search
                            size={18}
                            color={Colors.textTertiary}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by case #, guest name, booking..."
                            placeholderTextColor={Colors.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearchSubmit}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                style={{
                                    width: 44,
                                    height: 44,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                onPress={() => {
                                    setSearchQuery('');
                                    setLoading(true);
                                    void fetchCases('');
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Clear search"
                            >
                                <X size={18} color={Colors.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Status Filter Tabs */}
                <View style={styles.tabsContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsScroll}
                    >
                        {STATUS_TABS.map((tab) => {
                            const active = selectedTab === tab.key;
                            return (
                                <TouchableOpacity
                                    key={tab.key}
                                    style={[
                                        styles.tabChip,
                                        active && styles.tabChipActive,
                                    ]}
                                    onPress={() => setSelectedTab(tab.key)}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: active }}
                                >
                                    <Text
                                        style={[
                                            styles.tabChipText,
                                            active && styles.tabChipTextActive,
                                        ]}
                                    >
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>
                            Loading support cases...
                        </Text>
                    </View>
                ) : loadError && cases.length === 0 ? (
                    <ExceptionalState
                        type="no-internet"
                        title="Support Cases Unavailable"
                        description={loadError}
                        actionLabel="Try Again"
                        onAction={() => {
                            setLoading(true);
                            void fetchCases();
                        }}
                    />
                ) : (
                    <FlatList
                        data={cases}
                        keyExtractor={(item: OwnerCase) =>
                            String(item.id || item.case_reference)
                        }
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[Colors.deepPlum]}
                                tintColor={Colors.deepPlum}
                            />
                        }
                        ListHeaderComponent={
                            actionRequiredCount > 0 ? (
                                <View style={styles.alertBanner}>
                                    <AlertTriangle
                                        size={20}
                                        color={Colors.warning}
                                    />
                                    <View style={styles.alertTextContainer}>
                                        <Text style={styles.alertBannerText}>
                                            {getActionRequiredSlaBannerText(
                                                actionRequiredCases,
                                            )}
                                        </Text>
                                        <Text style={styles.alertBannerSubtext}>
                                            {STATUTORY_ACKNOWLEDGEMENT_COPY}
                                        </Text>
                                    </View>
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <HelpCircle
                                    size={48}
                                    color={Colors.textTertiary}
                                />
                                <Text style={styles.emptyTitle}>
                                    No Cases Found
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    {searchQuery || selectedTab !== 'all'
                                        ? 'No cases match your active filters.'
                                        : 'There are no active customer protection or support cases for your properties.'}
                                </Text>
                            </View>
                        }
                        renderItem={({ item }: { item: OwnerCase }) => {
                            const guestName =
                                item.customer_name || item.guest_name || null;
                            const categoryText =
                                item.category_label ||
                                item.type ||
                                (item.category
                                    ? item.category.replace(/_/g, ' ')
                                    : 'Support Inquiry');
                            const headlineText =
                                item.title ||
                                item.description ||
                                categoryText;
                            const slaLabel = item.first_action_target_hours
                                ? `First Action Target: ${item.first_action_target_hours} Hours`
                                : getPrioritySlaTarget(item.priority).label;

                            return (
                                <TouchableOpacity
                                    style={styles.caseCard}
                                    onPress={() =>
                                        router.push(
                                            `/(partner)/cases/${item.case_reference || item.id}`,
                                        )
                                    }
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardRefArea}>
                                            <Text style={styles.caseRef}>
                                                {item.case_reference}
                                            </Text>
                                            <Text style={styles.caseType}>
                                                {categoryText}
                                            </Text>
                                        </View>
                                        <View style={styles.cardBadges}>
                                            {item.priority && (
                                                <Badge
                                                    variant={getPriorityVariant(
                                                        item.priority,
                                                    )}
                                                    size="sm"
                                                    label={(
                                                        item.priority_label ||
                                                        item.priority
                                                    ).toUpperCase()}
                                                />
                                            )}
                                            <Badge
                                                variant={getStatusVariant(
                                                    item.status,
                                                )}
                                                size="sm"
                                                label={(
                                                    item.status_label ||
                                                    (item.status || 'OPEN').replace(
                                                        /_/g,
                                                        ' ',
                                                    )
                                                ).toUpperCase()}
                                            />
                                        </View>
                                    </View>

                                    <Text
                                        style={styles.caseTitle}
                                        numberOfLines={2}
                                    >
                                        {headlineText}
                                    </Text>

                                    {(item.booking_reference ||
                                        guestName ||
                                        item.property_name) && (
                                        <View style={styles.metaRow}>
                                            {item.property_name ? (
                                                <Text style={styles.metaText}>
                                                    {item.property_name}
                                                </Text>
                                            ) : null}
                                            {item.booking_reference ? (
                                                <Text style={styles.metaText}>
                                                    Ref: {item.booking_reference}
                                                </Text>
                                            ) : null}
                                            {guestName ? (
                                                <Text style={styles.metaText}>
                                                    Guest: {guestName}
                                                </Text>
                                            ) : null}
                                        </View>
                                    )}

                                    <View style={styles.slaRow}>
                                        <Clock
                                            size={12}
                                            color={
                                                item.priority?.toLowerCase() ===
                                                    'urgent' ||
                                                item.priority?.toLowerCase() ===
                                                    'high'
                                                    ? Colors.error
                                                    : Colors.textSecondary
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.slaText,
                                                (item.priority?.toLowerCase() ===
                                                    'urgent' ||
                                                    item.priority?.toLowerCase() ===
                                                        'high') &&
                                                    styles.slaUrgentText,
                                            ]}
                                        >
                                            {slaLabel}
                                        </Text>
                                    </View>

                                    <View style={styles.cardFooter}>
                                        <View style={styles.footerLeft}>
                                            <Clock
                                                size={12}
                                                color={Colors.textTertiary}
                                            />
                                            <Text style={styles.footerDate}>
                                                Updated:{' '}
                                                {item.updated_at ||
                                                    item.created_at}
                                            </Text>
                                        </View>
                                        <View style={styles.footerRight}>
                                            <MessageSquare
                                                size={14}
                                                color={Colors.primary}
                                            />
                                            <Text style={styles.footerLink}>
                                                View Timeline →
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </SafeAreaView>
        </RequireAuth>
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
    searchBarContainer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        backgroundColor: Colors.surface,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.sm,
        height: 40,
    },
    searchIcon: {
        marginRight: Spacing.xs,
    },
    searchInput: {
        flex: 1,
        fontSize: Typography.fontSize.sm,
        color: Colors.textPrimary,
    },
    tabsContainer: {
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingVertical: Spacing.xs,
    },
    tabsScroll: {
        paddingHorizontal: Spacing.md,
        gap: Spacing.xs,
    },
    tabChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    tabChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    tabChipText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    tabChipTextActive: {
        color: Colors.surface,
        fontWeight: '700',
    },
    listContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
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
    alertBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.warning + '15',
        borderWidth: 1,
        borderColor: Colors.warning + '40',
        borderRadius: BorderRadius.md,
        padding: Spacing.sm + 2,
        marginBottom: Spacing.md,
        gap: Spacing.xs,
    },
    alertTextContainer: {
        flex: 1,
    },
    alertBannerText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        color: Colors.textPrimary,
        lineHeight: 18,
    },
    alertBannerSubtext: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 2,
        lineHeight: 15,
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
    caseCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.xs,
    },
    cardRefArea: {
        flex: 1,
    },
    caseRef: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.primary,
    },
    caseType: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    cardBadges: {
        flexDirection: 'row',
        gap: 4,
    },
    caseTitle: {
        fontSize: Typography.fontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    metaRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xs,
    },
    metaText: {
        fontSize: Typography.fontSize.xs,
        color: Colors.textSecondary,
    },
    slaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: Colors.background,
        paddingHorizontal: Spacing.xs + 2,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
        alignSelf: 'flex-start',
        marginBottom: Spacing.xs,
    },
    slaText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    slaUrgentText: {
        color: Colors.error,
        fontWeight: '700',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: Colors.border + '50',
        marginTop: Spacing.xs,
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerDate: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
    footerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    footerLink: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.primary,
    },
});
