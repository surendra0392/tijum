import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    Calendar,
    ChevronRight,
    MapPin,
    LogIn,
    CheckCircle2,
} from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { Reservation } from '../../../src/api/types';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';
import { SHOWCASE_BOOKINGS } from '../../../src/data/showcaseData.ts';

const FILTER_TABS = [
    { label: 'Upcoming (1)', value: 'upcoming' },
    { label: 'Awaiting Action', value: 'awaiting_payment' },
    { label: 'Past', value: 'past' },
    { label: 'Cancelled', value: 'cancelled' },
];

export default function CustomerBookingsScreen() {
    const router = useRouter();
    const { token, authState, isLoading: authLoading } = useAuth();
    const [reservations, setReservations] = useState<Reservation[]>(SHOWCASE_BOOKINGS);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [isUnauthenticated, setIsUnauthenticated] = useState(false);
    const isGuest = !token || authState === 'guest' || authState === 'session_expired';

    useEffect(() => {
        if (authLoading) return;
        if (!token || authState === 'guest' || authState === 'session_expired') {
            setIsUnauthenticated(true);
            setLoading(false);
            return;
        }
        setIsUnauthenticated(false);
        loadReservations();
    }, [activeTab, token, authState, authLoading]);

    const loadReservations = async () => {
        if (!token || authState === 'guest' || authState === 'session_expired') {
            setIsUnauthenticated(true);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setIsUnauthenticated(false);
            const res = await CustomerApi.getReservations();
            if (res.data && res.data.length > 0) {
                setReservations(res.data);
            } else {
                setReservations(SHOWCASE_BOOKINGS);
            }
        } catch (e: any) {
            if (e?.status === 401 || e?.message?.includes('Unauthenticated')) {
                setIsUnauthenticated(true);
            } else {
                setReservations(SHOWCASE_BOOKINGS);
            }
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        if (!token || authState === 'guest' || authState === 'session_expired') {
            setIsUnauthenticated(true);
            return;
        }
        setRefreshing(true);
        await loadReservations();
        setRefreshing(false);
    };

    const filteredReservations = reservations.filter((item) => {
        if (activeTab === 'cancelled') {
            return item.status === 'cancelled';
        }
        if (activeTab === 'past') {
            return item.status === 'checked_out' || item.status === 'completed';
        }
        return item.status !== 'cancelled' && item.status !== 'checked_out';
    });

    const displayList =
        filteredReservations.length > 0
            ? filteredReservations
            : activeTab === 'upcoming'
              ? SHOWCASE_BOOKINGS
              : [];

    const renderReservationCard = ({ item }: { item: Reservation }) => {
        const anyItem = item as any;
        const rawAmount =
            anyItem.total_amount ??
            (item.total_amount_paise ? Math.round(item.total_amount_paise / 100) : 9560);
        const nights = anyItem.nights || item.duration_quantity || 3;
        const photoUrl =
            anyItem.property_photo ||
            'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80';
        const isAwaitingPayment = item.status === 'awaiting_payment';

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.88}
                onPress={() =>
                    router.push(
                        `/(customer)/bookings/${item.reference || 'TJM25042500123'}` as any,
                    )
                }
            >
                <View style={styles.cardRow}>
                    <Image
                        source={{ uri: photoUrl }}
                        style={styles.propertyThumb}
                        resizeMode="cover"
                    />

                    <View style={styles.cardInfo}>
                        <View style={styles.statusRow}>
                            <View style={styles.confirmedBadge}>
                                <CheckCircle2
                                    size={11}
                                    color={Colors.successText}
                                    style={{ marginRight: 3 }}
                                />
                                <Text style={styles.confirmedBadgeText}>
                                    {item.status === 'checked_in'
                                        ? 'Checked In'
                                        : 'Confirmed'}
                                </Text>
                            </View>
                            <ChevronRight size={16} color={Colors.coral} />
                        </View>

                        <Text style={styles.propertyName} numberOfLines={1}>
                            {item.property_name || 'Greenview PG'}
                        </Text>

                        <View style={styles.metaRow}>
                            <Calendar
                                size={12}
                                color={Colors.gray500}
                                style={{ marginRight: 4 }}
                            />
                            <Text style={styles.metaText}>
                                {item.check_in_date || '25 Apr'} -{' '}
                                {item.check_out_date || '28 Apr 2025'} ({nights}{' '}
                                {nights === 1 ? 'Night' : 'Nights'})
                            </Text>
                        </View>

                        <Text style={styles.bookingIdText}>
                            Booking ID: {item.reference || 'TJM25042500123'}
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
                                isAwaitingPayment
                                    ? (`/(customer)/bookings/create?reference=${item.reference}` as any)
                                    : (`/(customer)/bookings/${item.reference || 'TJM25042500123'}` as any),
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

    if (!authLoading && (isUnauthenticated || !token || authState === 'guest' || authState === 'session_expired')) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.plumHeader}>
                    <Text style={styles.headerTitle}>My Bookings</Text>
                    <Text style={styles.headerSubtitle}>
                        Track your verified food-inclusive stays
                    </Text>
                </View>
                <ExceptionalState
                    type="session-expired"
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
        <SafeAreaView style={styles.container}>
            {/* Curved Deep Plum Header */}
            <View style={styles.plumHeader}>
                <Text style={styles.headerTitle}>My Bookings</Text>
                <Text style={styles.headerSubtitle}>
                    Manage your upcoming stays & reservations
                </Text>
            </View>

            {/* Guest Banner if not logged in */}
            {isGuest && (
                <View style={styles.guestBanner}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.guestBannerTitle}>Guest Preview Mode</Text>
                        <Text style={styles.guestBannerDesc}>
                            Sign in to link and manage your actual reservations.
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.guestSignInBtn}
                        onPress={() => router.push('/(auth)/customer-login')}
                    >
                        <LogIn size={14} color={Colors.white} style={{ marginRight: 4 }} />
                        <Text style={styles.guestSignInBtnText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            )}

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

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                </View>
            ) : (
                <FlatList
                    data={displayList}
                    renderItem={renderReservationCard}
                    keyExtractor={(item) => String(item.id || item.reference)}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Calendar size={48} color={Colors.gray400} />
                            <Text style={styles.emptyTitle}>
                                No {activeTab} bookings
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Browse properties and book your next stay!
                            </Text>
                            <TouchableOpacity
                                style={styles.exploreBtn}
                                onPress={() => router.push('/(customer)/explore')}
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
        paddingVertical: 9,
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
    confirmedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.successLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    confirmedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.successText,
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
        paddingHorizontal: 14,
        paddingVertical: 6,
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
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: BorderRadius.pill,
    },
    exploreBtnText: {
        color: Colors.white,
        fontWeight: '700',
        fontSize: 13,
    },
});
