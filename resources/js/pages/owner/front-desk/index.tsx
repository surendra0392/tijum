import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownLeft,
    ArrowRightLeft,
    ArrowUpRight,
    Building2,
    Calendar,
    CalendarCheck,
    CheckCircle2,
    Clock,
    DoorClosed,
    DoorOpen,
    Eye,
    Home,
    KeyRound,
    LogIn,
    LogOut,
    Mail,
    Phone,
    Search,
    UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import {
    OWNER_BOOKINGS_TABS,
    OwnerSectionTabs,
} from '@/components/owner/owner-section-tabs';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type FrontDeskReservation = {
    id: number;
    booking_reference: string;
    property_id: number;
    property_name: string;
    room_type_name: string;
    guest_name: string;
    guest_phone?: string | null;
    guest_email?: string | null;
    guest_gender?: string | null;
    guest_composition?: string | null;
    guests_count: number;
    check_in_date: string;
    checkout_date: string;
    stay_nights: number;
    status: string;
    status_label: string;
    early_check_in_requested: boolean;
    requested_arrival_time?: string | null;
    checked_in_at?: string | null;
    checked_out_at?: string | null;
    check_in_notes?: string | null;
    checkout_notes?: string | null;
    total_amount_rupees: string;
    allocated_rooms: Array<{
        room_id: number;
        room_number: string;
        floor_number?: string | null;
        allocated_quantity?: number;
    }>;
    room_history?: Array<{
        property_room_id: number;
        room_number: string;
        floor_number?: string | null;
        allocated_quantity: number;
        status: string;
        status_label: string;
        action: string;
        previous_rooms: string[];
        replaced_by_rooms: string[];
        allocated_at?: string | null;
        released_at?: string | null;
    }>;
    allocated_quantity?: number;
    required_quantity?: number;
    is_allocated: boolean;
    is_overdue_arrival: boolean;
    is_overdue_departure: boolean;
};

type Props = {
    properties: Array<{
        id: number;
        name: string;
        property_reference: string;
    }>;
    filters: {
        date: string;
        property_id: number | null;
        tab: string;
        search: string;
    };
    stats: {
        arrivals_count: number;
        departures_count: number;
        in_house_count: number;
        upcoming_count: number;
        checked_out_count?: number;
        unallocated_count: number;
    };
    arrivals: FrontDeskReservation[];
    departures: FrontDeskReservation[];
    inHouse: FrontDeskReservation[];
    upcoming: FrontDeskReservation[];
    history: FrontDeskReservation[];
    status?: string;
};

