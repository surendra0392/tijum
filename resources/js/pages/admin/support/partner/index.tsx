import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Clock,
    Filter,
    LifeBuoy,
    Mail,
    MapPin,
    Phone,
    Search,
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

interface AdminPartnerTicket {
    id: number;
    ticket_reference: string;
    subject: string;
    category: string;
    status: string;
    status_label: string;
    status_badge: 'default' | 'secondary' | 'outline' | 'destructive';
    priority: string;
    priority_label: string;
    partner_name: string;
    business_name?: string | null;
    partner_email?: string | null;
    partner_phone?: string | null;
    property_name?: string | null;
    city_name?: string | null;
    assigned_admin_name?: string | null;
    sla_due_at?: string | null;
    is_overdue: boolean;
    last_reply_at?: string | null;
    last_reply_by_type?: string | null;
    created_at: string;
}

interface AdminPartnerSupportIndexProps {
    tickets: {
        data: AdminPartnerTicket[];
        meta: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
        };
    };
    stats: {
        total_active: number;
        awaiting_agent: number;
        overdue: number;
        resolved_today: number;
    };
    filters: {
        status: string;
        category: string;
        priority: string;
        overdue: boolean;
        search: string;
    };
    admins: Array<{ id: number; name: string }>;
}

function getTicketSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'resolved':
            return 'completed';
        case 'closed':
            return 'neutral';
        case 'in_progress':
            return 'processing';
        case 'waiting_user':
            return 'pending';
        case 'open':
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

