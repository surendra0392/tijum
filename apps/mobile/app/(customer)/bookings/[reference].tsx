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
import {
    Zap,
    Clock,
    Calendar,
    UtensilsCrossed,
    Receipt,
    ShieldCheck,
} from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { Reservation } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { ReservationStatusBadge } from '../../../src/components/ReservationStatusBadge';
import { StayTimingBadge } from '../../../src/components/StayTimingBadge';
import { MealBadge } from '../../../src/components/MealBadge';
import { Button } from '../../../src/components/Button';
import { RazorpayService } from '../../../src/payments/RazorpayService';

export default function ReservationDetailScreen() {
    const { reference } = useLocalSearchParams<{ reference: string }>();
    const router = useRouter();

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (reference) {
            loadReservation();
        }
    }, [reference]);

    // Payment Countdown Timer (15-minute window)
    useEffect(() => {
        if (!reservation) return;

        const isPayable =
            reservation.status === 'awaiting_payment' ||
            reservation.status === 'payment_pending';

        const deadlineStr =
            (reservation as any).payment_deadline_at ||
            reservation.payment_window_expires_at;

        if (isPayable && deadlineStr) {
            const calculateSeconds = () => {
                const expires = new Date(deadlineStr).getTime();
                const now = Date.now();
                const diff = Math.max(0, Math.floor((expires - now) / 1000));
                return diff;
            };

            setTimeLeft(calculateSeconds());

            const interval = setInterval(() => {
                const remaining = calculateSeconds();
                setTimeLeft(remaining);
                if (remaining <= 0) {
                    clearInterval(interval);
                    loadReservation(); // refresh status (will be expired)
                }
            }, 1000);

            return () => clearInterval(interval);
        } else {
            setTimeLeft(null);
        }
    }, [reservation]);

    const loadReservation = async () => {
        try {
            setLoading(true);
            const res = await CustomerApi.getReservation(reference);
            if (res.data) {
                setReservation(res.data);
            }
        } catch (e: any) {
            Alert.alert(
                'Error',
                e.message || 'Failed to load reservation details.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handlePayWithRazorpay = async () => {
        if (!reservation) return;
        try {
            setPaying(true);
            // Step 1: Initiate payment on backend to create authoritative Razorpay order
            const initRes = await CustomerApi.initiatePayment(
                reservation.reference,
            );
            const payload = initRes.data;

            // Step 2: Open native Razorpay Checkout with prefill
            const checkoutResponse = await RazorpayService.openCheckout(
                payload,
                {
                    name: (reservation as any).customer_name,
                    email: (reservation as any).customer_email,
                    phone: (reservation as any).customer_phone,
                },
            );

            // Step 3: Authoritatively verify signature on backend
            const verifyRes = await CustomerApi.verifyPayment(
                reservation.reference,
                {
                    razorpay_order_id: checkoutResponse.razorpay_order_id,
                    razorpay_payment_id: checkoutResponse.razorpay_payment_id,
                    razorpay_signature: checkoutResponse.razorpay_signature,
                },
            );

            if (verifyRes.data) {
                setReservation(verifyRes.data);
                Alert.alert(
                    'Payment Successful',
                    'Your reservation is now fully confirmed. Enjoy your stay!',
                );
            }
        } catch (e: any) {
            // Dismissal / cancellation by user does not warrant an alarming error alert
            if (
                e?.code === 0 ||
                e?.description?.toLowerCase().includes('cancel') ||
                e?.message?.toLowerCase().includes('cancel')
            ) {
                return;
            }
            Alert.alert(
                'Payment Incomplete',
                e?.description ||
                    e?.message ||
                    'Payment could not be completed.',
            );
        } finally {
            setPaying(false);
        }
    };

    const handleCancelBooking = () => {
        Alert.alert(
            'Cancel Reservation',
            'Are you sure you want to cancel this reservation? Cancellation policies will apply.',
            [
                { text: 'Keep Reservation', style: 'cancel' },
                {
                    text: 'Cancel Reservation',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCancelling(true);
                            const res = await CustomerApi.cancelReservation(
                                reservation!.reference,
                                'Customer requested cancellation via mobile app',
                            );
                            if (res.data) {
                                setReservation(res.data);
                                Alert.alert(
                                    'Reservation Cancelled',
                                    'Your reservation has been cancelled.',
                                );
                            }
                        } catch (e: any) {
                            Alert.alert(
                                'Cancellation Error',
                                e.message || 'Unable to cancel reservation.',
                            );
                        } finally {
                            setCancelling(false);
                        }
                    },
                },
            ],
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.coral} />
                <Text style={styles.loadingText}>Loading reservation...</Text>
            </View>
        );
    }

    if (!reservation) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>Reservation not found.</Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    style={{ marginTop: Spacing.md }}
                />
            </View>
        );
    }

    const isPayable =
        reservation.status === 'awaiting_payment' ||
        reservation.status === 'payment_pending';
    const formatTimer = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const remainder = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Urgent Payment Banner */}
                {isPayable ? (
                    <View style={styles.urgentHeader}>
                        <Zap
                            size={20}
                            color={Colors.coral}
                            style={{ marginRight: 10 }}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.urgentTitle}>
                                Action Required: Pay to Confirm
                            </Text>
                            <Text style={styles.urgentSubtitle}>
                                Your room inventory is reserved on hold.
                                Complete payment before the window expires:
                            </Text>
                            {timeLeft !== null ? (
                                <View style={styles.inlineTimerRow}>
                                    <Clock
                                        size={13}
                                        color={Colors.coral}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={styles.timerCountdown}>
                                        {formatTimer(timeLeft)}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                ) : null}

                <View style={styles.contentPadding}>
                    {/* Top Info */}
                    <View style={styles.rowBetween}>
                        <Text style={styles.referenceText}>
                            {reservation.reference}
                        </Text>
                        <ReservationStatusBadge status={reservation.status} />
                    </View>

                    <Text style={styles.propertyTitle}>
                        {reservation.property_name}
                    </Text>
                    <Text style={styles.roomCategoryText}>
                        Room Category: {reservation.room_type_name}
                    </Text>

                    {/* Stay Timing Policy */}
                    <StayTimingBadge
                        checkIn={reservation.check_in_time || '09:00:00'}
                        checkOut={reservation.check_out_time || '08:00:00'}
                    />

                    {/* Stay Schedule Details */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Calendar
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Stay Schedule
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Check-in Date:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.check_in_date} at 09:00 AM
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Checkout Date:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.check_out_date} at 08:00 AM
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Duration:</Text>
                                <Text style={styles.infoValue}>
                                    {reservation.duration_quantity}{' '}
                                    {reservation.duration_type}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Rooms Booked:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.quantity} Room(s)
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Guest Category:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.guest_gender}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Food Inclusions */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <UtensilsCrossed
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Meal Inclusions
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

                    {/* Price Breakdown */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Receipt
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Price Breakdown
                            </Text>
                        </View>
                        <View style={styles.infoCard}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Accommodation Charge:
                                </Text>
                                <Text style={styles.infoValue}>
                                    ₹
                                    {(
                                        reservation.base_amount_paise / 100
                                    ).toLocaleString('en-IN')}
                                </Text>
                            </View>
                            {reservation.tax_amount_paise > 0 ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        GST / Taxes:
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        ₹
                                        {(
                                            reservation.tax_amount_paise / 100
                                        ).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ) : null}
                            {reservation.deposit_amount_paise > 0 ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Refundable Security Deposit:
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        ₹
                                        {(
                                            reservation.deposit_amount_paise /
                                            100
                                        ).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ) : null}
                            <View style={[styles.infoRow, styles.totalRow]}>
                                <Text style={styles.totalLabel}>
                                    Total Payable:
                                </Text>
                                <Text style={styles.totalValue}>
                                    ₹
                                    {(
                                        reservation.total_amount_paise / 100
                                    ).toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Customer Protection Grievance Option */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <ShieldCheck
                                size={18}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.sectionTitle}>
                                Customer Protection & Support
                            </Text>
                        </View>
                        <Text style={styles.bodySmall}>
                            Protected by TIJUM Customer Protection Guarantee. If
                            food inclusions or room conditions differ from what
                            was promised, report immediately.
                        </Text>
                        <Button
                            title="Report an Issue / Request Relocation"
                            variant="outline"
                            size="sm"
                            style={{ marginTop: Spacing.sm }}
                            onPress={() =>
                                router.push({
                                    pathname: '/(customer)/support/index',
                                    params: {
                                        booking_reference:
                                            reservation.reference,
                                    },
                                })
                            }
                        />
                    </View>

                    {/* Cancellation Option */}
                    {[
                        'awaiting_payment',
                        'payment_pending',
                        'confirmed',
                    ].includes(reservation.status) ? (
                        <View style={styles.section}>
                            <Button
                                title="Cancel Reservation"
                                variant="outline"
                                size="sm"
                                loading={cancelling}
                                onPress={handleCancelBooking}
                            />
                        </View>
                    ) : null}
                </View>
            </ScrollView>

            {/* Floating Bottom Action for Payable State */}
            {isPayable ? (
                <View style={styles.bottomBar}>
                    <View>
                        <Text style={styles.bottomLabel}>Amount Due</Text>
                        <Text style={styles.bottomPrice}>
                            ₹
                            {(
                                reservation.total_amount_paise / 100
                            ).toLocaleString('en-IN')}
                        </Text>
                    </View>
                    <Button
                        title="Pay with Razorpay"
                        loading={paying}
                        onPress={handlePayWithRazorpay}
                        style={{ paddingHorizontal: Spacing.xl }}
                    />
                </View>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    urgentHeader: {
        backgroundColor: '#FFF1F2',
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#FFE4E6',
    },
    urgentIcon: {
        fontSize: 28,
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
    timerCountdown: {
        ...Typography.titleSmall,
        color: Colors.coral,
        fontWeight: '800',
    },
    inlineTimerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    contentPadding: {
        padding: Spacing.lg,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    referenceText: {
        ...Typography.bodySmall,
        color: Colors.gray400,
        fontWeight: '700',
    },
    propertyTitle: {
        ...Typography.titleMedium,
        color: Colors.deepPlum,
        marginTop: Spacing.sm,
    },
    roomCategoryText: {
        ...Typography.bodyMedium,
        color: Colors.gray600,
        marginTop: 2,
    },
    section: {
        marginTop: Spacing.lg,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.gray100,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
    },
    bodySmall: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        lineHeight: 18,
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
        color: Colors.coral,
        fontWeight: '800',
    },
    mealBadgesContainer: {
        gap: Spacing.sm,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    bottomLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    bottomPrice: {
        ...Typography.titleSmall,
        color: Colors.coral,
        fontWeight: '800',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        backgroundColor: Colors.white,
    },
    loadingText: {
        ...Typography.bodyMedium,
        color: Colors.gray600,
        marginTop: Spacing.md,
    },
    errorText: {
        ...Typography.bodyMedium,
        color: Colors.coral,
        textAlign: 'center',
    },
});
