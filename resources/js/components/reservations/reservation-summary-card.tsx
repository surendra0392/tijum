import { Link } from '@inertiajs/react';
import { CalendarDays, ChevronRight, FileText, Users } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
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

export function ReservationSummaryCard({
    reservation,
    href,
    context = 'customer',
}: ReservationSummaryCardProps) {
    return (
        <Card className="gap-4 py-5 transition-all hover:border-tijum-coral/40 hover:shadow-md dark:hover:border-tijum-coral/40">
            <CardHeader className="gap-3 px-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                    <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase dark:text-muted-foreground">
                        {reservation.booking_reference}
                    </p>
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
                                    <FileText className="size-4" aria-hidden="true" />
                                </a>
                            )}
                        <Link
                            href={href}
                            aria-label={`View reservation ${reservation.booking_reference}`}
                            className="inline-flex size-9 items-center justify-center rounded-full bg-tijum-cream text-tijum-plum transition-colors hover:bg-tijum-coral hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-tijum-coral/15 dark:text-tijum-peach dark:hover:bg-tijum-coral dark:hover:text-white"
                        >
                            <ChevronRight className="size-4" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
