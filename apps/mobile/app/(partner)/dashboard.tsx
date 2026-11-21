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
    Bell,
    Home,
    Calendar,
    BarChart3,
    ChevronRight,
    Star,
} from 'lucide-react-native';
import { OwnerApi } from '../../src/api/owner';
import { useAuth } from '../../src/auth/AuthContext';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../src/theme/spacing';
import { ExceptionalState } from '../../src/components/ExceptionalState';
import { PartnerDashboardData, Reservation } from '../../src/api/types';

export default function PartnerDashboardScreen() {
    const router = useRouter();
    const { owner, token, authState } = useAuth();
    const [dashboardData, setDashboardData] =
        useState<PartnerDashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isGuest = !token || authState !== 'owner_authenticated';

    useEffect(() => {
        if (!isGuest) {
            void loadDashboard();
        }
    }, [isGuest]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const res = await OwnerApi.getDashboard();
            if (res.data) {
                setDashboardData(res.data);
            } else {
                setDashboardData(null);
                setErrorMessage('Dashboard data is unavailable.');
            }
        } catch (loadError: unknown) {
            setErrorMessage(
                loadError instanceof Error
                    ? loadError.message
                    : 'Unable to load your dashboard.',
            );
        } finally {
            setLoading(false);
        }
    };

    const partnerName = isGuest ? 'Partner' : owner?.name || '—';

    const confirmedStays =
        dashboardData?.confirmed_reservations_count ??
        dashboardData?.statistics.confirmed_stays ??
        0;
    const monthlyEarnings = (dashboardData?.monthly_earnings_paise ?? 0) / 100;
    const operations = dashboardData
        ? [
              {
                  label: 'Arrivals Today',
                  value: dashboardData.statistics.today_arrivals,
              },
              {
                  label: 'Departures Today',
                  value: dashboardData.statistics.today_departures,
              },
              {
                  label: 'In-House Guests',
                  value: dashboardData.statistics.in_house_guests,
              },
              {
                  label: 'Active Stays',
                  value: dashboardData.statistics.active_reservations,
              },
              {
                  label: 'Reviews to Reply',
                  value: dashboardData.statistics.pending_reviews,
              },
              {
                  label: 'Open Cases',
                  value: dashboardData.statistics.open_complaints,
              },
          ]
        : [];

    if (!token || authState !== 'owner_authenticated') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.plumHeader}>
                    <Text style={styles.greetingText}>Partner Portal</Text>
                </View>
                <ExceptionalState
                    type="auth-required"
                    title="Partner Access Required"
                    description="Please sign in to your verified partner portal to manage properties, view occupancy, and track earnings."
                    actionLabel="Sign In as Partner"
                    onAction={() => router.push('/(auth)/owner-login')}
                />
            </SafeAreaView>
        );
    }

    if (loading && !dashboardData) {
        return (
            <SafeAreaView style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.deepPlum} />
            </SafeAreaView>
        );
    }

    if (errorMessage && !dashboardData) {
        return (
            <SafeAreaView style={styles.container}>
                <ExceptionalState
                    type="no-internet"
                    title="Dashboard Unavailable"
                    description={errorMessage}
                    actionLabel="Try Again"
                    onAction={loadDashboard}
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
                                void loadDashboard().then(() =>
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
                        <View style={{ flex: 1 }}>
                            <Text style={styles.greetingText}>
                                Hello, {partnerName}
                            </Text>
                            <Text style={styles.greetingSubtext}>
                                Here's your business overview
                            </Text>
                        </View>

                        <TouchableOpacity
                            accessibilityLabel="Open notifications"
                            accessibilityRole="button"
                            style={styles.notificationBell}
                            onPress={() =>
                                router.push('/(partner)/notifications')
                            }
                            activeOpacity={0.8}
                        >
                            <Bell size={20} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2 Primary Metric Cards */}
                <View style={styles.metricsRow}>
                    {/* Total Bookings */}
                    <View style={styles.metricCard}>
                        <View style={styles.metricHeaderRow}>
                            <Calendar size={18} color={Colors.deepPlum} />
                        </View>
                        <Text style={styles.metricLabel}>Confirmed Stays</Text>
                        <Text style={styles.metricValue}>{confirmedStays}</Text>
                    </View>

                    {/* Total Revenue */}
                    <View style={styles.metricCard}>
                        <View style={styles.metricHeaderRow}>
                            <Text style={styles.rupeeIcon}>₹</Text>
                        </View>
                        <Text style={styles.metricLabel}>Monthly Earnings</Text>
                        <Text style={styles.metricValue}>
                            ₹{monthlyEarnings.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                <View style={styles.operationsSection}>
                    <Text style={styles.sectionHeading}>
                        Today's Operations
                    </Text>
                    <View style={styles.operationsGrid}>
                        {operations.map((operation) => (
                            <View
                                key={operation.label}
                                style={styles.operationCard}
                            >
                                <Text style={styles.operationValue}>
                                    {operation.value}
                                </Text>
                                <Text style={styles.operationLabel}>
                                    {operation.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {dashboardData ? (
                    <View style={styles.inventoryCard}>
                        <Text style={styles.sectionHeading}>
                            Property Inventory
                        </Text>
                        <View style={styles.inventoryRow}>
                            <Text style={styles.inventoryText}>
                                {
                                    dashboardData.property_summary
                                        .properties_total
                                }{' '}
                                properties
                            </Text>
                            <Text style={styles.inventoryText}>
                                {
                                    dashboardData.property_summary
                                        .verified_properties
                                }{' '}
                                verified
                            </Text>
                            <Text style={styles.inventoryText}>
                                {
                                    dashboardData.property_summary
                                        .room_types_total
                                }{' '}
                                categories
                            </Text>
                            <Text style={styles.inventoryText}>
                                {dashboardData.property_summary.rooms_total}{' '}
                                rooms
                            </Text>
                        </View>
                        <Text style={styles.payoutText}>
                            Unsettled payout: ₹
                            {(
                                dashboardData.statistics
                                    .unsettled_payout_paise / 100
                            ).toLocaleString('en-IN')}
                        </Text>
                    </View>
                ) : null}

                {dashboardData &&
                !dashboardData.onboarding.can_publish_properties ? (
                    <View style={styles.onboardingCard}>
                        <Text style={styles.onboardingTitle}>
                            {dashboardData.onboarding.account_status_label}
                        </Text>
                        <Text style={styles.onboardingText}>
                            Complete partner verification before publishing
                            properties.
                        </Text>
                    </View>
                ) : null}

                {/* Quick Actions (3 Rounded Cards) */}
                <View style={styles.quickActionsSection}>
                    <Text style={styles.sectionHeading}>Quick Actions</Text>
                    <View style={styles.quickActionsRow}>
                        {/* 1. Add Property */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() =>
                                router.push('/(partner)/properties/create')
                            }
                            activeOpacity={0.8}
                        >
                            <View
                                style={[
                                    styles.actionIconCircle,
                                    { backgroundColor: '#FFF3EA' },
                                ]}
                            >
                                <Home size={20} color={Colors.coral} />
                            </View>
                            <Text style={styles.actionCardLabel}>
                                Add Property
                            </Text>
                        </TouchableOpacity>

                        {/* 2. Manage Bookings */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() =>
                                router.push('/(partner)/reservations')
                            }
                            activeOpacity={0.8}
                        >
                            <View
                                style={[
                                    styles.actionIconCircle,
                                    { backgroundColor: '#EFF6FF' },
                                ]}
                            >
                                <Calendar size={20} color="#2563EB" />
                            </View>
                            <Text style={styles.actionCardLabel}>
                                Manage Bookings
                            </Text>
                        </TouchableOpacity>

                        {/* 3. View Reports */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() =>
                                router.push('/(partner)/settlements')
                            }
                            activeOpacity={0.8}
                        >
                            <View
                                style={[
                                    styles.actionIconCircle,
                                    { backgroundColor: '#F5F3FF' },
                                ]}
                            >
                                <BarChart3 size={20} color="#7C3AED" />
                            </View>
                            <Text style={styles.actionCardLabel}>
                                View Reports
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Guest Reviews Banner */}
                <View
                    style={{
                        paddingHorizontal: Spacing.base,
                        marginTop: Spacing.xs,
                    }}
                >
                    <TouchableOpacity
                        style={[
                            styles.actionCard,
                            {
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            },
                        ]}
                        onPress={() => router.push('/(partner)/reviews')}
                        activeOpacity={0.85}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}
                        >
                            <View
                                style={[
                                    styles.actionIconCircle,
                                    {
                                        backgroundColor: '#FEF3C7',
                                        marginBottom: 0,
                                        marginRight: 12,
                                    },
                                ]}
                            >
                                <Star size={20} color="#D97706" />
                            </View>
                            <View>
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: '700',
                                        color: Colors.inkPrimary,
                                    }}
                                >
                                    Guest Reviews & Ratings
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        color: Colors.inkMuted,
                                    }}
                                >
                                    Inspect guest reviews & reply
                                </Text>
                            </View>
                        </View>
                        <ChevronRight size={18} color={Colors.inkSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Recent Bookings Link */}
                <View style={styles.recentBookingsSection}>
                    <View style={styles.recentHeaderRow}>
                        <Text style={styles.sectionHeading}>
                            Recent Bookings
                        </Text>
                        <TouchableOpacity
                            onPress={() =>
                                router.push('/(partner)/reservations')
                            }
                        >
                            <Text style={styles.seeAllText}>See All &gt;</Text>
                        </TouchableOpacity>
                    </View>

                    {dashboardData?.recent_reservations.map(
                        (res: Reservation) => (
                            <TouchableOpacity
                                key={res.id}
                                style={styles.recentBookingCard}
                                onPress={() =>
                                router.push(
                                    `/(partner)/reservations/${res.reference ?? res.booking_reference}`,
                                )
                                }
                                activeOpacity={0.8}
                            >
                                <View style={{ flex: 1 }}>
                                    <View style={styles.recentRefRow}>
                                        <Text style={styles.recentRefText}>
                                            #
                                            {res.reference ??
                                                res.booking_reference}
                                        </Text>
                                        <View style={styles.confirmedPill}>
                                            <Text
                                                style={styles.confirmedPillText}
                                            >
                                                {res.status_label}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.recentGuestName}>
                                        {res.customer_name ?? 'Guest'}
                                        {res.allocated_room_number
                                            ? ` • Room ${res.allocated_room_number}`
                                            : ''}
                                    </Text>
                                    <Text style={styles.recentDates}>
                                        {res.check_in_date} -{' '}
                                        {res.check_out_date}
                                    </Text>
                                </View>
                                <ChevronRight
                                    size={18}
                                    color={Colors.gray400}
                                />
                            </TouchableOpacity>
                        ),
                    )}
                    {dashboardData?.recent_reservations.length === 0 ? (
                        <Text style={styles.emptyText}>
                            No recent bookings.
                        </Text>
                    ) : null}
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
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    plumHeader: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.base,
        paddingBottom: Spacing.xl,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.white,
    },
    greetingSubtext: {
        fontSize: 13,
        color: Colors.warmCream,
        marginTop: 3,
        opacity: 0.9,
    },
    notificationBell: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    notificationBadgeDot: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: Colors.rose,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationBadgeText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: '800',
    },
    guestBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.peachCream,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.md,
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
    metricsRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.base,
        marginTop: -Spacing.sm,
        gap: Spacing.md,
    },
    metricCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.card,
    },
    metricHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    rupeeIcon: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.deepPlum,
    },
    growthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.successLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    growthText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.successText,
        marginLeft: 2,
    },
    metricLabel: {
        fontSize: 12,
        color: Colors.inkSecondary,
        fontWeight: '500',
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.inkPrimary,
        marginTop: 2,
    },
    trendCard: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.base,
        borderRadius: BorderRadius.xl,
        padding: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    trendHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.base,
    },
    trendTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.inkPrimary,
    },
    dropdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceSubtle,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
    },
    dropdownText: {
        fontSize: 12,
        color: Colors.inkSecondary,
        fontWeight: '600',
        marginRight: 4,
    },
    chartContainer: {
        height: 150,
        justifyContent: 'flex-end',
        position: 'relative',
    },
    chartSvgArea: {
        flex: 1,
        justifyContent: 'flex-end',
        position: 'relative',
    },
    guideLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: Colors.borderSubtle,
    },
    pointsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: '100%',
        paddingBottom: 20,
    },
    chartCol: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    pointBar: {
        width: 4,
        backgroundColor: 'rgba(74, 21, 75, 0.15)',
        alignItems: 'center',
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
    },
    pointDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.deepPlum,
        borderWidth: 2,
        borderColor: Colors.white,
        position: 'absolute',
        top: -5,
    },
    monthLabel: {
        fontSize: 11,
        color: Colors.inkMuted,
        marginTop: 8,
        fontWeight: '600',
    },
    operationsSection: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.base,
    },
    operationsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    operationCard: {
        width: '48%',
        backgroundColor: Colors.white,
        borderColor: Colors.neutralSurface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.md,
    },
    operationValue: {
        color: Colors.deepPlum,
        fontSize: 22,
        fontWeight: '800',
    },
    operationLabel: {
        color: Colors.inkSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    inventoryCard: {
        backgroundColor: Colors.white,
        borderColor: Colors.neutralSurface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.lg,
        padding: Spacing.md,
    },
    inventoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    inventoryText: {
        color: Colors.inkSecondary,
        fontSize: 12,
        width: '47%',
    },
    payoutText: {
        color: Colors.deepPlum,
        fontSize: 13,
        fontWeight: '700',
        marginTop: Spacing.md,
    },
    onboardingCard: {
        backgroundColor: Colors.peachCream,
        borderColor: Colors.peachSoft,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        marginHorizontal: Spacing.base,
        marginTop: Spacing.lg,
        padding: Spacing.md,
    },
    onboardingTitle: {
        color: Colors.deepPlum,
        fontSize: 14,
        fontWeight: '800',
    },
    onboardingText: {
        color: Colors.inkSecondary,
        fontSize: 12,
        lineHeight: 18,
        marginTop: 4,
    },
    quickActionsSection: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.base,
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.inkPrimary,
        marginBottom: Spacing.sm,
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.base,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionCardLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.inkPrimary,
        textAlign: 'center',
    },
    recentBookingsSection: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.base,
    },
    emptyText: {
        color: Colors.inkMuted,
        paddingVertical: Spacing.lg,
        textAlign: 'center',
    },
    recentHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    seeAllText: {
        fontSize: 13,
        color: Colors.coral,
        fontWeight: '600',
    },
    recentBookingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.borderSubtle,
        ...Shadows.subtle,
    },
    recentRefRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    recentRefText: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.deepPlum,
        marginRight: 8,
    },
    confirmedPill: {
        backgroundColor: Colors.successLight,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    confirmedPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.successText,
    },
    recentGuestName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.inkPrimary,
    },
    recentDates: {
        fontSize: 12,
        color: Colors.inkMuted,
        marginTop: 2,
    },
});
