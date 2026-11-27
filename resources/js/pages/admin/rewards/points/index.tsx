import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Clock,
    Coins,
    Plus,
    ShieldCheck,
    SlidersHorizontal,
    TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
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
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/layouts/admin-layout';
import type {
    BreadcrumbItem,
    LoyaltySystemConfig,
    PointsLedgerEntry,
} from '@/types';

interface Props {
    config: LoyaltySystemConfig;
    ledger?: PointsLedgerEntry[];
}

function getLedgerSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'available':
            return 'active';
        case 'pending':
            return 'pending';
        case 'redeemed':
            return 'completed';
        case 'expired':
            return 'cancelled';
        case 'cancelled':
            return 'rejected';
        default:
            return 'neutral';
    }
}

export default function AdminPointsIndex({ config, ledger = [] }: Props) {
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [ledgerPage, setLedgerPage] = useState(1);
    const ledgerPageSize = 15;
    const totalLedgerPages = Math.max(
        1,
        Math.ceil(ledger.length / ledgerPageSize),
    );
    const safeLedgerPage = Math.min(ledgerPage, totalLedgerPages);
    const pagedLedger = ledger.slice(
        (safeLedgerPage - 1) * ledgerPageSize,
        safeLedgerPage * ledgerPageSize,
    );

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin Console', href: '/admin/dashboard' },
        { title: 'Rewards', href: '/admin/rewards' },
        { title: 'Loyalty Points Engine', href: '/admin/rewards/points' },
    ];

    // Config form
    const configForm = useForm({
        points_earn_per_hundred_inr: config?.points_earn_per_hundred_inr ?? 5,
        points_to_inr_multiplier: config?.points_to_inr_multiplier ?? 1.0,
        points_expiry_days: config?.points_expiry_days ?? 365,
        max_redemption_percent_of_subtotal:
            config?.max_redemption_percent_of_subtotal ?? 20,
        min_points_to_redeem: config?.min_points_to_redeem ?? 100,
        referrer_points_per_stay: config?.referrer_points_per_stay ?? 250,
        referred_points_per_stay: config?.referred_points_per_stay ?? 250,
    });

    // Manual adjustment form
    const adjustForm = useForm({
        customer_identifier: '',
        adjustment_type: 'manual_credit',
        points: 250,
        audit_reason: '',
    });

    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        configForm.post('/admin/rewards/points/settings', {
            preserveScroll: true,
        });
    };

    const handleManualAdjust = (e: React.FormEvent) => {
        e.preventDefault();
        adjustForm.post('/admin/rewards/points/adjust', {
            preserveScroll: true,
            onSuccess: () => {
                setShowAdjustModal(false);
                adjustForm.reset();
            },
        });
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Loyalty Points Engine & Audit Log — TIJUM Admin" />

            <div className="space-y-8 pb-16">
                <PageHeader
                    eyebrow="Loyalty Engine"
                    title="Loyalty Points Configuration & Audit Log"
                    description="Configure issuance rules, FEFO expiry timers, and execute manual balance adjustments with mandatory audit reasoning."
                    badges={
                        <>
                            <Badge variant="plum">FEFO Ledger</Badge>
                            <Badge variant="outline" className="gap-1.5">
                                <ShieldCheck
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Immutable Audit Log</span>
                            </Badge>
                        </>
                    }
                    actions={
                        <>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/admin/rewards">
                                    <ArrowLeft
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Rewards Hub</span>
                                </Link>
                            </Button>
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => setShowAdjustModal(true)}
                            >
                                <Plus className="size-3.5" aria-hidden="true" />
                                <span>Manual Point Adjustment</span>
                            </Button>
                        </>
                    }
                />

                {/* Engine Summary KPIs */}
                <section
                    aria-label="Loyalty engine summary metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Earn Rate"
                        value={`${configForm.data.points_earn_per_hundred_inr} pts / ₹100`}
                        helperText="Stay spend accrual rate"
                        icon={TrendingUp}
                    />
                    <StatCard
                        label="Point Valuation"
                        value={`1 pt = ₹${configForm.data.points_to_inr_multiplier}`}
                        helperText={`Cap: ${configForm.data.max_redemption_percent_of_subtotal}% of subtotal`}
                        icon={Coins}
                    />
                    <StatCard
                        label="Expiry Window"
                        value={`${configForm.data.points_expiry_days} days`}
                        helperText="FEFO (First-Earned, First-Out)"
                        icon={Clock}
                    />
                    <StatCard
                        label="Ledger Entries"
                        value={ledger.length.toLocaleString()}
                        helperText="Double-entry records loaded"
                        icon={ShieldCheck}
                    />
                </section>

                {/* System Configuration Card */}
                <Card>
                    <CardHeader className="border-b border-tijum-surface/80 pb-5 dark:border-border">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <SlidersHorizontal
                                className="size-4 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>Global Loyalty Engine Parameters</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Governs conversion rates, booking redemption caps,
                            and stay accruals across all customer accounts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveConfig} className="space-y-6">
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="points_earn_per_hundred_inr"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Points Earned per ₹100 Spent
                                    </Label>
                                    <Input
                                        id="points_earn_per_hundred_inr"
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={
                                            configForm.data
                                                .points_earn_per_hundred_inr
                                        }
                                        onChange={(e) =>
                                            configForm.setData(
                                                'points_earn_per_hundred_inr',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="h-10 text-xs tabular-nums"
                                    />
                                    <span className="block text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        e.g. 5 points = 5% return
                                    </span>
                                    <InputError
                                        message={
                                            configForm.errors
                                                .points_earn_per_hundred_inr
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="points_to_inr_multiplier"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Points Conversion (1 Point = ₹)
                                    </Label>
                                    <Input
                                        id="points_to_inr_multiplier"
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        max="10"
                                        value={
                                            configForm.data
                                                .points_to_inr_multiplier
                                        }
                                        onChange={(e) =>
                                            configForm.setData(
                                                'points_to_inr_multiplier',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="h-10 text-xs tabular-nums"
                                    />
                                    <span className="block text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        Direct rupee discount value
                                    </span>
                                    <InputError
                                        message={
                                            configForm.errors
                                                .points_to_inr_multiplier
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="max_redemption_percent_of_subtotal"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Max Redemption Cap (% of Subtotal)
                                    </Label>
                                    <Input
                                        id="max_redemption_percent_of_subtotal"
                                        type="number"
                                        min="5"
                                        max="100"
                                        value={
                                            configForm.data
                                                .max_redemption_percent_of_subtotal
                                        }
                                        onChange={(e) =>
                                            configForm.setData(
                                                'max_redemption_percent_of_subtotal',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="h-10 text-xs tabular-nums"
                                    />
                                    <span className="block text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        Prevents 100% free bookings
                                    </span>
                                    <InputError
                                        message={
                                            configForm.errors
                                                .max_redemption_percent_of_subtotal
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="points_expiry_days"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Points Expiry Window (Days)
                                    </Label>
                                    <Input
                                        id="points_expiry_days"
                                        type="number"
                                        min="30"
                                        max="730"
                                        value={
                                            configForm.data.points_expiry_days
                                        }
                                        onChange={(e) =>
                                            configForm.setData(
                                                'points_expiry_days',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="h-10 text-xs tabular-nums"
                                    />
                                    <span className="block text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        FEFO (First-Earned, First-Out)
                                    </span>
                                    <InputError
                                        message={
                                            configForm.errors.points_expiry_days
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="referrer_points_per_stay"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Referrer Reward (Points per Stay)
                                    </Label>
                                    <Input
                                        id="referrer_points_per_stay"
                                        type="number"
                                        min="50"
                                        value={
                                            configForm.data
                                                .referrer_points_per_stay
                                        }
                                        onChange={(e) =>
                                            configForm.setData(
                                                'referrer_points_per_stay',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="h-10 text-xs tabular-nums"
                                    />
                                    <InputError
                                        message={
                                            configForm.errors
                                                .referrer_points_per_stay
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="referred_points_per_stay"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Referred Friend Reward (Points)
                                    </Label>
                                    <Input
                                        id="referred_points_per_stay"
                                        type="number"
                                        min="50"
                                        value={
                                            configForm.data
                                                .referred_points_per_stay
                                        }
                                        onChange={(e) =>
                                            configForm.setData(
                                                'referred_points_per_stay',
                                                Number(e.target.value),
                                            )
                                        }
                                        className="h-10 text-xs tabular-nums"
                                    />
                                    <InputError
                                        message={
                                            configForm.errors
                                                .referred_points_per_stay
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end border-t border-tijum-surface/80 pt-4 dark:border-border">
                                <Button
                                    type="submit"
                                    disabled={configForm.processing}
                                    loading={configForm.processing}
                                    size="sm"
                                    variant="default"
                                >
                                    {configForm.processing
                                        ? 'Saving...'
                                        : 'Update Parameters'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Manual Adjustment Modal Dialog */}
                <Dialog
                    open={showAdjustModal}
                    onOpenChange={setShowAdjustModal}
                >
                    <DialogContent className="border-tijum-surface/80 bg-white text-tijum-plum sm:max-w-lg dark:border-border dark:bg-card dark:text-foreground">
                        <DialogHeader className="border-b border-tijum-surface/80 pb-3 dark:border-border">
                            <DialogTitle>
                                Execute Manual Point Adjustment
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Issue a manual credit or debit to a customer
                                points wallet with an immutable audit reason.
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            onSubmit={handleManualAdjust}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label
                                    htmlFor="customer_identifier"
                                    className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Customer Email or ID *
                                </Label>
                                <Input
                                    id="customer_identifier"
                                    placeholder="customer@example.com or ID"
                                    value={adjustForm.data.customer_identifier}
                                    onChange={(e) =>
                                        adjustForm.setData(
                                            'customer_identifier',
                                            e.target.value,
                                        )
                                    }
                                    required
                                    className="h-10 text-xs"
                                />
                                <InputError
                                    message={
                                        adjustForm.errors.customer_identifier
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="adjustment_type"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Adjustment Type
                                    </Label>
                                    <Select
                                        value={adjustForm.data.adjustment_type}
                                        onValueChange={(val) =>
                                            adjustForm.setData(
                                                'adjustment_type',
                                                val,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            id="adjustment_type"
                                            size="sm"
                                            className="w-full text-xs"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual_credit">
                                                Credit (+ Points)
                                            </SelectItem>
                                            <SelectItem value="manual_debit">
                                                Debit (- Points)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={
                                            adjustForm.errors.adjustment_type
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="adjust_points"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Points Amount *
                                    </Label>
                                    <Input
                                        id="adjust_points"
                                        type="number"
                                        min="1"
                                        value={adjustForm.data.points}
                                        onChange={(e) =>
                                            adjustForm.setData(
                                                'points',
                                                Number(e.target.value),
                                            )
                                        }
                                        required
                                        className="h-10 text-xs tabular-nums"
                                    />
                                    <InputError
                                        message={adjustForm.errors.points}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="audit_reason"
                                    className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Mandatory Audit Reason *
                                </Label>
                                <Textarea
                                    id="audit_reason"
                                    placeholder="State specific incident or support ticket justifying this manual adjustment (e.g. Compensation for AC failure in booking #492)..."
                                    value={adjustForm.data.audit_reason}
                                    onChange={(e) =>
                                        adjustForm.setData(
                                            'audit_reason',
                                            e.target.value,
                                        )
                                    }
                                    required
                                    rows={3}
                                    className="text-xs"
                                />
                                <InputError
                                    message={adjustForm.errors.audit_reason}
                                />
                            </div>

                            <DialogFooter className="border-t border-tijum-surface/80 pt-3 dark:border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAdjustModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    variant="default"
                                    disabled={adjustForm.processing}
                                    loading={adjustForm.processing}
                                >
                                    {adjustForm.processing
                                        ? 'Committing...'
                                        : 'Commit Adjustment'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Ledger Audit Trail */}
                <section
                    aria-label="System points ledger"
                    className="space-y-4"
                >
                    {ledger.length === 0 ? (
                        <EmptyState
                            icon={Coins}
                            title="No ledger entries found"
                            description="Double-entry points accruals, redemptions, expiries, and manual adjustments will appear here."
                        />
                    ) : (
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-tijum-surface/80 py-5 dark:border-border">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">
                                        System Points Ledger
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Complete double-entry immutable
                                        transaction log across all customer
                                        accounts.
                                    </CardDescription>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="tabular-nums"
                                >
                                    {ledger.length} entries
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="pl-6">
                                                Timestamp
                                            </TableHead>
                                            <TableHead>Transaction</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="pr-6 text-right">
                                                Points Delta
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pagedLedger.map((item) => {
                                            const isCredit = item.points > 0;
                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell className="pl-6 text-xs whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                        {new Date(
                                                            item.created_at,
                                                        ).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="font-heading text-xs font-semibold text-tijum-plum capitalize dark:text-foreground">
                                                        {item.type_label ??
                                                            item.transaction_type.replaceAll(
                                                                '_',
                                                                ' ',
                                                            )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        {item.description}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                        {item.reference_code ??
                                                            '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge
                                                            status={getLedgerSemanticStatus(
                                                                item.status,
                                                            )}
                                                            label={item.status}
                                                            className="capitalize"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="pr-6 text-right font-heading text-xs font-bold tabular-nums">
                                                        <span
                                                            className={
                                                                isCredit
                                                                    ? 'text-status-success-fg'
                                                                    : 'text-status-error-fg'
                                                            }
                                                        >
                                                            {isCredit
                                                                ? '+'
                                                                : ''}
                                                            {item.points} pts
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-6 py-3.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
                                    <span>
                                        Showing{' '}
                                        {(safeLedgerPage - 1) * ledgerPageSize +
                                            1}
                                        –
                                        {Math.min(
                                            safeLedgerPage * ledgerPageSize,
                                            ledger.length,
                                        )}{' '}
                                        of {ledger.length} entries
                                    </span>
                                    <Pagination
                                        currentPage={safeLedgerPage}
                                        totalPages={totalLedgerPages}
                                        onPageChange={setLedgerPage}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
