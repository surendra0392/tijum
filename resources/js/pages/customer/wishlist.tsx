import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Compass, Heart } from 'lucide-react';
import { useEffect } from 'react';
import { CompareDrawer } from '@/components/public/compare-drawer';
import { PropertyCard } from '@/components/public/property-card';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { removeWishlistLocal, syncWishlistIds } from '@/lib/wishlist';
import { search } from '@/routes/public';
import { show as propertyShow } from '@/routes/public/properties';
import type { BreadcrumbItem } from '@/types';
import type { PublicAmenityItem } from '@/types/public-search';

type WishlistProperty = {
    id: number;
    name: string;
    slug: string;
    category?: { name?: string | null; slug?: string | null } | null;
    city?: { name?: string | null; slug?: string | null } | null;
    locality?: string | null;
    gender_eligibility?: string | null;
    cover_image_url?: string | null;
    food_provided?: boolean;
    breakfast_included?: boolean;
    lunch_included?: boolean;
    dinner_included?: boolean;
    property_amenities?: PublicAmenityItem[];
    property_amenities_more_count?: number;
    starting_price?: number | null;
    monthly_price?: number | null;
    rating?: number | null;
    review_count?: number;
};

type PaginatedWishlist = {
    data: WishlistProperty[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type WishlistProps = {
    properties: PaginatedWishlist;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'My Wishlist', href: '/wishlist' },
];

export default function CustomerWishlistPage({ properties }: WishlistProps) {
    const items = properties?.data ?? [];
    const totalSaved = properties?.total ?? items.length;

    useEffect(() => {
        if (properties?.current_page === 1 && properties?.last_page === 1) {
            syncWishlistIds(items.map((item) => item.id));
        }
    }, [items, properties?.current_page, properties?.last_page]);

    const handleRemove = (property: WishlistProperty) => {
        removeWishlistLocal(property.id);
        router.delete(`/wishlist/${property.id}`, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    return (
        <>
            <Head title="My Wishlist — Saved Stays" />

            <ResponsiveContainer className="py-6 sm:py-8">
                <div className="space-y-8 pb-12">
                    <PageHeader
                        eyebrow="Saved Shortlist"
                        title="My Wishlist"
                        description={`${totalSaved} saved stay${totalSaved === 1 ? '' : 's'} across Hostels/PG, Homestays, and Co-Living.`}
                        actions={
                            <Button variant="outline" size="sm" asChild>
                                <Link href={search()}>
                                    <Compass
                                        className="size-4 text-tijum-coral"
                                        aria-hidden="true"
                                    />
                                    <span>Explore More Stays</span>
                                </Link>
                            </Button>
                        }
                    />

                    {items.length === 0 ? (
                        <Card className="rounded-[24px] py-16 text-center">
                            <CardContent className="mx-auto max-w-md space-y-4">
                                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-tijum-peach/35 text-tijum-coral dark:bg-tijum-coral/15">
                                    <Heart className="size-7" aria-hidden="true" />
                                </div>
                                <h2 className="font-heading text-xl font-bold text-foreground">
                                    Your wishlist is empty
                                </h2>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    When browsing verified Hostels/PG,
                                    Homestays, or Co-Living listings, tap the
                                    heart icon on any card to save it here for
                                    quick comparison and booking.
                                </p>
                                <Button className="mt-2" asChild>
                                    <Link href={search()}>
                                        <span>Find Stays Now</span>
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {items.map((property) => (
                                    <PropertyCard
                                        key={property.id}
                                        layout="vertical"
                                        initialWishlisted
                                        onWishlistRemove={() =>
                                            handleRemove(property)
                                        }
                                        href={propertyShow(property.slug)}
                                        property={{
                                            id: property.id,
                                            name: property.name,
                                            slug: property.slug,
                                            category:
                                                property.category?.name ?? null,
                                            city: property.city?.name ?? null,
                                            locality: property.locality ?? null,
                                            genderEligibility:
                                                property.gender_eligibility ??
                                                'All Genders',
                                            imageUrl:
                                                property.cover_image_url ??
                                                null,
                                            amenities:
                                                property.property_amenities ??
                                                [],
                                            amenityMoreCount:
                                                property.property_amenities_more_count,
                                            food: {
                                                food_provided: Boolean(
                                                    property.food_provided,
                                                ),
                                                breakfast_included: Boolean(
                                                    property.breakfast_included,
                                                ),
                                                lunch_included: Boolean(
                                                    property.lunch_included,
                                                ),
                                                dinner_included: Boolean(
                                                    property.dinner_included,
                                                ),
                                            },
                                            price: property.monthly_price
                                                ? {
                                                      amountMinor:
                                                          property.monthly_price,
                                                      currency: 'INR',
                                                      rateLabel:
                                                          'Monthly Base Rate',
                                                  }
                                                : property.starting_price
                                                  ? {
                                                        amountMinor:
                                                            property.starting_price,
                                                        currency: 'INR',
                                                        rateLabel: 'Daily Rate',
                                                    }
                                                  : null,
                                            rating: property.rating ?? null,
                                            reviewCount:
                                                property.review_count ?? 0,
                                        }}
                                    />
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tijum-surface/80 pt-4 dark:border-border">
                                <p className="text-xs text-tijum-plum-muted tabular-nums dark:text-muted-foreground">
                                    Showing{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {items.length}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-semibold text-tijum-plum dark:text-foreground">
                                        {totalSaved}
                                    </span>{' '}
                                    saved stay{totalSaved === 1 ? '' : 's'}
                                </p>
                                <Pagination
                                    currentPage={properties.current_page}
                                    totalPages={properties.last_page}
                                    links={properties.links}
                                    getPageHref={(page) =>
                                        `/wishlist?page=${page}`
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            </ResponsiveContainer>

            <CompareDrawer />
        </>
    );
}

CustomerWishlistPage.layout = {
    breadcrumbs,
};
