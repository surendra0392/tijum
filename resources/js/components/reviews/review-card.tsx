import {
    Flag,
    MessageSquare,
    ShieldCheck,
    Sparkles,
    Star,
    Utensils,
    Tag,
} from 'lucide-react';
import { useState } from 'react';
import { StarRating } from './star-rating';
import { ReportReviewDialog } from './report-review-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { PublicReviewItem } from '@/types/reviews';

interface ReviewCardProps {
    review: PublicReviewItem;
    canReport?: boolean;
    reportEndpoint?: string;
}

export function ReviewCard({
    review,
    canReport = true,
    reportEndpoint,
}: ReviewCardProps) {
    const [reportOpen, setReportOpen] = useState(false);

    const categoryRatings = [
        {
            label: 'Cleanliness',
            score: review.cleanliness_rating,
            icon: Sparkles,
        },
        { label: 'Food', score: review.food_quality_rating, icon: Utensils },
        {
            label: 'Communication',
            score: review.communication_rating,
            icon: MessageSquare,
        },
        { label: 'Value', score: review.value_rating, icon: Tag },
    ].filter((cat) => cat.score !== null && cat.score !== undefined);

    return (
        <Card className="border border-border/70 bg-card/60 shadow-sm transition-colors hover:bg-card">
            <CardContent className="space-y-4 p-5 md:p-6">
                {/* Header: User name, badges, rating, date */}
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground md:text-base">
                                {review.customer_display_name}
                            </span>
                            {review.verified_booking && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-tijum-peach/30 bg-tijum-peach/15 px-2 py-0.5 text-[11px] font-semibold text-tijum-coral">
                                    <ShieldCheck className="h-3 w-3 text-tijum-coral" />
                                    Verified Booking
                                </span>
                            )}
                            {review.room_type_name && (
                                <span className="rounded-full border border-border/40 bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                                    Stayed in: {review.room_type_name}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <StarRating
                                value={review.overall_rating}
                                readonly
                                size="sm"
                                showValue
                            />
                            {review.published_at && (
                                <>
                                    <span className="text-xs text-muted-foreground/40">
                                        •
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {review.published_at}
                                    </span>
                                </>
                            )}
                            {review.is_edited && (
                                <span className="text-[10px] text-muted-foreground italic">
                                    (edited)
                                </span>
                            )}
                        </div>
                    </div>

                    {canReport && (
                        <div className="self-end sm:self-auto">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReportOpen(true)}
                                className="h-7 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Report this review for policy violation"
                            >
                                <Flag className="mr-1 h-3.5 w-3.5" />
                                Report
                            </Button>
                        </div>
                    )}
                </div>

                {/* Review Title & Content */}
                <div className="space-y-2">
                    {review.title && (
                        <h4 className="text-sm leading-snug font-bold text-foreground md:text-base">
                            {review.title}
                        </h4>
                    )}
                    {review.content && (
                        <p className="text-xs leading-relaxed whitespace-pre-line text-foreground/90 md:text-sm">
                            {review.content}
                        </p>
                    )}
                </div>

                {/* Category sub-ratings if available */}
                {categoryRatings.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-2">
                        {categoryRatings.map((cat) => (
                            <span
                                key={cat.label}
                                className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                            >
                                <span>{cat.label}:</span>
                                <span className="inline-flex items-center gap-1 font-bold text-foreground">
                                    {cat.score}
                                    <Star className="size-3 fill-tijum-coral text-tijum-coral" />
                                </span>
                            </span>
                        ))}
                    </div>
                )}

                {/* Owner Response */}
                {review.response && (
                    <div className="mt-4 space-y-2 rounded-xl border-t border-r border-b border-l-4 border-border/50 border-primary bg-muted/40 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-bold text-foreground">
                                    Response from Property Owner
                                </span>
                            </div>
                            {review.response.published_at && (
                                <span className="text-[11px] text-muted-foreground">
                                    {review.response.published_at}
                                </span>
                            )}
                        </div>
                        <p className="text-xs leading-relaxed text-foreground/80 italic md:text-sm">
                            &ldquo;{review.response.response_text}&rdquo;
                        </p>
                    </div>
                )}

                {canReport && (
                    <ReportReviewDialog
                        reviewId={review.id}
                        isOpen={reportOpen}
                        onClose={() => setReportOpen(false)}
                        endpoint={reportEndpoint}
                    />
                )}
            </CardContent>
        </Card>
    );
}
