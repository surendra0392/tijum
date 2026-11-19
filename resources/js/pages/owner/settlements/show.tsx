import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Download,
    Printer,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import {
    OWNER_FINANCE_TABS,
    OwnerSectionTabs,
} from '@/components/owner/owner-section-tabs';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

interface SettlementItem {
    id: number;
    booking_reference: string;
    property_name: string;
    stay_dates: string;
    item_type: string;
    item_type_label: string;
    gross_amount_minor: number;
    commission_amount_minor: number;
    commission_tax_amount_minor: number;
    tax_deduction_minor: number;
    net_payable_minor: number;
    notes?: string;
}

interface SettlementDetails {
    id: number;
    settlement_reference: string;
    period_start: string;
    period_end: string;
    currency: string;
    gross_booking_value_minor: number;
    commission_amount_minor: number;
    commission_tax_amount_minor: number;
    statutory_deductions_minor: number;
    refund_adjustments_minor: number;
    relocation_adjustments_minor: number;
    other_adjustments_minor: number;
    net_settlement_amount_minor: number;
    status: string;
    status_label: string;
    provider_transfer_id?: string;
    provider_status?: string;
    failure_reason?: string;
    settled_at?: string;
    transfer_initiated_at?: string;
    created_at?: string;
    bank_account_masked?: string;
    bank_name?: string;
    bank_ifsc?: string;
    items: SettlementItem[];
}

interface Props {
    settlement: SettlementDetails;
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

export default function SettlementShow({ settlement }: Props) {
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const totalPages = Math.max(
        1,
        Math.ceil(settlement.items.length / pageSize),
    );
    const safePage = Math.min(page, totalPages);
    const pagedItems = settlement.items.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );

