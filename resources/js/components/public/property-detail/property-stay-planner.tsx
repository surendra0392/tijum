import { Link } from '@inertiajs/react';
import {
    ArrowDown,
    CalendarClock,
    CheckCircle2,
    Gift,
    Share2,
    ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    durationPluralLabel,
    durationUnitLabel,
    formatDisplayDate,
    formatMoney,
} from './utils';

type PropertyStayPlannerProps = {
    todayIso: string;
    checkIn: string;
    effectiveCheckIn: string;
    checkout: string;
    durationType: string;
    durationCount: string;
    guests: string;
    startingRateMinor: number | null;
    availableRoomCount: number;
    totalRoomCount: number;
    isContextDirty: boolean;
    copied: boolean;
    onCheckInChange: (value: string) => void;
    onDurationTypeChange: (value: string) => void;
    onDurationCountChange: (value: string) => void;
    onGuestsChange: (value: string) => void;
    onUpdateRoomOptions: () => void;
    onCopyStayLink: () => void;
};

export function PropertyStayPlanner({
    todayIso,
    checkIn,
    effectiveCheckIn,
    checkout,
    durationType,
    durationCount,
    guests,
    startingRateMinor,
    availableRoomCount,
    totalRoomCount,
    isContextDirty,
    copied,
    onCheckInChange,
    onDurationTypeChange,
    onDurationCountChange,
    onGuestsChange,
    onUpdateRoomOptions,
    onCopyStayLink,
}: PropertyStayPlannerProps) {
    const safeCount = Math.max(1, Number(durationCount || 1));

    return (
        <div className="space-y-5 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[24px] border border-tijum-surface bg-white shadow-tijum-soft">
                <div className="bg-tijum-plum px-5 py-5 text-tijum-cream sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p className="font-heading text-[11px] font-semibold tracking-wider text-tijum-peach uppercase">
                                Stay planner
                            </p>
                            {startingRateMinor != null ? (
                                <p className="mt-1 flex items-baseline gap-1.5">
                                    <span className="font-heading text-2xl font-bold tabular-nums text-white sm:text-[26px]">
                                        {formatMoney(startingRateMinor)}
                                    </span>
                                    <span className="text-xs text-tijum-cream/80 sm:text-sm">
                                        / {durationUnitLabel(durationType)}{' '}
                                        starting
                                    </span>
                                </p>
                            ) : (
                                <p className="mt-1 font-heading text-lg font-bold text-white">
                                    Compare rates below
                                </p>
                            )}
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-full bg-tijum-cream/12 px-2.5 py-1 font-heading text-xs font-semibold tabular-nums text-tijum-cream">
                            <span
                                className={`size-2 rounded-full ${
                                    availableRoomCount > 0
                                        ? 'bg-tijum-emerald'
                                        : 'bg-tijum-peach'
                                }`}
                                aria-hidden="true"
                            />
                            {availableRoomCount}/{totalRoomCount} open
                        </span>
                    </div>

                    <p className="mt-2.5 flex items-center gap-1.5 text-xs text-tijum-cream/85">
                        <CalendarClock
                            className="size-3.5 shrink-0 text-tijum-peach"
                            aria-hidden="true"
                        />
                        <span>
                            {formatDisplayDate(effectiveCheckIn)} →{' '}
                            {checkout
                                ? formatDisplayDate(checkout)
                                : 'Select duration'}{' '}
                            ({durationPluralLabel(durationType, safeCount)})
                        </span>
                    </p>
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                    <div className="grid gap-3.5 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="detail-check-in">
                                Check-in date
                            </Label>
                            <Input
                                id="detail-check-in"
                                name="check_in"
                                type="date"
                                min={todayIso}
                                value={checkIn}
                                onChange={(event) =>
                                    onCheckInChange(event.target.value)
                                }
                                className="h-12 rounded-xl border-tijum-surface bg-tijum-cream/55 px-3.5 text-tijum-plum"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="detail-duration-type">
                                Stay basis
                            </Label>
                            <Select
                                name="duration_type"
                                value={durationType}
                                onValueChange={onDurationTypeChange}
                            >
                                <SelectTrigger
                                    id="detail-duration-type"
                                    className="h-12 w-full rounded-xl border-tijum-surface bg-tijum-cream/55 text-tijum-plum"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">
                                        Weekly
                                    </SelectItem>
                                    <SelectItem value="monthly">
                                        Monthly
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="detail-duration-count">
                                {durationType === 'weekly'
                                    ? 'Weeks'
                                    : durationType === 'monthly'
                                      ? 'Months'
                                      : 'Days'}
                            </Label>
                            <Input
                                id="detail-duration-count"
                                name="duration_count"
                                type="number"
                                min={1}
                                max={30}
                                value={durationCount}
                                autoComplete="off"
                                onChange={(event) =>
                                    onDurationCountChange(event.target.value)
                                }
                                className="h-12 rounded-xl border-tijum-surface bg-tijum-cream/55 px-3.5 text-tijum-plum tabular-nums"
                            />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="detail-guests">
                                Guests / room quantity
                            </Label>
                            <Input
                                id="detail-guests"
                                name="guests"
                                type="number"
                                min={1}
                                max={20}
                                value={guests}
                                autoComplete="off"
                                onChange={(event) =>
                                    onGuestsChange(event.target.value)
                                }
                                className="h-12 rounded-xl border-tijum-surface bg-tijum-cream/55 px-3.5 text-tijum-plum tabular-nums"
                            />
                        </div>
                    </div>

                    {isContextDirty && (
                        <p className="rounded-xl border border-tijum-coral/40 bg-tijum-peach/20 px-3.5 py-2.5 text-xs leading-relaxed font-medium text-tijum-plum">
                            Stay details changed — refresh availability before
                            picking your room.
                        </p>
                    )}

                    <div className="space-y-2.5">
                        <Button
                            type="button"
                            size="lg"
                            variant={isContextDirty ? 'default' : 'outline'}
                            className="w-full"
                            onClick={onUpdateRoomOptions}
                        >
                            {isContextDirty
                                ? 'Refresh availability'
                                : 'Update room options'}
                        </Button>

                        <Button
                            type="button"
                            size="lg"
                            variant={isContextDirty ? 'outline' : 'default'}
                            className="w-full"
                            asChild
                        >
                            <a href="#rooms">
                                <span>
                                    {totalRoomCount > 0
                                        ? `Choose from ${totalRoomCount} ${totalRoomCount === 1 ? 'room option' : 'room options'}`
                                        : 'View room availability'}
                                </span>
                                <ArrowDown
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </a>
                        </Button>
                    </div>

                    <ul className="space-y-2 border-t border-tijum-surface pt-4 text-xs text-tijum-lavender">
                        <li className="flex items-start gap-2">
                            <ShieldCheck
                                className="mt-0.5 size-3.5 shrink-0 text-tijum-plum"
                                aria-hidden="true"
                            />
                            <span>
                                15-minute inventory hold created when you review
                                booking.
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2
                                className="mt-0.5 size-3.5 shrink-0 text-tijum-emerald"
                                aria-hidden="true"
                            />
                            <span>
                                Physical room is allotted by the host right
                                after confirmation.
                            </span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="rounded-[20px] border border-tijum-coral/35 bg-white p-5 shadow-tijum-card">
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/35 text-tijum-plum">
                        <Gift className="size-4.5" aria-hidden="true" />
                    </span>
                    <div className="space-y-1">
                        <h3 className="font-heading text-sm font-bold text-tijum-plum">
                            Know someone moving? Refer &amp; earn ₹500
                        </h3>
                        <p className="text-xs leading-relaxed text-tijum-lavender">
                            Share this stay link. Earn 500 points (₹500 value)
                            on their stay, and they get 250 welcome points.
                        </p>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                        onClick={onCopyStayLink}
                    >
                        {copied ? (
                            <>
                                <CheckCircle2
                                    className="size-3.5 text-tijum-emerald"
                                    aria-hidden="true"
                                />
                                <span>Link copied</span>
                            </>
                        ) : (
                            <>
                                <Share2
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Copy stay link</span>
                            </>
                        )}
                    </Button>
                    <Button size="sm" variant="plum" className="w-full" asChild>
                        <Link href="/rewards/referrals">
                            <span>Referrals hub</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
