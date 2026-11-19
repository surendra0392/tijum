import { Head, Link, router } from '@inertiajs/react';
import {
    Download,
    Eye,
    FileSpreadsheet,
    Info,
    Wallet,
} from 'lucide-react';
import {
    OWNER_FINANCE_TABS,
    OwnerSectionTabs,
} from '@/components/owner/owner-section-tabs';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import type { PartnerSettlement } from '@/types';

interface Props {
    settlements: {
        data: PartnerSettlement[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    metrics: {
        settled_total_minor: number;
        approved_total_minor: number;
        pending_total_minor: number;
        on_hold_total_minor: number;
        commission_paid_minor: number;
        tax_deducted_minor: number;
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

export default function OwnerSettlementsIndex({
    settlements,
    metrics,
    filters,
}: Props) {
    const handleFilterChange = (status: string) => {
        router.get('/owner/settlements', status ? { status } : {}, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Partner Settlements & Earnings" />

            <div className="space-y-6">
                <OwnerSectionTabs
                    items={OWNER_FINANCE_TABS}
                    ariaLabel="Earnings and payouts navigation"
                />

                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-tijum-coral/12 text-tijum-coral">
                                <Wallet className="size-5" />
                            </span>
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl dark:text-foreground">
                                Settlements &amp; Earnings
                            </h1>
                        </div>
                        <p className="mt-1 font-body text-sm text-tijum-plum-muted dark:text-muted-foreground">
                            Transparent booking-level settlement statements,
                            contractual commission deductions, and provider
                            transfers.
                        </p>
                    </div>
                </div>

                {/* Regulatory Disclosure Banner */}
                <div className="rounded-2xl border border-tijum-surface bg-card p-4 shadow-tijum-card dark:border-border">
                    <div className="flex items-start gap-3">
                        <Info className="mt-0.5 size-4.5 shrink-0 text-tijum-coral" />
                        <div className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                            <strong className="font-semibold text-tijum-plum dark:text-foreground">
                                RBI Payment Provider Settlement:
                            </strong>{' '}
                            TIJUM facilitates bookings and calculates
                            contractual commissions under your agreed terms.
                            Fund transfers are disbursed directly through
                            authorized payment aggregator infrastructure
                            (Razorpay Route) to your verified settlement bank
                            account. TIJUM does not operate stored-value wallets
                            or hold escrow funds.
                        </div>
                    </div>
                </div>

                {/* Metrics Overview Cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                Total Settled (Paid)
                            </CardDescription>
                            <CardTitle className="font-heading text-xl font-bold tabular-nums text-tijum-plum sm:text-2xl dark:text-foreground">
                                {formatInr(metrics.settled_total_minor)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-[11px] text-status-success-fg">
                            Disbursed to verified bank account
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                Approved for Transfer
                            </CardDescription>
                            <CardTitle className="font-heading text-xl font-bold tabular-nums text-tijum-coral sm:text-2xl">
                                {formatInr(metrics.approved_total_minor)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                            Awaiting provider dispatch cycle
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                Draft / Review Pending
                            </CardDescription>
                            <CardTitle className="font-heading text-xl font-bold tabular-nums text-tijum-plum sm:text-2xl dark:text-foreground">
                                {formatInr(metrics.pending_total_minor)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                            Subject to standard stay checkout hold
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                Total Commission Deducted
                            </CardDescription>
                            <CardTitle className="font-heading text-xl font-bold tabular-nums text-tijum-plum sm:text-2xl dark:text-foreground">
                                {formatInr(metrics.commission_paid_minor)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                            Marketplace facilitation fee
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Tabs */}
                <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-card p-1.5 shadow-tijum-card dark:border-border">
                    {[
                        { key: 'all', label: 'All Statements' },
                        { key: 'draft', label: 'Draft' },
                        { key: 'pending_approval', label: 'Pending Approval' },
                        { key: 'approved', label: 'Approved' },
                        { key: 'settled', label: 'Settled' },
                        { key: 'on_hold', label: 'On Hold' },
                        { key: 'failed', label: 'Failed' },
                    ].map((st) => {
                        const active =
                            (!filters.status && st.key === 'all') ||
                            filters.status === st.key;
                        return (
                            <button
                                key={st.key}
                                type="button"
                                onClick={() =>
                                    handleFilterChange(
                                        st.key === 'all' ? '' : st.key,
                                    )
                                }
                                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                                    active
                                        ? 'bg-tijum-plum text-tijum-cream shadow-xs dark:bg-tijum-coral dark:text-white'
                                        : 'text-tijum-plum-muted hover:bg-tijum-cream/80 hover:text-tijum-plum dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground'
                                }`}
                            >
                                {st.label}
                            </button>
                        );
                    })}
                </div>

                {/* Settlements Table */}
                <div className="overflow-hidden rounded-2xl border border-tijum-surface/90 bg-card shadow-tijum-card dark:border-border">
                    {settlements.data.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileSpreadsheet className="mx-auto size-12 text-tijum-plum-muted/40 dark:text-muted-foreground/50" />
                            <h3 className="mt-4 font-heading text-lg font-semibold text-tijum-plum dark:text-foreground">
                                No Settlement Statements Found
                            </h3>
                            <p className="mt-1 text-sm text-tijum-plum-muted dark:text-muted-foreground">
                                Once customer bookings pass the scheduled
                                checkout date and settlement review, statements
                                will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left font-body text-sm">
                                <thead className="border-b border-tijum-surface bg-tijum-cream/40 text-xs font-semibold text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                                    <tr>
                                        <th className="px-6 py-4">Reference</th>
                                        <th className="px-6 py-4">
                                            Stay Period
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Gross Bookings
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Commission
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Net Payable
                                        </th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-tijum-surface/70 dark:divide-border">
                                    {settlements.data.map((settlement) => (
                                        <tr
                                            key={settlement.id}
                                            className="transition-colors hover:bg-tijum-cream/25 dark:hover:bg-muted/35"
                                        >
                                            <td className="px-6 py-4 font-medium text-tijum-plum dark:text-foreground">
                                                <div className="font-mono text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                    {
                                                        settlement.settlement_reference
                                                    }
                                                </div>
                                                <div className="text-[11px] tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                                    {settlement.items_count}{' '}
                                                    booking(s)
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                                {settlement.period_start} to{' '}
                                                {settlement.period_end}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium tabular-nums text-tijum-plum dark:text-foreground">
                                                {formatInr(
                                                    settlement.gross_booking_value_minor,
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                                                -
                                                {formatInr(
                                                    settlement.commission_amount_minor,
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold tabular-nums text-tijum-plum dark:text-foreground">
                                                {formatInr(
                                                    settlement.net_settlement_amount_minor,
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge
                                                    status={getStatusSemantic(
                                                        settlement.status,
                                                    )}
                                                    label={
                                                        settlement.status_label
                                                    }
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/owner/settlements/${settlement.settlement_reference}`}
                                                        >
                                                            <Eye className="mr-1 size-4" />
                                                            View
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                        title="Download Settlement CSV / Excel"
                                                    >
                                                        <a
                                                            href={`/owner/settlements/${settlement.settlement_reference}/export-csv`}
                                                            download={`settlement-${settlement.settlement_reference}.csv`}
                                                        >
                                                            <Download className="mr-1 size-4 text-tijum-coral" />
                                                            CSV
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/owner/settlements/${settlement.settlement_reference}/statement`}
                                                        >
                                                            Statement
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-6 py-3.5 dark:border-border dark:bg-muted/20">
                                <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    Showing{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {settlements.data.length}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {settlements.total}
                                    </span>{' '}
                                    settlement
                                    {settlements.total === 1 ? '' : 's'}
                                </p>
                                <Pagination
                                    currentPage={settlements.current_page}
                                    totalPages={settlements.last_page}
                                    onPageChange={(page) =>
                                        router.get(
                                            '/owner/settlements',
                                            {
                                                ...(filters.status
                                                    ? { status: filters.status }
                                                    : {}),
                                                page,
                                            },
                                            {
                                                preserveState: true,
                                                preserveScroll: true,
                                            },
                                        )
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
