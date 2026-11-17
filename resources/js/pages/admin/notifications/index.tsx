import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    ArrowRight,
    Bell,
    CheckCircle2,
    Clock,
    Layers,
    Mail,
    MessageSquare,
    RefreshCw,
    RotateCcw,
    Search,
    Send,
    Smartphone,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { WebPushToggle } from '@/components/pwa/WebPushToggle';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import AdminLayout from '@/layouts/admin-layout';
import type { NotificationDeliveryItem } from '@/types/notifications';

interface PaginatedDeliveries {
    data: NotificationDeliveryItem[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    total: number;
}

interface Metrics {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    delivery_rate: number;
}

interface FilterProps {
    channel: string;
    status: string;
    template_code: string;
    search: string;
    date_from: string;
    date_to: string;
}

interface Props {
    deliveries: PaginatedDeliveries;
    metrics: Metrics;
    filters: FilterProps;
    channels: Array<{ value: string; label: string }>;
    statuses: Array<{ value: string; label: string }>;
}

function getDeliverySemanticStatus(st: string): SemanticStatus {
    switch (st) {
        case 'delivered':
        case 'read':
            return 'verified';
        case 'failed':
            return 'rejected';
        case 'suppressed':
            return 'neutral';
        case 'sending':
        case 'retrying':
            return 'processing';
        default:
            return 'info';
    }
}

function getDeliveryStatusLabel(st: string): string {
    switch (st) {
        case 'delivered':
        case 'read':
            return 'Delivered';
        case 'failed':
            return 'Failed';
        case 'suppressed':
            return 'Suppressed';
        case 'sending':
        case 'retrying':
            return 'Sending';
        default:
            return 'Queued';
    }
}

export default function AdminNotificationDeliveriesIndex({
    deliveries,
    metrics,
    filters,
    channels,
    statuses,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [channel, setChannel] = useState(filters.channel || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [retryTargetId, setRetryTargetId] = useState<number | null>(null);
    const [retrying, setRetrying] = useState(false);

    const channelOptions =
        channels.length > 0
            ? channels
            : [
                  { value: 'in_app', label: 'In-App' },
                  { value: 'email', label: 'Email' },
                  { value: 'sms', label: 'SMS (DLT)' },
                  { value: 'whatsapp', label: 'WhatsApp' },
              ];

    const statusOptions =
        statuses.length > 0
            ? statuses
            : [
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'queued', label: 'Queued' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'suppressed', label: 'Suppressed' },
              ];

    const applyFilter = (key: string, val: string) => {
        const query: Record<string, string> = {};
        Object.entries(filters).forEach(([k, v]) => {
            if (v) {
                query[k] = v;
            }
        });
        if (val && val !== 'all') {
            query[key] = val;
        } else {
            delete query[key];
        }
        router.get('/admin/notifications', query, { preserveState: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter('search', search);
    };

    const handleReset = () => {
        setSearch('');
        setChannel('all');
        setStatus('all');
        router.get('/admin/notifications');
    };

    const handleRetry = (id: number) => {
        setRetryTargetId(id);
    };

    const confirmRetry = () => {
        if (retryTargetId === null) {
            return;
        }
        setRetrying(true);
        router.post(
            `/admin/notifications/${retryTargetId}/retry`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setRetrying(false);
                    setRetryTargetId(null);
                },
            },
        );
    };

    const getChannelIcon = (ch: string) => {
        switch (ch) {
            case 'email':
                return (
                    <Mail
                        className="size-3.5 text-status-info-fg"
                        aria-hidden="true"
                    />
                );
            case 'sms':
                return (
                    <Smartphone
                        className="size-3.5 text-status-warning-fg"
                        aria-hidden="true"
                    />
                );
            case 'whatsapp':
                return (
                    <MessageSquare
                        className="size-3.5 text-status-success-fg"
                        aria-hidden="true"
                    />
                );
            default:
                return (
                    <Bell
                        className="size-3.5 text-purple-600 dark:text-purple-400"
                        aria-hidden="true"
                    />
                );
        }
    };

    const getChannelBadge = (ch: string) => {
        switch (ch) {
            case 'email':
                return (
                    <Badge
                        variant="outline"
                        className="border-status-info-border bg-status-info-bg text-status-info-fg"
                    >
                        Email
                    </Badge>
                );
            case 'sms':
                return (
                    <Badge
                        variant="outline"
                        className="border-status-warning-border bg-status-warning-bg text-status-warning-fg"
                    >
                        SMS
                    </Badge>
                );
            case 'whatsapp':
                return (
                    <Badge
                        variant="outline"
                        className="border-status-success-border bg-status-success-bg text-status-success-fg"
                    >
                        WhatsApp
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="outline"
                        className="border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-500/35 dark:bg-purple-950/35 dark:text-purple-300"
                    >
                        In-App
                    </Badge>
                );
        }
    };

    const hasActiveFilters = Boolean(
        filters.search || filters.channel || filters.status,
    );

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                {
                    title: 'Notification Deliveries',
                    href: '/admin/notifications',
                },
            ]}
        >
            <Head title="Notification Delivery Operations" />

