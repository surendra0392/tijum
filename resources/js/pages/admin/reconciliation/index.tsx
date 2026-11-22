import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Download,
    Percent,
    Scale,
    ShieldCheck,
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

interface UnreconciledException {
    settlement_id: number;
    settlement_reference: string;
    owner_name: string;
    owner_email: string;
    status: string;
    provider_status?: string;
    expected_net_minor: number;
    reconciliation_status: string;
    reconciliation_label: string;
    discrepancy_reason: string;
    transfers_count: number;
    reversals_count: number;
}

interface LedgerAuditSummary {
    unbalanced_journals_count: number;
    duplicate_entity_journals_count: number;
    processed_refunds_missing_journal_count: number;
    quarantined_refunds_count: number;
    completed_transfers_missing_journal_count: number;
    processed_reversals_missing_journal_count: number;
    transfers_with_provenance_issues_count: number;
    zero_payable_platform_discount_bookings_count: number;
}

interface Props {
    exceptions: UnreconciledException[];
    summary: {
        total_settled_minor: number;
        total_commission_minor: number;
        total_tax_deductions_minor: number;
        unreconciled_count: number;
    };
    ledger_audit?: LedgerAuditSummary;
}

function formatInr(minor: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(minor / 100);
}

function getInternalStatusSemantic(status: string): SemanticStatus {
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
            return 'cancelled';
        default:
            return 'pending';
    }
}

