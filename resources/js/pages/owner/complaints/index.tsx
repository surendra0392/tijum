import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    MessageSquare,
    Search,
    ShieldCheck,
    User,
} from 'lucide-react';
import {
    OWNER_SUPPORT_TABS,
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
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ComplaintCase = {
    id: number;
    case_reference: string;
    booking_reference: string;
    property_id: number;
    property_name: string;
    room_type_name?: string | null;
    guest_name: string;
    guest_phone?: string | null;
    category: string;
    category_label: string;
    status: string;
    status_label: string;
    priority: string;
    description: string;
    created_at: string;
    sla_due_at?: string | null;
    is_sla_breached: boolean;
    sla_remaining_human?: string | null;
    messages_count: number;
};

type Props = {
    cases: {
        data: ComplaintCase[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
    };
    properties: Array<{
        id: number;
        name: string;
    }>;
    categories: Array<{
        value: string;
        label: string;
    }>;
    filters: {
        status: string;
        category?: string | null;
        property_id?: number | null;
        search?: string | null;
    };
    stats: {
        total_complaints: number;
        action_required_count: number;
        under_review_count: number;
        resolved_count: number;
        sla_breached_count: number;
    };
};

const categoryBadgeColors: Record<string, string> = {
    room_mismatch:
        'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200',
    property_mismatch:
        'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-200',
    food_not_provided:
        'border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-500/40 dark:bg-orange-950/60 dark:text-orange-200',
    property_unavailable:
        'border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/60 dark:text-rose-200',
    safety_concern:
        'border-red-300 bg-red-100 text-red-900 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-200',
    refund_request:
        'border-tijum-coral/35 bg-tijum-peach/45 text-tijum-plum dark:border-tijum-coral/40 dark:bg-tijum-coral/20 dark:text-tijum-peach',
    booking_problem:
        'border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/60 dark:text-blue-200',
    customer_other:
        'border-stone-300 bg-stone-100 text-stone-900 dark:border-stone-600/50 dark:bg-stone-900/60 dark:text-stone-200',
};

const statusBadgeVariants: Record<
    string,
    'default' | 'secondary' | 'outline' | 'destructive'
> = {
    awaiting_owner: 'destructive',
    open: 'destructive',
    submitted: 'outline',
    acknowledged: 'secondary',
    under_review: 'secondary',
    relocation_offered: 'default',
    resolved: 'secondary',
    closed: 'outline',
};

export default function OwnerComplaintsIndex({
    cases,
    properties,
    categories,
    filters,
    stats,
}: Props) {
    const updateFilter = (key: string, value: string | number | null) => {
        router.get(
            '/owner/complaints',
            {
                ...filters,
                [key]: value === 'all' ? null : value,
                page: 1,
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

    return (
        <div className="space-y-6">
            <Head title="Guest Complaints & Disputes · Partner Portal" />

            <OwnerSectionTabs
                items={OWNER_SUPPORT_TABS}
                ariaLabel="Reviews and support navigation"
            />

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <PageHeader
                    eyebrow="Partner Operations"
                    title="Guest Complaints & Grievances"
                    description="Resolve reported room mismatches, meal discrepancies, and customer protection inquiries with TIJUM Care."
                />

                <div className="flex flex-wrap items-center gap-2">
                    {/* Category Filter */}
                    <Select
                        value={filters.category || 'all'}
                        onValueChange={(v) => updateFilter('category', v)}
                    >
                        <SelectTrigger size="sm" className="w-[190px] text-xs">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Property Filter */}
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

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 tabular-nums">
                <Card
                    onClick={() => updateFilter('status', 'action_required')}
                    className={`cursor-pointer border-tijum-surface/80 transition-all hover:border-rose-400 hover:shadow-md dark:border-border ${
                        filters.status === 'action_required'
                            ? 'border-rose-500 ring-2 ring-rose-200 dark:border-rose-500/70 dark:ring-rose-950/50'
                            : ''
                    }`}
                >
                    <CardHeader className="p-4 pb-1">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs font-medium">
                                Action Required
                            </CardDescription>
                            <AlertCircle className="size-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <CardTitle className="font-heading text-2xl font-bold text-rose-600 dark:text-rose-400">
                            {stats.action_required_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Awaiting your reply
                        </span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => updateFilter('status', 'under_review')}
                    className={`cursor-pointer border-tijum-surface/80 transition-all hover:border-amber-400 hover:shadow-md dark:border-border ${
                        filters.status === 'under_review'
                            ? 'border-amber-500 ring-2 ring-amber-200 dark:border-amber-500/70 dark:ring-amber-950/50'
                            : ''
                    }`}
                >
                    <CardHeader className="p-4 pb-1">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs font-medium">
                                Under Review
                            </CardDescription>
                            <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <CardTitle className="font-heading text-2xl font-bold text-amber-700 dark:text-amber-400">
                            {stats.under_review_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            TIJUM mediation
                        </span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => updateFilter('status', 'resolved')}
                    className={`cursor-pointer border-tijum-surface/80 transition-all hover:border-tijum-coral hover:shadow-md dark:border-border ${
                        filters.status === 'resolved'
                            ? 'border-tijum-coral ring-2 ring-tijum-coral/25'
                            : ''
                    }`}
                >
                    <CardHeader className="p-4 pb-1">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs font-medium">
                                Resolved Cases
                            </CardDescription>
                            <CheckCircle2 className="size-4 text-tijum-coral" />
                        </div>
                        <CardTitle className="font-heading text-2xl font-bold text-tijum-coral">
                            {stats.resolved_count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            Successfully closed
                        </span>
                    </CardContent>
                </Card>

                <Card
                    onClick={() => updateFilter('status', 'all')}
                    className={`cursor-pointer border-tijum-surface/80 transition-all hover:border-tijum-plum hover:shadow-md dark:border-border dark:hover:border-tijum-peach ${
                        filters.status === 'all'
                            ? 'border-tijum-plum ring-2 ring-tijum-plum/20 dark:border-tijum-peach dark:ring-tijum-peach/25'
                            : ''
                    }`}
                >
                    <CardHeader className="p-4 pb-1">
                        <div className="flex items-center justify-between">
                            <CardDescription className="text-xs font-medium">
                                Total Complaints
                            </CardDescription>
                            <ShieldCheck className="size-4 text-tijum-plum dark:text-foreground" />
                        </div>
                        <CardTitle className="font-heading text-2xl font-bold text-tijum-plum dark:text-foreground">
                            {stats.total_complaints}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            All registered records
                        </span>
                    </CardContent>
                </Card>
            </div>

            {/* SLA breach alert banner */}
            {stats.sla_breached_count > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="size-4" />
                    <AlertTitle>Urgent Resolution Required</AlertTitle>
                    <AlertDescription>
                        {stats.sla_breached_count} complaint(s) have exceeded
                        their SLA response target. Please review and reply
                        immediately to maintain partner standing.
                    </AlertDescription>
                </Alert>
            )}

            {/* Status Tabs and Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs
                    value={filters.status}
                    onValueChange={(v) => updateFilter('status', v)}
                    className="w-auto"
                >
                    <TabsList variant="pill">
                        <TabsTrigger value="all">
                            All ({stats.total_complaints})
                        </TabsTrigger>
                        <TabsTrigger value="action_required">
                            Action Required ({stats.action_required_count})
                        </TabsTrigger>
                        <TabsTrigger value="under_review">
                            Under Review ({stats.under_review_count})
                        </TabsTrigger>
                        <TabsTrigger value="resolved">
                            Resolved ({stats.resolved_count})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <form
                    onSubmit={handleSearch}
                    className="relative flex items-center"
                >
                    <Search className="pointer-events-none absolute left-3 size-3.5 text-tijum-plum-muted dark:text-muted-foreground" />
                    <Input
                        name="search"
                        defaultValue={filters.search || ''}
                        placeholder="Search reference, guest, details..."
                        className="h-10 w-64 pl-8 text-xs"
                    />
                </form>
            </div>

            {/* Cases List */}
            {cases.data.length === 0 ? (
                <Card className="border-dashed py-12 text-center">
                    <CardContent className="space-y-3">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-tijum-peach/40 text-tijum-coral dark:bg-tijum-coral/15">
                            <ShieldCheck className="size-6" />
                        </div>
                        <h4 className="font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                            No Complaints Found
                        </h4>
                        <p className="mx-auto max-w-sm text-xs text-tijum-plum-muted dark:text-muted-foreground">
                            No guest grievances or protection cases match the
                            selected filters. Your property operational
                            compliance is looking great!
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {cases.data.map((c) => (
                        <Card
                            key={c.id}
                            className={`border-tijum-surface/80 transition-all hover:border-tijum-coral/40 hover:shadow-md dark:border-border ${
                                c.is_sla_breached
                                    ? 'border-status-error-border border-l-4 border-l-destructive bg-card'
                                    : ''
                            }`}
                        >
                            <CardContent className="p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="font-mono text-xs font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                {c.case_reference}
                                            </Badge>
                                            <Badge
                                                className={`text-xs ${
                                                    categoryBadgeColors[
                                                        c.category
                                                    ] ||
                                                    'border-stone-300 bg-stone-100 text-stone-900 dark:border-stone-600/50 dark:bg-stone-900/60 dark:text-stone-200'
                                                }`}
                                            >
                                                {c.category_label}
                                            </Badge>
                                            <Badge
                                                variant={
                                                    statusBadgeVariants[
                                                        c.status
                                                    ] || 'outline'
                                                }
                                                className="text-xs"
                                            >
                                                {c.status_label}
                                            </Badge>
                                            {c.is_sla_breached && (
                                                <Badge
                                                    variant="destructive"
                                                    className="text-xs"
                                                >
                                                    SLA Overdue
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="line-clamp-2 text-sm text-tijum-plum dark:text-foreground">
                                            &quot;{c.description}&quot;
                                        </p>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            <span className="flex items-center gap-1 font-medium text-tijum-plum dark:text-foreground">
                                                <Building2 className="size-3.5 text-tijum-coral" />
                                                {c.property_name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="size-3.5" />
                                                {c.guest_name}
                                            </span>
                                            <span className="flex items-center gap-1 font-mono text-[11px]">
                                                Booking #{c.booking_reference}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="size-3.5" />
                                                Reported on{' '}
                                                {new Date(
                                                    c.created_at,
                                                ).toLocaleDateString([], {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                            {c.sla_remaining_human &&
                                                ![
                                                    'resolved',
                                                    'closed',
                                                ].includes(c.status) && (
                                                    <span
                                                        className={`flex items-center gap-1 font-medium tabular-nums ${
                                                            c.is_sla_breached
                                                                ? 'text-status-error-fg'
                                                                : 'text-status-warning-fg'
                                                        }`}
                                                    >
                                                        <Clock className="size-3.5" />
                                                        SLA:{' '}
                                                        {c.sla_remaining_human}
                                                    </span>
                                                )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2 lg:pt-0">
                                        <div className="flex items-center gap-1 text-xs tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                            <MessageSquare className="size-3.5" />
                                            <span>
                                                {c.messages_count} reply
                                                {c.messages_count === 1
                                                    ? ''
                                                    : 'ies'}
                                            </span>
                                        </div>
                                        <Button
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={`/owner/complaints/${c.case_reference}`}
                                            >
                                                Open Resolution Desk
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                            Showing{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {cases.data.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {cases.total}
                            </span>{' '}
                            {cases.total === 1 ? 'complaint' : 'complaints'}
                        </p>
                        <Pagination
                            links={cases.links}
                            currentPage={cases.current_page}
                            totalPages={cases.last_page}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
