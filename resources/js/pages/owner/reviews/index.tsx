import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Building2,
    CheckCircle2,
    Filter,
    Flag,
    HelpCircle,
    MessageSquare,
    MessageSquareReply,
    RefreshCw,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    Star,
    Utensils,
    Tag,
} from 'lucide-react';
import { useState } from 'react';
import { ReportReviewDialog } from '@/components/reviews/report-review-dialog';
import { StarRating } from '@/components/reviews/star-rating';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface OwnerReviewItem {
    id: number;
    property_name: string;
    customer_display_name: string;
    room_type_name: string;
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
    response?: {
        id: number;
        response_text: string;
        status: string;
        status_label: string;
        published_at?: string | null;
    } | null;
}

interface OwnerReviewsProps {
    properties: Array<{
        id: number;
        name: string;
        average_rating: number;
        published_count: number;
    }>;
    stats: {
        total_reviews: number;
        published_reviews: number;
        unanswered_reviews: number;
    };
    filters: {
        property_id?: number | null;
        rating?: number | null;
        status?: string | null;
    };
    reviews: {
        data: OwnerReviewItem[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
}

export default function OwnerReviewIndex({
    properties,
    stats,
    filters,
    reviews,
}: OwnerReviewsProps) {
    const [propertyId, setPropertyId] = useState(
        filters.property_id ? String(filters.property_id) : 'all',
    );
    const [rating, setRating] = useState(
        filters.rating ? String(filters.rating) : 'all',
    );
    const [status, setStatus] = useState(filters.status ?? 'all');
    const hasActiveFilters = propertyId !== 'all' || rating !== 'all' || status !== 'all';

    // Dialog states for responding
    const [respondingReview, setRespondingReview] =
        useState<OwnerReviewItem | null>(null);
    const [isEditingResponse, setIsEditingResponse] = useState(false);

    // Dialog state for reporting
    const [reportingReviewId, setReportingReviewId] = useState<number | null>(
        null,
    );

    const {
        data: responseData,
        setData: setResponseData,
        post: postResponse,
        put: putResponse,
        processing: submittingResponse,
        errors: responseErrors,
        reset: resetResponse,
    } = useForm({
        response_text: '',
    });

    const handleFilterChange = (
        newPropertyId: string,
        newRating: string,
        newStatus: string,
    ) => {
        router.get(
            '/owner/reviews',
            {
                property_id:
                    newPropertyId !== 'all' ? newPropertyId : undefined,
                rating: newRating !== 'all' ? newRating : undefined,
                status: newStatus !== 'all' ? newStatus : undefined,
            },
            { preserveState: true },
        );
    };

    const openResponseModal = (review: OwnerReviewItem, edit = false) => {
        setRespondingReview(review);
        setIsEditingResponse(edit);
        setResponseData(
            'response_text',
            edit && review.response ? review.response.response_text : '',
        );
    };

    const handleResponseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!respondingReview) return;

        if (isEditingResponse) {
            putResponse(`/owner/reviews/${respondingReview.id}/response`, {
                onSuccess: () => {
                    setRespondingReview(null);
                    resetResponse();
                },
            });
        } else {
            postResponse(`/owner/reviews/${respondingReview.id}/response`, {
                onSuccess: () => {
                    setRespondingReview(null);
                    resetResponse();
                },
            });
        }
    };

