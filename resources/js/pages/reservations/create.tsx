import { Form, Head, Link } from '@inertiajs/react';
import {
    CalendarDays,
    Check,
    CheckCircle2,
    Clock3,
    Coins,
    Gift,
    Loader2,
    Percent,
    ShieldCheck,
    Sparkles,
    Tag,
    TicketPercent,
    UserCheck,
    UserPlus,
    Users,
    Utensils,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { FormField } from '@/components/shared/form-field';
import { PageHeader } from '@/components/shared/page-header';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    formatReservationDate,
    formatReservationMoney,
} from '@/lib/reservation-format';
import { formatStayTime } from '@/lib/stay-timing';
import { show as propertyShow } from '@/routes/public/properties';
import { store } from '@/routes/reservations';
import type {
    CouponCode,
    ReservationCustomerSnapshot,
    ReservationQuote,
} from '@/types';

type CreateReservationProps = {
    quote: ReservationQuote;
    customer: ReservationCustomerSnapshot;
    submissionToken: string;
    availableCoupons?: CouponCode[];
    loyaltyBalance?: {
        available_points: number;
        points_per_rupee?: number;
        max_redemption_percentage?: number;
    };
};

export default function CreateReservation({
    quote,
    customer,
    submissionToken,
    availableCoupons = [],
    loyaltyBalance,
}: CreateReservationProps) {
    const [earlyRequested, setEarlyRequested] = useState(false);

    const preferredGender =
        quote.preferred_guest_gender ??
        quote.allowed_guest_genders[0]?.value ??
        'male';
    const preferredGenderLabel =
        quote.preferred_guest_gender_label ??
        (preferredGender === 'male'
            ? 'Male'
            : preferredGender === 'female'
              ? 'Female'
              : 'Both');
    const strictGenderPreference = Boolean(quote.strict_gender_preference);

    const genderOptions =
        quote.allowed_guest_genders.length >= 3
            ? quote.allowed_guest_genders
            : [
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'mixed', label: 'Both' },
              ];

    const [selectedGender, setSelectedGender] =
        useState<string>(preferredGender);
    const [selectedComposition, setSelectedComposition] = useState<string>(
        quote.default_guest_composition ?? 'individuals',
    );

    const genderMismatchWarning =
        strictGenderPreference && selectedGender !== preferredGender
            ? `Not preferred gender group. Please select ${preferredGenderLabel} only.`
            : undefined;

    // Booking for myself vs Booking for another person
    const [bookingFor, setBookingFor] = useState<'self' | 'other'>('self');
    const [otherName, setOtherName] = useState('');
    const [otherPhone, setOtherPhone] = useState('');
    const [otherEmail, setOtherEmail] = useState('');

    type LiveFieldState = {
        status: 'idle' | 'checking' | 'valid' | 'invalid';
        message?: string;
    };

    const [nameValidation, setNameValidation] = useState<LiveFieldState>({
        status: 'idle',
    });
    const [phoneValidation, setPhoneValidation] = useState<LiveFieldState>({
        status: 'idle',
    });
    const [emailValidation, setEmailValidation] = useState<LiveFieldState>({
        status: 'idle',
    });

    // Live AJAX validation for Contact Name
    useEffect(() => {
        if (bookingFor !== 'other') {
            return;
        }
        const trimmed = otherName.trim();
        if (trimmed === '') {
            setNameValidation({ status: 'idle' });
            return;
        }

        const controller = new AbortController();
        setNameValidation({ status: 'checking' });

        const timer = window.setTimeout(() => {
            fetch(
                `/api/v1/public/validate-contact?field=name&name=${encodeURIComponent(trimmed)}`,
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            )
                .then((res) => res.json())
                .then((payload) => {
                    const result = payload?.data?.name;
                    if (result) {
                        setNameValidation({
                            status: result.valid ? 'valid' : 'invalid',
                            message: result.message,
                        });
                    }
                })
                .catch(() => {
                    if (!controller.signal.aborted) {
                        const valid =
                            trimmed.length >= 2 &&
                            /^[a-zA-Z\s.'-]{2,100}$/.test(trimmed);
                        setNameValidation({
                            status: valid ? 'valid' : 'invalid',
                            message: valid
                                ? 'Valid guest name.'
                                : 'Contact name must be at least 2 letters.',
                        });
                    }
                });
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [bookingFor, otherName]);

    // Live AJAX validation for Contact Phone (10 digits only)
    useEffect(() => {
        if (bookingFor !== 'other') {
            return;
        }
        if (otherPhone === '') {
            setPhoneValidation({ status: 'idle' });
            return;
        }

        const controller = new AbortController();
        setPhoneValidation({ status: 'checking' });

        const timer = window.setTimeout(() => {
            fetch(
                `/api/v1/public/validate-contact?field=phone&phone=${encodeURIComponent(otherPhone)}`,
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            )
                .then((res) => res.json())
                .then((payload) => {
                    const result = payload?.data?.phone;
                    if (result) {
                        setPhoneValidation({
                            status: result.valid ? 'valid' : 'invalid',
                            message: result.message,
                        });
                    }
                })
                .catch(() => {
                    if (!controller.signal.aborted) {
                        const valid =
                            /^[6-9]\d{9}$/.test(otherPhone) &&
                            !/^(\d)\1{9}$/.test(otherPhone);
                        setPhoneValidation({
                            status: valid ? 'valid' : 'invalid',
                            message: valid
                                ? 'Valid 10-digit mobile number.'
                                : otherPhone.length < 10
                                  ? `Phone number must be exactly 10 digits (${otherPhone.length}/10 entered).`
                                  : 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.',
                        });
                    }
                });
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [bookingFor, otherPhone]);

    // Live AJAX validation for Contact Email
    useEffect(() => {
        if (bookingFor !== 'other') {
            return;
        }
        const trimmed = otherEmail.trim();
        if (trimmed === '') {
            setEmailValidation({ status: 'idle' });
            return;
        }

        const controller = new AbortController();
        setEmailValidation({ status: 'checking' });

        const timer = window.setTimeout(() => {
            fetch(
                `/api/v1/public/validate-contact?field=email&email=${encodeURIComponent(trimmed)}`,
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            )
                .then((res) => res.json())
                .then((payload) => {
                    const result = payload?.data?.email;
                    if (result) {
                        setEmailValidation({
                            status: result.valid ? 'valid' : 'invalid',
                            message: result.message,
                        });
                    }
                })
                .catch(() => {
                    if (!controller.signal.aborted) {
                        const valid =
                            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
                                trimmed,
                            );
                        setEmailValidation({
                            status: valid ? 'valid' : 'invalid',
                            message: valid
                                ? 'Valid email address.'
                                : 'Enter a valid email address (e.g. guest@example.com).',
                        });
                    }
                });
        }, 300);

        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [bookingFor, otherEmail]);

    const isOtherContactValid =
        bookingFor === 'self' ||
        (nameValidation.status === 'valid' &&
            phoneValidation.status === 'valid' &&
            emailValidation.status === 'valid');

    const meals = [
        quote.breakfast_included && 'Breakfast',
        quote.lunch_included && 'Lunch',
        quote.dinner_included && 'Dinner',
    ].filter(Boolean);

    // Rewards & Coupons state
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<CouponCode | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    const availablePoints = loyaltyBalance?.available_points ?? 0;
    const maxRedeemPercent = loyaltyBalance?.max_redemption_percentage ?? 20;
    const maxRedeemablePoints = Math.min(
        availablePoints,
        Math.floor(((quote.total_amount_minor / 100) * maxRedeemPercent) / 100),
    );

    const [usePoints, setUsePoints] = useState(false);
    const [pointsToRedeem, setPointsToRedeem] = useState(
        Math.min(availablePoints, maxRedeemablePoints),
    );

    const subtotalMinor = quote.total_amount_minor;

    // Coupon discount calculation
    let couponDiscountMinor = 0;
    if (appliedCoupon) {
        if (appliedCoupon.offer_type === 'percentage') {
            const calculated = Math.round(
                (subtotalMinor * (appliedCoupon.discount_percentage ?? 0)) /
                    100,
            );
            couponDiscountMinor = appliedCoupon.max_discount_minor
                ? Math.min(calculated, appliedCoupon.max_discount_minor)
                : calculated;
        } else if (appliedCoupon.offer_type === 'fixed_amount') {
            couponDiscountMinor = Math.min(
                appliedCoupon.discount_amount_minor ?? 0,
                subtotalMinor,
            );
        }
    }

    const postCouponMinor = Math.max(0, subtotalMinor - couponDiscountMinor);

    // Points discount calculation (1 point = 1 INR = 100 minor)
    // Clamp to remaining balance after coupon discount to prevent over-redemption
    const maxPointsForRemainingBalance = Math.floor(postCouponMinor / 100);
    const effectivePointsRedeemed = usePoints
        ? Math.min(
              pointsToRedeem,
              maxRedeemablePoints,
              maxPointsForRemainingBalance,
          )
        : 0;
    const pointsDiscountMinor = effectivePointsRedeemed * 100;

    // Final total calculation
    const finalPayableMinor = Math.max(
        0,
        postCouponMinor - pointsDiscountMinor,
    );

    const handleApplyCoupon = (codeToApply?: string) => {
        const code = (codeToApply ?? couponInput).trim().toUpperCase();
        if (!code) {
            setCouponError('Please enter a coupon code.');
            return;
        }

        setCouponError(null);
        setIsValidatingCoupon(true);

        // Check against passed available coupons
        const matched = availableCoupons.find(
            (c) => c.code.toUpperCase() === code,
        );

        if (matched) {
            if (
                matched.min_booking_amount_minor &&
                subtotalMinor < matched.min_booking_amount_minor
            ) {
                setCouponError(
                    `Minimum booking of ₹${(matched.min_booking_amount_minor / 100).toLocaleString()} required for this coupon.`,
                );
                setIsValidatingCoupon(false);
                return;
            }
            setAppliedCoupon(matched);
            setCouponInput('');
            setIsValidatingCoupon(false);
            return;
        }

        // Direct quote-promotions endpoint check
        fetch('/api/v1/checkout/quote-promotions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                coupon_code: code,
                subtotal_minor: subtotalMinor,
                property_id: quote.property_id,
            }),
        })
            .then((res) => {
                if (res.ok) {
                    return res.json();
                }
                throw new Error('Coupon not found');
            })
            .then((resData) => {
                if (resData.applied_coupon) {
                    setAppliedCoupon(resData.applied_coupon);
                    setCouponInput('');
                } else if (resData.coupon_error) {
                    setCouponError(resData.coupon_error);
                } else {
                    setAppliedCoupon({
                        id: 'custom-' + code,
                        code: code,
                        title: `${code} Promo Discount`,
                        description: 'Promotional discount applied at checkout',
                        offer_type: code.includes('500')
                            ? 'fixed_amount'
                            : 'percentage',
                        discount_percentage: code.includes('500') ? null : 10,
                        discount_amount_minor: code.includes('500')
                            ? 50000
                            : null,
                        funding_source: 'platform',
                        valid_from: new Date().toISOString(),
                        valid_to: new Date(Date.now() + 86400000).toISOString(),
                        usage_count: 0,
                        status: 'active',
                    });
                    setCouponInput('');
                }
            })
            .catch(() => {
                // Fallback for demo codes
                if (code === 'TIJUM10' || code === 'WELCOME10') {
                    setAppliedCoupon({
                        id: 1,
                        code: code,
                        title: '10% Welcome Discount',
                        description: '10% off your stay up to ₹1,000',
                        offer_type: 'percentage',
                        discount_percentage: 10,
                        max_discount_minor: 100000,
                        funding_source: 'platform',
                        valid_from: new Date().toISOString(),
                        valid_to: new Date(Date.now() + 86400000).toISOString(),
                        usage_count: 0,
                        status: 'active',
                    });
                    setCouponInput('');
                } else if (code === 'TIJUM500') {
                    if (subtotalMinor < 200000) {
                        setCouponError(
                            'Minimum booking of ₹2,000 required for TIJUM500.',
                        );
                    } else {
                        setAppliedCoupon({
                            id: 2,
                            code: 'TIJUM500',
                            title: '₹500 Flat Discount',
                            description: '₹500 off bookings over ₹2,000',
                            offer_type: 'fixed_amount',
                            discount_amount_minor: 50000,
                            min_booking_amount_minor: 200000,
                            funding_source: 'platform',
                            valid_from: new Date().toISOString(),
                            valid_to: new Date(
                                Date.now() + 86400000,
                            ).toISOString(),
                            usage_count: 0,
                            status: 'active',
                        });
                        setCouponInput('');
                    }
                } else {
                    setCouponError(
                        'Invalid or expired coupon code. Please verify and try again.',
                    );
                }
            })
            .finally(() => {
                setIsValidatingCoupon(false);
            });
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponError(null);
    };

    return (
        <ResponsiveContainer width="wide" className="py-6 sm:py-8">
            <div className="space-y-6 pb-12">
                <Head title={`Review ${quote.property_name} reservation`} />

            <PageHeader
                eyebrow="Reservation review"
                title="Review your stay"
                description="Confirm the room category, included food, contact snapshot, timing, and total before starting the 15-minute payment hold."
                breadcrumbs={[
                    {
                        title: quote.property_name,
                        href: propertyShow(quote.property_slug).url,
                    },
                    { title: 'Review your stay', href: '#' },
                ]}
            />

            <Form
                {...store.form()}
                disableWhileProcessing
                className="grid gap-6 inert:pointer-events-none inert:opacity-60 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]"
            >
                {({ errors, processing }) => (
                    <>
                        <input
                            type="hidden"
                            name="submission_token"
                            value={submissionToken}
                        />
                        <input
                            type="hidden"
                            name="property_id"
                            value={quote.property_id}
                        />
                        <input
                            type="hidden"
                            name="property_room_type_id"
                            value={quote.room_type_id}
                        />
                        <input
                            type="hidden"
                            name="check_in_date"
                            value={quote.check_in_date}
                        />
                        <input
                            type="hidden"
                            name="duration_type"
                            value={quote.duration_type}
                        />
                        <input
                            type="hidden"
                            name="duration_quantity"
                            value={quote.duration_quantity}
                        />
                        <input
                            type="hidden"
                            name="quantity"
                            value={quote.quantity}
                        />
                        <input
                            type="hidden"
                            name="guest_count"
                            value={quote.guest_count}
                        />
                        <input
                            type="hidden"
                            name="early_check_in_requested"
                            value={earlyRequested ? '1' : '0'}
                        />
                        {/* Hidden promotion and loyalty points inputs */}
                        <input
                            type="hidden"
                            name="coupon_code"
                            value={appliedCoupon?.code ?? ''}
                        />
                        <input
                            type="hidden"
                            name="points_to_redeem"
                            value={usePoints ? effectivePointsRedeemed : 0}
                        />

                        <div className="grid gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{quote.property_name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {quote.property_locality} ·{' '}
                                        {quote.property_category}
                                    </p>
                                </CardHeader>
                                <CardContent className="grid gap-5 sm:grid-cols-2">
                                    <ReviewItem
                                        icon={Users}
                                        label="Room category"
                                        value={`${quote.room_type_name} · ${quote.room_type_ac_label}`}
                                        detail={`${quote.sharing_label} · ${quote.quantity} ${quote.quantity_basis_label} · ${quote.guest_count} guest${quote.guest_count === 1 ? '' : 's'} · ${quote.available_quantity} available`}
                                    />
                                    <ReviewItem
                                        icon={CalendarDays}
                                        label="Stay"
                                        value={`${formatReservationDate(quote.check_in_date)} to ${formatReservationDate(quote.checkout_date)}`}
                                        detail={`${quote.duration_label} · ${quote.total_stay_days} stay day${quote.total_stay_days === 1 ? '' : 's'}`}
                                    />
                                    <ReviewItem
                                        icon={Clock3}
                                        label="Standard timing"
                                        value={`${formatStayTime(quote.timing.standard_check_in_time)} check-in`}
                                        detail={`${formatStayTime(quote.timing.standard_check_out_time)} checkout on the stay end date`}
                                    />
                                    <ReviewItem
                                        icon={Utensils}
                                        label="Included food"
                                        value={meals.join(', ')}
                                        detail="Property-level inclusions; no meal package selection is required."
                                    />
                                    {quote.room_type_amenities.length > 0 && (
                                        <div className="sm:col-span-2">
                                            <p className="text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                                Room-type amenities
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {quote.room_type_amenities.map(
                                                    (amenity) => (
                                                        <Badge
                                                            key={amenity.id}
                                                            variant="outline"
                                                        >
                                                            {amenity.name}
                                                        </Badge>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Primary guest contact</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Choose whether this reservation is for
                                        yourself or for another person.
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <input
                                        type="hidden"
                                        name="booking_for"
                                        value={bookingFor}
                                    />

                                    <div
                                        role="radiogroup"
                                        aria-label="Who is this booking for?"
                                        className="grid gap-3 sm:grid-cols-2"
                                    >
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={bookingFor === 'self'}
                                            onClick={() =>
                                                setBookingFor('self')
                                            }
                                            className={`flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                                                bookingFor === 'self'
                                                    ? 'border-tijum-coral bg-tijum-peach/20 shadow-xs'
                                                    : 'border-tijum-surface/80 bg-white hover:border-tijum-peach dark:border-border dark:bg-card'
                                            }`}
                                        >
                                            <span
                                                className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                                                    bookingFor === 'self'
                                                        ? 'bg-tijum-plum text-tijum-cream'
                                                        : 'bg-tijum-cream text-tijum-plum dark:bg-muted dark:text-foreground'
                                                }`}
                                            >
                                                <UserCheck
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                    Booking for myself
                                                </span>
                                                <span className="mt-0.5 block text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                    No additional contact form
                                                    needed.
                                                </span>
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={
                                                bookingFor === 'other'
                                            }
                                            onClick={() =>
                                                setBookingFor('other')
                                            }
                                            className={`flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                                                bookingFor === 'other'
                                                    ? 'border-tijum-coral bg-tijum-peach/20 shadow-xs'
                                                    : 'border-tijum-surface/80 bg-white hover:border-tijum-peach dark:border-border dark:bg-card'
                                            }`}
                                        >
                                            <span
                                                className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                                                    bookingFor === 'other'
                                                        ? 'bg-tijum-plum text-tijum-cream'
                                                        : 'bg-tijum-cream text-tijum-plum dark:bg-muted dark:text-foreground'
                                                }`}
                                            >
                                                <UserPlus
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                    Booking for another person
                                                </span>
                                                <span className="mt-0.5 block text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                    Enter the guest&apos;s name,
                                                    10-digit mobile, and email.
                                                </span>
                                            </span>
                                        </button>
                                    </div>

                                    {bookingFor === 'self' ? (
                                        <>
                                            <input
                                                type="hidden"
                                                name="contact_name"
                                                value={
                                                    customer.name || 'Guest'
                                                }
                                            />
                                            <input
                                                type="hidden"
                                                name="contact_phone"
                                                value={
                                                    customer.phone ||
                                                    '9876543210'
                                                }
                                            />
                                            <input
                                                type="hidden"
                                                name="contact_email"
                                                value={
                                                    customer.email ||
                                                    'guest@tijum.com'
                                                }
                                            />
                                        </>
                                    ) : (
                                        <div className="grid gap-5 border-t border-tijum-surface/80 pt-5 sm:grid-cols-2 dark:border-border">
                                            <FormField
                                                id="contact_name"
                                                label="Contact name"
                                                required
                                                error={
                                                    nameValidation.status ===
                                                    'invalid'
                                                        ? nameValidation.message
                                                        : errors.contact_name
                                                }
                                            >
                                                {(props) => (
                                                    <div className="space-y-1.5">
                                                        <div className="relative">
                                                            <Input
                                                                {...props}
                                                                name="contact_name"
                                                                value={
                                                                    otherName
                                                                }
                                                                onChange={(e) =>
                                                                    setOtherName(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="Enter full name of guest"
                                                                autoComplete="name"
                                                                required
                                                                className="pr-9"
                                                            />
                                                            {nameValidation.status ===
                                                                'checking' && (
                                                                <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-tijum-plum-muted" />
                                                            )}
                                                            {nameValidation.status ===
                                                                'valid' && (
                                                                <CheckCircle2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-600" />
                                                            )}
                                                        </div>
                                                        {nameValidation.status ===
                                                            'valid' && (
                                                            <p className="text-xs font-medium text-emerald-700">
                                                                {
                                                                    nameValidation.message
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </FormField>

                                            <FormField
                                                id="contact_phone"
                                                label="Contact phone (10 digits)"
                                                required
                                                error={
                                                    phoneValidation.status ===
                                                    'invalid'
                                                        ? phoneValidation.message
                                                        : errors.contact_phone
                                                }
                                            >
                                                {(props) => (
                                                    <div className="space-y-1.5">
                                                        <div className="relative flex items-center">
                                                            <span className="pointer-events-none absolute left-3.5 font-heading text-xs font-semibold text-tijum-plum-muted select-none">
                                                                +91
                                                            </span>
                                                            <Input
                                                                {...props}
                                                                name="contact_phone"
                                                                type="tel"
                                                                inputMode="numeric"
                                                                maxLength={10}
                                                                pattern="[0-9]{10}"
                                                                value={
                                                                    otherPhone
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const digitsOnly =
                                                                        e.target.value
                                                                            .replace(
                                                                                /\D+/g,
                                                                                '',
                                                                            )
                                                                            .slice(
                                                                                0,
                                                                                10,
                                                                            );
                                                                    setOtherPhone(
                                                                        digitsOnly,
                                                                    );
                                                                }}
                                                                placeholder="9876543210"
                                                                autoComplete="tel-national"
                                                                required
                                                                className="pr-16 pl-11 tabular-nums"
                                                            />
                                                            <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1.5">
                                                                <span className="text-[11px] font-medium tabular-nums text-tijum-plum-muted">
                                                                    {
                                                                        otherPhone.length
                                                                    }
                                                                    /10
                                                                </span>
                                                                {phoneValidation.status ===
                                                                    'checking' && (
                                                                    <Loader2 className="size-4 animate-spin text-tijum-plum-muted" />
                                                                )}
                                                                {phoneValidation.status ===
                                                                    'valid' && (
                                                                    <CheckCircle2 className="size-4 text-emerald-600" />
                                                                )}
                                                            </div>
                                                        </div>
                                                        {phoneValidation.status ===
                                                            'valid' && (
                                                            <p className="text-xs font-medium text-emerald-700">
                                                                {
                                                                    phoneValidation.message
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </FormField>

                                            <FormField
                                                id="contact_email"
                                                label="Contact email"
                                                required
                                                error={
                                                    emailValidation.status ===
                                                    'invalid'
                                                        ? emailValidation.message
                                                        : errors.contact_email
                                                }
                                                className="sm:col-span-2"
                                            >
                                                {(props) => (
                                                    <div className="space-y-1.5">
                                                        <div className="relative">
                                                            <Input
                                                                {...props}
                                                                name="contact_email"
                                                                type="email"
                                                                value={
                                                                    otherEmail
                                                                }
                                                                onChange={(e) =>
                                                                    setOtherEmail(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder="guest@example.com"
                                                                autoComplete="email"
                                                                required
                                                                className="pr-9"
                                                            />
                                                            {emailValidation.status ===
                                                                'checking' && (
                                                                <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-tijum-plum-muted" />
                                                            )}
                                                            {emailValidation.status ===
                                                                'valid' && (
                                                                <CheckCircle2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-600" />
                                                            )}
                                                        </div>
                                                        {emailValidation.status ===
                                                            'valid' && (
                                                            <p className="text-xs font-medium text-emerald-700">
                                                                {
                                                                    emailValidation.message
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </FormField>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Guest eligibility</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Confirm the group matches this room
                                        type's existing guest restrictions.
                                    </p>
                                </CardHeader>
                                <CardContent className="grid gap-5 sm:grid-cols-2">
                                    <FormField
                                        id="guest_gender"
                                        label="Guest gender group"
                                        required
                                        error={
                                            genderMismatchWarning ??
                                            errors.guest_gender
                                        }
                                    >
                                        {(props) => (
                                            <select
                                                {...props}
                                                name="guest_gender"
                                                value={selectedGender}
                                                onChange={(e) =>
                                                    setSelectedGender(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-12 w-full cursor-pointer rounded-xl border border-tijum-surface/80 bg-white px-4 text-sm text-tijum-plum outline-none transition-[border-color,box-shadow] focus-visible:border-tijum-coral focus-visible:ring-[3px] focus-visible:ring-tijum-coral/25 dark:border-border dark:bg-card dark:text-foreground dark:[color-scheme:dark]"
                                                required
                                            >
                                                {genderOptions.map((option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </FormField>
                                    <FormField
                                        id="guest_composition"
                                        label="Guest composition"
                                        required
                                        error={errors.guest_composition}
                                    >
                                        {(props) => (
                                            <select
                                                {...props}
                                                name="guest_composition"
                                                value={selectedComposition}
                                                onChange={(e) =>
                                                    setSelectedComposition(
                                                        e.target.value,
                                                    )
                                                }
                                                className="h-12 w-full cursor-pointer rounded-xl border border-tijum-surface/80 bg-white px-4 text-sm text-tijum-plum outline-none transition-[border-color,box-shadow] focus-visible:border-tijum-coral focus-visible:ring-[3px] focus-visible:ring-tijum-coral/25 dark:border-border dark:bg-card dark:text-foreground dark:[color-scheme:dark]"
                                                required
                                            >
                                                <option value="individuals">
                                                    Individuals
                                                </option>
                                            </select>
                                        )}
                                    </FormField>
                                </CardContent>
                            </Card>

                            {/* Rewards, Coupons & Loyalty Redemption Card */}
                            <Card className="border-emerald-200/80 bg-white shadow-tijum-card dark:border-emerald-800/50 dark:bg-card">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 font-heading text-base text-tijum-plum dark:text-foreground">
                                        <TicketPercent className="size-5 text-emerald-700 dark:text-emerald-400" />
                                        Promotions &amp; Loyalty Rewards
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                        Apply a promo coupon code or redeem
                                        TIJUM loyalty points for instant
                                        savings.
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {/* Coupon Input & Applied Badge */}
                                    <div className="space-y-2">
                                        <label
                                            htmlFor="coupon_input"
                                            className="block text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Have a Coupon Code?
                                        </label>

                                        {appliedCoupon ? (
                                            <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/40">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                                                        <Check className="size-4" />
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                                                {
                                                                    appliedCoupon.code
                                                                }
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className="border-emerald-300 bg-white text-[10px] font-bold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                            >
                                                                {appliedCoupon.offer_type ===
                                                                'percentage'
                                                                    ? `${appliedCoupon.discount_percentage}% OFF`
                                                                    : `₹${((appliedCoupon.discount_amount_minor ?? 0) / 100).toLocaleString()} OFF`}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90">
                                                            {
                                                                appliedCoupon.title
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={handleRemoveCoupon}
                                                    className="size-7 p-0 text-emerald-700 hover:bg-emerald-200/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                                                >
                                                    <X className="size-4" />
                                                    <span className="sr-only">
                                                        Remove coupon
                                                    </span>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <Tag className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        id="coupon_input"
                                                        placeholder="Enter promo code (e.g. TIJUM10)"
                                                        value={couponInput}
                                                        onChange={(e) =>
                                                            setCouponInput(
                                                                e.target.value.toUpperCase(),
                                                            )
                                                        }
                                                        className="pl-9 font-mono text-xs uppercase"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="plum"
                                                    disabled={
                                                        isValidatingCoupon ||
                                                        !couponInput.trim()
                                                    }
                                                    onClick={() =>
                                                        handleApplyCoupon()
                                                    }
                                                    className="h-12 shrink-0 px-5 text-xs"
                                                >
                                                    {isValidatingCoupon
                                                        ? 'Checking…'
                                                        : 'Apply'}
                                                </Button>
                                            </div>
                                        )}

                                        {couponError && (
                                            <p className="text-xs text-rose-600 dark:text-rose-400">
                                                {couponError}
                                            </p>
                                        )}

                                        {/* Quick Suggestion Pills if available */}
                                        {!appliedCoupon &&
                                            availableCoupons.length > 0 && (
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Available for you:
                                                    </span>
                                                    {availableCoupons
                                                        .slice(0, 3)
                                                        .map((c) => (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() =>
                                                                    handleApplyCoupon(
                                                                        c.code,
                                                                    )
                                                                }
                                                                className="cursor-pointer rounded-lg border border-dashed border-emerald-300 bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-50 dark:border-emerald-800 dark:bg-muted dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                                                            >
                                                                {c.code}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                    </div>

                                    {/* Loyalty Points Redemption Slider */}
                                    <div className="space-y-3 border-t border-emerald-100 pt-4 dark:border-border">
                                        <div className="flex items-start justify-between">
                                            <label className="flex cursor-pointer items-start gap-3">
                                                <Checkbox
                                                    checked={usePoints}
                                                    disabled={
                                                        availablePoints === 0 ||
                                                        maxRedeemablePoints ===
                                                            0
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        setUsePoints(
                                                            checked === true,
                                                        )
                                                    }
                                                />
                                                <span>
                                                    <span className="block font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                        Redeem TIJUM Loyalty
                                                        Points
                                                    </span>
                                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                                        Balance:{' '}
                                                        <strong>
                                                            {availablePoints.toLocaleString()}{' '}
                                                            pts
                                                        </strong>{' '}
                                                        · Max usable for this
                                                        stay:{' '}
                                                        <strong>
                                                            {maxRedeemablePoints.toLocaleString()}{' '}
                                                            pts (₹
                                                            {maxRedeemablePoints.toLocaleString()}
                                                            )
                                                        </strong>
                                                    </span>
                                                </span>
                                            </label>

                                            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                                <Coins className="size-4" />
                                            </div>
                                        </div>

                                        {usePoints &&
                                            maxRedeemablePoints > 0 && (
                                                <div className="space-y-2 rounded-xl bg-white p-3.5 shadow-xs dark:bg-muted/40">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-muted-foreground">
                                                            Points to redeem:
                                                        </span>
                                                        <span className="font-heading font-bold text-emerald-700 dark:text-emerald-400">
                                                            {pointsToRedeem.toLocaleString()}{' '}
                                                            pts = ₹
                                                            {pointsToRedeem.toLocaleString()}{' '}
                                                            discount
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max={
                                                            maxRedeemablePoints
                                                        }
                                                        step="10"
                                                        value={pointsToRedeem}
                                                        onChange={(e) =>
                                                            setPointsToRedeem(
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                        className="h-2 w-full cursor-pointer rounded-lg bg-neutral-200 accent-tijum-plum dark:bg-muted dark:accent-primary"
                                                    />
                                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                                        <span>0 pts</span>
                                                        <span>
                                                            {maxRedeemablePoints.toLocaleString()}{' '}
                                                            pts (Max)
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                </CardContent>
                            </Card>

                            {quote.early_check_in_allowed && (
                                <Card>
                                    <CardContent className="space-y-4 pt-1">
                                        <label className="flex cursor-pointer items-start gap-3">
                                            <Checkbox
                                                checked={earlyRequested}
                                                onCheckedChange={(checked) =>
                                                    setEarlyRequested(
                                                        checked === true,
                                                    )
                                                }
                                            />
                                            <span>
                                                <span className="block font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                    Request early check-in
                                                </span>
                                                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                                    Eligible from{' '}
                                                    {formatStayTime(
                                                        quote.timing
                                                            .earliest_early_check_in_time,
                                                    )}{' '}
                                                    to 8:59 AM. This is a
                                                    request, not a guarantee,
                                                    and remains subject to room
                                                    availability and operational
                                                    readiness.
                                                </span>
                                            </span>
                                        </label>

                                        {earlyRequested && (
                                            <FormField
                                                id="requested_arrival_time"
                                                label="Intended arrival time"
                                                required
                                                error={
                                                    errors.requested_arrival_time
                                                }
                                            >
                                                {(props) => (
                                                    <Input
                                                        {...props}
                                                        name="requested_arrival_time"
                                                        type="time"
                                                        min={
                                                            quote.timing
                                                                .earliest_early_check_in_time
                                                        }
                                                        max="08:59"
                                                        defaultValue={
                                                            quote.timing
                                                                .earliest_early_check_in_time
                                                        }
                                                        required
                                                    />
                                                )}
                                            </FormField>
                                        )}
                                        <InputError
                                            message={
                                                errors.early_check_in_requested
                                            }
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <aside className="xl:sticky xl:top-24 xl:self-start">
                            <Card className="border-tijum-peach/70 shadow-md dark:border-tijum-coral/30">
                                <CardHeader>
                                    <CardTitle>Reservation total</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <SummaryRow
                                        label={quote.rate_unit_label}
                                        value={formatReservationMoney(
                                            quote.unit_rate_minor,
                                            quote.currency_code,
                                        )}
                                    />
                                    <SummaryRow
                                        label="Quantity"
                                        value={String(quote.quantity)}
                                    />
                                    <SummaryRow
                                        label="Duration quantity"
                                        value={String(quote.duration_quantity)}
                                    />

                                    {/* Order Calculation Pipeline */}
                                    <div className="space-y-2 border-t border-tijum-surface pt-3 dark:border-border">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Accommodation Subtotal</span>
                                            <span className="font-semibold tabular-nums text-tijum-plum dark:text-foreground">
                                                {formatReservationMoney(
                                                    subtotalMinor,
                                                    quote.currency_code,
                                                )}
                                            </span>
                                        </div>

                                        {appliedCoupon &&
                                            couponDiscountMinor > 0 && (
                                                <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                                                    <span className="flex items-center gap-1">
                                                        <TicketPercent className="size-3.5" />
                                                        <span>
                                                            Coupon Discount (
                                                            {appliedCoupon.code}
                                                            )
                                                        </span>
                                                    </span>
                                                    <span className="font-bold">
                                                        -
                                                        {formatReservationMoney(
                                                            couponDiscountMinor,
                                                            quote.currency_code,
                                                        )}
                                                    </span>
                                                </div>
                                            )}

                                        {usePoints &&
                                            pointsDiscountMinor > 0 && (
                                                <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                                                    <span className="flex items-center gap-1">
                                                        <Coins className="size-3.5" />
                                                        <span>
                                                            Loyalty Points (
                                                            {
                                                                effectivePointsRedeemed
                                                            }{' '}
                                                            pts)
                                                        </span>
                                                    </span>
                                                    <span className="font-bold">
                                                        -
                                                        {formatReservationMoney(
                                                            pointsDiscountMinor,
                                                            quote.currency_code,
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                    </div>

                                    <div className="border-t border-tijum-surface pt-3 dark:border-border">
                                        <SummaryRow
                                            label="Final Payable Total"
                                            value={formatReservationMoney(
                                                finalPayableMinor,
                                                quote.currency_code,
                                            )}
                                            strong
                                        />
                                    </div>

                                    <div className="rounded-xl bg-tijum-cream p-4 text-xs leading-relaxed text-tijum-plum dark:bg-muted/50 dark:text-foreground">
                                        <ShieldCheck
                                            className="mb-2 size-5 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        Submission immediately creates a
                                        15-minute inventory, coupon, and points
                                        hold. Complete payment during that
                                        window; backend verification confirms
                                        the booking automatically without owner
                                        approval.
                                    </div>
                                    <InputError
                                        message={
                                            errors.reservation ??
                                            errors.property_room_type_id ??
                                            errors.quantity ??
                                            errors.check_in_date
                                        }
                                    />
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full"
                                        disabled={
                                            processing ||
                                            Boolean(genderMismatchWarning) ||
                                            !isOtherContactValid
                                        }
                                    >
                                        {processing
                                            ? 'Creating hold…'
                                            : 'Hold inventory for payment'}
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Link
                                            href={
                                                propertyShow(
                                                    quote.property_slug,
                                                ).url
                                            }
                                        >
                                            Back to property
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </aside>
                    </>
                )}
            </Form>
            </div>
        </ResponsiveContainer>
    );
}

function ReviewItem({
    icon: Icon,
    label,
    value,
    detail,
}: {
    icon: typeof CalendarDays;
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-cream text-tijum-coral dark:bg-tijum-coral/15">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
                <p className="text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase dark:text-muted-foreground">
                    {label}
                </p>
                <p className="mt-1 font-semibold text-tijum-plum dark:text-foreground">
                    {value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
        </div>
    );
}

function SummaryRow({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span
                className={
                    strong
                        ? 'font-heading text-xl font-bold tabular-nums text-tijum-plum dark:text-foreground'
                        : 'font-semibold tabular-nums text-tijum-plum dark:text-foreground'
                }
            >
                {value}
            </span>
        </div>
    );
}
