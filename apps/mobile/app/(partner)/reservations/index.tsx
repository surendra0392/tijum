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
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { Reservation } from '../../../src/api/types';
import { ReservationStatusBadge } from '../../../src/components/ReservationStatusBadge';
import { Button } from '../../../src/components/Button';
import { AppHeader } from '../../../src/components/AppHeader';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { User, ClipboardList } from 'lucide-react-native';

const FILTER_TABS = [
    { label: 'All', value: undefined },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Awaiting Payment', value: 'awaiting_payment' },
    { label: 'Checked In', value: 'checked_in' },
    { label: 'History', value: 'checked_out' },
];

export default function PartnerReservationsScreen() {
    const router = useRouter();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string | undefined>(
        undefined,
    );
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        loadReservations();
    }, [activeFilter]);

    const loadReservations = async () => {
        try {
            setLoading(true);
            const res = await OwnerApi.getReservations(activeFilter);
            if (res.data) {
                setReservations(res.data);
            }
        } catch (e) {
            console.error('Failed to load partner reservations', e);
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
        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() =>
                    router.push(`/(partner)/reservations/${item.reference}`)
                }
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.referenceText}>
                            {item.reference}
                        </Text>
                        <View style={styles.guestRow}>
                            <User
                                size={13}
                                color={Colors.deepPlum}
                                style={{ marginRight: 4 }}
                            />
                            <Text style={styles.customerName}>
                                {item.customer_name || 'Guest'} (
                                {item.guest_gender})
                            </Text>
                        </View>
                    </View>
                    <ReservationStatusBadge status={item.status} />
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Stay / Room:</Text>
                        <Text style={styles.detailValue}>
                            {item.property_name} • {item.room_type_name}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Check-in:</Text>
                        <Text style={styles.detailValue}>
                            {item.check_in_date} (09:00 AM)
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Checkout:</Text>
                        <Text style={styles.detailValue}>
                            {item.check_out_date} (08:00 AM)
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                            Duration & Units:
                        </Text>
                        <Text style={styles.detailValue}>
                            {item.duration_quantity} {item.duration_type} •{' '}
                            {item.quantity} Room(s)
                        </Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.payoutLabel}>Partner Payable</Text>
                        <Text style={styles.payoutValue}>
                            ₹
                            {(
                                item.owner_payable_paise / 100 ||
                                item.total_amount_paise / 100
                            ).toLocaleString('en-IN')}
                        </Text>
                    </View>

                    <Button
                        title="Inspect Details"
                        size="sm"
                        variant="outline"
                        onPress={() =>
                            router.push(
                                `/(partner)/reservations/${item.reference}`,
                            )
                        }
                    />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader
                title="Guest Bookings"
                subtitle="Manage arrivals, allocations & turnovers"
                variant="plum"
            />
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
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>Fetching bookings...</Text>
                </View>
            ) : (
                <FlatList
                    data={reservations}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={renderReservationCard}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.deepPlum]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <ClipboardList
                                size={48}
                                color={Colors.gray300}
                                style={{ marginBottom: Spacing.md }}
                            />
                            <Text style={styles.emptyTitle}>
                                No bookings found
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeFilter
                                    ? 'No reservations currently match this filter.'
                                    : 'You do not have any bookings yet. Ensure your properties are published and room categories are updated.'}
                            </Text>
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
        backgroundColor: Colors.deepPlum,
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
    },
    cardUrgent: {
        borderColor: Colors.coral,
        borderWidth: 1.5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.xs,
    },
    referenceText: {
        ...Typography.bodySmall,
        color: Colors.gray400,
        fontWeight: '700',
    },
    guestRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    customerName: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
    },
    cardBody: {
        backgroundColor: Colors.warmOffWhite,
        padding: Spacing.sm,
        borderRadius: 8,
        marginVertical: Spacing.xs,
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
        marginTop: Spacing.xs,
    },
    payoutLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    payoutValue: {
        ...Typography.labelMedium,
        color: Colors.forestGreen,
        fontWeight: '700',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: Spacing.xs,
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
    },
});
