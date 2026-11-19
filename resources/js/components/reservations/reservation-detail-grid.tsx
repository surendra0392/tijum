import {
    CalendarDays,
    Clock3,
    DoorClosed,
    DoorOpen,
    KeyRound,
    Mail,
    MapPin,
    Phone,
    User,
    Users,
    Utensils,
} from 'lucide-react';
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
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <User
                                    className="size-4 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Customer &amp; Guest Details</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/45 p-3.5 dark:border-border dark:bg-muted/40">
                                <div className="flex items-center gap-2 font-semibold text-tijum-plum dark:text-foreground">
                                    <User
                                        className="size-4 shrink-0 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>{reservation.contact_name}</span>
                                </div>
                                {reservation.contact_phone && (
                                    <div className="flex items-center gap-2 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        <Phone
                                            className="size-3.5 shrink-0 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <a
                                            href={`tel:${reservation.contact_phone}`}
                                            className="font-medium text-tijum-plum hover:text-tijum-coral dark:text-foreground"
                                        >
                                            {reservation.contact_phone}
                                        </a>
                                    </div>
                                )}
                                {reservation.contact_email && (
                                    <div className="flex items-center gap-2 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                        <Mail
                                            className="size-3.5 shrink-0 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <a
                                            href={`mailto:${reservation.contact_email}`}
                                            className="truncate hover:text-tijum-plum dark:hover:text-foreground"
                                        >
                                            {reservation.contact_email}
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 text-xs">
                                <div className="rounded-lg border border-tijum-surface/70 px-3 py-2 dark:border-border">
                                    <span className="block text-[11px] text-muted-foreground">
                                        Guests &amp; Gender
                                    </span>
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {reservation.guest_count} guest
                                        {reservation.guest_count === 1
                                            ? ''
                                            : 's'}{' '}
                                        ·{' '}
                                        {formatPolicyValue(
                                            reservation.guest_gender,
                                        )}
                                    </span>
                                </div>
                                <div className="rounded-lg border border-tijum-surface/70 px-3 py-2 dark:border-border">
                                    <span className="block text-[11px] text-muted-foreground">
                                        Group Type
                                    </span>
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {formatPolicyValue(
                                            reservation.guest_composition,
                                        )}
                                    </span>
                                </div>
                            </div>

                            {reservation.allocations &&
                                reservation.allocations.length > 0 && (
                                    <div className="space-y-1 rounded-lg border border-tijum-surface/70 bg-tijum-cream/30 px-3 py-2 text-xs dark:border-border dark:bg-muted/30">
                                        <div className="flex items-center gap-2">
                                            <KeyRound
                                                className="size-3.5 shrink-0 text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            <span className="text-muted-foreground">
                                                {reservation.is_checked_out
                                                    ? 'Room Stayed:'
                                                    : 'Assigned Room:'}
                                            </span>
                                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                                Room{' '}
                                                {reservation.allocations
                                                    .map((a) => a.room_number)
                                                    .join(', ')}
                                            </span>
                                        </div>
                                        {reservation.room_history &&
                                            reservation.room_history.length >
                                                reservation.allocations
                                                    .length && (
                                                <p className="pl-5 text-[11px] text-amber-800 dark:text-amber-300">
                                                    Stay trail: Room{' '}
                                                    {reservation.room_history
                                                        .map(
                                                            (h) =>
                                                                h.room_number,
                                                        )
                                                        .join(' → Room ')}
                                                </p>
                                            )}
                                    </div>
                                )}

                            {(reservation.checked_in_at ||
                                reservation.checked_out_at) && (
                                <div className="space-y-1.5 border-t border-tijum-surface/75 pt-2.5 text-xs dark:border-border">
                                    {reservation.checked_in_at && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                                                <DoorOpen className="size-3.5 text-emerald-600" />
                                                <span>Checked in</span>
                                            </span>
                                            <span className="font-medium tabular-nums text-tijum-plum dark:text-foreground">
                                                {new Date(
                                                    reservation.checked_in_at,
                                                ).toLocaleString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    {reservation.checked_out_at && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700 dark:text-indigo-300">
                                                <DoorClosed className="size-3.5 text-indigo-600" />
                                                <span>Checked out</span>
                                            </span>
                                            <span className="font-medium tabular-nums text-tijum-plum dark:text-foreground">
                                                {new Date(
                                                    reservation.checked_out_at,
                                                ).toLocaleString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
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
