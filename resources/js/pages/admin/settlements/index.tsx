import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Eye,
    IndianRupee,
    Percent,
    Plus,
    Scale,
    ShieldCheck,
} from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SettlementRow {
    id: number;
    settlement_reference: string;
    owner_name: string;
    owner_email: string;
    period_start: string;
    period_end: string;
    currency: string;
    gross_booking_value_minor: number;
    commission_amount_minor: number;
    commission_tax_amount_minor: number;
    statutory_deductions_minor: number;
    refund_adjustments_minor: number;
    net_settlement_amount_minor: number;
    status: string;
    status_label: string;
    provider_status?: string;
    settled_at?: string;
    created_at?: string;
    items_count: number;
}

interface Props {
    settlements: {
        data: SettlementRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    metrics: {
        total_settled_minor: number;
        total_approved_minor: number;
        total_draft_minor: number;
        total_failed_minor: number;
        total_commission_minor: number;
        total_tax_deducted_minor: number;
    };
    filters: {
        status?: string;
    };
}

function formatInr(minor: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(minor / 100);
}

function getStatusSemantic(status: string): SemanticStatus {
    switch (status) {
        case 'settled':
            return 'active';
        case 'approved':
            return 'verified';
        case 'transfer_pending':
        case 'pending_approval':
            return 'processing';
        case 'failed':
            return 'rejected';
        case 'on_hold':
            return 'suspended';
        case 'cancelled':
            return 'neutral';
        default:
            return 'pending';
    }
}

export default function AdminSettlementsIndex({
    settlements,
    metrics,
    filters,
}: Props) {
    const activeStatus = filters.status || 'all';

    const handleFilter = (status?: string) => {
        router.get('/admin/settlements', status ? { status } : {}, {
            preserveState: true,
        });
    };

    const handlePageChange = (page: number) => {
        router.get(
            '/admin/settlements',
            {
                ...(filters.status ? { status: filters.status } : {}),
                page,
            },
            { preserveState: true },
        );
    };

    return (
        <div className="space-y-6">
            <Head title="Settlements & Payouts Console" />

            <PageHeader
                eyebrow="Finance Administration"
                title="Partner Settlements Management"
                description="Review eligible reservation batches, authorize partner payouts, and monitor Razorpay Route transfers."
                badges={
                    <>
                        <Badge variant="plum">Finance Administration</Badge>
                        <Badge variant="outline" className="gap-1.5">
                            <ShieldCheck
                                className="size-3.5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>TOTP Guarded</span>
                        </Badge>
                    </>
                }
                actions={
                    <Button variant="default" asChild>
                        <Link href="/admin/settlements/candidates">
                            <Plus className="size-4" aria-hidden="true" />
                            <span>Discover Eligible Batches</span>
                        </Link>
                    </Button>
                }
            />

            {/* Metric KPI Cards */}
            <section
                aria-label="Settlement payout metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Total Settled to Partners"
                    value={formatInr(metrics.total_settled_minor)}
                    helperText="Authoritative provider transfer completed"
                    icon={CheckCircle2}
                    className="border-l-4 border-l-emerald-500"
                />

                <StatCard
                    label="Pending / Draft Settlements"
                    value={formatInr(metrics.total_draft_minor)}
                    helperText="Awaiting finance approval & release"
                    icon={Clock}
                />

                <StatCard
                    label="Platform Commission Earned"
                    value={formatInr(metrics.total_commission_minor)}
                    helperText="Contractual marketplace fees"
                    icon={Percent}
                    className="border-l-4 border-l-tijum-coral"
                />

                <StatCard
                    label="Statutory Withholding (TDS)"
                    value={formatInr(metrics.total_tax_deducted_minor)}
                    helperText="Section 393(1) 0.10% TDS withheld"
                    icon={Scale}
                    className="border-l-4 border-l-amber-500"
                />
            </section>

            {/* Pill Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    value={activeStatus}
                    onValueChange={(value) =>
                        handleFilter(value === 'all' ? undefined : value)
                    }
                    className="max-w-full space-y-0"
                >
                    <TabsList
                        variant="pill"
                        label="Filter settlements by batch status"
                        className="max-w-full"
                    >
                        <TabsTrigger value="all">All Settlements</TabsTrigger>
                        <TabsTrigger value="draft">Draft</TabsTrigger>
                        <TabsTrigger value="approved">Approved</TabsTrigger>
                        <TabsTrigger value="settled">Settled</TabsTrigger>
                        <TabsTrigger value="on_hold">On Hold</TabsTrigger>
                        <TabsTrigger value="failed">Failed</TabsTrigger>
                    </TabsList>
                </Tabs>

                {filters.status && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleFilter()}
                    >
                        Clear filter
                    </Button>
                )}
            </div>

            {/* Settlements Ledger */}
            {settlements.data.length === 0 ? (
                <EmptyState
                    icon={IndianRupee}
                    title="No settlements found"
                    description="No settlement batches match the selected status filter."
                    action={
                        filters.status ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleFilter()}
                            >
                                View all settlements
                            </Button>
                        ) : (
                            <Button variant="default" asChild>
                                <Link href="/admin/settlements/candidates">
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Discover Eligible Batches</span>
                                </Link>
                            </Button>
                        )
                    }
                />
            ) : (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-4 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                                Settlements Queue
                            </CardTitle>
                            <Badge variant="outline" className="tabular-nums">
                                {settlements.total} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-4 whitespace-nowrap">
                                        Reference
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Partner
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Period
                                    </TableHead>
                                    <TableHead className="px-3 text-right whitespace-nowrap">
                                        Gross Booking
                                    </TableHead>
                                    <TableHead className="px-3 text-right whitespace-nowrap">
                                        Commission
                                    </TableHead>
                                    <TableHead className="px-3 text-right whitespace-nowrap">
                                        TDS (0.1%)
                                    </TableHead>
                                    <TableHead className="px-3 text-right whitespace-nowrap">
                                        Net Payable
                                    </TableHead>
                                    <TableHead className="px-3 whitespace-nowrap">
                                        Status
                                    </TableHead>
                                    <TableHead className="px-4 text-right whitespace-nowrap">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {settlements.data.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="max-w-[175px] px-4 py-3 whitespace-nowrap">
                                            <span
                                                title={s.settlement_reference}
                                                className="block truncate font-mono text-xs font-bold text-tijum-coral tabular-nums"
                                            >
                                                {s.settlement_reference}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                {s.items_count} stays
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-[175px] px-3 py-3">
                                            <span
                                                title={s.owner_name}
                                                className="block truncate font-heading text-sm font-semibold text-tijum-plum dark:text-foreground"
                                            >
                                                {s.owner_name}
                                            </span>
                                            <span
                                                title={s.owner_email}
                                                className="block truncate text-xs text-tijum-plum-muted dark:text-muted-foreground"
                                            >
                                                {s.owner_email}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-xs whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            {s.period_start} – {s.period_end}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                                            {formatInr(
                                                s.gross_booking_value_minor,
                                            )}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-right font-medium whitespace-nowrap text-status-warning-fg tabular-nums">
                                            -{' '}
                                            {formatInr(
                                                s.commission_amount_minor +
                                                    s.commission_tax_amount_minor,
                                            )}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-right font-medium whitespace-nowrap text-status-warning-fg tabular-nums">
                                            -{' '}
                                            {formatInr(
                                                s.statutory_deductions_minor,
                                            )}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 text-right font-heading text-sm font-bold whitespace-nowrap text-tijum-plum tabular-nums dark:text-foreground">
                                            {formatInr(
                                                s.net_settlement_amount_minor,
                                            )}
                                        </TableCell>
                                        <TableCell className="px-3 py-3 whitespace-nowrap">
                                            <StatusBadge
                                                status={getStatusSemantic(
                                                    s.status,
                                                )}
                                                label={s.status_label}
                                            />
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={`/admin/settlements/${s.id}`}
                                                >
                                                    <Eye
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Review</span>
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
                                    {settlements.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {settlements.total}
                                </span>{' '}
                                settlement{settlements.total === 1 ? '' : 's'}
                            </p>
                            <Pagination
                                currentPage={settlements.current_page}
                                totalPages={settlements.last_page}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
