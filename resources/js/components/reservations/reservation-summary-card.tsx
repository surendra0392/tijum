import { Link } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock,
    DoorClosed,
    DoorOpen,
    FileText,
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

    return (
        <Card className="gap-4 py-5 transition-all hover:border-tijum-coral/40 hover:shadow-md dark:hover:border-tijum-coral/40">
            <CardHeader className="gap-3 px-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            {reservation.booking_reference}
                        </p>
                        {showGuestCustomerData && reservation.is_checked_out && (
                            <Badge className="gap-1 border-emerald-200 bg-emerald-100 text-[11px] text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/60 dark:text-emerald-200">
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
                                <Badge className="gap-1 border-emerald-200 bg-emerald-100 text-[11px] text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-950/60 dark:text-emerald-200">
                                    <DoorOpen className="size-3" />
                                    <span>
                                        In-House
                                        {checkedInLabel
                                            ? ` · Checked in ${checkedInLabel}`
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
                                    className="gap-1 border-amber-300 bg-amber-50 text-[11px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200"
                                >
                                    <Clock className="size-3" />
                                    <span>Awaiting Check-In</span>
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
                            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                <CheckCircle2
                                    className="size-3 text-status-success-fg"
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
