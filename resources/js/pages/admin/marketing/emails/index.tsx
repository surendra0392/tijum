import { Head, Link, router } from '@inertiajs/react';
import { Calendar, CheckCircle2, Edit3, Mail, Plus, Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AdminLayout from '@/layouts/admin-layout';
import type { MarketingEmailCampaign } from '@/types/marketing';

interface Props {
    emailCampaigns: {
        data: MarketingEmailCampaign[];
        current_page: number;
        last_page: number;
        total: number;
    };
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

export default function AdminEmailCampaignsIndex({ emailCampaigns }: Props) {
    return (
        <AdminLayout
            breadcrumbs={[
                { title: 'Admin Console', href: '/admin/dashboard' },
                { title: 'Marketing & Growth', href: '/admin/marketing' },
                { title: 'Email Campaigns', href: '/admin/marketing/emails' },
            ]}
        >
            <Head title="Email Marketing Broadcasts — TIJUM Admin" />

            <div className="space-y-6 pb-10">
                <PageHeader
                    eyebrow="Marketing · Broadcast Studio"
                    title="Email Marketing Campaigns"
                    description="Permission-based email newsletters, editorial digests, city launches, and promotional announcements."
                    badges={
                        <Badge
                            variant="secondary"
                            className="font-semibold tabular-nums"
                        >
                            {emailCampaigns.total.toLocaleString()} broadcasts
                        </Badge>
                    }
                    actions={
                        <Button asChild>
                            <Link href="/admin/marketing/emails/create">
                                <Plus className="size-4" aria-hidden="true" />
                                <span>Compose New Email</span>
                            </Link>
                        </Button>
                    }
                />

                {/* List */}
                {emailCampaigns.data.length === 0 ? (
                    <EmptyState
                        icon={Mail}
                        title="No email broadcasts found"
                        description='Click "Compose New Email" to draft your first permission-based newsletter or city announcement.'
                        action={
                            <Button asChild size="sm">
                                <Link href="/admin/marketing/emails/create">
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>Compose New Email</span>
                                </Link>
                            </Button>
                        }
                    />
                ) : (
                    <Card className="overflow-hidden py-0">
                        <div className="divide-y divide-tijum-surface/70 dark:divide-border">
                            {emailCampaigns.data.map((em) => (
                                <div
                                    key={em.id}
                                    className="flex flex-col items-start justify-between gap-4 p-5 transition-colors hover:bg-tijum-cream/35 md:flex-row md:items-center dark:hover:bg-muted/40"
                                >
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge
                                                status={getEmailSemanticStatus(
                                                    em.status,
                                                )}
                                                label={em.status}
                                                className="text-[11px] capitalize"
                                            />
                                            <Badge
                                                variant="outline"
                                                className="text-[11px] capitalize"
                                            >
                                                Segment:{' '}
                                                {em.target_segment.replace(
                                                    '_',
                                                    ' ',
                                                )}
                                            </Badge>
                                            {em.marketing_campaign && (
                                                <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                    Campaign:{' '}
                                                    <strong className="text-tijum-plum dark:text-foreground">
                                                        {
                                                            em
                                                                .marketing_campaign
                                                                .name
                                                        }
                                                    </strong>
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="font-heading text-base font-semibold text-tijum-plum dark:text-foreground">
                                            {em.title}
                                        </h3>
                                        <p className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            Subject:{' '}
                                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                                &ldquo;{em.subject}&rdquo;
                                            </span>
                                        </p>

                                        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            {em.sent_at ? (
                                                <span className="inline-flex items-center gap-1.5 font-medium text-status-success-fg">
                                                    <CheckCircle2
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    Dispatched on{' '}
                                                    {new Date(
                                                        em.sent_at,
                                                    ).toLocaleDateString()}
                                                </span>
                                            ) : em.scheduled_for ? (
                                                <span className="inline-flex items-center gap-1.5 font-medium text-status-warning-fg">
                                                    <Calendar
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    Scheduled for{' '}
                                                    {new Date(
                                                        em.scheduled_for,
                                                    ).toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span>Drafted</span>
                                            )}

                                            <span className="inline-flex items-center gap-1.5">
                                                <Users
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {(
                                                    em.total_recipients ?? 0
                                                ).toLocaleString()}{' '}
                                                recipients (
                                                {(
                                                    em.delivered_count ?? 0
                                                ).toLocaleString()}{' '}
                                                delivered)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2 self-end md:self-center">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Link
                                                href={`/admin/marketing/emails/${em.id}/edit`}
                                            >
                                                <Edit3
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {em.status === 'sent'
                                                        ? 'View Details'
                                                        : 'Edit & Dispatch'}
                                                </span>
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 bg-tijum-cream/25 px-5 py-3.5 dark:border-border dark:bg-muted/20">
                            <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                Showing{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {emailCampaigns.data.length}
                                </span>{' '}
                                of{' '}
                                <span className="font-semibold text-tijum-plum dark:text-foreground">
                                    {emailCampaigns.total ??
                                        emailCampaigns.data.length}
                                </span>{' '}
                                email campaign(s)
                            </p>
                            <Pagination
                                currentPage={emailCampaigns.current_page ?? 1}
                                lastPage={emailCampaigns.last_page ?? 1}
                                total={emailCampaigns.total}
                                onPageChange={(page) =>
                                    router.get(
                                        '/admin/marketing/emails',
                                        { page },
                                        { preserveState: true },
                                    )
                                }
                            />
                        </div>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}
