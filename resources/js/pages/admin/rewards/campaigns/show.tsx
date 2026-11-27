import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Coins,
    Copy,
    Pause,
    Play,
    ShieldCheck,
    TicketPercent,
    TrendingUp,
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import type { BreadcrumbItem } from '@/types';

interface RedemptionLog {
    id: number | string;
    reservation_code?: string;
    booking_reference?: string;
    coupon_code?: string;
    customer_name?: string;
    booking_amount_minor?: number;
    discount_amount_minor?: number;
    discount_minor?: number;
    platform_cost_minor?: number;
    platform_share_minor?: number;
    property_cost_minor?: number;
    property_share_minor?: number;
    created_at?: string;
    redeemed_at?: string;
}

interface CampaignDetail {
    id: number | string;
    reference?: string;
    name?: string;
    title?: string;
    code?: string;
    type?: string;
    status: string;
    status_label?: string;
    description?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    valid_from?: string;
    valid_to?: string;
    budget_minor?: number | null;
    spent_minor?: number | null;
    created_by?: string;
    usage_count?: number;
    usage_limit_total?: number | null;
    offer_type?: string;
    discount_percentage?: number | null;
    discount_amount_minor?: number | null;
    max_discount_minor?: number | null;
    min_booking_amount_minor?: number | null;
    funding_source?: string;
    coupons?: Array<{
        id: number | string;
        code: string;
        offer_type: string;
        discount_amount_minor?: number | null;
        discount_percentage?: number | null;
        bonus_points?: number | null;
        funding_source?: string;
        total_used_count?: number;
        total_usage_limit?: number | null;
        is_active: boolean;
    }>;
}

interface Props {
    campaign: CampaignDetail;
    stats?: {
        total_redemptions?: number;
        total_discount_disbursed_minor?: number;
        platform_cost_minor?: number;
        property_cost_minor?: number;
        avg_order_value_minor?: number;
    };
    redemptions?:
        | {
              data: RedemptionLog[];
              current_page?: number;
              last_page?: number;
              total?: number;
          }
        | RedemptionLog[];
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

export default function ShowCampaign({
    campaign,
    stats,
    redemptions = [],
}: Props) {
    const [copied, setCopied] = useState(false);

    const campaignName =
        campaign.name ||
        campaign.title ||
        campaign.reference ||
        `Campaign #${campaign.id}`;
    const primaryCoupon = campaign.coupons?.[0];
    const campaignCode =
        primaryCoupon?.code ||
        campaign.code ||
        campaign.reference ||
        'CAMPAIGN';

    const redemptionList: RedemptionLog[] = Array.isArray(redemptions)
        ? redemptions
        : (redemptions?.data ?? []);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin Console', href: '/admin/dashboard' },
        { title: 'Rewards', href: '/admin/rewards' },
        { title: 'Campaigns', href: '/admin/rewards/campaigns' },
        { title: campaignCode, href: '#' },
    ];

