import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, Heart, Layers, MapPin, Star } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { AmenityList } from '@/components/public/amenity-list';
import {
    FoodInclusionStatus,
    type FoodInclusion,
} from '@/components/public/food-inclusion-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TIJUM_BRAND_ASSETS } from '@/components/brand/brand-logo';
import { isComparing, subscribeToCompare, toggleCompare } from '@/lib/compare';
import { cn } from '@/lib/utils';
import {
    isWishlisted,
    subscribeToWishlist,
    toggleWishlist,
} from '@/lib/wishlist';
import type { PublicAmenityItem } from '@/types/public-search';

export type PublicPropertyCardData = {
    id?: number;
    name: string;
    slug: string;
    category?: string | null;
    city?: string | null;
    locality?: string | null;
    genderEligibility?: string | null;
    imageUrl?: string | null;
    imageAlt?: string | null;
    food: FoodInclusion;
    amenities?: PublicAmenityItem[];
    amenityMoreCount?: number;
    roomTypes?: string[];
    price?: {
        amountMinor: number;
        totalMinor?: number | null;
        currency?: string;
        rateLabel: string;
        totalLabel?: string | null;
    } | null;
    rating?: number | null;
    reviewCount?: number;
    distanceKm?: number | null;
    distanceLabel?: string | null;
};

type PropertyCardProps = {
    property: PublicPropertyCardData;
    href: ComponentProps<typeof Link>['href'];
    layout?: 'horizontal' | 'vertical';
    className?: string;
    initialWishlisted?: boolean;
    onWishlistRemove?: () => void;
};

function formatMoney(amountMinor: number, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    }).format(amountMinor / 100);
}

function FemaleGenderIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <circle cx="12" cy="8" r="5" />
            <path d="M12 13v8" />
            <path d="M9 17h6" />
        </svg>
    );
}

function MaleGenderIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <circle cx="10" cy="14" r="5" />
            <path d="M19 5l-5.4 5.4" />
            <path d="M19 5h-5" />
            <path d="M19 5v5" />
        </svg>
    );
}

function BothGenderIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function renderGenderBadge(genderEligibility?: string | null) {
    if (!genderEligibility) return null;
    const lower = genderEligibility.toLowerCase();

    if (lower.includes('female') || lower.includes('women')) {
        return (
            <span className="tijum-gender-badge-female inline-flex items-center gap-1 rounded-full border border-pink-200/90 bg-pink-50 px-2.5 py-0.5 text-[11px] font-semibold text-pink-700 shadow-2xs">
                <FemaleGenderIcon className="size-3.5 shrink-0 text-pink-600" />
                <span>Female Only</span>
            </span>
        );
    }

    if (lower.includes('male') || lower.includes('men')) {
        return (
            <span className="tijum-gender-badge-male inline-flex items-center gap-1 rounded-full border border-sky-200/90 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 shadow-2xs">
                <MaleGenderIcon className="size-3.5 shrink-0 text-sky-600" />
                <span>Male Only</span>
            </span>
        );
    }

    return (
        <span className="tijum-gender-badge-both inline-flex items-center gap-1 rounded-full border border-tijum-peach bg-tijum-peach/25 px-2.5 py-0.5 text-[11px] font-semibold text-tijum-plum shadow-2xs">
            <BothGenderIcon className="size-3.5 shrink-0 text-tijum-plum" />
            <span>{lower.includes('all') ? 'All Genders' : 'Both'}</span>
        </span>
    );
}

