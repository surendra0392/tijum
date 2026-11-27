import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Printer } from 'lucide-react';
import BrandLogo from '@/components/brand/brand-logo';
import { Button } from '@/components/ui/button';
import type { ReservationDetail } from '@/types';

function formatPrice(minor: number, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(minor / 100);
}

export default function ReservationReceipt({
    reservation,
}: {
    reservation: ReservationDetail;
}) {
    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const payment = reservation.payment_summary;
    const isZeroPayablePromotional =
        reservation.total_amount_minor === 0 && !payment;
    const hasDiscounts =
        (reservation.coupon_discount_minor ?? 0) > 0 ||
        (reservation.points_discount_minor ?? 0) > 0;

    return (
        <div className="py-8 text-tijum-plum dark:text-foreground print:bg-white print:py-0 print:text-neutral-950">
            <Head title={`Receipt · ${reservation.booking_reference}`} />

            <div className="mx-auto max-w-3xl px-4 sm:px-6">
                {/* Print & Navigation Controls */}
                <div className="mb-6 flex items-center justify-between print:hidden">
                    <Button asChild variant="outline" size="sm">
                        <Link
                            href={`/reservations/${reservation.booking_reference}`}
                        >
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            Back to reservation
                        </Link>
                    </Button>

                    <Button
                        onClick={handlePrint}
                        size="sm"
                        className="gap-2"
                    >
                        <Printer className="size-4" aria-hidden="true" />
                        Print Receipt
                    </Button>
                </div>

                {/* Printable Receipt Card */}
                <div className="overflow-hidden rounded-[22px] border border-tijum-surface/80 bg-white p-6 shadow-tijum-card sm:p-10 dark:border-border dark:bg-card print:rounded-none print:border-none print:bg-white print:p-0 print:text-neutral-950 print:shadow-none">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-6 border-b border-tijum-surface pb-8 dark:border-border print:border-neutral-200">
                        <div>
                            <div className="dark:hidden print:block">
                                <BrandLogo
                                    variant="horizontal"
                                    tone="light"
                                    size="md"
                                />
                            </div>
                            <div className="hidden dark:block print:hidden">
                                <BrandLogo
                                    variant="horizontal"
                                    tone="dark"
                                    size="md"
                                />
                            </div>
                            <p className="mt-2 text-xs text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Stay easy · Eat well · Spend less
                            </p>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Affordable, food-inclusive accommodation booking
                            </p>
                        </div>

                        <div className="text-right">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-heading text-xs font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300 print:border-emerald-200 print:bg-emerald-50 print:text-emerald-800">
                                <CheckCircle2 className="size-3.5" />
                                {isZeroPayablePromotional
                                    ? 'Confirmed · Covered by Rewards'
                                    : 'Payment Captured'}
                            </span>
                            <h1 className="mt-2 font-mono text-xl font-bold tracking-tight text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {reservation.booking_reference}
                            </h1>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                Issued:{' '}
                                {new Date().toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Guest & Property Details */}
                    <div className="grid grid-cols-1 gap-6 border-b border-tijum-surface py-6 sm:grid-cols-2 dark:border-border print:border-neutral-200">
                        <div>
                            <p className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Guest Details
                            </p>
                            <p className="mt-1 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                {reservation.contact_name}
                            </p>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                {reservation.contact_email}
                            </p>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                {reservation.contact_phone}
                            </p>
                            <p className="mt-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                {reservation.guest_count} Guest
                                {reservation.guest_count > 1 ? 's' : ''} (
                                {reservation.guest_gender})
                            </p>
                        </div>

                        <div>
                            <p className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Property & Stay
                            </p>
                            <p className="mt-1 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                {reservation.property_name}
                            </p>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                {reservation.property_locality}
                            </p>
                            <p className="mt-1 text-xs font-medium text-tijum-plum dark:text-foreground">
                                {reservation.room_type_name} (
                                {reservation.room_type_ac_label} ·{' '}
                                {reservation.sharing_label})
                            </p>
                        </div>
                    </div>

                    {/* Stay Schedule & Inclusions */}
                    <div className="grid grid-cols-2 gap-4 border-b border-tijum-surface py-6 sm:grid-cols-4 dark:border-border">
                        <div>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Check-in
                            </p>
                            <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                {reservation.check_in_date}
                            </p>
                            <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                from {reservation.standard_check_in_time}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Checkout
                            </p>
                            <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                {reservation.checkout_date}
                            </p>
                            <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                until {reservation.standard_check_out_time}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Duration
                            </p>
                            <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                {reservation.duration_label}
                            </p>
                            <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                {reservation.total_stay_days} Nights
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                Food Package
                            </p>
                            <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                Meals Included
                            </p>
                            <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                {[
                                    reservation.breakfast_included
                                        ? 'Breakfast'
                                        : null,
                                    reservation.lunch_included ? 'Lunch' : null,
                                    reservation.dinner_included
                                        ? 'Dinner'
                                        : null,
                                ]
                                    .filter(Boolean)
                                    .join(', ')}
                            </p>
                        </div>
                    </div>

                    {/* Payment Transaction Details */}
                    <div className="border-b border-tijum-surface py-6 dark:border-border">
                        <p className="font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            Payment Details
                        </p>

                        <div className="mt-3 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Payment Gateway
                                </span>
                                <span className="font-medium text-tijum-plum capitalize dark:text-foreground">
                                    {isZeroPayablePromotional
                                        ? 'TIJUM Promotions / Loyalty Points'
                                        : payment?.gateway || 'Razorpay'}
                                </span>
                            </div>
                            {!isZeroPayablePromotional && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Gateway Order ID
                                        </span>
                                        <span className="font-mono text-tijum-plum dark:text-foreground">
                                            {payment?.gateway_order_id || '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Payment Transaction ID
                                        </span>
                                        <span className="font-mono font-medium text-tijum-plum dark:text-foreground">
                                            {payment?.gateway_payment_id || '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Payment Method
                                        </span>
                                        <span className="text-tijum-plum capitalize dark:text-foreground">
                                            {payment?.payment_method ||
                                                'Online'}
                                        </span>
                                    </div>
                                </>
                            )}
                            {(payment?.captured_at ||
                                (isZeroPayablePromotional &&
                                    reservation.confirmed_at)) && (
                                <div className="flex justify-between">
                                    <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                        {isZeroPayablePromotional
                                            ? 'Confirmed At'
                                            : 'Payment Captured At'}
                                    </span>
                                    <span className="text-tijum-plum dark:text-foreground">
                                        {new Date(
                                            (payment?.captured_at ??
                                                reservation.confirmed_at)!,
                                        ).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {hasDiscounts && (
                            <div className="mt-4 space-y-1.5 border-t border-tijum-surface/70 pt-3 text-xs dark:border-border">
                                {reservation.original_amount_minor != null && (
                                    <div className="flex justify-between">
                                        <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                            Accommodation Subtotal
                                        </span>
                                        <span className="font-medium tabular-nums text-tijum-plum dark:text-foreground">
                                            {formatPrice(
                                                reservation.original_amount_minor,
                                                reservation.currency_code,
                                            )}
                                        </span>
                                    </div>
                                )}
                                {(reservation.coupon_discount_minor ?? 0) >
                                    0 && (
                                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                        <span>
                                            Coupon Discount
                                            {reservation.coupon_code
                                                ? ` (${reservation.coupon_code})`
                                                : ''}
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            -
                                            {formatPrice(
                                                reservation.coupon_discount_minor ??
                                                    0,
                                                reservation.currency_code,
                                            )}
                                        </span>
                                    </div>
                                )}
                                {(reservation.points_discount_minor ?? 0) >
                                    0 && (
                                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                        <span>
                                            Loyalty Points Redeemed
                                            {reservation.points_redeemed
                                                ? ` (${reservation.points_redeemed.toLocaleString()} pts)`
                                                : ''}
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            -
                                            {formatPrice(
                                                reservation.points_discount_minor ??
                                                    0,
                                                reservation.currency_code,
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-between rounded-xl border border-tijum-surface/80 bg-tijum-cream/70 p-4 dark:border-border dark:bg-muted/45 print:border-neutral-200 print:bg-neutral-100">
                            <div>
                                <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground print:text-neutral-950">
                                    Total Amount Paid
                                </p>
                                <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground print:text-neutral-600">
                                    Includes accommodation, daily meals, and
                                    applicable platform service fee
                                </p>
                            </div>
                            <span className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground print:text-neutral-950">
                                {formatPrice(
                                    reservation.total_amount_minor,
                                    reservation.currency_code,
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="pt-6 text-[11px] leading-relaxed text-tijum-plum-muted/85 dark:text-muted-foreground print:text-neutral-600">
                        <p>
                            <strong>Important Disclaimer:</strong> This document
                            is a payment receipt for customer reservation and
                            aggregation services fulfilled via the TIJUM
                            platform. This is not a GST tax invoice. The
                            accommodation and daily catering are provided by the
                            independent operator ({reservation.property_name}).
                            Applicable property-level taxes and lodging
                            obligations are maintained directly by the
                            accommodation operator.
                        </p>
                        <p className="mt-2">
                            For support or inquiries regarding this receipt,
                            please contact <strong>support@tijum.com</strong>{' '}
                            with reference{' '}
                            <strong>{reservation.booking_reference}</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
