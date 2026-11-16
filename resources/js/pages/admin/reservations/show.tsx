import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    CreditCard,
    DoorOpen,
    Layers,
    ShieldAlert,
    UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { ReservationDetailGrid } from '@/components/reservations/reservation-detail-grid';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { formatReservationMoney } from '@/lib/reservation-format';
import { show as caseShow } from '@/routes/admin/customer-cases';
import { show as paymentShow } from '@/routes/admin/payments';
import { show as propertyShow } from '@/routes/admin/properties';
import { index as relocationsIndex } from '@/routes/admin/relocations';
import { index } from '@/routes/admin/reservations';
import type { ReservationDetail } from '@/types';

export default function AdminReservationShow({
    reservation,
}: {
    reservation: ReservationDetail;
}) {
    const allocations = reservation.allocations ?? [];

    return (
        <div className="space-y-6">
            <Head title={`${reservation.booking_reference} · Admin`} />
            <PageHeader
                eyebrow="Read-only reservation oversight"
                title={reservation.booking_reference}
                description="Inspect the submitted booking snapshot, owner, customer, status, and operational room allocation."
                badges={
                    <>
                        <StatusBadge
                            status={reservation.status_semantic}
                            label={reservation.status_label}
                        />
                        {reservation.is_relocated_replacement && (
                            <Badge variant="peach">Relocated Replacement</Badge>
                        )}
                    </>
                }
                actions={
                    <Button asChild variant="outline">
                        <Link href={index().url}>
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            <span>Reservations</span>
                        </Link>
                    </Button>
                }
            />

            <div className="grid gap-5 sm:grid-cols-2">
                <OversightCard
                    icon={UserRound}
                    title="Customer"
                    lines={[
                        reservation.customer_name ?? reservation.contact_name,
                        reservation.customer_email ?? reservation.contact_email,
                        reservation.customer_phone ?? reservation.contact_phone,
                    ]}
                />
                <OversightCard
                    icon={Building2}
                    title="Property owner"
                    lines={[reservation.owner_name ?? 'Owner unavailable']}
                    action={
                        reservation.property_id ? (
                            <Button asChild size="sm" variant="outline">
                                <Link
                                    href={propertyShow.url(
                                        reservation.property_id,
                                    )}
                                >
                                    <span>Inspect Property Details</span>
                                    <ArrowRight
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />
            </div>

            {reservation.cases && reservation.cases.length > 0 && (
                <Card className="border-l-4 border-l-destructive">
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-status-error-border bg-status-error-bg text-status-error-fg">
                                <ShieldAlert
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-0.5">
                                <CardTitle className="text-base sm:text-lg">
                                    Stay Grievances &amp; Protection Claims
                                </CardTitle>
                                <CardDescription>
                                    Customer protection cases linked to this
                                    reservation.
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant="destructive" className="tabular-nums">
                            {reservation.cases.length}{' '}
                            {reservation.cases.length === 1 ? 'case' : 'cases'}
                        </Badge>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                        {reservation.cases.map((c) => (
                            <div
                                key={c.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-error-border bg-status-error-bg/50 p-4"
                            >
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert
                                            className="size-4 shrink-0 text-status-error-fg"
                                            aria-hidden="true"
                                        />
                                        <span className="font-mono text-xs font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                            {c.case_reference}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-status-error-fg">
                                        {c.category_label} · {c.status_label}
                                    </p>
                                </div>
                                <Button asChild size="sm" variant="outline">
                                    <Link href={caseShow.url(c.case_reference)}>
                                        <span>Inspect Case</span>
                                        <ArrowRight
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {reservation.active_relocation && (
                <Card className="border-l-4 border-l-amber-500 py-5">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-status-warning-border bg-status-warning-bg text-status-warning-fg">
                                <Layers className="size-5" aria-hidden="true" />
                            </span>
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                        Active Alternative Accommodation
                                        Dispatch
                                    </p>
                                    <StatusBadge
                                        status="warning"
                                        label={
                                            reservation.active_relocation.status
                                        }
                                    />
                                </div>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Replacement:{' '}
                                    <span className="font-medium text-tijum-plum dark:text-foreground">
                                        {
                                            reservation.active_relocation
                                                .destination_property_name
                                        }
                                    </span>{' '}
                                    (
                                    {
                                        reservation.active_relocation
                                            .destination_room_type_name
                                    }
                                    )
                                </p>
                            </div>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href={relocationsIndex().url}>
                                <span>View Relocations Desk</span>
                                <ArrowRight
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {reservation.payment_summary && (
                <Card className="border-l-4 border-l-tijum-coral py-5">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                <CreditCard
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="space-y-1">
                                <p className="font-heading text-sm font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                    Payment:{' '}
                                    {reservation.payment_summary.status_label} (
                                    {formatReservationMoney(
                                        reservation.payment_summary
                                            .amount_minor,
                                        reservation.payment_summary
                                            .currency_code ??
                                            reservation.currency_code,
                                    )}
                                    )
                                </p>
                                <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    Gateway:{' '}
                                    {reservation.payment_summary.gateway} · Ref:{' '}
                                    <span className="font-mono">
                                        {reservation.payment_summary
                                            .gateway_payment_id ||
                                            reservation.payment_summary
                                                .gateway_order_id}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link
                                href={paymentShow.url(
                                    reservation.payment_summary.id,
                                )}
                            >
                                <span>View Payment Details</span>
                                <ArrowRight
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <ReservationDetailGrid reservation={reservation} />

            <Card>
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                            <DoorOpen className="size-4" aria-hidden="true" />
                        </span>
                        <CardTitle className="text-base sm:text-lg">
                            Owner room allocation
                        </CardTitle>
                    </div>
                    <Badge variant="outline" className="tabular-nums">
                        {allocations.length}{' '}
                        {allocations.length === 1 ? 'room' : 'rooms'}
                    </Badge>
                </CardHeader>
                <CardContent>
                    {allocations.length === 0 ? (
                        <EmptyState
                            icon={DoorOpen}
                            title="No physical room allocation recorded"
                            description="No physical room allocation has been recorded for this reservation yet."
                            className="border-0 bg-tijum-cream/35 py-8 shadow-none dark:bg-muted/35"
                        />
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {allocations.map((allocation) => (
                                <div
                                    key={allocation.property_room_id}
                                    className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45"
                                >
                                    <p className="font-heading font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                        Room {allocation.room_number}
                                    </p>
                                    <p className="mt-1 text-sm text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                        {allocation.allocated_quantity}{' '}
                                        allocated unit
                                        {allocation.allocated_quantity === 1
                                            ? ''
                                            : 's'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function OversightCard({
    icon: Icon,
    title,
    lines,
    action,
}: {
    icon: typeof UserRound;
    title: string;
    lines: Array<string | undefined>;
    action?: ReactNode;
}) {
    const filteredLines = lines.filter(Boolean) as string[];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base sm:text-lg">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                        <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span>{title}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
                {filteredLines.map((line, idx) => (
                    <p
                        key={`${idx}-${line}`}
                        className={
                            idx === 0
                                ? 'font-semibold text-tijum-plum dark:text-foreground'
                                : 'text-tijum-plum-muted dark:text-muted-foreground'
                        }
                    >
                        {line}
                    </p>
                ))}
                {action && <div className="pt-2">{action}</div>}
            </CardContent>
        </Card>
    );
}
