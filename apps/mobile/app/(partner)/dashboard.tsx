import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    SafeAreaView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OwnerApi } from '../../src/api/owner';
import { PartnerDashboardData } from '../../src/api/types';
import { Colors } from '../../src/theme/colors';
import { BorderRadius, Spacing } from '../../src/theme/spacing';
import { Typography } from '../../src/theme/typography';
import { Badge } from '../../src/components/Badge';
import { Button } from '../../src/components/Button';
import { ReservationStatusBadge } from '../../src/components/ReservationStatusBadge';
import { ExceptionalState } from '../../src/components/ExceptionalState';
import { AppHeader } from '../../src/components/AppHeader';
import { useAuth } from '../../src/auth/AuthContext';
import {
    Bell,
    Building2,
    Calendar,
    ChevronRight,
    ClipboardList,
    Star,
    User,
    Wallet,
    Zap,
} from 'lucide-react-native';

export default function PartnerDashboardScreen() {
    const router = useRouter();
    const { token, authState, isLoading: authLoading } = useAuth();
    const [data, setData] = useState<PartnerDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isUnauthenticated, setIsUnauthenticated] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!token || authState === 'guest' || authState === 'session_expired' || authState === 'customer_authenticated') {
            setIsUnauthenticated(true);
            setLoading(false);
            return;
        }
        setIsUnauthenticated(false);
        loadDashboard();
    }, [token, authState, authLoading]);

    const loadDashboard = async () => {
        if (!token || authState === 'guest' || authState === 'session_expired' || authState === 'customer_authenticated') {
            setIsUnauthenticated(true);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setIsUnauthenticated(false);
            const res = await OwnerApi.getDashboard();
            if (res.data) {
                setData(res.data);
            }
        } catch (e: any) {
            if (e?.status === 401 || e?.message?.includes('Unauthenticated')) {
                setIsUnauthenticated(true);
            } else {
                console.error('Failed to load partner dashboard', e);
            }
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        if (!token || authState === 'guest' || authState === 'session_expired' || authState === 'customer_authenticated') {
            setIsUnauthenticated(true);
            return;
        }
        setRefreshing(true);
        await loadDashboard();
        setRefreshing(false);
    };

    if (!authLoading && (isUnauthenticated || !token || authState !== 'owner_authenticated')) {
        return (
            <SafeAreaView style={styles.container}>
                <AppHeader
                    title="Host Command Center"
                    subtitle="Manage your properties and reservations"
                    variant="plum"
                />
                <ExceptionalState
                    type="session-expired"
                    title="Sign In as Partner"
                    description="Please sign in to your verified TIJUM partner account to access your properties, bookings, and payout records."
                    primaryActionLabel="Sign In as Partner"
                    onPrimaryAction={() => router.push('/(auth)/owner-login')}
                    secondaryActionLabel="Explore Stays"
                    onSecondaryAction={() => router.push('/(customer)/explore/index')}
                />
            </SafeAreaView>
        );
    }

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.deepPlum} />
                <Text style={styles.loadingText}>
                    Loading host command center...
                </Text>
            </View>
        );
    }

    const pendingCount = data?.pending_reservations_count || 0;
    const confirmedCount = data?.confirmed_reservations_count || 0;
    const propertiesCount = data?.properties_count || 0;
    const monthlyEarningsPaise = data?.monthly_earnings_paise || 0;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.deepPlum]}
                    />
                }
            >
                {/* Curved Plum Header */}
                <View style={styles.plumHeader}>
                    <SafeAreaView>
                        <View style={styles.plumHeaderTopRow}>
                            <View style={styles.partnerBadge}>
                                <Zap size={14} color={Colors.coral} style={{ marginRight: 4 }} />
                                <Text style={styles.partnerBadgeText}>Host Command Center</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.notificationBell}
                                onPress={() => router.push('/(partner)/notifications')}
                                activeOpacity={0.8}
                            >
                                <Bell size={18} color={Colors.white} />
                                {pendingCount > 0 ? <View style={styles.notificationBadgeDot} /> : null}
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.heroGreeting}>Welcome back, Partner</Text>
                        <Text style={styles.heroSub}>
                            Manage your verified properties, room inventory, guest check-ins, and settlements.
                        </Text>
                    </SafeAreaView>
                </View>

                <View style={styles.contentPadding}>
                    {/* Metrics Grid */}
                    <View style={styles.metricsGrid}>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>
                                {confirmedCount}
                            </Text>
                            <Text style={styles.metricLabel}>
                                Confirmed Stays
                            </Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text style={styles.metricValue}>
                                {propertiesCount}
                            </Text>
                            <Text style={styles.metricLabel}>Active Stays</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Text
                                style={[
                                    styles.metricValue,
                                    { color: Colors.forestGreen },
                                ]}
                            >
                                ₹
                                {(monthlyEarningsPaise / 100).toLocaleString(
                                    'en-IN',
                                )}
                            </Text>
                            <Text style={styles.metricLabel}>
                                This Month's Payout
                            </Text>
                        </View>
                    </View>

                    {/* Quick Shortcuts */}
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() =>
                                router.push('/(partner)/reservations/index')
                            }
                        >
                            <ClipboardList
                                size={22}
                                color={Colors.deepPlum}
                                style={{ marginBottom: 4 }}
                            />
                            <Text style={styles.actionText}>All Bookings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() =>
                                router.push('/(partner)/properties/index')
                            }
                        >
                            <Building2
                                size={22}
                                color={Colors.deepPlum}
                                style={{ marginBottom: 4 }}
                            />
                            <Text style={styles.actionText}>My Stays</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() =>
                                router.push('/(partner)/settlements/index')
                            }
                        >
                            <Wallet
                                size={22}
                                color={Colors.deepPlum}
                                style={{ marginBottom: 4 }}
                            />
                            <Text style={styles.actionText}>Payouts</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Guest Reviews Quick Access Card */}
                    <TouchableOpacity
                        style={styles.reviewsHighlightCard}
                        activeOpacity={0.85}
                        onPress={() =>
                            router.push('/(partner)/reviews/index' as any)
                        }
                    >
                        <View style={styles.reviewsHighlightIcon}>
                            <Star size={18} color="#D97706" fill="#D97706" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.reviewsHighlightTitle}>
                                Guest Ratings & Reviews
                            </Text>
                            <Text style={styles.reviewsHighlightSub}>
                                Monitor feedback, subcategory ratings, and
                                publish partner responses.
                            </Text>
                        </View>
                        <ChevronRight size={18} color={Colors.gray400} />
                    </TouchableOpacity>

                    {/* 6-Month Booking & Revenue Velocity */}
                    <View style={styles.trendCard}>
                        <View style={styles.trendHeader}>
                            <View>
                                <Text style={styles.trendTitle}>Booking & Revenue Velocity</Text>
                                <Text style={styles.trendSubtitle}>Past 6 months occupancy performance</Text>
                            </View>
                            <Badge label="Active Stays" variant="success" size="sm" />
                        </View>
                        <View style={styles.trendBarContainer}>
                            {[
                                { month: 'Jun', height: '45%' },
                                { month: 'Jul', height: '60%' },
                                { month: 'Aug', height: '75%' },
                                { month: 'Sep', height: '70%' },
                                { month: 'Oct', height: '85%' },
                                { month: 'Nov', height: '95%', active: true },
                            ].map((bar, idx) => (
                                <View key={idx} style={styles.trendBarColumn}>
                                    <View style={styles.trendBarTrack}>
                                        <View
                                            style={[
                                                styles.trendBarFill,
                                                { height: bar.height as any },
                                                bar.active && styles.trendBarFillActive,
                                            ]}
                                        />
                                    </View>
                                    <Text
                                        style={[
                                            styles.trendMonthLabel,
                                            bar.active && styles.trendMonthLabelActive,
                                        ]}
                                    >
                                        {bar.month}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Recent Reservations */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                            Recent Booking Activity
                        </Text>
                        <TouchableOpacity
                            onPress={() =>
                                router.push('/(partner)/reservations/index')
                            }
                        >
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {data?.recent_reservations &&
                    data.recent_reservations.length > 0 ? (
                        data.recent_reservations.map((res) => (
                            <TouchableOpacity
                                key={res.id}
                                style={styles.reservationCard}
                                onPress={() =>
                                    router.push(
                                        `/(partner)/reservations/${res.reference}`,
                                    )
                                }
                            >
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.refText}>
                                            {res.reference}
                                        </Text>
                                        <Text style={styles.roomText}>
                                            {res.room_type_name}
                                        </Text>
                                    </View>
                                    <ReservationStatusBadge
                                        status={res.status}
                                    />
                                </View>
                                <View style={styles.cardDetails}>
                                    <View style={styles.detailRow}>
                                        <Calendar
                                            size={13}
                                            color={Colors.gray500}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.detailText}>
                                            Check-in: {res.check_in_date} (09:00
                                            AM) • {res.quantity} Room(s)
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <User
                                            size={13}
                                            color={Colors.gray500}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={styles.detailText}>
                                            {res.customer_name} (
                                            {res.guest_gender})
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.cardFooter}>
                                    <Text style={styles.earningText}>
                                        Payout: ₹
                                        {(
                                            res.owner_payable_paise / 100 ||
                                            res.total_amount_paise / 100
                                        ).toLocaleString('en-IN')}
                                    </Text>
                                    <Text style={styles.manageText}>
                                        Review & Manage
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>
                                No recent booking activity.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.warmOffWhite,
    },
    plumHeader: {
        backgroundColor: Colors.deepPlum,
        paddingHorizontal: Spacing.base,
        paddingTop: Platform.OS === 'android' ? 36 : 10,
        paddingBottom: Spacing.lg,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    plumHeaderTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    partnerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: Spacing.md,
        paddingVertical: 5,
        borderRadius: BorderRadius.pill,
    },
    partnerBadgeText: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.white,
    },
    notificationBell: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.pill,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    notificationBadgeDot: {
        position: 'absolute',
        top: 7,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.coral,
        borderWidth: 1.5,
        borderColor: Colors.deepPlum,
    },
    heroGreeting: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.white,
        marginTop: Spacing.xs,
    },
    heroSub: {
        fontSize: Typography.fontSize.xs,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 4,
        lineHeight: 18,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    contentPadding: {
        padding: Spacing.lg,
    },
    trendCard: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: Spacing.md,
        marginVertical: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    trendHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    trendTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    trendSubtitle: {
        fontSize: Typography.fontSize.xs,
        color: Colors.gray500,
        marginTop: 1,
    },
    trendBarContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 100,
        paddingTop: Spacing.xs,
        paddingHorizontal: Spacing.xs,
    },
    trendBarColumn: {
        alignItems: 'center',
        flex: 1,
    },
    trendBarTrack: {
        width: 18,
        height: 75,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    trendBarFill: {
        width: '100%',
        backgroundColor: '#CBD5E1',
        borderRadius: 4,
    },
    trendBarFillActive: {
        backgroundColor: Colors.coral,
    },
    trendMonthLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.gray400,
        marginTop: 6,
    },
    trendMonthLabelActive: {
        color: Colors.coral,
        fontWeight: '700',
    },
    welcomeText: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
    },
    subtitleText: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginTop: 2,
        marginBottom: Spacing.md,
    },
    urgentBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: Spacing.md,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FECACA',
        marginBottom: Spacing.lg,
    },
    urgentIcon: {
        fontSize: 24,
        marginRight: Spacing.sm,
    },
    urgentTitle: {
        ...Typography.labelMedium,
        color: Colors.coral,
        fontWeight: '700',
    },
    urgentSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        marginTop: 2,
    },
    urgentArrow: {
        ...Typography.labelLarge,
        color: Colors.coral,
        marginLeft: Spacing.xs,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    metricCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: Colors.white,
        padding: Spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    metricValue: {
        ...Typography.titleLarge,
        color: Colors.deepPlum,
    },
    metricLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
    },
    viewAllText: {
        ...Typography.bodySmall,
        color: Colors.coral,
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    actionBtn: {
        flex: 1,
        backgroundColor: Colors.white,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    actionEmoji: {
        fontSize: 22,
        marginBottom: 4,
    },
    actionText: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
    },
    reservationCard: {
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
        ...Typography.bodySmall,
        color: Colors.gray400,
        fontWeight: '700',
    },
    roomText: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    cardDetails: {
        marginVertical: Spacing.xs,
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        ...Typography.bodySmall,
        color: Colors.gray600,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
        paddingTop: Spacing.xs,
        marginTop: Spacing.xs,
    },
    earningText: {
        ...Typography.labelSmall,
        color: Colors.forestGreen,
    },
    manageText: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        fontWeight: '600',
    },
    emptyBox: {
        padding: Spacing.xl,
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    emptyText: {
        ...Typography.bodyMedium,
        color: Colors.gray500,
    },
    reviewsHighlightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    reviewsHighlightIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    reviewsHighlightTitle: {
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    reviewsHighlightSub: {
        fontSize: 11,
        color: Colors.gray600,
        marginTop: 2,
        lineHeight: 16,
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
});