export default function AdminPartnerSupportIndex({
    tickets,
    stats,
    filters,
}: AdminPartnerSupportIndexProps) {
    const [status, setStatus] = useState(filters.status || 'all');
    const [category, setCategory] = useState(filters.category || 'all');
    const [priority, setPriority] = useState(filters.priority || 'all');
    const [search, setSearch] = useState(filters.search || '');

    const hasActiveFilters = Boolean(
        (status && status !== 'all') ||
        (category && category !== 'all') ||
        (priority && priority !== 'all') ||
        filters.overdue ||
        search.trim(),
    );

    const applyFilters = (
        newParams: Record<string, string | number | boolean | undefined> = {},
    ) => {
        const params: Record<string, string | number | boolean | undefined> = {
            status: status === 'all' ? undefined : status,
            category: category === 'all' ? undefined : category,
            priority: priority === 'all' ? undefined : priority,
            overdue: filters.overdue ? true : undefined,
            search: search.trim() ? search.trim() : undefined,
            ...newParams,
        };

        Object.keys(params).forEach(
            (k) => params[k] === undefined && delete params[k],
        );

        router.get('/admin/support/partners', params as any, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ page: 1 });
    };

    const handleResetFilters = () => {
        setStatus('all');
        setCategory('all');
        setPriority('all');
        setSearch('');
        router.get(
            '/admin/support/partners',
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <div className="space-y-6">
            <Head title="Partner Support Desk · TIJUM Admin" />

            <PageHeader
                eyebrow="Support Operations"
                title="Partner Support"
                description="Coordinate with property partners, resolve payout and onboarding tickets, and provide dedicated host success support."
                badges={
                    <>
                        <Badge variant="plum">Partner Desk</Badge>
                        {filters.overdue && (
                            <Badge variant="destructive" className="gap-1">
                                <AlertTriangle
                                    className="size-3"
                                    aria-hidden="true"
                                />
                                <span>Overdue SLA Filter</span>
                            </Badge>
                        )}
                    </>
                }
            />

            {/* KPI Stat Cards */}
            <section
                aria-label="Partner support desk metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Active Partner Tickets"
                    value={stats.total_active}
                    helperText="Open & in-progress partner threads"
                    icon={LifeBuoy}
                    className="border-l-4 border-l-tijum-coral"
                />

                <StatCard
                    label="Awaiting Agent"
                    value={stats.awaiting_agent}
                    helperText="Requires partner desk response"
                    icon={Clock}
                    className={
                        stats.awaiting_agent > 0
                            ? 'border-l-4 border-l-amber-500'
                            : ''
                    }
                />

                <button
                    type="button"
                    onClick={() =>
                        applyFilters({
                            overdue: filters.overdue ? undefined : true,
                            page: 1,
                        })
                    }
                    className="cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="Overdue SLA"
                        value={stats.overdue}
                        helperText={
                            filters.overdue
                                ? 'Overdue filter active · Click to clear'
                                : stats.overdue > 0
                                  ? 'Click to filter breached SLAs'
                                  : 'All partner SLAs on track'
                        }
                        icon={AlertTriangle}
                        className={cn(
                            'h-full transition-shadow hover:shadow-tijum-soft',
                            stats.overdue > 0 || filters.overdue
                                ? 'border-l-4 border-l-destructive'
                                : '',
                        )}
                    />
                </button>

                <StatCard
                    label="Resolved Today"
                    value={stats.resolved_today}
                    helperText="Partner issues closed today"
                    icon={CheckCircle2}
                    className="border-l-4 border-l-emerald-500"
                />
            </section>

            {/* Quick Status Pill Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    value={status}
                    onValueChange={(val) => {
                        setStatus(val);
                        applyFilters({
                            status: val === 'all' ? undefined : val,
                            page: 1,
                        });
                    }}
                    className="max-w-full space-y-0"
                >
                    <TabsList
                        variant="pill"
                        label="Filter partner support tickets by status"
                        className="max-w-full"
                    >
                        <TabsTrigger value="all">All Tickets</TabsTrigger>
                        <TabsTrigger value="open">Open</TabsTrigger>
                        <TabsTrigger value="in_progress">
                            In Progress
                        </TabsTrigger>
                        <TabsTrigger value="waiting_user">
                            Waiting for Partner
                        </TabsTrigger>
                        <TabsTrigger value="resolved">Resolved</TabsTrigger>
                        <TabsTrigger value="closed">Closed</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant={filters.overdue ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() =>
                            applyFilters({
                                overdue: filters.overdue ? undefined : true,
                                page: 1,
                            })
                        }
                    >
                        <AlertTriangle
                            className="size-3.5"
                            aria-hidden="true"
                        />
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

            {/* Filter Bar */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-coral">
                                <Filter className="size-4" aria-hidden="true" />
                            </span>
                            <div className="space-y-0.5">
                                <CardTitle className="text-base">
                                    Search &amp; Partner Ticket Filters
                                </CardTitle>
                                <CardDescription>
                                    Filter host inquiries by status, operational
                                    category, priority, or property reference.
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
                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        <div className="min-w-0 space-y-1.5">
                            <Label
                                htmlFor="partner-ticket-status"
                                className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Status
                            </Label>
                            <Select
                                value={status}
                                onValueChange={(val) => {
                                    setStatus(val);
                                    applyFilters({
                                        status: val === 'all' ? undefined : val,
                                        page: 1,
                                    });
                                }}
                            >
                                <SelectTrigger
                                    id="partner-ticket-status"
                                    size="sm"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Statuses
                                    </SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">
                                        In Progress
                                    </SelectItem>
                                    <SelectItem value="waiting_user">
                                        Waiting for Partner
                                    </SelectItem>
                                    <SelectItem value="resolved">
                                        Resolved
                                    </SelectItem>
                                    <SelectItem value="closed">
                                        Closed
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-0 space-y-1.5">
                            <Label
                                htmlFor="partner-ticket-category"
                                className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Category
                            </Label>
                            <Select
                                value={category}
                                onValueChange={(val) => {
                                    setCategory(val);
                                    applyFilters({
                                        category:
                                            val === 'all' ? undefined : val,
                                        page: 1,
                                    });
                                }}
                            >
                                <SelectTrigger
                                    id="partner-ticket-category"
                                    size="sm"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Categories
                                    </SelectItem>
                                    <SelectItem value="payout_settlement">
                                        Payouts &amp; Settlements
                                    </SelectItem>
                                    <SelectItem value="verification_onboarding">
                                        Verification &amp; Profile
                                    </SelectItem>
                                    <SelectItem value="inventory_pricing">
                                        Inventory &amp; Pricing
                                    </SelectItem>
                                    <SelectItem value="guest_dispute">
                                        Guest Dispute
                                    </SelectItem>
                                    <SelectItem value="tax_gst_invoice">
                                        Tax &amp; GST Invoices
                                    </SelectItem>
                                    <SelectItem value="technical_support">
                                        Technical Support
                                    </SelectItem>
                                    <SelectItem value="general_inquiry">
                                        General Inquiry
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-0 space-y-1.5">
                            <Label
                                htmlFor="partner-ticket-priority"
                                className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Priority
                            </Label>
                            <Select
                                value={priority}
                                onValueChange={(val) => {
                                    setPriority(val);
                                    applyFilters({
                                        priority:
                                            val === 'all' ? undefined : val,
                                        page: 1,
                                    });
                                }}
                            >
                                <SelectTrigger
                                    id="partner-ticket-priority"
                                    size="sm"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All Priorities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Priorities
                                    </SelectItem>
                                    <SelectItem value="urgent">
                                        Urgent
                                    </SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="standard">
                                        Standard
                                    </SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="min-w-0 space-y-1.5">
                            <Label
                                htmlFor="partner-ticket-search"
                                className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Search Partner / Property / Ref
                            </Label>
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="partner-ticket-search"
                                    type="text"
                                    placeholder="Partner, legal name, ref..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1 sm:col-span-2 lg:col-span-4">
                            <Button type="submit" variant="plum" size="sm">
                                <Search
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Search Tickets</span>
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

            {/* Tickets Table */}
            {tickets.data.length === 0 ? (
                <EmptyState
                    icon={LifeBuoy}
                    title="No partner support tickets found"
                    description="No partner tickets match the selected filters or search terms."
                    action={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetFilters}
                        >
                            Reset Filters
                        </Button>
                    }
                />
            ) : (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                                Partner Support Queue
                            </CardTitle>
                            <Badge variant="outline" className="tabular-nums">
                                {tickets.meta.total} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-4">
                                        Ticket &amp; Partner
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Property &amp; Subject
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Priority &amp; Status
                                    </TableHead>
                                    <TableHead className="px-4">
                                        SLA &amp; Last Activity
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Assigned Agent
                                    </TableHead>
                                    <TableHead className="px-4 text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tickets.data.map((ticket) => (
                                    <TableRow
                                        key={ticket.id}
                                        className={cn(
                                            ticket.is_overdue &&
                                                'border-l-4 border-l-destructive',
                                        )}
                                    >
                                        <TableCell className="px-4 py-4 align-top">
                                            <div className="space-y-1">
                                                <Link
                                                    href={`/admin/support/partners/${ticket.ticket_reference}`}
                                                    className="font-mono text-xs font-bold text-tijum-coral tabular-nums hover:underline"
                                                >
                                                    {ticket.ticket_reference}
                                                </Link>
                                                <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                    {ticket.partner_name}
                                                </p>
                                                {ticket.business_name && (
                                                    <p className="flex items-center gap-1.5 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                        <Building2
                                                            className="size-3 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {
                                                                ticket.business_name
                                                            }
                                                        </span>
                                                    </p>
                                                )}
                                                <div className="flex flex-col gap-0.5 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    {ticket.partner_phone && (
                                                        <a
                                                            href={`tel:${ticket.partner_phone}`}
                                                            className="inline-flex items-center gap-1.5 text-tijum-plum tabular-nums hover:text-tijum-coral dark:text-foreground dark:hover:text-tijum-coral"
                                                        >
                                                            <Phone
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                {
                                                                    ticket.partner_phone
                                                                }
                                                            </span>
                                                        </a>
                                                    )}
                                                    {ticket.partner_email && (
                                                        <a
                                                            href={`mailto:${ticket.partner_email}`}
                                                            className="inline-flex items-center gap-1.5 text-tijum-plum-muted hover:text-tijum-coral dark:text-muted-foreground dark:hover:text-tijum-coral"
                                                        >
                                                            <Mail
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                {
                                                                    ticket.partner_email
                                                                }
                                                            </span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="px-4 py-4 align-top">
                                            <div className="max-w-sm space-y-1.5">
                                                <p className="line-clamp-2 font-medium text-tijum-plum dark:text-foreground">
                                                    {ticket.subject}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] capitalize"
                                                    >
                                                        {ticket.category.replace(
                                                            /_/g,
                                                            ' ',
                                                        )}
                                                    </Badge>
                                                    {ticket.property_name && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                            <MapPin
                                                                className="size-3"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                {
                                                                    ticket.property_name
                                                                }
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="px-4 py-4 align-top">
                                            <div className="space-y-1.5">
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center rounded-full border px-2.5 py-0.5 font-heading text-[10px] font-semibold tracking-wider uppercase',
                                                        getPriorityBadgeClass(
                                                            ticket.priority,
                                                        ),
                                                    )}
                                                >
                                                    {ticket.priority_label}
                                                </span>
                                                <div>
                                                    <StatusBadge
                                                        status={getTicketSemanticStatus(
                                                            ticket.status,
                                                        )}
                                                        label={
                                                            ticket.status_label
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="px-4 py-4 align-top">
                                            <div className="space-y-1 text-xs">
                                                {ticket.is_overdue ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-status-error-border bg-status-error-bg px-2.5 py-0.5 font-heading text-[11px] font-semibold text-status-error-fg">
                                                        <AlertTriangle
                                                            className="size-3"
                                                            aria-hidden="true"
                                                        />
                                                        <span>Overdue SLA</span>
                                                    </span>
                                                ) : (
                                                    <p className="text-tijum-plum-muted dark:text-muted-foreground">
                                                        Due:{' '}
                                                        <span className="font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                                            {ticket.sla_due_at
                                                                ? new Date(
                                                                      ticket.sla_due_at,
                                                                  ).toLocaleTimeString(
                                                                      [],
                                                                      {
                                                                          hour: '2-digit',
                                                                          minute: '2-digit',
                                                                      },
                                                                  )
                                                                : 'Standard'}
                                                        </span>
                                                    </p>
                                                )}
                                                <p className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                    Last reply:{' '}
                                                    {ticket.last_reply_by_type ===
                                                    'partner'
                                                        ? 'Partner'
                                                        : 'Support'}
                                                </p>
                                            </div>
                                        </TableCell>

                                        <TableCell className="px-4 py-4 align-top">
                                            <span className="text-xs font-medium text-tijum-plum dark:text-foreground">
                                                {ticket.assigned_admin_name || (
                                                    <span className="text-tijum-plum-muted italic dark:text-muted-foreground">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </span>
                                        </TableCell>

                                        <TableCell className="px-4 py-4 text-right align-top">
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="outline"
                                            >
                                                <Link
                                                    href={`/admin/support/partners/${ticket.ticket_reference}`}
                                                >
                                                    View Thread
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
                                    {tickets.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {tickets.meta.total}
                                </span>{' '}
                                ticket{tickets.meta.total === 1 ? '' : 's'}
                            </p>
                            <Pagination
                                currentPage={tickets.meta.current_page}
                                lastPage={tickets.meta.last_page}
                                total={tickets.meta.total}
                                onPageChange={(page) =>
                                    applyFilters({ page })
                                }
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
