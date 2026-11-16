import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Plus,
    Search,
    TicketPercent,
    TrendingUp,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import AdminLayout from '@/layouts/admin-layout';
import type { BreadcrumbItem } from '@/types';

interface CampaignRecord {
    id: number | string;
    reference?: string;
    name?: string;
    title?: string;
    code?: string;
    type?: string;
    status: string;
    status_label?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    valid_from?: string;
    valid_to?: string;
    budget_minor?: number | null;
    spent_minor?: number | null;
    coupons_count?: number;
    usage_count?: number;
    usage_limit_total?: number | null;
    offer_type?: string;
    discount_percentage?: number | null;
    discount_amount_minor?: number | null;
    min_booking_amount_minor?: number | null;
    funding_source?: string;
    platform_split_percentage?: number;
    property_split_percentage?: number;
    coupons?: Array<{
        code: string;
        offer_type: string;
        used_count: number;
        is_active: boolean;
    }>;
}

interface Props {
    campaigns:
        | {
              data: CampaignRecord[];
              current_page?: number;
              last_page?: number;
              total?: number;
          }
        | CampaignRecord[];
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

export default function AdminCampaignsIndex({ campaigns }: Props) {
    const rawList: CampaignRecord[] = Array.isArray(campaigns)
        ? campaigns
        : (campaigns?.data ?? []);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Admin Console', href: '/admin/dashboard' },
        { title: 'Rewards', href: '/admin/rewards' },
        { title: 'Campaigns', href: '/admin/rewards/campaigns' },
    ];

