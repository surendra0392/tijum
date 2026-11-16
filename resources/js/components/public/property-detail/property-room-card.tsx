import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { AmenityList } from '@/components/public/amenity-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatStayTime } from '@/lib/stay-timing';
import { create as reservationCreate } from '@/routes/reservations';
import type { PropertyDetailRoomType } from '@/types/public-search';
import { durationUnitLabel, formatMoney, rateFor } from './utils';

type PropertyRoomCardProps = {
    propertySlug: string;
    roomType: PropertyDetailRoomType;
    checkIn: string;
    durationType: string;
    durationCount: number;
    guests: number;
    earliestEarlyCheckInTime: string;
};

export function PropertyRoomCard({
    propertySlug,
    roomType,
    checkIn,
    durationType,
    durationCount,
    guests,
    earliestEarlyCheckInTime,
}: PropertyRoomCardProps) {
    const selectedRate = rateFor(roomType, durationType);
    const safeDurationCount = Math.max(1, durationCount);
    const safeGuests = Math.max(1, guests);
    const available =
        roomType.matches_search &&
        selectedRate != null &&
        roomType.available_quantity >= safeGuests;

    const capacityUnit =
        roomType.pricing_basis === 'per_guest'
            ? 'guest places'
            : 'private rooms';

    const rateTiers: Array<{
        key: 'daily' | 'weekly' | 'monthly';
        label: string;
        minor: number | null;
    }> = [
        { key: 'daily', label: 'Daily', minor: roomType.daily_rate_minor },
        { key: 'weekly', label: 'Weekly', minor: roomType.weekly_rate_minor },
        {
            key: 'monthly',
            label: 'Monthly',
            minor: roomType.monthly_rate_minor,
        },
    ];

    return (
        <article
            className={`rounded-[24px] border bg-white p-5 transition-all duration-300 sm:p-6 ${
                available
                    ? 'border-tijum-surface shadow-tijum-card hover:border-tijum-peach'
                    : 'border-tijum-surface/80 bg-tijum-cream/60 opacity-90'
            }`}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-lg font-bold tracking-tight text-tijum-plum sm:text-xl">
                            {roomType.name}
                        </h3>
                        {roomType.matches_search && available && (
                            <Badge variant="peach">Matches search</Badge>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-tijum-lavender sm:text-sm">
                        <span>{roomType.sharing_label}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                            {roomType.is_air_conditioned
                                ? 'Air conditioned'
                                : 'Non-AC'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{roomType.gender_policy_label}</span>
                        <span aria-hidden="true">·</span>
                        <span>{roomType.pricing_basis_label}</span>
                    </div>
                </div>

                <div className="shrink-0">
                    {available ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-tijum-emerald/35 bg-tijum-emerald/10 px-3 py-1 font-heading text-xs font-semibold tabular-nums text-tijum-emerald">
                            <CheckCircle2
                                className="size-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            {roomType.available_quantity} {capacityUnit} open
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full border border-tijum-surface bg-tijum-cream px-3 py-1 font-heading text-xs font-semibold text-tijum-lavender">
                            Unavailable for selection
                        </span>
                    )}
                </div>
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
                {rateTiers.map((tier) => {
                    const isSelected = durationType === tier.key;

                    return (
                        <div
                            key={tier.key}
                            className={`rounded-2xl border px-3 py-3 transition-colors ${
                                isSelected
                                    ? 'border-tijum-coral bg-tijum-peach/20'
                                    : 'border-tijum-surface bg-tijum-cream/65'
                            }`}
                        >
                            <dt className="flex items-center justify-between gap-1 font-heading text-[11px] font-semibold tracking-wide text-tijum-lavender uppercase">
                                <span>{tier.label}</span>
                                {isSelected && (
                                    <span className="rounded-full bg-tijum-coral px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-white normal-case">
                                        Active
                                    </span>
                                )}
                            </dt>
                            <dd className="mt-1.5 font-heading text-sm font-bold tabular-nums text-tijum-plum sm:text-base">
                                {formatMoney(tier.minor)}
                            </dd>
                        </div>
                    );
                })}
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-tijum-lavender sm:text-sm">
                <p className="flex items-center gap-1.5">
                    <Clock3
                        className="size-4 shrink-0 text-tijum-plum"
                        aria-hidden="true"
                    />
                    {roomType.early_check_in_enabled
                        ? `Early arrival may be requested from ${formatStayTime(earliestEarlyCheckInTime)} · No early-arrival fee.`
                        : 'Standard check-in window applies.'}
                </p>
                <p className="flex items-center gap-1.5">
                    <ShieldCheck
                        className="size-4 shrink-0 text-tijum-plum"
                        aria-hidden="true"
                    />
                    Physical room allotted by host after confirmation.
                </p>
            </div>

            {roomType.amenities.length > 0 && (
                <div className="mt-4 border-t border-tijum-surface/70 pt-4">
                    <p className="mb-2.5 flex items-center gap-1.5 font-heading text-xs font-semibold tracking-wide text-tijum-lavender uppercase">
                        <Sparkles className="size-3.5" aria-hidden="true" />
                        In-room inclusions
                    </p>
                    <AmenityList
                        amenities={roomType.amenities}
                        variant="compact"
                    />
                </div>
            )}

            <div className="mt-5 flex flex-col gap-4 border-t border-tijum-surface pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    {selectedRate != null ? (
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-heading text-xl font-bold tabular-nums text-tijum-plum sm:text-2xl">
                                {formatMoney(selectedRate)}
                            </span>
                            <span className="text-xs font-medium text-tijum-lavender sm:text-sm">
                                / {durationUnitLabel(durationType)} ·{' '}
                                {roomType.pricing_basis_label}
                            </span>
                        </div>
                    ) : (
                        <span className="font-heading text-sm font-semibold text-tijum-lavender">
                            Rate not offered for {durationType} stay
                        </span>
                    )}
                    <p className="text-xs text-tijum-lavender">
                        Final verified quote &amp; taxes shown on reservation
                        review step.
                    </p>
                </div>

                {available ? (
                    <Button size="lg" className="w-full sm:w-auto" asChild>
                        <Link
                            href={
                                reservationCreate(propertySlug, {
                                    query: {
                                        property_room_type_id: roomType.id,
                                        check_in_date: checkIn,
                                        duration_type: durationType,
                                        duration_quantity: safeDurationCount,
                                        quantity: safeGuests,
                                        guest_count: safeGuests,
                                    },
                                }).url
                            }
                        >
                            <span>Book now</span>
                            <ArrowRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Link>
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto"
                        disabled
                    >
                        Unavailable for selection
                    </Button>
                )}
            </div>
        </article>
    );
}
