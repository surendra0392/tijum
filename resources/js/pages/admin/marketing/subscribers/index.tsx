import { Head, router } from '@inertiajs/react';
import { History, Search, ShieldCheck, Users, UserX, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import AdminLayout from '@/layouts/admin-layout';
import type { MarketingSubscriber } from '@/types/marketing';

interface Props {
    subscribers: {
        data: MarketingSubscriber[];
        current_page: number;
        last_page: number;
        total: number;
    };
    statuses: Array<{ value: string; label: string }>;
    filters: {
        status?: string | null;
        search?: string | null;
    };
}

function getSubscriberSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'subscribed':
            return 'active';
        case 'pending_confirmation':
            return 'pending';
        case 'bounced':
            return 'rejected';
        default:
            return 'neutral';
    }
}

export default function AdminSubscribersIndex({
    subscribers,
    statuses,
    filters,
}: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedSubscriber, setSelectedSubscriber] =
        useState<MarketingSubscriber | null>(null);
    const [subscriberToUnsubscribe, setSubscriberToUnsubscribe] =
        useState<MarketingSubscriber | null>(null);
    const [isUnsubscribing, setIsUnsubscribing] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/marketing/subscribers',
            { ...filters, search: searchTerm || undefined },
            { preserveState: true },
        );
    };

    const handleStatusFilter = (status: string) => {
        router.get(
            '/admin/marketing/subscribers',
            { ...filters, status: status || undefined },
            { preserveState: true },
        );
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        router.get('/admin/marketing/subscribers', {}, { preserveState: true });
    };

    const handleUnsubscribeConfirm = () => {
        if (!subscriberToUnsubscribe) {
            return;
        }

        setIsUnsubscribing(true);
        router.post(
            `/admin/marketing/subscribers/${subscriberToUnsubscribe.id}/unsubscribe`,
            {},
            {
                onFinish: () => {
                    setIsUnsubscribing(false);
                    setSubscriberToUnsubscribe(null);
                },
            },
        );
    };

    const hasActiveFilters = Boolean(filters.status || filters.search);

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Marketing & Growth', href: '/admin/marketing' },
                { title: 'Subscribers', href: '/admin/marketing/subscribers' },
            ]}
        >
            <Head title="Marketing Subscribers & Consent Records — TIJUM Operations" />

            <div className="space-y-6 pb-10">
                <PageHeader
                    eyebrow="Marketing · Consent & Compliance"
                    title="Newsletter Subscribers & Consent Registry"
                    description="Permission-based marketing audience with immutable consent timestamps, IP records, and opt-out history."
                    badges={
                        <Badge
                            variant="secondary"
                            className="font-semibold tabular-nums"
                        >
                            {subscribers.total.toLocaleString()} subscribers
                        </Badge>
                    }
                />

                {/* Consent Compliance Notice */}
                <Card className="border-l-4 border-l-emerald-500 py-4">
                    <CardContent className="flex items-start gap-3.5">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-success-border bg-status-success-bg text-status-success-fg">
                            <ShieldCheck
                                className="size-4.5"
                                aria-hidden="true"
                            />
                        </span>
                        <div className="space-y-1 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                            <span className="block font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                Strict Marketing &amp; Transactional Segregation
                            </span>
                            <p>
                                Marketing preferences are strictly separated
                                from transactional notifications (bookings,
                                payments, relocations). Unsubscribing from
                                promotional emails never impacts essential
                                reservation updates or OTP verifications.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Search & Filters */}
                <Card className="py-4">
                    <CardContent className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <form
                            onSubmit={handleSearch}
                            className="flex w-full flex-1 items-center gap-2"
                        >
                            <div className="relative flex-1">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    placeholder="Search by subscriber email or name..."
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>
                            <Button type="submit" variant="outline" size="sm">
                                Search
                            </Button>
                        </form>

                        <div className="flex items-center gap-2">
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(value) =>
                                    handleStatusFilter(
                                        value === 'all' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="w-full sm:w-44"
                                    aria-label="Filter subscribers by status"
                                >
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Statuses
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

                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearFilters}
                                >
                                    <X
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Clear</span>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Subscribers Table */}
                {subscribers.data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No subscribers found"
                        description="No subscribers match your search query or consent status filter."
                        action={
                            hasActiveFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearFilters}
                                >
                                    Reset Filters
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <Card className="overflow-hidden py-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subscriber Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Confirmed At</TableHead>
                                    <TableHead>Consent Records</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscribers.data.map((sub) => (
                                    <TableRow key={sub.id}>
                                        <TableCell>
                                            <div className="font-semibold text-tijum-plum dark:text-foreground">
                                                {sub.email}
                                            </div>
                                            {sub.name && (
                                                <div className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    {sub.name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={getSubscriberSemanticStatus(
                                                    sub.status,
                                                )}
                                                label={sub.status.replace(
                                                    '_',
                                                    ' ',
                                                )}
                                                className="text-[11px] capitalize"
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {sub.source}
                                        </TableCell>
                                        <TableCell className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            {sub.confirmed_at
                                                ? new Date(
                                                      sub.confirmed_at,
                                                  ).toLocaleDateString()
                                                : '—'}
                                            {sub.unsubscribed_at && (
                                                <span className="mt-0.5 block text-[11px] text-status-error-fg">
                                                    Opted out:{' '}
                                                    {new Date(
                                                        sub.unsubscribed_at,
                                                    ).toLocaleDateString()}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setSelectedSubscriber(sub)
                                                }
                                                className="tabular-nums"
                                            >
                                                <History
                                                    className="size-3.5 text-tijum-coral"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {sub.consent_records
                                                        ?.length ?? 0}{' '}
                                                    log(s)
                                                </span>
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {sub.status === 'subscribed' ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setSubscriberToUnsubscribe(
                                                            sub,
                                                        )
                                                    }
                                                    className="border-status-error-border text-status-error-fg hover:bg-status-error-bg/70 hover:text-status-error-fg"
                                                >
                                                    <UserX
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Unsubscribe</span>
                                                </Button>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[11px]"
                                                >
                                                    Opted Out
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {subscribers.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {subscribers.total ??
                                        subscribers.data.length}
                                </span>{' '}
                                subscriber(s)
                            </p>
                            <Pagination
                                currentPage={subscribers.current_page ?? 1}
                                lastPage={subscribers.last_page ?? 1}
                                total={subscribers.total}
                                onPageChange={(page) =>
                                    router.get(
                                        '/admin/marketing/subscribers',
                                        { ...filters, page },
                                        { preserveState: true },
                                    )
                                }
                            />
                        </div>
                    </Card>
                )}

                {/* Consent Audit Trail Dialog */}
                <Dialog
                    open={Boolean(selectedSubscriber)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSelectedSubscriber(null);
                        }
                    }}
                >
                    <DialogContent className="border-tijum-surface/80 bg-white text-tijum-plum sm:max-w-lg dark:border-border dark:bg-card dark:text-foreground">
                        <DialogHeader>
                            <DialogTitle className="text-tijum-plum dark:text-foreground">
                                Consent Audit Registry
                            </DialogTitle>
                            <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                                {selectedSubscriber?.email}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                            {!selectedSubscriber?.consent_records?.length ? (
                                <p className="rounded-xl border border-dashed border-tijum-surface/80 bg-tijum-cream/40 py-6 text-center text-xs text-tijum-plum-muted dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                    No audit records logged.
                                </p>
                            ) : (
                                selectedSubscriber.consent_records.map(
                                    (log) => (
                                        <div
                                            key={log.id}
                                            className="space-y-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-xs dark:border-border dark:bg-muted/45"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-[10px] font-bold uppercase"
                                                >
                                                    {log.action}
                                                </Badge>
                                                <span className="text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    {new Date(
                                                        log.created_at,
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-tijum-plum-muted dark:text-muted-foreground">
                                                Channel:{' '}
                                                <strong className="text-tijum-plum dark:text-foreground">
                                                    {log.channel}
                                                </strong>{' '}
                                                • Source:{' '}
                                                <strong className="text-tijum-plum dark:text-foreground">
                                                    {log.source}
                                                </strong>
                                            </div>
                                        </div>
                                    ),
                                )
                            )}
                        </div>

                        <DialogFooter className="border-t border-tijum-surface/80 pt-3 dark:border-border">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSubscriber(null)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Manual Opt-out Confirmation Dialog */}
                <ConfirmationDialog
                    open={Boolean(subscriberToUnsubscribe)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSubscriberToUnsubscribe(null);
                        }
                    }}
                    title="Opt Out Subscriber"
                    description={
                        subscriberToUnsubscribe
                            ? `Manually opt-out subscriber "${subscriberToUnsubscribe.email}"? An immutable consent audit record will be logged.`
                            : ''
                    }
                    confirmLabel="Unsubscribe"
                    tone="destructive"
                    loading={isUnsubscribing}
                    onConfirm={handleUnsubscribeConfirm}
                />
            </div>
        </AdminLayout>
    );
}
