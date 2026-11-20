import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
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
    TrendingUp,
    ChevronDown,
    Building2,
    LogIn,
    ChevronRight,
    Star,
} from 'lucide-react-native';
import { OwnerApi } from '../../src/api/owner';
import { useAuth } from '../../src/auth/AuthContext';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../src/theme/spacing';
import { ExceptionalState } from '../../src/components/ExceptionalState';
import { SHOWCASE_PARTNER, SHOWCASE_PARTNER_DASHBOARD } from '../../src/data/showcaseData.ts';

const { width } = Dimensions.get('window');

export default function PartnerDashboardScreen() {
    const router = useRouter();
    const { owner, token, authState } = useAuth();
    const [dashboardData, setDashboardData] = useState<any>(SHOWCASE_PARTNER_DASHBOARD);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const isGuest = !token || authState !== 'owner_authenticated';

    useEffect(() => {
        if (!isGuest) {
            loadDashboard();
        }
    }, [isGuest]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const res = await OwnerApi.getDashboard();
            if (res.data) {
                setDashboardData(res.data);
            }
        } catch {
            setDashboardData(SHOWCASE_PARTNER_DASHBOARD);
        } finally {
            setLoading(false);
        }
    };

    const partnerName = isGuest
        ? SHOWCASE_PARTNER.name
        : owner?.name || SHOWCASE_PARTNER.name;

    const totalBookings =
        dashboardData.overview?.total_bookings ??
        dashboardData.total_reservations ??
        245;

    const rawRevenue =
        dashboardData.overview?.total_revenue ??
        dashboardData.monthly_earnings_paise ??
        248500;
    const totalRevenue =
        rawRevenue > 1000000 ? Math.round(rawRevenue / 100) : rawRevenue;

    const trendPoints =
        dashboardData.bookings_trend || SHOWCASE_PARTNER_DASHBOARD.bookings_trend;

    if (!token || authState !== 'owner_authenticated') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.plumHeader}>
                    <Text style={styles.greetingText}>Partner Portal</Text>
                </View>
                <ExceptionalState
                    type="session-expired"
                    title="Partner Access Required"
                    description="Please sign in to your verified partner portal to manage properties, view occupancy, and track earnings."
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
                                loadDashboard().then(() => setRefreshing(false));
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
                                Hello, {partnerName} 👋
                            </Text>
                            <Text style={styles.greetingSubtext}>
                                Here's your business overview
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.notificationBell}
                            onPress={() => router.push('/(partner)/notifications')}
                            activeOpacity={0.8}
                        >
                            <Bell size={20} color={Colors.white} />
                            <View style={styles.notificationBadgeDot}>
                                <Text style={styles.notificationBadgeText}>2</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Guest / Demo Notice Banner */}
                {isGuest && (
                    <View style={styles.guestBanner}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.guestBannerTitle}>
                                Host Portal Preview
                            </Text>
                            <Text style={styles.guestBannerDesc}>
                                Showing verified partner performance metrics. Sign in
                                to manage your real properties.
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.guestSignInBtn}
                            onPress={() => router.push('/(auth)/owner-login')}
                        >
                            <LogIn size={13} color={Colors.white} style={{ marginRight: 4 }} />
                            <Text style={styles.guestSignInBtnText}>Host Sign In</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* 2 Primary Metric Cards */}
                <View style={styles.metricsRow}>
                    {/* Total Bookings */}
                    <View style={styles.metricCard}>
                        <View style={styles.metricHeaderRow}>
                            <Calendar size={18} color={Colors.deepPlum} />
                            <View style={styles.growthBadge}>
                                <TrendingUp size={11} color={Colors.success} />
                                <Text style={styles.growthText}>12%</Text>
                            </View>
                        </View>
                        <Text style={styles.metricLabel}>Total Bookings</Text>
                        <Text style={styles.metricValue}>{totalBookings}</Text>
                    </View>

                    {/* Total Revenue */}
                    <View style={styles.metricCard}>
                        <View style={styles.metricHeaderRow}>
                            <Text style={styles.rupeeIcon}>₹</Text>
                            <View style={styles.growthBadge}>
                                <TrendingUp size={11} color={Colors.success} />
                                <Text style={styles.growthText}>18%</Text>
                            </View>
                        </View>
                        <Text style={styles.metricLabel}>Total Revenue</Text>
                        <Text style={styles.metricValue}>
                            ₹{totalRevenue.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                {/* Bookings Trend Section */}
                <View style={styles.trendCard}>
                    <View style={styles.trendHeaderRow}>
                        <Text style={styles.trendTitle}>Bookings Trend</Text>
                        <View style={styles.dropdownBtn}>
                            <Text style={styles.dropdownText}>Last 6 Months</Text>
                            <ChevronDown size={14} color={Colors.inkSecondary} />
                        </View>
                    </View>

                    {/* Visual Line Chart Graphic */}
                    <View style={styles.chartContainer}>
                        <View style={styles.chartSvgArea}>
                            {/* Horizontal guide lines */}
                            <View style={styles.guideLine} />
                            <View style={styles.guideLine} />
                            <View style={styles.guideLine} />

                            {/* Velocity points & line mockup */}
                            <View style={styles.pointsRow}>
                                {trendPoints.map((pt: any, idx: number) => {
                                    const heightRatio = (pt.count || (25 + idx * 12)) / 90;
                                    return (
                                        <View key={pt.month} style={styles.chartCol}>
                                            <View
                                                style={[
                                                    styles.pointBar,
                                                    { height: `${Math.round(heightRatio * 100)}%` },
                                                ]}
                                            >
                                                <View style={styles.pointDot} />
                                            </View>
                                            <Text style={styles.monthLabel}>
                                                {pt.month}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Actions (3 Rounded Cards) */}
                <View style={styles.quickActionsSection}>
                    <Text style={styles.sectionHeading}>Quick Actions</Text>
                    <View style={styles.quickActionsRow}>
                        {/* 1. Add Property */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/(partner)/properties/create')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIconCircle, { backgroundColor: '#FFF3EA' }]}>
                                <Home size={20} color={Colors.coral} />
                            </View>
                            <Text style={styles.actionCardLabel}>Add Property</Text>
                        </TouchableOpacity>

                        {/* 2. Manage Bookings */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/(partner)/reservations')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIconCircle, { backgroundColor: '#EFF6FF' }]}>
                                <Calendar size={20} color="#2563EB" />
                            </View>
                            <Text style={styles.actionCardLabel}>
                                Manage Bookings
                            </Text>
                        </TouchableOpacity>

                        {/* 3. View Reports */}
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/(partner)/settlements')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIconCircle, { backgroundColor: '#F5F3FF' }]}>
                                <BarChart3 size={20} color="#7C3AED" />
                            </View>
                            <Text style={styles.actionCardLabel}>View Reports</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Guest Reviews Banner */}
                <View style={{ paddingHorizontal: Spacing.base, marginTop: Spacing.xs }}>
                    <TouchableOpacity
                        style={[styles.actionCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                        onPress={() => router.push('/(partner)/reviews/index')}
                        activeOpacity={0.85}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[styles.actionIconCircle, { backgroundColor: '#FEF3C7', marginBottom: 0, marginRight: 12 }]}>
                                <Star size={20} color="#D97706" />
                            </View>
                            <View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.inkPrimary }}>Guest Reviews & Ratings</Text>
                                <Text style={{ fontSize: 11, color: Colors.inkMuted }}>Inspect guest reviews & reply</Text>
                            </View>
                        </View>
                        <ChevronRight size={18} color={Colors.inkSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Recent Bookings Link */}
                <View style={styles.recentBookingsSection}>
                    <View style={styles.recentHeaderRow}>
                        <Text style={styles.sectionHeading}>Recent Bookings</Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(partner)/reservations')}
                        >
                            <Text style={styles.seeAllText}>See All &gt;</Text>
                        </TouchableOpacity>
                    </View>

                    {SHOWCASE_PARTNER_DASHBOARD.recent_reservations.map((res: any) => (
                        <TouchableOpacity
                            key={res.id}
                            style={styles.recentBookingCard}
                            onPress={() => router.push('/(partner)/reservations')}
                            activeOpacity={0.8}
                        >
                            <View style={{ flex: 1 }}>
                                <View style={styles.recentRefRow}>
                                    <Text style={styles.recentRefText}>
                                        #{res.reference}
                                    </Text>
                                    <View style={styles.confirmedPill}>
                                        <Text style={styles.confirmedPillText}>
                                            {res.status === 'checked_in'
                                                ? 'Checked In'
                                                : 'Confirmed'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.recentGuestName}>
                                    {res.guest_name} • {res.room_number}
                                </Text>
                                <Text style={styles.recentDates}>
                                    {res.check_in_date} - {res.check_out_date}
                                </Text>
                            </View>
                            <ChevronRight size={18} color={Colors.gray400} />
                        </TouchableOpacity>
                    ))}
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
