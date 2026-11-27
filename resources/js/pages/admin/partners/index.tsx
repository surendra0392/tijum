import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    FileCheck2,
    Filter,
    Inbox,
    Search,
    ShieldAlert,
    X,
    XCircle,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
    applicationStatusBadgeMap,
    formatIsoDate,
} from '@/components/owner/onboarding/status-helpers';
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
import { index as partnersIndex, show } from '@/routes/admin/partners';
import type { AdminPartnerSummaryRow, CityOption } from '@/types';

type PartnersIndexProps = {
    stats: {
        total: number;
        submitted: number;
        under_review: number;
        needs_information: number;
        approved: number;
        rejected: number;
        draft: number;
    };
    applications: {
        data: AdminPartnerSummaryRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
        status: string;
        city: string;
        entity_type: string;
        date_from: string;
        date_to: string;
        sort: string;
        direction: string;
    };
    cities: CityOption[];
    statuses: { value: string; label: string }[];
    entityTypes: { value: string; label: string }[];
    capabilities: {
        canReview: boolean;
        canAssign: boolean;
        canViewDocuments: boolean;
    };
};

export default function AdminPartnersIndex({
    stats,
    applications,
    filters,
    cities,
    statuses,
    entityTypes,
    capabilities,
}: PartnersIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [city, setCity] = useState(filters.city);
    const [entityType, setEntityType] = useState(filters.entity_type);
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);
    const [sort, setSort] = useState(
        `${filters.sort}:${filters.direction === 'asc' ? 'asc' : 'desc'}`,
    );

    const hasActiveFilters = Boolean(
        search || status || city || entityType || dateFrom || dateTo,
    );

    const buildQuery = (overrides: Record<string, string | number> = {}) => {
        const [sortField, direction] = sort.split(':');
        const raw: Record<string, string | number> = {
            search,
            status,
            city,
            entity_type: entityType,
            date_from: dateFrom,
            date_to: dateTo,
            sort: sortField || 'submitted_at',
            direction: direction || 'desc',
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
            partnersIndex.url({ query: buildQuery(overrides) }),
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
        setStatus('');
        setCity('');
        setEntityType('');
        setDateFrom('');
        setDateTo('');
        setSort('submitted_at:desc');
        router.get(partnersIndex.url(), {}, { preserveState: true });
    };

    const quickStatusPills = [
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
        { value: 'approved', label: 'Approved', count: stats.approved },
        { value: 'rejected', label: 'Rejected', count: stats.rejected },
    ];

    const columns: DataTableColumn<AdminPartnerSummaryRow>[] = [
        {
            key: 'application_number',
            header: 'Application Ref',
            isRowHeader: true,
            render: (row) => (
                <div className="space-y-0.5">
                    <Link
                        href={show.url(row.id)}
                        className="font-heading font-semibold text-tijum-plum tabular-nums underline-offset-4 hover:text-tijum-coral hover:underline dark:text-foreground dark:hover:text-tijum-coral"
                    >
                        {row.application_number}
                    </Link>
                    <span className="block text-xs font-normal text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                        Rev #{row.revision_number}
                    </span>
                </div>
            ),
        },
        {
            key: 'business_name',
            header: 'Business / Entity',
            render: (row) => (
                <div className="space-y-0.5">
                    <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                        {row.business_name}
                    </p>
                    <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        {row.entity_type_label}
                    </p>
                </div>
            ),
        },
        {
            key: 'owner',
            header: 'Owner Account',
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
            key: 'cities',
            header: 'Operating Cities',
            render: (row) =>
                row.operating_cities.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {row.operating_cities.map((c) => (
                            <Badge
                                key={c}
                                variant="outline"
                                className="text-[11px]"
                            >
                                {c}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        None selected
                    </span>
                ),
        },
        {
            key: 'submitted_at',
            header: 'Submitted',
            render: (row) => (
                <span className="text-xs text-tijum-plum tabular-nums dark:text-foreground">
                    {formatIsoDate(row.submitted_at)}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => (
                <StatusBadge
                    status={applicationStatusBadgeMap[row.status] ?? 'neutral'}
                    label={row.status_label}
                />
            ),
        },
        {
            key: 'reviewer',
            header: 'Assigned Reviewer',
            render: (row) => (
                <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                    {row.assigned_reviewer_name ?? 'Unassigned'}
                </span>
            ),
        },
        {
            key: 'action',
            header: 'Action',
            align: 'right',
            render: (row) => (
                <Button size="sm" variant="outline" asChild>
                    <Link href={show.url(row.id)}>
                        {capabilities.canReview ? 'Review' : 'Inspect'}
                    </Link>
                </Button>
            ),
        },
    ];

    return (
        <>
            <Head title="Partner Verification Queue" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="TIJUM Partner Governance"
                    title="Partner Verification Applications"
                    description="Database-backed verification queue across Hyderabad, Guntur, Vijayawada, and Visakhapatnam."
                    badges={
                        !capabilities.canReview && (
                            <Badge variant="outline">
                                Read-Only Role · No Document Access
                            </Badge>
                        )
                    }
                />

                <section
                    aria-label="Partner verification queue metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    <StatCard label="Total" value={stats.total} icon={Inbox} />
                    <StatCard
                        label="Submitted"
                        value={stats.submitted}
                        icon={FileCheck2}
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
                        label="Approved"
                        value={stats.approved}
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Rejected"
                        value={stats.rejected}
                        icon={XCircle}
                    />
                </section>

                <div
                    role="group"
                    aria-label="Quick status filters"
                    className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-card p-1.5 shadow-tijum-card dark:border-border"
                >
                    {quickStatusPills.map((pill) => {
                        const active = status === pill.value;
                        return (
                            <button
                                key={pill.value || 'all'}
                                type="button"
                                aria-pressed={active}
                                onClick={() => {
                                    setStatus(pill.value);
                                    applyFilters({
                                        status: pill.value,
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
                                        Search &amp; Filters
                                    </CardTitle>
                                    <CardDescription>
                                        Filter partner submissions by reference,
                                        entity structure, operating city, or
                                        submission window.
                                    </CardDescription>
                                </div>
                            </div>
                            {hasActiveFilters && (
                                <Badge variant="peach">Filters Active</Badge>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form
                            onSubmit={handleFilterSubmit}
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                        >
                            <div className="min-w-0 space-y-1.5 sm:col-span-2">
                                <Label
                                    htmlFor="filter-search"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Search ref, owner, or business
                                </Label>
                                <div className="relative">
                                    <Search
                                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="filter-search"
                                        type="search"
                                        value={search}
                                        autoCorrect="off"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        placeholder="TJV-2026-000001, name, email..."
                                        className="w-full min-w-0 pl-10"
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            <div className="min-w-0 space-y-1.5">
                                <Label
                                    htmlFor="filter-status"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Status
                                </Label>
                                <Select
                                    value={status || 'all'}
                                    onValueChange={(value) =>
                                        setStatus(value === 'all' ? '' : value)
                                    }
                                >
                                    <SelectTrigger
                                        id="filter-status"
                                        className="w-full min-w-0"
                                    >
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All statuses
                                        </SelectItem>
                                        {statuses.map((s) => (
                                            <SelectItem
                                                key={s.value}
                                                value={s.value}
                                            >
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-0 space-y-1.5">
                                <Label
                                    htmlFor="filter-city"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    City
                                </Label>
                                <Select
                                    value={city || 'all'}
                                    onValueChange={(value) =>
                                        setCity(value === 'all' ? '' : value)
                                    }
                                >
                                    <SelectTrigger
                                        id="filter-city"
                                        className="w-full min-w-0"
                                    >
                                        <SelectValue placeholder="All cities" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All launch cities
                                        </SelectItem>
                                        {cities.map((c) => (
                                            <SelectItem
                                                key={c.slug}
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
                                    htmlFor="filter-entity"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Entity Type
                                </Label>
                                <Select
                                    value={entityType || 'all'}
                                    onValueChange={(value) =>
                                        setEntityType(
                                            value === 'all' ? '' : value,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="filter-entity"
                                        className="w-full min-w-0"
                                    >
                                        <SelectValue placeholder="All entities" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All entity structures
                                        </SelectItem>
                                        {entityTypes.map((e) => (
                                            <SelectItem
                                                key={e.value}
                                                value={e.value}
                                            >
                                                {e.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-0 space-y-1.5">
                                <Label
                                    htmlFor="filter-sort"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Sort Order
                                </Label>
                                <Select value={sort} onValueChange={setSort}>
                                    <SelectTrigger
                                        id="filter-sort"
                                        className="w-full min-w-0"
                                    >
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="submitted_at:desc">
                                            Newest submitted
                                        </SelectItem>
                                        <SelectItem value="submitted_at:asc">
                                            Oldest submitted
                                        </SelectItem>
                                        <SelectItem value="created_at:desc">
                                            Recently created
                                        </SelectItem>
                                        <SelectItem value="application_number:asc">
                                            Reference A–Z
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-0 space-y-1.5">
                                <Label
                                    htmlFor="filter-date-from"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Submitted From
                                </Label>
                                <Input
                                    id="filter-date-from"
                                    type="date"
                                    value={dateFrom}
                                    className="w-full min-w-0"
                                    onChange={(e) =>
                                        setDateFrom(e.target.value)
                                    }
                                />
                            </div>

                            <div className="min-w-0 space-y-1.5">
                                <Label
                                    htmlFor="filter-date-to"
                                    className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Submitted To
                                </Label>
                                <Input
                                    id="filter-date-to"
                                    type="date"
                                    value={dateTo}
                                    className="w-full min-w-0"
                                    onChange={(e) => setDateTo(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1 sm:col-span-2 lg:col-span-4">
                                <Button
                                    type="submit"
                                    variant="plum"
                                    data-test="apply-partner-filters"
                                >
                                    <Filter aria-hidden="true" />
                                    <span>Apply Filters</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearFilters}
                                >
                                    <X aria-hidden="true" />
                                    <span>Clear</span>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <DataTable
                    caption="Partner verification applications"
                    title="Partner Applications Queue"
                    description="Verify partner identity, business structure, and compliance documents."
                    headerActions={
                        <Badge variant="outline" className="tabular-nums">
                            {applications.total} total
                        </Badge>
                    }
                    columns={columns}
                    rows={applications.data}
                    getRowKey={(row) => row.id}
                    emptyTitle="No matching partner applications"
                    emptyDescription="Applications matching the selected search criteria will appear here."
                    footer={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {applications.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {applications.total}
                                </span>{' '}
                                application(s)
                            </p>
                            <Pagination
                                currentPage={applications.current_page}
                                totalPages={applications.last_page}
                                getPageHref={(page) =>
                                    partnersIndex.url({
                                        query: buildQuery({ page }),
                                    })
                                }
                            />
                        </div>
                    }
                />
            </div>
        </>
    );
}

AdminPartnersIndex.layout = {
    breadcrumbs: [
        { title: 'Admin Dashboard', href: dashboard() },
        { title: 'Partner Verification', href: partnersIndex() },
    ],
};