    const filteredCampaigns = useMemo(() => {
        return rawList.filter((c) => {
            const campaignTitle = (c.name || c.title || '').toLowerCase();
            const campaignCode = (
                c.coupons?.[0]?.code ||
                c.code ||
                c.reference ||
                ''
            ).toLowerCase();
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                campaignCode.includes(q) || campaignTitle.includes(q);
            const matchesStatus =
                statusFilter === 'all' || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [rawList, searchQuery, statusFilter]);

    const totalCampaigns = Array.isArray(campaigns)
        ? rawList.length
        : (campaigns?.total ?? rawList.length);
    const activeCount = rawList.filter((c) => c.status === 'active').length;
    const pausedOrDraftCount = rawList.filter(
        (c) => c.status === 'paused' || c.status === 'draft',
    ).length;
    const totalRedemptions = rawList.reduce(
        (sum, c) => sum + (c.coupons?.[0]?.used_count ?? c.usage_count ?? 0),
        0,
    );

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Promotional Campaigns & Coupons — TIJUM Admin" />

            <div className="space-y-6 pb-12">
                <PageHeader
                    eyebrow="Promotions & Coupons"
                    title="Promotional Campaigns"
                    description="Create, configure, and monitor discount coupons and seasonal promotions."
                    badges={
                        <Badge variant="plum" className="tabular-nums">
                            {totalCampaigns} Total Campaigns
                        </Badge>
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

                {/* Summary KPI Strip */}
                <section
                    aria-label="Campaign portfolio summary"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Total Campaigns"
                        value={totalCampaigns}
                        helperText="Configured promotions"
                        icon={TicketPercent}
                    />
                    <StatCard
                        label="Active Campaigns"
                        value={activeCount}
                        helperText="Live on current page"
                        icon={CheckCircle2}
                        className="border-l-4 border-l-emerald-500"
                    />
                    <StatCard
                        label="Paused & Drafts"
                        value={pausedOrDraftCount}
                        helperText="Pending activation"
                        icon={Clock}
                        className="border-l-4 border-l-amber-500"
                    />
                    <StatCard
                        label="Redemptions (Page)"
                        value={totalRedemptions.toLocaleString()}
                        helperText="Coupon uses recorded"
                        icon={TrendingUp}
                        className="border-l-4 border-l-tijum-coral"
                    />
                </section>

                {/* Search Card */}
                <Card className="py-4">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5">
                        <div className="relative w-full max-w-md flex-1">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                placeholder="Search campaigns by code or title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 pr-9 pl-9 text-xs"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    aria-label="Clear campaign search"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute top-1/2 right-3 -translate-y-1/2 text-tijum-plum-muted transition-colors hover:text-tijum-plum dark:text-muted-foreground dark:hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                            Showing {filteredCampaigns.length} of{' '}
                            {totalCampaigns} campaigns
                        </span>
                    </CardContent>
                </Card>

                {/* Standalone Status Pill Tabs */}
                <Tabs
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                    className="space-y-0"
                >
                    <TabsList
                        variant="pill"
                        label="Filter campaigns by status"
                    >
                        <TabsTrigger value="all">All Statuses</TabsTrigger>
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="paused">Paused</TabsTrigger>
                        <TabsTrigger value="draft">Draft</TabsTrigger>
                        <TabsTrigger value="expired">Expired</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Campaigns Table */}
                {filteredCampaigns.length === 0 ? (
                    <EmptyState
                        icon={TicketPercent}
                        title="No campaigns found"
                        description="Try adjusting your search query or status filter, or create a new promotional campaign."
                        action={
                            searchQuery || statusFilter !== 'all' ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStatusFilter('all');
                                    }}
                                >
                                    Reset filters
                                </Button>
                            ) : (
                                <Button asChild size="sm" variant="default">
                                    <Link href="/admin/rewards/campaigns/create">
                                        <Plus
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        <span>Create Campaign</span>
                                    </Link>
                                </Button>
                            )
                        }
                    />
                ) : (
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-tijum-surface/80 py-5 dark:border-border">
                            <div className="space-y-1">
                                <CardTitle className="text-base">
                                    Campaign Registry
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Active and historical promotional offers
                                    with funding split coverage.
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="tabular-nums">
                                {filteredCampaigns.length} shown
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="pl-6">
                                            Campaign &amp; Code
                                        </TableHead>
                                        <TableHead>Discount Offer</TableHead>
                                        <TableHead>Funding Source</TableHead>
                                        <TableHead>Redemptions</TableHead>
                                        <TableHead>Active Window</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="pr-6 text-right">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCampaigns.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="pl-6">
                                                <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                    {c.name ||
                                                        c.title ||
                                                        c.reference ||
                                                        `Campaign #${c.id}`}
                                                </p>
                                                <span className="mt-1 inline-flex rounded-lg border border-tijum-surface/80 bg-tijum-cream/60 px-2 py-0.5 font-mono text-[11px] font-bold text-tijum-plum dark:border-border dark:bg-muted dark:text-foreground">
                                                    {c.coupons?.[0]?.code ||
                                                        c.code ||
                                                        c.reference ||
                                                        '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs tabular-nums">
                                                {c.coupons?.[0] ? (
                                                    <span className="font-heading font-bold text-status-success-fg capitalize">
                                                        {
                                                            c.coupons[0]
                                                                .offer_type
                                                        }
                                                    </span>
                                                ) : c.offer_type ===
                                                  'percentage' ? (
                                                    <span className="font-heading font-bold text-status-success-fg">
                                                        {c.discount_percentage}%
                                                        OFF
                                                    </span>
                                                ) : c.offer_type ===
                                                  'fixed_amount' ? (
                                                    <span className="font-heading font-bold text-status-success-fg">
                                                        ₹
                                                        {(
                                                            (c.discount_amount_minor ??
                                                                0) / 100
                                                        ).toLocaleString()}{' '}
                                                        OFF
                                                    </span>
                                                ) : (
                                                    <span className="font-heading font-bold text-status-success-fg capitalize">
                                                        {c.type ||
                                                            'Promotional Offer'}
                                                    </span>
                                                )}
                                                {c.min_booking_amount_minor ? (
                                                    <span className="mt-0.5 block text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                                        Min: ₹
                                                        {(
                                                            c.min_booking_amount_minor /
                                                            100
                                                        ).toLocaleString()}
                                                    </span>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-xs capitalize">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[11px] capitalize"
                                                >
                                                    {c.funding_source ||
                                                        'Platform'}
                                                </Badge>
                                                {c.funding_source ===
                                                    'split' && (
                                                    <span className="mt-1 block text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                        {c.platform_split_percentage ??
                                                            50}
                                                        % TIJUM /{' '}
                                                        {c.property_split_percentage ??
                                                            50}
                                                        % Partner
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs tabular-nums">
                                                <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                                    {c.coupons?.[0]
                                                        ?.used_count ??
                                                        c.usage_count ??
                                                        0}
                                                </span>
                                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                                    {c.usage_limit_total
                                                        ? ` / ${c.usage_limit_total}`
                                                        : ' / Unlimited'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs whitespace-nowrap text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                <span>
                                                    {c.starts_at ||
                                                        (c.valid_from
                                                            ? new Date(
                                                                  c.valid_from,
                                                              ).toLocaleDateString()
                                                            : 'Immediate')}
                                                </span>
                                                <span className="mx-1">→</span>
                                                <span>
                                                    {c.ends_at ||
                                                        (c.valid_to
                                                            ? new Date(
                                                                  c.valid_to,
                                                              ).toLocaleDateString()
                                                            : 'Ongoing')}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge
                                                    status={getCampaignSemanticStatus(
                                                        c.status,
                                                    )}
                                                    label={
                                                        c.status_label ||
                                                        c.status
                                                    }
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

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-6 py-3.5 text-xs text-tijum-plum-muted tabular-nums dark:border-border dark:bg-muted/20 dark:text-muted-foreground">
                            <span>
                                Showing {filteredCampaigns.length} of{' '}
                                {totalCampaigns} campaigns
                            </span>
                            <Pagination
                                currentPage={
                                    !Array.isArray(campaigns)
                                        ? (campaigns?.current_page ?? 1)
                                        : 1
                                }
                                totalPages={
                                    !Array.isArray(campaigns)
                                        ? (campaigns?.last_page ?? 1)
                                        : 1
                                }
                                getPageHref={(page) =>
                                    `/admin/rewards/campaigns?page=${page}`
                                }
                            />
                        </div>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}
