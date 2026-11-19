import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    ArrowRightLeft,
    ArrowUpDown,
    Building2,
    CalendarCheck,
    CalendarClock,
    CalendarDays,
    DoorClosed,
    DoorOpen,
    Eye,
    History,
    IndianRupee,
    KeyRound,
    LayoutGrid,
    List,
    Mail,
    Phone,
    RotateCcw,
    Search,
    Sparkles,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import {
    OWNER_BOOKINGS_TABS,
    OwnerSectionTabs,
} from '@/components/owner/owner-section-tabs';
import { ReservationSummaryCard } from '@/components/reservations/reservation-summary-card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useInitials } from '@/hooks/use-initials';
import {
    formatReservationDate,
    formatReservationDateShort,
    formatReservationDateTimeShort,
    formatReservationMoney,
    formatReservationMoneyCompact,
    getRoomTrailSummary,
    getUnifiedStayLifecycle,
} from '@/lib/reservation-format';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes/owner';
import { index, show } from '@/routes/owner/reservations';
import type {
    ReservationListPayload,
    ReservationPropertyOption,
    ReservationSummary,
} from '@/types';

type StayStage =
    | 'all'
    | 'needs_room'
    | 'awaiting_arrival'
    | 'checked_in'
    | 'checked_out'
    | 'awaiting_payment'
    | 'cancelled';

type SortOption = 'newest' | 'check_in_asc' | 'check_in_desc' | 'amount_desc';

type OwnerReservationIndexProps = {
    reservations: ReservationListPayload;
    filters: {
        status?: string | null;
        stay_stage?: string | null;
        search?: string | null;
        property_id?: number | null;
        from?: string | null;
        to?: string | null;
        sort?: string | null;
    };
    stageCounts?: {
        all: number;
        needs_room: number;
        awaiting_arrival: number;
        checked_in: number;
        checked_out: number;
        awaiting_payment: number;
        cancelled: number;
    };
    metrics?: {
        confirmed_revenue_minor: number;
        currency_code: string;
    };
    properties: ReservationPropertyOption[];
};

