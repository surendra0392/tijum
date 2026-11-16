import {
    ShieldCheck,
    Sparkles,
    Star,
    Utensils,
    MessageSquare,
    Tag,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from './star-rating';
import type { PropertyRatingSummaryData } from '@/types/reviews';

interface RatingSummaryCardProps {
    summary?: PropertyRatingSummaryData | null;
    showCategories?: boolean;
}

export function RatingSummaryCard({
    summary,
    showCategories = true,
}: RatingSummaryCardProps) {
    if (!summary || summary.published_review_count === 0) {
        return (
            <Card className="border border-dashed border-border/80 bg-muted/20">
                <CardContent className="p-6 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                        No reviews yet
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-tijum-plum/75">
                        This property has no published reviews yet. All future
                        reviews come from verified bookings.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const { average_rating, published_review_count, star_distribution } =
        summary as any;

    const getCount = (stars: number): number => {
        if (!star_distribution) return 0;
        const val =
            star_distribution[stars] ?? star_distribution[String(stars)];
        if (typeof val === 'number') return val;
        if (val && typeof val.count === 'number') return val.count;
        return 0;
    };

    const distributionRows = [5, 4, 3, 2, 1].map((stars) => {
        const count = getCount(stars);
        const percentage =
            published_review_count > 0
                ? Math.round((count / published_review_count) * 100)
                : 0;
        return { stars, count, percentage };
    });

    const categoryScores = [
        {
            label: 'Cleanliness',
            score:
                summary.cleanliness_average ??
                summary.average_cleanliness_rating,
            icon: Sparkles,
        },
        {
            label: 'Food Quality',
            score: summary.food_average ?? summary.average_food_quality_rating,
            icon: Utensils,
        },
        {
            label: 'Host Communication',
            score:
                summary.communication_average ??
                summary.average_communication_rating,
            icon: MessageSquare,
        },
        {
            label: 'Value for Money',
            score: summary.value_average ?? summary.average_value_rating,
            icon: Tag,
        },
    ].filter((cat) => cat.score !== null && cat.score !== undefined);

    return (
        <Card className="border border-border/60 bg-card shadow-sm">
            <CardContent className="space-y-6 p-6">
                <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
                    {/* Overall score pillar */}
                    <div className="flex flex-col items-center justify-center rounded-xl border border-primary/10 bg-primary/5 p-4 text-center md:col-span-4">
                        <div className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
                            {average_rating.toFixed(1)}
                        </div>
                        <div className="mt-2">
                            <StarRating
                                value={average_rating}
                                readonly
                                size="md"
                            />
                        </div>
                        <div className="mt-2 text-sm font-medium text-muted-foreground">
                            Based on {published_review_count} Verified Booking{' '}
                            {published_review_count === 1
                                ? 'review'
                                : 'reviews'}
                        </div>
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-tijum-peach/30 bg-tijum-peach/15 px-2.5 py-1 text-xs font-semibold text-tijum-coral">
                            <ShieldCheck className="h-3.5 w-3.5 text-tijum-coral" />
                            Verified Booking
                        </div>
                    </div>

                    {/* Star distribution bars */}
                    <div className="space-y-2 md:col-span-8">
                        {distributionRows.map((row) => (
                            <div
                                key={row.stars}
                                className="flex items-center gap-3 text-xs md:text-sm"
                            >
                                <span className="w-12 font-medium text-muted-foreground">
                                    {row.stars} star{row.stars > 1 ? 's' : ''}
                                </span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
                                    <div
                                        className="h-full rounded-full bg-tijum-coral"
                                        style={{
                                            width: `${Math.min(100, Math.max(0, row.percentage))}%`,
                                        }}
                                        role="progressbar"
                                        aria-valuenow={row.percentage}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                    />
                                </div>
                                <span className="w-12 text-right font-medium text-muted-foreground tabular-nums">
                                    {row.count}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Optional category breakdowns */}
                {showCategories && categoryScores.length > 0 && (
                    <div className="border-t border-border/60 pt-4">
                        <h4 className="mb-3 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Category Ratings
                        </h4>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {categoryScores.map((cat) => {
                                const Icon = cat.icon;
                                return (
                                    <div
                                        key={cat.label}
                                        className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 p-3"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 shrink-0 text-primary" />
                                            <span className="truncate text-xs font-medium text-foreground">
                                                {cat.label}
                                            </span>
                                        </div>
                                        <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-foreground tabular-nums">
                                            {cat.score?.toFixed(1)}
                                            <Star
                                                className="size-3 fill-tijum-coral text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