            <div className="space-y-6">
                <PageHeader
                    eyebrow="Communication Operations"
                    title="Notification Operations & Delivery Monitor"
                    description="Audit real-time transactional dispatches across In-App, Email, SMS (DLT), and Meta WhatsApp Business API."
                    actions={
                        <>
                            <WebPushToggle compact />
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/notifications/templates">
                                    <Layers
                                        className="size-3.5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Template Registry</span>
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/notifications/providers">
                                    <Activity
                                        className="size-3.5 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Gateway Readiness</span>
                                </Link>
                            </Button>
                        </>
                    }
                />

                {/* KPI Metrics Strip */}
                <section
                    aria-label="Notification delivery metrics"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Total Dispatches"
                        value={metrics.total.toLocaleString()}
                        helperText="Monitored delivery logs"
                        icon={Send}
                    />
                    <StatCard
                        label="Delivered Successfully"
                        value={metrics.delivered.toLocaleString()}
                        helperText={`${metrics.delivery_rate}% delivery rate`}
                        icon={CheckCircle2}
                        className="border-l-4 border-l-emerald-500"
                    />
                    <StatCard
                        label="Failed / Suppressed"
                        value={metrics.failed.toLocaleString()}
                        helperText="Retriable via operations"
                        icon={AlertCircle}
                        className="border-l-4 border-l-rose-500"
                    />
                    <StatCard
                        label="Pending / Retrying"
                        value={metrics.pending.toLocaleString()}
                        helperText="In background dispatch queues"
                        icon={Clock}
                        className="border-l-4 border-l-amber-500"
                    />
                </section>

