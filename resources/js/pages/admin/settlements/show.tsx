import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Download,
    FileText,
    IndianRupee,
    PauseCircle,
    Percent,
    Scale,
    Send,
    ShieldCheck,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

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

interface AdminSettlementData {
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
    relocation_adjustments_minor: number;
    other_adjustments_minor: number;
    net_settlement_amount_minor: number;
    status: string;
    status_label: string;
    approved_by?: string;
    approved_at?: string;
    transfer_initiated_at?: string;
    settled_at?: string;
    provider_transfer_id?: string;
    provider_status?: string;
    failure_reason?: string;
    admin_notes?: string;
    bank_account_masked?: string;
    bank_name?: string;
    bank_ifsc?: string;
    razorpay_account_id?: string;
    items: SettlementItem[];
}

interface Props {
    settlement: AdminSettlementData;
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

export default function AdminSettlementShow({ settlement }: Props) {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
    const [holdDialogOpen, setHoldDialogOpen] = useState(false);
    const [holdReason, setHoldReason] = useState('');
    const [holdError, setHoldError] = useState<string | null>(null);
    const [itemsPage, setItemsPage] = useState(1);
    const itemsPageSize = 15;
    const totalItemsPages = Math.max(
        1,
        Math.ceil(settlement.items.length / itemsPageSize),
    );
    const safeItemsPage = Math.min(itemsPage, totalItemsPages);
    const pagedItems = settlement.items.slice(
        (safeItemsPage - 1) * itemsPageSize,
        safeItemsPage * itemsPageSize,
    );

    const handleApprove = () => {
        setActionLoading('approve');
        router.post(
            `/admin/settlements/${settlement.id}/approve`,
            {},
            { onFinish: () => setActionLoading(null) },
        );
    };

    const handleReleaseConfirm = () => {
        setActionLoading('release');
        router.post(
            `/admin/settlements/${settlement.id}/release`,
            {},
            {
                onSuccess: () => setReleaseDialogOpen(false),
                onFinish: () => setActionLoading(null),
            },
        );
    };

    const handleHoldSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = holdReason.trim();
        if (!trimmed) {
            setHoldError('Please provide a reason for placing this batch on hold.');
            return;
        }
        setHoldError(null);
        setActionLoading('hold');
        router.post(
            `/admin/settlements/${settlement.id}/hold`,
            { reason: trimmed },
            {
                onSuccess: () => {
                    setHoldDialogOpen(false);
                    setHoldReason('');
                },
                onFinish: () => setActionLoading(null),
            },
        );
    };

    const hasAdjustments =
        settlement.refund_adjustments_minor !== 0 ||
        settlement.relocation_adjustments_minor !== 0 ||
        settlement.other_adjustments_minor !== 0;

    return (
        <div className="space-y-6">
            <Head
                title={`Settlement Review - ${settlement.settlement_reference}`}
            />

            <PageHeader
                eyebrow="Settlement Batch Review"
                title={settlement.settlement_reference}
                description={`Partner: ${settlement.owner_name} (${settlement.owner_email}) · Billing Period ${settlement.period_start} to ${settlement.period_end}`}
                badges={
                    <>
                        <StatusBadge
                            status={getStatusSemantic(settlement.status)}
                            label={settlement.status_label}
                        />
                        <Badge variant="outline" className="tabular-nums">
                            {settlement.items.length} stays
                        </Badge>
                    </>
                }
                actions={
                    <>
                        <Button variant="outline" asChild>
                            <Link href="/admin/settlements">
                                <ArrowLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Back to Settlements</span>
                            </Link>
                        </Button>

                        <Button variant="outline" asChild>
                            <a
                                href={`/admin/settlements/${settlement.id}/export-csv`}
                                download
                            >
                                <Download
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Export Statement CSV</span>
                            </a>
                        </Button>

                        {settlement.status === 'draft' && (
                            <Button
                                type="button"
                                variant="default"
                                loading={actionLoading === 'approve'}
                                onClick={handleApprove}
                            >
                                <CheckCircle2
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Approve Settlement Batch</span>
                            </Button>
                        )}

                        {settlement.status === 'approved' && (
                            <Button
                                type="button"
                                variant="default"
                                loading={actionLoading === 'release'}
                                onClick={() => setReleaseDialogOpen(true)}
                                className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                            >
                                <Send className="size-4" aria-hidden="true" />
                                <span>Release Payout via Route</span>
                            </Button>
                        )}

                        {settlement.status !== 'settled' &&
                            settlement.status !== 'cancelled' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    loading={actionLoading === 'hold'}
                                    onClick={() => {
                                        setHoldError(null);
                                        setHoldDialogOpen(true);
                                    }}
                                    className="border-status-warning-border text-status-warning-fg hover:bg-status-warning-bg"
                                >
                                    <PauseCircle
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Place on Hold</span>
                                </Button>
                            )}
                    </>
                }
            />

