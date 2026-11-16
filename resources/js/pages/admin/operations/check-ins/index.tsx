import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    DoorOpen,
    Filter,
    Mail,
    MapPin,
    Phone,
    RotateCcw,
    Search,
    Sparkles,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    index as checkInsIndex,
    mark as markCheckInRoute,
    undo as undoCheckInRoute,
} from '@/routes/admin/operations/check-ins';
import { show as reservationShow } from '@/routes/admin/reservations';

interface CheckInReservation {
    id: number;
    booking_reference: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_gender: string;
    guest_count: number;
    property_id: number;
    property_name: string;
    property_locality?: string | null;
    city_name?: string | null;
    room_type_name: string;
    allocations: Array<{ id: number; room_number: string }>;
    check_in_date: string;
    checkout_date: string;
    duration_label: string;
    early_check_in_requested: boolean;
    requested_arrival_time?: string | null;
    total_amount_minor: number;
    currency_code: string;
    is_checked_in: boolean;
    checked_in_at?: string | null;
    checked_in_by_type?: string | null;
    check_in_notes?: string | null;
}

interface AdminCheckInProps {
    reservations: {
        data: CheckInReservation[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
        };
    };
    stats: {
        total_expected: number;
        checked_in: number;
        pending: number;
        early_requests: number;
    };
    filters: {
        date: string;
        property_id: number | null;
        city_id: number | null;
        status: string;
        search: string;
    };
    properties: Array<{ id: number; name: string }>;
    cities: Array<{ id: number; name: string }>;
}