export default function FinancialReconciliationIndex({
    exceptions,
    summary,
    ledger_audit,
}: Props) {
    const [resolvingId, setResolvingId] = useState<number | null>(null);
    const [resolveTarget, setResolveTarget] =
        useState<UnreconciledException | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolutionError, setResolutionError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const totalPages = Math.max(1, Math.ceil(exceptions.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pagedExceptions = exceptions.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
    );

    const handleResolveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!resolveTarget) {
            return;
        }
        const trimmed = resolutionNotes.trim();
        if (!trimmed) {
            setResolutionError(
                'Please enter manual reconciliation audit justification notes.',
            );
            return;
        }
        setResolutionError(null);
        setResolvingId(resolveTarget.settlement_id);
        router.post(
            `/admin/financial-reconciliation/${resolveTarget.settlement_id}/resolve`,
            { notes: trimmed },
            {
                onSuccess: () => {
                    setResolveTarget(null);
                    setResolutionNotes('');
                },
                onFinish: () => setResolvingId(null),
            },
        );
    };

    return (
        <div className="space-y-6">
            <Head title="Financial Reconciliation & Auditing" />

            <PageHeader
                eyebrow="Accounting & Governance"
                title="Financial Reconciliation & Subledger Audit"
                description="Continuous matching between internal reservation bookings, gateway captured funds, and Razorpay Route linked-account transfers."
                badges={
                    <>
                        <Badge variant="plum">
                            Accounting &amp; Governance
                        </Badge>
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
                    <>
                        <Button variant="outline" asChild>
                            <Link href="/admin/settlements">
                                <ArrowLeft
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Settlements Queue</span>
                            </Link>
                        </Button>
                        <Button variant="default" asChild>
                            <a
                                href="/admin/financial-reconciliation/export"
                                download
                            >
                                <Download
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                <span>Download CA Audit CSV</span>
                            </a>
                        </Button>
                    </>
                }
            />

            {/* Reconciliation KPI Overview */}
            <section
                aria-label="Reconciliation summary metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Reconciled Partner Payouts"
                    value={formatInr(summary.total_settled_minor)}
                    helperText="Verified matched provider transfers"
                    icon={CheckCircle2}
                    className="border-l-4 border-l-emerald-500"
                />

                <StatCard
                    label="Total Marketplace Commission"
                    value={formatInr(summary.total_commission_minor)}
                    helperText="Earned marketplace facilitation revenue"
                    icon={Percent}
                    className="border-l-4 border-l-tijum-coral"
                />

                <StatCard
                    label="Statutory TDS Withholding"
                    value={formatInr(summary.total_tax_deductions_minor)}
                    helperText="Section 393(1) 0.10% TDS ledger entries"
                    icon={Scale}
                    className="border-l-4 border-l-amber-500"
                />

                <StatCard
                    label="Unreconciled Exceptions"
                    value={summary.unreconciled_count}
                    helperText={
                        summary.unreconciled_count === 0
                            ? 'Zero outstanding discrepancies'
                            : 'Requires administrative review'
                    }
                    icon={
                        summary.unreconciled_count > 0
                            ? AlertTriangle
                            : CheckCircle2
                    }
                    className={
                        summary.unreconciled_count > 0
                            ? 'border-l-4 border-l-amber-500'
                            : 'border-l-4 border-l-emerald-500'
                    }
                />
            </section>

            {ledger_audit && (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-4 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <CardTitle className="text-base">
                                    Ledger &amp; Subledger Integrity Audit
                                </CardTitle>
                                <CardDescription>
                                    Read-only verification of balanced journal
                                    legs, duplicate entity postings, refund
                                    quarantines, and Route transfer provenance.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border p-3 text-sm">
                            <p className="text-xs text-muted-foreground">
                                Unbalanced Journals
                            </p>
                            <p className="mt-1 font-semibold tabular-nums">
                                {ledger_audit.unbalanced_journals_count}
                            </p>
                        </div>
                        <div className="rounded-lg border p-3 text-sm">
                            <p className="text-xs text-muted-foreground">
                                Duplicate Entity Postings
                            </p>
                            <p className="mt-1 font-semibold tabular-nums">
                                {ledger_audit.duplicate_entity_journals_count}
                            </p>
                        </div>
                        <div className="rounded-lg border p-3 text-sm">
                            <p className="text-xs text-muted-foreground">
                                Quarantined / Unjournalled Refunds
                            </p>
                            <p className="mt-1 font-semibold tabular-nums">
                                {ledger_audit.quarantined_refunds_count} /{' '}
                                {
                                    ledger_audit.processed_refunds_missing_journal_count
                                }
                            </p>
                        </div>
                        <div className="rounded-lg border p-3 text-sm">
                            <p className="text-xs text-muted-foreground">
                                Transfer Journal / Provenance Issues
                            </p>
                            <p className="mt-1 font-semibold tabular-nums">
                                {
                                    ledger_audit.completed_transfers_missing_journal_count
                                }{' '}
                                /{' '}
                                {
                                    ledger_audit.transfers_with_provenance_issues_count
                                }
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Unreconciled Exceptions Table */}
            <Card className="gap-0 overflow-hidden py-0">
                <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                            <CardTitle className="text-base">
                                Discrepancy Exceptions &amp; Gateway Status
                                Mismatches ({exceptions.length})
                            </CardTitle>
                            <CardDescription>
                                Settlements where internal ledger entries
                                diverge from gateway webhook responses, transfer
                                reversals, or hold conditions.
                            </CardDescription>
                        </div>
                        <Badge
                            variant={
                                exceptions.length > 0 ? 'outline' : 'default'
                            }
                            className="tabular-nums"
                        >
                            {exceptions.length} open
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {exceptions.length === 0 ? (
                        <EmptyState
                            icon={CheckCircle2}
                            title="100% Ledger Reconciled"
                            description="All settlements are 100% reconciled with payment provider transfer records."
                            className="rounded-none border-0 py-12 shadow-none"
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-5">
                                        Settlement Reference
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Partner Entity
                                    </TableHead>
                                    <TableHead className="px-5 text-right">
                                        Expected Net
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Internal Status
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Provider State
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Discrepancy Reason
                                    </TableHead>
                                    <TableHead className="px-5 text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pagedExceptions.map((ex) => (
                                    <TableRow key={ex.settlement_id}>
                                        <TableCell className="px-5 py-4 font-mono text-xs font-bold text-tijum-coral tabular-nums">
                                            <Link
                                                href={`/admin/settlements/${ex.settlement_id}`}
                                                className="hover:underline"
                                            >
                                                {ex.settlement_reference}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="block font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                {ex.owner_name}
                                            </span>
                                            <span className="block text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {ex.owner_email}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right font-semibold whitespace-nowrap tabular-nums">
                                            {formatInr(ex.expected_net_minor)}
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <StatusBadge
                                                status={getInternalStatusSemantic(
                                                    ex.status,
                                                )}
                                                label={ex.status.replace(
                                                    '_',
                                                    ' ',
                                                )}
                                                className="capitalize"
                                            />
                                        </TableCell>
                                        <TableCell className="px-5 py-4 font-mono text-xs text-tijum-plum-muted capitalize dark:text-muted-foreground">
                                            {ex.provider_status ??
                                                'No Provider Event'}
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-xs font-medium text-status-warning-fg">
                                            {ex.discrepancy_reason}
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                loading={
                                                    resolvingId ===
                                                    ex.settlement_id
                                                }
                                                onClick={() => {
                                                    setResolutionError(null);
                                                    setResolutionNotes('');
                                                    setResolveTarget(ex);
                                                }}
                                            >
                                                Manual Resolution
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    {exceptions.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
                            <span>
                                Showing {(safePage - 1) * pageSize + 1}–
                                {Math.min(
                                    safePage * pageSize,
                                    exceptions.length,
                                )}{' '}
                                of {exceptions.length} exception
                                {exceptions.length === 1 ? '' : 's'}
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

            {/* Manual Reconciliation Modal */}
            <Dialog
                open={Boolean(resolveTarget)}
                onOpenChange={(open) => {
                    if (!open) {
                        setResolveTarget(null);
                    }
                }}
            >
                <DialogContent className="bg-white text-tijum-plum dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle>Manual Ledger Reconciliation</DialogTitle>
                        <DialogDescription>
                            Record audit justification notes to mark settlement{' '}
                            <span className="font-mono font-semibold text-tijum-coral">
                                {resolveTarget?.settlement_reference}
                            </span>{' '}
                            as manually reconciled.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleResolveSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reconciliation-resolution-notes">
                                Audit Justification Notes
                            </Label>
                            <Textarea
                                id="reconciliation-resolution-notes"
                                rows={3}
                                value={resolutionNotes}
                                onChange={(e) => {
                                    setResolutionNotes(e.target.value);
                                    if (resolutionError) {
                                        setResolutionError(null);
                                    }
                                }}
                                placeholder="Enter manual reconciliation audit justification notes (e.g. bank UTR verified)…"
                                required
                            />
                            {resolutionError && (
                                <p className="text-xs font-medium text-status-error-fg">
                                    {resolutionError}
                                </p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={resolvingId !== null}
                                onClick={() => setResolveTarget(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="default"
                                loading={resolvingId !== null}
                            >
                                Mark Manually Reconciled
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
