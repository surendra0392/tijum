import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PublicApi } from '../../../src/api/public';
import { CustomerApi } from '../../../src/api/customer';
import { RewardsApi } from '../../../src/api/rewards';
import { useAuth } from '../../../src/auth/AuthContext';
import { PointsWallet, PropertyDetail, RoomType } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { AppHeader } from '../../../src/components/AppHeader';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Badge } from '../../../src/components/Badge';
import { createUuid } from '../../../src/utils/uuid';
import {
    MapPin,
    Clock,
    Receipt,
    Tag,
    Coins,
    CheckCircle2,
    X,
} from 'lucide-react-native';

export default function CreateReservationScreen() {
    const { property_slug, property_room_type_id } = useLocalSearchParams<{
        property_id?: string;
        property_slug: string;
        property_room_type_id?: string;
    }>();
    const router = useRouter();
    const { token, authState } = useAuth();
    const [submissionToken, setSubmissionToken] = useState(createUuid);

    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [checkInDate, setCheckInDate] = useState<string>(() => {
        // Tomorrow by default
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [durationType, setDurationType] = useState<
        'daily' | 'weekly' | 'monthly'
    >('daily');
    const [durationQuantity, setDurationQuantity] = useState<string>('1');
    const [quantity, setQuantity] = useState<string>('1');
    const [guestGender, setGuestGender] = useState<'male' | 'female' | 'mixed'>(
        'male',
    );
    const [guestComposition, setGuestComposition] =
        useState<string>('individuals');

    // Rewards & Promotion State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{
        code: string;
        discount_amount_paise: number;
        offer_type: string;
        title: string;
    } | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);

    const [userWallet, setUserWallet] = useState<PointsWallet | null>(null);
    const [redeemPointsActive, setRedeemPointsActive] = useState(false);
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

    // Quote State
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [quote, setQuote] = useState<{
        base_amount_paise: number;
        coupon_discount_paise: number;
        points_discount_paise: number;
        points_redeemed: number;
        tax_amount_paise: number;
        deposit_amount_paise: number;
        total_amount_paise: number;
        points_to_earn: number;
        check_out_date: string;
    } | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);

    useEffect(() => {
        if (!token || authState !== 'customer_authenticated') {
            setUserWallet(null);
            setPointsToRedeem(0);
            setRedeemPointsActive(false);
            return;
        }

        void RewardsApi.getPointsWallet()
            .then((res) => {
                if (res.data?.wallet) {
                    setUserWallet(res.data.wallet);
                    setPointsToRedeem(
                        Math.max(0, res.data.wallet.available_points),
                    );
                }
            })
            .catch(() => {
                setUserWallet(null);
                setPointsToRedeem(0);
            });
    }, [authState, token]);

    const loadSeqRef = useRef(0);

    const loadProperty = useCallback(async () => {
        const reqId = ++loadSeqRef.current;
        try {
            setLoading(true);
            setLoadError(null);
            const effectiveSlug = property_slug || '';
            const res = await PublicApi.getProperty(effectiveSlug);
            if (reqId !== loadSeqRef.current) {
                return;
            }
            if (res.data) {
                setProperty(res.data);
                const rooms = res.data.room_types || [];
                const requestedId = property_room_type_id
                    ? Number(property_room_type_id)
                    : NaN;
                const matchedRoom = Number.isFinite(requestedId)
                    ? rooms.find((r: RoomType) => r.id === requestedId)
                    : undefined;
                if (matchedRoom) {
                    setSelectedRoomId(matchedRoom.id);
                } else if (rooms.length > 0) {
                    setSelectedRoomId(rooms[0].id);
                } else {
                    setSelectedRoomId(null);
                }
            } else {
                setProperty(null);
                setSelectedRoomId(null);
                setLoadError('Property details could not be loaded.');
            }
        } catch (err: any) {
            if (reqId !== loadSeqRef.current) {
                return;
            }
            setProperty(null);
            setSelectedRoomId(null);
            setLoadError(
                err?.message || 'Unable to load property details right now.',
            );
        } finally {
            if (reqId === loadSeqRef.current) {
                setLoading(false);
            }
        }
    }, [property_slug, property_room_type_id]);

    useEffect(() => {
        setSubmissionToken(createUuid());
        void loadProperty();
    }, [loadProperty]);

    // Rotate submission token whenever booking parameters change so a fresh intent is formed
    useEffect(() => {
        setSubmissionToken(createUuid());
    }, [
        selectedRoomId,
        checkInDate,
        durationType,
        durationQuantity,
        quantity,
        guestGender,
        guestComposition,
        appliedCoupon?.code,
        redeemPointsActive,
    ]);

    const selectedRoom: RoomType | null = useMemo(
        () =>
            property?.room_types.find((r: RoomType) => r.id === selectedRoomId) ??
            null,
        [property, selectedRoomId],
    );

    const allowedGenders = useMemo(
        () =>
            selectedRoom?.allowed_guest_genders?.length
                ? selectedRoom.allowed_guest_genders
                : [
                      { value: 'male' as const, label: 'Male' },
                      { value: 'female' as const, label: 'Female' },
                      { value: 'mixed' as const, label: 'Mixed' },
                  ],
        [selectedRoom],
    );

    const allowedCompositions = useMemo(
        () =>
            selectedRoom?.allowed_guest_compositions?.length
                ? selectedRoom.allowed_guest_compositions
                : [{ value: 'individuals', label: 'Individual' }],
        [selectedRoom],
    );

    useEffect(() => {
        if (!selectedRoom) return;
        setGuestGender((prev) =>
            allowedGenders.some((g) => g.value === prev)
                ? prev
                : allowedGenders[0].value,
        );
        setGuestComposition((prev) =>
            allowedCompositions.some((c) => c.value === prev)
                ? prev
                : selectedRoom.default_guest_composition ||
                  allowedCompositions[0].value,
        );
    }, [selectedRoom, allowedGenders, allowedCompositions]);

    // Debounced Authoritative Backend Quote Calculation
    useEffect(() => {
        if (!property || !selectedRoomId) return;

        let isCurrent = true;
        const durCount = Math.max(1, parseInt(durationQuantity, 10) || 1);
        const count = Math.max(1, parseInt(quantity, 10) || 1);

        const roomMatch = property.room_types.find(
            (r: RoomType) => r.id === selectedRoomId,
        );
        if (!roomMatch) return;

        const calculateAuthoritativeQuote = async () => {
            try {
                setQuoteLoading(true);
                setQuoteError(null);
                const quotePayload = {
                    property_room_type_id: selectedRoomId,
                    check_in_date: checkInDate.trim(),
                    duration_type: durationType,
                    duration_quantity: durCount,
                    quantity: count,
                };
                const quoteRes =
                    authState === 'customer_authenticated' && token
                        ? await CustomerApi.quoteReservation(
                              property.id,
                              quotePayload,
                          )
                        : await PublicApi.quoteStay(property.id, quotePayload);

                if (!isCurrent) return;

                if (quoteRes.data?.quote) {
                    const qData = quoteRes.data.quote;
                    const subtotalPaise = qData.total_amount_minor;
                    const taxPaise = 0;
                    const depositPaise = 0;
                    const checkOutDateStr = qData.check_out_date;

                    let couponDiscount = 0;
                    let pointsDiscount = 0;
                    let pointsRedeemed = 0;
                    let totalPaise = subtotalPaise + taxPaise + depositPaise;
                    let pointsToEarn = 0;

                    if (
                        authState === 'customer_authenticated' &&
                        token &&
                        (appliedCoupon ||
                            (redeemPointsActive && pointsToRedeem > 0))
                    ) {
                        const promoRes = await RewardsApi.quotePromotions({
                            property_id: property.id,
                            subtotal_paise: subtotalPaise,
                            tax_amount_paise: taxPaise,
                            deposit_amount_paise: depositPaise,
                            coupon_code: appliedCoupon?.code,
                            points_to_redeem: redeemPointsActive
                                ? pointsToRedeem
                                : 0,
                        });
                        if (!isCurrent) return;
                        if (promoRes.data) {
                            couponDiscount =
                                promoRes.data.coupon_discount_paise ?? 0;
                            pointsDiscount =
                                promoRes.data.points_discount_paise ?? 0;
                            pointsRedeemed = promoRes.data.points_redeemed ?? 0;
                            totalPaise =
                                promoRes.data.final_payable_paise ?? totalPaise;
                            pointsToEarn =
                                promoRes.data.points_to_earn_on_completion ?? 0;
                        }
                    }

                    setQuote({
                        base_amount_paise: subtotalPaise,
                        coupon_discount_paise: couponDiscount,
                        points_discount_paise: pointsDiscount,
                        points_redeemed: pointsRedeemed,
                        tax_amount_paise: taxPaise,
                        deposit_amount_paise: depositPaise,
                        total_amount_paise: totalPaise,
                        points_to_earn: pointsToEarn,
                        check_out_date: checkOutDateStr,
                    });
                }
            } catch (quoteLoadError: unknown) {
                if (!isCurrent) return;
                setQuote(null);
                setQuoteError(
                    quoteLoadError instanceof Error
                        ? quoteLoadError.message
                        : 'Unable to calculate an authoritative stay quote.',
                );
            } finally {
                if (isCurrent) {
                    setQuoteLoading(false);
                }
            }
        };

        const timer = setTimeout(() => {
            void calculateAuthoritativeQuote();
        }, 350);

        return () => {
            isCurrent = false;
            clearTimeout(timer);
        };
    }, [
        property,
        selectedRoomId,
        durationType,
        durationQuantity,
        quantity,
        checkInDate,
        appliedCoupon,
        redeemPointsActive,
        pointsToRedeem,
        authState,
        token,
    ]);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponError('Please enter a coupon code.');
            return;
        }

        setCouponLoading(true);
        setCouponError(null);
        try {
            const subtotalPaise = quote?.base_amount_paise || 0;
            const res = await RewardsApi.validateCoupon(
                couponCode.trim().toUpperCase(),
                subtotalPaise,
                property?.id,
            );

            if (res.data?.valid && res.data.coupon) {
                const c = res.data.coupon;
                let discountPaise = res.data.discount_amount_paise || 0;
                if (!discountPaise) {
                    if (
                        c.offer_type === 'percentage' &&
                        c.discount_percentage
                    ) {
                        discountPaise = Math.round(
                            (subtotalPaise * c.discount_percentage) / 100,
                        );
                        if (
                            c.max_discount_paise &&
                            discountPaise > c.max_discount_paise
                        ) {
                            discountPaise = c.max_discount_paise;
                        }
                    } else if (c.discount_amount_paise) {
                        discountPaise = c.discount_amount_paise;
                    }
                }
                setAppliedCoupon({
                    code: c.code,
                    discount_amount_paise: discountPaise,
                    offer_type: c.offer_type,
                    title: c.title,
                });
                Alert.alert(
                    'Coupon Applied!',
                    `Saved ₹${Math.round(discountPaise / 100)} with ${c.code}`,
                );
            } else {
                setCouponError(
                    res.data?.message || 'Invalid or expired coupon code.',
                );
            }
        } catch (err: any) {
            const serverMessage =
                err?.response?.data?.message ||
                err?.message ||
                'Unable to validate coupon. Please try again.';
            setCouponError(serverMessage);
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError(null);
    };

    const handleSubmit = async () => {
        if (!property || !selectedRoomId) {
            Alert.alert('Required', 'Please select a room category.');
            return;
        }

        if (!quote) {
            Alert.alert(
                'Quote Required',
                'Wait for an authoritative quote before requesting this reservation.',
            );
            return;
        }

        if (!token || authState !== 'customer_authenticated') {
            Alert.alert(
                'Sign In Required',
                'Please sign in to your customer account to complete your reservation.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Sign In',
                        onPress: () => router.push('/(auth)/customer-login'),
                    },
                ],
            );
            return;
        }

        try {
            setSubmitting(true);
            const requestedQuantity = Math.max(
                1,
                parseInt(quantity, 10) || 1,
            );
            const res = await CustomerApi.createReservation({
                submission_token: submissionToken,
                property_id: property.id,
                property_room_type_id: selectedRoomId,
                check_in_date: checkInDate.trim(),
                duration_type: durationType,
                duration_quantity: Math.max(
                    1,
                    parseInt(durationQuantity, 10) || 1,
                ),
                quantity: requestedQuantity,
                guest_count: requestedQuantity,
                guest_gender: guestGender,
                guest_composition: guestComposition,
                coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
                points_to_redeem:
                    redeemPointsActive && quote?.points_redeemed
                        ? quote.points_redeemed
                        : undefined,
            });

            if (res.data) {
                const targetReference =
                    res.data.reference ?? res.data.booking_reference;
                const isConfirmed = res.data.status === 'confirmed';

                Alert.alert(
                    isConfirmed
                        ? 'Reservation Confirmed!'
                        : 'Reservation Created!',
                    isConfirmed
                        ? 'Your reservation has been confirmed. You can review your booking details anytime.'
                        : 'Your room inventory is held for 15 minutes. Please complete payment to confirm your stay.',
                    [
                        {
                            text: isConfirmed
                                ? 'View Booking'
                                : 'Proceed to Payment',
                            onPress: () =>
                                router.replace(
                                    `/(customer)/bookings/${targetReference}`,
                                ),
                        },
                    ],
                );
            }
        } catch (e: any) {
            setSubmissionToken(createUuid());
            Alert.alert(
                'Booking Error',
                e.message || 'Failed to submit reservation request.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <AppHeader title="Confirm Booking" showBack />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.deepPlum} />
                    <Text style={styles.loadingText}>
                        Preparing booking request...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!property) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom']}>
                <AppHeader title="Confirm Booking" showBack />
                <View style={styles.center}>
                    <Text style={styles.errorText}>
                        {loadError || 'Property details unavailable.'}
                    </Text>
                    <Button
                        title="Retry"
                        onPress={() => void loadProperty()}
                        style={{ marginTop: Spacing.md }}
                    />
                    <Button
                        title="Go Back"
                        variant="outline"
                        onPress={() => router.back()}
                        style={{ marginTop: Spacing.sm }}
                    />
                </View>
            </SafeAreaView>
        );
    }

    const addressText = [
        property.address_line_1 ||
            property.address_line1 ||
            property.locality ||
            '',
        property.city?.name ?? '',
    ]
        .filter(Boolean)
        .join(', ');

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <AppHeader title="Confirm Booking" showBack />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.contentPadding}>
                        {/* Property Summary */}
                        <View style={styles.headerBox}>
                            <Text style={styles.propertyName}>
                                {property.name}
                            </Text>
                            {addressText ? (
                                <View style={styles.addressRow}>
                                    <MapPin
                                        size={12}
                                        color={Colors.gray600}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={styles.propertyAddress}>
                                        {addressText}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                    {/* Stay Timing Policy Notice */}
                    <View style={styles.timingNotice}>
                        <Clock
                            size={18}
                            color={Colors.amber}
                            style={{ marginRight: Spacing.sm }}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.timingTitle}>
                                Standard Stay Timing Policy
                            </Text>
                            <Text style={styles.timingText}>
                                Check-in starts at 09:00 AM • Checkout by 08:00
                                AM
                            </Text>
                        </View>
                    </View>

                    {/* Select Room Type */}
                    <Text style={styles.sectionTitle}>
                        1. Select Room Category
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                        Choose your preferred room type. No bed allocation is
                        required.
                    </Text>
                    {property.room_types.map((room: RoomType) => {
                        const isSelected = selectedRoomId === room.id;
                        return (
                            <TouchableOpacity
                                key={room.id}
                                style={[
                                    styles.roomSelectCard,
                                    isSelected && styles.roomSelectCardActive,
                                ]}
                                onPress={() => setSelectedRoomId(room.id)}
                            >
                                <View style={styles.rowBetween}>
                                    <Text
                                        style={[
                                            styles.roomTitle,
                                            isSelected && styles.textActive,
                                        ]}
                                    >
                                        {room.name}
                                    </Text>
                                    <Badge
                                        label={
                                            room.sharing_type ||
                                            room.accommodation_mode
                                        }
                                        variant={
                                            isSelected ? 'accent' : 'secondary'
                                        }
                                    />
                                </View>
                                <Text style={styles.roomPricing}>
                                    ₹
                                    {(
                                        room.price_daily_paise / 100
                                    ).toLocaleString('en-IN')}
                                    /day • ₹
                                    {(
                                        room.price_monthly_paise / 100
                                    ).toLocaleString('en-IN')}
                                    /mo
                                </Text>
                            </TouchableOpacity>
                        );
                    })}

                    {/* Dates & Duration */}
                    <Text
                        style={[styles.sectionTitle, { marginTop: Spacing.lg }]}
                    >
                        2. Dates & Duration
                    </Text>
                    <Input
                        label="Check-in Date (YYYY-MM-DD)"
                        testID="booking-check-in-date-input"
                        value={checkInDate}
                        onChangeText={setCheckInDate}
                        placeholder="e.g. 2026-12-01"
                    />

                    <Text style={styles.fieldLabel}>Duration Plan</Text>
                    <View style={styles.chipRow}>
                        {(['daily', 'weekly', 'monthly'] as const).map(
                            (type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.chip,
                                        durationType === type &&
                                            styles.chipActive,
                                    ]}
                                    onPress={() => setDurationType(type)}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            durationType === type &&
                                                styles.chipTextActive,
                                        ]}
                                    >
                                        {type.charAt(0).toUpperCase() +
                                            type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ),
                        )}
                    </View>

                    <Input
                        label={`Number of ${durationType === 'daily' ? 'Days' : durationType === 'weekly' ? 'Weeks' : 'Months'}`}
                        value={durationQuantity}
                        onChangeText={setDurationQuantity}
                        keyboardType="numeric"
                    />

                    <Input
                        label={
                            selectedRoom?.pricing_basis === 'per_guest'
                                ? 'Number of Guests'
                                : 'Number of Rooms'
                        }
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                    />

                    {/* Guest Profile */}
                    <Text
                        style={[styles.sectionTitle, { marginTop: Spacing.lg }]}
                    >
                        3. Guest Details
                    </Text>
                    <Text style={styles.fieldLabel}>Guest Gender</Text>
                    <View style={styles.chipRow}>
                        {allowedGenders.map((genderOpt) => (
                            <TouchableOpacity
                                key={genderOpt.value}
                                style={[
                                    styles.chip,
                                    guestGender === genderOpt.value &&
                                        styles.chipActive,
                                ]}
                                onPress={() => setGuestGender(genderOpt.value)}
                                accessibilityRole="button"
                                accessibilityState={{
                                    selected: guestGender === genderOpt.value,
                                }}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        guestGender === genderOpt.value &&
                                            styles.chipTextActive,
                                    ]}
                                >
                                    {genderOpt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text
                        style={[styles.fieldLabel, { marginTop: Spacing.sm }]}
                    >
                        Guest Composition
                    </Text>
                    <View style={styles.chipRow}>
                        {allowedCompositions.map((compOpt) => (
                            <TouchableOpacity
                                key={compOpt.value}
                                style={[
                                    styles.chip,
                                    guestComposition === compOpt.value &&
                                        styles.chipActive,
                                ]}
                                onPress={() =>
                                    setGuestComposition(compOpt.value)
                                }
                                accessibilityRole="button"
                                accessibilityState={{
                                    selected:
                                        guestComposition === compOpt.value,
                                }}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        guestComposition === compOpt.value &&
                                            styles.chipTextActive,
                                    ]}
                                >
                                    {compOpt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Section 4: Coupons & Loyalty Rewards */}
                    <Text
                        style={[styles.sectionTitle, { marginTop: Spacing.lg }]}
                    >
                        4. Offers & Loyalty Points
                    </Text>

                    {/* Coupon Promo Code Box */}
                    <View style={styles.promoCard}>
                        <View style={styles.promoHeader}>
                            <Tag
                                size={16}
                                color={Colors.deepPlum}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={styles.promoTitle}>
                                Have a Coupon or Promo Code?
                            </Text>
                        </View>

                        {appliedCoupon ? (
                            <View style={styles.appliedCouponBox}>
                                <View style={styles.appliedCouponLeft}>
                                    <CheckCircle2
                                        size={18}
                                        color="#059669"
                                        style={{ marginRight: 8 }}
                                    />
                                    <View>
                                        <Text style={styles.appliedCouponCode}>
                                            {appliedCoupon.code}
                                        </Text>
                                        <Text style={styles.appliedCouponDesc}>
                                            Saved ₹
                                            {Math.round(
                                                appliedCoupon.discount_amount_paise /
                                                    100,
                                            )}{' '}
                                            ({appliedCoupon.title})
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeCouponBtn}
                                    onPress={handleRemoveCoupon}
                                >
                                    <X size={16} color={Colors.rose} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                <View style={styles.couponInputRow}>
                                    <View style={{ flex: 1 }}>
                                        <Input
                                            placeholder="Enter promo code"
                                            value={couponCode}
                                            onChangeText={setCouponCode}
                                            autoCapitalize="characters"
                                            editable={
                                                authState ===
                                                'customer_authenticated'
                                            }
                                            style={{ marginBottom: 0 }}
                                        />
                                    </View>
                                    <Button
                                        title="Apply"
                                        variant="primary"
                                        loading={couponLoading}
                                        disabled={
                                            authState !==
                                            'customer_authenticated'
                                        }
                                        onPress={handleApplyCoupon}
                                        style={styles.applyCouponBtn}
                                    />
                                </View>
                                {couponError && (
                                    <Text style={styles.couponErrorText}>
                                        {couponError}
                                    </Text>
                                )}
                                <Text style={styles.couponHintText}>
                                    {authState === 'customer_authenticated'
                                        ? 'Enter a valid promo code or browse Rewards > Coupons for eligible offers.'
                                        : 'Sign in as a customer to validate coupon codes and redeem loyalty points.'}
                                </Text>
                            </View>
                        )}

                        <View style={styles.promoDivider} />

                        {/* Loyalty Points Redemption */}
                        <View style={styles.pointsRedeemRow}>
                            <View style={{ flex: 1, marginRight: Spacing.md }}>
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Coins
                                        size={16}
                                        color="#F59E0B"
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={styles.pointsRedeemTitle}>
                                        Redeem Loyalty Points
                                    </Text>
                                </View>
                                <Text style={styles.pointsRedeemSubtitle}>
                                    Balance: {userWallet?.available_points || 0}{' '}
                                    pts (≈ ₹
                                    {userWallet?.estimated_inr_value?.toFixed(
                                        2,
                                    ) || '0.00'}
                                    )
                                </Text>
                            </View>
                            <Switch
                                value={redeemPointsActive}
                                disabled={
                                    authState !== 'customer_authenticated' ||
                                    !userWallet ||
                                    userWallet.available_points <= 0
                                }
                                onValueChange={(val: boolean) => {
                                    setRedeemPointsActive(val);
                                    if (val && userWallet) {
                                        setPointsToRedeem(
                                            Math.max(
                                                0,
                                                userWallet.available_points,
                                            ),
                                        );
                                    }
                                }}
                                trackColor={{
                                    false: Colors.gray300,
                                    true: '#F59E0B',
                                }}
                                thumbColor={Colors.white}
                            />
                        </View>

                        {redeemPointsActive &&
                            userWallet &&
                            userWallet.available_points > 0 && (
                                <View style={styles.pointsActiveBox}>
                                    <Text style={styles.pointsActiveText}>
                                        Redeeming {quote?.points_redeemed || 0}{' '}
                                        points saves ₹
                                        {Math.round(
                                            (quote?.points_discount_paise ||
                                                0) / 100,
                                        )}{' '}
                                        at checkout!
                                    </Text>
                                </View>
                            )}
                    </View>

                    {/* Summary / Price Quotation */}
                    {quoteLoading && !quote ? (
                        <View style={styles.quoteCard}>
                            <ActivityIndicator
                                size="small"
                                color={Colors.deepPlum}
                            />
                            <Text
                                style={[
                                    styles.quoteLabel,
                                    { textAlign: 'center', marginTop: 4 },
                                ]}
                            >
                                Calculating authoritative quote...
                            </Text>
                        </View>
                    ) : quote ? (
                        <View style={styles.quoteCard}>
                            <View style={styles.quoteTitleRow}>
                                <Receipt
                                    size={16}
                                    color={Colors.deepPlum}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={styles.quoteTitle}>
                                    Estimated Summary
                                </Text>
                            </View>
                            <View style={styles.quoteRow}>
                                <Text style={styles.quoteLabel}>
                                    Estimated Checkout:
                                </Text>
                                <Text style={styles.quoteValue}>
                                    {quote.check_out_date} (08:00 AM)
                                </Text>
                            </View>
                            <View style={styles.quoteRow}>
                                <Text style={styles.quoteLabel}>
                                    Stay Charge (Subtotal):
                                </Text>
                                <Text style={styles.quoteValue}>
                                    ₹
                                    {(
                                        quote.base_amount_paise / 100
                                    ).toLocaleString('en-IN')}
                                </Text>
                            </View>

                            {/* Coupon Discount Row */}
                            {quote.coupon_discount_paise > 0 ? (
                                <View style={styles.quoteRow}>
                                    <Text
                                        style={[
                                            styles.quoteLabel,
                                            {
                                                color: '#059669',
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        Coupon Discount ({appliedCoupon?.code}):
                                    </Text>
                                    <Text
                                        style={[
                                            styles.quoteValue,
                                            {
                                                color: '#059669',
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        -₹
                                        {(
                                            quote.coupon_discount_paise / 100
                                        ).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Points Discount Row */}
                            {quote.points_discount_paise > 0 ? (
                                <View style={styles.quoteRow}>
                                    <Text
                                        style={[
                                            styles.quoteLabel,
                                            {
                                                color: '#D97706',
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        Points Redeemed ({quote.points_redeemed}{' '}
                                        pts):
                                    </Text>
                                    <Text
                                        style={[
                                            styles.quoteValue,
                                            {
                                                color: '#D97706',
                                                fontWeight: '700',
                                            },
                                        ]}
                                    >
                                        -₹
                                        {(
                                            quote.points_discount_paise / 100
                                        ).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ) : null}

                            {quote.deposit_amount_paise > 0 ? (
                                <View style={styles.quoteRow}>
                                    <Text style={styles.quoteLabel}>
                                        Security Deposit:
                                    </Text>
                                    <Text style={styles.quoteValue}>
                                        ₹
                                        {(
                                            quote.deposit_amount_paise / 100
                                        ).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ) : null}

                            <View
                                style={[styles.quoteRow, styles.quoteTotalRow]}
                            >
                                <Text style={styles.quoteTotalLabel}>
                                    Total Payable:
                                </Text>
                                <Text style={styles.quoteTotalValue}>
                                    ₹
                                    {(
                                        quote.total_amount_paise / 100
                                    ).toLocaleString('en-IN')}
                                </Text>
                            </View>

                            {/* Points to Earn Badge */}
                            {quote.points_to_earn > 0 ? (
                                <View style={styles.earnBadgeRow}>
                                    <Coins
                                        size={14}
                                        color="#F59E0B"
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={styles.earnBadgeText}>
                                        You will earn +{quote.points_to_earn}{' '}
                                        loyalty points on this stay!
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    ) : quoteError ? (
                        <View style={styles.quoteErrorCard}>
                            <Text style={styles.quoteErrorText}>
                                {quoteError}
                            </Text>
                        </View>
                    ) : null}

                    <Button
                        testID="booking-submit-button"
                        title={
                            authState === 'customer_authenticated'
                                ? 'Request Reservation'
                                : 'Sign In to Book'
                        }
                        loading={submitting}
                        disabled={!quote || quoteLoading}
                        onPress={handleSubmit}
                        style={{ marginTop: Spacing.xl }}
                    />
                </View>
            </ScrollView>
            </KeyboardAvoidingView>
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
    headerBox: {
        backgroundColor: Colors.warmOffWhite,
        padding: Spacing.md,
        borderRadius: 10,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    propertyName: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    propertyAddress: {
        ...Typography.bodySmall,
        color: Colors.gray600,
    },
    timingNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FEF3C7',
        marginBottom: Spacing.lg,
    },
    timingIcon: {
        fontSize: 22,
        marginRight: Spacing.sm,
    },
    timingTitle: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    timingText: {
        ...Typography.bodySmall,
        color: Colors.gray700,
    },
    sectionTitle: {
        ...Typography.titleSmall,
        color: Colors.deepPlum,
        marginBottom: 4,
    },
    sectionSubtitle: {
        ...Typography.bodySmall,
        color: Colors.gray500,
        marginBottom: Spacing.sm,
    },
    roomSelectCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 8,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginBottom: Spacing.sm,
    },
    roomSelectCardActive: {
        borderColor: Colors.coral,
        backgroundColor: '#FFF5F5',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    roomTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    textActive: {
        color: Colors.coralDark,
        fontWeight: '700',
    },
    roomPricing: {
        ...Typography.bodySmall,
        color: Colors.gray600,
        marginTop: 4,
    },
    fieldLabel: {
        ...Typography.labelSmall,
        color: Colors.deepPlum,
        marginBottom: Spacing.xs,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    chip: {
        minHeight: 44,
        justifyContent: 'center',
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
        backgroundColor: Colors.gray100,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    chipActive: {
        backgroundColor: Colors.coral,
        borderColor: Colors.coral,
    },
    chipText: {
        ...Typography.labelSmall,
        color: Colors.gray700,
    },
    chipTextActive: {
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    quoteCard: {
        backgroundColor: Colors.warmOffWhite,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginTop: Spacing.lg,
        gap: 6,
    },
    quoteErrorCard: {
        backgroundColor: Colors.dangerLight,
        borderColor: Colors.danger,
        borderRadius: 10,
        borderWidth: 1,
        padding: Spacing.md,
    },
    quoteErrorText: {
        color: Colors.dangerText,
        fontSize: 13,
        lineHeight: 19,
    },
    quoteTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    quoteTitle: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
        fontWeight: '700',
    },
    quoteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    quoteLabel: {
        ...Typography.bodySmall,
        color: Colors.gray500,
    },
    quoteValue: {
        ...Typography.bodySmall,
        color: Colors.deepPlum,
        fontWeight: '600',
    },
    quoteTotalRow: {
        borderTopWidth: 1,
        borderTopColor: Colors.gray200,
        paddingTop: 8,
        marginTop: 4,
    },
    quoteTotalLabel: {
        ...Typography.labelMedium,
        color: Colors.deepPlum,
    },
    quoteTotalValue: {
        ...Typography.titleSmall,
        color: Colors.coralDark,
        fontWeight: '800',
    },
    earnBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderRadius: 6,
        marginTop: 6,
    },
    earnBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#92400E',
    },
    promoCard: {
        backgroundColor: Colors.white,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.gray200,
        marginTop: Spacing.xs,
        marginBottom: Spacing.xs,
    },
    promoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    promoTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.deepPlum,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    appliedCouponBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
        borderRadius: 8,
        padding: Spacing.sm,
    },
    appliedCouponLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    appliedCouponCode: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '800',
        color: '#065F46',
    },
    appliedCouponDesc: {
        fontSize: 10,
        color: '#047857',
        marginTop: 1,
    },
    removeCouponBtn: {
        padding: 4,
    },
    couponInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    applyCouponBtn: {
        paddingHorizontal: Spacing.lg,
        minWidth: 80,
    },
    couponErrorText: {
        fontSize: 11,
        color: Colors.rose,
        marginTop: 4,
        fontWeight: '600',
    },
    couponHintText: {
        fontSize: 10,
        color: Colors.gray500,
        marginTop: 4,
    },
    promoDivider: {
        height: 1,
        backgroundColor: Colors.gray200,
        marginVertical: Spacing.md,
    },
    pointsRedeemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pointsRedeemTitle: {
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        color: Colors.gray900,
    },
    pointsRedeemSubtitle: {
        fontSize: 11,
        color: Colors.gray500,
        marginTop: 2,
    },
    pointsActiveBox: {
        backgroundColor: '#FEF3C7',
        borderRadius: 6,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        marginTop: Spacing.sm,
    },
    pointsActiveText: {
        fontSize: 11,
        color: '#92400E',
        fontWeight: '600',
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
        color: Colors.coralDark,
        textAlign: 'center',
    },
});
