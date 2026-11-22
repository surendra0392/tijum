import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CalendarCheck,
    CreditCard,
    IndianRupee,
    RotateCcw,
    ShieldAlert,
    User,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function formatPrice(minor: number, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(minor / 100);
}

type PaymentDetailProps = {
    refund_request_key: string;
    payment: {
        id: number;
        gateway: string;
        gateway_order_id: string;
        gateway_payment_id: string | null;
        amount_minor: number;
        refunded_amount_minor: number;
        refundable_balance_minor: number;
        currency_code: string;
        status: string;
        status_label: string;
        payment_method: string | null;
        failure_reason: string | null;
        captured_at: string | null;
        failed_at: string | null;
        created_at: string;
        has_unresolved_refund: boolean;
        can_refund: boolean;
    };
    reservation: {
        id: number;
        booking_reference: string;
        status: string;
        status_label: string;
        property_name: string | null;
        room_type_name: string | null;
        check_in_date: string;
        checkout_date: string;
        total_amount_minor: number;
    };
    customer: {
        id: number | null;
        name: string | null;
        email: string | null;
        phone: string | null;
    };
    refunds: Array<{
        id: number;
        gateway_refund_id: string | null;
        amount_minor: number;
        currency_code: string;
        status: string;
        status_label: string;
        reason: string | null;
        admin_name: string | null;
        processed_at: string | null;
        created_at: string;
    }>;
    status?: string;
};

function getPaymentSemantic(st: string): SemanticStatus {
    switch (st) {
        case 'captured':
            return 'verified';
        case 'authorized':
            return 'info';
        case 'refund_pending':
            return 'warning';
        case 'refunded':
        case 'partially_refunded':
            return 'neutral';
        case 'failed':
            return 'rejected';
        case 'cancelled':
            return 'cancelled';
        default:
            return 'pending';
    }
}

