import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { OwnerApi } from '../../../src/api/owner';
import { PhysicalRoom, Reservation } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { ReservationStatusBadge } from '../../../src/components/ReservationStatusBadge';
import { StayTimingBadge } from '../../../src/components/StayTimingBadge';
import { MealBadge } from '../../../src/components/MealBadge';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { AppHeader } from '../../../src/components/AppHeader';
import { RequireAuth } from '../../../src/components/RequireAuth';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    ClipboardList,
    DoorClosed,
    KeyRound,
    Receipt,
    UserCheck,
    UtensilsCrossed,
    X,
    Zap,
} from 'lucide-react-native';

export default function PartnerReservationDetailScreen() {
    const { reference } = useLocalSearchParams<{ reference: string }>();
    const router = useRouter();

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [checkInNotes, setCheckInNotes] = useState('');
    const [checkOutNotes, setCheckOutNotes] = useState('');

    // Physical Room Allocation State
    const [showAllocateModal, setShowAllocateModal] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [allocatingRoom, setAllocatingRoom] = useState(false);
    const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [allocateError, setAllocateError] = useState('');

    useEffect(() => {
        if (reference) {
            void loadReservation();
        }
    }, [reference]);

    const loadReservation = async () => {
        try {
            setLoading(true);
            const res = await OwnerApi.getReservation(reference);
            if (res.data) {
                setReservation(res.data);
                return;
            }
            setReservation(null);
        } catch (e: any) {
            setReservation(null);
            Alert.alert(
                'Error',
                e.message || 'Failed to load booking details.',
            );
        } finally {
            setLoading(false);
        }
    };

    const executeCheckIn = async () => {
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

    const handleCheckIn = () => {
        if (!reservation) return;
        Alert.alert(
            'Confirm Guest Check-In',
            `Record front-desk arrival and key handover for ${reservation.customer_name || 'Guest'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm Check-In', onPress: () => void executeCheckIn() },
            ],
        );
    };

    const executeCheckOut = async () => {
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

    const handleCheckOut = () => {
        if (!reservation) return;
        Alert.alert(
            'Confirm Guest Checkout',
            `Finalize guest departure and release room for turnover?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm Checkout', onPress: () => void executeCheckOut() },
            ],
        );
    };

    const openAllocateModal = async () => {
        if (!reservation) return;
        setShowAllocateModal(true);
        const existingRoomId =
            reservation.physical_room_id ||
            reservation.allocations?.[0]?.property_room_id ||
            null;
        setSelectedRoomId(existingRoomId);
        setAllocateError('');

        const propId =
            reservation.property?.id ||
            reservation.property_id ||
            (reservation as any).propertyId;

        if (!propId) {
            setAllocateError(
                'Property ID is missing from reservation details.',
            );
            return;
        }

        try {
            setLoadingRooms(true);
            const res = await OwnerApi.getPropertyRooms(propId);
            if (res.data) {
                // Filter out inactive or maintenance rooms and prioritize matching room type
                const activeRooms = res.data.filter(
                    (r) =>
                        r.is_active !== false &&
                        r.operational_status !== 'maintenance' &&
                        r.operational_status !== 'inactive',
                );
                const targetRoomTypeId = reservation.property_room_type_id;
                const sorted = [...activeRooms].sort((a, b) => {
                    if (targetRoomTypeId) {
                        const aMatch =
                            a.property_room_type_id === targetRoomTypeId
                                ? 1
                                : 0;
                        const bMatch =
                            b.property_room_type_id === targetRoomTypeId
                                ? 1
                                : 0;
                        if (aMatch !== bMatch) return bMatch - aMatch;
                    }
                    return String(a.room_number).localeCompare(
                        String(b.room_number),
                        undefined,
                        { numeric: true },
                    );
                });
                setRooms(sorted);
            }
        } catch (e: any) {
            setAllocateError(
                e.message || 'Failed to retrieve property room inventory.',
            );
        } finally {
            setLoadingRooms(false);
        }
    };

    const handleAllocateRoom = async () => {
        if (!reservation || !selectedRoomId) {
            Alert.alert(
                'Selection Required',
                'Please tap on an available room to allocate.',
            );
            return;
        }

        try {
            setAllocatingRoom(true);
            setAllocateError('');
            const res = await OwnerApi.allocateRoom(
                reservation.reference || reservation.booking_reference,
                selectedRoomId,
            );

            const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
            if (res.data) {
                setReservation(res.data);
            } else {
                setReservation({
                    ...reservation,
                    physical_room_id: selectedRoomId,
                    allocated_room_number:
                        selectedRoom?.room_number ||
                        reservation.allocated_room_number,
                    allocated_floor:
                        selectedRoom?.floor ?? reservation.allocated_floor,
                    physical_room: selectedRoom || reservation.physical_room,
                });
            }

            setShowAllocateModal(false);
            Alert.alert(
                'Room Allocated Successfully',
                `Room #${selectedRoom?.room_number || selectedRoomId} has been designated for this guest.`,
            );
        } catch (e: any) {
            setAllocateError(
                e.message ||
                    'Unable to allocate room. It may be currently allocated or inactive.',
            );
        } finally {
            setAllocatingRoom(false);
        }
    };

    if (loading) {
        return (
            <RequireAuth role="partner">
                <SafeAreaView style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>Loading booking info...</Text>
                </SafeAreaView>
            </RequireAuth>
        );
    }

    if (!reservation) {
        return (
            <RequireAuth role="partner">
                <SafeAreaView style={styles.center}>
                    <Text style={styles.errorText}>
                        Reservation record not found.
                    </Text>
                    <Button
                        title="Go Back"
                        onPress={() => router.back()}
                        style={{ marginTop: Spacing.md }}
                    />
                </SafeAreaView>
            </RequireAuth>
        );
    }

    const isConfirmed = reservation.status === 'confirmed';
    const isCheckedIn = Boolean(
        reservation.is_checked_in || reservation.checked_in_at,
    );
    const isCheckedOut = Boolean(
        reservation.is_checked_out || reservation.checked_out_at,
    );
    const assignedRoomNum =
        reservation.primary_room_number ||
        reservation.allocated_room_number ||
        reservation.allocations?.[0]?.room_number ||
        reservation.physical_room?.room_number;
    const assignedFloor =
        reservation.allocated_floor ??
        reservation.allocations?.[0]?.floor_number ??
        reservation.physical_room?.floor_number ??
        reservation.physical_room?.floor;
    const isRoomAllocated = Boolean(
        reservation.is_allocated ||
            assignedRoomNum ||
            reservation.physical_room ||
            reservation.physical_room_id,
    );

    return (
        <RequireAuth role="partner">
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <AppHeader
                    title="Booking Review"
                    subtitle={
                        reservation.reference || reservation.booking_reference
                    }
                    showBack
                    fallbackRoute="/(partner)/reservations"
                />
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentPadding}>
                    {/* Header */}
                    <View style={styles.rowBetween}>
                        <Text style={styles.refText}>
                            {reservation.reference}
                        </Text>
                        <ReservationStatusBadge
                            status={reservation.status}
                            label={reservation.status_label}
                        />
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
                            {isRoomAllocated ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Assigned Room:
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
                                        Room #{assignedRoomNum}{' '}
                                        (Floor {assignedFloor ?? 'Main'})
                                    </Text>
                                </View>
                            ) : null}
                            {reservation.cancellation_reason ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Cancellation Reason:
                                    </Text>
                                    <Text
                                        style={[
                                            styles.infoValue,
                                            { color: Colors.rose },
                                        ]}
                                    >
                                        {reservation.cancellation_reason}
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
                                included={Boolean(
                                    reservation.food_inclusions?.breakfast ??
                                        reservation.property
                                            ?.breakfast_included ??
                                        false,
                                )}
                                timing={
                                    reservation.food_inclusions
                                        ?.breakfast_timing
                                }
                            />
                            <MealBadge
                                meal="lunch"
                                included={Boolean(
                                    reservation.food_inclusions?.lunch ??
                                        reservation.property?.lunch_included ??
                                        false,
                                )}
                                timing={
                                    reservation.food_inclusions?.lunch_timing
                                }
                            />
                            <MealBadge
                                meal="dinner"
                                included={Boolean(
                                    reservation.food_inclusions?.dinner ??
                                        reservation.property?.dinner_included ??
                                        false,
                                )}
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
                                        (reservation.owner_payable_paise ??
                                            reservation.total_amount_paise) /
                                        100
                                    ).toLocaleString('en-IN')}
                                </Text>
                            </View>
                            {reservation.refunds &&
                            reservation.refunds.length > 0 ? (
                                <View style={{ marginTop: Spacing.sm }}>
                                    <Text style={styles.infoLabel}>
                                        Processed Refunds:
                                    </Text>
                                    {reservation.refunds.map((refItem) => (
                                        <View
                                            key={refItem.id}
                                            style={styles.infoRow}
                                        >
                                            <Text style={styles.infoLabel}>
                                                {(refItem as any).refund_reference ||
                                                    (refItem as any).reference ||
                                                    `Refund #${refItem.id}`} (
                                                {refItem.status})
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.infoValue,
                                                    { color: Colors.rose },
                                                ]}
                                            >
                                                ₹
                                                {(
                                                    (refItem.amount_minor || 0) /
                                                    100
                                                ).toLocaleString('en-IN')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
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

                    {/* Physical Room Allocation Section */}
                    {isConfirmed ? (
                        <View style={styles.section}>
                            <View style={styles.sectionTitleRow}>
                                <DoorClosed
                                    size={18}
                                    color={Colors.deepPlum}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.sectionTitle}>
                                    Physical Room Allocation
                                </Text>
                            </View>

                            {isRoomAllocated ? (
                                <View style={styles.allocationCard}>
                                    <View style={styles.allocationHeader}>
                                        <View style={styles.allocatedBadge}>
                                            <CheckCircle2
                                                size={13}
                                                color="#059669"
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text
                                                style={
                                                    styles.allocatedBadgeText
                                                }
                                            >
                                                Allocated
                                            </Text>
                                        </View>
                                        {isConfirmed && !isCheckedOut ? (
                                            <TouchableOpacity
                                                onPress={openAllocateModal}
                                                activeOpacity={0.7}
                                            >
                                                <Text
                                                    style={
                                                        styles.reallocateText
                                                    }
                                                >
                                                    Change Room
                                                </Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    <View style={styles.allocationDetails}>
                                        <View style={styles.allocationItem}>
                                            <Text
                                                style={styles.allocationLabel}
                                            >
                                                Assigned Room
                                            </Text>
                                            <Text
                                                style={styles.allocationValue}
                                            >
                                                Room #
                                                {assignedRoomNum ||
                                                    reservation.physical_room_id}
                                            </Text>
                                        </View>
                                        <View style={styles.allocationItem}>
                                            <Text
                                                style={styles.allocationLabel}
                                            >
                                                Floor
                                            </Text>
                                            <Text
                                                style={styles.allocationValue}
                                            >
                                                Floor{' '}
                                                {assignedFloor ??
                                                    'Main / Ground'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.unallocatedCard}>
                                    <View style={styles.unallocatedHeader}>
                                        <KeyRound
                                            size={20}
                                            color={Colors.coral}
                                            style={{ marginRight: 8 }}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={styles.unallocatedTitle}
                                            >
                                                Room Not Yet Allocated
                                            </Text>
                                            <Text
                                                style={styles.unallocatedDesc}
                                            >
                                                Assign a physical room number
                                                and floor before or during guest
                                                check-in.
                                            </Text>
                                        </View>
                                    </View>
                                    {isConfirmed && !isCheckedOut ? (
                                        <Button
                                            title="Assign Physical Room"
                                            variant="primary"
                                            size="sm"
                                            onPress={openAllocateModal}
                                            style={{ marginTop: Spacing.sm }}
                                        />
                                    ) : null}
                                </View>
                            )}
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

                        {isConfirmed && !isCheckedIn && !isCheckedOut ? (
                            <View style={styles.frontDeskCard}>
                                <Text style={styles.frontDeskHeading}>
                                    Guest Arrival & Key Handover
                                </Text>
                                <Text style={styles.frontDeskDesc}>
                                    When the guest arrives, verify identity and
                                    record check-in to mark the room occupied.
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
                        ) : isConfirmed && isCheckedIn && !isCheckedOut ? (
                            <View style={styles.frontDeskCard}>
                                <Text style={styles.frontDeskHeading}>
                                    Guest Departure & Room Turnover
                                </Text>
                                <Text style={styles.frontDeskDesc}>
                                    When the guest vacates the room, inspect
                                    premises, retrieve keys, and finalize
                                    checkout.
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
                        ) : isCheckedOut ? (
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
                                        Guest departure is recorded. Room is
                                        released for housekeeping and turnover.
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.infoCard}>
                                <Text style={styles.infoLabel}>
                                    Front-desk check-in/out is enabled once
                                    booking is confirmed. Current status:{' '}
                                    {reservation.status_label ||
                                        reservation.status}
                                    .
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
            </KeyboardAvoidingView>

            {/* Physical Room Allocation Modal */}
            <Modal
                visible={showAllocateModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAllocateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    Assign Physical Room
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    Category: {reservation.room_type_name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowAllocateModal(false)}
                                hitSlop={{
                                    top: 10,
                                    bottom: 10,
                                    left: 10,
                                    right: 10,
                                }}
                            >
                                <X size={20} color={Colors.gray600} />
                            </TouchableOpacity>
                        </View>

                        {allocateError ? (
                            <View style={styles.errorBox}>
                                <AlertCircle
                                    size={16}
                                    color={Colors.rose}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.errorText}>
                                    {allocateError}
                                </Text>
                            </View>
                        ) : null}

                        {loadingRooms ? (
                            <View
                                style={{
                                    padding: Spacing.xl,
                                    alignItems: 'center',
                                }}
                            >
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.deepPlum}
                                />
                                <Text
                                    style={[
                                        styles.loadingText,
                                        { marginTop: 8 },
                                    ]}
                                >
                                    Loading room inventory...
                                </Text>
                            </View>
                        ) : rooms.length === 0 ? (
                            <View
                                style={{
                                    padding: Spacing.lg,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={styles.emptyRoomsText}>
                                    No physical rooms configured for this
                                    property.
                                </Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={{ maxHeight: 320 }}
                                showsVerticalScrollIndicator={false}
                            >
                                <View
                                    style={{
                                        gap: Spacing.xs,
                                        paddingVertical: Spacing.xs,
                                    }}
                                >
                                    {rooms.map((room) => {
                                        const isSelected =
                                            selectedRoomId === room.id;
                                        const isOccupied = room.is_occupied;
                                        const isCurrent =
                                            reservation.physical_room_id ===
                                            room.id;

                                        return (
                                            <TouchableOpacity
                                                key={room.id}
                                                style={[
                                                    styles.roomChoiceCard,
                                                    isSelected &&
                                                        styles.roomChoiceCardSelected,
                                                    isOccupied &&
                                                        !isCurrent &&
                                                        styles.roomChoiceCardDisabled,
                                                ]}
                                                onPress={() => {
                                                    if (
                                                        !isOccupied ||
                                                        isCurrent
                                                    ) {
                                                        setSelectedRoomId(
                                                            room.id,
                                                        );
                                                    }
                                                }}
                                                disabled={Boolean(
                                                    isOccupied && !isCurrent,
                                                )}
                                                activeOpacity={0.7}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <View
                                                        style={{
                                                            flexDirection:
                                                                'row',
                                                            alignItems:
                                                                'center',
                                                        }}
                                                    >
                                                        <Text
                                                            style={
                                                                styles.roomChoiceNumber
                                                            }
                                                        >
                                                            Room{' '}
                                                            {room.room_number}
                                                        </Text>
                                                        {room.floor !==
                                                            undefined &&
                                                        room.floor !== null ? (
                                                            <Text
                                                                style={
                                                                    styles.roomChoiceFloor
                                                                }
                                                            >
                                                                (Floor{' '}
                                                                {room.floor})
                                                            </Text>
                                                        ) : null}
                                                        {isCurrent ? (
                                                            <View
                                                                style={
                                                                    styles.currentRoomTag
                                                                }
                                                            >
                                                                <Text
                                                                    style={
                                                                        styles.currentRoomTagText
                                                                    }
                                                                >
                                                                    Current
                                                                </Text>
                                                            </View>
                                                        ) : null}
                                                    </View>
                                                    <Text
                                                        style={
                                                            styles.roomChoiceMeta
                                                        }
                                                    >
                                                        {room.room_type_name ||
                                                            reservation.room_type_name ||
                                                            'Standard'}
                                                    </Text>
                                                </View>

                                                <View
                                                    style={{
                                                        alignItems: 'flex-end',
                                                    }}
                                                >
                                                    {isOccupied &&
                                                    !isCurrent ? (
                                                        <View
                                                            style={
                                                                styles.occupiedTag
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.occupiedTagText
                                                                }
                                                            >
                                                                Occupied
                                                            </Text>
                                                        </View>
                                                    ) : isSelected ? (
                                                        <View
                                                            style={
                                                                styles.selectedCircle
                                                            }
                                                        >
                                                            <Check
                                                                size={14}
                                                                color={
                                                                    Colors.white
                                                                }
                                                            />
                                                        </View>
                                                    ) : (
                                                        <View
                                                            style={
                                                                styles.availableTag
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.availableTagText
                                                                }
                                                            >
                                                                Available
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        )}

                        <Button
                            title="Confirm Room Allocation"
                            variant="primary"
                            size="md"
                            loading={allocatingRoom}
                            disabled={!selectedRoomId || loadingRooms}
                            onPress={handleAllocateRoom}
                            style={{ marginTop: Spacing.md }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
        </RequireAuth>
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
    allocationCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    allocationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    allocatedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
    },
    allocatedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    reallocateText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.deepPlum,
        textDecorationLine: 'underline',
    },
    allocationDetails: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    allocationItem: {
        flex: 1,
    },
    allocationLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginBottom: 2,
    },
    allocationValue: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    unallocatedCard: {
        backgroundColor: '#FFF7ED',
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    unallocatedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unallocatedTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    unallocatedDesc: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        marginTop: 2,
        lineHeight: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray100,
    },
    modalTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        fontWeight: '800',
    },
    modalSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginTop: 2,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF1F2',
        padding: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE4E6',
        marginBottom: Spacing.sm,
    },
    emptyRoomsText: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    roomChoiceCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: 8,
        backgroundColor: Colors.warmOffWhite,
        borderWidth: 1.5,
        borderColor: Colors.gray200,
    },
    roomChoiceCardSelected: {
        borderColor: Colors.coral,
        backgroundColor: '#FFF7F5',
    },
    roomChoiceCardDisabled: {
        opacity: 0.5,
        backgroundColor: Colors.gray100,
    },
    roomChoiceNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    roomChoiceFloor: {
        fontSize: 12,
        color: Colors.gray600,
        marginLeft: 6,
    },
    roomChoiceMeta: {
        fontSize: 12,
        color: Colors.gray500,
        marginTop: 2,
    },
    currentRoomTag: {
        backgroundColor: '#EDE9FE',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 6,
    },
    currentRoomTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6D28D9',
    },
    occupiedTag: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    occupiedTagText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#DC2626',
    },
    availableTag: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    availableTagText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#15803D',
    },
    selectedCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: Colors.coral,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
