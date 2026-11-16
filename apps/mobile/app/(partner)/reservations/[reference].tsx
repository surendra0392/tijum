import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { Reservation } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { ReservationStatusBadge } from '../../../src/components/ReservationStatusBadge';
import { StayTimingBadge } from '../../../src/components/StayTimingBadge';
import { MealBadge } from '../../../src/components/MealBadge';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import {
    ClipboardList,
    UtensilsCrossed,
    Receipt,
    Zap,
} from 'lucide-react-native';

export default function PartnerReservationDetailScreen() {
    const { reference } = useLocalSearchParams<{ reference: string }>();
    const router = useRouter();

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (reference) {
            loadReservation();
        }
    }, [reference]);

    const loadReservation = async () => {
        try {
            setLoading(true);
            const res = await OwnerApi.getReservation(reference);
            if (res.data) {
                setReservation(res.data);
            }
        } catch (e: any) {
            Alert.alert(
                'Error',
                e.message || 'Failed to load booking details.',
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.deepPlum} />
                <Text style={styles.loadingText}>Loading booking info...</Text>
            </View>
        );
    }

    if (!reservation) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>
                    Reservation record not found.
                </Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    style={{ marginTop: Spacing.md }}
                />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentPadding}>
                    {/* Header */}
                    <View style={styles.rowBetween}>
                        <Text style={styles.refText}>
                            {reservation.reference}
                        </Text>
                        <ReservationStatusBadge status={reservation.status} />
                    </View>

                    <Text style={styles.guestTitle}>
                        Guest: {reservation.customer_name || 'Customer'}
                    </Text>
                    <Text style={styles.propertyTitle}>
                        {reservation.property_name}
                    </Text>

                    {/* Stay Timing Policy Notice */}
                    <StayTimingBadge
                        checkIn={reservation.check_in_time || '09:00:00'}
                        checkOut={reservation.check_out_time || '08:00:00'}
                    />

                    {/* Guest Stay Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <ClipboardList
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Stay Specifications
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Room Category:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.room_type_name}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Rooms Requested:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.quantity} Room(s)
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Guest Profile:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.guest_gender} (
                                    {reservation.guest_composition ||
                                        'standard'}
                                    )
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Check-in Date:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.check_in_date} (09:00 AM)
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Checkout Date:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.check_out_date} (08:00 AM)
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Duration:</Text>
                                <Text style={styles.infoValue}>
                                    {reservation.duration_quantity}{' '}
                                    {reservation.duration_type}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Food Inclusions Included */}
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <UtensilsCrossed
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Food Obligations
                            </Text>
                        </View>
                        <View style={styles.mealBadgesContainer}>
                            <MealBadge
                                meal="breakfast"
                                included={
                                    reservation.food_inclusions?.breakfast ??
                                    true
                                }
                                timing={
                                    reservation.food_inclusions
                                        ?.breakfast_timing
                                }
                            />
                            <MealBadge
                                meal="lunch"
                                included={
                                    reservation.food_inclusions?.lunch ?? false
                                }
                                timing={
                                    reservation.food_inclusions?.lunch_timing
                                }
                            />
                            <MealBadge
                                meal="dinner"
                                included={
                                    reservation.food_inclusions?.dinner ?? true
                                }
                                timing={
                                    reservation.food_inclusions?.dinner_timing
                                }
                            />
                        </View>
                    </View>

                    {/* Financial Breakdown */}
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <Receipt
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Partner Financial Summary
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Gross Booking Value:
                                </Text>
                                <Text style={styles.infoValue}>
                                    ₹
                                    {(
                                        reservation.total_amount_paise / 100
                                    ).toLocaleString('en-IN')}
                                </Text>
                            </View>
                            {reservation.commission_amount_paise ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Marketplace Commission:
                                    </Text>
                                    <Text
                                        style={[
                                            styles.infoValue,
                                            { color: Colors.coral },
                                        ]}
                                    >
                                        - ₹
                                        {(
                                            reservation.commission_amount_paise /
                                            100
                                        ).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ) : null}
                            <View style={[styles.infoRow, styles.totalRow]}>
                                <Text style={styles.totalLabel}>
                                    Estimated Host Payout:
                                </Text>
                                <Text style={styles.totalValue}>
                                    ₹
                                    {(
                                        reservation.owner_payable_paise / 100 ||
                                        reservation.total_amount_paise / 100
                                    ).toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Operational Status Info */}
                    {reservation.status === 'confirmed' ? (
                        <View style={styles.actionNoteBox}>
                            <Zap
                                size={14}
                                color="#059669"
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.actionNote}>
                                Confirmed Booking: Payment verified online.
                                Please prepare room category "
                                {reservation.room_type_name}" for guest arrival.
                            </Text>
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    contentPadding: {
        padding: Spacing.lg,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    refText: {
        ...Typography.bodySmall,
        color: Colors.gray400,
        fontWeight: '700',
    },
    guestTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        marginTop: Spacing.xs,
    },
    propertyTitle: {
        ...Typography.bodyMedium,
        color: Colors.gray600,
        marginTop: 2,
        marginBottom: Spacing.xs,
    },
    section: {
        marginTop: Spacing.lg,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
    },
    infoCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    infoValue: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        fontWeight: '600',
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        paddingTop: 8,
        marginTop: 4,
    },
    totalLabel: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    totalValue: {
        ...Typography.titleSmall,
        color: Colors.forestGreen,
        fontWeight: '800',
    },
    mealBadgesContainer: {
        gap: Spacing.sm,
    },
    actionSection: {
        marginTop: Spacing.xl,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
    },
    actionNoteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFBEB',
        padding: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FEF3C7',
        marginBottom: Spacing.md,
    },
    actionNote: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        flex: 1,
        lineHeight: 18,
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
    errorText: {
        ...Typography.bodyMedium,
        color: Colors.coral,
    },
});