export default function AdminPaymentShow({
    payment,
    reservation,
    customer,
    refunds,
    refund_request_key,
    status,
}: PaymentDetailProps) {
    const [refundRupees, setRefundRupees] = useState<string>(
        String(payment.refundable_balance_minor / 100),
    );
    const [refundRequestKey, setRefundRequestKey] =
        useState(refund_request_key);

    return (
        <div className="space-y-6">
            <Head title={`Payment #${payment.id} · Admin`} />

            <PageHeader
                eyebrow="Payment Detail"
                title={`Transaction #${payment.id}`}
                description={`Gateway Reference: ${payment.gateway_payment_id || payment.gateway_order_id}`}
                badges={
                    <StatusBadge
                        status={getPaymentSemantic(payment.status)}
                        label={payment.status_label}
                    />
                }
                actions={
                    <Button asChild variant="outline">
                        <Link href="/admin/payments">
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            <span>All payments</span>
                        </Link>
                    </Button>
                }
            />

            {status && (
                <Alert
                    variant="success"
                    role="status"
                    className="border-l-4 border-l-emerald-500"
                >
                    <AlertTitle>Gateway Update</AlertTitle>
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            {/* Top Grid: Transaction KPIs */}
            <section
                aria-label="Transaction financial metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Captured Amount"
                    value={formatPrice(
                        payment.amount_minor,
                        payment.currency_code,
                    )}
                    helperText={`Via ${payment.gateway} (${payment.payment_method || 'online'})`}
                    icon={IndianRupee}
                    className="border-l-4 border-l-emerald-500"
                />

                <StatCard
                    label="Refundable Balance"
                    value={formatPrice(
                        payment.refundable_balance_minor,
                        payment.currency_code,
                    )}
                    helperText={
                        payment.refunded_amount_minor > 0
                            ? `Refunded so far: ${formatPrice(payment.refunded_amount_minor, payment.currency_code)}`
                            : 'No refunds recorded'
                    }
                    icon={RotateCcw}
                    className={
                        payment.refunded_amount_minor > 0
                            ? 'border-l-4 border-l-amber-500'
                            : undefined
                    }
                />

                <StatCard
                    label="Payment Status"
                    value={payment.status_label}
                    badge={
                        <StatusBadge
                            status={getPaymentSemantic(payment.status)}
                            label={payment.status_label}
                        />
                    }
                    helperText={
                        payment.captured_at
                            ? `Captured on ${new Date(payment.captured_at).toLocaleString('en-IN')}`
                            : 'Not captured'
                    }
                    icon={CreditCard}
                />

                <Card className="min-w-0 gap-4 py-5">
                    <CardHeader className="flex-row items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                            <CardDescription>
                                Linked Reservation
                            </CardDescription>
                            <CardTitle className="text-lg">
                                <Link
                                    href={`/admin/reservations/${reservation.booking_reference}`}
                                    className="inline-flex items-center gap-1.5 font-mono text-base font-bold text-tijum-coral tabular-nums hover:underline"
                                >
                                    <span>{reservation.booking_reference}</span>
                                    <ArrowRight
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </CardTitle>
                        </div>
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                            <CalendarCheck
                                className="size-5"
                                aria-hidden="true"
                            />
                        </span>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground capitalize">
                        Status: {reservation.status_label}
                    </CardContent>
                </Card>
            </section>

            {/* Main Content: Split Columns */}
            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
                {/* Left 7 cols: Details & Linked Entities */}
                <div className="space-y-6 lg:col-span-7">
                    {/* Gateway Audit Card */}
                    <Card>
                        <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CreditCard
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Gateway Transaction Audit</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="flex items-center justify-between gap-4 border-b border-tijum-surface/60 pb-2.5 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Gateway Provider
                                </span>
                                <span className="font-heading font-semibold text-tijum-plum uppercase dark:text-foreground">
                                    {payment.gateway}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-b border-tijum-surface/60 pb-2.5 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Gateway Order ID
                                </span>
                                <span className="font-mono font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                    {payment.gateway_order_id}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-b border-tijum-surface/60 pb-2.5 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Gateway Payment ID
                                </span>
                                <span className="font-mono font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                    {payment.gateway_payment_id || '—'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 border-b border-tijum-surface/60 pb-2.5 dark:border-border">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Currency
                                </span>
                                <span className="font-mono font-semibold text-tijum-plum dark:text-foreground">
                                    {payment.currency_code}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 pb-1">
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    Payment Method
                                </span>
                                <span className="font-medium text-tijum-plum capitalize dark:text-foreground">
                                    {payment.payment_method || 'Online'}
                                </span>
                            </div>
                            {payment.failure_reason && (
                                <Alert variant="destructive" className="mt-2">
                                    <AlertTitle>
                                        Failure / Cancellation Reason
                                    </AlertTitle>
                                    <AlertDescription>
                                        {payment.failure_reason}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Linked Parties Card */}
                    <Card>
                        <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Building2
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Linked Parties &amp; Property</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 text-xs sm:grid-cols-2">
                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                <div className="flex items-center gap-2 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                    <User
                                        className="size-3.5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Customer Account</span>
                                </div>
                                <p className="mt-1.5 text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    {customer.name || 'Guest'}
                                </p>
                                <p className="mt-0.5 text-tijum-plum-muted dark:text-muted-foreground">
                                    {customer.email || '—'} ·{' '}
                                    {customer.phone || '—'}
                                </p>
                            </div>

                            <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                <div className="flex items-center gap-2 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                    <CalendarCheck
                                        className="size-3.5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Accommodation Stay</span>
                                </div>
                                <p className="mt-1.5 text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    {reservation.property_name || 'Property'}
                                </p>
                                <p className="mt-0.5 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    {reservation.room_type_name} ·{' '}
                                    {reservation.check_in_date} to{' '}
                                    {reservation.checkout_date}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Refund History Card */}
                    <Card>
                        <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <RotateCcw
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Refund History ({refunds.length})</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {refunds.length === 0 ? (
                                <EmptyState
                                    icon={RotateCcw}
                                    title="No refunds recorded"
                                    description="No refunds have been initiated for this payment transaction."
                                    className="border-0 py-6 shadow-none"
                                />
                            ) : (
                                <div className="space-y-3">
                                    {refunds.map((r) => (
                                        <div
                                            key={r.id}
                                            className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-xs dark:border-border dark:bg-muted/45"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-heading text-sm font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                                    {formatPrice(
                                                        r.amount_minor,
                                                        r.currency_code,
                                                    )}
                                                </span>
                                                <StatusBadge
                                                    status={
                                                        r.status === 'processed'
                                                            ? 'completed'
                                                            : r.status ===
                                                                'failed'
                                                              ? 'rejected'
                                                              : 'processing'
                                                    }
                                                    label={r.status_label}
                                                />
                                            </div>
                                            <p className="mt-1.5 text-tijum-plum-muted dark:text-muted-foreground">
                                                Reason:{' '}
                                                {r.reason || 'Not specified'}
                                            </p>
                                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-tijum-surface/70 pt-2 text-[11px] text-tijum-plum-muted tabular-nums dark:border-border dark:text-muted-foreground">
                                                <span>
                                                    Admin:{' '}
                                                    {r.admin_name || 'System'}
                                                </span>
                                                <span className="font-mono">
                                                    Ref:{' '}
                                                    {r.gateway_refund_id ||
                                                        'Pending'}
                                                </span>
                                                <span>
                                                    {new Date(
                                                        r.created_at,
                                                    ).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right 5 cols: Admin Refund Action */}
                <div className="space-y-6 lg:col-span-5">
                    {payment.can_refund ? (
                        <Card className="border-l-4 border-l-tijum-coral">
                            <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldAlert
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Initiate Gateway Refund</span>
                                </CardTitle>
                                <CardDescription>
                                    Explicit administrator refund. Triggers
                                    Razorpay Refund API and credits the
                                    customer&apos;s original payment method.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form
                                    action={`/admin/payments/${payment.id}/refunds`}
                                    method="post"
                                    className="space-y-4"
                                    resetOnSuccess={['reason']}
                                    onSuccess={(page) => {
                                        const key =
                                            page.props.refund_request_key;
                                        if (typeof key === 'string') {
                                            setRefundRequestKey(key);
                                        }
                                        const updatedPayment = page.props
                                            .payment as
                                            | PaymentDetailProps['payment']
                                            | undefined;
                                        if (
                                            updatedPayment &&
                                            typeof updatedPayment.refundable_balance_minor ===
                                                'number'
                                        ) {
                                            setRefundRupees(
                                                String(
                                                    updatedPayment.refundable_balance_minor /
                                                        100,
                                                ),
                                            );
                                        }
                                    }}
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <input
                                                type="hidden"
                                                name="idempotency_key"
                                                value={refundRequestKey}
                                            />
                                            <div className="space-y-2">
                                                <Label htmlFor="refund_amount">
                                                    Refund Amount (₹ INR)
                                                </Label>
                                                <div className="relative">
                                                    <IndianRupee
                                                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                                        aria-hidden="true"
                                                    />
                                                    <Input
                                                        id="refund_amount"
                                                        type="number"
                                                        step="1"
                                                        min="1"
                                                        max={
                                                            payment.refundable_balance_minor /
                                                            100
                                                        }
                                                        value={refundRupees}
                                                        onChange={(e) =>
                                                            setRefundRupees(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="pl-10 font-semibold tabular-nums"
                                                        required
                                                    />
                                                </div>
                                                <input
                                                    type="hidden"
                                                    name="amount_minor"
                                                    value={Math.round(
                                                        Number(
                                                            refundRupees || 0,
                                                        ) * 100,
                                                    )}
                                                />
                                                <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    Max refundable:{' '}
                                                    {formatPrice(
                                                        payment.refundable_balance_minor,
                                                        payment.currency_code,
                                                    )}
                                                </p>
                                                <InputError
                                                    message={
                                                        errors.amount_minor ||
                                                        errors.amount ||
                                                        errors.payment ||
                                                        errors.idempotency_key
                                                    }
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="reason">
                                                    Refund Reason
                                                </Label>
                                                <Textarea
                                                    id="reason"
                                                    name="reason"
                                                    rows={3}
                                                    placeholder="Explain the operational or customer support reason for this refund…"
                                                    required
                                                />
                                                <InputError
                                                    message={errors.reason}
                                                />
                                            </div>

                                            <Button
                                                type="submit"
                                                variant="destructive"
                                                loading={processing}
                                                className="w-full"
                                                disabled={
                                                    processing ||
                                                    Number(refundRupees) <= 0
                                                }
                                            >
                                                {processing
                                                    ? 'Processing Gateway Refund…'
                                                    : `Process Refund of ₹${Number(refundRupees || 0).toLocaleString('en-IN')}`}
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-l-4 border-l-tijum-surface dark:border-l-border">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Refund Unavailable
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                {payment.has_unresolved_refund
                                    ? 'An earlier refund attempt requires Razorpay reconciliation before another refund can be initiated.'
                                    : payment.status !== 'captured' &&
                                        payment.status !== 'partially_refunded'
                                      ? `This transaction is in '${payment.status_label}' state and cannot be refunded.`
                                      : 'The remaining refundable balance for this transaction is zero or reserved by settlements and pending refunds.'}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
