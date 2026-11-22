import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    Calendar,
    CheckCircle,
    Clock,
    Receipt,
    ShieldCheck,
    Star,
    UtensilsCrossed,
    X,
    Zap,
    RotateCcw,
} from 'lucide-react-native';
import { CustomerApi } from '../../../src/api/customer';
import { Reservation } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { BorderRadius, Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { ReservationStatusBadge } from '../../../src/components/ReservationStatusBadge';
import { StayTimingBadge } from '../../../src/components/StayTimingBadge';
import { MealBadge } from '../../../src/components/MealBadge';
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { RazorpayService } from '../../../src/payments/RazorpayService';
import {
    canCancelReservation,
    canPayReservation,
    canSubmitReview,
    resolvePaymentVerifyAlert,
    resolveRefundNotice,
    shouldShowRefundSection,
} from '../../../src/utils/reservationState';

export default function ReservationDetailScreen() {
    const { reference } = useLocalSearchParams<{ reference: string }>();
    const router = useRouter();

    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Customer Review State
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [overallRating, setOverallRating] = useState(5);
    const [cleanlinessRating, setCleanlinessRating] = useState(5);
    const [foodRating, setFoodRating] = useState(5);
    const [communicationRating, setCommunicationRating] = useState(5);
    const [valueRating, setValueRating] = useState(5);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewContent, setReviewContent] = useState('');
    const [reviewError, setReviewError] = useState('');

    useEffect(() => {
        if (reference) {
            void loadReservation();
        }
    }, [reference]);

    // Payment Countdown Timer (15-minute window)
    useEffect(() => {
        if (!reservation) return;

        const isPayable = canPayReservation(reservation);

        const deadlineStr =
            reservation.payment_deadline_at ||
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
                    void loadReservation(); // refresh status (will be expired)
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
                return;
            }
            setReservation(null);
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
                reservation.reference ?? reservation.booking_reference,
            );
            const payload = initRes.data;

            // Step 2: Open native Razorpay Checkout with prefill
            const checkoutResponse = await RazorpayService.openCheckout(
                payload,
                {
                    name: reservation.contact_name,
                    email: reservation.contact_email,
                    phone: reservation.contact_phone,
                },
            );

            // Step 3: Authoritatively verify signature on backend
            const verifyRes = await CustomerApi.verifyPayment(
                reservation.reference ?? reservation.booking_reference,
                {
                    razorpay_order_id: checkoutResponse.razorpay_order_id,
                    razorpay_payment_id: checkoutResponse.razorpay_payment_id,
                    razorpay_signature: checkoutResponse.razorpay_signature,
                },
            );

            if (verifyRes.data) {
                setReservation(verifyRes.data);
                const alertCopy = resolvePaymentVerifyAlert(
                    verifyRes.data,
                    verifyRes.message,
                );
                Alert.alert(alertCopy.title, alertCopy.message);
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
                                reservation!.reference ??
                                    reservation!.booking_reference,
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

    const handleSubmitReview = async () => {
        if (!reservation) return;
        if (!overallRating || overallRating < 1) {
            setReviewError('Please select an overall rating.');
            return;
        }
        if (
            reviewContent.trim().length > 0 &&
            reviewContent.trim().length < 10
        ) {
            setReviewError(
                'Written review feedback must be at least 10 characters.',
            );
            return;
        }

        try {
            setSubmittingReview(true);
            setReviewError('');
            await CustomerApi.submitReview(
                reservation.reference || reservation.booking_reference,
                {
                    overall_rating: overallRating,
                    cleanliness_rating: cleanlinessRating,
                    food_quality_rating: foodRating,
                    communication_rating: communicationRating,
                    value_rating: valueRating,
                    title: reviewTitle.trim() || undefined,
                    content: reviewContent.trim() || undefined,
                },
            );

            setShowReviewModal(false);
            await loadReservation();
            Alert.alert(
                'Review Submitted',
                'Thank you for rating your stay! Your verified review helps future travelers.',
            );
        } catch (e: any) {
            setReviewError(
                e.message || 'Failed to submit review. Please try again.',
            );
        } finally {
            setSubmittingReview(false);
        }
    };

    const renderStarSelector = (
        currentValue: number,
        onChange: (val: number) => void,
        size: number = 24,
    ) => {
        return (
            <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => onChange(star)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        activeOpacity={0.7}
                    >
                        <Star
                            size={size}
                            color={
                                star <= currentValue
                                    ? '#F59E0B'
                                    : Colors.gray300
                            }
                            fill={
                                star <= currentValue ? '#F59E0B' : 'transparent'
                            }
                        />
                    </TouchableOpacity>
                ))}
            </View>
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

    const isPayable = canPayReservation(reservation);
    const hasReviewRecord = Boolean(
        reservation.is_reviewed || reservation.review,
    );
    const isReviewEligible = canSubmitReview(reservation);
    const showReviewSection =
        hasReviewRecord ||
        isReviewEligible ||
        Boolean(reservation.review_eligibility?.reason);
    const formatDateTime = (isoString?: string | null) => {
        if (!isoString) {
            return null;
        }
        const parsed = new Date(isoString);
        return Number.isNaN(parsed.getTime())
            ? isoString
            : parsed.toLocaleString();
    };
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
                        <ReservationStatusBadge
                            status={reservation.status}
                            label={reservation.status_label}
                        />
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
                            {reservation.checked_in_at ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Verified Check-In:
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {formatDateTime(
                                            reservation.checked_in_at,
                                        )}
                                    </Text>
                                </View>
                            ) : null}
                            {reservation.checked_out_at ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Verified Check-Out:
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {formatDateTime(
                                            reservation.checked_out_at,
                                        )}
                                    </Text>
                                </View>
                            ) : null}
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Duration:</Text>
                                <Text style={styles.infoValue}>
                                    {reservation.duration_quantity}{' '}
                                    {reservation.duration_type}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    {reservation.quantity_basis ===
                                    'guest_places'
                                        ? 'Guest Places:'
                                        : 'Rooms Booked:'}
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.quantity}{' '}
                                    {reservation.quantity_basis ===
                                    'guest_places'
                                        ? 'Guest(s)'
                                        : 'Room(s)'}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>
                                    Guest Gender:
                                </Text>
                                <Text style={styles.infoValue}>
                                    {reservation.guest_gender}
                                </Text>
                            </View>
                            {reservation.guest_composition_label ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Guest Composition:
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {reservation.guest_composition_label}
                                    </Text>
                                </View>
                            ) : null}
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
                                    false
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
                                    reservation.food_inclusions?.dinner ?? false
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
                                        (reservation.original_amount_paise ??
                                            reservation.total_amount_paise) /
                                        100
                                    ).toLocaleString('en-IN')}
                                </Text>
                            </View>
                            {(reservation.tax_amount_paise ?? 0) > 0 ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        GST / Taxes:
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        ₹
                                        {(
                                            (reservation.tax_amount_paise ??
                                                0) / 100
                                        ).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ) : null}
                            {(reservation.deposit_amount_paise ?? 0) > 0 ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Refundable Security Deposit:
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        ₹
                                        {(
                                            (reservation.deposit_amount_paise ??
                                                0) / 100
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

                    {/* Authoritative Payment Status */}
                    {reservation.payment_status_label ||
                    reservation.payment_summary ||
                    reservation.requires_refund_review ? (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Receipt
                                    size={18}
                                    color={Colors.deepPlum}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.sectionTitle}>
                                    Payment Status
                                </Text>
                            </View>
                            <View style={styles.infoCard}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Status:
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {reservation.payment_status_label ||
                                            reservation.payment_summary
                                                ?.status_label ||
                                            reservation.payment_status ||
                                            'Pending'}
                                    </Text>
                                </View>
                                {reservation.payment_summary
                                    ?.gateway_payment_id ? (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>
                                            Payment Ref:
                                        </Text>
                                        <Text style={styles.infoValue}>
                                            {
                                                reservation.payment_summary
                                                    .gateway_payment_id
                                            }
                                        </Text>
                                    </View>
                                ) : null}
                                {reservation.payment_summary?.captured_at ? (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>
                                            Captured At:
                                        </Text>
                                        <Text style={styles.infoValue}>
                                            {formatDateTime(
                                                reservation.payment_summary
                                                    .captured_at,
                                            )}
                                        </Text>
                                    </View>
                                ) : null}
                                {reservation.payment_summary
                                    ?.refunded_amount_minor ? (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>
                                            Refunded Amount:
                                        </Text>
                                        <Text style={styles.infoValue}>
                                            ₹
                                            {(
                                                reservation.payment_summary
                                                    .refunded_amount_minor / 100
                                            ).toLocaleString('en-IN')}
                                        </Text>
                                    </View>
                                ) : null}
                                {reservation.payment_summary?.failure_reason ? (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>
                                            Gateway Note:
                                        </Text>
                                        <Text style={styles.infoValue}>
                                            {
                                                reservation.payment_summary
                                                    .failure_reason
                                            }
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    ) : null}

                    {/* Cancellation & Refund Tracking */}
                    {shouldShowRefundSection(reservation) ? (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <RotateCcw
                                    size={18}
                                    color={Colors.coral}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.sectionTitle}>
                                    Cancellation & Refund Tracking
                                </Text>
                            </View>
                            <View style={styles.refundCard}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        Booking Status:
                                    </Text>
                                    <ReservationStatusBadge
                                        status={reservation.status}
                                        label={reservation.status_label}
                                    />
                                </View>
                                {reservation.cancelled_at ? (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>
                                            Cancelled On:
                                        </Text>
                                        <Text style={styles.infoValue}>
                                            {new Date(
                                                reservation.cancelled_at,
                                            ).toLocaleDateString()}
                                        </Text>
                                    </View>
                                ) : null}
                                {reservation.expired_at ? (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>
                                            Expired On:
                                        </Text>
                                        <Text style={styles.infoValue}>
                                            {new Date(
                                                reservation.expired_at,
                                            ).toLocaleString()}
                                        </Text>
                                    </View>
                                ) : null}
                                {reservation.cancellation_reason ? (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>
                                            Reason:
                                        </Text>
                                        <Text style={styles.infoValue}>
                                            {reservation.cancellation_reason}
                                        </Text>
                                    </View>
                                ) : null}

                                <View style={styles.refundDivider} />

                                {(reservation.refunds?.length ?? 0) > 0 ? (
                                    reservation.refunds?.map(
                                        (refItem: any) => (
                                            <View
                                                key={refItem.id}
                                                style={styles.refundItemBox}
                                            >
                                                <View style={styles.rowBetween}>
                                                    <Text
                                                        style={
                                                            styles.refundAmountText
                                                        }
                                                    >
                                                        ₹
                                                        {(
                                                            refItem.amount_minor /
                                                            100
                                                        ).toLocaleString(
                                                            'en-IN',
                                                        )}
                                                    </Text>
                                                    <Badge
                                                        label={(
                                                            refItem.status_label ||
                                                            refItem.status
                                                        ).toUpperCase()}
                                                        variant={
                                                            refItem.status ===
                                                            'processed'
                                                                ? 'accent'
                                                                : 'neutral'
                                                        }
                                                    />
                                                </View>
                                                {refItem.utr ? (
                                                    <Text
                                                        style={
                                                            styles.refundUtrText
                                                        }
                                                    >
                                                        Bank UTR / Ref:{' '}
                                                        {refItem.utr}
                                                    </Text>
                                                ) : null}
                                                <Text
                                                    style={
                                                        styles.refundDateText
                                                    }
                                                >
                                                    Updated:{' '}
                                                    {refItem.gateway_processed_at
                                                        ? new Date(
                                                              refItem.gateway_processed_at,
                                                          ).toLocaleString()
                                                        : new Date(
                                                              refItem.created_at,
                                                          ).toLocaleString()}
                                                </Text>
                                            </View>
                                        ),
                                    )
                                ) : (
                                    <View style={styles.refundNoticeBox}>
                                        <Text style={styles.refundNoticeText}>
                                            {resolveRefundNotice(reservation)}
                                        </Text>
                                    </View>
                                )}
                                {(reservation.refunds?.length ?? 0) > 0 &&
                                reservation.requires_refund_review ? (
                                    <View
                                        style={[
                                            styles.refundNoticeBox,
                                            { marginTop: Spacing.xs },
                                        ]}
                                    >
                                        <Text style={styles.refundNoticeText}>
                                            {resolveRefundNotice(reservation)}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    ) : null}

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

                    {/* Customer Review Section */}
                    {showReviewSection ? (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Star
                                    size={18}
                                    color={Colors.coral}
                                    fill={Colors.coral}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.sectionTitle}>
                                    Guest Review & Ratings
                                </Text>
                            </View>

                            {hasReviewRecord ? (
                                <View style={styles.reviewedCard}>
                                    <View style={styles.reviewedHeader}>
                                        <View style={styles.verifiedBadge}>
                                            <CheckCircle
                                                size={13}
                                                color="#059669"
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text
                                                style={styles.verifiedBadgeText}
                                            >
                                                {reservation.review
                                                    ?.status_label ||
                                                    'Verified Review'}
                                            </Text>
                                        </View>
                                        <View style={styles.ratingBadge}>
                                            <Star
                                                size={13}
                                                color="#F59E0B"
                                                fill="#F59E0B"
                                                style={{ marginRight: 3 }}
                                            />
                                            <Text
                                                style={styles.ratingBadgeText}
                                            >
                                                {(
                                                    reservation.review
                                                        ?.overall_rating ||
                                                    reservation.review
                                                        ?.rating ||
                                                    5
                                                ).toFixed(1)}{' '}
                                                / 5
                                            </Text>
                                        </View>
                                    </View>
                                    {reservation.review?.title ? (
                                        <Text style={styles.reviewedTitle}>
                                            {reservation.review.title}
                                        </Text>
                                    ) : null}
                                    {reservation.review?.content ? (
                                        <Text style={styles.reviewedContent}>
                                            "{reservation.review.content}"
                                        </Text>
                                    ) : null}
                                    <Text style={styles.reviewedDate}>
                                        Submitted{' '}
                                        {reservation.review?.submitted_at
                                            ? formatDateTime(
                                                  reservation.review
                                                      .submitted_at,
                                              )
                                            : reservation.review?.created_at ||
                                              'for this stay'}
                                    </Text>
                                </View>
                            ) : isReviewEligible ? (
                                <View style={styles.reviewPromptCard}>
                                    <Text style={styles.reviewPromptTitle}>
                                        How was your stay?
                                    </Text>
                                    <Text style={styles.reviewPromptDesc}>
                                        Rate room cleanliness, food quality,
                                        host communication, and value for money
                                        to help the community.
                                    </Text>
                                    <Button
                                        title="Rate & Review Your Stay"
                                        variant="primary"
                                        size="sm"
                                        onPress={() => {
                                            setReviewError('');
                                            setShowReviewModal(true);
                                        }}
                                        style={{ marginTop: Spacing.sm }}
                                    />
                                </View>
                            ) : (
                                <View style={styles.refundNoticeBox}>
                                    <Text style={styles.refundNoticeText}>
                                        {reservation.review_eligibility
                                            ?.reason ||
                                            'Verified Booking reviews open after scheduled checkout for confirmed paid stays.'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {/* Cancellation Option */}
                    {canCancelReservation(reservation) ? (
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

            {/* Review Submission Modal */}
            <Modal
                visible={showReviewModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowReviewModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.reviewModalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    Rate Your Stay
                                </Text>
                                <Text
                                    style={styles.modalSubtitle}
                                    numberOfLines={1}
                                >
                                    {reservation.property_name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowReviewModal(false)}
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

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                paddingBottom: Spacing.md,
                            }}
                        >
                            {reviewError ? (
                                <View style={styles.reviewErrorBox}>
                                    <Text style={styles.reviewErrorText}>
                                        {reviewError}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Overall Rating */}
                            <View style={styles.ratingCategoryBlock}>
                                <Text style={styles.ratingCategoryTitle}>
                                    Overall Experience *
                                </Text>
                                {renderStarSelector(
                                    overallRating,
                                    setOverallRating,
                                    28,
                                )}
                            </View>

                            {/* Subcategories */}
                            <View style={styles.subRatingsGrid}>
                                <View style={styles.subRatingRow}>
                                    <Text style={styles.subRatingLabel}>
                                        Cleanliness
                                    </Text>
                                    {renderStarSelector(
                                        cleanlinessRating,
                                        setCleanlinessRating,
                                        20,
                                    )}
                                </View>
                                <View style={styles.subRatingRow}>
                                    <Text style={styles.subRatingLabel}>
                                        Food & Dining
                                    </Text>
                                    {renderStarSelector(
                                        foodRating,
                                        setFoodRating,
                                        20,
                                    )}
                                </View>
                                <View style={styles.subRatingRow}>
                                    <Text style={styles.subRatingLabel}>
                                        Host Communication
                                    </Text>
                                    {renderStarSelector(
                                        communicationRating,
                                        setCommunicationRating,
                                        20,
                                    )}
                                </View>
                                <View style={styles.subRatingRow}>
                                    <Text style={styles.subRatingLabel}>
                                        Value for Money
                                    </Text>
                                    {renderStarSelector(
                                        valueRating,
                                        setValueRating,
                                        20,
                                    )}
                                </View>
                            </View>

                            {/* Title */}
                            <Input
                                label="Review Headline (Optional)"
                                placeholder="e.g. Delicious meals & clean room"
                                value={reviewTitle}
                                onChangeText={setReviewTitle}
                            />

                            {/* Content */}
                            <Input
                                label="Written Feedback (Min 10 characters)"
                                placeholder="Describe your stay, food quality, and amenities..."
                                multiline
                                numberOfLines={3}
                                style={{
                                    minHeight: 70,
                                    textAlignVertical: 'top',
                                }}
                                value={reviewContent}
                                onChangeText={setReviewContent}
                            />

                            <Button
                                title="Submit Verified Review"
                                variant="primary"
                                size="md"
                                loading={submittingReview}
                                onPress={handleSubmitReview}
                                style={{ marginTop: Spacing.sm }}
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    starRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    reviewedCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    reviewedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
    },
    verifiedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
    },
    ratingBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#D97706',
    },
    reviewedTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
        marginTop: 4,
    },
    reviewedContent: {
        ...Typography.bodySmall,
        color: Colors.gray700,
        fontStyle: 'italic',
        marginTop: 4,
        lineHeight: 18,
    },
    reviewedDate: {
        fontSize: 11,
        color: Colors.gray400,
        marginTop: 6,
    },
    reviewPromptCard: {
        backgroundColor: '#FFF7ED',
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    reviewPromptTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    reviewPromptDesc: {
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
    reviewModalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        maxHeight: '90%',
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
    reviewErrorBox: {
        backgroundColor: '#FFF1F2',
        padding: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFE4E6',
        marginBottom: Spacing.sm,
    },
    reviewErrorText: {
        fontSize: 12,
        color: '#E11D48',
        fontWeight: '600',
    },
    ratingCategoryBlock: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.sm,
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 8,
    },
    ratingCategoryTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.deepPlum,
        marginBottom: 6,
    },
    subRatingsGrid: {
        backgroundColor: Colors.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.gray200,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    subRatingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subRatingLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.gray700,
    },
    refundCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    refundDivider: {
        height: 1,
        backgroundColor: Colors.gray200,
        marginVertical: Spacing.sm,
    },
    refundItemBox: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
        marginBottom: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    refundAmountText: {
        ...Typography.labelMedium,
        fontWeight: '700',
        color: Colors.deepPlum,
    },
    refundUtrText: {
        ...Typography.bodySmall,
        fontSize: 11,
        color: Colors.gray600,
        marginTop: 3,
    },
    refundDateText: {
        ...Typography.bodySmall,
        fontSize: 10,
        color: Colors.gray400,
        marginTop: 2,
    },
    refundNoticeBox: {
        padding: Spacing.sm,
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.sm,
        borderLeftWidth: 3,
        borderLeftColor: Colors.coral,
    },
    refundNoticeText: {
        ...Typography.bodySmall,
        fontSize: 11,
        color: Colors.gray700,
        lineHeight: 16,
    },
});
