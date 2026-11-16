import { Form, Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Ban,
    CalendarDays,
    CheckCircle2,
    Clock,
    Clock3,
    CreditCard,
    DoorClosed,
    DoorOpen,
    FileText,
    Home,
    LifeBuoy,
    MapPin,
    RefreshCw,
    ShieldAlert,
    Star,
    Users,
    Utensils,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/shared/page-header';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    formatReservationDate,
    formatReservationMoney,
} from '@/lib/reservation-format';
import { formatStayTime } from '@/lib/stay-timing';
import { cancel, index } from '@/routes/reservations';
import type { PaymentOrderResponse, ReservationDetail } from '@/types';

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => {
            open: () => void;
            on: (event: string, handler: (response: unknown) => void) => void;
        };
    }
}

function getXsrfToken(): string | null {
    if (typeof document === 'undefined') {
        return null;
    }
    const match = document.cookie.match(
        new RegExp('(^|;\\s*)(XSRF-TOKEN)=([^;]*)'),
    );
    return match ? decodeURIComponent(match[3]) : null;
}

function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

function formatPrice(minor: number, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(minor / 100);
}

function ReviewStars({ rating }: { rating: number }) {
    return (
        <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, index) => (
                <Star
                    key={index}
                    className={
                        index < rating
                            ? 'size-4 fill-tijum-coral text-tijum-coral'
                            : 'size-4 text-tijum-surface'
                    }
                    aria-hidden="true"
                />
            ))}
        </div>
    );
}