export default function OwnerFrontDeskIndex({
    properties,
    filters,
    stats,
    arrivals,
    departures,
    inHouse,
    upcoming,
    history,
    status,
}: Props) {
    const [selectedTab, setSelectedTab] = useState(filters.tab || 'arrivals');
    const [tabPages, setTabPages] = useState<Record<string, number>>({});
    const frontDeskPageSize = 10;

    const renderPaginatedList = (
        items: FrontDeskReservation[],
        type: 'arrival' | 'departure' | 'in_house' | 'upcoming' | 'history',
        label: string,
    ) => {
        const totalPages = Math.max(
            1,
            Math.ceil(items.length / frontDeskPageSize),
        );
        const currentPage = Math.min(tabPages[type] ?? 1, totalPages);
        const paged = items.slice(
            (currentPage - 1) * frontDeskPageSize,
            currentPage * frontDeskPageSize,
        );

        return (
            <div className="space-y-3">
                {paged.map((res) => renderReservationCard(res, type))}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 pt-3 dark:border-border">
                    <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        Showing {(currentPage - 1) * frontDeskPageSize + 1}–
                        {Math.min(
                            currentPage * frontDeskPageSize,
                            items.length,
                        )}{' '}
                        of {items.length} {label}
                    </p>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page) =>
                            setTabPages((prev) => ({ ...prev, [type]: page }))
                        }
                    />
                </div>
            </div>
        );
    };
    const [checkInModalRes, setCheckInModalRes] =
        useState<FrontDeskReservation | null>(null);
    const [checkOutModalRes, setCheckOutModalRes] =
        useState<FrontDeskReservation | null>(null);

    // Check-in form
    const checkInForm = useForm({
        id_verified: false,
        key_issued: false,
        notes: '',
    });

    // Check-out form
    const checkOutForm = useForm({
        key_returned: false,
        room_inspected: false,
        notes: '',
    });

    const updateFilter = (key: string, value: string | number | null) => {
        router.get(
            '/owner/front-desk',
            {
                ...filters,
                tab: selectedTab,
                [key]: value === 'all' ? null : value,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.elements.namedItem('search') as HTMLInputElement;
        updateFilter('search', input.value.trim() || null);
    };

    const submitCheckIn = (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkInModalRes) return;

        checkInForm.post(
            `/owner/front-desk/${checkInModalRes.booking_reference}/check-in`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCheckInModalRes(null);
                    checkInForm.reset();
                },
            },
        );
    };

    const submitCheckOut = (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkOutModalRes) return;

        checkOutForm.post(
            `/owner/front-desk/${checkOutModalRes.booking_reference}/check-out`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCheckOutModalRes(null);
                    checkOutForm.reset();
                },
            },
        );
    };

    const renderReservationCard = (
        res: FrontDeskReservation,
        type: 'arrival' | 'departure' | 'in_house' | 'upcoming' | 'history',
    ) => (
        <Card
            key={res.id}
            className={`border-tijum-surface/80 transition-all hover:border-tijum-coral/40 hover:shadow-md dark:border-border ${
                res.is_overdue_arrival || res.is_overdue_departure
                    ? 'border-status-warning-border bg-status-warning-bg/35'
                    : ''
            }`}
        >
            <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Guest info & reservation details */}
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                {res.guest_name}
                            </span>
                            <Badge
                                variant="outline"
                                className="font-mono text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                #{res.booking_reference}
                            </Badge>
                            <Badge variant="secondary" className="text-xs tabular-nums">
                                {res.guests_count} Guest
                                {res.guests_count === 1 ? '' : 's'}
                            </Badge>
                            {res.checked_out_at ? (
                                <Badge className="border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-400/40 dark:bg-indigo-950/70 dark:text-indigo-200">
                                    <DoorClosed className="mr-1 size-3" />
                                    Checked Out
                                </Badge>
                            ) : res.checked_in_at ? (
                                <Badge className="border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-200">
                                    <DoorOpen className="mr-1 size-3" />
                                    Checked In · In-House
                                </Badge>
                            ) : (
                                <Badge className="border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-950/70 dark:text-sky-200">
                                    <CalendarCheck className="mr-1 size-3" />
                                    Awaiting Check-In
                                </Badge>
                            )}
                            {res.early_check_in_requested && (
                                <Badge className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200">
                                    <Clock className="mr-1 size-3" /> Early
                                    Arrival (
                                    {res.requested_arrival_time || 'Morning'})
                                </Badge>
                            )}
                            {res.is_overdue_arrival && (
                                <Badge
                                    variant="destructive"
                                    className="text-xs"
                                >
                                    Overdue Arrival
                                </Badge>
                            )}
                            {res.is_overdue_departure && (
                                <Badge
                                    variant="destructive"
                                    className="text-xs"
                                >
                                    Overdue Checkout
                                </Badge>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium text-tijum-plum dark:text-foreground">
                                <Building2 className="size-3.5 text-tijum-coral" />
                                {res.property_name}
                            </span>
                            <span className="flex items-center gap-1">
                                <DoorClosed className="size-3.5" />
                                {res.room_type_name}
                            </span>
                            {res.allocated_rooms.length > 0 ? (
                                <span className="flex flex-wrap items-center gap-1.5 font-semibold text-tijum-plum dark:text-foreground">
                                    <KeyRound className="size-3.5 text-tijum-coral" />
                                    <span>
                                        {res.checked_out_at
                                            ? 'Stayed in Room '
                                            : 'Room '}
                                        {res.allocated_rooms
                                            .map((r) => r.room_number)
                                            .join(', ')}
                                    </span>
                                    {res.room_history &&
                                        res.room_history.length >
                                            res.allocated_rooms.length && (
                                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200">
                                                <ArrowRightLeft className="size-2.5" />
                                                Room{' '}
                                                {res.room_history
                                                    .map((h) => h.room_number)
                                                    .join(' → ')}
                                            </span>
                                        )}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 font-medium text-orange-700 dark:text-orange-300">
                                    <AlertTriangle className="size-3.5" />
                                    No room allocated yet
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="size-3.5" />
                                <strong className="text-tijum-plum dark:text-foreground">
                                    {res.check_in_date}
                                </strong>{' '}
                                to{' '}
                                <strong className="text-tijum-plum dark:text-foreground">
                                    {res.checkout_date}
                                </strong>{' '}
                                ({res.stay_nights} night
                                {res.stay_nights === 1 ? '' : 's'})
                            </span>
                            {res.guest_phone && (
                                <a
                                    href={`tel:${res.guest_phone}`}
                                    className="flex items-center gap-1 font-medium text-tijum-plum hover:text-tijum-coral dark:text-foreground"
                                >
                                    <Phone className="size-3.5 text-tijum-coral" />
                                    <span>{res.guest_phone}</span>
                                </a>
                            )}
                            {res.guest_email && (
                                <a
                                    href={`mailto:${res.guest_email}`}
                                    className="flex items-center gap-1 text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                                >
                                    <Mail className="size-3.5 text-tijum-coral" />
                                    <span>{res.guest_email}</span>
                                </a>
                            )}
                            <span>Total: ₹{res.total_amount_rupees}</span>
                        </div>

                        {res.checked_in_at && (
                            <p className="text-[11px] text-status-success-fg">
                                Checked in on{' '}
                                {new Date(res.checked_in_at).toLocaleTimeString(
                                    [],
                                    {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        day: 'numeric',
                                        month: 'short',
                                    },
                                )}{' '}
                                {res.check_in_notes &&
                                    `— "${res.check_in_notes}"`}
                            </p>
                        )}

                        {res.checked_out_at && (
                            <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                                Checked out on{' '}
                                {new Date(
                                    res.checked_out_at,
                                ).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: 'numeric',
                                    month: 'short',
                                })}{' '}
                                {res.checkout_notes &&
                                    `— "${res.checkout_notes}"`}
                            </p>
                        )}
                    </div>

                    {/* Operational action buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
                        {type === 'arrival' && res.is_allocated && (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setCheckInModalRes(res);
                                    checkInForm.reset();
                                }}
                                className="bg-emerald-600 font-medium text-white hover:bg-emerald-700"
                            >
                                <LogIn className="mr-1.5 size-4" /> Check In
                                Guest
                            </Button>
                        )}

                        {type === 'departure' && (
                            <Button
                                size="sm"
                                onClick={() => {
                                    setCheckOutModalRes(res);
                                    checkOutForm.reset();
                                }}
                                className="bg-indigo-600 font-medium text-white hover:bg-indigo-700"
                            >
                                <LogOut className="mr-1.5 size-4" /> Check Out
                                Guest
                            </Button>
                        )}

                        {type === 'in_house' && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setCheckOutModalRes(res);
                                    checkOutForm.reset();
                                }}
                                className="border-indigo-300 text-indigo-700 hover:bg-indigo-600 hover:text-white dark:border-indigo-500/60 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white"
                            >
                                <LogOut className="mr-1.5 size-4" /> Check Out
                                Guest
                            </Button>
                        )}

                        {!res.is_allocated && type !== 'history' && (
                            <Button
                                size="sm"
                                asChild
                                className="bg-tijum-coral font-medium text-white hover:bg-tijum-coral/90"
                            >
                                <Link
                                    href={`/owner/reservations/${res.booking_reference}#room-allocation-card`}
                                >
                                    <KeyRound className="mr-1.5 size-4" />{' '}
                                    Assign Room First
                                </Link>
                            </Button>
                        )}

                        <Button size="sm" variant="outline" asChild>
                            <Link
                                href={`/owner/reservations/${res.booking_reference}`}
                            >
                                <Eye className="mr-1.5 size-4" /> Details
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <Head title="Check-ins & Check-outs · Front Desk" />

            <OwnerSectionTabs
                items={OWNER_BOOKINGS_TABS}
                ariaLabel="Bookings and front desk navigation"
            />

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <PageHeader
                    eyebrow="Front Desk Operations"
                    title="Check-ins & Check-outs"
                    description="Daily guest arrivals, scheduled departures, room key handover, and in-house stay management."
                />

                {/* Filters toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Date filter */}
                    <div className="flex items-center gap-1.5">
                        <Label
                            htmlFor="date-filter"
                            className="text-xs text-tijum-plum-muted dark:text-muted-foreground"
                        >
                            Date:
                        </Label>
                        <Input
                            id="date-filter"
                            type="date"
                            value={filters.date}
                            onChange={(e) =>
                                updateFilter('date', e.target.value)
                            }
                            className="h-10 w-[150px] text-xs dark:[color-scheme:dark]"
                        />
                    </div>

                    {/* Property filter */}
                    <Select
                        value={
                            filters.property_id
                                ? String(filters.property_id)
                                : 'all'
                        }
                        onValueChange={(v) => updateFilter('property_id', v)}
                    >
                        <SelectTrigger size="sm" className="w-[180px] text-xs">
                            <SelectValue placeholder="All Properties" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Properties</SelectItem>
                            {properties.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {status && (
                <Alert variant="success">
                    <CheckCircle2 className="size-4" />
                    <AlertTitle>Operation updated</AlertTitle>
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <Card
                    onClick={() => setSelectedTab('arrivals')}
                    className={`cursor-pointer border-tijum-surface/80 transition-all hover:border-tijum-coral hover:shadow-md dark:border-border ${
                        selectedTab === 'arrivals'
                            ? 'border-tijum-coral ring-2 ring-tijum-coral/25 dark:border-tijum-coral'
                            : ''
                    }`}
                >
                    <CardHeader className="p-4 pb-1">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs font-medium">
                                Today&apos;s Arrivals
                            </CardDescription>
                            <ArrowDownLeft className="size-4 text-tijum-coral" />
                        </div>
                        <CardTitle className="font-heading text-2xl font-bold tabular-nums text-tijum-coral">
                            {stats.arrivals_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Expected check-ins
                        </span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setSelectedTab('departures')}
                    className={`cursor-pointer border-tijum-surface/80 transition-all hover:border-tijum-coral hover:shadow-md dark:border-border ${
                        selectedTab === 'departures'
                            ? 'border-tijum-coral ring-2 ring-tijum-coral/25 dark:border-tijum-coral'
                            : ''
                    }`}
                >
                    <CardHeader className="p-4 pb-1">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs font-medium">
                                Today&apos;s Departures
                            </CardDescription>
                            <ArrowUpRight className="size-4 text-tijum-coral" />
                        </div>
                        <CardTitle className="font-heading text-2xl font-bold tabular-nums text-tijum-coral">
                            {stats.departures_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Expected check-outs
                        </span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setSelectedTab('in_house')}
                    className={`cursor-pointer border-tijum-surface/80 transition-all hover:border-tijum-plum hover:shadow-md dark:border-border dark:hover:border-tijum-peach ${
                        selectedTab === 'in_house'
                            ? 'border-tijum-plum ring-2 ring-tijum-plum/20 dark:border-tijum-peach dark:ring-tijum-peach/25'
                            : ''
                    }`}
                >
                    <CardHeader className="p-4 pb-1">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs font-medium">
                                Currently In-House
                            </CardDescription>
                            <Home className="size-4 text-tijum-coral" />
                        </div>
                        <CardTitle className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {stats.in_house_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Active staying guests
                        </span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setSelectedTab('upcoming')}
                    className={`cursor-pointer border-tijum-surface/80 transition-all hover:border-tijum-coral hover:shadow-md dark:border-border ${
                        selectedTab === 'upcoming'
                            ? 'border-tijum-coral ring-2 ring-tijum-coral/25 dark:border-tijum-coral'
                            : ''
                    }`}
                >
                    <CardHeader className="p-4 pb-1">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs font-medium">
                                Upcoming (7 Days)
                            </CardDescription>
                            <CalendarCheck className="size-4 text-tijum-coral" />
                        </div>
                        <CardTitle className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {stats.upcoming_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Next 7 days arrivals
                        </span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => setSelectedTab('history')}
                    className={`cursor-pointer border-tijum-surface/80 transition-all hover:border-tijum-coral hover:shadow-md dark:border-border ${
                        selectedTab === 'history'
                            ? 'border-tijum-coral ring-2 ring-tijum-coral/25 dark:border-tijum-coral'
                            : ''
                    }`}
                >
                    <CardHeader className="p-4 pb-1">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs font-medium">
                                Checked-Out Guests
                            </CardDescription>
                            <DoorClosed className="size-4 text-tijum-coral" />
                        </div>
                        <CardTitle className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {stats.checked_out_count ?? history.length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Completed stays &amp; records
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* Unallocated alert banner if any */}
            {stats.unallocated_count > 0 && (
                <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-200">
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle>
                        {stats.unallocated_count} Reservation
                        {stats.unallocated_count === 1 ? '' : 's'} without
                        Assigned Rooms
                    </AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                        <span>
                            Assign physical room numbers prior to guest arrival
                            to ensure a smooth check-in experience.
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="ml-4"
                        >
                            <Link href="/owner/reservations">
                                View Reservations
                            </Link>
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Tabs */}
            <Tabs
                value={selectedTab}
                onValueChange={setSelectedTab}
                className="space-y-4"
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <TabsList variant="pill">
                        <TabsTrigger value="arrivals" className="gap-2">
                            <LogIn className="size-4" />
                            <span>Arrivals ({stats.arrivals_count})</span>
                        </TabsTrigger>
                        <TabsTrigger value="departures" className="gap-2">
                            <LogOut className="size-4" />
                            <span>Departures ({stats.departures_count})</span>
                        </TabsTrigger>
                        <TabsTrigger value="in_house" className="gap-2">
                            <Home className="size-4" />
                            <span>In-House ({stats.in_house_count})</span>
                        </TabsTrigger>
                        <TabsTrigger value="upcoming" className="gap-2">
                            <Calendar className="size-4" />
                            <span>Upcoming ({stats.upcoming_count})</span>
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <DoorClosed className="size-4" />
                            <span>
                                Checked-Out Guests (
                                {stats.checked_out_count ?? history.length})
                            </span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Search bar */}
                    <form
                        onSubmit={handleSearch}
                        className="relative flex items-center"
                    >
                        <Search className="pointer-events-none absolute left-3 size-3.5 text-tijum-plum-muted dark:text-muted-foreground" />
                        <Input
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Guest name, mobile, booking #..."
                            className="h-10 w-64 pl-8 text-xs"
                        />
                    </form>
                </div>

                <TabsContent value="arrivals" className="space-y-3">
                    {arrivals.length === 0 ? (
                        <Card className="border-dashed py-10 text-center">
                            <CardContent className="space-y-2">
                                <UserCheck className="mx-auto size-8 text-tijum-plum-muted dark:text-muted-foreground" />
                                <h4 className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    No pending arrivals for {filters.date}
                                </h4>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    All guests scheduled for today have checked
                                    in or no bookings are scheduled.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        renderPaginatedList(arrivals, 'arrival', 'arrival(s)')
                    )}
                </TabsContent>

                <TabsContent value="departures" className="space-y-3">
                    {departures.length === 0 ? (
                        <Card className="border-dashed py-10 text-center">
                            <CardContent className="space-y-2">
                                <DoorOpen className="mx-auto size-8 text-tijum-plum-muted dark:text-muted-foreground" />
                                <h4 className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    No pending departures for {filters.date}
                                </h4>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    No in-house guests are scheduled to check
                                    out on this date.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        renderPaginatedList(
                            departures,
                            'departure',
                            'departure(s)',
                        )
                    )}
                </TabsContent>

                <TabsContent value="in_house" className="space-y-3">
                    {inHouse.length === 0 ? (
                        <Card className="border-dashed py-10 text-center">
                            <CardContent className="space-y-2">
                                <Home className="mx-auto size-8 text-tijum-plum-muted" />
                                <h4 className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    No in-house guests currently
                                </h4>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Guests will appear here as soon as they are
                                    marked as checked in.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        renderPaginatedList(
                            inHouse,
                            'in_house',
                            'in-house stay(s)',
                        )
                    )}
                </TabsContent>

                <TabsContent value="upcoming" className="space-y-3">
                    {upcoming.length === 0 ? (
                        <Card className="border-dashed py-10 text-center">
                            <CardContent className="space-y-2">
                                <Calendar className="mx-auto size-8 text-tijum-plum-muted dark:text-muted-foreground" />
                                <h4 className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    No upcoming arrivals in the next 7 days
                                </h4>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    New confirmed bookings will automatically
                                    populate here.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        renderPaginatedList(
                            upcoming,
                            'upcoming',
                            'upcoming stay(s)',
                        )
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-3">
                    {history.length === 0 ? (
                        <Card className="border-dashed py-10 text-center">
                            <CardContent className="space-y-2">
                                <Clock className="mx-auto size-8 text-tijum-plum-muted dark:text-muted-foreground" />
                                <h4 className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    No check-out logs yet
                                </h4>
                                <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                    Departed guests and timestamps will appear
                                    here.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        renderPaginatedList(history, 'history', 'log(s)')
                    )}
                </TabsContent>
            </Tabs>

            {/* Check-in Modal Dialog */}
            <Dialog
                open={Boolean(checkInModalRes)}
                onOpenChange={(open) => !open && setCheckInModalRes(null)}
            >
                <DialogContent className="max-w-md">
                    {checkInModalRes && (
                        <form onSubmit={submitCheckIn}>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <LogIn className="size-5 text-emerald-600" />
                                    Check In: {checkInModalRes.guest_name}
                                </DialogTitle>
                                <DialogDescription>
                                    Verify guest identification and hand over
                                    keys for booking #
                                    {checkInModalRes.booking_reference}.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-1 rounded-xl border border-tijum-surface bg-tijum-cream/35 p-3 text-xs dark:border-border dark:bg-muted/45">
                                    <p>
                                        <strong>Property:</strong>{' '}
                                        {checkInModalRes.property_name}
                                    </p>
                                    <p>
                                        <strong>Room:</strong>{' '}
                                        {checkInModalRes.room_type_name}{' '}
                                        {checkInModalRes.allocated_rooms
                                            .length > 0 &&
                                            `(${checkInModalRes.allocated_rooms.map((r) => r.room_number).join(', ')})`}
                                    </p>
                                    <p>
                                        <strong>Dates:</strong>{' '}
                                        {checkInModalRes.check_in_date} to{' '}
                                        {checkInModalRes.checkout_date} (
                                        {checkInModalRes.stay_nights} nights)
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="id_check"
                                            checked={
                                                checkInForm.data.id_verified
                                            }
                                            onCheckedChange={(c) =>
                                                checkInForm.setData(
                                                    'id_verified',
                                                    Boolean(c),
                                                )
                                            }
                                        />
                                        <Label
                                            htmlFor="id_check"
                                            className="cursor-pointer text-xs font-medium"
                                        >
                                            Government photo ID verified
                                            (Aadhaar / Passport / DL)
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="key_check"
                                            checked={
                                                checkInForm.data.key_issued
                                            }
                                            onCheckedChange={(c) =>
                                                checkInForm.setData(
                                                    'key_issued',
                                                    Boolean(c),
                                                )
                                            }
                                        />
                                        <Label
                                            htmlFor="key_check"
                                            className="cursor-pointer text-xs font-medium"
                                        >
                                            Room key / access card handed to
                                            guest
                                        </Label>
                                    </div>

                                    <div className="space-y-1">
                                        <Label
                                            htmlFor="checkin_notes"
                                            className="text-xs"
                                        >
                                            Check-in Notes (Optional)
                                        </Label>
                                        <Textarea
                                            id="checkin_notes"
                                            rows={2}
                                            placeholder="e.g. Guest vehicle DL01AB1234, early arrival baggage placed in Room 102"
                                            value={checkInForm.data.notes}
                                            onChange={(e) =>
                                                checkInForm.setData(
                                                    'notes',
                                                    e.target.value,
                                                )
                                            }
                                            className="text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCheckInModalRes(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={checkInForm.processing}
                                    className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                                >
                                    {checkInForm.processing
                                        ? 'Processing...'
                                        : 'Confirm Guest Check-In'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Check-out Modal Dialog */}
            <Dialog
                open={Boolean(checkOutModalRes)}
                onOpenChange={(open) => !open && setCheckOutModalRes(null)}
            >
                <DialogContent className="max-w-md">
                    {checkOutModalRes && (
                        <form onSubmit={submitCheckOut}>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <LogOut className="size-5 text-tijum-coral" />
                                    Check Out: {checkOutModalRes.guest_name}
                                </DialogTitle>
                                <DialogDescription>
                                    Confirm room inspection and key return for
                                    booking #
                                    {checkOutModalRes.booking_reference}.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-1 rounded-xl border border-tijum-surface bg-tijum-cream/35 p-3 text-xs dark:border-border dark:bg-muted/45">
                                    <p>
                                        <strong>Property:</strong>{' '}
                                        {checkOutModalRes.property_name}
                                    </p>
                                    <p>
                                        <strong>Room:</strong>{' '}
                                        {checkOutModalRes.room_type_name}{' '}
                                        {checkOutModalRes.allocated_rooms
                                            .length > 0 &&
                                            `(${checkOutModalRes.allocated_rooms.map((r) => r.room_number).join(', ')})`}
                                    </p>
                                    <p>
                                        <strong>Total Stay:</strong>{' '}
                                        {checkOutModalRes.stay_nights} night
                                        {checkOutModalRes.stay_nights === 1
                                            ? ''
                                            : 's'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="key_return_check"
                                            checked={
                                                checkOutForm.data.key_returned
                                            }
                                            onCheckedChange={(c) =>
                                                checkOutForm.setData(
                                                    'key_returned',
                                                    Boolean(c),
                                                )
                                            }
                                        />
                                        <Label
                                            htmlFor="key_return_check"
                                            className="cursor-pointer text-xs font-medium"
                                        >
                                            Room key returned by guest
                                        </Label>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="room_inspect_check"
                                            checked={
                                                checkOutForm.data.room_inspected
                                            }
                                            onCheckedChange={(c) =>
                                                checkOutForm.setData(
                                                    'room_inspected',
                                                    Boolean(c),
                                                )
                                            }
                                        />
                                        <Label
                                            htmlFor="room_inspect_check"
                                            className="cursor-pointer text-xs font-medium"
                                        >
                                            Room inspected (no missing amenities
                                            or damage)
                                        </Label>
                                    </div>

                                    <div className="space-y-1">
                                        <Label
                                            htmlFor="checkout_notes"
                                            className="text-xs"
                                        >
                                            Departure Notes (Optional)
                                        </Label>
                                        <Textarea
                                            id="checkout_notes"
                                            rows={2}
                                            placeholder="e.g. Excellent guest, room left clean, keys placed in reception drop"
                                            value={checkOutForm.data.notes}
                                            onChange={(e) =>
                                                checkOutForm.setData(
                                                    'notes',
                                                    e.target.value,
                                                )
                                            }
                                            className="text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCheckOutModalRes(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={checkOutForm.processing}
                                    className="bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
                                >
                                    {checkOutForm.processing
                                        ? 'Processing...'
                                        : 'Complete Check-Out'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