                {/* Search Card (Separate from Status Pill Tabs) */}
                <Card className="py-4">
                    <CardContent>
                        <form
                            onSubmit={handleSearch}
                            className="flex flex-col gap-3 sm:flex-row sm:items-center"
                        >
                            <div className="relative flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    type="text"
                                    placeholder="Search by recipient, reference, event ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Select
                                    value={channel}
                                    onValueChange={(val) => {
                                        setChannel(val);
                                        applyFilter('channel', val);
                                    }}
                                >
                                    <SelectTrigger
                                        size="sm"
                                        className="w-[155px]"
                                    >
                                        <SelectValue placeholder="All Channels" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Channels
                                        </SelectItem>
                                        {channelOptions.map((ch) => (
                                            <SelectItem
                                                key={ch.value}
                                                value={ch.value}
                                            >
                                                {ch.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button type="submit" size="sm">
                                    Search
                                </Button>

                                {hasActiveFilters && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleReset}
                                    >
                                        <RotateCcw
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Reset</span>
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Standalone Status Filter Pill Tabs */}
                <Tabs
                    value={status}
                    onValueChange={(val) => {
                        setStatus(val);
                        applyFilter('status', val);
                    }}
                    className="space-y-0"
                >
                    <TabsList
                        variant="pill"
                        label="Filter notification deliveries by status"
                    >
                        <TabsTrigger value="all">All Statuses</TabsTrigger>
                        {statusOptions.map((st) => (
                            <TabsTrigger key={st.value} value={st.value}>
                                {st.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                {/* Deliveries Ledger */}
                {deliveries.data.length === 0 ? (
                    <EmptyState
                        icon={Bell}
                        title="No notification deliveries found"
                        description="No notification deliveries match the current search, channel, or status criteria."
                        action={
                            hasActiveFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleReset}
                                >
                                    Clear filters
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-4 dark:border-border">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle className="text-base">
                                    Delivery Dispatch Ledger
                                </CardTitle>
                                <Badge
                                    variant="outline"
                                    className="tabular-nums"
                                >
                                    {deliveries.total} total
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[105px] px-4 whitespace-nowrap">
                                            ID / Time
                                        </TableHead>
                                        <TableHead className="w-[110px] px-3 whitespace-nowrap">
                                            Channel
                                        </TableHead>
                                        <TableHead className="px-3">
                                            Template / Event
                                        </TableHead>
                                        <TableHead className="px-3">
                                            Recipient
                                        </TableHead>
                                        <TableHead className="px-3 whitespace-nowrap">
                                            Status
                                        </TableHead>
                                        <TableHead className="px-3 whitespace-nowrap">
                                            Reference
                                        </TableHead>
                                        <TableHead className="px-4 text-right whitespace-nowrap">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deliveries.data.map((delivery) => (
                                        <TableRow key={delivery.id}>
                                            <TableCell className="px-4 py-3 font-mono text-xs whitespace-nowrap tabular-nums">
                                                <div className="font-semibold text-tijum-plum dark:text-foreground">
                                                    #{delivery.id}
                                                </div>
                                                <div className="mt-0.5 font-sans text-[11px] whitespace-nowrap text-tijum-plum-muted dark:text-muted-foreground">
                                                    {delivery.created_at_human}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-3 py-3 whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5">
                                                    {getChannelIcon(
                                                        delivery.channel,
                                                    )}
                                                    {getChannelBadge(
                                                        delivery.channel,
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[220px] px-3 py-3">
                                                <div
                                                    title={
                                                        delivery.template_code
                                                    }
                                                    className="truncate font-heading text-xs font-semibold text-tijum-plum dark:text-foreground"
                                                >
                                                    {delivery.template_code}
                                                </div>
                                                <div
                                                    title={delivery.event_id}
                                                    className="mt-0.5 truncate font-mono text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground"
                                                >
                                                    {delivery.event_id}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[165px] px-3 py-3">
                                                <div
                                                    title={
                                                        delivery.recipient_destination
                                                    }
                                                    className="truncate text-xs font-semibold text-tijum-plum dark:text-foreground"
                                                >
                                                    {
                                                        delivery.recipient_destination
                                                    }
                                                </div>
                                                <div className="mt-0.5 text-[11px] whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    {delivery.notifiable_type} #
                                                    {delivery.notifiable_id}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-3 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <StatusBadge
                                                        status={getDeliverySemanticStatus(
                                                            delivery.status,
                                                        )}
                                                        label={getDeliveryStatusLabel(
                                                            delivery.status,
                                                        )}
                                                    />
                                                    {delivery.attempts > 1 && (
                                                        <span className="font-mono text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                            ({delivery.attempts}
                                                            x)
                                                        </span>
                                                    )}
                                                </div>
                                                {delivery.error_code && (
                                                    <div
                                                        title={
                                                            delivery.error_code
                                                        }
                                                        className="mt-1 max-w-[150px] truncate font-mono text-[11px] text-status-error-fg"
                                                    >
                                                        {delivery.error_code}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[140px] px-3 py-3 font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                <span
                                                    title={
                                                        delivery.related_reference ||
                                                        undefined
                                                    }
                                                    className="block truncate"
                                                >
                                                    {delivery.related_reference ||
                                                        '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center justify-end gap-1.5">
                                                    {[
                                                        'failed',
                                                        'suppressed',
                                                    ].includes(
                                                        delivery.status,
                                                    ) && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleRetry(
                                                                    delivery.id,
                                                                )
                                                            }
                                                        >
                                                            <RefreshCw
                                                                className="size-3.5 text-tijum-coral"
                                                                aria-hidden="true"
                                                            />
                                                            <span>Retry</span>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Link
                                                            href={`/admin/notifications/${delivery.id}`}
                                                        >
                                                            <span>Audit</span>
                                                            <ArrowRight
                                                                className="size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                                <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    Showing{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {deliveries.data.length}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {deliveries.total}
                                    </span>{' '}
                                    deliveries
                                </p>
                                <Pagination
                                    currentPage={deliveries.current_page}
                                    totalPages={deliveries.last_page}
                                    getPageHref={(page) => {
                                        const params = new URLSearchParams();
                                        Object.entries(filters).forEach(
                                            ([k, v]) => {
                                                if (v) {
                                                    params.set(k, v);
                                                }
                                            },
                                        );
                                        params.set('page', String(page));
                                        return `/admin/notifications?${params.toString()}`;
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                <ConfirmationDialog
                    open={retryTargetId !== null}
                    onOpenChange={(open) => {
                        if (!open && !retrying) {
                            setRetryTargetId(null);
                        }
                    }}
                    title={`Retry delivery #${retryTargetId ?? ''}?`}
                    description="This will requeue the message with the configured notification provider for immediate dispatch."
                    confirmLabel="Requeue Delivery"
                    cancelLabel="Cancel"
                    loading={retrying}
                    onConfirm={confirmRetry}
                />
            </div>
        </AdminLayout>
    );
}