function formatPolicyLabel(value?: string | null): string {
    if (!value) return '';
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export default function OwnerReservationIndex({
    reservations,
    filters,
    stageCounts = {
        all: reservations.meta.total,
        needs_room: 0,
        awaiting_arrival: 0,
        checked_in: 0,
        checked_out: 0,
        awaiting_payment: 0,
        cancelled: 0,
    },
    metrics = {
        confirmed_revenue_minor: 0,
        currency_code: 'INR',
    },
    properties,
}: OwnerReservationIndexProps) {
    const getInitials = useInitials();
    const stayStage: StayStage = (filters.stay_stage as StayStage) || 'all';
    const propertyId = filters.property_id
        ? String(filters.property_id)
        : 'all';
    const from = filters.from ?? '';
    const to = filters.to ?? '';
    const sort: SortOption = (filters.sort as SortOption) || 'newest';

    const [searchText, setSearchText] = useState(filters.search ?? '');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [selectedRecord, setSelectedRecord] =
        useState<ReservationSummary | null>(null);

    useEffect(() => {
        setSearchText(filters.search ?? '');
    }, [filters.search]);

    const buildQuery = (
        page = 1,
        overrides: {
            stayStage?: StayStage;
            search?: string;
            propertyId?: string;
            from?: string;
            to?: string;
            sort?: SortOption;
        } = {},
    ) => {
        const nextStage = overrides.stayStage ?? stayStage;
        const nextSearch = (overrides.search ?? searchText).trim();
        const nextProperty = overrides.propertyId ?? propertyId;
        const nextFrom = overrides.from ?? from;
        const nextTo = overrides.to ?? to;
        const nextSort = overrides.sort ?? sort;

        return {
            stay_stage: nextStage === 'all' ? undefined : nextStage,
            search: nextSearch || undefined,
            property_id: nextProperty === 'all' ? undefined : nextProperty,
            from: nextFrom || undefined,
            to: nextTo || undefined,
            sort: nextSort === 'newest' ? undefined : nextSort,
            page: page > 1 ? page : undefined,
        };
    };

    const navigateWithFilters = (
        overrides: {
            stayStage?: StayStage;
            search?: string;
            propertyId?: string;
            from?: string;
            to?: string;
            sort?: SortOption;
        } = {},
        page = 1,
    ) => {
        router.get(index().url, buildQuery(page, overrides), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const selectStage = (nextStage: StayStage) => {
        navigateWithFilters({ stayStage: nextStage }, 1);
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        navigateWithFilters({ search: searchText }, 1);
    };

    const clearSearch = () => {
        setSearchText('');
        navigateWithFilters({ search: '' }, 1);
    };

    const hasActiveFilters =
        stayStage !== 'all' ||
        searchText.trim() !== '' ||
        propertyId !== 'all' ||
        from !== '' ||
        to !== '' ||
        sort !== 'newest';

    const resetAllFilters = () => {
        setSearchText('');
        router.get(
            index().url,
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const stageTabs: Array<{
        key: StayStage;
        label: string;
        count: number;
        dotClass?: string;
        alertHighlight?: boolean;
    }> = [
        { key: 'all', label: 'All', count: stageCounts.all },
        ...(stageCounts.needs_room > 0 || stayStage === 'needs_room'
            ? [
                  {
                      key: 'needs_room' as const,
                      label: 'Needs Room',
                      count: stageCounts.needs_room,
                      dotClass: 'bg-orange-500',
                      alertHighlight: stageCounts.needs_room > 0,
                  },
              ]
            : []),
        {
            key: 'awaiting_arrival',
            label: 'Awaiting Check-In',
            count: stageCounts.awaiting_arrival,
            dotClass: 'bg-sky-500',
        },
        {
            key: 'checked_in',
            label: 'In-House',
            count: stageCounts.checked_in,
            dotClass: 'bg-emerald-500',
        },
        {
            key: 'checked_out',
            label: 'Checked-Out',
            count: stageCounts.checked_out,
            dotClass: 'bg-indigo-500',
        },
        {
            key: 'awaiting_payment',
            label: 'Unpaid',
            count: stageCounts.awaiting_payment,
            dotClass: 'bg-amber-500',
        },
        {
            key: 'cancelled',
            label: 'Cancelled',
            count: stageCounts.cancelled,
            dotClass: 'bg-rose-500',
        },
    ];

    return (
        <div className="space-y-6">
            <Head title="Reservations & Customer Records · Partner Portal" />

            <OwnerSectionTabs
                items={OWNER_BOOKINGS_TABS}
                ariaLabel="Bookings and front desk navigation"
            />

            <PageHeader
                eyebrow="Bookings & Guest Directory"
                title="Reservations & Customer Records"
                description="Track guest contacts, room allocations, active stays, and completed check-out records across your properties."
                badges={
                    <Badge variant="outline" className="tabular-nums">
                        {reservations.meta.total}{' '}
                        {reservations.meta.total === 1 ? 'record' : 'records'}
                    </Badge>
                }
                actions={
                    <Button asChild variant="outline" size="sm">
                        <Link href="/owner/front-desk">
                            <DoorOpen className="size-4" aria-hidden="true" />
                            <span>Today&apos;s Front Desk</span>
                        </Link>
                    </Button>
                }
            />

            {/* 4 Interactive KPI Cards with Distinct Semantic Colors */}
            <section
                aria-label="Reservation stage summary"
                className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4"
            >
                <button
                    type="button"
                    onClick={() => selectStage('awaiting_arrival')}
                    className={cn(
                        'group flex cursor-pointer flex-col justify-between rounded-2xl border border-l-4 border-tijum-surface/85 border-l-sky-500 bg-card p-4 text-left shadow-2xs transition-all hover:border-sky-300 hover:shadow-md dark:border-border dark:border-l-sky-500',
                        stayStage === 'awaiting_arrival' &&
                            'ring-2 ring-sky-400/40',
                    )}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-heading text-xs font-semibold text-tijum-plum-muted dark:text-muted-foreground">
                            Awaiting Check-In
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
                            <CalendarCheck className="size-4" />
                        </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {stageCounts.awaiting_arrival}
                        </span>
                        {stageCounts.needs_room > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-900 dark:bg-orange-950/70 dark:text-orange-200">
                                <AlertTriangle className="size-3" />
                                {stageCounts.needs_room} need room
                            </span>
                        ) : (
                            <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
                                All rooms assigned
                            </span>
                        )}
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => selectStage('checked_in')}
                    className={cn(
                        'group flex cursor-pointer flex-col justify-between rounded-2xl border border-l-4 border-tijum-surface/85 border-l-emerald-500 bg-card p-4 text-left shadow-2xs transition-all hover:border-emerald-300 hover:shadow-md dark:border-border dark:border-l-emerald-500',
                        stayStage === 'checked_in' &&
                            'ring-2 ring-emerald-400/40',
                    )}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-heading text-xs font-semibold text-tijum-plum-muted dark:text-muted-foreground">
                            In-House Guests
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <DoorOpen className="size-4" />
                        </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {stageCounts.checked_in}
                        </span>
                        <span className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                            Currently staying
                        </span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => selectStage('checked_out')}
                    className={cn(
                        'group flex cursor-pointer flex-col justify-between rounded-2xl border border-l-4 border-tijum-surface/85 border-l-indigo-500 bg-card p-4 text-left shadow-2xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-border dark:border-l-indigo-500',
                        stayStage === 'checked_out' &&
                            'ring-2 ring-indigo-400/40',
                    )}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-heading text-xs font-semibold text-tijum-plum-muted dark:text-muted-foreground">
                            Checked-Out Customers
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                            <DoorClosed className="size-4" />
                        </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {stageCounts.checked_out}
                        </span>
                        <span className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                            Completed stay records
                        </span>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => selectStage('all')}
                    className={cn(
                        'group flex cursor-pointer flex-col justify-between rounded-2xl border border-l-4 border-tijum-surface/85 border-l-tijum-coral bg-card p-4 text-left shadow-2xs transition-all hover:border-tijum-coral/50 hover:shadow-md dark:border-border dark:border-l-tijum-coral',
                        stayStage === 'all' && 'ring-2 ring-tijum-coral/30',
                    )}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-heading text-xs font-semibold text-tijum-plum-muted dark:text-muted-foreground">
                            Confirmed Volume
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-xl bg-tijum-cream text-tijum-coral dark:bg-tijum-coral/15">
                            <IndianRupee className="size-4" />
                        </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="font-heading text-2xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {formatReservationMoneyCompact(
                                metrics.confirmed_revenue_minor,
                                metrics.currency_code,
                            )}
                        </span>
                        <span className="text-[11px] tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                            {stageCounts.all} total · {stageCounts.cancelled}{' '}
                            cancelled
                        </span>
                    </div>
                </button>
            </section>

            {/* Unallocated Rooms Action Strip */}
            {stageCounts.needs_room > 0 && stayStage !== 'needs_room' && (
                <div className="flex flex-col justify-between gap-3 rounded-2xl border border-orange-300 bg-orange-50/75 px-4 py-3 text-xs text-orange-950 sm:flex-row sm:items-center dark:border-orange-500/40 dark:bg-orange-950/30 dark:text-orange-200">
                    <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white">
                            <KeyRound className="size-3.5" />
                        </span>
                        <p>
                            <strong className="font-heading font-bold">
                                {stageCounts.needs_room} confirmed{' '}
                                {stageCounts.needs_room === 1
                                    ? 'booking needs'
                                    : 'bookings need'}{' '}
                                physical room assignment
                            </strong>{' '}
                            before guest check-in can begin.
                        </p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => selectStage('needs_room')}
                        className="shrink-0 border-orange-400 bg-white text-orange-900 hover:bg-orange-600 hover:text-white dark:border-orange-500/50 dark:bg-orange-950/60 dark:text-orange-100"
                    >
                        View Unallocated ({stageCounts.needs_room})
                    </Button>
                </div>
            )}

            {/* Unified Stage Switcher + Command Filter Bar + Records Container */}
            <Card className="overflow-hidden border-tijum-surface/85 py-0 shadow-tijum-card dark:border-border">
                {/* Row 1: Unified Stage Pills + View Mode Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tijum-surface/75 bg-tijum-cream/35 px-4 py-3 dark:border-border dark:bg-muted/30">
                    <div
                        role="tablist"
                        aria-label="Filter bookings by stay lifecycle"
                        className="flex flex-wrap items-center gap-1.5"
                    >
                        {stageTabs.map((tab) => {
                            const isActive = stayStage === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => selectStage(tab.key)}
                                    className={cn(
                                        'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 font-heading text-xs font-semibold transition-all',
                                        isActive
                                            ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                            : tab.alertHighlight
                                              ? 'border border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-950/50 dark:text-orange-200'
                                              : 'bg-background/70 text-tijum-plum-muted hover:bg-background hover:text-tijum-plum dark:bg-background/40 dark:text-muted-foreground dark:hover:text-foreground',
                                    )}
                                >
                                    {tab.dotClass && (
                                        <span
                                            className={cn(
                                                'size-2 rounded-full',
                                                isActive
                                                    ? 'bg-white'
                                                    : tab.dotClass,
                                            )}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>{tab.label}</span>
                                    <span
                                        className={cn(
                                            'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-tijum-surface/80 text-tijum-plum dark:bg-muted dark:text-foreground',
                                        )}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Desktop View Switcher (Table / Cards) */}
                    <div
                        className="hidden items-center gap-1 rounded-xl border border-tijum-surface bg-background p-0.5 lg:inline-flex dark:border-border"
                        role="group"
                        aria-label="Layout view mode"
                    >
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            aria-pressed={viewMode === 'table'}
                            className={cn(
                                'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                                viewMode === 'table'
                                    ? 'bg-tijum-plum text-tijum-cream dark:bg-tijum-coral dark:text-white'
                                    : 'text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground',
                            )}
                        >
                            <List className="size-3.5" aria-hidden="true" />
                            <span>Table</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            aria-pressed={viewMode === 'cards'}
                            className={cn(
                                'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                                viewMode === 'cards'
                                    ? 'bg-tijum-plum text-tijum-cream dark:bg-tijum-coral dark:text-white'
                                    : 'text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground',
                            )}
                        >
                            <LayoutGrid
                                className="size-3.5"
                                aria-hidden="true"
                            />
                            <span>Cards</span>
                        </button>
                    </div>
                </div>

                {/* Row 2: Compact Instant Filter Bar */}
                <div className="border-b border-tijum-surface/75 bg-card px-4 py-3 dark:border-border">
                    <form
                        onSubmit={handleSearchSubmit}
                        className="flex flex-col gap-2.5 lg:flex-row lg:items-center"
                    >
                        {/* Search Box */}
                        <div className="relative min-w-0 flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                id="owner-reservation-search"
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                placeholder="Search guest name, phone, email, room #, or booking ref..."
                                className="h-9 pr-16 pl-9 text-xs"
                            />
                            {searchText && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    aria-label="Clear search"
                                    className="absolute top-1/2 right-12 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded-md bg-tijum-cream px-2 py-1 text-[11px] font-semibold text-tijum-plum transition-colors hover:bg-tijum-coral hover:text-white dark:bg-muted dark:text-foreground dark:hover:bg-tijum-coral"
                            >
                                Find
                            </button>
                        </div>

                        {/* Property Filter (auto-applies on change) */}
                        <div className="flex flex-wrap items-center gap-2">
                            {properties.length > 0 && (
                                <Select
                                    value={propertyId}
                                    onValueChange={(nextProp) => {
                                        navigateWithFilters(
                                            { propertyId: nextProp },
                                            1,
                                        );
                                    }}
                                >
                                    <SelectTrigger
                                        aria-label="Filter by property"
                                        className="h-9 w-full text-xs sm:w-[175px]"
                                    >
                                        <Building2 className="mr-1.5 size-3.5 shrink-0 text-tijum-coral" />
                                        <SelectValue placeholder="All properties" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All properties
                                        </SelectItem>
                                        {properties.map((property) => (
                                            <SelectItem
                                                key={property.id}
                                                value={String(property.id)}
                                            >
                                                {property.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Check-In Date Range (auto-applies on change) */}
                            <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-0.5">
                                <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
                                <input
                                    type="date"
                                    aria-label="Check-in from date"
                                    value={from}
                                    onChange={(e) => {
                                        const nextFrom = e.target.value;
                                        const adjustedTo =
                                            to && nextFrom && to < nextFrom
                                                ? nextFrom
                                                : to;
                                        navigateWithFilters(
                                            {
                                                from: nextFrom,
                                                to: adjustedTo,
                                            },
                                            1,
                                        );
                                    }}
                                    className="h-7.5 w-[114px] bg-transparent text-xs text-foreground outline-none dark:[color-scheme:dark]"
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    to
                                </span>
                                <input
                                    type="date"
                                    aria-label="Check-in to date"
                                    value={to}
                                    min={from || undefined}
                                    onChange={(e) => {
                                        navigateWithFilters(
                                            { to: e.target.value },
                                            1,
                                        );
                                    }}
                                    className="h-7.5 w-[114px] bg-transparent text-xs text-foreground outline-none dark:[color-scheme:dark]"
                                />
                            </div>

                            {/* Sort Select (auto-applies on change) */}
                            <Select
                                value={sort}
                                onValueChange={(nextSort) => {
                                    navigateWithFilters(
                                        { sort: nextSort as SortOption },
                                        1,
                                    );
                                }}
                            >
                                <SelectTrigger
                                    aria-label="Sort reservations"
                                    className="h-9 w-full text-xs sm:w-[155px]"
                                >
                                    <ArrowUpDown className="mr-1.5 size-3.5 shrink-0 text-muted-foreground" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">
                                        Newest first
                                    </SelectItem>
                                    <SelectItem value="check_in_asc">
                                        Check-in: Soonest
                                    </SelectItem>
                                    <SelectItem value="check_in_desc">
                                        Check-in: Latest
                                    </SelectItem>
                                    <SelectItem value="amount_desc">
                                        Highest amount
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetAllFilters}
                                    className="h-9 px-2.5 text-xs text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                                >
                                    <RotateCcw className="mr-1 size-3.5" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Records Body */}
                <CardContent className="p-0">
                    {reservations.data.length === 0 ? (
                        <div className="p-8">
                            <EmptyState
                                icon={CalendarClock}
                                title="No matching reservations or customer records"
                                description={
                                    hasActiveFilters
                                        ? 'Try clearing your search, switching stay stages, or resetting date filters.'
                                        : 'Confirmed bookings, guest details, and check-out records will appear here automatically.'
                                }
                                action={
                                    hasActiveFilters ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={resetAllFilters}
                                        >
                                            <RotateCcw className="mr-1.5 size-3.5" />
                                            Clear all filters
                                        </Button>
                                    ) : undefined
                                }
                            />
                        </div>
                    ) : (
                        <>
                            {/* Desktop Operational Ledger Table */}
                            {viewMode === 'table' && (
                                <div className="hidden lg:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-[24%]">
                                                    Customer &amp; Contact
                                                </TableHead>
                                                <TableHead className="w-[20%]">
                                                    Booking &amp; Property
                                                </TableHead>
                                                <TableHead className="w-[17%]">
                                                    Stay Dates
                                                </TableHead>
                                                <TableHead className="w-[14%]">
                                                    Physical Room
                                                </TableHead>
                                                <TableHead className="w-[14%]">
                                                    Status &amp; Total
                                                </TableHead>
                                                <TableHead className="w-[11%] text-right">
                                                    Action
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reservations.data.map(
                                                (reservation) => {
                                                    const lifecycle =
                                                        getUnifiedStayLifecycle(
                                                            reservation,
                                                        );
                                                    const roomInfo =
                                                        getRoomTrailSummary(
                                                            reservation,
                                                        );
                                                    const guestName =
                                                        reservation.contact_name ||
                                                        'Guest';
                                                    const checkedInShort =
                                                        formatReservationDateTimeShort(
                                                            reservation.checked_in_at,
                                                        );
                                                    const checkedOutShort =
                                                        formatReservationDateTimeShort(
                                                            reservation.checked_out_at,
                                                        );
                                                    const detailUrl = show(
                                                        reservation.booking_reference,
                                                    ).url;

                                                    return (
                                                        <TableRow
                                                            key={
                                                                reservation.booking_reference
                                                            }
                                                            className="group"
                                                        >
                                                            {/* 1. Customer & Contact */}
                                                            <TableCell className="py-3.5 align-top">
                                                                <div className="flex items-start gap-2.5">
                                                                    <Avatar className="mt-0.5 size-8 shrink-0 border border-tijum-surface dark:border-border">
                                                                        <AvatarFallback className="bg-tijum-peach/40 font-heading text-[11px] font-bold text-tijum-plum dark:bg-tijum-coral/20 dark:text-tijum-peach">
                                                                            {getInitials(
                                                                                guestName,
                                                                            )}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="min-w-0 space-y-0.5">
                                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setSelectedRecord(
                                                                                        reservation,
                                                                                    )
                                                                                }
                                                                                className="cursor-pointer truncate font-heading text-sm font-bold text-tijum-plum transition-colors hover:text-tijum-coral dark:text-foreground"
                                                                            >
                                                                                {
                                                                                    guestName
                                                                                }
                                                                            </button>
                                                                            <span className="rounded bg-tijum-cream px-1.5 py-0.5 text-[10px] font-semibold text-tijum-plum-muted tabular-nums dark:bg-muted dark:text-muted-foreground">
                                                                                {
                                                                                    reservation.guest_count
                                                                                }
                                                                                G
                                                                                {reservation.guest_gender
                                                                                    ? ` · ${formatPolicyLabel(reservation.guest_gender)}`
                                                                                    : ''}
                                                                            </span>
                                                                        </div>
                                                                        {reservation.contact_phone && (
                                                                            <a
                                                                                href={`tel:${reservation.contact_phone}`}
                                                                                className="flex items-center gap-1 text-xs font-medium text-tijum-plum-muted transition-colors hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                                                                            >
                                                                                <Phone className="size-3 shrink-0 text-tijum-coral" />
                                                                                <span className="tabular-nums">
                                                                                    {
                                                                                        reservation.contact_phone
                                                                                    }
                                                                                </span>
                                                                            </a>
                                                                        )}
                                                                        {reservation.contact_email && (
                                                                            <a
                                                                                href={`mailto:${reservation.contact_email}`}
                                                                                className="flex items-center gap-1 truncate text-[11px] text-muted-foreground hover:text-foreground"
                                                                            >
                                                                                <Mail className="size-3 shrink-0 text-muted-foreground" />
                                                                                <span className="truncate">
                                                                                    {
                                                                                        reservation.contact_email
                                                                                    }
                                                                                </span>
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TableCell>

                                                            {/* 2. Booking & Property */}
                                                            <TableCell className="py-3.5 align-top">
                                                                <div className="min-w-0 space-y-0.5">
                                                                    <Link
                                                                        href={
                                                                            detailUrl
                                                                        }
                                                                        className="inline-block font-mono text-xs font-bold text-tijum-plum transition-colors hover:text-tijum-coral dark:text-foreground"
                                                                    >
                                                                        #
                                                                        {
                                                                            reservation.booking_reference
                                                                        }
                                                                    </Link>
                                                                    <p className="truncate text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                                        {
                                                                            reservation.property_name
                                                                        }
                                                                    </p>
                                                                    <p className="truncate text-[11px] text-muted-foreground">
                                                                        {
                                                                            reservation.room_type_name
                                                                        }{' '}
                                                                        ·{' '}
                                                                        {
                                                                            reservation.quantity
                                                                        }{' '}
                                                                        {
                                                                            reservation.quantity_basis_label
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </TableCell>

                                                            {/* 3. Stay Dates & Actual Timestamps */}
                                                            <TableCell className="py-3.5 align-top">
                                                                <div className="space-y-1 text-xs tabular-nums">
                                                                    <p className="font-semibold text-tijum-plum dark:text-foreground">
                                                                        {formatReservationDateShort(
                                                                            reservation.check_in_date,
                                                                        )}{' '}
                                                                        →{' '}
                                                                        {formatReservationDateShort(
                                                                            reservation.checkout_date,
                                                                        )}
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {
                                                                            reservation.duration_label
                                                                        }
                                                                        {reservation.early_check_in_requested && (
                                                                            <span className="ml-1.5 inline-flex items-center gap-0.5 font-medium text-amber-700 dark:text-amber-300">
                                                                                <Sparkles className="size-2.5" />
                                                                                Early
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    {checkedInShort && (
                                                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                                                            In:{' '}
                                                                            {
                                                                                checkedInShort
                                                                            }
                                                                        </p>
                                                                    )}
                                                                    {checkedOutShort && (
                                                                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                                                                            Out:{' '}
                                                                            {
                                                                                checkedOutShort
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </TableCell>

                                                            {/* 4. Physical Room & Room Changes */}
                                                            <TableCell className="py-3.5 align-top">
                                                                <div className="space-y-1">
                                                                    {roomInfo.needsRoom ? (
                                                                        <Link
                                                                            href={`${detailUrl}#room-allocation-card`}
                                                                            className="inline-flex items-center gap-1 rounded-lg border border-orange-300 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-900 transition-colors hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-950/60 dark:text-orange-200"
                                                                        >
                                                                            <AlertTriangle className="size-3 shrink-0" />
                                                                            <span>
                                                                                Assign
                                                                                (
                                                                                {
                                                                                    roomInfo.allocatedQuantity
                                                                                }
                                                                                /
                                                                                {
                                                                                    reservation.quantity
                                                                                }
                                                                                )
                                                                            </span>
                                                                        </Link>
                                                                    ) : roomInfo.primaryRoomLabel ? (
                                                                        <>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={cn(
                                                                                    'gap-1 text-[11px] font-semibold',
                                                                                    reservation.is_checked_out
                                                                                        ? 'border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-500/35 dark:bg-indigo-950/50 dark:text-indigo-200'
                                                                                        : reservation.is_checked_in
                                                                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/50 dark:text-emerald-200'
                                                                                          : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/35 dark:bg-sky-950/50 dark:text-sky-200',
                                                                                )}
                                                                            >
                                                                                <KeyRound className="size-3" />
                                                                                <span>
                                                                                    {reservation.is_checked_out
                                                                                        ? `Stayed: ${roomInfo.primaryRoomLabel}`
                                                                                        : roomInfo.primaryRoomLabel}
                                                                                </span>
                                                                            </Badge>
                                                                            {roomInfo.hadRoomChange &&
                                                                                roomInfo
                                                                                    .historyTrail
                                                                                    .length >
                                                                                    1 && (
                                                                                    <p className="flex items-center gap-1 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                                                                                        <ArrowRightLeft className="size-2.5 shrink-0" />
                                                                                        <span>
                                                                                            {roomInfo.historyTrail.join(
                                                                                                ' → ',
                                                                                            )}
                                                                                        </span>
                                                                                    </p>
                                                                                )}
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">
                                                                            —
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>

                                                            {/* 5. Unified Lifecycle Status & Total */}
                                                            <TableCell className="py-3.5 align-top">
                                                                <div className="space-y-1.5">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            'gap-1.5 text-[11px] font-semibold',
                                                                            lifecycle.badgeClass,
                                                                        )}
                                                                    >
                                                                        <span
                                                                            className={cn(
                                                                                'size-1.5 rounded-full',
                                                                                lifecycle.dotClass,
                                                                            )}
                                                                        />
                                                                        <span>
                                                                            {
                                                                                lifecycle.label
                                                                            }
                                                                        </span>
                                                                    </Badge>
                                                                    <p className="font-heading text-xs font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                                                        {formatReservationMoney(
                                                                            reservation.total_amount_minor,
                                                                            reservation.currency_code,
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </TableCell>

                                                            {/* 6. Direct Actions */}
                                                            <TableCell className="py-3.5 text-right align-top">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() =>
                                                                            setSelectedRecord(
                                                                                reservation,
                                                                            )
                                                                        }
                                                                        title="Quick-view customer record"
                                                                        aria-label={`Quick-view customer record for ${guestName}`}
                                                                        className="size-8 text-tijum-plum-muted hover:bg-tijum-cream hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-accent"
                                                                    >
                                                                        <Eye className="size-4" />
                                                                    </Button>
                                                                    {roomInfo.needsRoom ? (
                                                                        <Button
                                                                            size="sm"
                                                                            asChild
                                                                            className="h-8 px-2.5 text-xs"
                                                                        >
                                                                            <Link
                                                                                href={`${detailUrl}#room-allocation-card`}
                                                                            >
                                                                                Assign
                                                                            </Link>
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            asChild
                                                                            className="h-8 px-2.5 text-xs"
                                                                        >
                                                                            <Link
                                                                                href={
                                                                                    detailUrl
                                                                                }
                                                                            >
                                                                                Manage
                                                                            </Link>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                },
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* Card View (Always on mobile/tablet < lg, or when user selects Cards mode on desktop) */}
                            <div
                                className={cn(
                                    'grid gap-3.5 p-4',
                                    viewMode === 'table' && 'lg:hidden',
                                )}
                            >
                                {reservations.data.map((reservation) => (
                                    <ReservationSummaryCard
                                        key={reservation.booking_reference}
                                        reservation={reservation}
                                        href={
                                            show(reservation.booking_reference)
                                                .url
                                        }
                                        context="owner"
                                        onInspectCustomer={setSelectedRecord}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>

                {/* Pagination Footer Inside Unified Card */}
                {reservations.data.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/75 bg-tijum-cream/25 px-4 py-3 dark:border-border dark:bg-muted/20">
                        <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                            Showing{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {reservations.meta.from ?? 1}–
                                {reservations.meta.to ??
                                    reservations.data.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {reservations.meta.total}
                            </span>{' '}
                            {reservations.meta.total === 1
                                ? 'record'
                                : 'records'}
                        </p>
                        <Pagination
                            currentPage={reservations.meta.current_page}
                            totalPages={reservations.meta.last_page}
                            getPageHref={(page) =>
                                index({ query: buildQuery(page) }).url
                            }
                        />
                    </div>
                )}
            </Card>

            {/* Quick Customer & Stay Record Slide-Over Sheet */}
            <CustomerRecordSheet
                reservation={selectedRecord}
                onClose={() => setSelectedRecord(null)}
            />
        </div>
    );
}

function CustomerRecordSheet({
    reservation,
    onClose,
}: {
    reservation: ReservationSummary | null;
    onClose: () => void;
}) {
    const getInitials = useInitials();

    if (!reservation) {
        return <Sheet open={false} onOpenChange={() => undefined} />;
    }

    const lifecycle = getUnifiedStayLifecycle(reservation);
    const roomInfo = getRoomTrailSummary(reservation);
    const guestName = reservation.contact_name || 'Guest';
    const checkedInLabel = formatReservationDateTimeShort(
        reservation.checked_in_at,
    );
    const checkedOutLabel = formatReservationDateTimeShort(
        reservation.checked_out_at,
    );
    const detailUrl = show(reservation.booking_reference).url;
    const history = reservation.room_history ?? [];

    return (
        <Sheet open={Boolean(reservation)} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                className="w-full overflow-y-auto sm:max-w-md"
            >
                <SheetHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                    <div className="flex items-center gap-3 pr-6">
                        <Avatar className="size-11 border border-tijum-peach/70">
                            <AvatarFallback className="bg-tijum-peach/50 font-heading text-sm font-bold text-tijum-plum dark:bg-tijum-coral/20 dark:text-tijum-peach">
                                {getInitials(guestName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <SheetTitle className="truncate text-base">
                                {guestName}
                            </SheetTitle>
                            <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-mono font-semibold text-tijum-plum dark:text-foreground">
                                    #{reservation.booking_reference}
                                </span>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'gap-1 text-[10px] font-semibold',
                                        lifecycle.badgeClass,
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'size-1.5 rounded-full',
                                            lifecycle.dotClass,
                                        )}
                                    />
                                    {lifecycle.label}
                                </Badge>
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="space-y-4 px-4 py-2 text-xs">
                    {/* Direct Customer Contact */}
                    <div className="space-y-2 rounded-xl border border-tijum-surface bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/35">
                        <p className="font-heading text-[11px] font-bold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            Customer Contact &amp; Profile
                        </p>
                        <div className="space-y-1.5">
                            {reservation.contact_phone && (
                                <a
                                    href={`tel:${reservation.contact_phone}`}
                                    className="flex items-center gap-2 font-semibold text-tijum-plum hover:text-tijum-coral dark:text-foreground"
                                >
                                    <Phone className="size-3.5 text-tijum-coral" />
                                    <span className="tabular-nums">
                                        {reservation.contact_phone}
                                    </span>
                                </a>
                            )}
                            {reservation.contact_email && (
                                <a
                                    href={`mailto:${reservation.contact_email}`}
                                    className="flex items-center gap-2 text-tijum-plum-muted hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                                >
                                    <Mail className="size-3.5 text-tijum-coral" />
                                    <span className="truncate">
                                        {reservation.contact_email}
                                    </span>
                                </a>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                    <Users className="size-3 text-tijum-coral" />
                                    {reservation.guest_count} guest
                                    {reservation.guest_count === 1 ? '' : 's'}
                                </span>
                                {reservation.guest_gender && (
                                    <span>
                                        ·{' '}
                                        {formatPolicyLabel(
                                            reservation.guest_gender,
                                        )}
                                    </span>
                                )}
                                {reservation.guest_composition && (
                                    <span>
                                        ·{' '}
                                        {formatPolicyLabel(
                                            reservation.guest_composition,
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stay & Property Snapshot */}
                    <div className="space-y-2 rounded-xl border border-tijum-surface p-3.5 dark:border-border">
                        <p className="font-heading text-[11px] font-bold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            Property &amp; Stay Window
                        </p>
                        <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                            {reservation.property_name}
                        </p>
                        <p className="text-muted-foreground">
                            {reservation.room_type_name} ·{' '}
                            {reservation.quantity}{' '}
                            {reservation.quantity_basis_label}
                        </p>
                        <div className="flex items-center justify-between border-t border-tijum-surface/70 pt-2 dark:border-border">
                            <span className="inline-flex items-center gap-1.5 font-medium text-tijum-plum dark:text-foreground">
                                <CalendarDays className="size-3.5 text-tijum-coral" />
                                {formatReservationDate(
                                    reservation.check_in_date,
                                )}{' '}
                                →{' '}
                                {formatReservationDate(
                                    reservation.checkout_date,
                                )}
                            </span>
                            <span className="font-semibold text-muted-foreground">
                                {reservation.duration_label}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-tijum-surface/70 pt-2 dark:border-border">
                            <span className="text-muted-foreground">
                                Booking Total
                            </span>
                            <span className="font-heading text-sm font-bold tabular-nums text-tijum-plum dark:text-foreground">
                                {formatReservationMoney(
                                    reservation.total_amount_minor,
                                    reservation.currency_code,
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Check-In & Check-Out Log */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 dark:border-emerald-500/25 dark:bg-emerald-950/20">
                            <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                                <DoorOpen className="size-3" />
                                Check-In
                            </p>
                            <p className="mt-1 font-semibold tabular-nums text-tijum-plum dark:text-foreground">
                                {checkedInLabel ?? 'Not checked in'}
                            </p>
                            {reservation.check_in_notes && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    &ldquo;{reservation.check_in_notes}&rdquo;
                                </p>
                            )}
                        </div>
                        <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-3 dark:border-indigo-500/25 dark:bg-indigo-950/20">
                            <p className="flex items-center gap-1 text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">
                                <DoorClosed className="size-3" />
                                Check-Out
                            </p>
                            <p className="mt-1 font-semibold tabular-nums text-tijum-plum dark:text-foreground">
                                {checkedOutLabel ?? 'Not checked out'}
                            </p>
                            {reservation.checkout_notes && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    &ldquo;{reservation.checkout_notes}&rdquo;
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Complete Physical Room Stay & Change History */}
                    <div className="space-y-2 rounded-xl border border-tijum-surface p-3.5 dark:border-border">
                        <div className="flex items-center justify-between">
                            <p className="flex items-center gap-1.5 font-heading text-[11px] font-bold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                <History className="size-3.5 text-tijum-coral" />
                                Room Stay History
                            </p>
                            {roomInfo.needsRoom && (
                                <Badge className="border-orange-300 bg-orange-100 text-[10px] text-orange-900">
                                    Needs Room
                                </Badge>
                            )}
                        </div>

                        {history.length > 0 ? (
                            <ol className="space-y-1.5">
                                {history.map((entry, idx) => (
                                    <li
                                        key={`${entry.property_room_id}-${idx}`}
                                        className={cn(
                                            'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2',
                                            entry.status === 'checked_out'
                                                ? 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/30 dark:bg-indigo-950/30'
                                                : entry.status === 'changed'
                                                  ? 'border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20'
                                                  : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20',
                                        )}
                                    >
                                        <div>
                                            <p className="font-heading font-bold text-tijum-plum dark:text-foreground">
                                                Room {entry.room_number}
                                                {entry.floor_number
                                                    ? ` · Floor ${entry.floor_number}`
                                                    : ''}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {entry.status_label}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                                            {entry.allocated_quantity}{' '}
                                            {entry.allocated_quantity === 1
                                                ? 'unit'
                                                : 'units'}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-muted-foreground">
                                No physical room has been allocated yet.
                            </p>
                        )}
                    </div>
                </div>

                <SheetFooter className="border-t border-tijum-surface/80 pt-3 dark:border-border">
                    <Button asChild className="w-full">
                        <Link
                            href={
                                roomInfo.needsRoom
                                    ? `${detailUrl}#room-allocation-card`
                                    : detailUrl
                            }
                        >
                            <span>
                                {roomInfo.needsRoom
                                    ? 'Assign Physical Room'
                                    : 'Open Full Reservation Details'}
                            </span>
                            <ArrowRight className="ml-1.5 size-4" />
                        </Link>
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

OwnerReservationIndex.layout = {
    breadcrumbs: [
        { title: 'Partner Overview', href: dashboard() },
        { title: 'Reservations & Customer Records', href: index() },
    ],
};
