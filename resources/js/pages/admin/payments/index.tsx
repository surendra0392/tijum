import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    CreditCard,
    Eye,
    IndianRupee,
    RotateCcw,
    Search,
    ShieldAlert,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

function formatPrice(minor: number, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(minor / 100);
}

type PaymentRow = {
    id: number;
    gateway: string;
    gateway_order_id: string;
    gateway_payment_id: string | null;
    amount_minor: number;
    refunded_amount_minor: number;
    currency_code: string;
    status: string;
    status_label: string;
    payment_method: string | null;
    customer_name: string | null;
    customer_email: string | null;
    booking_reference: string | null;
    property_name: string | null;
    captured_at: string | null;
    created_at: string;
};

type PaymentsIndexProps = {
    payments: {
        data: PaymentRow[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        status?: string;
        search?: string;
    };
    statusOptions: Array<{ value: string; label: string }>;
};

function getPaymentSemantic(st: string): SemanticStatus {
    switch (st) {
        case 'captured':
            return 'verified';
        case 'authorized':
            return 'info';
        case 'refund_pending':
            return 'warning';
        case 'refunded':
        case 'partially_refunded':
            return 'neutral';
        case 'failed':
            return 'rejected';
        case 'cancelled':
            return 'cancelled';
        default:
            return 'pending';
    }
}

export default function AdminPaymentsIndex({
    payments,
    filters,
    statusOptions,
}: PaymentsIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status || 'all');

    const handleFilter = (newSearch?: string, newStatus?: string) => {
        const s = newSearch !== undefined ? newSearch : search;
        const st = newStatus !== undefined ? newStatus : status;

        router.get(
            '/admin/payments',
            {
                search: s || undefined,
                status: st === 'all' ? undefined : st,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatus('all');
        router.get('/admin/payments', {}, { preserveState: true });
    };

    const capturedVolumeMinor = payments.data
        .filter((p) => p.status === 'captured')
        .reduce((acc, p) => acc + p.amount_minor, 0);
    const refundedVolumeMinor = payments.data.reduce(
        (acc, p) => acc + p.refunded_amount_minor,
        0,
    );
    const capturedCountOnPage = payments.data.filter(
        (p) => p.status === 'captured',
    ).length;

    return (
        <div className="space-y-6">
            <Head title="Payments · Admin" />

            <PageHeader
                eyebrow="Financial Operations"
                title="Payment Oversight"
                description="Monitor Razorpay customer transactions, authorization states, and admin refund histories across all reservations."
            />

            {/* Financial KPI Strip */}
            <section
                aria-label="Payment ledger metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Matching Transactions"
                    value={payments.total}
                    helperText="Total across current query"
                    icon={CreditCard}
                />
                <StatCard
                    label="Captured Volume (Page)"
                    value={formatPrice(capturedVolumeMinor)}
                    helperText={`${capturedCountOnPage} captured records`}
                    icon={IndianRupee}
                    className="border-l-4 border-l-emerald-500"
                />
                <StatCard
                    label="Refunded Volume (Page)"
                    value={formatPrice(refundedVolumeMinor)}
                    helperText="Gateway refunds recorded"
                    icon={ShieldAlert}
                    className="border-l-4 border-l-amber-500"
                />
                <StatCard
                    label="Captured Share (Page)"
                    value={
                        payments.data.length > 0
                            ? `${Math.round((capturedCountOnPage / payments.data.length) * 100)}%`
                            : '0%'
                    }
                    helperText="Settlement-eligible captures"
                    icon={CheckCircle2}
                    className="border-l-4 border-l-tijum-coral"
                />
            </section>

            {/* Search Card (Separate from Status Pill Tabs) */}
            <Card className="py-4">
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleFilter();
                        }}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center"
                    >
                        <div className="relative flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by booking ref, order ID, payment ID, or customer…"
                                className="h-10 pl-10 text-sm"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="submit" size="sm" variant="default">
                                Filter
                            </Button>

                            {(search || status !== 'all') && (
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
                                    <span>Clear</span>
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Standalone Status Filter Pill Tabs */}
            <Tabs
                value={status || 'all'}
                onValueChange={(val) => {
                    setStatus(val);
                    handleFilter(search, val);
                }}
                className="max-w-full space-y-0"
            >
                <TabsList
                    variant="pill"
                    label="Filter payments by transaction status"
                    className="max-w-full"
                >
                    <TabsTrigger value="all">
                        All Statuses ({payments.total})
                    </TabsTrigger>
                    {statusOptions.map((opt) => (
                        <TabsTrigger key={opt.value} value={opt.value}>
                            {opt.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Payments Table */}
            {payments.data.length === 0 ? (
                <EmptyState
                    icon={CreditCard}
                    title="No payments found"
                    description="No payment records match the current filter criteria."
                    action={
                        (search || status !== 'all') && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReset}
                            >
                                Clear filters
                            </Button>
                        )
                    }
                />
            ) : (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-4 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                                Gateway Transactions Ledger
                            </CardTitle>
                            <Badge variant="outline" className="tabular-nums">
                                {payments.total} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-4 whitespace-nowrap">
                                        Reference / Order
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Customer
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Property
                                    </TableHead>
                                    <TableHead className="px-3 text-right whitespace-nowrap">
                                        Amount
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Status
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Date
                                    </TableHead>
                                    <TableHead className="px-4 text-right whitespace-nowrap">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.data.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="max-w-[190px] px-4 py-3">
                                            <p
                                                title={
                                                    payment.booking_reference ||
                                                    undefined
                                                }
                                                className="truncate font-mono text-xs font-semibold whitespace-nowrap text-tijum-plum tabular-nums dark:text-foreground"
                                            >
                                                {payment.booking_reference ||
                                                    '—'}
                                            </p>
                                            <p
                                                title={
                                                    payment.gateway_payment_id ||
                                                    payment.gateway_order_id
                                                }
                                                className="mt-0.5 truncate font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground"
                                            >
                                                {payment.gateway_payment_id ||
                                                    payment.gateway_order_id}
                                            </p>
                                        </TableCell>
                                        <TableCell className="max-w-[185px] px-3 py-3">
                                            <p
                                                title={
                                                    payment.customer_name ||
                                                    undefined
                                                }
                                                className="truncate font-medium text-tijum-plum dark:text-foreground"
                                            >
                                                {payment.customer_name ||
                                                    'Guest'}
                                            </p>
                                            <p
                                                title={
                                                    payment.customer_email ||
                                                    undefined
                                                }
                                                className="mt-0.5 truncate text-xs text-tijum-plum-muted dark:text-muted-foreground"
                                            >
                                                {payment.customer_email || '—'}
                                            </p>
                                        </TableCell>
                                        <TableCell className="max-w-[180px] px-3 py-3">
                                            <p
                                                title={
                                                    payment.property_name ||
                                                    undefined
                                                }
                                                className="truncate font-medium text-tijum-plum dark:text-foreground"
                                            >
                                                {payment.property_name || '—'}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-right whitespace-nowrap">
                                            <p className="font-heading font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                                {formatPrice(
                                                    payment.amount_minor,
                                                    payment.currency_code,
                                                )}
                                            </p>
                                            {payment.refunded_amount_minor >
                                                0 && (
                                                <p className="mt-0.5 text-xs font-medium text-status-warning-fg tabular-nums">
                                                    Refunded:{' '}
                                                    {formatPrice(
                                                        payment.refunded_amount_minor,
                                                        payment.currency_code,
                                                    )}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 whitespace-nowrap">
                                            <StatusBadge
                                                status={getPaymentSemantic(
                                                    payment.status,
                                                )}
                                                label={payment.status_label}
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-xs whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            {new Date(
                                                payment.created_at,
                                            ).toLocaleDateString('en-IN', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="outline"
                                            >
                                                <Link
                                                    href={`/admin/payments/${payment.id}`}
                                                >
                                                    <Eye
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>View</span>
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
                                    {payments.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {payments.total}
                                </span>{' '}
                                payment{payments.total === 1 ? '' : 's'}
                            </p>
                            <Pagination
                                currentPage={payments.current_page}
                                totalPages={payments.last_page}
                                onPageChange={(p) => {
                                    router.get(
                                        '/admin/payments',
                                        {
                                            search: search || undefined,
                                            status:
                                                status === 'all'
                                                    ? undefined
                                                    : status,
                                            page: p,
                                        },
                                        { preserveState: true },
                                    );
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
