import { Link, router, usePage } from '@inertiajs/react';
import {
    BedDouble,
    CalendarClock,
    CheckCircle2,
    Heart,
    MapPin,
    Share2,
    ShieldCheck,
    Utensils,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { AmenityList } from '@/components/public/amenity-list';
import { FoodInclusionStatus } from '@/components/public/food-inclusion-status';
import { PropertyGalleryShowcase } from '@/components/public/property-detail/property-gallery-showcase';
import { PropertyRoomCard } from '@/components/public/property-detail/property-room-card';
import { PropertyStayPlanner } from '@/components/public/property-detail/property-stay-planner';
import {
    durationPluralLabel,
    durationUnitLabel,
    formatDisplayDate,
    formatMoney,
    rateFor,
    startingRateForProperty,
} from '@/components/public/property-detail/utils';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { RatingSummaryCard } from '@/components/reviews/rating-summary-card';
import { ReviewCard } from '@/components/reviews/review-card';
import { StarRating } from '@/components/reviews/star-rating';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatStayTime } from '@/lib/stay-timing';
import {
    isWishlisted,
    subscribeToWishlist,
    toggleWishlist,
} from '@/lib/wishlist';
import { login, reviewPolicy } from '@/routes';
import { search as publicSearch } from '@/routes/public';
import { show as cityShow } from '@/routes/public/cities';
import { show as propertyShow } from '@/routes/public/properties';
import type { PropertyDetailPageProps } from '@/types/public-search';

