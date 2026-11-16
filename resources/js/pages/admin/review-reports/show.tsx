import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    FileText,
    Flag,
    ShieldCheck,
} from 'lucide-react';
import { StarRating } from '@/components/reviews/star-rating';
import { PageHeader } from '@/components/shared/page-header';
import {
    StatusBadge,
    type SemanticStatus,
} from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface AdminReportShowProps {
    report: {
        id: number;
        reporter_type: string;
        reason_category: string;
        reason_label: string;
        explanation?: string | null;
        status: string;
        status_label: string;
        resolution_reason?: string | null;
        resolution_notes?: string | null;
        resolved_at?: string | null;
        resolver_name?: string | null;
        created_at: string;
        review: {
            id: number;
            property_name: string;
            customer_display_name: string;
            overall_rating: number;
            title?: string | null;
            content?: string | null;
            status: string;
            status_label: string;
            published_at?: string | null;
        };
    };
}

function getReportSemanticStatus(status: string): SemanticStatus {
    switch (status) {
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

function getReviewSemanticStatus(status: string): SemanticStatus {
    switch (status) {
        case 'published':
            return 'verified';
        case 'pending_moderation':
            return 'pending';
        case 'rejected':
            return 'rejected';
        case 'hidden':
            return 'neutral';
        default:
            return 'info';
    }
}

export default function AdminReviewReportShow({
    report,
}: AdminReportShowProps) {
    const { data, setData, post, processing, errors } = useForm({
        status: report.status,
        resolution_reason: report.resolution_reason ?? '',
        resolution_notes: report.resolution_notes ?? '',
    });

    const handleResolve = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/admin/review-reports/${report.id}/resolve`);
    };

    return (
        <div className="space-y-6">
            <Head
                title={`Report #${report.id} Investigation — Command Centre`}
            />

            <PageHeader
                eyebrow={`Content Investigation · Report #${report.id}`}
                title={`Reported Violation: ${report.reason_label}`}
                description={`Filed ${report.created_at} for ${report.review.property_name}`}
                badges={
                    <>
                        <StatusBadge
                            status={getReportSemanticStatus(report.status)}
                            label={report.status_label}
                            className="capitalize"
                        />
                        <Badge variant="outline" className="text-xs capitalize">
                            Reporter: {report.reporter_type}
                        </Badge>
                    </>
                }
                actions={
                    <>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/review-reports">
                                <ArrowLeft
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Back to Report Queue</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/reviews/${report.review.id}`}>
                                <span className="tabular-nums">
                                    Moderate Full Review #{report.review.id}
                                </span>
                                <ArrowRight
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left 2 Cols: Report Details & Flagged Review Preview */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Reporter Explanation Card */}
                    <Card className="gap-0 overflow-hidden border-l-4 border-l-rose-500 py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle className="flex items-center gap-2.5 text-sm font-bold text-status-error-fg">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-status-error-border bg-status-error-bg text-status-error-fg">
                                        <Flag
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span>
                                        Reporter Grounds &amp; Statement
                                    </span>
                                </CardTitle>
                                <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    Filed on {report.created_at}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 py-5">
                            <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-xs dark:border-border dark:bg-muted/45">
                                <div className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                    Category: {report.reason_label}
                                </div>
                                <div className="text-tijum-plum-muted capitalize dark:text-muted-foreground">
                                    Filed by: {report.reporter_type}
                                </div>
                            </div>

                            {report.explanation ? (
                                <div className="space-y-1.5">
                                    <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                        Reporter Explanation
                                    </p>
                                    <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/30 p-4 text-sm leading-relaxed whitespace-pre-line text-tijum-plum/90 italic dark:border-border dark:bg-muted/35 dark:text-foreground/90">
                                        &ldquo;{report.explanation}&rdquo;
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-tijum-plum-muted italic dark:text-muted-foreground">
                                    Reporter selected violation category without
                                    additional explanation text.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Reported Review Preview */}
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <CardTitle className="flex items-center gap-2.5 text-sm font-bold">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                        <FileText
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="tabular-nums">
                                        Flagged Review Preview (#
                                        {report.review.id})
                                    </span>
                                </CardTitle>
                                <StatusBadge
                                    status={getReviewSemanticStatus(
                                        report.review.status,
                                    )}
                                    label={`Status: ${report.review.status_label}`}
                                    className="capitalize"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 py-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    {report.review.property_name}
                                </span>
                                <span className="text-tijum-plum-muted dark:text-muted-foreground">
                                    By {report.review.customer_display_name}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <StarRating
                                    value={report.review.overall_rating}
                                    readonly
                                    size="sm"
                                    showValue
                                />
                            </div>

                            <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                {report.review.title && (
                                    <h4 className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                        {report.review.title}
                                    </h4>
                                )}

                                {report.review.content ? (
                                    <p className="text-xs leading-relaxed whitespace-pre-line text-tijum-plum/90 sm:text-sm dark:text-foreground/90">
                                        {report.review.content}
                                    </p>
                                ) : (
                                    <p className="text-xs text-tijum-plum-muted italic dark:text-muted-foreground">
                                        Rating only without text commentary.
                                    </p>
                                )}
                            </div>

                            <div className="pt-1">
                                <Button asChild size="sm" variant="outline">
                                    <Link
                                        href={`/admin/reviews/${report.review.id}`}
                                        className="inline-flex items-center gap-1.5"
                                    >
                                        <span>
                                            Open Full Review in Moderation
                                            Editor
                                        </span>
                                        <ArrowRight
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Col: Resolution Decision Form & Audit Telemetry */}
                <div className="space-y-6">
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                            <CardTitle className="flex items-center gap-2.5 text-sm font-bold">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                    <ShieldCheck
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span>Investigation Resolution</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-5">
                            <form
                                onSubmit={handleResolve}
                                className="space-y-4"
                            >
                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="status"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Report Status{' '}
                                        <span className="text-status-error-fg">
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(val) =>
                                            setData('status', val)
                                        }
                                    >
                                        <SelectTrigger
                                            id="status"
                                            size="sm"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Select status..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="under_review">
                                                Under Review
                                            </SelectItem>
                                            <SelectItem value="action_taken">
                                                Action Taken (Content
                                                Modified/Hidden)
                                            </SelectItem>
                                            <SelectItem value="no_violation_found">
                                                No Violation Found (Dismissed)
                                            </SelectItem>
                                            <SelectItem value="closed">
                                                Closed
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status && (
                                        <p className="text-xs font-medium text-status-error-fg">
                                            {errors.status}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="resolution_reason"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Resolution Finding / Summary
                                    </Label>
                                    <Textarea
                                        id="resolution_reason"
                                        rows={3}
                                        placeholder="Record your findings: whether content violated policy, actions taken on the review..."
                                        value={data.resolution_reason}
                                        onChange={(e) =>
                                            setData(
                                                'resolution_reason',
                                                e.target.value,
                                            )
                                        }
                                        className="text-xs"
                                    />
                                    {errors.resolution_reason && (
                                        <p className="text-xs font-medium text-status-error-fg">
                                            {errors.resolution_reason}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label
                                        htmlFor="resolution_notes"
                                        className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                    >
                                        Internal Operations Notes (Optional)
                                    </Label>
                                    <Textarea
                                        id="resolution_notes"
                                        rows={2}
                                        placeholder="Additional internal context..."
                                        value={data.resolution_notes}
                                        onChange={(e) =>
                                            setData(
                                                'resolution_notes',
                                                e.target.value,
                                            )
                                        }
                                        className="text-xs"
                                    />
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        loading={processing}
                                        className="w-full"
                                    >
                                        {processing
                                            ? 'Saving...'
                                            : 'Update Report Status'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Audit Telemetry Card */}
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                            <CardTitle className="text-xs font-bold tracking-wider text-tijum-plum-muted uppercase dark:text-muted-foreground">
                                Audit Telemetry
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-tijum-surface/70 py-2 text-xs dark:divide-border">
                            <div className="py-3 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                    Filed:
                                </span>{' '}
                                {report.created_at}
                            </div>
                            {report.resolved_at && (
                                <div className="py-3 text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    <span className="font-heading font-semibold text-tijum-plum dark:text-foreground">
                                        Resolved:
                                    </span>{' '}
                                    {report.resolved_at} by{' '}
                                    {report.resolver_name || 'Admin'}
                                </div>
                            )}
                            {report.resolution_reason && (
                                <div className="space-y-1.5 py-3">
                                    <span className="block font-heading font-semibold text-tijum-plum dark:text-foreground">
                                        Latest Finding:
                                    </span>
                                    <p className="rounded-lg border border-tijum-surface/70 bg-tijum-cream/40 p-2.5 text-tijum-plum-muted italic dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                        {report.resolution_reason}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