export function PropertyCard({
    property,
    href,
    layout = 'horizontal',
    className,
    initialWishlisted = false,
    onWishlistRemove,
}: PropertyCardProps) {
    const page = usePage();
    const isAuthenticated = Boolean(page.props.auth?.user);
    const resolvedHref =
        typeof href === 'object' && href !== null && 'url' in href
            ? (href as { url: string }).url
            : (href as string);

    const hasRating =
        property.rating != null && (property.reviewCount ?? 0) > 0;

    const [wishlisted, setWishlisted] = useState(initialWishlisted);
    const [justWishlisted, setJustWishlisted] = useState(false);
    const [comparing, setComparing] = useState(false);

    useEffect(() => {
        if (property.id) {
            setWishlisted(initialWishlisted || isWishlisted(property.id));
        }
        setComparing(isComparing(property.slug));

        const unsubWishlist = subscribeToWishlist((e) => {
            if (property.id && e.detail.propertyId === property.id) {
                setWishlisted(e.detail.wishlisted);
            }
        });
        const unsubCompare = subscribeToCompare((e) => {
            setComparing(
                e.detail.items.some((item) => item.slug === property.slug),
            );
        });

        return () => {
            unsubWishlist();
            unsubCompare();
        };
    }, [property.id, property.slug, initialWishlisted]);

    return (
        <article
            className={cn(
                'group overflow-hidden rounded-[22px] border border-tijum-surface bg-white shadow-tijum-card transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-tijum-peach hover:shadow-tijum-soft',
                layout === 'horizontal' &&
                    'grid md:grid-cols-[minmax(16rem,0.82fr)_minmax(0,1.4fr)]',
                className,
            )}
        >
            <div className="relative">
                <Link
                    href={resolvedHref}
                    className={cn(
                        'relative block overflow-hidden bg-tijum-surface/45 focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none focus-visible:ring-inset',
                        layout === 'horizontal'
                            ? 'aspect-4/3 md:aspect-auto md:h-full md:min-h-72'
                            : 'aspect-4/3',
                    )}
                    aria-label={`View ${property.name}`}
                >
                    {property.imageUrl ? (
                        <img
                            src={property.imageUrl}
                            alt={
                                property.imageAlt ||
                                `${property.name} accommodation`
                            }
                            width={800}
                            height={600}
                            className="tijum-image-zoom h-full w-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2.5 bg-tijum-surface/30 p-4 text-center">
                            <img
                                src={TIJUM_BRAND_ASSETS.symbolPng}
                                alt="TIJUM stay"
                                width={56}
                                height={56}
                                className="tijum-fallback-icon-light size-14 object-contain opacity-50 transition-opacity duration-300 group-hover:opacity-75"
                            />
                            <img
                                src={TIJUM_BRAND_ASSETS.symbolLightPng}
                                alt=""
                                aria-hidden="true"
                                width={56}
                                height={56}
                                className="tijum-fallback-icon-dark hidden size-14 object-contain opacity-65 transition-opacity duration-300 group-hover:opacity-90"
                            />
                            <span className="font-heading text-xs font-semibold text-tijum-plum/60">
                                Property image coming soon
                            </span>
                        </div>
                    )}
                    {property.category && (
                        <Badge className="absolute top-4 left-4 border-tijum-cream/50 bg-tijum-plum/92 text-tijum-cream">
                            {property.category}
                        </Badge>
                    )}
                </Link>

                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onWishlistRemove) {
                            setWishlisted(false);
                            onWishlistRemove();
                            return;
                        }
                        if (property.id) {
                            const next = toggleWishlist(
                                property.id,
                                property.slug,
                                { syncServer: isAuthenticated },
                            );
                            setWishlisted(next);
                            if (next) {
                                setJustWishlisted(true);
                                setTimeout(() => setJustWishlisted(false), 450);
                            }
                        }
                    }}
                    aria-label={
                        wishlisted
                            ? `Remove ${property.name} from wishlist`
                            : `Save ${property.name} to wishlist`
                    }
                    className={cn(
                        'absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full border border-tijum-surface/60 bg-tijum-cream/90 shadow-sm backdrop-blur-xs transition-transform duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none active:scale-90',
                        wishlisted
                            ? 'text-tijum-coral'
                            : 'text-tijum-plum/60 hover:text-tijum-coral',
                    )}
                >
                    <Heart
                        className={cn(
                            'size-4.5 transition-all duration-300',
                            wishlisted && 'fill-tijum-coral text-tijum-coral',
                            justWishlisted && 'animate-heart-pop',
                        )}
                        aria-hidden="true"
                    />
                </button>
            </div>

            {layout === 'horizontal' ? (
                /* List View Layout */
                <div className="flex min-w-0 flex-col justify-between gap-6 p-5 sm:p-6 lg:p-7">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    {property.category && (
                                        <Badge className="border-tijum-surface bg-tijum-plum px-2.5 py-0.5 text-xs font-semibold text-tijum-cream">
                                            {property.category}
                                        </Badge>
                                    )}
                                    {renderGenderBadge(
                                        property.genderEligibility,
                                    )}
                                    <p className="flex items-center gap-1.5 text-sm text-tijum-lavender">
                                        <MapPin
                                            className="size-3.5 shrink-0 text-tijum-coral"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            {[property.locality, property.city]
                                                .filter(Boolean)
                                                .join(', ')}
                                            {property.distanceLabel && (
                                                <span className="ml-1 font-semibold text-tijum-coral">
                                                    · {property.distanceLabel}
                                                </span>
                                            )}
                                        </span>
                                    </p>
                                </div>
                                <h3 className="tijum-card-title text-base font-bold text-tijum-plum sm:text-lg">
                                    <Link
                                        href={href}
                                        className="rounded-sm hover:text-tijum-coral focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                                    >
                                        {property.name}
                                    </Link>
                                </h3>
                            </div>

                            {property.price && (
                                <div className="shrink-0 sm:text-right">
                                    <p className="font-heading text-2xl font-bold text-tijum-plum">
                                        {formatMoney(
                                            property.price.amountMinor,
                                            property.price.currency,
                                        )}
                                    </p>
                                    <p className="text-xs font-medium text-tijum-lavender">
                                        {property.price.rateLabel}
                                    </p>
                                    {property.price.totalMinor != null &&
                                        property.price.totalLabel && (
                                            <p className="mt-1 text-xs font-semibold text-tijum-plum">
                                                {property.price.totalLabel}{' '}
                                                {formatMoney(
                                                    property.price.totalMinor,
                                                    property.price.currency,
                                                )}
                                            </p>
                                        )}
                                </div>
                            )}
                        </div>

                        <FoodInclusionStatus
                            food={property.food}
                            compact
                            showLabel={true}
                        />

                        <AmenityList
                            amenities={property.amenities ?? []}
                            variant="compact"
                            limit={3}
                            moreCount={property.amenityMoreCount}
                            emptyMessage="Amenities are not published for this stay yet."
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface pt-4">
                        {hasRating ? (
                            <p className="flex items-center gap-1.5 text-xs text-tijum-lavender">
                                <Star
                                    className="size-4 fill-tijum-coral text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <strong className="font-heading text-tijum-plum">
                                    {Number(property.rating).toFixed(1)}
                                </strong>
                                <span>
                                    {property.reviewCount} Verified Booking{' '}
                                    {property.reviewCount === 1
                                        ? 'review'
                                        : 'reviews'}
                                </span>
                            </p>
                        ) : (
                            <p className="text-xs text-tijum-lavender">
                                Review data appears after eligible bookings.
                            </p>
                        )}

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant={comparing ? 'plum' : 'outline'}
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const next = toggleCompare(property);
                                    setComparing(next);
                                }}
                                className="h-10 gap-1.5 rounded-xl px-3.5 text-xs font-semibold"
                            >
                                <Layers
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>
                                    {comparing ? 'Added to Compare' : 'Compare'}
                                </span>
                            </Button>

                            <Button
                                variant="plum"
                                size="sm"
                                asChild
                                className="h-10 gap-1.5 rounded-xl px-4 text-xs font-semibold"
                            >
                                <Link href={resolvedHref}>
                                    <span>View stay</span>
                                    <ArrowUpRight
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Grid View Layout */
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 sm:p-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                {renderGenderBadge(property.genderEligibility)}
                                <p className="flex items-center gap-1 text-xs text-tijum-lavender">
                                    <MapPin
                                        className="size-3.5 shrink-0 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span className="font-medium text-tijum-lavender">
                                        {[property.locality, property.city]
                                            .filter(Boolean)
                                            .join(', ')}
                                        {property.distanceLabel && (
                                            <span className="ml-1 font-semibold text-tijum-coral">
                                                · {property.distanceLabel}
                                            </span>
                                        )}
                                    </span>
                                </p>
                            </div>

                            <h3 className="tijum-card-title text-base leading-snug font-bold text-tijum-plum sm:text-lg">
                                <Link
                                    href={href}
                                    className="rounded-sm hover:text-tijum-coral focus-visible:ring-2 focus-visible:ring-tijum-coral focus-visible:outline-none"
                                >
                                    {property.name}
                                </Link>
                            </h3>

                            {property.price && (
                                <div className="flex items-baseline gap-1.5 pt-0.5">
                                    <span className="font-heading text-xl font-bold text-tijum-plum">
                                        {formatMoney(
                                            property.price.amountMinor,
                                            property.price.currency,
                                        )}
                                    </span>
                                    <span className="text-xs font-medium text-tijum-lavender">
                                        {property.price.rateLabel}
                                    </span>
                                </div>
                            )}
                        </div>

                        <FoodInclusionStatus
                            food={property.food}
                            compact
                            showLabel={false}
                        />

                        <AmenityList
                            amenities={property.amenities ?? []}
                            variant="icons-only"
                            limit={4}
                            moreCount={property.amenityMoreCount}
                            emptyMessage="Amenities coming soon."
                        />
                    </div>

                    <div className="space-y-3 border-t border-tijum-surface pt-4">
                        {hasRating ? (
                            <p className="flex items-center gap-1.5 text-xs text-tijum-lavender">
                                <Star
                                    className="size-3.5 fill-tijum-coral text-tijum-coral"
                                    aria-hidden="true"
                                />
                                <strong className="font-heading font-semibold text-tijum-plum">
                                    {Number(property.rating).toFixed(1)}
                                </strong>
                                <span>
                                    ({property.reviewCount}{' '}
                                    {property.reviewCount === 1
                                        ? 'review'
                                        : 'reviews'}
                                    )
                                </span>
                            </p>
                        ) : (
                            <p className="text-[11px] text-tijum-lavender">
                                Verified stay reviews appear after checkout
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={comparing ? 'plum' : 'outline'}
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const next = toggleCompare(property);
                                    setComparing(next);
                                }}
                                className="h-10 w-full gap-1.5 rounded-xl text-xs font-semibold"
                            >
                                <Layers
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                <span>{comparing ? 'Added' : 'Compare'}</span>
                            </Button>

                            <Button
                                variant="plum"
                                size="sm"
                                asChild
                                className="h-10 w-full gap-1.5 rounded-xl text-xs font-semibold"
                            >
                                <Link href={resolvedHref}>
                                    <span>View stay</span>
                                    <ArrowUpRight
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}
