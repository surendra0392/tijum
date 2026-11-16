import { CalendarDays, Clock3, MapPin, Utensils, Users } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    formatReservationDate,
    formatReservationMoney,
} from '@/lib/reservation-format';
import { formatStayTime } from '@/lib/stay-timing';
import type { ReservationDetail } from '@/types';

export function ReservationDetailGrid({
    reservation,
    showContact = true,
}: {
    reservation: ReservationDetail;
    showContact?: boolean;
}) {
    const meals = [
        reservation.breakfast_included && 'Breakfast',
        reservation.lunch_included && 'Lunch',
        reservation.dinner_included && 'Dinner',
    ].filter(Boolean);

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
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
                            <MapPin className="size-4" aria-hidden="true" />
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

            <div className="grid gap-5">
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
                            value={String(reservation.duration_quantity)}
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
                            This amount is the immutable rate snapshot from
                            submission. The 15-minute inventory hold confirms
                            automatically after backend-verified payment.
                        </p>
                    </CardContent>
                </Card>

                {showContact && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Primary guest contact</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <p className="font-semibold text-tijum-plum dark:text-foreground">
                                {reservation.contact_name}
                            </p>
                            <p>{reservation.contact_email}</p>
                            <p>{reservation.contact_phone}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
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
