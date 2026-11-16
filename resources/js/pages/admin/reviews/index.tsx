import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    Eye,
    Flag,
    MessageSquareReply,
    RotateCcw,
    Search,
    ShieldCheck,
    Star,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { StarRating } from '@/components/reviews/star-rating';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface AdminReviewSummary {
    id: number;
    booking_reference: string;
    property_name: string;
    city_name?: string | null;
    customer_display_name: string;
    customer_email?: string | null;
    overall_rating: number;
    title?: string | null;
    content?: string | null;
    status: string;
    status_label: string;
    verified_booking: boolean;
    submitted_at?: string | null;
    published_at?: string | null;
    reports_count: number;
    has_response: boolean;
}

interface AdminReviewIndexProps {
    reviews: {
        data: AdminReviewSummary[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    filters: {
        status?: string | null;
        rating?: number | null;
        city_id?: number | null;
        search?: string | null;
    };
    counts: {
        pending_moderation: number;
        published: number;
        rejected: number;
        hidden: number;
        reported: number;
    };
    cities: Array<{ id: number; name: string }>;
}

function getReviewSemanticStatus(reviewStatus: string): SemanticStatus {
    switch (reviewStatus) {
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

export default function AdminReviewIndex({
    reviews,
    filters,
    counts,
    cities,
}: AdminReviewIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [rating, setRating] = useState(
        filters.rating ? String(filters.rating) : 'all',
    );
    const [cityId, setCityId] = useState(
        filters.city_id ? String(filters.city_id) : 'all',
    );

    const handleFilterChange = (
        newStatus: string,
        newRating: string,
        newCityId: string,
        newSearch: string,
    ) => {
        router.get(
            '/admin/reviews',
            {
                status: newStatus !== 'all' ? newStatus : undefined,
                rating: newRating !== 'all' ? newRating : undefined,
                city_id: newCityId !== 'all' ? newCityId : undefined,
                search: newSearch.trim() || undefined,
            },
            { preserveState: true },
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatus('all');
        setRating('all');
        setCityId('all');
        router.get('/admin/reviews');
    };

    const hasActiveFilters =
        search.trim() !== '' ||
        status !== 'all' ||
        rating !== 'all' ||
        cityId !== 'all';

    return (
        <div className="space-y-6">
            <Head title="Customer Review Moderation — Command Centre" />

            <PageHeader
                eyebrow="Trust & Content Integrity"
                title="Customer Reviews & Moderation"
                description="Moderate guest reviews, audit verified booking attachments, investigate reported violations, and maintain rating integrity under voluntary BIS IS 19000:2022 principles."
                actions={
                    <Button asChild variant="outline" size="sm">
                        <Link href="/admin/review-reports">
                            <Flag
                                className="size-3.5 text-tijum-coral"
                                aria-hidden="true"
                            />
                            <span>Review Reports</span>
                            <span className="ml-0.5 rounded-full border border-tijum-peach/80 bg-tijum-cream px-1.5 py-0.5 text-[11px] font-bold text-tijum-plum tabular-nums dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-peach">
                                {counts.reported}
                            </span>
                        </Link>
                    </Button>
                }
            />

            {/* Moderation KPI Strip */}
            <section
                aria-label="Review moderation queue counts"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
            >
                <button
                    type="button"
                    aria-pressed={status === 'pending_moderation'}
                    onClick={() => {
                        setStatus('pending_moderation');
                        handleFilterChange(
                            'pending_moderation',
                            rating,
                            cityId,
                            search,
                        );
                    }}
                    className="w-full cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="Pending"
                        value={counts.pending_moderation}
                        helperText="Awaiting moderation"
                        icon={Clock}
                        className={cn(
                            'h-full border-l-4 border-l-amber-500 transition-all hover:border-tijum-coral/50',
                            status === 'pending_moderation' &&
                                'border-tijum-coral ring-2 ring-tijum-coral',
                        )}
                    />
                </button>

                <button
                    type="button"
                    aria-pressed={status === 'published'}
                    onClick={() => {
                        setStatus('published');
                        handleFilterChange('published', rating, cityId, search);
                    }}
                    className="w-full cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="Published"
                        value={counts.published}
                        helperText="Live on listings"
                        icon={CheckCircle2}
                        className={cn(
                            'h-full border-l-4 border-l-emerald-500 transition-all hover:border-tijum-coral/50',
                            status === 'published' &&
                                'border-tijum-coral ring-2 ring-tijum-coral',
                        )}
                    />
                </button>

                <button
                    type="button"
                    aria-pressed={status === 'rejected'}
                    onClick={() => {
                        setStatus('rejected');
                        handleFilterChange('rejected', rating, cityId, search);
                    }}
                    className="w-full cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="Rejected"
                        value={counts.rejected}
                        helperText="Declined per policy"
                        icon={XCircle}
                        className={cn(
                            'h-full border-l-4 border-l-rose-500 transition-all hover:border-tijum-coral/50',
                            status === 'rejected' &&
                                'border-tijum-coral ring-2 ring-tijum-coral',
                        )}
                    />
                </button>

                <button
                    type="button"
                    aria-pressed={status === 'hidden'}
                    onClick={() => {
                        setStatus('hidden');
                        handleFilterChange('hidden', rating, cityId, search);
                    }}
                    className="w-full cursor-pointer rounded-[20px] text-left focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                >
                    <StatCard
                        label="Hidden"
                        value={counts.hidden}
                        helperText="Under investigation"
                        icon={Eye}
                        className={cn(
                            'h-full border-l-4 border-l-tijum-plum-muted transition-all hover:border-tijum-coral/50 dark:border-l-muted-foreground',
                            status === 'hidden' &&
                                'border-tijum-coral ring-2 ring-tijum-coral',
                        )}
                    />
                </button>

                <StatCard
                    label="Reported Reviews"
                    value={counts.reported}
                    helperText="Flagged for review"
                    icon={Flag}
                    className="h-full border-l-4 border-l-tijum-coral"
                    badge={
                        <Link
                            href="/admin/review-reports"
                            className="font-heading text-xs font-semibold text-tijum-coral hover:underline"
                        >
                            Open queue
                        </Link>
                    }
                />
            </section>

            {/* Search & Filter Card (Separate from Status Pill Tabs) */}
            <Card className="py-4">
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleFilterChange(status, rating, cityId, search);
                        }}
                        className="grid grid-cols-1 gap-3 md:grid-cols-12"
                    >
                        <div className="space-y-1.5 md:col-span-5">
                            <Label
                                htmlFor="reviews-search"
                                className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Search
                            </Label>
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tijum-plum-muted dark:text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="reviews-search"
                                    placeholder="Search by property, customer, booking ref, text..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-10 pl-10 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 md:col-span-3">
                            <Label
                                htmlFor="reviews-city"
                                className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                City
                            </Label>
                            <Select
                                value={cityId}
                                onValueChange={(val) => {
                                    setCityId(val);
                                    handleFilterChange(
                                        status,
                                        rating,
                                        val,
                                        search,
                                    );
                                }}
                            >
                                <SelectTrigger
                                    id="reviews-city"
                                    size="sm"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="All Cities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Cities
                                    </SelectItem>
                                    {cities.map((c) => (
                                        <SelectItem
                                            key={c.id}
                                            value={String(c.id)}
                                        >
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <Label
                                htmlFor="reviews-rating"
                                className="text-xs font-semibold text-tijum-plum dark:text-foreground"
                            >
                                Rating
                            </Label>
                            <Select
                                value={rating}
                                onValueChange={(val) => {
                                    setRating(val);
                                    handleFilterChange(
                                        status,
                                        val,
                                        cityId,
                                        search,
                                    );
                                }}
                            >
                                <SelectTrigger
                                    id="reviews-rating"
                                    size="sm"
                                    className="w-full"
                                >
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

                        <div className="flex items-end gap-2 md:col-span-2">
                            <Button type="submit" size="sm" className="flex-1">
                                Search
                            </Button>
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                    aria-label="Reset filters"
                                >
                                    <RotateCcw
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    <span className="sr-only sm:not-sr-only">
                                        Reset
                                    </span>
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Standalone Status Filter Pill Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs
                    value={status}
                    onValueChange={(val) => {
                        setStatus(val);
                        handleFilterChange(val, rating, cityId, search);
                    }}
                    className="max-w-full space-y-0"
                >
                    <TabsList
                        variant="pill"
                        label="Filter reviews by moderation status"
                        className="max-w-full"
                    >
                        <TabsTrigger value="all">All Reviews</TabsTrigger>
                        <TabsTrigger value="pending_moderation">
                            Pending ({counts.pending_moderation})
                        </TabsTrigger>
                        <TabsTrigger value="published">
                            Published ({counts.published})
                        </TabsTrigger>
                        <TabsTrigger value="rejected">
                            Rejected ({counts.rejected})
                        </TabsTrigger>
                        <TabsTrigger value="hidden">
                            Hidden ({counts.hidden})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                    Showing{' '}
                    <strong className="font-semibold text-tijum-plum dark:text-foreground">
                        {reviews.data.length}
                    </strong>{' '}
                    of{' '}
                    <strong className="font-semibold text-tijum-plum dark:text-foreground">
                        {reviews.total}
                    </strong>{' '}
                    review{reviews.total === 1 ? '' : 's'}
                </span>
            </div>

            {/* Reviews Queue List */}
            {reviews.data.length === 0 ? (
                <EmptyState
                    icon={Star}
                    title="No reviews match your filters"
                    description="Try selecting a different status filter or clearing your search term."
                    action={
                        hasActiveFilters ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReset}
                            >
                                Clear filters
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="space-y-3.5">
                    {reviews.data.map((r) => (
                        <Card
                            key={r.id}
                            className="py-5 transition-colors hover:border-tijum-coral/45"
                        >
                            <CardContent className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div className="min-w-0 flex-1 space-y-2.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-heading text-sm font-bold text-tijum-plum dark:text-foreground">
                                            {r.property_name}
                                        </span>
                                        {r.city_name && (
                                            <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                                · {r.city_name}
                                            </span>
                                        )}
                                        <Link
                                            href={`/admin/reservations/${r.booking_reference}`}
                                            className="font-mono text-xs font-semibold text-tijum-coral tabular-nums hover:underline"
                                        >
                                            #{r.booking_reference}
                                        </Link>
                                        {r.verified_booking && (
                                            <Badge
                                                variant="outline"
                                                className="border-tijum-peach/80 bg-tijum-cream text-[11px] font-semibold text-tijum-plum dark:border-tijum-coral/35 dark:bg-tijum-coral/15 dark:text-tijum-peach"
                                            >
                                                <ShieldCheck
                                                    className="size-3 text-tijum-coral"
                                                    aria-hidden="true"
                                                />
                                                <span>Verified</span>
                                            </Badge>
                                        )}
                                        {r.has_response && (
                                            <Badge
                                                variant="outline"
                                                className="border-status-info-border bg-status-info-bg text-[11px] text-status-info-fg"
                                            >
                                                <MessageSquareReply
                                                    className="size-3"
                                                    aria-hidden="true"
                                                />
                                                <span>Host Replied</span>
                                            </Badge>
                                        )}
                                        {r.reports_count > 0 && (
                                            <Badge
                                                variant="destructive"
                                                className="gap-1 text-[11px] tabular-nums"
                                            >
                                                <Flag
                                                    className="size-3"
                                                    aria-hidden="true"
                                                />
                                                {r.reports_count} Report
                                                {r.reports_count > 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <StarRating
                                            value={r.overall_rating}
                                            readonly
                                            size="sm"
                                            showValue
                                        />
                                        <span className="text-xs text-tijum-plum-muted dark:text-muted-foreground">
                                            by{' '}
                                            <strong className="font-semibold text-tijum-plum dark:text-foreground">
                                                {r.customer_display_name}
                                            </strong>
                                            {r.customer_email &&
                                                ` (${r.customer_email})`}
                                        </span>
                                        {r.submitted_at && (
                                            <span className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                                · Submitted {r.submitted_at}
                                            </span>
                                        )}
                                    </div>

                                    {(r.title || r.content) && (
                                        <div className="space-y-1 rounded-xl border border-tijum-surface/80 bg-tijum-cream/40 px-3.5 py-2.5 dark:border-border dark:bg-muted/45">
                                            {r.title && (
                                                <p className="font-heading text-xs font-semibold text-tijum-plum dark:text-foreground">
                                                    {r.title}
                                                </p>
                                            )}
                                            {r.content && (
                                                <p className="line-clamp-2 text-xs leading-relaxed text-tijum-plum-muted dark:text-muted-foreground">
                                                    {r.content}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-2.5 self-end md:self-center">
                                    <StatusBadge
                                        status={getReviewSemanticStatus(
                                            r.status,
                                        )}
                                        label={r.status_label}
                                        className="capitalize"
                                    />

                                    <Button asChild size="sm" variant="outline">
                                        <Link
                                            href={`/admin/reviews/${r.id}`}
                                            className="inline-flex items-center gap-1.5"
                                        >
                                            <span>Moderate Review</span>
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
                            currentPage={reviews.current_page}
                            totalPages={reviews.last_page}
                            getPageHref={(page) => {
                                const params = new URLSearchParams();
                                if (status !== 'all')
                                    params.set('status', status);
                                if (rating !== 'all')
                                    params.set('rating', rating);
                                if (cityId !== 'all')
                                    params.set('city_id', cityId);
                                if (search.trim())
                                    params.set('search', search.trim());
                                params.set('page', String(page));
                                return `/admin/reviews?${params.toString()}`;
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