export default function ReservationShow({
    reservation,
    status,
}: {
    reservation: ReservationDetail;
    status?: string;
}) {
    const [paying, setPaying] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState<number | null>(() => {
        if (!reservation.payment_deadline_at) {
            return null;
        }
        const diff = Math.floor(
            (new Date(reservation.payment_deadline_at).getTime() - Date.now()) /
                1000,
        );
        return diff > 0 ? diff : 0;
    });

    useEffect(() => {
        if (!reservation.payment_deadline_at) {
            return;
        }

        const interval = setInterval(() => {
            const diff = Math.floor(
                (new Date(reservation.payment_deadline_at!).getTime() -
                    Date.now()) /
                    1000,
            );
            if (diff <= 0) {
                setSecondsLeft(0);
                clearInterval(interval);
            } else {
                setSecondsLeft(diff);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [reservation.payment_deadline_at]);

    const handlePay = async () => {
        setPaying(true);
        setPaymentError(null);

        try {
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded || !window.Razorpay) {
                throw new Error(
                    'Unable to load Razorpay checkout SDK. Please check your internet connection.',
                );
            }

            const token = getXsrfToken();
            const response = await fetch(
                `/reservations/${reservation.booking_reference}/pay`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
                    },
                },
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message ||
                        'Failed to initialize payment order. Please refresh and try again.',
                );
            }

            const order: PaymentOrderResponse = await response.json();

            const rzp = new window.Razorpay({
                key: order.key_id,
                amount: order.amount_minor,
                currency: order.currency,
                name: 'TIJUM',
                description: `Reservation ${order.notes.booking_reference}`,
                order_id: order.gateway_order_id,
                prefill: {
                    name: order.prefill.name,
                    email: order.prefill.email,
                    contact: order.prefill.contact,
                },
                theme: {
                    color: '#FF7A67',
                },
                notes: order.notes,
                handler: (verifyResponse: {
                    razorpay_order_id: string;
                    razorpay_payment_id: string;
                    razorpay_signature: string;
                }) => {
                    router.post(
                        `/reservations/${reservation.booking_reference}/verify-payment`,
                        {
                            razorpay_order_id: verifyResponse.razorpay_order_id,
                            razorpay_payment_id:
                                verifyResponse.razorpay_payment_id,
                            razorpay_signature:
                                verifyResponse.razorpay_signature,
                        },
                        {
                            preserveScroll: true,
                        },
                    );
                },
                modal: {
                    ondismiss: () => {
                        setPaying(false);
                    },
                },
            });

            rzp.open();
        } catch (err: unknown) {
            setPaying(false);
            setPaymentError(
                err instanceof Error
                    ? err.message
                    : 'Payment initiation failed.',
            );
        }
    };

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportCategory, setReportCategory] = useState('room_type_mismatch');
    const [reportDescription, setReportDescription] = useState('');
    const [reportingProblem, setReportingProblem] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const handleReportProblem = (e: React.FormEvent) => {
        e.preventDefault();
        setReportingProblem(true);
        setReportError(null);

        router.post(
            `/reservations/${reservation.booking_reference}/report-problem`,
            {
                category: reportCategory,
                description: reportDescription,
                priority: 'standard',
            },
            {
                onSuccess: () => {
                    setShowReportModal(false);
                    setReportDescription('');
                },
                onError: (errs) => {
                    setReportError(
                        (Object.values(errs)[0] as string) ||
                            'Unable to submit report.',
                    );
                    setReportingProblem(false);
                },
                onFinish: () => setReportingProblem(false),
            },
        );
    };

    const isAwaitingPayment = reservation.status === 'awaiting_payment';
    const isConfirmedOrCancelled =
        reservation.status === 'confirmed' ||
        reservation.status === 'cancelled';
    const canPay = reservation.can_pay === true;
    const isCancelOrErrorStatus =
        reservation.status === 'cancelled' ||
        reservation.status === 'expired' ||
        Boolean(status && status.toLowerCase().includes('cancel'));
    const meals = [
        reservation.breakfast_included && 'Breakfast',
        reservation.lunch_included && 'Lunch',
        reservation.dinner_included && 'Dinner',
    ].filter(Boolean);

    return (
        <ResponsiveContainer width="wide" className="py-6 sm:py-8">
            <div className="space-y-6 pb-12">
                <Head title={reservation.booking_reference} />
                <PageHeader
                    breadcrumbs={
                        isConfirmedOrCancelled
                            ? [
                                  {
                                      title: 'My Reservations',
                                      href: '/reservations',
                                  },
                                  {
                                      title: reservation.booking_reference,
                                      href: `/reservations/${reservation.booking_reference}`,
                                  },
                              ]
                            : [
                                  {
                                      title: reservation.property_name,
                                      href: '#',
                                  },
                                  {
                                      title: reservation.booking_reference,
                                      href: `/reservations/${reservation.booking_reference}`,
                                  },
                              ]
                    }
                    eyebrow="Reservation details"
                    title={reservation.booking_reference}
                    description="Your submitted contact, stay, food, timing, and price snapshot."
                    actions={
                        isConfirmedOrCancelled ? (
                            <div className="flex flex-wrap items-center gap-2">
                                {reservation.status === 'confirmed' && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setShowReportModal(!showReportModal)
                                        }
                                        className="border-tijum-coral/40 text-xs text-tijum-plum hover:bg-tijum-coral/10 dark:border-tijum-coral/40 dark:text-tijum-peach dark:hover:bg-tijum-coral/15"
                                    >
                                        <LifeBuoy
                                            className="mr-1.5 size-4"
                                            aria-hidden="true"
                                        />
                                        Report a Problem
                                    </Button>
                                )}
                                {reservation.can_view_receipt && (
                                    <Button asChild variant="outline">
                                        <a
                                            href={`/reservations/${reservation.booking_reference}/receipt`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <FileText
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            Printable Receipt
                                        </a>
                                    </Button>
                                )}
                                <Button asChild variant="outline">
                                    <Link href={index().url}>
                                        <ArrowLeft
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        All reservations
                                    </Link>
                                </Button>
                                <Button asChild variant="plum">
                                    <Link href="/">
                                        <Home
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Return to home
                                    </Link>
                                </Button>
                            </div>
                        ) : undefined
                    }
                />

                {status && (
                    <div
                        role="status"
                        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
                            isCancelOrErrorStatus
                                ? 'border-status-error-border bg-status-error-bg text-status-error-fg'
                                : isAwaitingPayment
                                  ? 'border-status-warning-border bg-status-warning-bg text-status-warning-fg'
                                  : 'border-status-success-border bg-status-success-bg text-status-success-fg'
                        }`}
                    >
                        {isCancelOrErrorStatus ? (
                            <XCircle
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                        ) : isAwaitingPayment ? (
                            <Clock
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                        ) : (
                            <CheckCircle2
                                className="size-4 shrink-0"
                                aria-hidden="true"
                            />
                        )}
                        <span>{status}</span>
                    </div>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
                    <div className="grid gap-6 self-start">
                        {/* Guest Stay Lifecycle Banner */}
                        {reservation.status === 'confirmed' && (
                            <div className="rounded-xl border border-tijum-surface bg-white p-4 shadow-2xs dark:border-border dark:bg-card">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        {reservation.is_checked_out ? (
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                <DoorClosed className="size-5" />
                                            </span>
                                        ) : reservation.is_checked_in ? (
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                <DoorOpen className="size-5" />
                                            </span>
                                        ) : (
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tijum-plum/10 text-tijum-plum dark:bg-muted dark:text-foreground">
                                                <Clock className="size-5" />
                                            </span>
                                        )}
                                        <div>
                                            <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                {reservation.is_checked_out
                                                    ? 'Stay Completed · Checked Out'
                                                    : reservation.is_checked_in
                                                      ? 'Checked In · Welcome to Your Stay!'
                                                      : `Confirmed · Check-in on ${reservation.check_in_date}`}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {reservation.is_checked_out
                                                    ? `Departure finalized on ${reservation.checkout_date}. Thank you for staying with ${reservation.property_name}.`
                                                    : reservation.is_checked_in
                                                      ? `You checked in at reception. Scheduled departure is ${reservation.checkout_date} (standard checkout: ${reservation.standard_check_out_time}).`
                                                      : `Standard check-in begins at ${reservation.standard_check_in_time}.${
                                                            reservation.early_check_in_requested
                                                                ? ` Early check-in requested (${reservation.requested_arrival_time || 'morning'}).`
                                                                : ''
                                                        }`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {reservation.is_checked_in &&
                                            !reservation.is_checked_out && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                    <CheckCircle2 className="size-3.5" />
                                                    Active Stay
                                                </span>
                                            )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Active Relocation Offer Banner */}
                        {reservation.active_relocation && (
                            <div className="rounded-2xl border-2 border-tijum-coral bg-white p-4 shadow-tijum-card sm:p-5 dark:border-tijum-coral/60 dark:bg-card">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-coral text-white">
                                            <Home className="size-5" />
                                        </span>
                                        <div>
                                            <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                                Alternative Stay Offered:{' '}
                                                {
                                                    reservation
                                                        .active_relocation
                                                        .destination_property_name
                                                }
                                            </p>
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {
                                                    reservation
                                                        .active_relocation
                                                        .destination_room_type_name
                                                }{' '}
                                                · Fully food-inclusive ·
                                                Guaranteed at ₹0 additional cost
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        asChild
                                        className="shrink-0"
                                    >
                                        <Link
                                            href={
                                                reservation.cases?.[0]
                                                    ? `/my-support/${reservation.cases[0].case_reference}`
                                                    : '/my-support'
                                            }
                                        >
                                            <span>Review &amp; Accept Stay</span>
                                            <ArrowRight
                                                className="ml-1.5 size-3.5"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Active Support Cases Banner */}
                        {reservation.cases && reservation.cases.length > 0 && (
                            <div className="rounded-2xl border border-tijum-peach bg-tijum-peach/15 p-4 shadow-2xs dark:border-tijum-coral/40 dark:bg-tijum-coral/10">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <ShieldAlert className="size-5 shrink-0 text-tijum-coral" />
                                        <div>
                                            <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                Active Support Ticket:{' '}
                                                <strong className="font-mono">
                                                    {
                                                        reservation.cases[0]
                                                            .case_reference
                                                    }
                                                </strong>{' '}
                                                (
                                                {
                                                    reservation.cases[0]
                                                        .status_label
                                                }
                                                )
                                            </p>
                                            <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                Reported:{' '}
                                                {
                                                    reservation.cases[0]
                                                        .category_label
                                                }{' '}
                                                · Our customer protection team
                                                is investigating.
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/my-support/${reservation.cases[0].case_reference}`}
                                        className="inline-flex items-center gap-1 self-end text-xs font-semibold text-tijum-plum underline hover:text-tijum-coral sm:self-auto dark:text-tijum-peach dark:hover:text-tijum-coral"
                                    >
                                        <span>View Support Progress</span>
                                        <ArrowRight
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Report Problem Drawer / Card */}
                        {showReportModal && (
                            <Card className="border-2 border-tijum-coral/35 bg-white shadow-tijum-card dark:border-tijum-coral/40 dark:bg-card">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                            <LifeBuoy className="size-4 text-tijum-coral" />
                                            <span>
                                                Report a Stay Problem or Food
                                                Issue
                                            </span>
                                        </CardTitle>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setShowReportModal(false)
                                            }
                                            className="h-7 px-2 text-xs"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        Experiencing an issue with your
                                        accommodation, room amenities, or
                                        promised meals? Submit a formal case and
                                        get protected.
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={handleReportProblem}
                                        className="space-y-4 text-xs"
                                    >
                                        {reportError && (
                                            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                                                {reportError}
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <Label htmlFor="report_category">
                                                Category of Problem
                                            </Label>
                                            <Select
                                                value={reportCategory}
                                                onValueChange={(val) =>
                                                    setReportCategory(val)
                                                }
                                            >
                                                <SelectTrigger
                                                    id="report_category"
                                                    className="h-11 rounded-xl border-tijum-surface/80 bg-white dark:border-border dark:bg-card"
                                                >
                                                    <SelectValue placeholder="Select issue category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="room_type_mismatch">
                                                        Room Category / AC
                                                        Mismatch
                                                    </SelectItem>
                                                    <SelectItem value="food_not_provided">
                                                        Food / Meals Not
                                                        Provided
                                                    </SelectItem>
                                                    <SelectItem value="property_unavailable">
                                                        Host / Property
                                                        Unavailable
                                                    </SelectItem>
                                                    <SelectItem value="cleanliness_hygiene">
                                                        Severe Cleanliness or
                                                        Hygiene Problem
                                                    </SelectItem>
                                                    <SelectItem value="safety_hazard">
                                                        Safety / Security
                                                        Concern
                                                    </SelectItem>
                                                    <SelectItem value="amenity_falsified">
                                                        Promised Amenities
                                                        Missing
                                                    </SelectItem>
                                                    <SelectItem value="other">
                                                        Other Stay Dispute
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="report_description">
                                                Describe What Happened
                                            </Label>
                                            <Textarea
                                                id="report_description"
                                                rows={3}
                                                required
                                                placeholder="Please provide details of the room condition, missing meals, or communication with the host…"
                                                value={reportDescription}
                                                onChange={(e) =>
                                                    setReportDescription(
                                                        e.target.value,
                                                    )
                                                }
                                                className="resize-none text-xs"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 pt-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setShowReportModal(false)
                                                }
                                                className="text-xs"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={
                                                    reportingProblem ||
                                                    !reportDescription.trim()
                                                }
                                                className="text-xs"
                                            >
                                                {reportingProblem
                                                    ? 'Submitting…'
                                                    : 'Submit Support Ticket'}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Property & Stay Details Card */}
                        <Card>
                            <CardHeader className="flex-row items-start justify-between gap-4">
                                <div>
                                    <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        {reservation.booking_reference}
                                    </p>
                                    <CardTitle className="mt-1 text-xl">
                                        {reservation.property_name}
                                    </CardTitle>
                                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <MapPin
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        {reservation.property_locality} ·{' '}
                                        {reservation.property_category}
                                    </p>
                                </div>
                                <StatusBadge
                                    status={reservation.status_semantic}
                                    label={reservation.status_label}
                                />
                            </CardHeader>
                            <CardContent className="grid gap-5 sm:grid-cols-2">
                                <DetailItem
                                    icon={CalendarDays}
                                    label="Stay dates"
                                    value={`${formatReservationDate(reservation.check_in_date)} to ${formatReservationDate(reservation.checkout_date)}`}
                                    detail={`${reservation.duration_label} · ${reservation.total_stay_days} stay day${reservation.total_stay_days === 1 ? '' : 's'}`}
                                />
                                <DetailItem
                                    icon={Users}
                                    label="Room category"
                                    value={`${reservation.room_type_name} · ${reservation.room_type_ac_label}`}
                                    detail={`${reservation.sharing_label} · ${reservation.quantity} ${reservation.quantity_basis_label} · ${reservation.guest_count} guest${reservation.guest_count === 1 ? '' : 's'} · ${formatPolicyValue(reservation.guest_gender)} · ${formatPolicyValue(reservation.guest_composition)}`}
                                />
                                <DetailItem
                                    icon={Clock3}
                                    label="Stay timing"
                                    value={`${formatStayTime(reservation.standard_check_in_time)} check-in · ${formatStayTime(reservation.standard_check_out_time)} checkout`}
                                    detail={
                                        reservation.early_check_in_requested &&
                                        reservation.requested_arrival_time
                                            ? `Early arrival requested for ${formatStayTime(reservation.requested_arrival_time)}; subject to room availability and operational readiness.`
                                            : 'Standard arrival timing applies.'
                                    }
                                />
                                <DetailItem
                                    icon={Utensils}
                                    label="Included food"
                                    value={
                                        meals.join(', ') ||
                                        'Included meal details unavailable'
                                    }
                                    detail="Food is included at property level; no meal package selection is required."
                                />
                            </CardContent>
                        </Card>

                        {/* Review Call-to-Action or Submitted Review Card */}
                        {reservation.review ? (
                            <Card className="border-tijum-coral/35 bg-white shadow-tijum-card dark:border-tijum-coral/35 dark:bg-card">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Star className="size-4 fill-tijum-coral text-tijum-coral" />
                                            <CardTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                                Your Stay Review
                                            </CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full border border-tijum-surface bg-tijum-cream/60 px-2.5 py-0.5 text-xs font-medium text-tijum-plum dark:border-border dark:bg-muted dark:text-foreground">
                                                {
                                                    reservation.review
                                                        .status_label
                                                }
                                            </span>
                                            {reservation.review
                                                .can_be_edited && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    className="h-7 text-xs"
                                                >
                                                    <Link
                                                        href={`/reviews/${reservation.review.id}/edit`}
                                                    >
                                                        Edit Review
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <ReviewStars
                                            rating={
                                                reservation.review
                                                    .overall_rating
                                            }
                                        />
                                        <span className="font-semibold text-tijum-plum dark:text-foreground">
                                            {reservation.review.overall_rating}{' '}
                                            / 5 Stars
                                        </span>
                                    </div>
                                    {reservation.review.title && (
                                        <p className="font-semibold text-tijum-plum dark:text-foreground">
                                            {reservation.review.title}
                                        </p>
                                    )}
                                    {reservation.review.content && (
                                        <p className="whitespace-pre-line text-tijum-plum-muted dark:text-muted-foreground">
                                            {reservation.review.content}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ) : reservation.review_eligibility?.is_eligible ? (
                            <Card className="border-tijum-peach/70 bg-tijum-peach/15 dark:border-tijum-coral/40 dark:bg-tijum-coral/10">
                                <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-tijum-plum uppercase dark:text-tijum-peach">
                                            <Star className="size-4 fill-tijum-coral text-tijum-coral" />
                                            Share Your Feedback
                                        </div>
                                        <h4 className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                            How was your food-inclusive stay?
                                        </h4>
                                        <p className="max-w-lg text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            You completed your stay! Share your
                                            experience to help future students
                                            and professionals find the right
                                            accommodation.
                                            {reservation.review_eligibility
                                                .days_remaining != null && (
                                                <span>
                                                    {' '}
                                                    (
                                                    {
                                                        reservation
                                                            .review_eligibility
                                                            .days_remaining
                                                    }{' '}
                                                    days left to review)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <Button asChild className="shrink-0">
                                        <Link
                                            href={`/reservations/${reservation.booking_reference}/review`}
                                        >
                                            Write a Review
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : null}

                        {reservation.cancellation_reason && (
                            <NoticeCard
                                title="Cancellation reason"
                                body={reservation.cancellation_reason}
                            />
                        )}

                        {reservation.can_cancel && (
                            <Card className="border-status-error-border">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Ban
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Cancel reservation
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Cancellation releases the reserved
                                        capacity. If you have already paid, the
                                        cancellation will be flagged for admin
                                        refund review.
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <Form
                                        {...cancel.form(
                                            reservation.booking_reference,
                                        )}
                                        disableWhileProcessing
                                        className="grid gap-3 inert:pointer-events-none inert:opacity-60"
                                    >
                                        {({ errors, processing }) => (
                                            <>
                                                <label
                                                    htmlFor="cancellation_reason"
                                                    className="font-heading text-sm font-medium text-tijum-plum dark:text-foreground"
                                                >
                                                    Reason (optional)
                                                </label>
                                                <Textarea
                                                    id="cancellation_reason"
                                                    name="cancellation_reason"
                                                    rows={3}
                                                    placeholder="Tell the property why your plans changed."
                                                    aria-invalid={
                                                        errors.cancellation_reason
                                                            ? true
                                                            : undefined
                                                    }
                                                />
                                                <InputError
                                                    message={
                                                        errors.cancellation_reason
                                                    }
                                                />
                                                <Button
                                                    type="submit"
                                                    variant="destructive"
                                                    className="w-fit"
                                                    disabled={processing}
                                                >
                                                    {processing
                                                        ? 'Cancelling…'
                                                        : 'Cancel reservation'}
                                                </Button>
                                            </>
                                        )}
                                    </Form>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                        {isAwaitingPayment && (
                            <Card className="border-tijum-coral/40 bg-white shadow-tijum-card dark:border-tijum-coral/40 dark:bg-card">
                                <CardHeader className="pb-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-coral/15 text-tijum-coral dark:bg-tijum-coral/20">
                                                <Clock
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div>
                                                <CardTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                                    Inventory Held — Payment
                                                    Required
                                                </CardTitle>
                                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Complete payment within 15
                                                    minutes to confirm.
                                                </p>
                                            </div>
                                        </div>

                                        {secondsLeft !== null && (
                                            <div
                                                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
                                                    secondsLeft > 0
                                                        ? 'bg-tijum-peach/25 text-tijum-plum dark:bg-muted dark:text-foreground'
                                                        : 'bg-tijum-coral/15 text-tijum-plum dark:bg-destructive/20 dark:text-destructive'
                                                }`}
                                            >
                                                <Clock className="size-3.5" />
                                                <span>
                                                    {secondsLeft > 0
                                                        ? `Expires in ${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`
                                                        : 'Payment window expired'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4 pt-0">
                                    <div className="space-y-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/65 p-4 dark:border-border dark:bg-muted/45">
                                        <div>
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Amount Due
                                            </p>
                                            <p className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                                {formatPrice(
                                                    reservation.total_amount_minor,
                                                    reservation.currency_code,
                                                )}
                                            </p>
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Backend price snapshot for this
                                                room type and stay.
                                            </p>
                                        </div>

                                        {canPay ? (
                                            <Button
                                                onClick={handlePay}
                                                disabled={paying}
                                                className="w-full gap-2"
                                                size="lg"
                                            >
                                                {paying ? (
                                                    <>
                                                        <RefreshCw className="size-4 animate-spin" />
                                                        Processing…
                                                    </>
                                                ) : (
                                                    <>
                                                        <CreditCard className="size-4" />
                                                        Pay Now with Razorpay
                                                    </>
                                                )}
                                            </Button>
                                        ) : (
                                            <p className="text-xs font-medium text-destructive">
                                                This payment window has closed.
                                                The reservation will be
                                                automatically expired.
                                            </p>
                                        )}
                                    </div>

                                    {paymentError && (
                                        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                                            <AlertCircle className="size-4 shrink-0" />
                                            <span>{paymentError}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {reservation.status === 'confirmed' && (
                            <Card className="border-emerald-200/90 bg-white dark:border-emerald-800/50 dark:bg-card">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                            <CheckCircle2
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <CardTitle className="font-heading text-lg font-bold text-tijum-plum dark:text-foreground">
                                                Verified Booking
                                            </CardTitle>
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Your payment has been
                                                backend-verified and the booking
                                                is confirmed.
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                {reservation.payment_summary && (
                                    <CardContent className="pt-0">
                                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/55 p-3.5 text-xs dark:border-border dark:bg-muted/40">
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Payment Method
                                                </p>
                                                <p className="font-medium text-tijum-plum capitalize dark:text-foreground">
                                                    {reservation.payment_summary
                                                        .payment_method ||
                                                        'Online'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Gateway Reference
                                                </p>
                                                <p className="font-mono font-medium text-tijum-plum dark:text-foreground">
                                                    {reservation.payment_summary
                                                        .gateway_payment_id ||
                                                        '—'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Amount Paid
                                                </p>
                                                <p className="font-semibold tabular-nums text-tijum-plum dark:text-foreground">
                                                    {formatPrice(
                                                        reservation
                                                            .payment_summary
                                                            .amount_minor,
                                                        reservation
                                                            .payment_summary
                                                            .currency_code,
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">
                                                    Receipt
                                                </p>
                                                <a
                                                    href={`/reservations/${reservation.booking_reference}/receipt`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 font-semibold text-tijum-plum underline hover:text-tijum-coral dark:text-tijum-peach dark:hover:text-tijum-coral"
                                                >
                                                    <span>
                                                        View / Print Receipt
                                                    </span>
                                                    <ArrowRight
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                </a>
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Price snapshot</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <PriceRow
                                    label={reservation.rate_unit_label}
                                    value={formatReservationMoney(
                                        reservation.unit_rate_minor,
                                        reservation.currency_code,
                                    )}
                                />
                                <PriceRow
                                    label="Quantity"
                                    value={String(reservation.quantity)}
                                />
                                <PriceRow
                                    label="Duration quantity"
                                    value={String(
                                        reservation.duration_quantity,
                                    )}
                                />
                                <div className="border-t border-tijum-surface pt-3 dark:border-border">
                                    <PriceRow
                                        label="Reservation total"
                                        value={formatReservationMoney(
                                            reservation.total_amount_minor,
                                            reservation.currency_code,
                                        )}
                                        strong
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    This amount is the immutable rate snapshot
                                    from submission. The 15-minute inventory
                                    hold confirms automatically after
                                    backend-verified payment.
                                </p>
                            </CardContent>
                        </Card>

                        {reservation.requires_refund_review && (
                            <Card className="border-tijum-peach bg-tijum-peach/15 dark:border-tijum-coral/40 dark:bg-tijum-coral/10">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="size-4 text-tijum-coral" />
                                        <CardTitle className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                            Refund Review Underway
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    This reservation was cancelled after payment
                                    was captured. TIJUM customer support is
                                    reviewing the transaction for manual gateway
                                    refund processing. You will receive updates
                                    once processed.
                                </CardContent>
                            </Card>
                        )}

                        {reservation.refunds &&
                            reservation.refunds.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                            Refund History
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {reservation.refunds.map((refund) => (
                                            <div
                                                key={refund.id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3 text-xs dark:border-border dark:bg-muted/30"
                                            >
                                                <div>
                                                    <p className="font-medium tabular-nums text-tijum-plum dark:text-foreground">
                                                        {formatPrice(
                                                            refund.amount_minor,
                                                            refund.currency_code,
                                                        )}{' '}
                                                        ·{' '}
                                                        <span className="capitalize">
                                                            {
                                                                refund.status_label
                                                            }
                                                        </span>
                                                    </p>
                                                    {refund.reason && (
                                                        <p className="text-muted-foreground">
                                                            Reason:{' '}
                                                            {refund.reason}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right text-muted-foreground">
                                                    <p className="font-mono">
                                                        {refund.gateway_refund_id ||
                                                            'Pending'}
                                                    </p>
                                                    <p>
                                                        {new Date(
                                                            refund.created_at,
                                                        ).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}
                    </aside>
                </div>
            </div>
        </ResponsiveContainer>
    );
}

function formatPolicyValue(value: string): string {
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function DetailItem({
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
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-cream text-tijum-coral dark:bg-tijum-coral/15 dark:text-tijum-coral">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
                <p className="text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase dark:text-muted-foreground">
                    {label}
                </p>
                <p className="mt-1 font-semibold text-tijum-plum dark:text-foreground">
                    {value}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {detail}
                </p>
            </div>
        </div>
    );
}

function PriceRow({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span
                className={
                    strong
                        ? 'font-heading text-lg font-bold tabular-nums text-tijum-plum dark:text-foreground'
                        : 'font-semibold tabular-nums text-tijum-plum dark:text-foreground'
                }
            >
                {value}
            </span>
        </div>
    );
}

function NoticeCard({ title, body }: { title: string; body: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
                {body}
            </CardContent>
        </Card>
    );
}