export default function PropertyDetailPage({
    property,
    seo,
}: PropertyDetailPageProps) {
    const page = usePage<{
        auth?: { user?: { id: number } | null };
        wishlistIds?: number[];
    }>();
    const isAuthenticated = Boolean(page.props.auth?.user);
    const serverWishlisted =
        isAuthenticated &&
        typeof property.id === 'number' &&
        Array.isArray(page.props.wishlistIds) &&
        page.props.wishlistIds.includes(property.id);
    const [wishlisted, setWishlisted] = useState(() => serverWishlisted);
    const [copied, setCopied] = useState(false);
    const [checkIn, setCheckIn] = useState(
        property.search_context.check_in || '',
    );
    const [durationType, setDurationType] = useState(
        property.search_context.duration_type || 'daily',
    );
    const [durationCount, setDurationCount] = useState(
        String(property.search_context.duration_count || 1),
    );
    const [guests, setGuests] = useState(
        String(property.search_context.guests || 1),
    );

    const images = property.gallery.length > 0 ? property.gallery : [];
    const publishedReviewCount =
        property.rating_summary?.published_review_count ?? 0;
    const publishedReviews = property.published_reviews ?? [];

    useEffect(() => {
        if (!isAuthenticated || typeof property.id !== 'number') {
            setWishlisted(false);
            return;
        }

        const propertyId = property.id;
        setWishlisted(serverWishlisted);

        return subscribeToWishlist((event) => {
            if (
                event.detail.propertyId === propertyId ||
                event.detail.propertyId === 0
            ) {
                setWishlisted(isWishlisted(propertyId));
            }
        });
    }, [isAuthenticated, property.id, serverWishlisted]);

    const todayIso = useMemo(
        () => new Date().toISOString().slice(0, 10),
        [],
    );
    const effectiveCheckIn = checkIn || property.search_context.check_in;
    const safeDurationCount = Math.max(1, Number(durationCount || 1));
    const safeGuests = Math.max(1, Number(guests || 1));

    const checkout = useMemo(() => {
        const configuration = property.durations[durationType] ?? { days: 1 };
        const days = (configuration.days ?? 1) * safeDurationCount;
        if (!effectiveCheckIn) {
            return '';
        }

        const date = new Date(`${effectiveCheckIn}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().slice(0, 10);
    }, [
        durationType,
        safeDurationCount,
        effectiveCheckIn,
        property.durations,
    ]);

    const isContextDirty =
        effectiveCheckIn !== (property.search_context.check_in || '') ||
        durationType !== (property.search_context.duration_type || 'daily') ||
        safeDurationCount !==
            Number(property.search_context.duration_count || 1) ||
        safeGuests !== Number(property.search_context.guests || 1);

    const availableRoomCount = useMemo(
        () =>
            property.room_types.filter((roomType) => {
                const selectedRate = rateFor(roomType, durationType);
                return (
                    roomType.matches_search &&
                    selectedRate != null &&
                    roomType.available_quantity >= safeGuests
                );
            }).length,
        [property.room_types, durationType, safeGuests],
    );

    const startingRateMinor = useMemo(
        () => startingRateForProperty(property.room_types, durationType),
        [property.room_types, durationType],
    );

    const locationLabel = [property.locality, property.city.name]
        .filter(Boolean)
        .join(', ');

    const handleToggleWishlist = () => {
        if (typeof property.id !== 'number') {
            return;
        }

        if (!isAuthenticated) {
            toast.info('Please log in to save stays to your wishlist.');
            router.visit(login().url);
            return;
        }

        const next = toggleWishlist(property.id, property.slug, {
            syncServer: true,
        });
        setWishlisted(next);
    };

    const handleCopyStayLink = async () => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            // Clipboard permission fallback
        }
    };

    const updateRoomOptions = () => {
        router.get(
            propertyShow.url(property.slug),
            {
                check_in: effectiveCheckIn,
                duration_type: durationType,
                duration_count: safeDurationCount,
                guests: safeGuests,
            },
            { preserveScroll: true, preserveState: false },
        );
    };

    const jumpLinks = [
        { href: '#overview', label: 'Overview' },
        { href: '#meals', label: 'Meals & Dining' },
        {
            href: '#rooms',
            label: `Rooms & Rates (${property.room_types.length})`,
        },
        {
            href: '#amenities',
            label: `Amenities (${property.property_amenities.length})`,
        },
        {
            href: '#reviews',
            label: `Reviews (${publishedReviewCount})`,
        },
    ];

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle={`${property.name} | TIJUM`}
                fallbackDescription={property.description ?? ''}
            />

            {/* Hero Header & Architectural Photo Showcase */}
            <section className="bg-tijum-cream pt-6 pb-8 sm:pt-8 lg:pb-12">
                <ResponsiveContainer width="wide" className="space-y-6 sm:space-y-7">
                    <Breadcrumbs
                        items={[
                            { label: 'Explore Stays', href: publicSearch() },
                            ...(property.city?.name && property.city?.slug
                                ? [
                                      {
                                          label: property.city.name,
                                          href: cityShow(property.city.slug),
                                      },
                                  ]
                                : []),
                            { label: property.name, current: true },
                        ]}
                        tone="dark"
                        showHome
                    />

                    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 max-w-4xl space-y-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                                {property.category.name && (
                                    <Badge variant="peach">
                                        {property.category.name}
                                    </Badge>
                                )}
                                <Badge variant="outline">
                                    {property.gender_eligibility}
                                </Badge>
                                <Badge
                                    variant={
                                        property.food.food_provided
                                            ? 'food'
                                            : 'secondary'
                                    }
                                >
                                    {property.food.food_provided
                                        ? 'Meals available'
                                        : 'No meals provided'}
                                </Badge>
                                {publishedReviewCount > 0 && (
                                    <Badge variant="plum">
                                        Verified Booking reviews
                                    </Badge>
                                )}
                            </div>

                            <h1 className="font-heading text-2xl font-bold tracking-[-0.025em] text-tijum-plum sm:text-3xl lg:text-[40px] lg:leading-[1.1] text-balance">
                                {property.name}
                            </h1>

                            <div className="flex flex-col gap-2.5 text-sm text-tijum-lavender sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
                                <p className="flex items-start gap-1.5 font-medium text-tijum-plum/85">
                                    <MapPin
                                        className="mt-0.5 size-4 shrink-0 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {locationLabel}
                                        {property.landmark
                                            ? ` · Near ${property.landmark}`
                                            : ''}
                                    </span>
                                </p>

                                {publishedReviewCount > 0 && (
                                    <a
                                        href="#reviews"
                                        className="inline-flex items-center gap-2 rounded-lg transition-colors hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                                    >
                                        <StarRating
                                            value={
                                                property.rating_summary
                                                    ?.average_rating ?? 0
                                            }
                                            readonly
                                            size="sm"
                                            showValue
                                        />
                                        <span className="font-medium underline decoration-tijum-surface underline-offset-4">
                                            {publishedReviewCount}{' '}
                                            {publishedReviewCount === 1
                                                ? 'review'
                                                : 'reviews'}
                                        </span>
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                            {typeof property.id === 'number' && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={wishlisted ? 'default' : 'outline'}
                                    onClick={handleToggleWishlist}
                                    aria-pressed={wishlisted}
                                    className="gap-1.5"
                                >
                                    <Heart
                                        className={
                                            wishlisted
                                                ? 'size-4 fill-current'
                                                : 'size-4'
                                        }
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {wishlisted ? 'Saved' : 'Save stay'}
                                    </span>
                                </Button>
                            )}
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleCopyStayLink}
                                className="gap-1.5"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2
                                            className="size-4 text-tijum-emerald"
                                            aria-hidden="true"
                                        />
                                        <span>Link copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Share2
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        <span>Share stay</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </header>

                    <PropertyGalleryShowcase
                        propertyName={property.name}
                        locationLabel={locationLabel}
                        images={images}
                    />
                </ResponsiveContainer>
            </section>

            {/* Quick Section Jump Navigation & Snapshot Bar */}
            <div className="border-y border-tijum-surface bg-white">
                <ResponsiveContainer
                    width="wide"
                    className="flex items-center justify-between gap-6"
                >
                    <nav
                        aria-label="Property sections"
                        className="flex items-center gap-1 overflow-x-auto py-1"
                    >
                        {jumpLinks.map((item) => (
                            <a
                                key={item.href}
                                href={item.href}
                                className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3.5 font-heading text-xs font-semibold text-tijum-lavender transition-colors hover:bg-tijum-cream hover:text-tijum-plum focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none sm:text-sm"
                            >
                                {item.label}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-5 py-2 text-xs text-tijum-lavender lg:flex">
                        <span className="flex items-center gap-1.5 font-medium text-tijum-plum">
                            <CalendarClock
                                className="size-3.5 text-tijum-plum"
                                aria-hidden="true"
                            />
                            Check-in {formatStayTime(property.timing.check_in)}
                        </span>
                        {startingRateMinor != null && (
                            <span className="font-heading text-sm font-bold tabular-nums text-tijum-plum">
                                From {formatMoney(startingRateMinor)} /{' '}
                                {durationUnitLabel(durationType)}
                            </span>
                        )}
                    </div>
                </ResponsiveContainer>
            </div>

            {/* Editorial Content Stream & Compact Sticky Stay Planner */}
            <section className="bg-tijum-cream pt-10 pb-28 sm:pt-12 lg:py-16">
                <ResponsiveContainer width="wide">
                    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                        <div className="order-2 min-w-0 space-y-14 lg:order-1 lg:col-span-7 xl:col-span-8">
                            {/* Overview, Address & Timing */}
                            <section
                                id="overview"
                                aria-labelledby="property-overview-heading"
                                className="scroll-mt-24 space-y-6"
                            >
                                <div className="space-y-3">
                                    <p className="font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                        Stay overview
                                    </p>
                                    <h2
                                        id="property-overview-heading"
                                        className="tijum-section-title"
                                    >
                                        About {property.name}
                                    </h2>
                                    {property.description && (
                                        <p className="max-w-[65ch] text-base leading-[1.7] text-tijum-plum/85 sm:text-[17px] text-pretty">
                                            {property.description}
                                        </p>
                                    )}
                                </div>

                                <dl className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-[20px] border border-tijum-surface bg-white p-6 shadow-tijum-card">
                                        <dt className="flex items-center gap-2 font-heading text-xs font-semibold tracking-wider text-tijum-plum uppercase">
                                            <span className="flex size-8 items-center justify-center rounded-lg bg-tijum-peach/30 text-tijum-plum">
                                                <MapPin
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            Address &amp; neighbourhood
                                        </dt>
                                        <dd className="mt-3.5 space-y-1.5 text-sm leading-relaxed text-tijum-plum">
                                            <p className="font-medium">
                                                {[
                                                    property.address_line_1,
                                                    property.locality,
                                                    property.city.name,
                                                    property.city.state,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                            {property.landmark && (
                                                <p className="text-tijum-lavender">
                                                    Landmark:{' '}
                                                    {property.landmark}
                                                </p>
                                            )}
                                        </dd>
                                    </div>

                                    <div className="rounded-[20px] border border-tijum-surface bg-white p-6 shadow-tijum-card">
                                        <dt className="flex items-center gap-2 font-heading text-xs font-semibold tracking-wider text-tijum-plum uppercase">
                                            <span className="flex size-8 items-center justify-center rounded-lg bg-tijum-peach/30 text-tijum-plum">
                                                <CalendarClock
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            Check-in &amp; checkout policy
                                        </dt>
                                        <dd className="mt-3.5 space-y-2.5 text-sm text-tijum-plum">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <div>
                                                    <span className="block text-xs text-tijum-lavender">
                                                        Standard check-in
                                                    </span>
                                                    <span className="font-heading text-base font-bold tabular-nums">
                                                        {formatStayTime(
                                                            property.timing
                                                                .check_in,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="h-7 w-px bg-tijum-surface" />
                                                <div>
                                                    <span className="block text-xs text-tijum-lavender">
                                                        Standard checkout
                                                    </span>
                                                    <span className="font-heading text-base font-bold tabular-nums">
                                                        {formatStayTime(
                                                            property.timing
                                                                .check_out,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs leading-relaxed text-tijum-lavender">
                                                Early arrival from{' '}
                                                {formatStayTime(
                                                    property.timing
                                                        .earliest_early_check_in_time,
                                                )}{' '}
                                                is request-only and subject to
                                                room readiness. No early-arrival
                                                fee.
                                            </p>
                                        </dd>
                                    </div>
                                </dl>
                            </section>

                            {/* Food & Meal Arrangements */}
                            <section
                                id="meals"
                                aria-labelledby="property-food-heading"
                                className="scroll-mt-24 rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card sm:p-8"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-2">
                                        <p className="flex items-center gap-2 font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                            <Utensils
                                                className="size-3.5 text-tijum-plum"
                                                aria-hidden="true"
                                            />
                                            Meal transparency
                                        </p>
                                        <h2
                                            id="property-food-heading"
                                            className="font-heading text-xl font-bold tracking-tight text-tijum-plum sm:text-2xl"
                                        >
                                            Food and meal inclusions
                                        </h2>
                                        <p className="max-w-[60ch] text-sm leading-relaxed text-tijum-lavender">
                                            Every meal status below is tracked
                                            independently. Only slots marked
                                            included are covered in the base
                                            stay arrangement.
                                        </p>
                                    </div>
                                    <Badge
                                        variant={
                                            property.food.food_provided
                                                ? 'food'
                                                : 'secondary'
                                        }
                                        className="shrink-0"
                                    >
                                        {property.food.food_provided
                                            ? 'Kitchen / dining active'
                                            : 'Self-arranged dining'}
                                    </Badge>
                                </div>

                                <FoodInclusionStatus
                                    food={property.food}
                                    className="mt-6"
                                />
                            </section>

                            {/* Available Room Types & Rates */}
                            <section
                                id="rooms"
                                aria-labelledby="property-rooms-heading"
                                className="scroll-mt-24 space-y-6"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="space-y-2">
                                        <p className="flex items-center gap-2 font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                            <BedDouble
                                                className="size-4 text-tijum-plum"
                                                aria-hidden="true"
                                            />
                                            Room configurations
                                        </p>
                                        <h2
                                            id="property-rooms-heading"
                                            className="tijum-section-title"
                                        >
                                            Choose your room type
                                        </h2>
                                        <p className="text-sm text-tijum-lavender">
                                            Showing availability for{' '}
                                            <strong className="font-heading font-semibold text-tijum-plum">
                                                {formatDisplayDate(
                                                    effectiveCheckIn,
                                                )}
                                            </strong>{' '}
                                            ·{' '}
                                            {durationPluralLabel(
                                                durationType,
                                                safeDurationCount,
                                            )}{' '}
                                            · {safeGuests}{' '}
                                            {safeGuests === 1
                                                ? 'guest / room'
                                                : 'guests / rooms'}
                                            .
                                        </p>
                                    </div>

                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={publicSearch().url}>
                                            Compare other stays
                                        </Link>
                                    </Button>
                                </div>

                                {property.room_types.length === 0 ? (
                                    <div className="rounded-[20px] border border-tijum-surface bg-white p-8 text-center">
                                        <p className="font-heading text-base font-semibold text-tijum-plum">
                                            No room types are configured for
                                            this stay yet.
                                        </p>
                                        <p className="mt-1 text-sm text-tijum-lavender">
                                            Check nearby verified stays in{' '}
                                            {property.city.name ?? 'this city'}{' '}
                                            using search.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {availableRoomCount === 0 && (
                                            <div className="rounded-2xl border border-tijum-coral/40 bg-tijum-peach/20 px-5 py-4 text-sm text-tijum-plum">
                                                No room types match this exact
                                                duration, date, or guest count.
                                                Try updating your check-in date
                                                or stay basis in the planner.
                                            </div>
                                        )}

                                        <div className="space-y-5">
                                            {property.room_types.map(
                                                (roomType) => (
                                                    <PropertyRoomCard
                                                        key={roomType.id}
                                                        propertySlug={
                                                            property.slug
                                                        }
                                                        roomType={roomType}
                                                        checkIn={
                                                            effectiveCheckIn
                                                        }
                                                        durationType={
                                                            durationType
                                                        }
                                                        durationCount={
                                                            safeDurationCount
                                                        }
                                                        guests={safeGuests}
                                                        earliestEarlyCheckInTime={
                                                            property.timing
                                                                .earliest_early_check_in_time
                                                        }
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </>
                                )}
                            </section>

                            {/* Property Amenities */}
                            <section
                                id="amenities"
                                aria-labelledby="property-amenities-heading"
                                className="scroll-mt-24 space-y-5 border-t border-tijum-surface pt-10"
                            >
                                <div className="space-y-1.5">
                                    <p className="font-heading text-xs font-semibold tracking-wider text-tijum-lavender uppercase">
                                        Shared facilities
                                    </p>
                                    <h2
                                        id="property-amenities-heading"
                                        className="tijum-section-title"
                                    >
                                        Property amenities
                                    </h2>
                                </div>
                                <AmenityList
                                    amenities={property.property_amenities}
                                    variant="grid"
                                    emptyMessage="No property-level amenities have been published yet."
                                    className="border-t border-tijum-surface"
                                />
                            </section>

                            {/* Verified Customer Reviews */}
                            <section
                                id="reviews"
                                aria-labelledby="property-reviews-heading"
                                className="scroll-mt-24 space-y-6 border-t border-tijum-surface pt-10"
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div className="space-y-1.5">
                                        <p className="flex items-center gap-2 font-heading text-xs font-semibold tracking-wider text-tijum-plum uppercase">
                                            <ShieldCheck
                                                className="size-4 text-tijum-coral"
                                                aria-hidden="true"
                                            />
                                            Verified Booking feedback
                                        </p>
                                        <h2
                                            id="property-reviews-heading"
                                            className="tijum-section-title"
                                        >
                                            Customer reviews
                                        </h2>
                                    </div>
                                    <Link
                                        href={reviewPolicy()}
                                        className="inline-flex min-h-11 items-center rounded-lg font-heading text-sm font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 transition-colors hover:text-tijum-coral focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                                    >
                                        Review moderation policy
                                    </Link>
                                </div>

                                <RatingSummaryCard
                                    summary={property.rating_summary}
                                />

                                {publishedReviews.length > 0 && (
                                    <div className="space-y-4">
                                        {publishedReviews.map((review) => (
                                            <ReviewCard
                                                key={review.id}
                                                review={review}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Compact Sticky Stay Planner */}
                        <aside className="order-1 min-w-0 lg:order-2 lg:col-span-5 xl:col-span-4">
                            <PropertyStayPlanner
                                todayIso={todayIso}
                                checkIn={checkIn}
                                effectiveCheckIn={effectiveCheckIn}
                                checkout={checkout}
                                durationType={durationType}
                                durationCount={durationCount}
                                guests={guests}
                                startingRateMinor={startingRateMinor}
                                availableRoomCount={availableRoomCount}
                                totalRoomCount={property.room_types.length}
                                isContextDirty={isContextDirty}
                                copied={copied}
                                onCheckInChange={setCheckIn}
                                onDurationTypeChange={setDurationType}
                                onDurationCountChange={setDurationCount}
                                onGuestsChange={setGuests}
                                onUpdateRoomOptions={updateRoomOptions}
                                onCopyStayLink={handleCopyStayLink}
                            />
                        </aside>
                    </div>
                </ResponsiveContainer>
            </section>

            {/* Mobile Sticky Booking Bar */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-tijum-surface bg-white/95 px-4 py-3 shadow-tijum-soft backdrop-blur-md lg:hidden">
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                    <div className="min-w-0">
                        {startingRateMinor != null ? (
                            <p className="font-heading text-base font-bold tabular-nums text-tijum-plum">
                                {formatMoney(startingRateMinor)}{' '}
                                <span className="text-xs font-normal text-tijum-lavender">
                                    / {durationUnitLabel(durationType)}
                                </span>
                            </p>
                        ) : (
                            <p className="font-heading text-sm font-bold text-tijum-plum">
                                {property.room_types.length} room options
                            </p>
                        )}
                        <p className="truncate text-xs text-tijum-lavender">
                            {formatDisplayDate(effectiveCheckIn)} ·{' '}
                            {availableRoomCount} open
                        </p>
                    </div>

                    <Button size="default" className="shrink-0" asChild>
                        <a href="#rooms">View rooms</a>
                    </Button>
                </div>
            </div>
        </>
    );
}