    const copyCode = () => {
        if (navigator.clipboard) {
            void navigator.clipboard.writeText(campaignCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const toggleStatus = (newStatus: 'active' | 'paused') => {
        router.post(
            `/admin/rewards/campaigns/${campaign.id}/status`,
            { status: newStatus },
            { preserveScroll: true },
        );
    };

    const totalRedemptions =
        stats?.total_redemptions ??
        primaryCoupon?.total_used_count ??
        campaign.usage_count ??
        redemptionList.length;
    const totalDiscountDisbursed =
        stats?.total_discount_disbursed_minor ?? campaign.spent_minor ?? 0;
    const platformCost =
        stats?.platform_cost_minor ??
        (campaign.funding_source === 'property' ? 0 : totalDiscountDisbursed);
    const avgOrderValue = stats?.avg_order_value_minor ?? 0;

    const offerSummary = primaryCoupon
        ? primaryCoupon.offer_type
        : campaign.offer_type === 'percentage'
          ? `${campaign.discount_percentage}% off${campaign.max_discount_minor ? ` (Cap: ₹${(campaign.max_discount_minor / 100).toLocaleString()})` : ''}`
          : campaign.offer_type === 'fixed_amount'
            ? `₹${((campaign.discount_amount_minor ?? 0) / 100).toLocaleString()} flat reduction`
            : campaign.type || 'Standard Promo';

    const validityDescription =
        campaign.starts_at && campaign.ends_at
            ? `Valid: ${campaign.starts_at} → ${campaign.ends_at}`
            : campaign.valid_from && campaign.valid_to
              ? `Valid from ${new Date(campaign.valid_from).toLocaleDateString()} to ${new Date(campaign.valid_to).toLocaleDateString()}`
              : 'Active promotional window';

    const usageLimit =
        primaryCoupon?.total_usage_limit || campaign.usage_limit_total;
    const fundingSourceLabel =
        primaryCoupon?.funding_source || campaign.funding_source || 'Platform';

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Campaign: ${campaignCode} — TIJUM Admin`} />

            <div className="space-y-6 pb-16">
                <PageHeader
                    eyebrow="Campaign Analytics"
                    title={campaignName}
                    description={validityDescription}
                    badges={
                        <>
                            <Badge variant="plum" className="font-mono">
                                {campaignCode}
                            </Badge>
                            <StatusBadge
                                status={getCampaignSemanticStatus(
                                    campaign.status,
                                )}
                                label={campaign.status_label || campaign.status}
                                className="capitalize"
                            />
                        </>
                    }
                    actions={
                        <>
                            <Button asChild size="sm" variant="outline">
                                <Link href="/admin/rewards/campaigns">
                                    <ArrowLeft
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Back to Campaigns</span>
                                </Link>
                            </Button>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={copyCode}
                                className="gap-1.5 font-mono text-xs"
                            >
                                {copied ? (
                                    <Check
                                        className="size-3.5 text-status-success-fg"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Copy
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                )}
                                <span>{campaignCode}</span>
                            </Button>

                            {campaign.status === 'active' ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleStatus('paused')}
                                    className="gap-1.5 border-status-warning-border bg-status-warning-bg/70 text-xs text-status-warning-fg hover:bg-status-warning-bg"
                                >
                                    <Pause
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Pause Campaign</span>
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleStatus('active')}
                                    className="gap-1.5 border-status-success-border bg-status-success-bg/70 text-xs text-status-success-fg hover:bg-status-success-bg"
                                >
                                    <Play
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Activate Campaign</span>
                                </Button>
                            )}
                        </>
                    }
                />

                {/* Campaign Analytics KPI Cards */}
                <section
                    aria-label="Campaign performance metrics"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Redemptions"
                        value={totalRedemptions}
                        helperText={`Limit: ${usageLimit ? `${usageLimit} total` : 'Unlimited'}`}
                        icon={TicketPercent}
                    />
                    <StatCard
                        label="Total Discount"
                        value={`₹${(totalDiscountDisbursed / 100).toLocaleString()}`}
                        helperText="Cumulative savings given to guests"
                        icon={Coins}
                        className="border-l-4 border-l-emerald-500"
                    />
                    <StatCard
                        label="Platform Cost"
                        value={`₹${(platformCost / 100).toLocaleString()}`}
                        helperText={`TIJUM marketing subsidy (${fundingSourceLabel})`}
                        icon={ShieldCheck}
                    />
                    <StatCard
                        label="Avg Booking Value"
                        value={
                            avgOrderValue > 0
                                ? `₹${(avgOrderValue / 100).toLocaleString()}`
                                : '—'
                        }
                        helperText="Basket size with this campaign"
                        icon={TrendingUp}
                        className="border-l-4 border-l-tijum-coral"
                    />
                </section>

                {/* Campaign Configuration Details */}
                <Card>
                    <CardHeader className="border-b border-tijum-surface/80 pb-5 dark:border-border">
                        <CardTitle className="text-base">
                            Campaign Specifications
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Discount rules, minimum basket threshold, and
                            settlement funding structure.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 text-xs sm:grid-cols-3">
                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Offer Type
                            </span>
                            <p className="mt-1.5 font-heading text-sm font-bold text-tijum-plum capitalize tabular-nums dark:text-foreground">
                                {offerSummary}
                            </p>
                        </div>
                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Minimum Booking
                            </span>
                            <p className="mt-1.5 font-heading text-sm font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                {campaign.min_booking_amount_minor
                                    ? `₹${(campaign.min_booking_amount_minor / 100).toLocaleString()}`
                                    : 'None'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Funding &amp; Settlement
                            </span>
                            <p className="mt-1.5 font-heading text-sm font-bold text-tijum-plum capitalize dark:text-foreground">
                                {fundingSourceLabel} funded
                            </p>
                        </div>
                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 sm:col-span-3 dark:border-border dark:bg-muted/45">
                            <span className="font-heading text-[11px] font-semibold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Description
                            </span>
                            <p className="mt-1.5 leading-relaxed text-tijum-plum dark:text-foreground">
                                {campaign.description ||
                                    'No description provided.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Redemptions Table */}
                <section aria-label="Redemption history" className="space-y-4">
                    {redemptionList.length === 0 ? (
                        <EmptyState
                            icon={TicketPercent}
                            title="No redemptions recorded"
                            description="No reservations have redeemed this coupon yet."
                        />
                    ) : (
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/80 py-5 dark:border-border">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">
                                        Redemption History
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Verified guest checkouts using this
                                        promotional campaign.
                                    </CardDescription>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="tabular-nums"
                                >
                                    {redemptionList.length} redemptions
                                </Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="pl-6">
                                                Booking Ref
                                            </TableHead>
                                            <TableHead>Guest Name</TableHead>
                                            <TableHead>Booking Total</TableHead>
                                            <TableHead>
                                                Discount Applied
                                            </TableHead>
                                            <TableHead>
                                                Platform Share
                                            </TableHead>
                                            <TableHead className="pr-6 text-right">
                                                Date
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {redemptionList.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell className="pl-6 font-mono text-xs font-semibold text-tijum-plum tabular-nums dark:text-foreground">
                                                    {r.booking_reference ||
                                                        r.reservation_code ||
                                                        '—'}
                                                </TableCell>
                                                <TableCell className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                    {r.customer_name || 'Guest'}
                                                </TableCell>
                                                <TableCell className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    {r.booking_amount_minor !=
                                                    null
                                                        ? `₹${(r.booking_amount_minor / 100).toLocaleString()}`
                                                        : '—'}
                                                </TableCell>
                                                <TableCell className="font-heading text-xs font-bold text-status-success-fg tabular-nums">
                                                    -₹
                                                    {(
                                                        (r.discount_amount_minor ??
                                                            r.discount_minor ??
                                                            0) / 100
                                                    ).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    ₹
                                                    {(
                                                        (r.platform_cost_minor ??
                                                            r.platform_share_minor ??
                                                            0) / 100
                                                    ).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right text-xs whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    {r.redeemed_at ||
                                                        (r.created_at
                                                            ? new Date(
                                                                  r.created_at,
                                                              ).toLocaleString()
                                                            : '—')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-6 py-3.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
                                    <span>
                                        Showing {redemptionList.length} of{' '}
                                        {!Array.isArray(redemptions) &&
                                        redemptions?.total !== undefined
                                            ? redemptions.total
                                            : redemptionList.length}{' '}
                                        redemptions
                                    </span>
                                    <Pagination
                                        currentPage={
                                            !Array.isArray(redemptions)
                                                ? (redemptions?.current_page ??
                                                  1)
                                                : 1
                                        }
                                        totalPages={
                                            !Array.isArray(redemptions)
                                                ? (redemptions?.last_page ?? 1)
                                                : 1
                                        }
                                        getPageHref={(page) =>
                                            `/admin/rewards/campaigns/${campaign.id}?page=${page}`
                                        }
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
