import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarClock,
    CheckCircle2,
    Clock,
    DoorClosed,
    DoorOpen,
    IndianRupee,
    RotateCcw,
    Search,
} from 'lucide-react';
import { useState } from 'react';
import { ReservationSummaryCard } from '@/components/reservations/reservation-summary-card';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatReservationMoney } from '@/lib/reservation-format';
import { index as checkInsIndex } from '@/routes/admin/operations/check-ins';
import { index as checkOutsIndex } from '@/routes/admin/operations/check-outs';
import { index, show } from '@/routes/admin/reservations';
import type {
    ReservationListPayload,
    ReservationPropertyOption,
    ReservationStatusOption,
} from '@/types';

type AdminReservationIndexProps = {
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

export default function AdminReservationIndex({
    reservations,
    filters,
    statusOptions,
    properties,
}: AdminReservationIndexProps) {
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [propertyId, setPropertyId] = useState(
        filters.property_id ? String(filters.property_id) : 'all',
    );
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');

    const query = (
        page = 1,
        overrides: {
            status?: string;
            propertyId?: string;
            from?: string;
            to?: string;
        } = {},
    ) => {
        const nextStatus = overrides.status ?? status;
        const nextPropertyId = overrides.propertyId ?? propertyId;
        const nextFrom = overrides.from ?? from;
        const nextTo = overrides.to ?? to;

        return {
            status: nextStatus === 'all' ? undefined : nextStatus,
            property_id: nextPropertyId === 'all' ? undefined : nextPropertyId,
            from: nextFrom || undefined,
            to: nextTo || undefined,
            page,
        };
    };

    const applyFilters = (
        overrides: {
            status?: string;
            propertyId?: string;
            from?: string;
            to?: string;
        } = {},
    ) =>
        router.get(index().url, query(1, overrides), {
            preserveState: true,
            preserveScroll: true,
        });

    const hasActiveFilters =
        status !== 'all' || propertyId !== 'all' || from !== '' || to !== '';

    const resetFilters = () => {
        setStatus('all');
        setPropertyId('all');
        setFrom('');
        setTo('');
        router.get(
            index().url,
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const confirmedOnPage = reservations.data.filter(
        (item) => item.status === 'confirmed',
    ).length;
    const awaitingPaymentOnPage = reservations.data.filter(
        (item) => item.status === 'awaiting_payment',
    ).length;
    const pageVolumeMinor = reservations.data.reduce(
        (sum, item) => sum + item.total_amount_minor,
        0,
    );
    const currencyCode = reservations.data[0]?.currency_code ?? 'INR';

    return (
        <div className="space-y-6">
            <Head title="Reservation Oversight · Admin" />
            <PageHeader
                eyebrow="Read-only oversight"
                title="Reservations"
                description="Inspect reservation snapshots and lifecycle status across TIJUM without changing owner decisions or room allocations."
                badges={
                    <>
                        <Badge variant="plum">Read-only Snapshot</Badge>
                        <Badge variant="outline" className="tabular-nums">
                            {reservations.meta.total} matching
                        </Badge>
                    </>
                }
                actions={
                    <>
                        <Button asChild variant="outline" size="sm">
                            <Link href={checkInsIndex().url}>
                                <DoorOpen
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Check-ins Desk</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href={checkOutsIndex().url}>
                                <DoorClosed
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Check-outs Desk</span>
                            </Link>
                        </Button>
                    </>
                }
            />

            <section
                aria-label="Reservation oversight metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Matching Reservations"
                    value={reservations.meta.total}
                    helperText="Across current filter scope"
                    icon={CalendarClock}
                />
                <StatCard
                    label="Confirmed (Page)"
                    value={confirmedOnPage}
                    helperText="Confirmed stays on this page"
                    icon={CheckCircle2}
                    className="border-l-4 border-l-emerald-500"
                />
                <StatCard
                    label="Awaiting Payment (Page)"
                    value={awaitingPaymentOnPage}
                    helperText="Pending gateway confirmation"
                    icon={Clock}
                    className="border-l-4 border-l-amber-500"
                />
                <StatCard
                    label="Snapshot Volume (Page)"
                    value={formatReservationMoney(
                        pageVolumeMinor,
                        currencyCode,
                    )}
                    helperText="Booked total on this page"
                    icon={IndianRupee}
                    className="border-l-4 border-l-tijum-coral"
                />
            </section>

            {/* Filter Card (Separate from Status Pill Tabs) */}
            <Card className="py-4">
                <CardContent>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            applyFilters();
                        }}
                        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                    >
                        <AdminFilterSelect
                            id="admin-reservation-property"
                            label="Property"
                            value={propertyId}
                            onChange={(nextProperty) => {
                                setPropertyId(nextProperty);
                                applyFilters({ propertyId: nextProperty });
                            }}
                            options={[
                                { value: 'all', label: 'All properties' },
                                ...properties.map((property) => ({
                                    value: String(property.id),
                                    label: property.name,
                                })),
                            ]}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="admin-reservation-from">
                                Check-in from
                            </Label>
                            <Input
                                id="admin-reservation-from"
                                type="date"
                                value={from}
                                onChange={(event) =>
                                    setFrom(event.target.value)
                                }
                                className="h-10 dark:[color-scheme:dark]"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-reservation-to">
                                Check-in to
                            </Label>
                            <Input
                                id="admin-reservation-to"
                                type="date"
                                value={to}
                                onChange={(event) => setTo(event.target.value)}
                                className="h-10 dark:[color-scheme:dark]"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <Button type="submit" size="sm" className="flex-1">
                                <Search className="size-4" aria-hidden="true" />
                                <span>Apply filters</span>
                            </Button>
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={resetFilters}
                                    title="Reset filters"
                                    aria-label="Reset filters"
                                >
                                    <RotateCcw
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Reset</span>
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Standalone Status Pill Tabs */}
            <Tabs
                value={status}
                onValueChange={(nextStatus) => {
                    setStatus(nextStatus);
                    applyFilters({ status: nextStatus });
                }}
                className="max-w-full space-y-0"
            >
                <TabsList
                    id="admin-reservation-status"
                    variant="pill"
                    label="Filter reservations by lifecycle status"
                    className="max-w-full"
                >
                    <TabsTrigger value="all">All statuses</TabsTrigger>
                    {statusOptions.map((option) => (
                        <TabsTrigger key={option.value} value={option.value}>
                            {option.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {reservations.data.length === 0 ? (
                <EmptyState
                    icon={CalendarClock}
                    title="No reservations match"
                    description="Reservation records matching the selected filters will appear here."
                    action={
                        hasActiveFilters ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetFilters}
                            >
                                <RotateCcw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Reset filters</span>
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="grid gap-4">
                    {reservations.data.map((reservation) => (
                        <ReservationSummaryCard
                            key={reservation.booking_reference}
                            reservation={reservation}
                            href={show(reservation.booking_reference).url}
                            context="admin"
                        />
                    ))}
                </div>
            )}

            {reservations.data.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        Showing{' '}
                        <span className="font-semibold text-tijum-plum dark:text-foreground">
                            {reservations.data.length}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-tijum-plum dark:text-foreground">
                            {reservations.meta.total}
                        </span>{' '}
                        reservation{reservations.meta.total === 1 ? '' : 's'}
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

function AdminFilterSelect({
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
                <SelectTrigger id={id} size="sm" className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-tijum-surface/80 bg-white text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
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
