import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Flag,
    History,
    MessageSquareReply,
    ShieldCheck,
    Star,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { StarRating } from '@/components/reviews/star-rating';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AdminReviewShowProps {
    review: {
        id: number;
        booking_reference: string;
        reservation_id: number;
        check_in_date: string;
        checkout_date: string;
        property: {
            id: number;
            name: string;
            city?: string | null;
            owner_name: string;
        };
        room_type_name: string;
        customer_display_name: string;
        customer_full_name: string;
        customer_email?: string | null;
        overall_rating: number;
        cleanliness_rating?: number | null;
        food_quality_rating?: number | null;
        communication_rating?: number | null;
        value_rating?: number | null;
        title?: string | null;
        content?: string | null;
        status: string;
        status_label: string;
        verified_booking: boolean;
        submitted_at?: string | null;
        published_at?: string | null;
        moderated_at?: string | null;
        moderator_name?: string | null;
        moderation_reason?: string | null;
        moderation_internal_notes?: string | null;
        is_edited: boolean;
        response?: {
            id: number;
            owner_name: string;
            response_text: string;
            status: string;
            status_label: string;
            submitted_at?: string | null;
            published_at?: string | null;
        } | null;
        revisions: Array<{
            id: number;
            previous_title?: string | null;
            previous_content?: string | null;
            previous_overall_rating: number;
            created_at: string;
        }>;
        reports: Array<{
            id: number;
            reporter_type: string;
            reason_label: string;
            explanation?: string | null;
            status: string;
            status_label: string;
            created_at: string;
        }>;
    };
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

export default function AdminReviewShow({ review }: AdminReviewShowProps) {
    const [modData, setModDataState] = useState({
        reason: '',
        internal_notes: '',
    });
    const [submittingMod, setSubmittingMod] = useState(false);
    const [modErrors, setModErrors] = useState<Record<string, string>>({});

    const [submittingRespMod, setSubmittingRespMod] = useState(false);
    const [respModErrors, setRespModErrors] = useState<Record<string, string>>(
        {},
    );

    const setModData = (key: 'reason' | 'internal_notes', value: string) => {
        setModDataState((prev) => ({ ...prev, [key]: value }));
    };

    const handleModerate = (
        action: 'publish' | 'reject' | 'hide' | 'restore',
    ) => {
        setSubmittingMod(true);
        setModErrors({});
        router.post(
            `/admin/reviews/${review.id}/moderate`,
            {
                action,
                reason: modData.reason,
                internal_notes: modData.internal_notes,
            },
            {
                preserveScroll: true,
                onError: (errors) =>
                    setModErrors(errors as Record<string, string>),
                onFinish: () => setSubmittingMod(false),
            },
        );
    };

    const handleModerateResponse = (action: 'publish' | 'reject') => {
        setSubmittingRespMod(true);
        setRespModErrors({});
        router.post(
            `/admin/reviews/${review.id}/moderate-response`,
            {
                action,
                reason: modData.reason,
            },
            {
                preserveScroll: true,
                onError: (errors) =>
                    setRespModErrors(errors as Record<string, string>),
                onFinish: () => setSubmittingRespMod(false),
            },
        );
    };

    const categoryRatings = [
        { label: 'Cleanliness', value: review.cleanliness_rating },
        { label: 'Food Quality', value: review.food_quality_rating },
        { label: 'Communication', value: review.communication_rating },
        { label: 'Value', value: review.value_rating },
    ];

    const hasCategoryRatings = categoryRatings.some((c) => Boolean(c.value));

    return (
        <div className="space-y-6">
            <Head title={`Moderate Review #${review.id} — Command Centre`} />

            <PageHeader
                eyebrow={`Review Moderation · #${review.id}`}
                title={`Review for ${review.property.name}`}
                description={`Stay ${review.check_in_date} to ${review.checkout_date} · ${review.room_type_name}`}
                badges={
                    <>
                        <StatusBadge
                            status={getReviewSemanticStatus(review.status)}
                            label={review.status_label}
                            className="capitalize"
                        />
                        {review.verified_booking && (
                            <Badge
                                variant="outline"
                                className="border-tijum-peach/80 bg-tijum-cream text-xs font-semibold text-tijum-plum dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-peach"
                            >
                                <ShieldCheck
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <span>Verified Booking</span>
                            </Badge>
                        )}
                        {review.is_edited && (
                            <Badge variant="outline" className="text-xs">
                                Edited by Guest
                            </Badge>
                        )}
                    </>
                }
                actions={
                    <>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/reviews">
                                <ArrowLeft
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>Back to Reviews Queue</span>
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link
                                href={`/admin/reservations/${review.booking_reference}`}
                            >
                                <span className="tabular-nums">
                                    View Reservation #{review.booking_reference}
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
                {/* Left 2 Cols: Review Content, Host Response, Revisions & Flags */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Review Content Card */}
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StarRating
                                            value={review.overall_rating}
                                            readonly
                                            size="md"
                                            showValue
                                        />
                                        <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            ({review.overall_rating} of 5 Stars)
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                        <span>
                                            Stay period: {review.check_in_date}
                                        </span>
                                        <ArrowRight
                                            className="inline size-3"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            {review.checkout_date} (
                                            {review.room_type_name})
                                        </span>
                                    </div>
                                </div>
                                {review.submitted_at && (
                                    <div className="text-xs text-tijum-plum-muted tabular-nums sm:text-right dark:text-muted-foreground">
                                        Submitted {review.submitted_at}
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5 py-5">
                            <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                {review.title && (
                                    <h3 className="font-heading text-base font-bold text-tijum-plum dark:text-foreground">
                                        {review.title}
                                    </h3>
                                )}
                                {review.content ? (
                                    <p className="text-sm leading-relaxed whitespace-pre-line text-tijum-plum/90 dark:text-foreground/90">
                                        {review.content}
                                    </p>
                                ) : (
                                    <p className="text-sm text-tijum-plum-muted italic dark:text-muted-foreground">
                                        No text commentary provided. Rating
                                        only.
                                    </p>
                                )}
                            </div>

                            {hasCategoryRatings && (
                                <div className="grid grid-cols-2 gap-3 border-t border-tijum-surface/70 pt-4 sm:grid-cols-4 dark:border-border">
                                    {categoryRatings.map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3 dark:border-border dark:bg-muted/45"
                                        >
                                            <span className="block text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                                {item.label}
                                            </span>
                                            <span className="mt-1 block font-heading text-sm font-bold text-tijum-plum tabular-nums dark:text-foreground">
                                                {item.value ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <span>
                                                            {item.value}
                                                        </span>
                                                        <Star
                                                            className="size-3.5 fill-tijum-coral text-tijum-coral"
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                ) : (
                                                    'N/A'
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Owner Response Section */}
                    {review.response && (
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                            <MessageSquareReply
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <CardTitle className="text-sm font-bold">
                                            Host Response from{' '}
                                            {review.response.owner_name}
                                        </CardTitle>
                                    </div>
                                    <StatusBadge
                                        status={getReviewSemanticStatus(
                                            review.response.status,
                                        )}
                                        label={review.response.status_label}
                                        className="capitalize"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 py-5">
                                <div className="rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-4 dark:border-border dark:bg-muted/45">
                                    <p className="text-sm leading-relaxed text-tijum-plum/90 italic dark:text-foreground/90">
                                        &ldquo;{review.response.response_text}
                                        &rdquo;
                                    </p>
                                </div>

                                {review.response.submitted_at && (
                                    <div className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                        Submitted {review.response.submitted_at}
                                    </div>
                                )}

                                {review.response.status ===
                                    'pending_moderation' && (
                                    <div className="space-y-3 border-t border-tijum-surface/70 pt-4 dark:border-border">
                                        <Label className="text-xs font-semibold text-tijum-plum dark:text-foreground">
                                            Moderate Owner Response
                                        </Label>
                                        {respModErrors.reason && (
                                            <p className="text-xs font-medium text-status-error-fg">
                                                {respModErrors.reason}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-2.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() =>
                                                    handleModerateResponse(
                                                        'publish',
                                                    )
                                                }
                                                disabled={submittingRespMod}
                                                loading={submittingRespMod}
                                            >
                                                <CheckCircle2
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Approve &amp; Publish
                                                    Response
                                                </span>
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                    handleModerateResponse(
                                                        'reject',
                                                    )
                                                }
                                                disabled={submittingRespMod}
                                            >
                                                <XCircle
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span>Reject Response</span>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Revision History */}
                    {review.revisions.length > 0 && (
                        <Card className="gap-0 overflow-hidden py-0">
                            <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-tijum-surface/80 bg-tijum-cream text-tijum-plum dark:border-border dark:bg-muted dark:text-foreground">
                                        <History
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <CardTitle className="text-sm font-bold">
                                            Customer Edit Revisions (
                                            {review.revisions.length})
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Snapshots of earlier versions edited
                                            by the customer within the 7-day
                                            window.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 py-5">
                                {review.revisions.map((rev) => (
                                    <div
                                        key={rev.id}
                                        className="space-y-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-xs dark:border-border dark:bg-muted/45"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-tijum-plum dark:text-foreground">
                                            <span className="inline-flex items-center gap-1.5 tabular-nums">
                                                <span>
                                                    Rating:{' '}
                                                    {
                                                        rev.previous_overall_rating
                                                    }
                                                </span>
                                                <Star
                                                    className="size-3.5 fill-tijum-coral text-tijum-coral"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    —{' '}
                                                    {rev.previous_title ||
                                                        'Untitled'}
                                                </span>
                                            </span>
                                            <span className="font-normal text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                {rev.created_at}
                                            </span>
                                        </div>
                                        {rev.previous_content && (
                                            <p className="line-clamp-2 leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                {rev.previous_content}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Reported Content Flags */}
                    {review.reports.length > 0 && (
                        <Card className="gap-0 overflow-hidden border-l-4 border-l-rose-500 py-0">
                            <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-status-error-border bg-status-error-bg text-status-error-fg">
                                        <Flag
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <CardTitle className="text-sm font-bold text-status-error-fg">
                                        Reports Filed Against This Review (
                                        {review.reports.length})
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 py-5">
                                {review.reports.map((rep) => (
                                    <div
                                        key={rep.id}
                                        className="space-y-1.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 p-3.5 text-xs dark:border-border dark:bg-muted/45"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-heading font-bold text-tijum-plum dark:text-foreground">
                                                {rep.reason_label}
                                            </span>
                                            <StatusBadge
                                                status={getReportSemanticStatus(
                                                    rep.status,
                                                )}
                                                label={rep.status_label}
                                                className="text-[11px] capitalize"
                                            />
                                        </div>
                                        <p className="text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                            Reporter:{' '}
                                            <strong className="font-semibold text-tijum-plum capitalize dark:text-foreground">
                                                {rep.reporter_type}
                                            </strong>{' '}
                                            · {rep.created_at}
                                        </p>
                                        {rep.explanation && (
                                            <p className="pt-1 leading-relaxed text-tijum-plum/90 italic dark:text-foreground/90">
                                                &ldquo;{rep.explanation}&rdquo;
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Col: Moderation Action Form & Metadata */}
                <div className="space-y-6">
                    {/* Moderation Actions Card */}
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-tijum-peach/80 bg-tijum-cream text-tijum-coral dark:border-tijum-coral/35 dark:bg-tijum-coral/15">
                                    <ShieldCheck
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                                <span>Moderation Decision</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 py-5">
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="reason"
                                    className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Decision Reason / Policy Note
                                </Label>
                                <Textarea
                                    id="reason"
                                    rows={3}
                                    placeholder="State the objective grounds for rejection or hiding (required for rejection)..."
                                    value={modData.reason}
                                    onChange={(e) =>
                                        setModData('reason', e.target.value)
                                    }
                                    className="text-xs"
                                />
                                {modErrors.reason && (
                                    <p className="text-xs font-medium text-status-error-fg">
                                        {modErrors.reason}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="internal_notes"
                                    className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                                >
                                    Internal Admin Notes (Private)
                                </Label>
                                <Textarea
                                    id="internal_notes"
                                    rows={2}
                                    placeholder="Audit notes visible only to operations..."
                                    value={modData.internal_notes}
                                    onChange={(e) =>
                                        setModData(
                                            'internal_notes',
                                            e.target.value,
                                        )
                                    }
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-2.5 pt-2">
                                {review.status !== 'published' && (
                                    <Button
                                        type="button"
                                        className="w-full"
                                        onClick={() =>
                                            handleModerate('publish')
                                        }
                                        disabled={submittingMod}
                                        loading={submittingMod}
                                    >
                                        <CheckCircle2
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            Approve &amp; Publish Review
                                        </span>
                                    </Button>
                                )}

                                {review.status !== 'rejected' && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => handleModerate('reject')}
                                        disabled={
                                            submittingMod ||
                                            !modData.reason.trim()
                                        }
                                    >
                                        <XCircle
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Reject Review</span>
                                    </Button>
                                )}

                                {review.status === 'published' && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-status-warning-border text-status-warning-fg hover:border-status-warning-border hover:bg-status-warning-bg dark:hover:bg-status-warning-bg"
                                        onClick={() => handleModerate('hide')}
                                        disabled={
                                            submittingMod ||
                                            !modData.reason.trim()
                                        }
                                    >
                                        <EyeOff
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Hide Review (Investigation)</span>
                                    </Button>
                                )}

                                {review.status === 'hidden' && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() =>
                                            handleModerate('restore')
                                        }
                                        disabled={submittingMod}
                                    >
                                        <Eye
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Restore Review to Published</span>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Guest & Property Metadata Card */}
                    <Card className="gap-0 overflow-hidden py-0">
                        <CardHeader className="border-b border-tijum-surface/80 py-5 dark:border-border">
                            <CardTitle className="text-sm font-bold">
                                Verification Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-tijum-surface/70 py-2 text-xs dark:divide-border">
                            <div className="space-y-1 py-3">
                                <span className="block text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                    Guest Full Name
                                </span>
                                <span className="block font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    {review.customer_full_name}
                                </span>
                                <span className="block text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    Display Name: {review.customer_display_name}
                                </span>
                                {review.customer_email && (
                                    <span className="block text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                        Email: {review.customer_email}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1 py-3">
                                <span className="block text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                    Property
                                </span>
                                <span className="block font-heading text-sm font-semibold text-tijum-plum dark:text-foreground">
                                    {review.property.name}
                                </span>
                                <span className="block text-[11px] text-tijum-plum-muted dark:text-muted-foreground">
                                    Host: {review.property.owner_name}
                                    {review.property.city
                                        ? ` (${review.property.city})`
                                        : ''}
                                </span>
                            </div>

                            <div className="space-y-1 py-3">
                                <span className="block text-[11px] font-medium text-tijum-plum-muted dark:text-muted-foreground">
                                    Last Moderated
                                </span>
                                <span className="block font-medium text-tijum-plum tabular-nums dark:text-foreground">
                                    {review.moderated_at
                                        ? `${review.moderated_at} by ${review.moderator_name || 'Admin'}`
                                        : 'Not moderated yet'}
                                </span>
                                {review.moderation_reason && (
                                    <p className="mt-1 rounded-lg border border-tijum-surface/70 bg-tijum-cream/40 p-2.5 text-tijum-plum-muted italic dark:border-border dark:bg-muted/45 dark:text-muted-foreground">
                                        Note: {review.moderation_reason}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
