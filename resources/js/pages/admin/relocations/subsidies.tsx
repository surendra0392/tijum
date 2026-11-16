import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    IndianRupee,
    ShieldCheck,
    Sparkles,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    approve as approveSubsidy,
    index as subsidiesIndex,
} from '@/routes/admin/relocation-subsidies';
import { index as relocationsIndex } from '@/routes/admin/relocations';
import { show as reservationShow } from '@/routes/admin/reservations';

interface RelocationSubsidyRow {
    id: number;
    subsidy_reference: string;
    source_booking_reference: string;
    source_property_name?: string;
    replacement_booking_reference: string;
    replacement_property_name?: string;
    case_reference?: string;
    source_amount_minor: number;
    destination_amount_minor: number;
    subsidy_amount_minor: number;
    currency: string;
    status: string;
    status_label: string;
    approved_by?: string;
    approved_at?: string;
    created_at?: string;
}

interface Props {
    subsidies: {
        data: RelocationSubsidyRow[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    metrics?: {
        total_subsidized_minor: number;
        count: number;
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

function getSubsidySemantic(status: string): SemanticStatus {
    switch (status) {
        case 'approved':
        case 'funded':
            return 'active';
        case 'pending_approval':
        case 'funding_pending':
            return 'processing';
        case 'failed':
            return 'rejected';
        case 'on_hold':
            return 'suspended';
        default:
            return 'pending';
    }
}

export default function AdminRelocationSubsidiesIndex({
    subsidies,
    metrics,
    filters,
}: Props) {
    const [approvingId, setApprovingId] = useState<number | null>(null);
    const [confirmSubsidy, setConfirmSubsidy] =
        useState<RelocationSubsidyRow | null>(null);

    const activeStatus = filters.status || 'all';

    const handleFilter = (nextStatus?: string) => {
        router.get(
            subsidiesIndex.url({
                query: nextStatus ? { status: nextStatus } : undefined,
            }),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const handlePageChange = (page: number) => {
        router.get(
            subsidiesIndex.url({
                query: {
                    ...(filters.status ? { status: filters.status } : {}),
                    page,
                },
            }),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleApprove = (subsidy: RelocationSubsidyRow) => {
        setApprovingId(subsidy.id);
        router.post(
            approveSubsidy.url(subsidy.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setApprovingId(null);
                    setConfirmSubsidy(null);
                },
            },
        );
    };

    const approvedOnPageMinor = subsidies.data
        .filter((s) => s.status === 'approved' || s.status === 'funded')
        .reduce((sum, s) => sum + s.subsidy_amount_minor, 0);
    const pendingApprovalCount = subsidies.data.filter(
        (s) => s.status === 'pending_approval',
    ).length;
    const pageSubsidyTotalMinor = subsidies.data.reduce(
        (sum, s) => sum + s.subsidy_amount_minor,
        0,
    );

    return (
        <div className="space-y-6">
            <Head title="Platform Relocation Subsidies" />

            <PageHeader
                eyebrow="Customer Protection Finance"
                title="Platform Relocation Subsidies"
                description="Track and approve marketplace funding for Scenario C relocations (customer protection guarantee absorbing the price difference of higher-tariff replacement stays)."
                badges={
                    <>
                        <Badge variant="plum">
                            Customer Protection Finance
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
                    <Button asChild variant="outline" size="sm">
                        <Link href={relocationsIndex.url()}>
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            <span>Relocations Desk</span>
                        </Link>
                    </Button>
                }
            />

            {/* KPI Stat Cards */}
            <section
                aria-label="Relocation subsidy metrics"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                <StatCard
                    label="Total Subsidies Recorded"
                    value={metrics?.count ?? subsidies.total}
                    helperText="Across all relocation cases"
                    icon={FileSpreadsheet}
                />
                <StatCard
                    label="Approved & Funded"
                    value={formatInr(
                        metrics?.total_subsidized_minor ?? approvedOnPageMinor,
                    )}
                    helperText="Authorized platform expense"
                    icon={IndianRupee}
                    className="border-l-4 border-l-emerald-500"
                />
                <StatCard
                    label="Pending Approval (Page)"
                    value={pendingApprovalCount}
                    helperText="Awaiting finance sign-off"
                    icon={Clock}
                    className="border-l-4 border-l-amber-500"
                />
                <StatCard
                    label="Subsidy Exposure (Page)"
                    value={formatInr(pageSubsidyTotalMinor)}
                    helperText="Sum of rows on current page"
                    icon={Sparkles}
                    className="border-l-4 border-l-tijum-coral"
                />
            </section>

            {/* Regulatory Accounting Notice */}
            <Card className="border-l-4 border-l-tijum-coral py-5">
                <CardContent className="flex items-start gap-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                        <Sparkles className="size-5" aria-hidden="true" />
                    </span>
                    <div className="space-y-1">
                        <p className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                            Customer Price-Protection Guarantee (Phase 14 &amp;
                            15 Accounting Policy)
                        </p>
                        <p className="text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                            When an owner-fault cancellation relocates a guest
                            to a more expensive property, the guest pays ₹0
                            extra. The excess tariff is funded exclusively as a
                            platform operating expense (
                            <code className="font-mono text-[11px] text-tijum-plum dark:text-foreground">
                                PlatformRelocationSubsidy
                            </code>
                            ). It is never added to customer bills, hidden as
                            negative commission, or deducted from unrelated
                            partners.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Pill Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    value={activeStatus}
                    onValueChange={(value) =>
                        handleFilter(value === 'all' ? undefined : value)
                    }
                    className="space-y-0"
                >
                    <TabsList
                        variant="pill"
                        label="Filter relocation subsidies by status"
                    >
                        <TabsTrigger value="all">All Subsidies</TabsTrigger>
                        <TabsTrigger value="pending_approval">
                            Pending Approval
                        </TabsTrigger>
                        <TabsTrigger value="approved">Approved</TabsTrigger>
                        <TabsTrigger value="funding_pending">
                            Funding Pending
                        </TabsTrigger>
                        <TabsTrigger value="funded">Funded</TabsTrigger>
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

            {/* Table / Empty State */}
            {subsidies.data.length === 0 ? (
                <EmptyState
                    icon={Sparkles}
                    title="No platform relocation subsidies recorded"
                    description={
                        filters.status
                            ? 'No subsidy records match the selected status filter.'
                            : 'Platform subsidies will appear here when guests are relocated to higher-tariff stays.'
                    }
                    action={
                        filters.status ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleFilter()}
                            >
                                View all subsidies
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle className="text-base">
                                Subsidies Queue
                            </CardTitle>
                            <Badge variant="outline" className="tabular-nums">
                                {subsidies.total} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="px-5">
                                        Subsidy Reference
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Source Reservation
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Destination Property
                                    </TableHead>
                                    <TableHead className="px-5 text-right">
                                        Customer Paid
                                    </TableHead>
                                    <TableHead className="px-5 text-right">
                                        Destination Cost
                                    </TableHead>
                                    <TableHead className="px-5 text-right">
                                        Platform Subsidy
                                    </TableHead>
                                    <TableHead className="px-5">
                                        Status
                                    </TableHead>
                                    <TableHead className="px-5 text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subsidies.data.map((sub) => (
                                    <TableRow key={sub.id}>
                                        <TableCell className="px-5 py-4">
                                            <span className="block font-mono text-xs font-bold text-tijum-coral tabular-nums">
                                                {sub.subsidy_reference}
                                            </span>
                                            {sub.case_reference && (
                                                <span className="mt-0.5 block font-mono text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    Case: {sub.case_reference}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <Link
                                                href={reservationShow.url(
                                                    sub.source_booking_reference,
                                                )}
                                                className="block font-mono text-xs font-semibold text-tijum-plum tabular-nums hover:text-tijum-coral hover:underline dark:text-foreground dark:hover:text-tijum-coral"
                                            >
                                                {sub.source_booking_reference}
                                            </Link>
                                            <span className="mt-0.5 block text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {sub.source_property_name ||
                                                    '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <Link
                                                href={reservationShow.url(
                                                    sub.replacement_booking_reference,
                                                )}
                                                className="block font-mono text-xs font-semibold text-tijum-plum tabular-nums hover:text-tijum-coral hover:underline dark:text-foreground dark:hover:text-tijum-coral"
                                            >
                                                {
                                                    sub.replacement_booking_reference
                                                }
                                            </Link>
                                            <span className="mt-0.5 block text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                {sub.replacement_property_name ||
                                                    '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right text-xs font-medium whitespace-nowrap text-tijum-plum tabular-nums dark:text-foreground">
                                            {formatInr(sub.source_amount_minor)}
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right text-xs font-medium whitespace-nowrap text-tijum-plum tabular-nums dark:text-foreground">
                                            {formatInr(
                                                sub.destination_amount_minor,
                                            )}
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right font-heading text-sm font-bold whitespace-nowrap text-status-warning-fg tabular-nums">
                                            {formatInr(
                                                sub.subsidy_amount_minor,
                                            )}
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <StatusBadge
                                                status={getSubsidySemantic(
                                                    sub.status,
                                                )}
                                                label={sub.status_label}
                                            />
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            {sub.status ===
                                            'pending_approval' ? (
                                                <Button
                                                    type="button"
                                                    variant="default"
                                                    size="sm"
                                                    loading={
                                                        approvingId === sub.id
                                                    }
                                                    onClick={() =>
                                                        setConfirmSubsidy(sub)
                                                    }
                                                >
                                                    <CheckCircle2
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Approve</span>
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    {sub.approved_by
                                                        ? `By ${sub.approved_by}`
                                                        : '—'}
                                                </span>
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
                                    {subsidies.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {subsidies.total}
                                </span>{' '}
                                subsid{subsidies.total === 1 ? 'y' : 'ies'}
                            </p>
                            <Pagination
                                currentPage={subsidies.current_page}
                                totalPages={subsidies.last_page}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Approval Confirmation Modal */}
            <Dialog
                open={confirmSubsidy !== null}
                onOpenChange={(open) => !open && setConfirmSubsidy(null)}
            >
                <DialogContent className="border-tijum-surface/80 bg-white text-tijum-plum sm:max-w-md dark:border-border dark:bg-card dark:text-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-heading text-lg text-tijum-plum dark:text-foreground">
                            <ShieldCheck
                                className="size-5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>Approve Platform Subsidy</span>
                        </DialogTitle>
                        <DialogDescription className="text-tijum-plum-muted dark:text-muted-foreground">
                            Authorize platform operating expense funding for{' '}
                            <strong className="font-mono text-tijum-plum tabular-nums dark:text-foreground">
                                {confirmSubsidy?.subsidy_reference}
                            </strong>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    {confirmSubsidy && (
                        <div className="space-y-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-xs text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                            <p className="tabular-nums">
                                <strong>Source Booking:</strong>{' '}
                                <span className="font-mono">
                                    {confirmSubsidy.source_booking_reference}
                                </span>
                            </p>
                            <p className="tabular-nums">
                                <strong>Replacement Booking:</strong>{' '}
                                <span className="font-mono">
                                    {
                                        confirmSubsidy.replacement_booking_reference
                                    }
                                </span>
                            </p>
                            <p className="tabular-nums">
                                <strong>Platform Subsidy Amount:</strong>{' '}
                                <span className="font-heading font-bold text-status-warning-fg">
                                    {formatInr(
                                        confirmSubsidy.subsidy_amount_minor,
                                    )}
                                </span>
                            </p>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmSubsidy(null)}
                            disabled={approvingId !== null}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="default"
                            loading={approvingId !== null}
                            onClick={() =>
                                confirmSubsidy && handleApprove(confirmSubsidy)
                            }
                        >
                            Confirm Approval
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
