import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    Clock,
    Filter,
    Layers,
    Search,
    ShieldAlert,
    UserCheck,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface AdminCaseItem {
    id: number;
    case_reference: string;
    booking_reference: string;
    customer_name: string;
    property_name: string;
    city_name?: string | null;
    category: string;
    category_label: string;
    status: string;
    status_label: string;
    priority: string;
    priority_label: string;
    assigned_admin_name?: string | null;
    sla_due_at?: string | null;
    is_overdue: boolean;
    created_at: string;
}

interface AdminCasesIndexProps {
    cases: {
        data: AdminCaseItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: {
        status?: string;
        category?: string;
        priority?: string;
        overdue?: boolean;
        search?: string;
    };
    statusOptions: Array<{ value: string; label: string }>;
    categoryOptions: Array<{ value: string; label: string }>;
    priorityOptions: Array<{ value: string; label: string }>;
    admins: Array<{ id: number; name: string }>;
}

function getCaseSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'resolved':
            return 'completed';
        case 'closed':
            return 'neutral';
        case 'acknowledged':
        case 'under_review':
            return 'processing';
        case 'awaiting_owner':
        case 'awaiting_customer':
            return 'pending';
        case 'refund_review':
        case 'refund_pending':
            return 'warning';
        case 'relocation_offered':
        case 'open':
        case 'submitted':
        default:
            return 'info';
    }
}

function getPriorityBadgeClass(priority: string): string {
    switch (priority) {
        case 'urgent':
            return 'border-status-error-border bg-status-error-bg text-status-error-fg';
        case 'high':
            return 'border-status-warning-border bg-status-warning-bg text-status-warning-fg';
        default:
            return 'border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg';
    }
}