            {/* Error or Notes Alerts */}
            {settlement.failure_reason && (
                <Alert
                    variant="destructive"
                    className="border-l-4 border-l-destructive"
                >
                    <AlertCircle className="size-4" />
                    <AlertTitle>Transfer Failure / Hold Exception</AlertTitle>
                    <AlertDescription>
                        {settlement.failure_reason}
                    </AlertDescription>
                </Alert>
            )}

            {settlement.admin_notes && (
                <Card className="border-l-4 border-l-tijum-plum py-4 dark:border-l-tijum-coral">
                    <CardContent className="flex items-start gap-3">
                        <FileText
                            className="mt-0.5 size-4 shrink-0 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <div className="space-y-1 text-xs">
                            <p className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                Administrative Audit Notes
                            </p>
                            <p className="whitespace-pre-line text-tijum-plum-muted dark:text-muted-foreground">
                                {settlement.admin_notes}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Financial Totals Grid */}
            <section
                aria-label="Settlement financial breakdown"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Gross Fulfilled Bookings"
                    value={formatInr(settlement.gross_booking_value_minor)}
                    helperText={`Across ${settlement.items.length} checkout-passed reservations`}
                    icon={IndianRupee}
                />

                <StatCard
                    label="Platform Commission"
                    value={`- ${formatInr(
                        settlement.commission_amount_minor +
                            settlement.commission_tax_amount_minor,
                    )}`}
                    helperText={`Fee: ${formatInr(settlement.commission_amount_minor)} + GST: ${formatInr(settlement.commission_tax_amount_minor)}`}
                    icon={Percent}
                    className="border-l-4 border-l-amber-500"
                />

                <StatCard
                    label="TDS Withheld u/s 393(1)"
                    value={`- ${formatInr(settlement.statutory_deductions_minor)}`}
                    helperText="0.10% Income-tax withholding"
                    icon={Scale}
                    className="border-l-4 border-l-amber-500"
                />

                <StatCard
                    label="Net Partner Disbursement"
                    value={formatInr(settlement.net_settlement_amount_minor)}
                    helperText={
                        settlement.bank_account_masked ??
                        'Destination bank required'
                    }
                    icon={Wallet}
                    className="border-l-4 border-l-tijum-coral"
                />
            </section>

            {hasAdjustments && (
                <Card className="py-4">
                    <CardContent className="grid gap-4 text-xs sm:grid-cols-3">
                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Refund Adjustments
                            </span>
                            <p className="mt-1 font-heading text-base font-bold text-status-warning-fg tabular-nums">
                                {formatInr(settlement.refund_adjustments_minor)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Relocation Adjustments
                            </span>
                            <p className="mt-1 font-heading text-base font-bold text-status-warning-fg tabular-nums">
                                {formatInr(
                                    settlement.relocation_adjustments_minor,
                                )}
                            </p>
                        </div>
                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 dark:border-border dark:bg-muted/45">
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Other Adjustments
                            </span>
                            <p className="mt-1 font-heading text-base font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                {formatInr(settlement.other_adjustments_minor)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Provider Integration & Route Status Card */}
            <Card>
                <CardHeader className="border-b border-tijum-surface/80 pb-4 dark:border-border">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck
                            className="size-4 text-tijum-coral"
                            aria-hidden="true"
                        />
                        <span>
                            Razorpay Route Linked-Account Status &amp; Audit
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/40 p-5 text-xs md:grid-cols-4 dark:border-border dark:bg-muted/45">
                        <div>
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Route Account ID
                            </span>
                            <p className="mt-1 font-mono text-sm font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                {settlement.razorpay_account_id ?? 'None'}
                            </p>
                        </div>
                        <div>
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Beneficiary Account
                            </span>
                            <p className="mt-1 font-mono text-sm font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                {settlement.bank_account_masked ?? 'N/A'}
                            </p>
                            <p className="mt-0.5 text-tijum-plum-muted dark:text-muted-foreground">
                                {settlement.bank_name ?? '—'} (
                                {settlement.bank_ifsc ?? '—'})
                            </p>
                        </div>
                        <div>
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Provider Transfer ID
                            </span>
                            <p className="mt-1 font-mono text-sm font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                {settlement.provider_transfer_id ??
                                    'Not Executed'}
                            </p>
                            <p className="mt-0.5 text-tijum-plum-muted capitalize dark:text-muted-foreground">
                                Status:{' '}
                                {settlement.provider_status ?? 'Pending'}
                            </p>
                        </div>
                        <div>
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Approval Audit
                            </span>
                            <p className="mt-1 text-tijum-plum dark:text-foreground">
                                <strong>Approver:</strong>{' '}
                                {settlement.approved_by ?? 'Pending'}
                            </p>
                            <p className="mt-0.5 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                {settlement.approved_at
                                    ? new Date(
                                          settlement.approved_at,
                                      ).toLocaleString('en-IN')
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Line Items Table */}
            <Card className="gap-0 overflow-hidden py-0">
                <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-base">
                            Itemized Reservations
                        </CardTitle>
                        <Badge variant="outline" className="tabular-nums">
                            {settlement.items.length} line items
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="px-5">
                                    Booking Reference
                                </TableHead>
                                <TableHead className="px-5">Property</TableHead>
                                <TableHead className="px-5">
                                    Stay Dates
                                </TableHead>
                                <TableHead className="px-5 text-right">
                                    Gross Booking
                                </TableHead>
                                <TableHead className="px-5 text-right">
                                    Commission
                                </TableHead>
                                <TableHead className="px-5 text-right">
                                    GST (18%)
                                </TableHead>
                                <TableHead className="px-5 text-right">
                                    TDS (0.10%)
                                </TableHead>
                                <TableHead className="px-5 text-right">
                                    Net Partner Payable
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pagedItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="px-5 py-4">
                                        <span className="block font-mono text-xs font-bold text-tijum-coral tabular-nums">
                                            {item.booking_reference}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            {item.item_type_label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-5 py-4 font-medium">
                                        {item.property_name}
                                    </TableCell>
                                    <TableCell className="px-5 py-4 text-xs whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                        {item.stay_dates}
                                    </TableCell>
                                    <TableCell className="px-5 py-4 text-right font-semibold whitespace-nowrap tabular-nums">
                                        {formatInr(item.gross_amount_minor)}
                                    </TableCell>
                                    <TableCell className="px-5 py-4 text-right font-medium whitespace-nowrap text-status-warning-fg tabular-nums">
                                        -{' '}
                                        {formatInr(
                                            item.commission_amount_minor,
                                        )}
                                    </TableCell>
                                    <TableCell className="px-5 py-4 text-right font-medium whitespace-nowrap text-status-warning-fg tabular-nums">
                                        -{' '}
                                        {formatInr(
                                            item.commission_tax_amount_minor,
                                        )}
                                    </TableCell>
                                    <TableCell className="px-5 py-4 text-right font-medium whitespace-nowrap text-status-warning-fg tabular-nums">
                                        - {formatInr(item.tax_deduction_minor)}
                                    </TableCell>
                                    <TableCell className="px-5 py-4 text-right font-heading text-sm font-bold whitespace-nowrap text-tijum-plum tabular-nums dark:text-foreground">
                                        {formatInr(item.net_payable_minor)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {settlement.items.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
                            <span>
                                Showing{' '}
                                {(safeItemsPage - 1) * itemsPageSize + 1}–
                                {Math.min(
                                    safeItemsPage * itemsPageSize,
                                    settlement.items.length,
                                )}{' '}
                                of {settlement.items.length} line item
                                {settlement.items.length === 1 ? '' : 's'}
                            </span>
                            <Pagination
                                currentPage={safeItemsPage}
                                totalPages={totalItemsPages}
                                onPageChange={setItemsPage}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Release Payout Confirmation Dialog */}
            <ConfirmationDialog
                open={releaseDialogOpen}
                onOpenChange={setReleaseDialogOpen}
                title="Release Payout via Razorpay Route?"
                description={`You are about to dispatch ${formatInr(settlement.net_settlement_amount_minor)} to ${settlement.owner_name} (${settlement.bank_account_masked ?? 'linked account'}). This initiates a live gateway transfer.`}
                confirmLabel="Release Payout via Route"
                cancelLabel="Cancel"
                loading={actionLoading === 'release'}
                onConfirm={handleReleaseConfirm}
            />

            {/* Place on Hold Dialog */}
            <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
                <DialogContent className="bg-white text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle>Place Settlement on Hold</DialogTitle>
                        <DialogDescription>
                            Provide the audit or compliance reason for holding
                            settlement batch {settlement.settlement_reference}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleHoldSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="settlement-hold-reason">
                                Hold Reason
                            </Label>
                            <Textarea
                                id="settlement-hold-reason"
                                rows={3}
                                value={holdReason}
                                onChange={(e) => {
                                    setHoldReason(e.target.value);
                                    if (holdError) {
                                        setHoldError(null);
                                    }
                                }}
                                placeholder="Please provide reason for placing this settlement on hold…"
                                required
                            />
                            {holdError && (
                                <p className="text-xs font-medium text-status-error-fg">
                                    {holdError}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={actionLoading === 'hold'}
                                onClick={() => setHoldDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="default"
                                loading={actionLoading === 'hold'}
                            >
                                Confirm Hold
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
