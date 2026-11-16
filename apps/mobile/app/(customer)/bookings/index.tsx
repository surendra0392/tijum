import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, BedDouble, Calendar, Users, Luggage } from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { Reservation } from '../../../src/api/types';
import { ReservationStatusBadge } from '../../../src/components/ReservationStatusBadge';
import { Button } from '../../../src/components/Button';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';

const FILTER_TABS = [
    { label: 'All', value: undefined },
    { label: 'Awaiting Action', value: 'awaiting_payment' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Completed', value: 'checked_out' },
];

export default function CustomerBookingsScreen() {
    const router = useRouter();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string | undefined>(
        undefined,
    );

    useEffect(() => {
        loadReservations();
    }, [activeFilter]);

    const loadReservations = async () => {
        try {
            setLoading(true);
            const res = await CustomerApi.getReservations(activeFilter);
            if (res.data) {
                setReservations(res.data);
            }
        } catch (e) {
            console.error('Failed to load reservations', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadReservations();
        setRefreshing(false);
    };

    const renderReservationCard = ({ item }: { item: Reservation }) => {
        const isAwaitingPayment =
            item.is_awaiting_payment ||
            item.status === 'awaiting_payment' ||
            item.status === 'payment_pending';

        return (
            <TouchableOpacity
                style={[styles.card, isAwaitingPayment && styles.cardUrgent]}
                activeOpacity={0.8}
                onPress={() =>
                    router.push(`/(customer)/bookings/${item.reference}`)
                }
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.referenceText}>
                            {item.reference}
                        </Text>
                        <Text style={styles.propertyName}>
                            {item.property_name}
                        </Text>
                    </View>
                    <ReservationStatusBadge status={item.status} />
                </View>

                {isAwaitingPayment ? (
                    <View style={styles.urgentBanner}>
                        <Zap
                            size={14}
                            color={Colors.amber}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={styles.urgentBannerText}>
                            Inventory held! Complete payment within 15 mins to
                            lock your stay.
                        </Text>
                    </View>
                ) : null}

                <View style={styles.cardBody}>
                    <View style={styles.detailRow}>
                        <View style={styles.labelWithIcon}>
                            <BedDouble
                                size={14}
                                color={Colors.gray500}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.detailLabel}>Category:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {item.room_type_name}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <View style={styles.labelWithIcon}>
                            <Calendar
                                size={14}
                                color={Colors.gray500}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.detailLabel}>Check-in:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {item.check_in_date} (09:00 AM)
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <View style={styles.labelWithIcon}>
                            <Calendar
                                size={14}
                                color={Colors.gray500}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.detailLabel}>Checkout:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {item.check_out_date} (08:00 AM)
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <View style={styles.labelWithIcon}>
                            <Users
                                size={14}
                                color={Colors.gray500}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.detailLabel}>Guests:</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {item.quantity}{' '}
                            {item.quantity === 1 ? 'room' : 'rooms'} •{' '}
                            {item.guest_gender}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.priceLabel}>Total Amount</Text>
                        <Text style={styles.priceValue}>
                            ₹
                            {(item.total_amount_paise / 100).toLocaleString(
                                'en-IN',
                            )}
                        </Text>
                    </View>
                    <Button
                        title={isAwaitingPayment ? 'Pay Now' : 'View Details'}
                        variant={isAwaitingPayment ? 'primary' : 'outline'}
                        size="sm"
                        onPress={() =>
                            router.push(
                                `/(customer)/bookings/${item.reference}`,
                            )
                        }
                    />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Filter Tabs */}
            <View style={styles.tabsContainer}>
                {FILTER_TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.label}
                        style={[
                            styles.tab,
                            activeFilter === tab.value && styles.activeTab,
                        ]}
                        onPress={() => setActiveFilter(tab.value)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeFilter === tab.value &&
                                    styles.activeTabText,
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.coral} />
                    <Text style={styles.loadingText}>
                        Fetching reservations...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={reservations}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderReservationCard}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.coral]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Luggage
                                size={48}
                                color={Colors.gray300}
                                style={{ marginBottom: 12 }}
                            />
                            <Text style={styles.emptyTitle}>
                                No reservations found
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeFilter
                                    ? 'No reservations match this filter.'
                                    : 'You have not booked any stays yet. Explore verified food-inclusive accommodations today!'}
                            </Text>
                            <Button
                                title="Explore Stays"
                                onPress={() =>
                                    router.push('/(customer)/explore/index')
                                }
                                style={{ marginTop: Spacing.lg }}
                            />
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
        backgroundColor: Colors.warmOffWhite,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    tab: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
        marginRight: Spacing.xs,
    },
    activeTab: {
        backgroundColor: Colors.coral,
    },
    tabText: {
        ...Typography.labelSmall,
        color: Colors.gray600,
    },
    activeTabText: {
        color: Colors.white,
        fontWeight: '700',
    },
    listContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    cardUrgent: {
        borderColor: Colors.coral,
        borderWidth: 1.5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    referenceText: {
        ...Typography.bodySmall,
        color: Colors.gray400,
        fontWeight: '600',
    },
    propertyName: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
        marginTop: 2,
    },
    urgentBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F2',
        padding: Spacing.xs,
        borderRadius: 6,
        marginBottom: Spacing.sm,
    },
    urgentBannerText: {
        ...Typography.bodySmall,
        color: Colors.coral,
        fontWeight: '600',
    },
    cardBody: {
        backgroundColor: Colors.warmOffWhite,
        padding: Spacing.sm,
        borderRadius: 8,
        marginBottom: Spacing.md,
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    detailValue: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    priceLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    priceValue: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
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
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
    },
    emptySubtitle: {
        ...Typography.bodyMedium,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: Spacing.xs,
        lineHeight: 20,
    },
});
