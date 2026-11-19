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
    UserCheck,
    CheckCircle2,
} from 'lucide-react-native';

export default function PartnerReservationDetailScreen() {
    const { reference } = useLocalSearchParams<{ reference: string }>();
    const router = useRouter();

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [checkInNotes, setCheckInNotes] = useState('');
    const [checkOutNotes, setCheckOutNotes] = useState('');

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

    const handleCheckIn = async () => {
        if (!reservation) return;
        try {
            setActionLoading(true);
            const res = await OwnerApi.checkInReservation(
                reservation.reference || reservation.booking_reference,
                checkInNotes.trim() || undefined,
            );
            if (res.data) {
                setReservation(res.data);
            } else {
                await loadReservation();
            }
            Alert.alert(
                'Guest Checked In',
                `Check-in recorded for guest ${reservation.customer_name || 'Guest'}. Room is marked occupied.`,
            );
            setCheckInNotes('');
        } catch (e: any) {
            Alert.alert(
                'Check-In Failed',
                e.message || 'Could not record check-in at this time.',
            );
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!reservation) return;
        try {
            setActionLoading(true);
            const res = await OwnerApi.checkOutReservation(
                reservation.reference || reservation.booking_reference,
                checkOutNotes.trim() || undefined,
            );
            if (res.data) {
                setReservation(res.data);
            } else {
                await loadReservation();
            }
            Alert.alert(
                'Guest Checked Out',
                `Checkout recorded for reservation ${reservation.reference || reservation.booking_reference}. Room is now marked vacant for turnover.`,
            );
            setCheckOutNotes('');
        } catch (e: any) {
            Alert.alert(
                'Checkout Failed',
                e.message || 'Could not record checkout at this time.',
            );
        } finally {
            setActionLoading(false);
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
                            {reservation.checked_in_at ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Checked-In Time:
                                    </Text>
                                    <Text
                                        style={[
                                            styles.infoValue,
                                            {
                                                color: '#059669',
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        {reservation.checked_in_at}
                                    </Text>
                                </View>
                            ) : null}
                            {reservation.checked_out_at ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Checked-Out Time:
                                    </Text>
                                    <Text
                                        style={[
                                            styles.infoValue,
                                            {
                                                color: Colors.deepPlum,
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        {reservation.checked_out_at}
                                    </Text>
                                </View>
                            ) : null}
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

                    {/* Front-Desk Operations Panel */}
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <UserCheck
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Front-Desk Actions
                            </Text>
                        </View>

                        {reservation.status === 'confirmed' ? (
                            <View style={styles.frontDeskCard}>
                                <Text style={styles.frontDeskHeading}>
                                    Guest Arrival & Key Handover
                                </Text>
                                <Text style={styles.frontDeskDesc}>
                                    When the guest arrives, verify identity and record check-in to mark the room occupied.
                                </Text>
                                <Input
                                    label="Check-In Notes (Optional)"
                                    value={checkInNotes}
                                    onChangeText={setCheckInNotes}
                                    placeholder="e.g. Room 204 allocated, keys handed over"
                                />
                                <Button
                                    title="Check In Guest"
                                    loading={actionLoading}
                                    onPress={handleCheckIn}
                                    style={styles.checkInBtn}
                                />
                            </View>
                        ) : reservation.status === 'checked_in' ? (
                            <View style={styles.frontDeskCard}>
                                <Text style={styles.frontDeskHeading}>
                                    Guest Departure & Room Turnover
                                </Text>
                                <Text style={styles.frontDeskDesc}>
                                    When the guest vacates the room, inspect premises, retrieve keys, and finalize checkout.
                                </Text>
                                <Input
                                    label="Checkout Notes (Optional)"
                                    value={checkOutNotes}
                                    onChangeText={setCheckOutNotes}
                                    placeholder="e.g. Keys returned, room inspected and cleared"
                                />
                                <Button
                                    title="Check Out Guest"
                                    loading={actionLoading}
                                    onPress={handleCheckOut}
                                    style={styles.checkOutBtn}
                                />
                            </View>
                        ) : reservation.status === 'checked_out' ||
                          reservation.status === 'completed' ? (
                            <View style={styles.completedNoticeCard}>
                                <CheckCircle2
                                    size={18}
                                    color="#059669"
                                    style={{ marginRight: 8 }}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.completedNoticeHeading}>
                                        Stay Finalized & Checked Out
                                    </Text>
                                    <Text style={styles.completedNoticeText}>
                                        Guest departure is recorded. Room is released for housekeeping and turnover.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.infoCard}>
                                <Text style={styles.infoLabel}>
                                    Front-desk check-in/out is enabled once booking is confirmed. Current status: {reservation.status_label || reservation.status}.
                                </Text>
                            </View>
                        )}
                    </View>
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
    frontDeskCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    frontDeskHeading: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
        marginBottom: 4,
    },
    frontDeskDesc: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        lineHeight: 18,
        marginBottom: Spacing.sm,
    },
    checkInBtn: {
        marginTop: Spacing.xs,
        backgroundColor: '#059669',
    },
    checkOutBtn: {
        marginTop: Spacing.xs,
        backgroundColor: Colors.deepPlum,
    },
    completedNoticeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    completedNoticeHeading: {
        ...Typography.labelMedium,
        color: '#166534',
        fontWeight: '700',
        marginBottom: 2,
    },
    completedNoticeText: {
        ...Typography.bodySmall,
        color: '#15803D',
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
