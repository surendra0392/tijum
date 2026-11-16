import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Coins,
    Plus,
    ShieldAlert,
    SlidersHorizontal,
    TicketPercent,
    Users,
    Wallet,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/info-card';
import { PageHeader } from '@/components/shared/page-header';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import type {
    BreadcrumbItem,
    CouponCode,
    PointsLedgerEntry,
    RewardsDashboardMetrics,
} from '@/types';

interface Props {
    metrics: RewardsDashboardMetrics;
    topCampaigns?: CouponCode[];
    recentAdjustments?: PointsLedgerEntry[];
}

function getCampaignSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'active':
            return 'active';
        case 'paused':
            return 'pending';
        case 'expired':
        case 'depleted':
            return 'cancelled';
        default:
            return 'neutral';
    }
}

export default function AdminRewardsDashboard({
    metrics,
    topCampaigns = [],
    recentAdjustments = [],
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin Console', href: '/admin/dashboard' },
        { title: 'Rewards & Loyalty', href: '/admin/rewards' },
    ];

    const fraudAlertsCount = metrics?.referral_fraud_alerts_count ?? 0;

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Rewards & Loyalty Management — TIJUM Admin" />

            <div className="space-y-8 pb-12">
                <PageHeader
                    eyebrow="Loyalty & Growth"
                    title="Rewards, Referrals & Loyalty Hub"
                    description="Promotional campaigns, partner settlement protection, referral attribution fraud review, and loyalty points ledger."
                    badges={
                        <>
                            <Badge variant="plum">Rewards Engine</Badge>
                            {fraudAlertsCount > 0 ? (
                                <StatusBadge
                                    status="warning"
                                    label={`${fraudAlertsCount} Fraud Alerts`}
                                />
                            ) : (
                                <StatusBadge
                                    status="verified"
                                    label="Anti-Fraud Clear"
                                />
                            )}
                        </>
                    }
                    actions={
                        <>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/admin/rewards/points">
                                    <SlidersHorizontal
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Points Config</span>
                                </Link>
                            </Button>
                            <Button asChild size="sm" variant="default">
                                <Link href="/admin/rewards/campaigns/create">
                                    <Plus
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Create Campaign</span>
                                </Link>
                            </Button>
                        </>
                    }
                />

                {/* Primary Metrics Grid */}
                <section
                    aria-label="Rewards and loyalty summary metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Active Campaigns"
                        value={metrics?.active_campaigns_count ?? 0}
                        helperText={`${metrics?.total_coupons_redeemed?.toLocaleString() ?? 0} total redemptions to date`}
                        icon={TicketPercent}
                    />

                    <StatCard
                        label="Discount Disbursed"
                        value={`₹${((metrics?.total_discount_disbursed_minor ?? 0) / 100).toLocaleString()}`}
                        helperText={`Platform: ₹${((metrics?.platform_funded_discount_minor ?? 0) / 100).toLocaleString()} · Property: ₹${((metrics?.property_funded_discount_minor ?? 0) / 100).toLocaleString()}`}
                        icon={Coins}
                    />

                    <StatCard
                        label="Circulating Points"
                        value={
                            metrics?.active_loyalty_points_outstanding?.toLocaleString() ??
                            0
                        }
                        helperText={`Equivalent platform liability: ₹${(metrics?.active_loyalty_points_outstanding ?? 0).toLocaleString()}`}
                        icon={Wallet}
                    />

                    <StatCard
                        label="Referral Fraud Alerts"
                        value={fraudAlertsCount}
                        icon={ShieldAlert}
                        className={
                            fraudAlertsCount > 0
                                ? 'border-l-4 border-l-amber-500'
                                : undefined
                        }
                        helperText={
                            fraudAlertsCount > 0
                                ? 'Requires manual review'
                                : 'No active flags'
                        }
                        badge={
                            <Link
                                href="/admin/rewards/referrals"
                                className="inline-flex items-center gap-1 font-heading text-xs font-semibold text-tijum-coral hover:underline"
                            >
                                <span>Review suspicious referrals</span>
                                <ArrowRight
                                    className="size-3"
                                    aria-hidden="true"
                                />
                            </Link>
                        }
                    />
                </section>

                {/* Sub-modules Quick Access Cards */}
                <section
                    aria-label="Rewards management modules"
                    className="grid gap-4 sm:grid-cols-3"
                >
                    <Card className="justify-between gap-4 py-5 transition-colors hover:border-tijum-coral/45">
                        <CardHeader className="gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                    <TicketPercent
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/admin/rewards/campaigns">
                                        <span>Manage all</span>
                                        <ArrowRight
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-base">
                                    Campaigns &amp; Promo Codes
                                </CardTitle>
                                <CardDescription className="text-xs leading-relaxed">
                                    Design percentage discounts, fixed-rupee
                                    reductions, or points multipliers with
                                    category and budget caps.
                                </CardDescription>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="justify-between gap-4 py-5 transition-colors hover:border-tijum-coral/45">
                        <CardHeader className="gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-status-warning-border bg-status-warning-bg text-status-warning-fg">
                                    <Coins
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/admin/rewards/points">
                                        <span>Points Engine</span>
                                        <ArrowRight
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-base">
                                    Loyalty System &amp; Adjustments
                                </CardTitle>
                                <CardDescription className="text-xs leading-relaxed">
                                    Configure issuance rules, FEFO expiry
                                    timers, and issue manual credits or debits
                                    with audit reasoning.
                                </CardDescription>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="justify-between gap-4 py-5 transition-colors hover:border-tijum-coral/45">
                        <CardHeader className="gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-status-info-border bg-status-info-bg text-status-info-fg">
                                    <Users
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/admin/rewards/referrals">
                                        <span>Fraud Queue</span>
                                        <ArrowRight
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-base">
                                    Referrals &amp; Attribution Anti-Fraud
                                </CardTitle>
                                <CardDescription className="text-xs leading-relaxed">
                                    Enforce completed stay verification, detect
                                    device / payment match abuse, and disqualify
                                    fraudulent claims.
                                </CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </section>

                {/* Top Performing Campaigns Table */}
                <section
                    aria-label="Top performing campaigns"
                    className="space-y-4"
                >
                    {topCampaigns.length === 0 ? (
                        <EmptyState
                            icon={TicketPercent}
                            title="No campaigns launched yet"
                            description="Launch your first promotional campaign with settlement protection and category targeting."
                            action={
                                <Button asChild size="sm" variant="default">
                                    <Link href="/admin/rewards/campaigns/create">
                                        <Plus
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Create First Campaign</span>
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-tijum-surface/80 py-5 dark:border-border">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">
                                        Top Performing Campaigns
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Highest conversion promotional discount
                                        codes.
                                    </CardDescription>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/admin/rewards/campaigns">
                                        <span>View all campaigns</span>
                                        <ArrowRight
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="pl-6">
                                                Campaign Name
                                            </TableHead>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Offer Type</TableHead>
                                            <TableHead>Funding</TableHead>
                                            <TableHead>Usage / Cap</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="pr-6 text-right">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topCampaigns.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="pl-6 font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                    {c.title}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex rounded-lg border border-tijum-surface/80 bg-tijum-cream/60 px-2 py-0.5 font-mono text-xs font-semibold text-tijum-plum dark:border-border dark:bg-muted dark:text-foreground">
                                                        {c.code}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-xs text-tijum-plum-muted capitalize tabular-nums dark:text-muted-foreground">
                                                    {c.offer_type ===
                                                    'percentage'
                                                        ? `${c.discount_percentage}% off`
                                                        : `₹${((c.discount_amount_minor ?? 0) / 100).toLocaleString()} off`}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[11px] capitalize"
                                                    >
                                                        {c.funding_source}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                                        {c.usage_count}
                                                    </span>
                                                    {c.usage_limit_total
                                                        ? ` / ${c.usage_limit_total}`
                                                        : ' / ∞'}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge
                                                        status={getCampaignSemanticStatus(
                                                            c.status,
                                                        )}
                                                        label={c.status}
                                                        className="capitalize"
                                                    />
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Link
                                                            href={`/admin/rewards/campaigns/${c.id}`}
                                                        >
                                                            Details
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </section>

                {/* Recent Points Adjustments Audit Log */}
                <section
                    aria-label="Recent points ledger and manual adjustments"
                    className="space-y-4"
                >
                    {recentAdjustments.length === 0 ? (
                        <EmptyState
                            icon={Coins}
                            title="No manual adjustments recorded"
                            description="Mandatory audit trail entries for loyalty points credits and debits will appear here."
                            action={
                                <Button asChild size="sm" variant="outline">
                                    <Link href="/admin/rewards/points">
                                        <span>Open ledger</span>
                                        <ArrowRight
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-tijum-surface/80 py-5 dark:border-border">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">
                                        Recent Points Ledger &amp; Manual
                                        Adjustments
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Mandatory audit trail for compliance and
                                        accounting reconciliation.
                                    </CardDescription>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/admin/rewards/points">
                                        <span>Open ledger</span>
                                        <ArrowRight
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="pl-6">
                                                Timestamp
                                            </TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Reference</TableHead>
                                            <TableHead className="pr-6 text-right">
                                                Points Delta
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentAdjustments
                                            .slice(0, 5)
                                            .map((a) => (
                                                <TableRow key={a.id}>
                                                    <TableCell className="pl-6 text-xs whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                        {new Date(
                                                            a.created_at,
                                                        ).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="font-heading text-xs font-semibold text-tijum-plum capitalize dark:text-foreground">
                                                        {a.transaction_type.replace(
                                                            '_',
                                                            ' ',
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                        {a.description}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                        {a.reference_code ??
                                                            '-'}
                                                    </TableCell>
                                                    <TableCell
                                                        className={`pr-6 text-right font-heading text-xs font-bold tabular-nums ${
                                                            a.points > 0
                                                                ? 'text-status-success-fg'
                                                                : a.points < 0
                                                                  ? 'text-status-error-fg'
                                                                  : 'text-tijum-plum dark:text-foreground'
                                                        }`}
                                                    >
                                                        {a.points > 0
                                                            ? '+'
                                                            : ''}
                                                        {a.points} pts
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
