import { Head, Link, router } from '@inertiajs/react';
import {
    Archive,
    Edit3,
    ExternalLink,
    Image as ImageIcon,
    Mail,
    MousePointerClick,
    Plus,
    Target,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/layouts/admin-layout';
import type { MarketingCampaign } from '@/types/marketing';

interface Props {
    campaigns: {
        data: MarketingCampaign[];
        current_page: number;
        last_page: number;
        total: number;
    };
    statuses: Array<{ value: string; label: string }>;
    filters: {
        status?: string | null;
    };
}

function getCampaignSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'active':
            return 'active';
        case 'scheduled':
            return 'pending';
        case 'paused':
            return 'warning';
        case 'completed':
            return 'completed';
        case 'archived':
            return 'cancelled';
        default:
            return 'neutral';
    }
}

export default function AdminCampaignsIndex({
    campaigns,
    statuses,
    filters,
}: Props) {
    const [campaignToArchive, setCampaignToArchive] =
        useState<MarketingCampaign | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);

    const handleFilterChange = (status: string) => {
        router.get('/admin/marketing/campaigns', status ? { status } : {}, {
            preserveState: true,
        });
    };

    const handleArchiveConfirm = () => {
        if (!campaignToArchive) {
            return;
        }

        setIsArchiving(true);
        router.delete(`/admin/marketing/campaigns/${campaignToArchive.id}`, {
            onFinish: () => {
                setIsArchiving(false);
                setCampaignToArchive(null);
            },
        });
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Marketing & Growth', href: '/admin/marketing' },
                { title: 'Campaigns', href: '/admin/marketing/campaigns' },
            ]}
        >
            <Head title="Marketing Campaigns — Growth Admin" />

            <div className="space-y-6 pb-10">
                <PageHeader
                    eyebrow="Marketing · Acquisition & UTM"
                    title="Marketing Campaigns & UTM Tracking"
                    description="Track acquisition channels, landing page conversions, promotional banners, and email initiatives."
                    actions={
                        <Button asChild>
                            <Link href="/admin/marketing/campaigns/create">
                                <Plus className="size-4" aria-hidden="true" />
                                <span>Create Campaign</span>
                            </Link>
                        </Button>
                    }
                />

                {/* Filter */}
                <Card className="py-4">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                value={filters.status || 'all'}
                                onValueChange={(value) =>
                                    handleFilterChange(
                                        value === 'all' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger
                                    size="sm"
                                    className="min-w-48"
                                    aria-label="Filter campaigns by status"
                                >
                                    <SelectValue placeholder="All Campaign Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Campaign Statuses
                                    </SelectItem>
                                    {statuses.map((s) => (
                                        <SelectItem
                                            key={s.value}
                                            value={s.value}
                                        >
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {filters.status && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFilterChange('')}
                                >
                                    <X
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Clear</span>
                                </Button>
                            )}
                        </div>

                        <Badge
                            variant="secondary"
                            className="font-semibold tabular-nums"
                        >
                            {campaigns.total.toLocaleString()} campaigns
                        </Badge>
                    </CardContent>
                </Card>

                {/* Campaign List */}
                {campaigns.data.length === 0 ? (
                    <EmptyState
                        icon={Target}
                        title="No marketing campaigns found"
                        description="Create a tracked UTM campaign to monitor attribution links, banners, and email conversions."
                        action={
                            filters.status ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFilterChange('')}
                                >
                                    Reset Filter
                                </Button>
                            ) : (
                                <Button asChild size="sm">
                                    <Link href="/admin/marketing/campaigns/create">
                                        <Plus
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Create Campaign</span>
                                    </Link>
                                </Button>
                            )
                        }
                    />
                ) : (
                    <Card className="overflow-hidden py-0">
                        <div className="divide-y divide-tijum-surface/70 dark:divide-border">
                            {campaigns.data.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex flex-col items-start justify-between gap-4 p-5 transition-colors hover:bg-tijum-cream/35 md:flex-row md:items-center dark:hover:bg-muted/40"
                                >
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge
                                                status={getCampaignSemanticStatus(
                                                    c.status,
                                                )}
                                                label={c.status}
                                                className="text-[11px] capitalize"
                                            />
                                            <span className="text-xs text-tijum-plum-muted capitalize dark:text-muted-foreground">
                                                Objective:{' '}
                                                <strong className="text-tijum-plum dark:text-foreground">
                                                    {c.objective.replaceAll(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </strong>
                                            </span>
                                        </div>

                                        <h3 className="font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                                            {c.name}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                                            <span className="rounded-lg border border-tijum-surface/80 bg-tijum-cream/40 px-2.5 py-1 text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                                                utm_source=
                                                <strong>{c.utm_source}</strong>
                                            </span>
                                            <span className="rounded-lg border border-tijum-surface/80 bg-tijum-cream/40 px-2.5 py-1 text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                                                utm_medium=
                                                <strong>{c.utm_medium}</strong>
                                            </span>
                                            <span className="rounded-lg border border-tijum-surface/80 bg-tijum-cream/40 px-2.5 py-1 text-tijum-plum dark:border-border dark:bg-muted/45 dark:text-foreground">
                                                utm_campaign=
                                                <strong>
                                                    {c.utm_campaign}
                                                </strong>
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            <span className="inline-flex items-center gap-1.5">
                                                <ImageIcon
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {(
                                                    c.banners_count ?? 0
                                                ).toLocaleString()}{' '}
                                                banners
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Mail
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {(
                                                    c.email_campaigns_count ?? 0
                                                ).toLocaleString()}{' '}
                                                emails
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 font-semibold text-tijum-coral">
                                                <MousePointerClick
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {(
                                                    c.tracking_events_count ?? 0
                                                ).toLocaleString()}{' '}
                                                tracked hits
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2 self-end md:self-center">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <a
                                                href={c.target_landing_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="View Target Page"
                                                aria-label={`View landing page for ${c.name}`}
                                            >
                                                <ExternalLink
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>Landing</span>
                                            </a>
                                        </Button>
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Link
                                                href={`/admin/marketing/campaigns/${c.id}/edit`}
                                            >
                                                <Edit3
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>Edit</span>
                                            </Link>
                                        </Button>
                                        {c.status !== 'archived' && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setCampaignToArchive(c)
                                                }
                                                className="border-status-error-border text-status-error-fg hover:bg-status-error-bg/70 hover:text-status-error-fg"
                                                title="Archive Campaign"
                                                aria-label={`Archive campaign ${c.name}`}
                                            >
                                                <Archive
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {campaigns.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {campaigns.total ?? campaigns.data.length}
                                </span>{' '}
                                campaign(s)
                            </p>
                            <Pagination
                                currentPage={campaigns.current_page ?? 1}
                                lastPage={campaigns.last_page ?? 1}
                                total={campaigns.total}
                                onPageChange={(page) =>
                                    router.get(
                                        '/admin/marketing/campaigns',
                                        {
                                            ...(filters.status
                                                ? { status: filters.status }
                                                : {}),
                                            page,
                                        },
                                        { preserveState: true },
                                    )
                                }
                            />
                        </div>
                    </Card>
                )}

                <ConfirmationDialog
                    open={Boolean(campaignToArchive)}
                    onOpenChange={(open) => {
                        if (!open) {
                            setCampaignToArchive(null);
                        }
                    }}
                    title="Archive Marketing Campaign"
                    description={
                        campaignToArchive
                            ? `Archive marketing campaign "${campaignToArchive.name}"? Historical telemetry remains preserved.`
                            : ''
                    }
                    confirmLabel="Archive Campaign"
                    tone="destructive"
                    loading={isArchiving}
                    onConfirm={handleArchiveConfirm}
                />
            </div>
        </AdminLayout>
    );
}
