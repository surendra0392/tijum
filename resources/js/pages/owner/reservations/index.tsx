import { Head, router } from '@inertiajs/react';
import {
    CalendarClock,
    Clock,
    DoorClosed,
    DoorOpen,
    Layers,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import {
    OWNER_BOOKINGS_TABS,
    OwnerSectionTabs,
} from '@/components/owner/owner-section-tabs';
import { ReservationSummaryCard } from '@/components/reservations/reservation-summary-card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
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
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/owner/reservations';
import type {
    ReservationListPayload,
    ReservationPropertyOption,
    ReservationStatusOption,
} from '@/types';

type StayStage = 'all' | 'awaiting_arrival' | 'checked_in' | 'checked_out';

type OwnerReservationIndexProps = {
    reservations: ReservationListPayload;
    filters: {
        status?: string | null;
        stay_stage?: string | null;
        search?: string | null;
        property_id?: number | null;
        from?: string | null;
        to?: string | null;
    };
    stageCounts?: {
        all: number;
        awaiting_arrival: number;
        checked_in: number;
        checked_out: number;
    };
    statusOptions: ReservationStatusOption[];
    properties: ReservationPropertyOption[];
};

export default function OwnerReservationIndex({
    reservations,
    filters,
    stageCounts,
    statusOptions,
    properties,
}: OwnerReservationIndexProps) {
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [stayStage, setStayStage] = useState<StayStage>(
        (filters.stay_stage as StayStage) || 'all',
    );
    const [searchText, setSearchText] = useState(filters.search ?? '');
    const [propertyId, setPropertyId] = useState(
        filters.property_id ? String(filters.property_id) : 'all',
    );
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    const query = (page = 1, nextStage: StayStage = stayStage) => ({
        status: status === 'all' ? undefined : status,
        stay_stage: nextStage === 'all' ? undefined : nextStage,
        search: searchText.trim() || undefined,
        property_id: propertyId === 'all' ? undefined : propertyId,
        from: from || undefined,
        to: to || undefined,
        page,
    });

    const applyFilters = () =>
        router.get(index().url, query(1), {
            preserveState: true,
            preserveScroll: true,
        });

    const selectStage = (nextStage: StayStage) => {
        setStayStage(nextStage);
        router.get(index().url, query(1, nextStage), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const stageTabs: Array<{
        key: StayStage;
        label: string;
        icon: typeof Layers;
        count?: number;
    }> = [
        {
            key: 'all',
            label: 'All Bookings',
            icon: Layers,
            count: stageCounts?.all,
        },
        {
            key: 'awaiting_arrival',
            label: 'Awaiting Check-In',
            icon: Clock,
            count: stageCounts?.awaiting_arrival,
        },
        {
            key: 'checked_in',
            label: 'In-House Guests',
            icon: DoorOpen,
            count: stageCounts?.checked_in,
        },
        {
            key: 'checked_out',
            label: 'Checked-Out Customers',
            icon: DoorClosed,
            count: stageCounts?.checked_out,
        },
    ];

    return (
        <div className="space-y-6">
            <Head title="Reservations · Partner Portal" />

            <OwnerSectionTabs
                items={OWNER_BOOKINGS_TABS}
                ariaLabel="Bookings and front desk navigation"
            />

            <PageHeader
                eyebrow="Partner Portal"
                title="Reservations & Customer Records"
                description="View guest contact details, check-in and check-out history, and manage physical room allocations across your properties."
            />

            {/* Quick Guest Stay Stage Switcher (Including Checked-Out Customers) */}
            <div
                role="tablist"
                aria-label="Filter bookings by guest stay stage"
                className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-card p-1.5 shadow-2xs dark:border-border"
            >
                {stageTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = stayStage === tab.key;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => selectStage(tab.key)}
                            className={cn(
                                'inline-flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 font-heading text-xs font-semibold transition-all',
                                isActive
                                    ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                    : 'text-tijum-plum-muted hover:bg-tijum-cream/65 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-accent dark:hover:text-foreground',
                            )}
                        >
                            <Icon className="size-3.5" aria-hidden="true" />
                            <span>{tab.label}</span>
                            {typeof tab.count === 'number' && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : 'bg-tijum-surface text-tijum-plum-muted dark:bg-muted dark:text-muted-foreground',
                                    )}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <section className="grid gap-4 rounded-2xl border border-tijum-surface bg-card p-4 shadow-tijum-card md:grid-cols-2 xl:grid-cols-6 dark:border-border">
                <div className="grid gap-2 md:col-span-2 xl:col-span-1">
                    <Label htmlFor="owner-reservation-search">
                        Customer / Booking #
                    </Label>
                    <Input
                        id="owner-reservation-search"
                        type="search"
                        value={searchText}
                        placeholder="Name, phone, email, ref..."
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                applyFilters();
                            }
                        }}
                    />
                </div>
                <FilterSelect
                    id="owner-reservation-status"
                    label="Booking status"
                    value={status}
                    onChange={setStatus}
                    options={[
                        { value: 'all', label: 'All statuses' },
                        ...statusOptions,
                    ]}
                />
                <FilterSelect
                    id="owner-reservation-property"
                    label="Property"
                    value={propertyId}
                    onChange={setPropertyId}
                    options={[
                        { value: 'all', label: 'All properties' },
                        ...properties.map((property) => ({
                            value: String(property.id),
                            label: property.name,
                        })),
                    ]}
                />
                <div className="grid gap-2">
                    <Label htmlFor="owner-reservation-from">
                        Check-in from
                    </Label>
                    <Input
                        id="owner-reservation-from"
                        type="date"
                        value={from}
                        className="dark:[color-scheme:dark]"
                        onChange={(event) => setFrom(event.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="owner-reservation-to">Check-in to</Label>
                    <Input
                        id="owner-reservation-to"
                        type="date"
                        value={to}
                        className="dark:[color-scheme:dark]"
                        onChange={(event) => setTo(event.target.value)}
                    />
                </div>
                <div className="flex items-end">
                    <Button
                        type="button"
                        onClick={applyFilters}
                        className="w-full"
                    >
                        <Search className="size-4" aria-hidden="true" />
                        Apply filters
                    </Button>
                </div>
            </section>

            {reservations.data.length === 0 ? (
                <EmptyState
                    icon={CalendarClock}
                    title="No reservations match"
                    description="Try clearing a filter or switching guest stay stages above."
                />
            ) : (
                <div className="grid gap-4">
                    {reservations.data.map((reservation) => (
                        <ReservationSummaryCard
                            key={reservation.booking_reference}
                            reservation={reservation}
                            href={show(reservation.booking_reference).url}
                            context="owner"
                        />
                    ))}
                </div>
            )}

            {reservations.data.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        Showing{' '}
                        <span className="font-semibold text-tijum-plum dark:text-foreground">
                            {reservations.data.length}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-tijum-plum dark:text-foreground">
                            {reservations.meta.total}
                        </span>{' '}
                        {reservations.meta.total === 1
                            ? 'reservation'
                            : 'reservations'}
                    </p>
                    <Pagination
                        currentPage={reservations.meta.current_page}
                        totalPages={reservations.meta.last_page}
                        getPageHref={(page) =>
                            index({ query: query(page) }).url
                        }
                    />
                </div>
            )}
        </div>
    );
}

function FilterSelect({
    id,
    label,
    value,
    onChange,
    options,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id={id}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
