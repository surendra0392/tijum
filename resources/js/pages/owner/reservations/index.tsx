import { Head, router } from '@inertiajs/react';
import { CalendarClock, Search } from 'lucide-react';
import { useState } from 'react';
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
import { index, show } from '@/routes/owner/reservations';
import type {
    ReservationListPayload,
    ReservationPropertyOption,
    ReservationStatusOption,
} from '@/types';

type OwnerReservationIndexProps = {
    reservations: ReservationListPayload;
    filters: {
        status?: string | null;
        property_id?: number | null;
        from?: string | null;
        to?: string | null;
    };
    statusOptions: ReservationStatusOption[];
    properties: ReservationPropertyOption[];
};

export default function OwnerReservationIndex({
    reservations,
    filters,
    statusOptions,
    properties,
}: OwnerReservationIndexProps) {
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [propertyId, setPropertyId] = useState(
        filters.property_id ? String(filters.property_id) : 'all',
    );
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    const query = (page = 1) => ({
        status: status === 'all' ? undefined : status,
        property_id: propertyId === 'all' ? undefined : propertyId,
        from: from || undefined,
        to: to || undefined,
        page,
    });

    const applyFilters = () =>
        router.get(index().url, query(), {
            preserveState: true,
            preserveScroll: true,
        });

    return (
        <div className="space-y-6">
            <Head title="Reservations · Partner Portal" />
            <PageHeader
                eyebrow="Partner Portal"
                title="Reservations"
                description="Monitor confirmed guest reservations, view stay details, and manage physical room allocations for your properties."
            />

            <section className="grid gap-4 rounded-2xl border border-tijum-surface bg-card p-4 shadow-tijum-card md:grid-cols-2 xl:grid-cols-5 dark:border-border">
                <FilterSelect
                    id="owner-reservation-status"
                    label="Status"
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
                    description="New customer reservation requests for your properties will appear here."
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