    return (
        <div className="space-y-6">
            <Head title="Guest Reviews — Partner Portal" />

            <PageHeader
                title="Guest Reviews & Ratings"
                description="Monitor feedback from verified guests across your properties, reply professionally to reviews, and maintain your reputation."
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Total Reviews
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold tabular-nums text-foreground">
                            {stats.total_reviews}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Across all your registered properties
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Published &amp; Active
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {stats.published_reviews}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Publicly visible to prospective customers
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Awaiting Host Response
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                            {stats.unanswered_reviews}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Published reviews without owner reply
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card>
                <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                            {/* Property Filter */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Building2 className="size-3.5 text-tijum-coral" />
                                    Filter by Property
                                </Label>
                                <Select
                                    value={propertyId}
                                    onValueChange={(val) => {
                                        setPropertyId(val);
                                        handleFilterChange(val, rating, status);
                                    }}
                                >
                                    <SelectTrigger size="sm" className="w-full text-xs">
                                        <SelectValue placeholder="All Properties" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Properties
                                        </SelectItem>
                                        {properties.map((p) => (
                                            <SelectItem
                                                key={p.id}
                                                value={String(p.id)}
                                            >
                                                {p.name} (
                                                {p.average_rating > 0
                                                    ? `${p.average_rating} / 5`
                                                    : 'New'}
                                                )
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Rating Filter */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Star className="size-3.5 text-tijum-coral" />
                                    Rating
                                </Label>
                                <Select
                                    value={rating}
                                    onValueChange={(val) => {
                                        setRating(val);
                                        handleFilterChange(propertyId, val, status);
                                    }}
                                >
                                    <SelectTrigger size="sm" className="w-full text-xs">
                                        <SelectValue placeholder="All Ratings" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Ratings
                                        </SelectItem>
                                        <SelectItem value="5">5 Stars</SelectItem>
                                        <SelectItem value="4">4 Stars</SelectItem>
                                        <SelectItem value="3">3 Stars</SelectItem>
                                        <SelectItem value="2">2 Stars</SelectItem>
                                        <SelectItem value="1">1 Star</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status Filter */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <CheckCircle2 className="size-3.5 text-tijum-coral" />
                                    Review Status
                                </Label>
                                <Select
                                    value={status}
                                    onValueChange={(val) => {
                                        setStatus(val);
                                        handleFilterChange(propertyId, rating, val);
                                    }}
                                >
                                    <SelectTrigger size="sm" className="w-full text-xs">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Statuses
                                        </SelectItem>
                                        <SelectItem value="published">
                                            Published
                                        </SelectItem>
                                        <SelectItem value="pending_moderation">
                                            Pending Moderation
                                        </SelectItem>
                                        <SelectItem value="rejected">
                                            Rejected
                                        </SelectItem>
                                        <SelectItem value="hidden">
                                            Hidden
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Reset & Summary Actions */}
                        <div className="flex items-center justify-between gap-3 sm:justify-end lg:pb-0.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                <span className="font-semibold tabular-nums text-foreground">{reviews.total}</span> {reviews.total === 1 ? 'review' : 'reviews'}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!hasActiveFilters}
                                className={cn(
                                    "h-10 px-3.5 text-xs gap-1.5 shrink-0 transition-opacity",
                                    !hasActiveFilters && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => {
                                    if (!hasActiveFilters) return;
                                    setPropertyId('all');
                                    setRating('all');
                                    setStatus('all');
                                    router.get('/owner/reviews');
                                }}
                            >
                                <RotateCcw className="size-3.5" />
                                Clear Filters
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reviews List */}
            {reviews.data.length === 0 ? (
                <EmptyState
                    icon={Star}
                    title="No reviews match your filters"
                    description="When verified guests complete their stay at your properties and post reviews, they will appear here."
                />
            ) : (
                <div className="space-y-4">
                    {reviews.data.map((rev) => (
                        <Card
                            key={rev.id}
                            className="transition-all hover:border-tijum-coral/40 hover:shadow-md"
                        >
                            <CardContent className="space-y-4 p-5 md:p-6">
                                {/* Header: Property name, rating, guest display name, date */}
                                <div className="flex flex-col justify-between gap-2 border-b border-border/40 pb-3 sm:flex-row sm:items-center">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                {rev.property_name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                · {rev.room_type_name}
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                <ShieldCheck className="h-3 w-3" />
                                                Verified Booking
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <StarRating
                                                value={rev.overall_rating}
                                                readonly
                                                size="sm"
                                                showValue
                                            />
                                            <span className="text-xs font-medium text-muted-foreground">
                                                by {rev.customer_display_name}
                                            </span>
                                            {rev.submitted_at && (
                                                <span className="text-xs text-muted-foreground">
                                                    · {rev.submitted_at}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={
                                                rev.status === 'published'
                                                    ? 'default'
                                                    : rev.status ===
                                                        'pending_moderation'
                                                      ? 'outline'
                                                      : 'destructive'
                                            }
                                            className="text-[11px] capitalize"
                                        >
                                            {rev.status_label}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setReportingReviewId(rev.id)
                                            }
                                            className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-destructive"
                                            title="Report this review if it violates content policy"
                                        >
                                            <Flag className="h-3.5 w-3.5" />
                                            Report
                                        </Button>
                                    </div>
                                </div>

                                {/* Review Title and Content */}
                                <div className="space-y-1.5">
                                    {rev.title && (
                                        <h4 className="text-sm font-semibold text-foreground">
                                            {rev.title}
                                        </h4>
                                    )}
                                    {rev.content ? (
                                        <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/90 sm:text-sm">
                                            {rev.content}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                            Guest provided a star rating without
                                            written text.
                                        </p>
                                    )}
                                </div>

                                {/* Category Ratings if provided */}
                                {(rev.cleanliness_rating ||
                                    rev.food_quality_rating ||
                                    rev.communication_rating ||
                                    rev.value_rating) && (
                                    <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-2 text-xs text-muted-foreground">
                                        {rev.cleanliness_rating && (
                                            <span className="inline-flex items-center gap-1 rounded border border-border/40 bg-muted/40 px-2 py-0.5">
                                                <span>Cleanliness:</span>
                                                <strong className="inline-flex items-center gap-0.5">
                                                    {rev.cleanliness_rating}
                                                    <Star
                                                        className="size-3 fill-amber-400 text-amber-400"
                                                        aria-hidden="true"
                                                    />
                                                </strong>
                                            </span>
                                        )}
                                        {rev.food_quality_rating && (
                                            <span className="inline-flex items-center gap-1 rounded border border-border/40 bg-muted/40 px-2 py-0.5">
                                                <span>Food:</span>
                                                <strong className="inline-flex items-center gap-0.5">
                                                    {rev.food_quality_rating}
                                                    <Star
                                                        className="size-3 fill-amber-400 text-amber-400"
                                                        aria-hidden="true"
                                                    />
                                                </strong>
                                            </span>
                                        )}
                                        {rev.communication_rating && (
                                            <span className="inline-flex items-center gap-1 rounded border border-border/40 bg-muted/40 px-2 py-0.5">
                                                <span>Communication:</span>
                                                <strong className="inline-flex items-center gap-0.5">
                                                    {rev.communication_rating}
                                                    <Star
                                                        className="size-3 fill-amber-400 text-amber-400"
                                                        aria-hidden="true"
                                                    />
                                                </strong>
                                            </span>
                                        )}
                                        {rev.value_rating && (
                                            <span className="inline-flex items-center gap-1 rounded border border-border/40 bg-muted/40 px-2 py-0.5">
                                                <span>Value:</span>
                                                <strong className="inline-flex items-center gap-0.5">
                                                    {rev.value_rating}
                                                    <Star
                                                        className="size-3 fill-amber-400 text-amber-400"
                                                        aria-hidden="true"
                                                    />
                                                </strong>
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Owner Response Block */}
                                {rev.response ? (
                                    <div className="mt-3 space-y-1.5 rounded-xl border border-border/70 border-l-4 border-l-tijum-coral bg-muted/40 p-3.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-xs font-bold text-foreground">
                                                    Your Public Response
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="ml-1 text-[10px]"
                                                >
                                                    {rev.response.status_label}
                                                </Badge>
                                            </div>
                                            {rev.response.status ===
                                                'pending_moderation' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        openResponseModal(
                                                            rev,
                                                            true,
                                                        )
                                                    }
                                                    className="h-7 px-2.5 text-xs"
                                                >
                                                    Edit Response
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-xs text-foreground/80 italic sm:text-sm">
                                            &ldquo;{rev.response.response_text}
                                            &rdquo;
                                        </p>
                                    </div>
                                ) : rev.status === 'published' ? (
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                openResponseModal(rev, false)
                                            }
                                            className="gap-1.5 text-xs"
                                        >
                                            <MessageSquareReply className="h-3.5 w-3.5 text-primary" />
                                            Respond to Review
                                        </Button>
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                            Showing{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {reviews.data.length}
                            </span>{' '}
                            of{' '}
                            <span className="font-semibold text-tijum-plum dark:text-foreground">
                                {reviews.total}
                            </span>{' '}
                            {reviews.total === 1 ? 'review' : 'reviews'}
                        </p>
                        <Pagination
                            currentPage={reviews.current_page}
                            totalPages={reviews.last_page}
                            getPageHref={(page) => {
                                const params = new URLSearchParams();
                                if (propertyId !== 'all')
                                    params.set('property_id', propertyId);
                                if (rating !== 'all')
                                    params.set('rating', rating);
                                if (status !== 'all')
                                    params.set('status', status);
                                params.set('page', String(page));
                                return `/owner/reviews?${params.toString()}`;
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Respond Modal */}
            {respondingReview && (
                <Dialog
                    open={Boolean(respondingReview)}
                    onOpenChange={(open) => !open && setRespondingReview(null)}
                >
                    <DialogContent className="sm:max-w-lg">
                        <form onSubmit={handleResponseSubmit}>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <MessageSquareReply className="h-5 w-5 text-primary" />
                                    {isEditingResponse
                                        ? 'Edit Host Response'
                                        : 'Reply to Guest Review'}
                                </DialogTitle>
                                <DialogDescription className="mt-1 text-xs text-muted-foreground">
                                    Your response will be reviewed by TIJUM
                                    moderation before appearing publicly below
                                    the customer review on the property page.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="my-3 space-y-1 rounded-lg border border-border/50 bg-muted/40 p-3 text-xs">
                                <div className="inline-flex items-center gap-1 font-semibold text-foreground">
                                    <span>
                                        Review by{' '}
                                        {respondingReview.customer_display_name}{' '}
                                        ({respondingReview.overall_rating}
                                    </span>
                                    <Star
                                        className="size-3 fill-amber-400 text-amber-400"
                                        aria-hidden="true"
                                    />
                                    <span>):</span>
                                </div>
                                <p className="truncate text-muted-foreground italic">
                                    &ldquo;
                                    {respondingReview.content ||
                                        respondingReview.title ||
                                        'Rating only'}
                                    &rdquo;
                                </p>
                            </div>

                            <div className="space-y-2 py-2">
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="response_text"
                                        className="text-xs font-semibold"
                                    >
                                        Host Response Message{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <span className="text-[11px] text-muted-foreground">
                                        {responseData.response_text.length}/2000
                                    </span>
                                </div>
                                <Textarea
                                    id="response_text"
                                    rows={4}
                                    required
                                    placeholder="Thank the guest for their feedback, address any concerns politely, and explain improvements made..."
                                    value={responseData.response_text}
                                    onChange={(e) =>
                                        setResponseData(
                                            'response_text',
                                            e.target.value,
                                        )
                                    }
                                    maxLength={2000}
                                    className="text-xs leading-relaxed"
                                />
                                {responseErrors.response_text && (
                                    <p className="text-xs font-medium text-destructive">
                                        {responseErrors.response_text}
                                    </p>
                                )}
                            </div>

                            <DialogFooter className="mt-4 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRespondingReview(null)}
                                    disabled={submittingResponse}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        submittingResponse ||
                                        responseData.response_text.trim()
                                            .length < 5
                                    }
                                >
                                    {submittingResponse
                                        ? 'Submitting...'
                                        : 'Submit for Moderation'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Reporting Modal */}
            {reportingReviewId && (
                <ReportReviewDialog
                    reviewId={reportingReviewId}
                    isOpen={Boolean(reportingReviewId)}
                    onClose={() => setReportingReviewId(null)}
                    endpoint={`/owner/reviews/${reportingReviewId}/report`}
                />
            )}
        </div>
    );
}
