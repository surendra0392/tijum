import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Clock,
    Info,
    MessageSquare,
    ShieldCheck,
    Sparkles,
    Star,
    Tag,
    Utensils,
} from 'lucide-react';
import { StarRating } from '@/components/reviews/star-rating';
import { PageHeader } from '@/components/shared/page-header';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ReservationDetail } from '@/types/reservations';
import type { CustomerReviewDetail } from '@/types/reviews';

interface ReviewFormProps {
    mode: 'create' | 'edit';
    reservation: ReservationDetail;
    property: {
        name: string;
        locality: string;
        city?: string | null;
        food_provided: boolean;
        breakfast_included: boolean;
        lunch_included: boolean;
        dinner_included: boolean;
    };
    eligibility?: {
        window_deadline?: string | null;
        days_remaining?: number | null;
    } | null;
    review?: CustomerReviewDetail | null;
    maxContentLength: number;
}

export default function ReviewForm({
    mode,
    reservation,
    property,
    eligibility,
    review,
    maxContentLength,
}: ReviewFormProps) {
    const isEdit = mode === 'edit';

    const { data, setData, post, put, processing, errors } = useForm({
        overall_rating: review?.overall_rating ?? 5,
        cleanliness_rating: review?.cleanliness_rating ?? null,
        food_quality_rating: review?.food_quality_rating ?? null,
        communication_rating: review?.communication_rating ?? null,
        value_rating: review?.value_rating ?? null,
        title: review?.title ?? '',
        content: review?.content ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && review) {
            put(`/reviews/${review.id}`);
        } else {
            post(`/reservations/${reservation.booking_reference}/review`);
        }
    };

    return (
        <>
            <Head
                title={
                    isEdit
                        ? `Edit Review — ${property.name}`
                        : `Write a Review — ${property.name}`
                }
            />

            <ResponsiveContainer className="py-6 sm:py-8">
                <div className="mx-auto max-w-3xl space-y-6 pb-12">
                    <PageHeader
                        eyebrow="Verified Booking Review"
                        title={
                            isEdit
                                ? 'Edit your experience review'
                                : 'How was your stay?'
                        }
                        description={`Sharing genuine feedback for ${property.name} (${property.locality}${property.city ? `, ${property.city}` : ''}) helps fellow students and professionals choose confidently.`}
                        actions={
                            <Button variant="outline" size="sm" asChild>
                                <Link
                                    href={`/reservations/${reservation.booking_reference}`}
                                >
                                    <ArrowLeft
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Reservation #
                                        {reservation.booking_reference}
                                    </span>
                                </Link>
                            </Button>
                        }
                    />

                    {eligibility?.window_deadline && (
                        <div className="flex items-start gap-3 rounded-2xl border border-tijum-surface/80 bg-white p-4 text-xs text-foreground shadow-2xs sm:text-sm dark:border-border dark:bg-card">
                            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-tijum-peach/30 text-tijum-plum dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                <Clock className="size-4" aria-hidden="true" />
                            </span>
                            <div>
                                <span className="font-heading font-semibold">
                                    Review Submission Window:
                                </span>{' '}
                                You have {eligibility.days_remaining} day(s)
                                remaining (until {eligibility.window_deadline})
                                to post or edit this review.
                            </div>
                        </div>
                    )}

                    {isEdit && (
                        <div className="flex items-start gap-3 rounded-2xl border border-tijum-peach/70 bg-tijum-peach/20 p-4 text-xs text-foreground sm:text-sm dark:border-tijum-coral/40 dark:bg-tijum-coral/10">
                            <Info
                                className="mt-0.5 size-4 shrink-0 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <div>
                                <span className="font-heading font-semibold">
                                    Edit Policy:
                                </span>{' '}
                                Editing your review saves a revision snapshot
                                and re-submits the updated text for TIJUM
                                moderation before public display.
                            </div>
                        </div>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Your Rating &amp; Feedback
                            </CardTitle>
                            <CardDescription>
                                Be objective, constructive, and fair. Your
                                feedback is published with a privacy-safe name.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Overall Rating */}
                                <div className="space-y-2 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/55 p-5 dark:border-border dark:bg-muted/40">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label className="text-sm font-bold text-foreground">
                                            Overall Rating{' '}
                                            <span className="text-tijum-coral">
                                                *
                                            </span>
                                        </Label>
                                        <span className="rounded-full bg-tijum-coral/15 px-2.5 py-0.5 font-heading text-xs font-semibold text-tijum-plum dark:text-tijum-peach">
                                            {data.overall_rating} of 5 Stars
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Tap a star to rate your overall
                                        accommodation and meal experience.
                                    </p>
                                    <div className="pt-2">
                                        <StarRating
                                            value={data.overall_rating}
                                            onChange={(val) =>
                                                setData('overall_rating', val)
                                            }
                                            size="lg"
                                        />
                                    </div>
                                    {errors.overall_rating && (
                                        <p className="text-xs font-medium text-status-error-fg">
                                            {errors.overall_rating}
                                        </p>
                                    )}
                                </div>

                                {/* Category Ratings */}
                                <div className="space-y-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-semibold text-foreground">
                                            Category Ratings (Optional)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Rate specific aspects of your stay
                                            to help future guests understand
                                            property strengths.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 dark:border-border dark:bg-muted/30">
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 font-heading text-xs font-semibold text-foreground">
                                                    <Sparkles className="size-3.5 text-tijum-coral" />
                                                    Cleanliness &amp; Hygiene
                                                </span>
                                                {data.cleanliness_rating && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
                                                        {
                                                            data.cleanliness_rating
                                                        }
                                                        <Star
                                                            className="size-3 fill-tijum-coral text-tijum-coral"
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                            <StarRating
                                                value={
                                                    data.cleanliness_rating ?? 0
                                                }
                                                onChange={(val) =>
                                                    setData(
                                                        'cleanliness_rating',
                                                        val,
                                                    )
                                                }
                                                size="sm"
                                            />
                                        </div>

                                        {property.food_provided && (
                                            <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 dark:border-border dark:bg-muted/30">
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 font-heading text-xs font-semibold text-foreground">
                                                        <Utensils className="size-3.5 text-tijum-coral" />
                                                        Food Quality &amp; Taste
                                                    </span>
                                                    {data.food_quality_rating && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
                                                            {
                                                                data.food_quality_rating
                                                            }
                                                            <Star
                                                                className="size-3 fill-tijum-coral text-tijum-coral"
                                                                aria-hidden="true"
                                                            />
                                                        </span>
                                                    )}
                                                </div>
                                                <StarRating
                                                    value={
                                                        data.food_quality_rating ??
                                                        0
                                                    }
                                                    onChange={(val) =>
                                                        setData(
                                                            'food_quality_rating',
                                                            val,
                                                        )
                                                    }
                                                    size="sm"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 dark:border-border dark:bg-muted/30">
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 font-heading text-xs font-semibold text-foreground">
                                                    <MessageSquare className="size-3.5 text-tijum-coral" />
                                                    Host Communication
                                                </span>
                                                {data.communication_rating && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
                                                        {
                                                            data.communication_rating
                                                        }
                                                        <Star
                                                            className="size-3 fill-tijum-coral text-tijum-coral"
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                            <StarRating
                                                value={
                                                    data.communication_rating ??
                                                    0
                                                }
                                                onChange={(val) =>
                                                    setData(
                                                        'communication_rating',
                                                        val,
                                                    )
                                                }
                                                size="sm"
                                            />
                                        </div>

                                        <div className="space-y-2 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-4 dark:border-border dark:bg-muted/30">
                                            <div className="flex items-center justify-between">
                                                <span className="flex items-center gap-1.5 font-heading text-xs font-semibold text-foreground">
                                                    <Tag className="size-3.5 text-tijum-coral" />
                                                    Value for Money
                                                </span>
                                                {data.value_rating && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
                                                        {data.value_rating}
                                                        <Star
                                                            className="size-3 fill-tijum-coral text-tijum-coral"
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                            <StarRating
                                                value={data.value_rating ?? 0}
                                                onChange={(val) =>
                                                    setData('value_rating', val)
                                                }
                                                size="sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label
                                            htmlFor="title"
                                            className="text-xs font-semibold"
                                        >
                                            Review Headline / Title (Optional)
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground tabular-nums">
                                            {data.title.length}/120
                                        </span>
                                    </div>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Great South Indian meals and peaceful study atmosphere"
                                        value={data.title}
                                        onChange={(e) =>
                                            setData('title', e.target.value)
                                        }
                                        maxLength={120}
                                        className="text-sm"
                                    />
                                    {errors.title && (
                                        <p className="text-xs font-medium text-status-error-fg">
                                            {errors.title}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label
                                            htmlFor="content"
                                            className="text-xs font-semibold"
                                        >
                                            Your Review (Optional)
                                        </Label>
                                        <span className="text-[11px] text-muted-foreground tabular-nums">
                                            {data.content.length}/
                                            {maxContentLength}
                                        </span>
                                    </div>
                                    <Textarea
                                        id="content"
                                        rows={6}
                                        placeholder="Tell other guests what you liked most: room comfort, cleanliness, hot water, Wi-Fi, food menu, safety, and owner hospitality..."
                                        value={data.content}
                                        onChange={(e) =>
                                            setData('content', e.target.value)
                                        }
                                        maxLength={maxContentLength}
                                        className="rounded-xl text-sm leading-relaxed"
                                    />
                                    {errors.content && (
                                        <p className="text-xs font-medium text-status-error-fg">
                                            {errors.content}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5 rounded-2xl border border-tijum-surface/80 bg-tijum-cream/55 p-4 text-xs text-muted-foreground dark:border-border dark:bg-muted/40">
                                    <div className="flex items-center gap-1.5 font-heading font-semibold text-foreground">
                                        <ShieldCheck className="size-4 text-tijum-coral" />
                                        TIJUM Review Moderation Standards
                                    </div>
                                    <p className="leading-relaxed">
                                        All reviews are verified against
                                        confirmed checkouts. Reviews containing
                                        personal phone numbers/addresses,
                                        commercial ads, or profanity are
                                        rejected under our{' '}
                                        <Link
                                            href="/review-policy"
                                            className="font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral dark:text-tijum-peach"
                                            target="_blank"
                                        >
                                            Review Moderation Policy
                                        </Link>
                                        .
                                    </p>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        asChild
                                        disabled={processing}
                                    >
                                        <Link
                                            href={`/reservations/${reservation.booking_reference}`}
                                        >
                                            Cancel
                                        </Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="min-w-36"
                                    >
                                        {processing
                                            ? 'Submitting...'
                                            : isEdit
                                              ? 'Update Review'
                                              : 'Submit Review'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </ResponsiveContainer>
        </>
    );
}
