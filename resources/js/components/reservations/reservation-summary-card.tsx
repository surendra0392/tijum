import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRightLeft,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock,
    DoorClosed,
    DoorOpen,
    FileText,
    KeyRound,
    Mail,
    Phone,
    User,
    Users,
    XCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    formatReservationDate,
    formatReservationDateTimeShort,
    formatReservationMoney,
    getRoomTrailSummary,
    getUnifiedStayLifecycle,
} from '@/lib/reservation-format';
import { cn } from '@/lib/utils';
import type { ReservationSummary } from '@/types';

type ReservationSummaryCardProps = {
    reservation: ReservationSummary;
    href: string;
    context?: 'customer' | 'owner' | 'admin';
    onInspectCustomer?: (reservation: ReservationSummary) => void;
};

export function ReservationSummaryCard({
    reservation,
    href,
    context = 'customer',
    onInspectCustomer,
}: ReservationSummaryCardProps) {
    const showGuestCustomerData = context === 'owner' || context === 'admin';
    const checkedInLabel = formatReservationDateTimeShort(
        reservation.checked_in_at,
    );
    const checkedOutLabel = formatReservationDateTimeShort(
        reservation.checked_out_at,
    );
    const lifecycle = getUnifiedStayLifecycle(reservation);
    const roomInfo = getRoomTrailSummary(reservation);

    const LifecycleIcon =
        lifecycle.key === 'checked_out'
            ? DoorClosed
            : lifecycle.key === 'in_house'
              ? DoorOpen
              : lifecycle.key === 'awaiting_check_in'
                ? CalendarCheck
                : lifecycle.key === 'awaiting_payment'
                  ? Clock
                  : XCircle;

    return (
        <Card className="gap-3.5 py-4 transition-all hover:border-tijum-coral/40 hover:shadow-md dark:hover:border-tijum-coral/40">
            <CardHeader className="gap-3 px-5 pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={href}
                            className="font-mono text-xs font-bold tracking-wide text-tijum-plum transition-colors hover:text-tijum-coral dark:text-foreground"
                        >
                            #{reservation.booking_reference}
                        </Link>

                        {showGuestCustomerData && roomInfo.fullTrailLabel && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    'gap-1 text-[11px] font-semibold',
                                    reservation.is_checked_out
                                        ? 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/35 dark:bg-indigo-950/50 dark:text-indigo-200'
                                        : roomInfo.hadRoomChange
                                          ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-200'
                                          : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/35 dark:bg-sky-950/50 dark:text-sky-200',
                                )}
                            >
                                {roomInfo.hadRoomChange ? (
                                    <ArrowRightLeft className="size-3" />
                                ) : (
                                    <KeyRound className="size-3" />
                                )}
                                <span>
                                    {reservation.is_checked_out
                                        ? `Stayed: ${roomInfo.fullTrailLabel}`
                                        : roomInfo.fullTrailLabel}
                                </span>
                            </Badge>
                        )}

                        {showGuestCustomerData && roomInfo.needsRoom && (
                            <Link
                                href={`${href}#room-allocation-card`}
                                className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-900 transition-colors hover:bg-orange-200 dark:border-orange-400/40 dark:bg-orange-950/70 dark:text-orange-200"
                            >
                                <AlertTriangle className="size-3" />
                                <span>
                                    Assign Room ({roomInfo.allocatedQuantity}/
                                    {reservation.quantity})
                                </span>
                            </Link>
                        )}
                    </div>
                    <CardTitle className="truncate text-base">
                        {reservation.property_name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        {reservation.room_type_name}
                    </p>
                </div>

                {/* Single unambiguous status badge — no conflicting double badges */}
                {showGuestCustomerData ? (
                    <Badge
                        variant="outline"
                        className={cn(
                            'shrink-0 gap-1.5 px-2.5 py-1 text-xs font-semibold',
                            lifecycle.badgeClass,
                        )}
                    >
                        <LifecycleIcon className="size-3.5" aria-hidden="true" />
                        <span>{lifecycle.label}</span>
                    </Badge>
                ) : (
                    <StatusBadge
                        status={reservation.status_semantic}
                        label={reservation.status_label}
                    />
                )}
            </CardHeader>

            {showGuestCustomerData &&
                (reservation.contact_name ||
                    reservation.contact_phone ||
                    reservation.contact_email) && (
                    <div className="mx-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/45 px-3.5 py-2.5 text-xs dark:border-border dark:bg-muted/40">
                        {reservation.contact_name && (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-tijum-plum dark:text-foreground">
                                <User
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>{reservation.contact_name}</span>
                            </span>
                        )}
                        {reservation.contact_phone && (
                            <a
                                href={`tel:${reservation.contact_phone}`}
                                className="inline-flex items-center gap-1.5 font-medium text-tijum-plum-muted transition-colors hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                            >
                                <Phone
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>{reservation.contact_phone}</span>
                            </a>
                        )}
                        {reservation.contact_email && (
                            <a
                                href={`mailto:${reservation.contact_email}`}
                                className="inline-flex items-center gap-1.5 text-tijum-plum-muted transition-colors hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                            >
                                <Mail
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>{reservation.contact_email}</span>
                            </a>
                        )}
                        {(checkedInLabel || checkedOutLabel) && (
                            <span
                                className={cn(
                                    'ml-auto inline-flex items-center gap-1 text-[11px] font-medium tabular-nums',
                                    reservation.is_checked_out
                                        ? 'text-indigo-800 dark:text-indigo-300'
                                        : 'text-emerald-800 dark:text-emerald-300',
                                )}
                            >
                                <CheckCircle2
                                    className="size-3"
                                    aria-hidden="true"
                                />
                                <span>
                                    {checkedInLabel
                                        ? `In: ${checkedInLabel}`
                                        : ''}
                                    {checkedOutLabel
                                        ? ` → Out: ${checkedOutLabel}`
                                        : ''}
                                </span>
                            </span>
                        )}
                    </div>
                )}

            <CardContent className="grid gap-3 px-5 pt-0 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-start gap-2 text-xs">
                    <CalendarDays
                        className="mt-0.5 size-3.5 shrink-0 text-tijum-coral"
                        aria-hidden="true"
                    />
                    <span className="font-medium text-tijum-plum dark:text-foreground">
                        {formatReservationDate(reservation.check_in_date)} →{' '}
                        {formatReservationDate(reservation.checkout_date)}
                    </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Users
                        className="mt-0.5 size-3.5 shrink-0 text-tijum-coral"
                        aria-hidden="true"
                    />
                    <span>
                        {reservation.quantity}{' '}
                        {reservation.quantity_basis_label}
                        {' · '}
                        {reservation.guest_count} guest
                        {reservation.guest_count === 1 ? '' : 's'}
                    </span>
                </div>
                <div className="text-xs">
                    <span className="text-muted-foreground">Duration: </span>
                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                        {reservation.duration_label}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="font-heading text-sm font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {formatReservationMoney(
                                reservation.total_amount_minor,
                                reservation.currency_code,
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {onInspectCustomer && (
                            <button
                                type="button"
                                onClick={() => onInspectCustomer(reservation)}
                                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-tijum-surface bg-background px-2.5 text-xs font-semibold text-tijum-plum transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream/50 dark:border-border dark:text-foreground dark:hover:bg-accent"
                            >
                                <User className="size-3.5" aria-hidden="true" />
                                <span>Record</span>
                            </button>
                        )}
                        {context === 'customer' &&
                            reservation.status === 'confirmed' && (
                                <a
                                    href={`/reservations/${reservation.booking_reference}/receipt`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Print Receipt"
                                    aria-label={`Print Receipt for ${reservation.booking_reference}`}
                                    className="inline-flex size-8 items-center justify-center rounded-full border border-tijum-surface/80 bg-tijum-cream/50 text-tijum-plum-muted transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:text-foreground"
                                >
                                    <FileText
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </a>
                            )}
                        <Link
                            href={href}
                            aria-label={`View reservation ${reservation.booking_reference}`}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-tijum-cream px-2.5 text-xs font-semibold text-tijum-plum transition-colors hover:bg-tijum-coral hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-tijum-coral/15 dark:text-tijum-peach dark:hover:bg-tijum-coral dark:hover:text-white"
                        >
                            <span>Manage</span>
                            <ChevronRight
                                className="size-3.5"
                                aria-hidden="true"
                            />
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