export default function AdminCasesIndex({
    cases,
    filters,
    statusOptions,
    categoryOptions,
    priorityOptions,
}: AdminCasesIndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search ?? '');

    const hasActiveFilters = Boolean(
        filters.status ||
        filters.category ||
        filters.priority ||
        filters.overdue ||
        filters.search,
    );

    const handleFilterChange = (key: string, value: string | boolean) => {
        router.get(
            '/admin/customer-cases',
            {
                ...filters,
                [key]: value === 'all' || value === false ? undefined : value,
                page: 1,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange('search', searchTerm.trim());
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        router.get(
            '/admin/customer-cases',
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const buildPageHref = (page: number) => {
        const params = new URLSearchParams();
        if (filters.status) params.set('status', filters.status);
        if (filters.category) params.set('category', filters.category);
        if (filters.priority) params.set('priority', filters.priority);
        if (filters.overdue) params.set('overdue', '1');
        if (filters.search) params.set('search', filters.search);
        params.set('page', String(page));
        return `/admin/customer-cases?${params.toString()}`;
    };

    const overdueOnPage = cases.data.filter((c) => c.is_overdue).length;
    const highPriorityOnPage = cases.data.filter(
        (c) => c.priority === 'urgent' || c.priority === 'high',
    ).length;
    const unassignedOnPage = cases.data.filter(
        (c) => !c.assigned_admin_name,
    ).length;

    return (
        <div className="space-y-6">
            <Head title="Customer Protection &amp; Cases Oversight" />

            <PageHeader
                eyebrow="Marketplace Governance"
                title="Customer Protection Cases"
                description="Oversight of reported stay disputes, room mismatches, meal failures, and statutory grievance SLAs."
                badges={
                    <>
                        <Badge variant="plum">Protection Queue</Badge>
                        {filters.overdue && (
                            <Badge variant="destructive" className="gap-1">
                                <AlertCircle
                                    className="size-3"
                                    aria-hidden="true"
                                />
                                <span>Overdue SLA Filter</span>
                            </Badge>
                        )}
                    </>
                }
                actions={
                    <Button asChild variant="outline">
                        <Link href="/admin/relocations">
                            <Layers className="size-4" aria-hidden="true" />
                            <span>Manage Relocations</span>
                        </Link>
                    </Button>
                }
            />

            {/* KPI Summary Cards */}
            <section
                aria-label="Customer protection queue metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Matching Cases"
                    value={cases.total}
                    helperText={
                        cases.from && cases.to
                            ? `Showing ${cases.from}–${cases.to} of ${cases.total}`
                            : 'Filtered grievance total'
                    }
                    icon={ShieldAlert}
                    className="border-l-4 border-l-tijum-coral"
                />

                <button
                    type="button"
                    onClick={() =>
                        handleFilterChange('overdue', !filters.overdue)
                    }
                    className="cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="Overdue SLA (Page)"
                        value={overdueOnPage}
                        helperText={
                            filters.overdue
                                ? 'Overdue filter active · Click to clear'
                                : 'Click to filter SLA breaches'
                        }
                        icon={AlertTriangle}
                        className={cn(
                            'h-full transition-shadow hover:shadow-tijum-soft',
                            overdueOnPage > 0 || filters.overdue
                                ? 'border-l-4 border-l-destructive'
                                : '',
                        )}
                    />
                </button>

                <StatCard
                    label="Urgent / High (Page)"
                    value={highPriorityOnPage}
                    helperText="Escalated priority disputes in view"
                    icon={Clock}
                    className={
                        highPriorityOnPage > 0
                            ? 'border-l-4 border-l-amber-500'
                            : ''
                    }
                />

                <StatCard
                    label="Unassigned (Page)"
                    value={unassignedOnPage}
                    helperText="Cases awaiting admin ownership"
                    icon={UserCheck}
                />
            </section>

            {/* Quick Status Pill Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    value={filters.status || 'all'}
                    onValueChange={(val) => handleFilterChange('status', val)}
                    className="max-w-full space-y-0"
                >
                    <TabsList
                        variant="pill"
                        label="Filter customer protection cases by status"
                        className="max-w-full"
                    >
                        <TabsTrigger value="all">All Cases</TabsTrigger>
                        {statusOptions.map((opt) => (
                            <TabsTrigger key={opt.value} value={opt.value}>
                                {opt.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant={filters.overdue ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() =>
                            handleFilterChange('overdue', !filters.overdue)
                        }
                    >
                        <AlertCircle className="size-3.5" aria-hidden="true" />
                        <span>
                            {filters.overdue
                                ? 'Overdue SLA Active'
                                : 'Overdue SLA Only'}
                        </span>
                    </Button>
                    {hasActiveFilters && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilters}
                        >
                            <X className="size-3.5" aria-hidden="true" />
                            <span>Clear</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                <Filter className="size-4" aria-hidden="true" />
                            </span>
                            <div className="space-y-0.5">
                                <CardTitle className="text-base">
                                    Search &amp; Case Filters
                                </CardTitle>
                                <CardDescription>
                                    Filter disputes by reference, guest,
                                    property, lifecycle status, category, or SLA
                                    status.
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
                        onSubmit={handleSearchSubmit}
                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
                    >
                        <div className="min-w-0 space-y-1.5 lg:col-span-2">
                            <Label
                                htmlFor="case-search"
                                className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Search reference, guest, or property
                            </Label>
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="case-search"
                                    placeholder="Search ref, guest, stay..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>
                        </div>

                        <div className="min-w-0 space-y-1.5">
                            <Label
                                htmlFor="case-status"
                                className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Status
                            </Label>
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(val) =>
                                    handleFilterChange('status', val)
                                }
                            >
                                <SelectTrigger
                                    id="case-status"
                                    size="sm"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Statuses
                                    </SelectItem>
                                    {statusOptions.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-0 space-y-1.5">
                            <Label
                                htmlFor="case-category"
                                className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Category
                            </Label>
                            <Select
                                value={filters.category || 'all'}
                                onValueChange={(val) =>
                                    handleFilterChange('category', val)
                                }
                            >
                                <SelectTrigger
                                    id="case-category"
                                    size="sm"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Categories
                                    </SelectItem>
                                    {categoryOptions.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-0 space-y-1.5">
                            <Label
                                htmlFor="case-priority"
                                className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Priority
                            </Label>
                            <Select
                                value={filters.priority || 'all'}
                                onValueChange={(val) =>
                                    handleFilterChange('priority', val)
                                }
                            >
                                <SelectTrigger
                                    id="case-priority"
                                    size="sm"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All Priorities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Priorities
                                    </SelectItem>
                                    {priorityOptions.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 sm:col-span-2 lg:col-span-5">
                            <Button type="submit" variant="plum" size="sm">
                                <Search
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Search Cases</span>
                            </Button>
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetFilters}
                                >
                                    <X
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Clear Filters</span>
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Cases Table */}
            {cases.data.length === 0 ? (
                <EmptyState
                    icon={ShieldAlert}
                    title="No customer protection cases found"
                    description="No customer protection cases match your current filters."
                    action={
                        hasActiveFilters ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleResetFilters}
                            >
                                Reset Filters
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                                Protection Cases Queue
                            </CardTitle>
                            <Badge variant="outline" className="tabular-nums">
                                {cases.total} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-4">
                                        Case Reference
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Guest
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Booking &amp; Property
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Category
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Status
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Priority
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Assigned To
                                    </TableHead>
                                    <TableHead className="px-4">
                                        SLA Status
                                    </TableHead>
                                    <TableHead className="px-4 text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cases.data.map((c) => (
                                    <TableRow
                                        key={c.id}
                                        className={cn(
                                            c.is_overdue &&
                                                'border-l-4 border-l-destructive',
                                        )}
                                    >
                                        <TableCell className="px-4 py-3.5">
                                            <Link
                                                href={`/admin/customer-cases/${c.case_reference}`}
                                                className="font-mono text-xs font-bold text-tijum-coral tabular-nums hover:underline"
                                            >
                                                {c.case_reference}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 font-heading font-semibold text-tijum-plum dark:text-foreground">
                                            {c.customer_name}
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5">
                                            <p className="max-w-[190px] truncate font-semibold text-tijum-plum dark:text-foreground">
                                                {c.property_name}
                                            </p>
                                            <span className="font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                {c.booking_reference}
                                                {c.city_name
                                                    ? ` · ${c.city_name}`
                                                    : ''}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5">
                                            <Badge
                                                variant="outline"
                                                className="text-[11px]"
                                            >
                                                {c.category_label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5">
                                            <StatusBadge
                                                status={getCaseSemanticStatus(
                                                    c.status,
                                                )}
                                                label={c.status_label}
                                            />
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-full border px-2.5 py-0.5 font-heading text-[11px] font-semibold capitalize',
                                                    getPriorityBadgeClass(
                                                        c.priority,
                                                    ),
                                                )}
                                            >
                                                {c.priority_label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {c.assigned_admin_name ?? (
                                                <span className="italic">
                                                    Unassigned
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5">
                                            {c.is_overdue ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-status-error-border bg-status-error-bg px-2.5 py-0.5 font-heading text-[11px] font-semibold text-status-error-fg">
                                                    <AlertCircle
                                                        className="size-3"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Overdue</span>
                                                </span>
                                            ) : c.sla_due_at ? (
                                                <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    Due{' '}
                                                    {new Date(
                                                        c.sla_due_at,
                                                    ).toLocaleDateString(
                                                        'en-IN',
                                                        {
                                                            day: 'numeric',
                                                            month: 'short',
                                                        },
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3.5 text-right">
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="outline"
                                            >
                                                <Link
                                                    href={`/admin/customer-cases/${c.case_reference}`}
                                                >
                                                    Manage
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {cases.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {cases.total}
                                </span>{' '}
                                case{cases.total === 1 ? '' : 's'}
                            </p>
                            <Pagination
                                currentPage={cases.current_page}
                                totalPages={cases.last_page}
                                getPageHref={buildPageHref}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
