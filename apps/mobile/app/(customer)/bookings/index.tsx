import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
    Calendar,
    AlertCircle,
    Building2,
    ChevronRight,
} from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { Reservation } from '../../../src/api/types';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { ReservationStatusBadge } from '../../../src/components/ReservationStatusBadge';
import { SkeletonCard } from '../../../src/components/Skeleton';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import {
    canPayReservation,
    resolveReservationListActionRoute,
} from '../../../src/utils/reservationState';

const FILTER_TABS: Array<{
    label: string;
    value: 'upcoming' | 'awaiting_action' | 'past' | 'cancelled';
}> = [
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Action', value: 'awaiting_action' },
    { label: 'Past', value: 'past' },
    { label: 'Cancelled', value: 'cancelled' },
];

export default function CustomerBookingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const { token, authState, isLoading: authLoading, sessionEpoch } = useAuth();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<
        'upcoming' | 'awaiting_action' | 'past' | 'cancelled'
    >('upcoming');
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isUnauthenticated =
        !token ||
        authState === 'guest' ||
        authState === 'session_expired' ||
        authState === 'owner_authenticated';
    const isCustomerAuthed =
        !isUnauthenticated && authState === 'customer_authenticated';

    useEffect(() => {
        setReservations([]);
        setCurrentPage(1);
        setLastPage(1);
    }, [sessionEpoch]);

    const loadReservations = useCallback(
        async (
            pageToLoad: number = 1,
            options?: { append?: boolean; silent?: boolean },
        ) => {
            if (!isCustomerAuthed) {
                setReservations([]);
                setLoading(false);
                setLoadingMore(false);
                return;
            }
            try {
                if (options?.append) {
                    setLoadingMore(true);
                } else if (!options?.silent) {
                    setLoading(true);
                }
                setErrorMessage(null);
                const res = await CustomerApi.getReservations(
                    activeTab,
                    pageToLoad,
                );
                const items = Array.isArray(res.data) ? res.data : [];
                setReservations((prev) =>
                    options?.append ? [...prev, ...items] : items,
                );
                setCurrentPage(res.meta?.current_page ?? pageToLoad);
                setLastPage(res.meta?.last_page ?? pageToLoad);
            } catch (e: any) {
                setErrorMessage(
                    e.message ||
                        'Failed to load your reservations. Please try again.',
                );
                if (!options?.append) {
                    setReservations([]);
                }
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [activeTab, isCustomerAuthed],
    );

    useEffect(() => {
        if (authLoading || !isFocused || !isCustomerAuthed) {
            return;
        }
        void loadReservations(1);
    }, [activeTab, authLoading, isFocused, isCustomerAuthed, loadReservations]);

    const onRefresh = async () => {
        if (!isCustomerAuthed) {
            return;
        }
        setRefreshing(true);
        await loadReservations(1, { silent: true });
        setRefreshing(false);
    };

    const handleLoadMore = () => {
        if (loading || loadingMore || refreshing || currentPage >= lastPage) {
            return;
        }
        void loadReservations(currentPage + 1, { append: true });
    };

    const displayList = reservations;

    const renderReservationCard = ({ item }: { item: Reservation }) => {
        const reference = item.reference ?? item.booking_reference;
        const rawAmount = item.total_amount_paise / 100;
        const nights = item.total_stay_days ?? item.duration_quantity;
        const photoUrl = item.property?.cover_image_url ?? null;
        const propertyName =
            item.property_name ?? item.property?.name ?? 'Verified Stay';
        const isAwaitingPayment = canPayReservation(item);

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.88}
                onPress={() =>
                    router.push(resolveReservationListActionRoute(reference))
                }
            >
                <View style={styles.cardRow}>
                    {photoUrl ? (
                        <Image
                            source={{ uri: photoUrl }}
                            style={styles.propertyThumb}
                            resizeMode="cover"
                        />
                    ) : (
                        <View
                            style={[
                                styles.propertyThumb,
                                styles.propertyPlaceholder,
                            ]}
                        >
                            <Building2 size={28} color={Colors.gray400} />
                        </View>
                    )}

                    <View style={styles.cardInfo}>
                        <View style={styles.statusRow}>
                            <View style={styles.statusGroup}>
                                <ReservationStatusBadge
                                    status={item.status}
                                    label={item.status_label}
                                />
                                {item.requires_refund_review ? (
                                    <View style={styles.refundReviewPill}>
                                        <Text style={styles.refundReviewText}>
                                            Refund Review
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <ChevronRight size={16} color={Colors.coralDark} />
                        </View>

                        <Text style={styles.propertyName} numberOfLines={1}>
                            {propertyName}
                        </Text>

                        <View style={styles.metaRow}>
                            <Calendar
                                size={12}
                                color={Colors.gray500}
                                style={{ marginRight: 4 }}
                            />
                            <Text style={styles.metaText}>
                                {item.check_in_date} - {item.check_out_date} (
                                {nights} {nights === 1 ? 'Night' : 'Nights'})
                            </Text>
                        </View>

                        <Text style={styles.bookingIdText}>
                            Booking ID: {reference}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBottomRow}>
                    <Text style={styles.priceText}>
                        Total: ₹{rawAmount.toLocaleString('en-IN')}
                    </Text>
                    <TouchableOpacity
                        style={styles.viewDetailsBtn}
                        onPress={() =>
                            router.push(
                                resolveReservationListActionRoute(reference),
                            )
                        }
                    >
                        <Text style={styles.viewDetailsText}>
                            {isAwaitingPayment ? 'Pay Now' : 'View Details'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    if (!authLoading && isUnauthenticated) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <View
                    style={[
                        styles.plumHeader,
                        { paddingTop: Math.max(insets.top, Spacing.base) },
                    ]}
                >
                    <Text style={styles.headerTitle}>My Bookings</Text>
                    <Text style={styles.headerSubtitle}>
                        Track your verified food-inclusive stays
                    </Text>
                </View>
                <ExceptionalState
                    type="auth-required"
                    title="Sign In to View Stays"
                    description="Please sign in to your customer account to access your active reservations, check-in codes, and payment receipts."
                    actionLabel="Sign In as Customer"
                    onAction={() => router.push('/(auth)/customer-login')}
                    secondaryActionLabel="Explore Stays"
                    onSecondaryAction={() => router.push('/(customer)/explore')}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            {/* Curved Deep Plum Header */}
            <View
                style={[
                    styles.plumHeader,
                    { paddingTop: Math.max(insets.top, Spacing.base) },
                ]}
            >
                <Text style={styles.headerTitle}>My Bookings</Text>
                <Text style={styles.headerSubtitle}>
                    Manage your upcoming stays & reservations
                </Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsContainer}>
                {FILTER_TABS.map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                        <TouchableOpacity
                            key={tab.value}
                            style={[styles.tab, isActive && styles.activeTab]}
                            onPress={() => setActiveTab(tab.value)}
                            activeOpacity={0.8}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    isActive && styles.activeTabText,
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading && !refreshing && reservations.length === 0 ? (
                <View style={styles.listContainer}>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </View>
            ) : errorMessage && reservations.length === 0 ? (
                <View style={styles.errorContainer}>
                    <AlertCircle size={48} color={Colors.coralDark} />
                    <Text style={styles.errorTitle}>Unable to Load Stays</Text>
                    <Text style={styles.errorSubtitle}>{errorMessage}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => void loadReservations(1)}
                        accessibilityRole="button"
                    >
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={displayList}
                    renderItem={renderReservationCard}
                    keyExtractor={(item: Reservation) =>
                        String(item.id || item.reference)
                    }
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.deepPlum]}
                            tintColor={Colors.deepPlum}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={{ paddingVertical: Spacing.md }}>
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.deepPlum}
                                />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Calendar size={48} color={Colors.gray400} />
                            <Text style={styles.emptyTitle}>
                                No{' '}
                                {FILTER_TABS.find(
                                    (t) => t.value === activeTab,
                                )?.label.toLowerCase() || activeTab}{' '}
                                bookings
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Browse properties and book your next stay!
                            </Text>
                            <TouchableOpacity
                                style={styles.exploreBtn}
                                onPress={() =>
                                    router.push('/(customer)/explore')
                                }
                                accessibilityRole="button"
                            >
                                <Text style={styles.exploreBtnText}>
                                    Explore Stays
                                </Text>
                            </TouchableOpacity>
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
        backgroundColor: Colors.canvas,
    },
    plumHeader: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.base,
        paddingBottom: Spacing.xl,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.white,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 13,
        color: Colors.warmCream,
        textAlign: 'center',
        marginTop: 4,
        opacity: 0.9,
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
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius.pill,
        padding: 4,
        ...Shadows.subtle,
    },
    tab: {
        flex: 1,
        minHeight: 44,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BorderRadius.pill,
    },
    activeTab: {
        backgroundColor: Colors.peachCream,
        borderWidth: 1,
        borderColor: Colors.coral,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.inkSecondary,
    },
    activeTabText: {
        color: Colors.coralDark,
        fontWeight: '700',
    },
    listContainer: {
        padding: Spacing.base,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.card,
    },
    cardRow: {
        flexDirection: 'row',
    },
    propertyThumb: {
        width: 86,
        height: 86,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceSubtle,
    },
    propertyPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
        marginLeft: Spacing.md,
        justifyContent: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    statusGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        flex: 1,
    },
    refundReviewPill: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    refundReviewText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#92400E',
    },
    propertyName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    metaText: {
        fontSize: 12,
        color: Colors.inkSecondary,
    },
    bookingIdText: {
        fontSize: 11,
        color: Colors.inkMuted,
        fontWeight: '500',
    },
    cardBottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.md,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
    },
    priceText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    viewDetailsBtn: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: Colors.deepPlum,
    },
    viewDetailsText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 13,
        color: Colors.inkMuted,
        marginTop: 4,
        marginBottom: 16,
    },
    exploreBtn: {
        minHeight: 48,
        justifyContent: 'center',
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: BorderRadius.pill,
    },
    exploreBtnText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 13,
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
        minHeight: 48,
        justifyContent: 'center',
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.md,
    },
    retryBtnText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
});