export default function AdminCheckInIndex({
    reservations,
    stats,
    filters,
    properties,
    cities,
}: AdminCheckInProps) {
    const [date, setDate] = useState(filters.date);
    const [propertyId, setPropertyId] = useState(
        filters.property_id ? String(filters.property_id) : 'all',
    );
    const [cityId, setCityId] = useState(
        filters.city_id ? String(filters.city_id) : 'all',
    );
    const [status, setStatus] = useState(filters.status || 'all');
    const [search, setSearch] = useState(filters.search || '');

    // Check-in modal state
    const [selectedReservation, setSelectedReservation] =
        useState<CheckInReservation | null>(null);
    const [checkInNotes, setCheckInNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Undo confirmation modal state
    const [undoReservation, setUndoReservation] =
        useState<CheckInReservation | null>(null);
    const [isUndoing, setIsUndoing] = useState(false);

    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    const getRelativeDate = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().split('T')[0];
    };

    const applyFilters = (
        newParams: Record<string, string | number | undefined> = {},
    ) => {
        const params: Record<string, string | number | undefined> = {
            date,
            property_id: propertyId === 'all' ? undefined : propertyId,
            city_id: cityId === 'all' ? undefined : cityId,
            status: status === 'all' ? undefined : status,
            search: search.trim() ? search.trim() : undefined,
            ...newParams,
        };

        Object.keys(params).forEach(
            (k) => params[k] === undefined && delete params[k],
        );

        router.get(checkInsIndex.url(), params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        applyFilters({ date: newDate, page: 1 });
    };

    const handleSearchSubmit = (e: FormEvent) => {
        e.preventDefault();
        applyFilters({ page: 1 });
    };

    const handleResetFilters = () => {
        const today = getTodayDate();
        setDate(today);
        setPropertyId('all');
        setCityId('all');
        setStatus('all');
        setSearch('');
        router.get(
            checkInsIndex.url(),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const hasActiveFilters =
        propertyId !== 'all' ||
        cityId !== 'all' ||
        status !== 'all' ||
        search.trim() !== '' ||
        date !== getTodayDate();

    const handleOpenCheckIn = (res: CheckInReservation) => {
        setSelectedReservation(res);
        setCheckInNotes(res.check_in_notes || '');
    };

    const handleConfirmCheckIn = () => {
        if (!selectedReservation) return;
        setIsSubmitting(true);
        router.post(
            markCheckInRoute.url(selectedReservation.booking_reference),
            { notes: checkInNotes },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsSubmitting(false);
                    setSelectedReservation(null);
                    setCheckInNotes('');
                },
            },
        );
    };

    const handleConfirmUndoCheckIn = () => {
        if (!undoReservation) return;
        setIsUndoing(true);
        router.post(
            undoCheckInRoute.url(undoReservation.booking_reference),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsUndoing(false);
                    setUndoReservation(null);
                },
            },
        );
    };

    const totalArrivals = reservations.meta.total;
    const perPage = reservations.meta.per_page || 20;
    const currentPage = reservations.meta.current_page || 1;
    const startRecord =
        reservations.data.length === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const endRecord = (currentPage - 1) * perPage + reservations.data.length;

    return (
        <div className="space-y-6">
            <Head title="Guest Check-ins · Marketplace Operations · TIJUM" />

            <PageHeader
                eyebrow="Marketplace Operations"
                title="Check-ins"
                description="Supervise guest arrivals, verify early check-in requests, contact guests, and track operational front-desk check-in statuses across TIJUM."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant={
                                date === getTodayDate() ? 'default' : 'outline'
                            }
                            size="sm"
                            onClick={() => handleDateChange(getTodayDate())}
                        >
                            Today
                        </Button>
                        <Button
                            type="button"
                            variant={
                                date === getRelativeDate(1)
                                    ? 'default'
                                    : 'outline'
                            }
                            size="sm"
                            onClick={() => handleDateChange(getRelativeDate(1))}
                        >
                            Tomorrow
                        </Button>
                        <Button
                            type="button"
                            variant={
                                date === getRelativeDate(-1)
                                    ? 'default'
                                    : 'outline'
                            }
                            size="sm"
                            onClick={() =>
                                handleDateChange(getRelativeDate(-1))
                            }
                        >
                            Yesterday
                        </Button>
                    </div>
                }
            />

            {/* KPI Stat Cards */}
            <section
                aria-label="Daily check-in metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Expected Today"
                    value={stats.total_expected}
                    helperText="Confirmed arrivals scheduled"
                    icon={DoorOpen}
                />
                <StatCard
                    label="Checked In"
                    value={stats.checked_in}
                    helperText="Arrivals verified at desk"
                    icon={CheckCircle2}
                    className="border-l-4 border-l-emerald-500"
                />
                <StatCard
                    label="Pending Arrival"
                    value={stats.pending}
                    helperText="Awaiting guest check-in"
                    icon={Clock}
                    className="border-l-4 border-l-amber-500"
                />
                <StatCard
                    label="Early Requests"
                    value={stats.early_requests}
                    helperText="Requested early arrival"
                    icon={Sparkles}
                    className="border-l-4 border-l-tijum-coral"
                />
            </section>

            {/* Filter & Pill Tabs Bar */}
            <Card className="py-5">
                <CardContent className="space-y-4">
                    <form
                        onSubmit={handleSearchSubmit}
                        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
                    >
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="checkin-filter-date"
                                className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground"
                            >
                                Arrival Date
                            </Label>
                            <Input
                                id="checkin-filter-date"
                                type="date"
                                value={date}
                                onChange={(e) =>
                                    handleDateChange(e.target.value)
                                }
                                className="h-10"
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="checkin-filter-city"
                                className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground"
                            >
                                City
                            </Label>
                            <Select
                                value={cityId}
                                onValueChange={(val) => {
                                    setCityId(val);
                                    applyFilters({
                                        city_id:
                                            val === 'all' ? undefined : val,
                                        page: 1,
                                    });
                                }}
                            >
                                <SelectTrigger
                                    id="checkin-filter-city"
                                    size="sm"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All Cities" />
                                </SelectTrigger>
                                <SelectContent className="border-tijum-surface/80 bg-white text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                    <SelectItem value="all">
                                        All Cities
                                    </SelectItem>
                                    {cities.map((c) => (
                                        <SelectItem
                                            key={c.id}
                                            value={String(c.id)}
                                        >
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="checkin-filter-property"
                                className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground"
                            >
                                Property
                            </Label>
                            <Select
                                value={propertyId}
                                onValueChange={(val) => {
                                    setPropertyId(val);
                                    applyFilters({
                                        property_id:
                                            val === 'all' ? undefined : val,
                                        page: 1,
                                    });
                                }}
                            >
                                <SelectTrigger
                                    id="checkin-filter-property"
                                    size="sm"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All Properties" />
                                </SelectTrigger>
                                <SelectContent className="border-tijum-surface/80 bg-white text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                                    <SelectItem value="all">
                                        All Properties
                                    </SelectItem>
                                    {properties.map((p) => (
                                        <SelectItem
                                            key={p.id}
                                            value={String(p.id)}
                                        >
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="checkin-filter-search"
                                className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground"
                            >
                                Search Guest / Ref
                            </Label>
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="checkin-filter-search"
                                    type="text"
                                    placeholder="Name, phone, ref..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-10 pl-9"
                                />
                            </div>
                        </div>

                        <div className="flex items-end gap-2">
                            <Button type="submit" size="sm" className="flex-1">
                                <Filter
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Filter</span>
                            </Button>
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetFilters}
                                >
                                    <RotateCcw
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Clear</span>
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Tabs
                value={status}
                onValueChange={(val) => {
                    setStatus(val);
                    applyFilters({
                        status: val === 'all' ? undefined : val,
                        page: 1,
                    });
                }}
                className="space-y-0"
            >
                <TabsList
                    variant="pill"
                    label="Filter arrivals by check-in status"
                >
                    <TabsTrigger value="all">
                        All Arrivals ({stats.total_expected})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                        Pending Arrival ({stats.pending})
                    </TabsTrigger>
                    <TabsTrigger value="checked_in">
                        Checked In ({stats.checked_in})
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Arrivals List / Table */}
            {reservations.data.length === 0 ? (
                <EmptyState
                    icon={DoorOpen}
                    title="No expected check-ins found"
                    description={`No confirmed reservations scheduled for arrival on ${date} matching the selected criteria.`}
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetFilters}
                        >
                            <RotateCcw className="size-4" aria-hidden="true" />
                            <span>Reset Filters</span>
                        </Button>
                    }
                />
            ) : (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                                Expected Arrivals Roster
                            </CardTitle>
                            <Badge variant="outline" className="tabular-nums">
                                {reservations.meta.total} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-4">
                                        Booking &amp; Guest
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Property &amp; Stay
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Room &amp; Allocation
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Timing &amp; Requests
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Check-In Status
                                    </TableHead>
                                    <TableHead className="px-4 text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reservations.data.map((res) => (
                                    <TableRow key={res.id}>
                                        <TableCell className="px-4 py-4 align-top">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Link
                                                        href={reservationShow.url(
                                                            res.booking_reference,
                                                        )}
                                                        className="font-mono text-xs font-bold text-tijum-coral tabular-nums hover:underline"
                                                    >
                                                        {res.booking_reference}
                                                    </Link>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px]"
                                                    >
                                                        {res.guest_gender}
                                                    </Badge>
                                                </div>
                                                <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                    {res.guest_name}
                                                </p>
                                                <div className="flex flex-col gap-0.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    <a
                                                        href={`tel:${res.guest_phone}`}
                                                        className="inline-flex items-center gap-1.5 text-tijum-plum tabular-nums transition-colors hover:text-tijum-coral dark:text-foreground dark:hover:text-tijum-coral"
                                                    >
                                                        <Phone
                                                            className="size-3"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {res.guest_phone}
                                                        </span>
                                                    </a>
                                                    <a
                                                        href={`mailto:${res.guest_email}`}
                                                        className="inline-flex items-center gap-1.5 text-tijum-plum-muted transition-colors hover:text-tijum-coral dark:text-muted-foreground dark:hover:text-tijum-coral"
                                                    >
                                                        <Mail
                                                            className="size-3"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {res.guest_email}
                                                        </span>
                                                    </a>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="px-4 py-4 align-top">
                                            <div className="space-y-1">
                                                <p className="font-medium text-tijum-plum dark:text-foreground">
                                                    {res.property_name}
                                                </p>
                                                <p className="flex items-center gap-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    <MapPin
                                                        className="size-3 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        {res.property_locality
                                                            ? `${res.property_locality}, `
                                                            : ''}
                                                        {res.city_name}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Duration:{' '}
                                                    <strong className="font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                                        {res.duration_label}
                                                    </strong>
                                                </p>
                                            </div>
                                        </TableCell>

                                        <TableCell className="px-4 py-4 align-top">
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                    {res.room_type_name}
                                                </p>
                                                <div>
                                                    {res.allocations.length >
                                                    0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {res.allocations.map(
                                                                (a) => (
                                                                    <Badge
                                                                        key={
                                                                            a.id
                                                                        }
                                                                        variant="secondary"
                                                                        className="text-[11px] tabular-nums"
                                                                    >
                                                                        Room{' '}
                                                                        {
                                                                            a.room_number
                                                                        }
                                                                    </Badge>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-dashed border-status-warning-border bg-status-warning-bg text-[11px] text-status-warning-fg"
                                                        >
                                                            Pending Bed
                                                            Assignment
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="px-4 py-4 align-top">
                                            <div className="space-y-1.5">
                                                <div className="text-xs">
                                                    <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                                        Check-in:{' '}
                                                    </span>
                                                    <strong className="font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                                        {res.check_in_date}
                                                    </strong>
                                                </div>
                                                {res.early_check_in_requested && (
                                                    <Badge
                                                        variant="outline"
                                                        className="gap-1 border-status-warning-border bg-status-warning-bg text-[11px] text-status-warning-fg"
                                                    >
                                                        <Sparkles
                                                            className="size-3"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            Early Check-in
                                                            Requested
                                                            {res.requested_arrival_time &&
                                                                ` (${res.requested_arrival_time})`}
                                                        </span>
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="px-4 py-4 align-top">
                                            {res.is_checked_in ? (
                                                <div className="space-y-1">
                                                    <StatusBadge
                                                        status="completed"
                                                        label="Checked In"
                                                    />
                                                    {res.checked_in_at && (
                                                        <p className="text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                            {new Date(
                                                                res.checked_in_at,
                                                            ).toLocaleTimeString(
                                                                [],
                                                                {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                },
                                                            )}
                                                            {res.checked_in_by_type ===
                                                            'owner'
                                                                ? ' · by Partner'
                                                                : ' · by Admin'}
                                                        </p>
                                                    )}
                                                    {res.check_in_notes && (
                                                        <p className="line-clamp-2 text-[11px] text-tijum-plum-muted italic dark:text-muted-foreground">
                                                            &ldquo;
                                                            {res.check_in_notes}
                                                            &rdquo;
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <StatusBadge
                                                    status="pending"
                                                    label="Pending Arrival"
                                                />
                                            )}
                                        </TableCell>

                                        <TableCell className="px-4 py-4 text-right align-top">
                                            {res.is_checked_in ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setUndoReservation(res)
                                                    }
                                                >
                                                    <RotateCcw
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Undo</span>
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleOpenCheckIn(res)
                                                    }
                                                >
                                                    <CheckCircle2
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Mark Checked-In</span>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing {startRecord}–{endRecord} of{' '}
                                {totalArrivals} arrival(s)
                            </p>
                            <Pagination
                                currentPage={reservations.meta.current_page}
                                lastPage={reservations.meta.last_page}
                                total={reservations.meta.total}
                                onPageChange={(page) =>
                                    applyFilters({ page })
                                }
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Check-In Modal */}
            <Dialog
                open={selectedReservation !== null}
                onOpenChange={(open) => !open && setSelectedReservation(null)}
            >
                <DialogContent className="border-tijum-surface/80 bg-white text-tijum-plum sm:max-w-md dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-heading text-lg text-tijum-plum dark:text-foreground">
                            <DoorOpen
                                className="size-5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>Confirm Guest Check-In</span>
                        </DialogTitle>
                        <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                            Mark arrival for booking{' '}
                            <strong className="font-mono text-tijum-plum tabular-nums dark:text-foreground">
                                {selectedReservation?.booking_reference}
                            </strong>{' '}
                            ({selectedReservation?.guest_name}).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-xs text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                            <p>
                                <strong>Property:</strong>{' '}
                                {selectedReservation?.property_name}
                            </p>
                            <p>
                                <strong>Room Type:</strong>{' '}
                                {selectedReservation?.room_type_name}
                            </p>
                            <p className="tabular-nums">
                                <strong>Guest Phone:</strong>{' '}
                                {selectedReservation?.guest_phone}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="check_in_notes"
                                className="text-xs font-medium text-tijum-plum dark:text-foreground"
                            >
                                Front-desk Arrival Notes (Optional)
                            </Label>
                            <Textarea
                                id="check_in_notes"
                                placeholder="E.g. Government ID verified, keycard 204 handed over, early arrival welcomed."
                                value={checkInNotes}
                                onChange={(e) =>
                                    setCheckInNotes(e.target.value)
                                }
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedReservation(null)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="default"
                            loading={isSubmitting}
                            onClick={handleConfirmCheckIn}
                        >
                            {isSubmitting
                                ? 'Confirming...'
                                : 'Confirm Check-In'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Undo Check-In Confirmation Modal */}
            <Dialog
                open={undoReservation !== null}
                onOpenChange={(open) => !open && setUndoReservation(null)}
            >
                <DialogContent className="border-tijum-surface/80 bg-white text-tijum-plum sm:max-w-md dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-heading text-lg text-tijum-plum dark:text-foreground">
                            <RotateCcw
                                className="size-5 text-destructive"
                                aria-hidden="true"
                            />
                            <span>Reverse Check-In Status</span>
                        </DialogTitle>
                        <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                            Are you sure you want to reverse the check-in status
                            for{' '}
                            <strong className="font-mono text-tijum-plum tabular-nums dark:text-foreground">
                                {undoReservation?.booking_reference}
                            </strong>{' '}
                            ({undoReservation?.guest_name})?
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setUndoReservation(null)}
                            disabled={isUndoing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            loading={isUndoing}
                            onClick={handleConfirmUndoCheckIn}
                        >
                            Reverse Check-In
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
