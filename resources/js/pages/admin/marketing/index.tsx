import { Head, Link } from '@inertiajs/react';
import {
    ChevronRight,
    Eye,
    Image as ImageIcon,
    Mail,
    MousePointerClick,
    Plus,
    Sparkles,
    Tag,
    Target,
    TrendingUp,
    Users,
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
import AdminLayout from '@/layouts/admin-layout';
import type {
    MarketingEmailCampaign,
    MarketingSubscriber,
} from '@/types/marketing';

interface Props {
    metrics: {
        active_campaigns: number;
        live_banners: number;
        total_subscribers: number;
        unsubscribed_count: number;
        published_articles: number;
        published_pages: number;
    };
    trackingStats: {
        total_page_views: number;
        total_blog_views: number;
        total_banner_clicks: number;
        total_cta_clicks: number;
        total_newsletter_signups: number;
    };
    utmBreakdown: Array<{
        utm_campaign: string;
        count: number;
    }>;
    recentEmailCampaigns: MarketingEmailCampaign[];
    recentSubscribers: MarketingSubscriber[];
}

function getSubscriberSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'subscribed':
            return 'active';
        case 'pending_confirmation':
            return 'pending';
        case 'bounced':
            return 'rejected';
        default:
            return 'neutral';
    }
}

function getEmailSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'sent':
            return 'completed';
        case 'sending':
            return 'processing';
        case 'scheduled':
            return 'pending';
        case 'cancelled':
            return 'cancelled';
        default:
            return 'neutral';
    }
}