    return (
        <div className="space-y-6">
            <Head title={`Settlement ${settlement.settlement_reference}`} />

            <OwnerSectionTabs
                items={OWNER_FINANCE_TABS}
                ariaLabel="Earnings and payouts navigation"
            />

            {/* Back link & actions bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/owner/settlements">
                            <ArrowLeft className="mr-1.5 size-4" />
                            Back to Settlements
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-plum dark:text-foreground">
                                {settlement.settlement_reference}
                            </h1>
                            <StatusBadge
                                status={getStatusSemantic(settlement.status)}
                                label={settlement.status_label}
                            />
                        </div>
                        <p className="mt-0.5 text-xs tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                            Settlement Period: {settlement.period_start} to{' '}
                            {settlement.period_end}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button variant="outline" size="sm" asChild>
                        <a
                            href={`/owner/settlements/${settlement.settlement_reference}/export-csv`}
                            download={`settlement-${settlement.settlement_reference}.csv`}
                        >
                            <Download className="mr-1.5 size-4 text-tijum-coral" />
                            Export CSV
                        </a>
                    </Button>
                    <Button variant="default" size="sm" asChild>
                        <a
                            href={`/owner/settlements/${settlement.settlement_reference}/statement`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Printer className="mr-1.5 size-4" />
                            Print Statement
                        </a>
                    </Button>
                </div>
            </div>

            {/* Summary KPI Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            Gross Bookings
                        </CardDescription>
                        <CardTitle className="font-heading text-xl font-bold tabular-nums text-tijum-plum dark:text-foreground">
                            {formatInr(settlement.gross_booking_value_minor)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        Total customer revenue across {settlement.items.length}{' '}
                        reservations
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            Marketplace Commission
                        </CardDescription>
                        <CardTitle className="font-heading text-xl font-bold tabular-nums text-amber-800 dark:text-amber-300">
                            -{' '}
                            {formatInr(
                                settlement.commission_amount_minor +
                                    settlement.commission_tax_amount_minor,
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs tabular-nums text-tijum-plum-muted dark:text-muted-foreground">
                        Platform fee{' '}
                        {formatInr(settlement.commission_amount_minor)} + GST{' '}
                        {formatInr(settlement.commission_tax_amount_minor)}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                            Statutory Withholding (TDS)
                        </CardDescription>
                        <CardTitle className="font-heading text-xl font-bold tabular-nums text-amber-900 dark:text-amber-300">
                            - {formatInr(settlement.statutory_deductions_minor)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        Income-tax Act Section 393(1) (0.10% TDS)
                    </CardContent>
                </Card>

                <Card className="border-emerald-300 border-l-4 border-l-emerald-500 dark:border-emerald-500/40">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold tracking-wider text-emerald-800 uppercase dark:text-emerald-300">
                            Net Payable to Partner
                        </CardDescription>
                        <CardTitle className="font-heading text-2xl font-bold tabular-nums text-emerald-900 dark:text-emerald-200">
                            {formatInr(settlement.net_settlement_amount_minor)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-emerald-700 dark:text-emerald-300/90">
                        {settlement.bank_account_masked ? (
                            <span>
                                Bank: {settlement.bank_account_masked} (
                                {settlement.bank_name ?? 'Verified Bank'})
                            </span>
                        ) : (
                            <span>Destination bank account pending</span>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Payout & Banking Status Panel */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                        <ShieldCheck className="size-5 text-tijum-coral" />
                        Disbursement &amp; Gateway Transfer Details
                    </CardTitle>
                    <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        All marketplace settlements flow via RBI-authorized
                        Payment Aggregator Route infrastructure directly to your
                        registered bank account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-6 rounded-2xl border border-tijum-peach/35 bg-tijum-cream/45 p-5 text-xs md:grid-cols-3 dark:border-border dark:bg-muted/45">
                        <div className="space-y-1">
                            <span className="font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Payout Destination
                            </span>
                            <p className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                {settlement.bank_account_masked ??
                                    'No account configured'}
                            </p>
                            <p className="text-tijum-plum-muted dark:text-muted-foreground">
                                IFSC: {settlement.bank_ifsc ?? 'N/A'} •{' '}
                                {settlement.bank_name ?? 'Bank'}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <span className="font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Provider Transfer Status
                            </span>
                            <p className="flex items-center gap-1.5 font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                <span className="size-2 rounded-full bg-tijum-coral" />
                                {settlement.provider_status ??
                                    'Pending Initiation'}
                            </p>
                            {settlement.provider_transfer_id && (
                                <p className="font-mono text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    Ref: {settlement.provider_transfer_id}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1 tabular-nums">
                            <span className="font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Settlement Dates
                            </span>
                            <p className="text-tijum-plum dark:text-foreground">
                                <strong>Generated:</strong>{' '}
                                {settlement.created_at
                                    ? new Date(
                                          settlement.created_at,
                                      ).toLocaleDateString()
                                    : '—'}
                            </p>
                            <p className="text-tijum-plum dark:text-foreground">
                                <strong>Settled:</strong>{' '}
                                {settlement.settled_at
                                    ? new Date(
                                          settlement.settled_at,
                                      ).toLocaleDateString()
                                    : 'Awaiting transfer'}
                            </p>
                        </div>
                    </div>

                    {settlement.failure_reason && (
                        <div className="mt-4 rounded-xl border border-status-error-border bg-status-error-bg p-4 text-xs text-status-error-fg">
                            <strong>Transfer Hold / Error:</strong>{' '}
                            {settlement.failure_reason}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Itemized Line Items Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                        Itemized Reservations &amp; Adjustments (
                        {settlement.items.length})
                    </CardTitle>
                    <CardDescription className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                        Transparent breakdown of room charges, agreed platform
                        commissions, applicable GST, and net payable per stay.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-tijum-surface bg-tijum-cream/50 font-heading font-semibold tracking-wider text-tijum-plum uppercase dark:border-border dark:bg-muted/45 dark:text-foreground">
                                <tr>
                                    <th className="px-5 py-3.5">
                                        Booking / Property
                                    </th>
                                    <th className="px-5 py-3.5">Stay Dates</th>
                                    <th className="px-5 py-3.5 text-right">
                                        Gross Value
                                    </th>
                                    <th className="px-5 py-3.5 text-right">
                                        Commission
                                    </th>
                                    <th className="px-5 py-3.5 text-right">
                                        Comm. GST (18%)
                                    </th>
                                    <th className="px-5 py-3.5 text-right">
                                        TDS (0.1%)
                                    </th>
                                    <th className="px-5 py-3.5 text-right font-bold">
                                        Net Partner Payable
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-tijum-surface/70 text-tijum-plum tabular-nums dark:divide-border dark:text-foreground">
                                {pagedItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="transition-colors hover:bg-tijum-cream/25 dark:hover:bg-muted/35"
                                    >
                                        <td className="px-5 py-4 font-medium">
                                            <span className="block font-mono font-bold text-tijum-coral dark:text-tijum-peach">
                                                {item.booking_reference}
                                            </span>
                                            <span className="text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                {item.property_name}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-tijum-plum-muted dark:text-muted-foreground">
                                            {item.stay_dates}
                                        </td>
                                        <td className="px-5 py-4 text-right font-semibold">
                                            {formatInr(item.gross_amount_minor)}
                                        </td>
                                        <td className="px-5 py-4 text-right text-amber-800 dark:text-amber-300">
                                            -{' '}
                                            {formatInr(
                                                item.commission_amount_minor,
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right text-amber-800 dark:text-amber-300">
                                            -{' '}
                                            {formatInr(
                                                item.commission_tax_amount_minor,
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right text-amber-900 dark:text-amber-300">
                                            -{' '}
                                            {formatInr(
                                                item.tax_deduction_minor,
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right font-heading text-sm font-bold text-emerald-900 dark:text-emerald-300">
                                            {formatInr(item.net_payable_minor)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-tijum-surface bg-tijum-cream/40 font-heading font-bold text-tijum-plum tabular-nums dark:border-border dark:bg-muted/45 dark:text-foreground">
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="px-5 py-4 text-sm"
                                    >
                                        Total Settlement Summary
                                    </td>
                                    <td className="px-5 py-4 text-right text-sm">
                                        {formatInr(
                                            settlement.gross_booking_value_minor,
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right text-sm text-amber-800 dark:text-amber-300">
                                        -{' '}
                                        {formatInr(
                                            settlement.commission_amount_minor,
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right text-sm text-amber-800 dark:text-amber-300">
                                        -{' '}
                                        {formatInr(
                                            settlement.commission_tax_amount_minor,
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right text-sm text-amber-900 dark:text-amber-300">
                                        -{' '}
                                        {formatInr(
                                            settlement.statutory_deductions_minor,
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right text-base font-bold text-emerald-900 dark:text-emerald-300">
                                        {formatInr(
                                            settlement.net_settlement_amount_minor,
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {settlement.items.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
                            <span>
                                Showing {(safePage - 1) * pageSize + 1}–
                                {Math.min(
                                    safePage * pageSize,
                                    settlement.items.length,
                                )}{' '}
                                of {settlement.items.length} line item
                                {settlement.items.length === 1 ? '' : 's'}
                            </span>
                            <Pagination
                                currentPage={safePage}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Regulatory & Tax Disclosure Notice */}
            <div className="space-y-2 rounded-2xl border border-tijum-surface/80 bg-card p-5 text-xs text-tijum-plum-muted shadow-tijum-card dark:border-border dark:text-muted-foreground">
                <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                    Regulatory &amp; Accounting Disclosure
                </p>
                <p>
                    TIJUM acts strictly as an online marketplace aggregator
                    connecting verified guests with independent accommodation
                    operators. All funds collection and bank settlement
                    transfers are processed through RBI-authorized payment
                    aggregator infrastructure.
                </p>
                <p>
                    Income-tax withholding has been computed in compliance with
                    Section 393(1) Table Sl. No. 8(v) of the Income-tax Act,
                    2025 (effective April 1, 2026). This document is an internal
                    settlement voucher and does not constitute a statutory GST
                    tax invoice.
                </p>
            </div>
        </div>
    );
}
