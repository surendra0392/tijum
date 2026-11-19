import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRightLeft,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    DoorClosed,
    DoorOpen,
    FileText,
    KeyRound,
    Mail,
    Phone,
    User,
    Users,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    formatReservationDate,
    formatReservationMoney,
} from '@/lib/reservation-format';
import { cn } from '@/lib/utils';
import type { ReservationSummary } from '@/types';

type ReservationSummaryCardProps = {
    reservation: ReservationSummary;
    href: string;
    context?: 'customer' | 'owner' | 'admin';
};

function formatDateTimeShort(iso?: string | null): string | null {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return null;
    }
}

export function ReservationSummaryCard({
    reservation,
    href,
    context = 'customer',
}: ReservationSummaryCardProps) {
    const showGuestCustomerData = context === 'owner' || context === 'admin';
    const checkedInLabel = formatDateTimeShort(reservation.checked_in_at);
    const checkedOutLabel = formatDateTimeShort(reservation.checked_out_at);

    const historyEntries = reservation.room_history ?? [];
    const currentRooms = reservation.allocated_rooms ?? [];
    const isFullyAllocated =
        (reservation.allocated_quantity ?? 0) >= reservation.quantity &&
        currentRooms.length > 0;

    const historyRoomTrail: string[] = [];
    for (const entry of historyEntries) {
        if (
            entry.room_number &&
            historyRoomTrail[historyRoomTrail.length - 1] !== entry.room_number
        ) {
            historyRoomTrail.push(entry.room_number);
        }
    }
    const hadRoomChange = historyEntries.some(
        (e) => e.status === 'changed' || e.action === 'room_changed',
    );

    const roomSequenceLabel =
        hadRoomChange && historyRoomTrail.length > 1
            ? `Room ${historyRoomTrail.join(' → ')}`
            : currentRooms.length > 0
              ? `Room ${currentRooms.join(', ')}`
              : historyRoomTrail.length > 0
                ? `Room ${historyRoomTrail.join(', ')}`
                : null;

    return (
        <Card className="gap-4 py-5 transition-all hover:border-tijum-coral/40 hover:shadow-md dark:hover:border-tijum-coral/40">
            <CardHeader className="gap-3 px-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            {reservation.booking_reference}
                        </p>

                        {/* Distinct Guest Stay Lifecycle Badges */}
                        {showGuestCustomerData && reservation.is_checked_out && (
                            <Badge className="gap-1 border-indigo-300 bg-indigo-100 text-[11px] text-indigo-900 dark:border-indigo-400/40 dark:bg-indigo-950/70 dark:text-indigo-200">
                                <DoorClosed className="size-3" />
                                <span>
                                    Checked Out
                                    {checkedOutLabel
                                        ? ` · ${checkedOutLabel}`
                                        : ''}
                                </span>
                            </Badge>
                        )}

                        {showGuestCustomerData &&
                            reservation.is_checked_in &&
                            !reservation.is_checked_out && (
                                <Badge className="gap-1 border-emerald-300 bg-emerald-100 text-[11px] text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-200">
                                    <DoorOpen className="size-3" />
                                    <span>
                                        Checked In · In-House
                                        {checkedInLabel
                                            ? ` (${checkedInLabel})`
                                            : ''}
                                    </span>
                                </Badge>
                            )}

                        {showGuestCustomerData &&
                            reservation.status === 'confirmed' &&
                            !reservation.is_checked_in &&
                            !reservation.is_checked_out && (
                                <Badge
                                    variant="outline"
                                    className="gap-1 border-sky-300 bg-sky-100 text-[11px] text-sky-900 dark:border-sky-400/40 dark:bg-sky-950/70 dark:text-sky-200"
                                >
                                    <CalendarCheck className="size-3" />
                                    <span>Awaiting Check-In</span>
                                </Badge>
                            )}

                        {/* Physical Room Allocation / Stayed Room Badge */}
                        {showGuestCustomerData && roomSequenceLabel && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    'gap-1 text-[11px] font-semibold',
                                    reservation.is_checked_out
                                        ? 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/35 dark:bg-indigo-950/50 dark:text-indigo-200'
                                        : hadRoomChange
                                          ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-200'
                                          : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/35 dark:bg-sky-950/50 dark:text-sky-200',
                                )}
                            >
                                {hadRoomChange ? (
                                    <ArrowRightLeft className="size-3" />
                                ) : (
                                    <KeyRound className="size-3" />
                                )}
                                <span>
                                    {reservation.is_checked_out
                                        ? `Stayed: ${roomSequenceLabel}`
                                        : roomSequenceLabel}
                                </span>
                            </Badge>
                        )}

                        {showGuestCustomerData &&
                            reservation.status === 'confirmed' &&
                            !reservation.is_checked_out &&
                            !isFullyAllocated && (
                                <Badge
                                    variant="outline"
                                    className="gap-1 border-orange-300 bg-orange-100 text-[11px] text-orange-900 dark:border-orange-400/40 dark:bg-orange-950/70 dark:text-orange-200"
                                >
                                    <AlertTriangle className="size-3" />
                                    <span>
                                        Needs Room Allocation (
                                        {reservation.allocated_quantity ?? 0}/
                                        {reservation.quantity})
                                    </span>
                                </Badge>
                            )}
                    </div>
                    <CardTitle className="truncate text-lg">
                        {reservation.property_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {reservation.room_type_name}
                    </p>
                </div>
                <StatusBadge
                    status={reservation.status_semantic}
                    label={reservation.status_label}
                />
            </CardHeader>

            {showGuestCustomerData &&
                (reservation.contact_name ||
                    reservation.contact_phone ||
                    reservation.contact_email) && (
                    <div className="mx-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/50 px-3.5 py-2.5 text-xs dark:border-border dark:bg-muted/45">
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
                        {reservation.is_checked_out && checkedInLabel && (
                            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-indigo-800 dark:text-indigo-300">
                                <CheckCircle2
                                    className="size-3 text-indigo-600 dark:text-indigo-400"
                                    aria-hidden="true"
                                />
                                <span>
                                    In: {checkedInLabel}
                                    {checkedOutLabel
                                        ? ` → Out: ${checkedOutLabel}`
                                        : ''}
                                </span>
                            </span>
                        )}
                    </div>
                )}

            <CardContent className="grid gap-4 px-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-start gap-2 text-sm">
                    <CalendarDays
                        className="mt-0.5 size-4 shrink-0 text-tijum-coral"
                        aria-hidden="true"
                    />
                    <span>
                        {formatReservationDate(reservation.check_in_date)} to{' '}
                        {formatReservationDate(reservation.checkout_date)}
                    </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                    <Users
                        className="mt-0.5 size-4 shrink-0 text-tijum-coral"
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
                <div className="text-sm">
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-semibold text-tijum-plum dark:text-foreground">
                        {reservation.duration_label}
                    </p>
                </div>
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <p className="text-xs text-muted-foreground">
                            {context === 'customer' ? 'Booked total' : 'Amount'}
                        </p>
                        <p className="font-heading font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {formatReservationMoney(
                                reservation.total_amount_minor,
                                reservation.currency_code,
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {context === 'customer' &&
                            reservation.status === 'confirmed' && (
                                <a
                                    href={`/reservations/${reservation.booking_reference}/receipt`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Print Receipt"
                                    aria-label={`Print Receipt for ${reservation.booking_reference}`}
                                    className="inline-flex size-9 items-center justify-center rounded-full border border-tijum-surface/80 bg-tijum-cream/50 text-tijum-plum-muted transition-colors hover:border-tijum-coral/40 hover:bg-tijum-cream hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:text-foreground"
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
                            className="inline-flex size-9 items-center justify-center rounded-full bg-tijum-cream text-tijum-plum transition-colors hover:bg-tijum-coral hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-tijum-coral/15 dark:text-tijum-peach dark:hover:bg-tijum-coral dark:hover:text-white"
                        >
                            <ChevronRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
