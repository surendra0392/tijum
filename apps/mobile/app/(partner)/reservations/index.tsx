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
    AlertCircle,
    Building2,
    CheckCircle2,
} from 'lucide-react-native';
import { OwnerApi } from '../../../src/api/owner';
import { Reservation } from '../../../src/api/types';
import { ExceptionalState } from '../../../src/components/ExceptionalState';
import { useAuth } from '../../../src/auth/AuthContext';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Shadows, Spacing } from '../../../src/theme/spacing';

const FILTER_TABS = [
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Past', value: 'past' },
    { label: 'Cancelled', value: 'cancelled' },
];

export default function PartnerReservationsScreen() {
    const router = useRouter();
    const { token, authState } = useAuth();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const isGuest = !token || authState !== 'owner_authenticated';

    useEffect(() => {
        if (!isGuest) {
            void loadReservations();
        }
    }, [activeTab, isGuest]);

    const loadReservations = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const res = await OwnerApi.getReservations(
                activeTab as 'upcoming' | 'past' | 'cancelled',
            );
            if (res.data && res.data.length > 0) {
                setReservations(res.data);
            } else {
                setReservations([]);
            }
        } catch {
            setErrorMessage(
                'Unable to load your reservations. Please try again.',
            );
            setReservations([]);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        if (isGuest) return;
        setRefreshing(true);
        setErrorMessage(null);
        await loadReservations();
        setRefreshing(false);
    };

    const renderBookingCard = ({ item }: { item: Reservation }) => {
        const reference = item.reference ?? item.booking_reference;
        const rawAmount =
            (item.owner_payable_paise ?? item.total_amount_paise) / 100;
        const photoUrl = item.property.cover_image_url;
        const nights = item.total_stay_days ?? item.duration_quantity;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.88}
                onPress={() =>
                    router.push(`/(partner)/reservations/${reference}` as any)
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
                            <View style={styles.confirmedBadge}>
                                <CheckCircle2
                                    size={11}
                                    color={Colors.successText}
                                    style={{ marginRight: 3 }}
                                />
                                <Text style={styles.confirmedBadgeText}>
                                    {item.status_label}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.propertyName} numberOfLines={1}>
                            {item.property_name ?? item.property.name}
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

                        <Text style={styles.priceText}>
                            ₹{rawAmount.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardActionRow}>
                    <TouchableOpacity
                        style={styles.actionBtnOutline}
                        onPress={() =>
                            router.push(
                                `/(partner)/reservations/${reference}` as any,
                            )
                        }
                    >
                        <Text style={styles.actionBtnOutlineText}>
                            View Details
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtnOutline, styles.manageBtn]}
                        onPress={() =>
                            router.push(
                                `/(partner)/reservations/${reference}` as any,
                            )
                        }
                    >
                        <Text
                            style={[
                                styles.actionBtnOutlineText,
                                styles.manageBtnText,
                            ]}
                        >
                            Manage Booking
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    if (!token || authState !== 'owner_authenticated') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.plumHeader}>
                    <Text style={styles.headerTitle}>Bookings</Text>
                    <Text style={styles.headerSubtitle}>
                        Manage guest reservations and check-ins
                    </Text>
                </View>
                <ExceptionalState
                    type="auth-required"
                    title="Partner Access Required"
                    description="Please sign in to your partner account to view and manage guest bookings."
                    actionLabel="Sign In as Partner"
                    onAction={() => router.push('/(auth)/owner-login')}
                />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Curved Deep Plum Header */}
            <View style={styles.plumHeader}>
                <Text style={styles.headerTitle}>Bookings</Text>
                <Text style={styles.headerSubtitle}>
                    Manage guest reservations and check-ins
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
            ) : errorMessage ? (
                <SafeAreaView style={styles.container}>
                    <View style={styles.errorContainer}>
                        <AlertCircle size={48} color={Colors.coral} />
                        <Text style={styles.errorTitle}>
                            Unable to Load Bookings
                        </Text>
                        <Text style={styles.errorSubtitle}>{errorMessage}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={onRefresh}
                        >
                            <Text style={styles.retryBtnText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            ) : (
                <FlatList
                    data={reservations}
                    renderItem={renderBookingCard}
                    keyExtractor={(item: any) =>
                        String(item.id || item.reference)
                    }
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
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
    priceText: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.deepPlum,
        marginTop: 2,
    },
    cardActionRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.borderSubtle,
    },
    actionBtnOutline: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: BorderRadius.pill,
        borderWidth: 1,
        borderColor: Colors.deepPlum,
        alignItems: 'center',
    },
    actionBtnOutlineText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    manageBtn: {
        borderColor: Colors.coral,
    },
    manageBtnText: {
        color: Colors.coralDark,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
});