export default function AdminMarketingDashboard({
    metrics,
    trackingStats,
    utmBreakdown,
    recentEmailCampaigns,
    recentSubscribers,
}: Props) {
    const telemetryItems = [
        {
            label: 'Page Views',
            value: trackingStats.total_page_views,
            icon: Eye,
        },
        {
            label: 'Article Reads',
            value: trackingStats.total_blog_views,
            icon: Sparkles,
        },
        {
            label: 'Banner Clicks',
            value: trackingStats.total_banner_clicks,
            icon: MousePointerClick,
        },
        {
            label: 'CTA Clicks',
            value: trackingStats.total_cta_clicks,
            icon: Tag,
        },
        {
            label: 'Newsletter Opt-ins',
            value: trackingStats.total_newsletter_signups,
            icon: Users,
        },
    ];

    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Marketing & Growth', href: '/admin/marketing' },
            ]}
        >
            <Head title="Marketing & Growth Operations — TIJUM Admin" />

            <div className="space-y-6 pb-10">
                <PageHeader
                    eyebrow="Growth & Acquisition"
                    title="Marketing Operations & Growth"
                    description="Audience growth, on-site promotional banners, permission-based email marketing, and first-party campaign telemetry."
                    actions={
                        <>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/marketing/campaigns/create">
                                    <Plus
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>New Campaign</span>
                                </Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link href="/admin/marketing/emails/create">
                                    <Mail
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span>Compose Email</span>
                                </Link>
                            </Button>
                        </>
                    }
                />

                {/* Primary Metric KPI Cards */}
                <section
                    aria-label="Marketing overview metrics"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    <StatCard
                        label="Verified Subscribers"
                        value={metrics.total_subscribers.toLocaleString()}
                        helperText={`${metrics.unsubscribed_count.toLocaleString()} unsubscribed · Permission-based`}
                        icon={Users}
                    />
                    <StatCard
                        label="Active Banners"
                        value={metrics.live_banners.toLocaleString()}
                        helperText="Hero & page strip placements"
                        icon={ImageIcon}
                    />
                    <StatCard
                        label="Live Campaigns"
                        value={metrics.active_campaigns.toLocaleString()}
                        helperText="With verified UTM tracking"
                        icon={Target}
                    />
                    <StatCard
                        label="First-Party Telemetry"
                        value={(
                            trackingStats.total_page_views +
                            trackingStats.total_banner_clicks
                        ).toLocaleString()}
                        helperText="Privacy-compliant hits"
                        icon={TrendingUp}
                        badge={
                            <Badge variant="food" className="text-[10px]">
                                Zero 3rd-Party
                            </Badge>
                        }
                    />
                </section>

                {/* First-Party Telemetry Overview */}
                <Card>
                    <CardHeader className="flex-col justify-between gap-3 border-b border-tijum-surface/80 pb-4 sm:flex-row sm:items-center dark:border-border">
                        <div className="space-y-1">
                            <CardTitle className="text-base sm:text-lg">
                                On-Site Activity Telemetry
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Aggregated events logged with hashed client
                                identifiers.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-[11px]">
                            Strict Zero Third-Party Tracker Standard
                        </Badge>
                    </CardHeader>

                    <CardContent>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            {telemetryItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <div
                                        key={item.label}
                                        className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 text-center dark:border-border dark:bg-muted/45"
                                    >
                                        <span className="flex size-8 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                            <Icon
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="font-heading text-xl font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                            {item.value.toLocaleString()}
                                        </div>
                                        <span className="text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                            {item.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Top UTM Campaigns */}
                    <Card>
                        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <div className="space-y-0.5">
                                <CardTitle className="text-base sm:text-lg">
                                    Top UTM Campaigns
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Attributed inbound visits by campaign tag
                                </CardDescription>
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/marketing/campaigns">
                                    <span>View all</span>
                                    <ChevronRight
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </Button>
                        </CardHeader>

                        <CardContent>
                            {utmBreakdown.length === 0 ? (
                                <EmptyState
                                    icon={Tag}
                                    title="No campaign clicks recorded yet"
                                    description="Tracked UTM campaign visits will appear here once active links receive traffic."
                                    className="bg-tijum-cream/35 py-8 shadow-none dark:bg-muted/35"
                                />
                            ) : (
                                <div className="space-y-2.5">
                                    {utmBreakdown.map((utm, idx) => (
                                        <div
                                            key={`${utm.utm_campaign}-${idx}`}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 py-2.5 text-xs dark:border-border dark:bg-muted/45"
                                        >
                                            <span className="max-w-xs truncate font-mono font-medium text-tijum-plum dark:text-foreground">
                                                {utm.utm_campaign}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className="font-semibold tabular-nums"
                                            >
                                                {utm.count.toLocaleString()}{' '}
                                                visits
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Subscribers */}
                    <Card>
                        <CardHeader className="flex-row items-center justify-between gap-3 border-b border-tijum-surface/80 pb-4 dark:border-border">
                            <div className="space-y-0.5">
                                <CardTitle className="text-base sm:text-lg">
                                    Recent Newsletter Opt-Ins
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Latest verified audience sign-ups
                                </CardDescription>
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/admin/marketing/subscribers">
                                    <span>View all</span>
                                    <ChevronRight
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </Button>
                        </CardHeader>

                        <CardContent>
                            {recentSubscribers.length === 0 ? (
                                <EmptyState
                                    icon={Users}
                                    title="No subscribers yet"
                                    description="Confirmed newsletter subscribers and consent sources will show up here."
                                    className="bg-tijum-cream/35 py-8 shadow-none dark:bg-muted/35"
                                />
                            ) : (
                                <div className="space-y-2.5">
                                    {recentSubscribers.map((sub) => (
                                        <div
                                            key={sub.id}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 py-2.5 text-xs dark:border-border dark:bg-muted/45"
                                        >
                                            <div className="min-w-0 space-y-0.5">
                                                <div className="truncate font-semibold text-tijum-plum dark:text-foreground">
                                                    {sub.email}
                                                </div>
                                                <div className="text-[11px] text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                    Source: {sub.source}
                                                    {sub.created_at
                                                        ? ` • ${new Date(sub.created_at).toLocaleDateString()}`
                                                        : ''}
                                                </div>
                                            </div>
                                            <StatusBadge
                                                status={getSubscriberSemanticStatus(
                                                    sub.status,
                                                )}
                                                label={sub.status.replace(
                                                    '_',
                                                    ' ',
                                                )}
                                                className="text-[11px] capitalize"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Email Campaigns */}
                <Card>
                    <CardHeader className="flex-row items-center justify-between gap-3 border-b border-tijum-surface/80 pb-4 dark:border-border">
                        <div className="space-y-0.5">
                            <CardTitle className="text-base sm:text-lg">
                                Recent Email Marketing Broadcasts
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Latest drafted, scheduled, and sent audience
                                broadcasts
                            </CardDescription>
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/marketing/emails">
                                <span>Manage all</span>
                                <ChevronRight
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    </CardHeader>

                    <CardContent>
                        {recentEmailCampaigns.length === 0 ? (
                            <EmptyState
                                icon={Mail}
                                title="No email campaigns composed yet"
                                description="Draft your first permission-based broadcast to engage confirmed subscribers."
                                action={
                                    <Button asChild size="sm">
                                        <Link href="/admin/marketing/emails/create">
                                            <Mail
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                            <span>Compose Email</span>
                                        </Link>
                                    </Button>
                                }
                                className="bg-tijum-cream/35 py-8 shadow-none dark:bg-muted/35"
                            />
                        ) : (
                            <div className="divide-y divide-tijum-surface/70 dark:divide-border">
                                {recentEmailCampaigns.map((em) => (
                                    <div
                                        key={em.id}
                                        className="flex flex-col justify-between gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
                                    >
                                        <div className="min-w-0 space-y-1">
                                            <div className="truncate font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                                {em.title}
                                            </div>
                                            <div className="truncate text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                Subject: &ldquo;{em.subject}
                                                &rdquo;
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-3">
                                            <StatusBadge
                                                status={getEmailSemanticStatus(
                                                    em.status,
                                                )}
                                                label={em.status}
                                                className="capitalize"
                                            />
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Link
                                                    href={`/admin/marketing/emails/${em.id}/edit`}
                                                >
                                                    Edit
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
