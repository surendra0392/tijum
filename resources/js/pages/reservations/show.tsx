import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Ban,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronDown,
    Clock,
    Clock3,
    Copy,
    CreditCard,
    DoorClosed,
    DoorOpen,
    FileText,
    Home,
    LifeBuoy,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    ShieldAlert,
    Star,
    UserRound,
    Users,
    Utensils,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import InputError from '@/components/input-error';
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
import { formatReservationDate } from '@/lib/reservation-format';
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

function formatAmount(minor: number, currency = 'INR'): string {
    const hasSubunits = minor % 100 !== 0;

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: hasSubunits ? 2 : 0,
        maximumFractionDigits: 2,
    }).format(minor / 100);
}

function formatDateTime(isoString?: string | null): string | null {
    if (!isoString) {
        return null;
    }

    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
    }).format(parsed);
}

function formatPolicyValue(value: string): string {
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatPaymentMethod(method?: string | null): string {
    if (!method) {
        return 'Online';
    }

    const normalized = method.toLowerCase();
    if (normalized === 'upi' || normalized === 'emi') {
        return normalized.toUpperCase();
    }

    return formatPolicyValue(normalized);
}

function formatQuantityLabel(
    quantity: number,
    basis: 'guest_places' | 'private_rooms',
    fallbackLabel: string,
): string {
    if (basis === 'private_rooms') {
        return `${quantity} Private Room${quantity === 1 ? '' : 's'}`;
    }

    if (basis === 'guest_places') {
        return `${quantity} Guest Place${quantity === 1 ? '' : 's'}`;
    }

    return `${quantity} ${fallbackLabel}`;
}

function formatDurationDetail(reservation: ReservationDetail): string {
    if (reservation.duration_type === 'daily') {
        return `${reservation.total_stay_days} day${reservation.total_stay_days === 1 ? '' : 's'} stay`;
    }

    return `${reservation.duration_label} · ${reservation.total_stay_days} stay day${reservation.total_stay_days === 1 ? '' : 's'}`;
}

function formatRoomOccupancyDetail(reservation: ReservationDetail): string {
    const parts: string[] = [];

    if (reservation.quantity_basis !== 'private_rooms') {
        parts.push(reservation.sharing_label);
    }

    parts.push(
        formatQuantityLabel(
            reservation.quantity,
            reservation.quantity_basis,
            reservation.quantity_basis_label,
        ),
    );
    parts.push(
        `${reservation.guest_count} guest${reservation.guest_count === 1 ? '' : 's'}`,
    );
    parts.push(formatPolicyValue(reservation.guest_gender));
    parts.push(formatPolicyValue(reservation.guest_composition));

    return parts.join(' · ');
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
    const page = usePage();
    const pageErrors = page.props.errors as Record<string, string> | undefined;

    const [paying, setPaying] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [copiedRef, setCopiedRef] = useState(false);
    const [statusDismissed, setStatusDismissed] = useState(false);
    const [showCancelForm, setShowCancelForm] = useState(() =>
        Boolean(pageErrors?.cancellation_reason),
    );
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

    const handleCopyReference = async () => {
        try {
            await navigator.clipboard.writeText(reservation.booking_reference);
            setCopiedRef(true);
            window.setTimeout(() => setCopiedRef(false), 2000);
        } catch {
            // Clipboard access may be unavailable in restricted contexts
        }
    };

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
                            onError: (errors) => {
                                const firstError = Object.values(errors)[0];
                                setPaymentError(
                                    typeof firstError === 'string'
                                        ? firstError
                                        : 'Payment signature verification failed. Please retry or contact support.',
                                );
                                setPaying(false);
                            },
                            onFinish: () => {
                                setPaying(false);
                            },
                        },
                    );
                },
                modal: {
                    ondismiss: () => {
                        setPaying(false);
                        setPaymentError(
                            'Payment checkout was cancelled before completion. You can try again within your payment window.',
                        );
                    },
                },
            });

            rzp.on('payment.failed', (failureResponse: unknown) => {
                const payload = failureResponse as {
                    error?: { description?: string; reason?: string };
                };
                setPaying(false);
                setPaymentError(
                    payload?.error?.description ||
                        payload?.error?.reason ||
                        'Payment failed at the gateway. Please try another payment method.',
                );
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
    const isConfirmed = reservation.status === 'confirmed';
    const isConfirmedOrCancelled =
        isConfirmed || reservation.status === 'cancelled';
    const canPay = reservation.can_pay === true;
    const isCancelOrErrorStatus =
        reservation.status === 'cancelled' ||
        reservation.status === 'expired' ||
        Boolean(status && status.toLowerCase().includes('cancel'));
    const meals = [
        reservation.breakfast_included && 'Breakfast',
        reservation.lunch_included && 'Lunch',
        reservation.dinner_included && 'Dinner',
    ].filter((meal): meal is string => Boolean(meal));

    const paidTimestamp = formatDateTime(
        reservation.payment_summary?.captured_at ?? reservation.confirmed_at,
    );
    const formattedCheckInDate = formatReservationDate(
        reservation.check_in_date,
    );
    const formattedCheckoutDate = formatReservationDate(
        reservation.checkout_date,
    );
    const formattedCheckInTime = formatStayTime(
        reservation.standard_check_in_time,
    );
    const formattedCheckOutTime = formatStayTime(
        reservation.standard_check_out_time,
    );

    return (
        <ResponsiveContainer width="wide" className="py-6 sm:py-8">
            <div className="space-y-6 pb-12">
                <Head
                    title={`${reservation.property_name} · ${reservation.booking_reference}`}
                />

                {/* Top Breadcrumb & Reservation Header */}
                <header className="space-y-4">
                    <Breadcrumbs
                        breadcrumbs={
                            isConfirmedOrCancelled
                                ? [
                                      {
                                          title: 'My Reservations',
                                          href: '/reservations',
                                      },
                                      {
                                          title: 'Booking Details',
                                          current: true,
                                      },
                                  ]
                                : [
                                      {
                                          title: reservation.property_name,
                                          href: '#',
                                      },
                                      {
                                          title: 'Booking Details',
                                          current: true,
                                      },
                                  ]
                        }
                    />

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge
                                    status={reservation.status_semantic}
                                    label={reservation.status_label}
                                />
                                <div className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-tijum-surface/90 bg-white px-2.5 py-0.5 text-xs text-tijum-plum-muted shadow-2xs dark:border-border dark:bg-card dark:text-muted-foreground">
                                    <span className="shrink-0 font-medium">
                                        Ref:
                                    </span>
                                    <span className="truncate font-mono font-semibold text-tijum-plum dark:text-foreground">
                                        {reservation.booking_reference}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyReference}
                                        aria-label="Copy booking reference"
                                        title={
                                            copiedRef
                                                ? 'Copied'
                                                : 'Copy booking reference'
                                        }
                                        className="ml-0.5 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-tijum-plum-muted transition-colors hover:bg-tijum-cream hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none dark:hover:bg-muted dark:hover:text-foreground"
                                    >
                                        {copiedRef ? (
                                            <Check
                                                className="size-3 text-emerald-600 dark:text-emerald-400"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Copy
                                                className="size-3"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <h1 className="font-heading text-2xl font-bold tracking-tight text-balance text-tijum-plum sm:text-3xl dark:text-foreground">
                                {reservation.property_name}
                            </h1>

                            <p className="flex flex-wrap items-center gap-1.5 text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                <MapPin
                                    className="size-4 shrink-0 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>{reservation.property_locality}</span>
                                <span aria-hidden="true">·</span>
                                <span>{reservation.property_category}</span>
                            </p>
                        </div>

                        {isConfirmedOrCancelled && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={index().url}>
                                        <ArrowLeft
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        All reservations
                                    </Link>
                                </Button>

                                {isConfirmed && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setShowReportModal(!showReportModal)
                                        }
                                        className="border-tijum-coral/40 text-tijum-plum hover:bg-tijum-coral/10 dark:border-tijum-coral/40 dark:text-tijum-peach dark:hover:bg-tijum-coral/15"
                                    >
                                        <LifeBuoy
                                            className="size-4 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        Report a problem
                                    </Button>
                                )}

                                {reservation.can_view_receipt ? (
                                    <Button asChild variant="plum" size="sm">
                                        <a
                                            href={`/reservations/${reservation.booking_reference}/receipt`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <FileText
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            Printable receipt
                                        </a>
                                    </Button>
                                ) : (
                                    <Button asChild variant="plum" size="sm">
                                        <Link href="/">
                                            <Home
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            Return to home
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {/* Flash Status Notice */}
                {status && !statusDismissed && (
                    <div
                        role="status"
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                            isCancelOrErrorStatus
                                ? 'border-status-error-border bg-status-error-bg text-status-error-fg'
                                : isAwaitingPayment
                                  ? 'border-status-warning-border bg-status-warning-bg text-status-warning-fg'
                                  : 'border-status-success-border bg-status-success-bg text-status-success-fg'
                        }`}
                    >
                        <div className="flex items-center gap-2.5">
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
                        <button
                            type="button"
                            onClick={() => setStatusDismissed(true)}
                            aria-label="Dismiss notification"
                            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none"
                        >
                            <X className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}

                {/* Main Two-Column Content */}
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(21rem,0.85fr)]">
                    {/* Left Column: Stay Itinerary, Guest Contact & Actions */}
                    <div className="min-w-0 space-y-6">
                        {/* Active Relocation Offer Banner */}
                        {reservation.active_relocation && (
                            <div className="rounded-[20px] border-2 border-tijum-coral bg-white p-5 shadow-tijum-card dark:border-tijum-coral/60 dark:bg-card">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-coral text-white">
                                            <Home
                                                className="size-5"
                                                aria-hidden="true"
                                            />
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
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Active Support Cases Banner */}
                        {reservation.cases && reservation.cases.length > 0 && (
                            <div className="rounded-[20px] border border-tijum-peach bg-tijum-peach/15 p-4 shadow-2xs dark:border-tijum-coral/40 dark:bg-tijum-coral/10">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <ShieldAlert
                                            className="size-5 shrink-0 text-tijum-coral"
                                            aria-hidden="true"
                                        />
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
                                            <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
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
                                        className="inline-flex items-center gap-1 self-end text-xs font-semibold text-tijum-plum underline underline-offset-4 hover:text-tijum-coral sm:self-auto dark:text-tijum-peach dark:hover:text-tijum-coral"
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
                                    <div className="flex items-center justify-between gap-3">
                                        <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                            <LifeBuoy
                                                className="size-4 text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                Report a stay problem or food
                                                issue
                                            </span>
                                        </CardTitle>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                setShowReportModal(false)
                                            }
                                            className="h-8 px-2.5 text-xs"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                    <p className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                        Experiencing an issue with your room,
                                        amenities, or promised meals? Submit a
                                        case and our protection team will step
                                        in.
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
                                                Category of problem
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
                                                Describe what happened
                                            </Label>
                                            <Textarea
                                                id="report_description"
                                                rows={3}
                                                required
                                                placeholder="Provide details of the room condition, missing meals, or communication with the host…"
                                                value={reportDescription}
                                                onChange={(e) =>
                                                    setReportDescription(
                                                        e.target.value,
                                                    )
                                                }
                                                className="resize-none text-sm"
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
                                            >
                                                {reportingProblem
                                                    ? 'Submitting…'
                                                    : 'Submit support ticket'}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Unified Stay Itinerary & Guest Snapshot Card */}
                        <Card className="gap-0 overflow-hidden py-0">
                            {isConfirmed && (
                                <div className="flex flex-col gap-3 border-b border-tijum-surface/75 bg-tijum-cream/55 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/35">
                                    <div className="flex items-start gap-3">
                                        {reservation.is_checked_out ? (
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                <DoorClosed
                                                    className="size-4.5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        ) : reservation.is_checked_in ? (
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                <DoorOpen
                                                    className="size-4.5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        ) : (
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tijum-plum/10 text-tijum-plum dark:bg-muted dark:text-foreground">
                                                <Clock
                                                    className="size-4.5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                        )}

                                        <div className="min-w-0">
                                            <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                {reservation.is_checked_out
                                                    ? 'Stay completed · Checked out'
                                                    : reservation.is_checked_in
                                                      ? 'Checked in · Welcome to your stay'
                                                      : `Check-in on ${formattedCheckInDate}`}
                                            </p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                {reservation.is_checked_out
                                                    ? `Departure finalized on ${formattedCheckoutDate}. Thank you for staying with ${reservation.property_name}.`
                                                    : reservation.is_checked_in
                                                      ? `Checked in at reception. Scheduled checkout on ${formattedCheckoutDate} by ${formattedCheckOutTime}.`
                                                      : `Standard check-in begins at ${formattedCheckInTime}.${
                                                            reservation.early_check_in_requested
                                                                ? ` Early arrival requested (${reservation.requested_arrival_time ? formatStayTime(reservation.requested_arrival_time) : 'morning'}).`
                                                                : ''
                                                        }`}
                                            </p>
                                        </div>
                                    </div>

                                    {reservation.is_checked_in &&
                                        !reservation.is_checked_out && (
                                            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                <CheckCircle2
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Active stay
                                            </span>
                                        )}
                                </div>
                            )}

                            <div className="p-6">
                                <h2 className="mb-4 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                    Stay itinerary
                                </h2>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <DetailTile
                                        icon={CalendarDays}
                                        label="Stay dates"
                                        value={`${formattedCheckInDate} – ${formattedCheckoutDate}`}
                                        detail={formatDurationDetail(
                                            reservation,
                                        )}
                                    />
                                    <DetailTile
                                        icon={Users}
                                        label="Room category"
                                        value={`${reservation.room_type_name} · ${reservation.room_type_ac_label}`}
                                        detail={formatRoomOccupancyDetail(
                                            reservation,
                                        )}
                                    />
                                    <DetailTile
                                        icon={Clock3}
                                        label="Stay timing"
                                        value={`${formattedCheckInTime} check-in · ${formattedCheckOutTime} checkout`}
                                        detail={
                                            reservation.early_check_in_requested &&
                                            reservation.requested_arrival_time
                                                ? `Early arrival requested for ${formatStayTime(reservation.requested_arrival_time)}, subject to room readiness.`
                                                : 'Standard check-in and checkout timing applies.'
                                        }
                                    />
                                    <DetailTile
                                        icon={Utensils}
                                        label="Included food"
                                        value={
                                            meals.length > 0
                                                ? meals.join(', ')
                                                : 'Meal details unavailable'
                                        }
                                        detail="Included with your stay. No separate meal package needed."
                                    />
                                </div>
                            </div>

                            {(reservation.contact_name ||
                                reservation.contact_email ||
                                reservation.contact_phone) && (
                                <div className="border-t border-tijum-surface/75 bg-tijum-cream/25 px-6 py-5 dark:border-border dark:bg-muted/20">
                                    <p className="mb-3 font-heading text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                        Primary guest contact
                                    </p>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
                                        {reservation.contact_name && (
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-tijum-plum-muted shadow-2xs dark:bg-card dark:text-muted-foreground">
                                                    <UserRound
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                                    {reservation.contact_name}
                                                </span>
                                            </div>
                                        )}
                                        {reservation.contact_phone && (
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-tijum-plum-muted shadow-2xs dark:bg-card dark:text-muted-foreground">
                                                    <Phone
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <span className="tabular-nums text-tijum-plum dark:text-foreground">
                                                    {reservation.contact_phone}
                                                </span>
                                            </div>
                                        )}
                                        {reservation.contact_email && (
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-tijum-plum-muted shadow-2xs dark:bg-card dark:text-muted-foreground">
                                                    <Mail
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <span className="break-all text-tijum-plum dark:text-foreground">
                                                    {reservation.contact_email}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Review Call-to-Action or Submitted Review Card */}
                        {reservation.review ? (
                            <Card className="border-tijum-coral/35 bg-white shadow-tijum-card dark:border-tijum-coral/35 dark:bg-card">
                                <CardHeader className="pb-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Star
                                                className="size-4 fill-tijum-coral text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            <CardTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                                Your stay review
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
                                                    className="h-8 text-xs"
                                                >
                                                    <Link
                                                        href={`/reviews/${reservation.review.id}/edit`}
                                                    >
                                                        Edit review
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <ReviewStars
                                            rating={
                                                reservation.review
                                                    .overall_rating
                                            }
                                        />
                                        <span className="text-xs font-semibold text-tijum-plum dark:text-foreground">
                                            {reservation.review.overall_rating}{' '}
                                            / 5 stars
                                        </span>
                                    </div>
                                    {reservation.review.title && (
                                        <p className="font-semibold text-tijum-plum dark:text-foreground">
                                            {reservation.review.title}
                                        </p>
                                    )}
                                    {reservation.review.content && (
                                        <p className="text-xs leading-relaxed whitespace-pre-line text-tijum-plum-muted dark:text-muted-foreground">
                                            {reservation.review.content}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        ) : reservation.review_eligibility?.is_eligible ? (
                            <Card className="border-tijum-peach/70 bg-tijum-peach/15 py-5 dark:border-tijum-coral/40 dark:bg-tijum-coral/10">
                                <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-tijum-plum uppercase dark:text-tijum-peach">
                                            <Star
                                                className="size-4 fill-tijum-coral text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            Share your feedback
                                        </div>
                                        <h3 className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                            How was your food-inclusive stay?
                                        </h3>
                                        <p className="max-w-lg text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                            Share your experience to help future
                                            students and professionals pick the
                                            right stay.
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
                                    <Button
                                        asChild
                                        size="sm"
                                        className="shrink-0"
                                    >
                                        <Link
                                            href={`/reservations/${reservation.booking_reference}/review`}
                                        >
                                            Write a review
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : null}

                        {/* Cancellation Reason (if cancelled) */}
                        {reservation.cancellation_reason && (
                            <NoticeCard
                                title="Cancellation reason"
                                body={reservation.cancellation_reason}
                            />
                        )}

                        {/* Collapsible Cancel Reservation Control */}
                        {reservation.can_cancel && (
                            <Card className="gap-0 overflow-hidden py-0">
                                <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-error-bg text-status-error-fg">
                                            <Ban
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                Need to change your plans?
                                            </p>
                                            <p className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                Cancelling releases your
                                                reserved room. Paid
                                                cancellations are queued for
                                                refund review.
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setShowCancelForm(!showCancelForm)
                                        }
                                        aria-expanded={showCancelForm}
                                        className="shrink-0 border-status-error-border text-status-error-fg hover:bg-status-error-bg"
                                    >
                                        <span>
                                            {showCancelForm
                                                ? 'Hide form'
                                                : 'Cancel reservation'}
                                        </span>
                                        <ChevronDown
                                            className={`size-4 transition-transform duration-200 ${
                                                showCancelForm
                                                    ? 'rotate-180'
                                                    : ''
                                            }`}
                                            aria-hidden="true"
                                        />
                                    </Button>
                                </div>

                                {showCancelForm && (
                                    <div className="border-t border-tijum-surface/75 bg-tijum-cream/30 px-6 py-5 dark:border-border dark:bg-muted/20">
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
                                                        className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                                    >
                                                        Reason for cancelling
                                                        (optional)
                                                    </label>
                                                    <Textarea
                                                        id="cancellation_reason"
                                                        name="cancellation_reason"
                                                        rows={3}
                                                        placeholder="Let the property know why your plans changed."
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
                                                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                setShowCancelForm(
                                                                    false,
                                                                )
                                                            }
                                                        >
                                                            Keep reservation
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={
                                                                processing
                                                            }
                                                        >
                                                            {processing
                                                                ? 'Cancelling…'
                                                                : 'Confirm cancellation'}
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </Form>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>

                    {/* Right Column: Sticky Payment & Price Summary */}
                    <aside className="min-w-0 space-y-5 lg:sticky lg:top-24">
                        {isAwaitingPayment && (
                            <Card className="border-tijum-coral/40 bg-white shadow-tijum-card dark:border-tijum-coral/40 dark:bg-card">
                                <CardHeader className="gap-3 pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-coral/15 text-tijum-coral dark:bg-tijum-coral/20">
                                                <Clock
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <div>
                                                <CardTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                                    Complete payment
                                                </CardTitle>
                                                <p className="mt-0.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Your room is held for 15
                                                    minutes while you pay.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {secondsLeft !== null && (
                                        <div
                                            className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${
                                                secondsLeft > 0
                                                    ? 'bg-tijum-peach/25 text-tijum-plum dark:bg-muted dark:text-foreground'
                                                    : 'bg-tijum-coral/15 text-tijum-plum dark:bg-destructive/20 dark:text-destructive'
                                            }`}
                                        >
                                            <Clock
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                {secondsLeft > 0
                                                    ? `Expires in ${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, '0')}`
                                                    : 'Payment window expired'}
                                            </span>
                                        </div>
                                    )}
                                </CardHeader>

                                <CardContent className="space-y-4 pt-0">
                                    <div className="space-y-3 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/65 p-4 dark:border-border dark:bg-muted/45">
                                        <div>
                                            <p className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                                Amount due
                                            </p>
                                            <p className="mt-0.5 font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                                {formatAmount(
                                                    reservation.total_amount_minor,
                                                    reservation.currency_code,
                                                )}
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
                                                        <RefreshCw
                                                            className="size-4 animate-spin"
                                                            aria-hidden="true"
                                                        />
                                                        Processing…
                                                    </>
                                                ) : (
                                                    <>
                                                        <CreditCard
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                        Pay now with Razorpay
                                                    </>
                                                )}
                                            </Button>
                                        ) : (
                                            <p className="text-xs font-medium text-destructive">
                                                This payment window has closed
                                                and the reservation will expire
                                                automatically.
                                            </p>
                                        )}
                                    </div>

                                    {paymentError && (
                                        <div
                                            role="alert"
                                            className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
                                        >
                                            <AlertCircle
                                                className="mt-0.5 size-4 shrink-0"
                                                aria-hidden="true"
                                            />
                                            <span>{paymentError}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {isConfirmed && (
                            <Card className="gap-4 border-emerald-200/90 bg-white py-5 dark:border-emerald-800/50 dark:bg-card">
                                <CardHeader className="pb-0">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                            <CheckCircle2
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="min-w-0">
                                            <CardTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                                Payment confirmed
                                            </CardTitle>
                                            <p className="mt-0.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Your stay is verified and locked
                                                in.
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>

                                {reservation.payment_summary && (
                                    <CardContent className="pt-0">
                                        <dl className="divide-y divide-tijum-surface/65 rounded-2xl border border-tijum-surface/75 bg-tijum-cream/50 px-4 text-xs dark:divide-border/70 dark:border-border dark:bg-muted/35">
                                            <div className="flex items-center justify-between gap-4 py-2.5">
                                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                    Payment method
                                                </dt>
                                                <dd className="font-semibold text-tijum-plum dark:text-foreground">
                                                    {formatPaymentMethod(
                                                        reservation
                                                            .payment_summary
                                                            .payment_method,
                                                    )}
                                                </dd>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 py-2.5">
                                                <dt className="text-tijum-plum-muted dark:text-muted-foreground">
                                                    Amount paid
                                                </dt>
                                                <dd className="font-heading text-sm font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                                    {formatAmount(
                                                        reservation
                                                            .payment_summary
                                                            .amount_minor,
                                                        reservation
                                                            .payment_summary
                                                            .currency_code,
                                                    )}
                                                </dd>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 py-2.5">
                                                <dt className="shrink-0 text-tijum-plum-muted dark:text-muted-foreground">
                                                    Transaction ID
                                                </dt>
                                                <dd className="text-right font-mono text-[11px] font-medium break-all select-all text-tijum-plum dark:text-foreground">
                                                    {reservation.payment_summary
                                                        .gateway_payment_id ||
                                                        '—'}
                                                </dd>
                                            </div>
                                            {paidTimestamp && (
                                                <div className="flex items-center justify-between gap-4 py-2.5">
                                                    <dt className="shrink-0 text-tijum-plum-muted dark:text-muted-foreground">
                                                        Paid on
                                                    </dt>
                                                    <dd className="text-right font-medium tabular-nums text-tijum-plum dark:text-foreground">
                                                        {paidTimestamp}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </CardContent>
                                )}
                            </Card>
                        )}

                        {/* Price Breakdown Card */}
                        <Card className="gap-4 py-5">
                            <CardHeader className="flex-row items-center justify-between gap-3 pb-0">
                                <CardTitle className="font-heading text-base font-bold">
                                    Price breakdown
                                </CardTitle>
                                {isConfirmed && (
                                    <span className="inline-flex items-center rounded-full bg-status-success-bg px-2.5 py-0.5 font-heading text-[11px] font-semibold text-status-success-fg">
                                        Paid in full
                                    </span>
                                )}
                            </CardHeader>

                            <CardContent className="space-y-3 pt-0 text-sm">
                                <PriceRow
                                    label={reservation.rate_unit_label}
                                    value={formatAmount(
                                        reservation.unit_rate_minor,
                                        reservation.currency_code,
                                    )}
                                />
                                <PriceRow
                                    label={
                                        reservation.quantity_basis ===
                                        'private_rooms'
                                            ? 'Rooms'
                                            : 'Guest places'
                                    }
                                    value={String(reservation.quantity)}
                                />
                                <PriceRow
                                    label="Duration"
                                    value={reservation.duration_label}
                                />
                                <div className="border-t border-tijum-surface/80 pt-3.5 dark:border-border">
                                    <PriceRow
                                        label={
                                            isConfirmed
                                                ? 'Total paid'
                                                : isAwaitingPayment
                                                  ? 'Total payable'
                                                  : 'Reservation total'
                                        }
                                        value={formatAmount(
                                            reservation.total_amount_minor,
                                            reservation.currency_code,
                                        )}
                                        strong
                                    />
                                </div>
                                <p className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                    {isConfirmed
                                        ? 'Locked-in booking rate paid in full. All listed meals are included with no extra food charges.'
                                        : isAwaitingPayment
                                          ? 'Rate locked for your 15-minute payment window and confirmed immediately upon payment.'
                                          : 'Locked-in rate snapshot recorded when this booking was submitted.'}
                                </p>
                            </CardContent>
                        </Card>

                        {reservation.requires_refund_review && (
                            <Card className="gap-3 border-tijum-peach bg-tijum-peach/15 py-5 dark:border-tijum-coral/40 dark:bg-tijum-coral/10">
                                <CardHeader className="pb-0">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle
                                            className="size-4 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <CardTitle className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                            Refund review underway
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                    {reservation.status === 'expired'
                                        ? 'Payment was received after this reservation expired or could not be fulfilled. TIJUM support is reviewing the transaction for refund processing and will notify you once completed.'
                                        : reservation.status === 'cancelled'
                                          ? 'This reservation was cancelled after payment. TIJUM support is reviewing the transaction for gateway refund processing and will notify you once completed.'
                                          : 'A payment or protection review is underway for this reservation. TIJUM support will update you once completed.'}
                                </CardContent>
                            </Card>
                        )}

                        {reservation.refunds &&
                            reservation.refunds.length > 0 && (
                                <Card className="gap-4 py-5">
                                    <CardHeader className="pb-0">
                                        <CardTitle className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                            Refund history
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 pt-0">
                                        {reservation.refunds.map((refund) => (
                                            <div
                                                key={refund.id}
                                                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3 text-xs dark:border-border dark:bg-muted/30"
                                            >
                                                <div>
                                                    <p className="font-medium tabular-nums text-tijum-plum dark:text-foreground">
                                                        {formatAmount(
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
                                                    <p className="tabular-nums">
                                                        {formatDateTime(
                                                            refund.created_at,
                                                        ) ?? ''}
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

function DetailTile({
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
        <div className="flex gap-3.5 rounded-2xl border border-tijum-surface/70 bg-tijum-cream/35 p-4 dark:border-border/75 dark:bg-muted/25">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-tijum-coral shadow-2xs dark:bg-card dark:text-tijum-coral">
                <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                    {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-tijum-plum dark:text-foreground">
                    {value}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
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
            <span
                className={
                    strong
                        ? 'font-heading font-semibold text-tijum-plum dark:text-foreground'
                        : 'text-tijum-plum-muted dark:text-muted-foreground'
                }
            >
                {label}
            </span>
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

function NoticeCard({ title, body }: { title: string; body: string }) {
    return (
        <Card className="gap-3 py-5">
            <CardHeader className="pb-0">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                {body}
            </CardContent>
        </Card>
    );
}
