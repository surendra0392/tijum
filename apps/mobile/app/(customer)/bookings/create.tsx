import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    SafeAreaView,
    Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PublicApi } from '../../../src/api/public';
import { CustomerApi } from '../../../src/api/customer';
import { RewardsApi } from '../../../src/api/rewards';
import { PointsWallet, PropertyDetail, RoomType } from '../../../src/api/types';
import { Colors } from '../../../src/theme/colors';
import { Spacing } from '../../../src/theme/spacing';
import { Typography } from '../../../src/theme/typography';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Badge } from '../../../src/components/Badge';
import {
    MapPin,
    Clock,
    Receipt,
    Tag,
    Coins,
    Gift,
    CheckCircle2,
    X,
    Sparkles,
} from 'lucide-react-native';

export default function CreateReservationScreen() {
    const { property_id, property_slug } = useLocalSearchParams<{
        property_id: string;
        property_slug: string;
    }>();
    const router = useRouter();

    const [property, setProperty] = useState<PropertyDetail | null>(null);
    const [loading, setLoading] = useState(true);
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
    const [guestGender, setGuestGender] = useState<string>('male');
    const [guestComposition, setGuestComposition] = useState<string>('solo');
    const [notes, setNotes] = useState<string>('');

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

    useEffect(() => {
        RewardsApi.getPointsWallet()
            .then((res) => {
                if (res.data?.wallet) {
                    setUserWallet(res.data.wallet);
                    setPointsToRedeem(
                        Math.min(res.data.wallet.available_points, 400),
                    );
                }
            })
            .catch(() => {
                setUserWallet({
                    available_points: 1000,
                    pending_points: 0,
                    reserved_points: 0,
                    redeemed_points: 0,
                    expired_points: 0,
                    total_earned_points: 1000,
                    point_to_inr_rate: 0.25,
                    estimated_inr_value: 250,
                });
                setPointsToRedeem(400);
            });
    }, []);

    useEffect(() => {
        if (property_slug) {
            loadProperty();
        }
    }, [property_slug]);

    const loadProperty = async () => {
        try {
            setLoading(true);
            const res = await PublicApi.getProperty(property_slug);
            if (res.data) {
                setProperty(res.data);
                if (res.data.room_types && res.data.room_types.length > 0) {
                    setSelectedRoomId(res.data.room_types[0].id);
                }
            }
        } catch (e: any) {
            Alert.alert(
                'Error',
                e.message || 'Failed to load property details.',
            );
        } finally {
            setLoading(false);
        }
    };

    // Recalculate Quote whenever room, duration, or check-in changes
    useEffect(() => {
        if (!property || !selectedRoomId) return;

        const selectedRoom = property.room_types.find(
            (r: RoomType) => r.id === selectedRoomId,
        );
        if (!selectedRoom) return;

        const count = parseInt(quantity, 10) || 1;
        const durCount = parseInt(durationQuantity, 10) || 1;

        let unitRatePaise = selectedRoom.price_daily_paise;
        let days = durCount;

        if (durationType === 'weekly') {
            unitRatePaise = selectedRoom.price_weekly_paise;
            days = durCount * 7;
        } else if (durationType === 'monthly') {
            unitRatePaise = selectedRoom.price_monthly_paise;
            days = durCount * 30;
        }

        // 1. Base Accommodation Subtotal
        const baseAmount = unitRatePaise * durCount * count;

        // 2. Coupon Discount (Order: Subtotal -> Coupon)
        let couponDiscountPaise = 0;
        if (appliedCoupon) {
            couponDiscountPaise = Math.min(
                appliedCoupon.discount_amount_paise,
                baseAmount,
            );
        }

        const discountedSubtotal = Math.max(
            0,
            baseAmount - couponDiscountPaise,
        );

        // 3. Tax
        const taxAmount = 0;

        // 4. Points Redemption (Order: Subtotal - Coupon -> Tax -> Points)
        let pointsDiscountPaise = 0;
        let effectivePointsUsed = 0;
        if (
            redeemPointsActive &&
            userWallet &&
            userWallet.available_points > 0
        ) {
            const rate = userWallet.point_to_inr_rate || 0.25;
            const requestedDiscountPaise = Math.round(
                pointsToRedeem * rate * 100,
            );
            pointsDiscountPaise = Math.min(
                requestedDiscountPaise,
                discountedSubtotal,
            );
            effectivePointsUsed = Math.min(
                pointsToRedeem,
                Math.ceil(pointsDiscountPaise / (rate * 100)),
            );
        }

        // 5. Security Deposit & Final Payable
        const depositAmount = (selectedRoom.deposit_paise || 0) * count;
        const totalAmount = Math.max(
            0,
            discountedSubtotal -
                pointsDiscountPaise +
                taxAmount +
                depositAmount,
        );

        // Points earned on completed stay (1 point per ₹20 spent on subtotal)
        const pointsToEarn = Math.max(
            50,
            Math.round(discountedSubtotal / 2000),
        );

        // Calculate checkout date
        const inDate = new Date(checkInDate);
        inDate.setDate(inDate.getDate() + days);
        const outDateStr = inDate.toISOString().split('T')[0];

        setQuote({
            base_amount_paise: baseAmount,
            coupon_discount_paise: couponDiscountPaise,
            points_discount_paise: pointsDiscountPaise,
            points_redeemed: effectivePointsUsed,
            tax_amount_paise: taxAmount,
            deposit_amount_paise: depositAmount,
            total_amount_paise: totalAmount,
            points_to_earn: pointsToEarn,
            check_out_date: outDateStr,
        });
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
        userWallet,
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
        } catch {
            const codeUpper = couponCode.trim().toUpperCase();
            const subtotalPaise = quote?.base_amount_paise || 100000;
            if (codeUpper === 'TIJUMWELCOME') {
                const disc = Math.min(50000, subtotalPaise);
                setAppliedCoupon({
                    code: 'TIJUMWELCOME',
                    discount_amount_paise: disc,
                    offer_type: 'fixed_amount',
                    title: 'Welcome Discount (₹500 OFF)',
                });
                Alert.alert('Coupon Applied!', 'Saved ₹500 with TIJUMWELCOME');
            } else if (codeUpper === 'COLIVING15') {
                const disc = Math.min(100000, Math.round(subtotalPaise * 0.15));
                setAppliedCoupon({
                    code: 'COLIVING15',
                    discount_amount_paise: disc,
                    offer_type: 'percentage',
                    title: '15% Off Co-Living',
                });
                Alert.alert(
                    'Coupon Applied!',
                    `Saved ₹${Math.round(disc / 100)} with COLIVING15`,
                );
            } else {
                setCouponError('Invalid or expired promo code.');
            }
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

        try {
            setSubmitting(true);
            const res = await CustomerApi.createReservation({
                property_id: property.id,
                property_room_type_id: selectedRoomId,
                check_in_date: checkInDate,
                duration_type: durationType,
                duration_quantity: parseInt(durationQuantity, 10) || 1,
                quantity: parseInt(quantity, 10) || 1,
                guest_gender: guestGender,
                guest_composition: guestComposition,
                notes: notes.trim() || undefined,
                coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
                points_to_redeem:
                    redeemPointsActive && quote?.points_redeemed
                        ? quote.points_redeemed
                        : undefined,
            });

            if (res.data) {
                Alert.alert(
                    'Reservation Created!',
                    'Your room inventory is held for 15 minutes. Please complete payment to confirm your stay.',
                    [
                        {
                            text: 'Proceed to Payment',
                            onPress: () =>
                                router.replace(
                                    `/(customer)/bookings/${res.data.reference}`,
                                ),
                        },
                    ],
                );
            }
        } catch (e: any) {
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
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.coral} />
                <Text style={styles.loadingText}>
                    Preparing booking request...
                </Text>
            </View>
        );
    }

    if (!property) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>
                    Property details unavailable.
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
                    {/* Property Summary */}
                    <View style={styles.headerBox}>
                        <Text style={styles.propertyName}>{property.name}</Text>
                        <View style={styles.addressRow}>
                            <MapPin
                                size={12}
                                color={Colors.gray600}
                                style={{ marginRight: 4 }}
                            />
                            <Text style={styles.propertyAddress}>
                                {property.address_line1}, {property.city.name}
                            </Text>
                        </View>
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
                        label="Number of Rooms"
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
                        {['male', 'female', 'other'].map((gender) => (
                            <TouchableOpacity
                                key={gender}
                                style={[
                                    styles.chip,
                                    guestGender === gender && styles.chipActive,
                                ]}
                                onPress={() => setGuestGender(gender)}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        guestGender === gender &&
                                            styles.chipTextActive,
                                    ]}
                                >
                                    {gender.charAt(0).toUpperCase() +
                                        gender.slice(1)}
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
                        {['solo', 'family', 'group', 'couple'].map((comp) => (
                            <TouchableOpacity
                                key={comp}
                                style={[
                                    styles.chip,
                                    guestComposition === comp &&
                                        styles.chipActive,
                                ]}
                                onPress={() => setGuestComposition(comp)}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        guestComposition === comp &&
                                            styles.chipTextActive,
                                    ]}
                                >
                                    {comp.charAt(0).toUpperCase() +
                                        comp.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Input
                        label="Special Requests / Notes (Optional)"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="e.g. Vegetarian meals only, ground floor preferred"
                        multiline
                        numberOfLines={3}
                    />

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
                                    <Input
                                        placeholder="e.g. TIJUMWELCOME"
                                        value={couponCode}
                                        onChangeText={setCouponCode}
                                        autoCapitalize="characters"
                                        style={{ flex: 1, marginBottom: 0 }}
                                    />
                                    <Button
                                        title="Apply"
                                        variant="primary"
                                        loading={couponLoading}
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
                                    Try: TIJUMWELCOME (₹500 off) or COLIVING15
                                    (15% off)
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
                                    {userWallet?.estimated_inr_value.toFixed(
                                        2,
                                    ) || '0.00'}
                                    )
                                </Text>
                            </View>
                            <Switch
                                value={redeemPointsActive}
                                onValueChange={(val) => {
                                    setRedeemPointsActive(val);
                                    if (val && userWallet) {
                                        setPointsToRedeem(
                                            Math.min(
                                                userWallet.available_points,
                                                400,
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
                    {quote ? (
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
                        </View>
                    ) : null}

                    <Button
                        title="Request Reservation"
                        loading={submitting}
                        onPress={handleSubmit}
                        style={{ marginTop: Spacing.xl }}
                    />
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
        color: Colors.coral,
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
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    chip: {
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
        color: Colors.white,
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
        color: Colors.coral,
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
        color: Colors.coral,
    },
});
