import { Head, Link, router } from '@inertiajs/react';
import {
    Ban,
    Building2,
    CheckCircle2,
    Clock,
    Filter,
    History,
    Inbox,
    Search,
    ShieldAlert,
    X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { formatIsoDate } from '@/components/owner/onboarding/status-helpers';
import {
    propertyOperationalStatusMap,
    propertyVerificationStatusMap,
} from '@/components/owner/properties/property-status-helpers';
import {
    DataTable,
    type DataTableColumn,
} from '@/components/shared/data-table';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { dashboard } from '@/routes/admin';
import {
    history as historyRoute,
    index as propertiesIndex,
    show as showRoute,
} from '@/routes/admin/properties';
import type {
    AdminPropertyQueueRow,
    CityOption,
    PropertyCategoryOption,
} from '@/types';

type AdminPropertiesIndexProps = {
    properties: {
        data: AdminPropertyQueueRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stats: {
        total: number;
        submitted: number;
        under_review: number;
        needs_information: number;
        approved: number;
        suspended: number;
    };
    filters: {
        search: string;
        verification_status: string;
        operational_status: string;
        city: string;
        category: string;
        date_from: string;
        date_to: string;
    };
    cities: CityOption[];
    categories: PropertyCategoryOption[];
    verificationStatuses: { value: string; label: string }[];
    operationalStatuses: { value: string; label: string }[];
};

export default function AdminPropertiesIndex({
    properties,
    stats,
    filters,
    cities,
    categories,
    verificationStatuses,
    operationalStatuses,
}: AdminPropertiesIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [verificationStatus, setVerificationStatus] = useState(
        filters.verification_status,
    );
    const [operationalStatus, setOperationalStatus] = useState(
        filters.operational_status,
    );
    const [city, setCity] = useState(filters.city);
    const [category, setCategory] = useState(filters.category);
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);

    const hasActiveFilters = Boolean(
        search ||
        verificationStatus ||
        operationalStatus ||
        city ||
        category ||
        dateFrom ||
        dateTo,
    );

    const buildQuery = (overrides: Record<string, string | number> = {}) => {
        const raw: Record<string, string | number> = {
            search,
            verification_status: verificationStatus,
            operational_status: operationalStatus,
            city,
            category,
            date_from: dateFrom,
            date_to: dateTo,
            ...overrides,
        };

        return Object.fromEntries(
            Object.entries(raw).filter(
                ([, value]) => value !== '' && value !== 'all',
            ),
        );
    };

    const applyFilters = (overrides: Record<string, string | number> = {}) => {
        router.get(
            propertiesIndex.url({ query: buildQuery(overrides) }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        applyFilters({ page: 1 });
    };

    const clearFilters = () => {
        setSearch('');
        setVerificationStatus('');
        setOperationalStatus('');
        setCity('');
        setCategory('');
        setDateFrom('');
        setDateTo('');
        router.get(propertiesIndex.url(), {}, { preserveState: true });
    };

    const quickVerificationPills = [
        { value: '', label: 'All', count: stats.total },
        { value: 'submitted', label: 'Submitted', count: stats.submitted },
        {
            value: 'under_review',
            label: 'Under Review',
            count: stats.under_review,
        },
        {
            value: 'needs_information',
            label: 'Needs Info',
            count: stats.needs_information,
        },
        { value: 'approved', label: 'Verified Live', count: stats.approved },
    ];

    const columns: DataTableColumn<AdminPropertyQueueRow>[] = [
        {
            key: 'property',
            header: 'Property',
            isRowHeader: true,
            render: (row) => (
                <div className="space-y-1">
                    <Link
                        href={showRoute.url(row.id)}
                        className="font-heading font-semibold text-tijum-plum underline-offset-4 hover:text-tijum-coral hover:underline dark:text-foreground dark:hover:text-tijum-coral"
                    >
                        {row.name}
                    </Link>
                    <p className="text-xs font-normal text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {row.property_reference} · {row.category_name} ·{' '}
                        {row.locality}, {row.city_name}
                    </p>
                </div>
            ),
        },
        {
            key: 'owner',
            header: 'Partner Owner',
            render: (row) => (
                <div className="space-y-0.5">
                    <p className="font-medium text-tijum-plum dark:text-foreground">
                        {row.owner_name}
                    </p>
                    <p className="text-xs break-all text-tijum-plum-muted dark:text-muted-foreground">
                        {row.owner_email}
                    </p>
                </div>
            ),
        },
        {
            key: 'inventory',
            header: 'Configuration Summary',
            render: (row) => (
                <div className="space-y-0.5 text-xs tabular-nums">
                    <p className="font-semibold text-tijum-plum dark:text-foreground">
                        {row.room_types_count} room type
                        {row.room_types_count === 1 ? '' : 's'}
                    </p>
                    <p className="text-tijum-plum-muted dark:text-muted-foreground">
                        {row.rooms_count} physical room
                        {row.rooms_count === 1 ? '' : 's'}
                    </p>
                </div>
            ),
        },
        {
            key: 'verification',
            header: 'Verification',
            render: (row) => (
                <div className="space-y-1">
                    <StatusBadge
                        status={
                            propertyVerificationStatusMap[
                                row.verification_status
                            ] ?? 'neutral'
                        }
                        label={row.verification_status_label}
                    />
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {row.application_number && (
                            <span>
                                {row.application_number} · Rev #
                                {row.revision_number}
                            </span>
                        )}
                        {row.is_amendment && (
                            <Badge variant="outline" className="text-[10px]">
                                Amendment
                            </Badge>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'operational',
            header: 'Operational State',
            render: (row) => (
                <div className="space-y-1">
                    <StatusBadge
                        status={
                            propertyOperationalStatusMap[
                                row.operational_status
                            ] ?? 'neutral'
                        }
                        label={row.operational_status_label}
                    />
                    <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                        {row.booking_eligible
                            ? 'Booking Eligible'
                            : 'Not Bookable'}
                    </p>
                </div>
            ),
        },
        {
            key: 'reviewer',
            header: 'Reviewer & Submitted',
            render: (row) => (
                <div className="space-y-0.5 text-xs">
                    <p className="font-medium text-tijum-plum dark:text-foreground">
                        {row.assigned_reviewer_name ?? 'Unassigned'}
                    </p>
                    <p className="text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        {formatIsoDate(row.submitted_at)}
                    </p>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={historyRoute.url(row.id)}>
                            <History aria-hidden="true" />
                            <span>History</span>
                        </Link>
                    </Button>
                    <Button variant="plum" size="sm" asChild>
                        <Link href={showRoute.url(row.id)}>Review</Link>
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title="Property Verification Queue" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Marketplace Inventory & Verification"
                    title="Property Verification Queue"
                    description="Review Hostels/PG, Homestays, and Co-Living submissions, inspect room configurations, moderate uploaded property and room photos, and oversee live operational status."
                />

                <section
                    aria-label="Property verification queue metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    <StatCard
                        label="Total Properties"
                        value={stats.total}
                        icon={Building2}
                    />
                    <StatCard
                        label="Submitted"
                        value={stats.submitted}
                        icon={Inbox}
                    />
                    <StatCard
                        label="Under Review"
                        value={stats.under_review}
                        icon={Clock}
                    />
                    <StatCard
                        label="Needs Info"
                        value={stats.needs_information}
                        icon={ShieldAlert}
                    />
                    <StatCard
                        label="Verified Live"
                        value={stats.approved}
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Suspended"
                        value={stats.suspended}
                        icon={Ban}
                    />
                </section>

                <div
                    role="group"
                    aria-label="Quick verification status filters"
                    className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-card p-1.5 shadow-tijum-card dark:border-border"
                >
                    {quickVerificationPills.map((pill) => {
                        const active = verificationStatus === pill.value;
                        return (
                            <button
                                key={pill.value || 'all'}
                                type="button"
                                aria-pressed={active}
                                onClick={() => {
                                    setVerificationStatus(pill.value);
                                    applyFilters({
                                        verification_status: pill.value,
                                        page: 1,
                                    });
                                }}
                                className={cn(
                                    'inline-flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 font-heading text-xs font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                                    active
                                        ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                        : 'text-tijum-plum-muted hover:bg-tijum-cream/80 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground',
                                )}
                            >
                                <span>{pill.label}</span>
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-[11px] tabular-nums',
                                        active
                                            ? 'bg-white/15 text-white'
                                            : 'bg-tijum-cream text-tijum-plum dark:bg-muted dark:text-foreground',
                                    )}
                                >
                                    {pill.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                    <Filter
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div className="space-y-0.5">
                                    <CardTitle className="text-base">
                                        Queue Filters
                                    </CardTitle>
                                    <CardDescription>
                                        Filter property submissions by
                                        verification stage, operational status,
                                        launch city, and category.
                                    </CardDescription>
                                </div>
                            </div>
                            {hasActiveFilters && (
                                <Badge variant="peach">Filters Active</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <search aria-label="Filter properties">
                            <form
                                onSubmit={handleFilterSubmit}
                                className="min-w-0 space-y-4"
                            >
                                <fieldset className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <legend className="sr-only">
                                        Filter properties by search term,
                                        status, city, category, and submission
                                        dates
                                    </legend>

                                    <div className="min-w-0 space-y-1.5 sm:col-span-2">
                                        <Label
                                            htmlFor="admin-prop-search"
                                            className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Search Property / Owner
                                        </Label>
                                        <div className="relative">
                                            <Search
                                                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <Input
                                                id="admin-prop-search"
                                                value={search}
                                                onChange={(e) =>
                                                    setSearch(e.target.value)
                                                }
                                                placeholder="Property reference, name, locality, or owner email"
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="min-w-0 space-y-1.5">
                                        <Label
                                            htmlFor="admin-prop-ver-status"
                                            className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Verification Status
                                        </Label>
                                        <Select
                                            value={verificationStatus || 'all'}
                                            onValueChange={(value) =>
                                                setVerificationStatus(
                                                    value === 'all'
                                                        ? ''
                                                        : value,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="admin-prop-ver-status"
                                                className="w-full min-w-0"
                                            >
                                                <SelectValue placeholder="All verification states" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All verification states
                                                </SelectItem>
                                                {verificationStatuses.map(
                                                    (item) => (
                                                        <SelectItem
                                                            key={item.value}
                                                            value={item.value}
                                                        >
                                                            {item.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="min-w-0 space-y-1.5">
                                        <Label
                                            htmlFor="admin-prop-op-status"
                                            className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Operational Status
                                        </Label>
                                        <Select
                                            value={operationalStatus || 'all'}
                                            onValueChange={(value) =>
                                                setOperationalStatus(
                                                    value === 'all'
                                                        ? ''
                                                        : value,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="admin-prop-op-status"
                                                className="w-full min-w-0"
                                            >
                                                <SelectValue placeholder="All operational states" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All operational states
                                                </SelectItem>
                                                {operationalStatuses.map(
                                                    (item) => (
                                                        <SelectItem
                                                            key={item.value}
                                                            value={item.value}
                                                        >
                                                            {item.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="min-w-0 space-y-1.5">
                                        <Label
                                            htmlFor="admin-prop-city"
                                            className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            City
                                        </Label>
                                        <Select
                                            value={city || 'all'}
                                            onValueChange={(value) =>
                                                setCity(
                                                    value === 'all'
                                                        ? ''
                                                        : value,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="admin-prop-city"
                                                className="w-full min-w-0"
                                            >
                                                <SelectValue placeholder="All cities" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All cities
                                                </SelectItem>
                                                {cities.map((c) => (
                                                    <SelectItem
                                                        key={c.id}
                                                        value={c.slug}
                                                    >
                                                        {c.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="min-w-0 space-y-1.5">
                                        <Label
                                            htmlFor="admin-prop-category"
                                            className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Category
                                        </Label>
                                        <Select
                                            value={category || 'all'}
                                            onValueChange={(value) =>
                                                setCategory(
                                                    value === 'all'
                                                        ? ''
                                                        : value,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="admin-prop-category"
                                                className="w-full min-w-0"
                                            >
                                                <SelectValue placeholder="All categories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">
                                                    All categories
                                                </SelectItem>
                                                {categories.map((cat) => (
                                                    <SelectItem
                                                        key={cat.id}
                                                        value={cat.slug}
                                                    >
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="min-w-0 space-y-1.5">
                                        <Label
                                            htmlFor="admin-prop-date-from"
                                            className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Submitted From
                                        </Label>
                                        <Input
                                            id="admin-prop-date-from"
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) =>
                                                setDateFrom(e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="min-w-0 space-y-1.5">
                                        <Label
                                            htmlFor="admin-prop-date-to"
                                            className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                        >
                                            Submitted To
                                        </Label>
                                        <Input
                                            id="admin-prop-date-to"
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) =>
                                                setDateTo(e.target.value)
                                            }
                                        />
                                    </div>
                                </fieldset>

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <Button type="submit" variant="plum">
                                        <Filter aria-hidden="true" />
                                        <span>Apply Filters</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={clearFilters}
                                    >
                                        <X aria-hidden="true" />
                                        <span>Reset</span>
                                    </Button>
                                </div>
                            </form>
                        </search>
                    </CardContent>
                </Card>

                <DataTable
                    caption="Properties queued for verification or operational management"
                    title="Property Verification Queue"
                    description="Moderate partner stays, inspect room inventory, and manage operational status."
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {properties.total} total
                        </Badge>
                    }
                    columns={columns}
                    rows={properties.data}
                    getRowKey={(row) => row.id}
                    emptyTitle="No properties match your filters"
                    emptyDescription="Adjust the search query or verification filters to inspect other partner properties."
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {properties.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {properties.total}
                                </span>{' '}
                                property record(s)
                            </p>
                            <Pagination
                                currentPage={properties.current_page}
                                totalPages={properties.last_page}
                                onPageChange={(page) => applyFilters({ page })}
                            />
                        </div>
                    }
                />
            </div>
        </>
    );
}

AdminPropertiesIndex.layout = {
    breadcrumbs: [
        { title: 'Admin Dashboard', href: dashboard() },
        { title: 'Property Verification', href: propertiesIndex() },
    ],
};
