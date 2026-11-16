import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    Flag,
    RotateCcw,
    ShieldCheck,
    XCircle,
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
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface AdminReportSummary {
    id: number;
    review_id: number;
    property_name: string;
    review_title?: string | null;
    reporter_type: string;
    reason_category: string;
    reason_label: string;
    explanation?: string | null;
    status: string;
    status_label: string;
    assigned_admin_name?: string | null;
    created_at: string;
    resolved_at?: string | null;
}

interface AdminReportIndexProps {
    reports: {
        data: AdminReportSummary[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        status?: string | null;
    };
    counts: {
        submitted: number;
        under_review: number;
        action_taken: number;
        no_violation_found: number;
        closed: number;
    };
}

function getReportSemanticStatus(reportStatus: string): SemanticStatus {
    switch (reportStatus) {
        case 'submitted':
            return 'rejected';
        case 'under_review':
            return 'warning';
        case 'action_taken':
            return 'verified';
        default:
            return 'neutral';
    }
}

export default function AdminReviewReportIndex({
    reports,
    filters,
    counts,
}: AdminReportIndexProps) {
    const [status, setStatus] = useState(filters.status ?? 'all');

    const handleStatusFilter = (newStatus: string) => {
        setStatus(newStatus);
        router.get(
            '/admin/review-reports',
            { status: newStatus !== 'all' ? newStatus : undefined },
            { preserveState: true },
        );
    };

    return (
        <div className="space-y-6">
            <Head title="Review Complaint Reports — Command Centre" />

            <PageHeader
                eyebrow="Trust & Content Integrity"
                title="Review Reports & Content Investigations"
                description="Investigate flagged reviews reported by customers or property owners. Enforce content integrity without suppressing genuine negative reviews."
                actions={
                    <Button asChild variant="outline" size="sm">
                        <Link href="/admin/reviews">
                            <span>Reviews Moderation Queue</span>
                            <ArrowRight
                                className="size-3.5"
                                aria-hidden="true"
                            />
                        </Link>
                    </Button>
                }
            />

            {/* Investigation Counts Strip */}
            <section
                aria-label="Report queue counts"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
                <button
                    type="button"
                    aria-pressed={status === 'submitted'}
                    onClick={() => handleStatusFilter('submitted')}
                    className="w-full cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="New Reports"
                        value={counts.submitted}
                        helperText="Pending triage"
                        icon={Flag}
                        className={cn(
                            'h-full border-l-4 border-l-rose-500 transition-all hover:border-tijum-coral/50',
                            status === 'submitted' &&
                                'border-tijum-coral ring-2 ring-tijum-coral',
                        )}
                    />
                </button>

                <button
                    type="button"
                    aria-pressed={status === 'under_review'}
                    onClick={() => handleStatusFilter('under_review')}
                    className="w-full cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="Under Review"
                        value={counts.under_review}
                        helperText="Active investigations"
                        icon={Clock}
                        className={cn(
                            'h-full border-l-4 border-l-amber-500 transition-all hover:border-tijum-coral/50',
                            status === 'under_review' &&
                                'border-tijum-coral ring-2 ring-tijum-coral',
                        )}
                    />
                </button>

                <button
                    type="button"
                    aria-pressed={status === 'action_taken'}
                    onClick={() => handleStatusFilter('action_taken')}
                    className="w-full cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="Action Taken"
                        value={counts.action_taken}
                        helperText="Content updated"
                        icon={CheckCircle2}
                        className={cn(
                            'h-full border-l-4 border-l-emerald-500 transition-all hover:border-tijum-coral/50',
                            status === 'action_taken' &&
                                'border-tijum-coral ring-2 ring-tijum-coral',
                        )}
                    />
                </button>

                <button
                    type="button"
                    aria-pressed={status === 'no_violation_found'}
                    onClick={() => handleStatusFilter('no_violation_found')}
                    className="w-full cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="No Violation"
                        value={counts.no_violation_found}
                        helperText="Dismissed claims"
                        icon={ShieldCheck}
                        className={cn(
                            'h-full border-l-4 border-l-tijum-plum-muted transition-all hover:border-tijum-coral/50 dark:border-l-muted-foreground',
                            status === 'no_violation_found' &&
                                'border-tijum-coral ring-2 ring-tijum-coral',
                        )}
                    />
                </button>

                <button
                    type="button"
                    aria-pressed={status === 'closed'}
                    onClick={() => handleStatusFilter('closed')}
                    className="w-full cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="Closed"
                        value={counts.closed}
                        helperText="Archived reports"
                        icon={XCircle}
                        className={cn(
                            'h-full border-l-4 border-l-tijum-surface transition-all hover:border-tijum-coral/50 dark:border-l-border',
                            status === 'closed' &&
                                'border-tijum-coral ring-2 ring-tijum-coral',
                        )}
                    />
                </button>
            </section>

            {/* Standalone Filter Pill Tabs Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    value={status}
                    onValueChange={handleStatusFilter}
                    className="space-y-0"
                >
                    <TabsList
                        variant="pill"
                        label="Filter review reports by status"
                    >
                        <TabsTrigger value="all">All Reports</TabsTrigger>
                        <TabsTrigger value="submitted">
                            Submitted ({counts.submitted})
                        </TabsTrigger>
                        <TabsTrigger value="under_review">
                            Under Review ({counts.under_review})
                        </TabsTrigger>
                        <TabsTrigger value="action_taken">
                            Action Taken ({counts.action_taken})
                        </TabsTrigger>
                        <TabsTrigger value="no_violation_found">
                            No Violation ({counts.no_violation_found})
                        </TabsTrigger>
                        <TabsTrigger value="closed">
                            Closed ({counts.closed})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {status !== 'all' && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusFilter('all')}
                    >
                        <RotateCcw
                            className="size-3.5"
                            aria-hidden="true"
                        />
                        <span>Clear Filter</span>
                    </Button>
                )}
            </div>

            {/* Reports List */}
            {reports.data.length === 0 ? (
                <EmptyState
                    icon={Flag}
                    title="No reports in this view"
                    description="When users or property hosts flag review content, reports will appear here for investigation."
                    action={
                        status !== 'all' ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleStatusFilter('all')}
                            >
                                View all reports
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="space-y-3.5">
                    {reports.data.map((r) => (
                        <Card
                            key={r.id}
                            className="py-5 transition-colors hover:border-tijum-coral/45"
                        >
                            <CardContent className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-xs font-semibold text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            REPORT #{r.id}
                                        </span>
                                        <span className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                            {r.property_name}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="text-[11px] capitalize"
                                        >
                                            Reporter: {r.reporter_type}
                                        </Badge>
                                        <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            · {r.created_at}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-heading text-xs font-bold text-status-error-fg">
                                            {r.reason_label}
                                        </span>
                                        {r.assigned_admin_name && (
                                            <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                · Assigned to{' '}
                                                <strong className="font-semibold text-tijum-plum dark:text-foreground">
                                                    {r.assigned_admin_name}
                                                </strong>
                                            </span>
                                        )}
                                    </div>

                                    {r.explanation && (
                                        <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 py-2.5 dark:border-border dark:bg-muted/45">
                                            <p className="line-clamp-2 text-xs leading-relaxed text-tijum-plum/85 italic dark:text-foreground/85">
                                                &ldquo;{r.explanation}&rdquo;
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-2.5 self-end md:self-center">
                                    <StatusBadge
                                        status={getReportSemanticStatus(
                                            r.status,
                                        )}
                                        label={r.status_label}
                                        className="capitalize"
                                    />

                                    <Button asChild size="sm" variant="outline">
                                        <Link
                                            href={`/admin/review-reports/${r.id}`}
                                            className="inline-flex items-center gap-1.5"
                                        >
                                            <span>Investigate Report</span>
                                            <ArrowRight
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <div className="pt-2">
                        <Pagination
                            currentPage={reports.current_page}
                            totalPages={reports.last_page}
                            getPageHref={(page) => {
                                const params = new URLSearchParams();
                                if (status !== 'all')
                                    params.set('status', status);
                                params.set('page', String(page));
                                return `/admin/review-reports?${params.toString()}`;
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
