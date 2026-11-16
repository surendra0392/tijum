import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Compass,
    LayoutGrid,
    LayoutList,
    Map as MapIcon,
    MapPin,
    SlidersHorizontal,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { CompareDrawer } from '@/components/public/compare-drawer';
import { PropertyCard } from '@/components/public/property-card';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { SearchMap } from '@/components/public/search-map';
import { SectionHeading } from '@/components/public/section-heading';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { LAUNCH_CITIES, PUBLIC_IMAGES } from '@/data/public-content';
import { isGenericPublicPlaceholder } from '@/lib/public-images';
import { formatStayTime } from '@/lib/stay-timing';
import { home } from '@/routes';
import { search } from '@/routes/public';
import { show as propertyShow } from '@/routes/public/properties';
import type { SeoMetadata } from '@/types';
import type {
    PublicAmenityItem,
    SearchResultCard,
    StayTimingData,
} from '@/types/public-search';

interface Neighborhood {
    name: string;
    description: string;
    suitable_for: string;
}

interface EditorialData {
    tagline: string;
    description: string;
    neighborhoods: Neighborhood[];
    food_inclusions: string[];
    faqs: Array<{ question: string; answer: string }>;
}

interface PropertyCardData {
    id: number;
    name: string;
    slug: string;
    category?: { name: string } | null;
    locality?: string;
    gender_eligibility?: string | null;
    starting_price_paise?: number;
    daily_price_paise?: number;
    weekly_price_paise?: number;
    monthly_price_paise?: number;
    rating_average?: number;
    reviews_count?: number;
    cover_image_url?: string;
    food_provided?: boolean;
    breakfast_included?: boolean;
    lunch_included?: boolean;
    dinner_included?: boolean;
    property_amenities?: PublicAmenityItem[];
    latitude?: number | null;
    longitude?: number | null;
}

interface Props {
    city: {
        id: number;
        name: string;
        state: string;
        slug: string;
    };
    categories?: Array<{
        id: number;
        name: string;
        slug: string;
    }>;
    editorial: EditorialData;
    properties: PropertyCardData[];
    timing?: StayTimingData;
    seo?: SeoMetadata;
}

export default function CityLandingPage({
    city,
    categories = [],
    editorial,
    properties,
    timing,
    seo,
}: Props) {
    const ENABLE_MAP_VIEW = false;
    const cityContent = LAUNCH_CITIES.find((item) => item.slug === city.slug);
    const cityImage = cityContent?.image ?? PUBLIC_IMAGES.heroStay;
    const today = new Date().toISOString().split('T')[0];
    const defaultSearchParams = {
        city: city.id,
        check_in: today,
        duration_type: 'daily',
        duration_count: 1,
        guests: 1,
    };

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedMapSlug, setSelectedMapSlug] = useState<string | null>(null);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [durationBasis, setDurationBasis] = useState<
        'daily' | 'weekly' | 'monthly'
    >('daily');

    // Filters state
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [genderPref, setGenderPref] = useState<string>('all');
    const [foodOnly, setFoodOnly] = useState<boolean>(false);
    const [maxPrice, setMaxPrice] = useState<string>('');

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 6;

    const filteredProperties = useMemo(() => {
        return properties.filter((p) => {
            // Category filter
            if (selectedCategories.length > 0) {
                const catName = p.category?.name?.toLowerCase() ?? '';
                const matches = selectedCategories.some((c) =>
                    catName.includes(c.toLowerCase()),
                );
                if (!matches) return false;
            }

            // Gender eligibility filter
            if (genderPref !== 'all' && genderPref !== 'any') {
                const g = (p.gender_eligibility ?? '').toLowerCase();
                if (genderPref === 'male') {
                    if (g !== 'male only' && g !== 'male') return false;
                } else if (genderPref === 'female') {
                    if (g !== 'female only' && g !== 'female') return false;
                } else if (genderPref === 'both') {
                    if (
                        !g.includes('both') &&
                        !g.includes('all') &&
                        !g.includes('mixed')
                    )
                        return false;
                }
            }

            // Food filter
            if (foodOnly && !p.food_provided) {
                return false;
            }

            // Max price filter (based on current durationBasis)
            if (maxPrice && !isNaN(Number(maxPrice))) {
                const targetPaise = Number(maxPrice) * 100;
                const currentPaise =
                    durationBasis === 'weekly'
                        ? (p.weekly_price_paise ??
                          (p.starting_price_paise
                              ? p.starting_price_paise * 7
                              : 0))
                        : durationBasis === 'monthly'
                          ? (p.monthly_price_paise ??
                            (p.starting_price_paise
                                ? p.starting_price_paise * 30
                                : 0))
                          : (p.daily_price_paise ??
                            p.starting_price_paise ??
                            0);

                if (currentPaise > targetPaise) {
                    return false;
                }
            }

            return true;
        });
    }, [
        properties,
        selectedCategories,
        genderPref,
        foodOnly,
        maxPrice,
        durationBasis,
    ]);

    const totalPages = Math.ceil(filteredProperties.length / pageSize);
    const paginatedProperties = filteredProperties.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );

    const clearFilters = () => {
        setSelectedCategories([]);
        setGenderPref('all');
        setFoodOnly(false);
        setMaxPrice('');
        setCurrentPage(1);
    };

    const hasActiveFilters =
        selectedCategories.length > 0 ||
        (genderPref !== 'all' && genderPref !== 'any') ||
        foodOnly ||
        maxPrice !== '';

    const FilterPanel = (
        <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-tijum-surface pb-3">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="size-4 text-tijum-plum" />
                    <h2 className="font-heading text-base font-bold text-tijum-plum">
                        Filters
                    </h2>
                </div>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="cursor-pointer font-heading text-xs font-semibold text-tijum-plum underline decoration-tijum-coral underline-offset-4 hover:text-tijum-coral"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {categories.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-tijum-plum">
                        Stay category
                    </p>
                    <div className="space-y-1.5">
                        {categories.map((c) => (
                            <label
                                key={c.id}
                                className="flex cursor-pointer items-center gap-2 text-xs font-medium text-tijum-plum hover:text-tijum-coral"
                            >
                                <Checkbox
                                    checked={selectedCategories.includes(
                                        c.name,
                                    )}
                                    onCheckedChange={(checked) => {
                                        setCurrentPage(1);
                                        setSelectedCategories((prev) =>
                                            checked
                                                ? [...prev, c.name]
                                                : prev.filter(
                                                      (x) => x !== c.name,
                                                  ),
                                        );
                                    }}
                                />
                                <span>{c.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <p className="text-xs font-bold text-tijum-plum">
                    Guest eligibility
                </p>
                <div className="space-y-1.5">
                    {[
                        { v: 'all', l: 'All (Any Gender)' },
                        { v: 'male', l: 'Male only' },
                        { v: 'female', l: 'Female only' },
                        { v: 'both', l: 'Both (Co-Living / Mixed)' },
                    ].map((opt) => (
                        <label
                            key={opt.v}
                            className="flex cursor-pointer items-center gap-2 text-xs font-medium text-tijum-plum hover:text-tijum-coral"
                        >
                            <input
                                type="radio"
                                name="city-gender-filter"
                                value={opt.v}
                                checked={genderPref === opt.v}
                                onChange={() => {
                                    setCurrentPage(1);
                                    setGenderPref(opt.v);
                                }}
                                className="size-3.5 accent-tijum-plum"
                            />
                            <span>{opt.l}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-bold text-tijum-plum">
                    Food & Meals
                </p>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-tijum-plum hover:text-tijum-coral">
                    <Checkbox
                        checked={foodOnly}
                        onCheckedChange={(checked) => {
                            setCurrentPage(1);
                            setFoodOnly(Boolean(checked));
                        }}
                    />
                    <span>Food included only</span>
                </label>
            </div>

            <div className="space-y-2">
                <p className="text-xs font-bold text-tijum-plum">
                    Max rate (₹ · {durationBasis})
                </p>
                <Input
                    type="number"
                    min={0}
                    placeholder={
                        durationBasis === 'weekly'
                            ? 'e.g. 5000'
                            : durationBasis === 'monthly'
                              ? 'e.g. 15000'
                              : 'e.g. 1500'
                    }
                    value={maxPrice}
                    onChange={(e) => {
                        setCurrentPage(1);
                        setMaxPrice(e.target.value);
                    }}
                    className="h-10 rounded-xl bg-tijum-cream/55 px-3 text-xs"
                />
            </div>
        </div>
    );

    const cardPropertyProps = (property: PropertyCardData) => {
        let priceAmount =
            property.daily_price_paise ?? property.starting_price_paise;
        let rateLabel = 'Per Guest · daily';

        if (durationBasis === 'weekly') {
            priceAmount =
                property.weekly_price_paise ??
                (property.starting_price_paise
                    ? property.starting_price_paise * 7
                    : undefined);
            rateLabel = 'Per Guest · weekly';
        } else if (durationBasis === 'monthly') {
            priceAmount =
                property.monthly_price_paise ??
                (property.starting_price_paise
                    ? property.starting_price_paise * 30
                    : undefined);
            rateLabel = 'Per Guest · monthly';
        }

        return {
            id: property.id,
            name: property.name,
            slug: property.slug,
            category: property.category?.name ?? null,
            city: city.name,
            locality: property.locality ?? city.name,
            genderEligibility: property.gender_eligibility ?? null,
            imageUrl:
                property.cover_image_url &&
                !isGenericPublicPlaceholder(property.cover_image_url)
                    ? property.cover_image_url
                    : null,
            food: {
                food_provided: Boolean(property.food_provided),
                breakfast_included: Boolean(property.breakfast_included),
                lunch_included: Boolean(property.lunch_included),
                dinner_included: Boolean(property.dinner_included),
            },
            amenities: property.property_amenities ?? [],
            price: priceAmount
                ? {
                      amountMinor: priceAmount,
                      rateLabel,
                      currency: 'INR',
                  }
                : null,
            rating: property.rating_average ?? null,
            reviewCount: property.reviews_count ?? 0,
        };
    };

    const mapProperties = useMemo(() => {
        return properties.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            locality: p.locality ?? city.name,
            latitude: p.latitude ?? null,
            longitude: p.longitude ?? null,
            city: { id: city.id, name: city.name, slug: city.slug },
            category: {
                id: 1,
                name: p.category?.name ?? 'Hostels/PG',
                slug: 'hostels-pg',
            },
            cover_image: p.cover_image_url
                ? {
                      url: p.cover_image_url,
                      thumbnail_url: p.cover_image_url,
                      alt_text: p.name,
                  }
                : null,
            food: {
                food_provided: Boolean(p.food_provided),
                breakfast_included: Boolean(p.breakfast_included),
                lunch_included: Boolean(p.lunch_included),
                dinner_included: Boolean(p.dinner_included),
            },
            property_amenities: p.property_amenities ?? [],
            room_summaries: [],
            price: {
                amount_minor: 800000,
                currency: 'INR',
                duration_type: 'monthly',
                pricing_basis_label: 'Per Month',
                is_estimate: false,
            },
            average_rating: p.rating_average ?? null,
            review_count: p.reviews_count ?? 0,
        })) as unknown as SearchResultCard[];
    }, [properties, city]);

    const safeSeo = seo
        ? {
              ...seo,
              title: `Accommodation in ${city.name} | TIJUM`,
              description: `Explore TIJUM accommodation in ${city.name} with transparent room-type pricing and exact meal information.`,
              structuredData: undefined,
          }
        : undefined;

    return (
        <>
            <PublicSeoHead
                seo={safeSeo}
                fallbackTitle={`Accommodation in ${city.name} | TIJUM`}
                fallbackDescription={`Explore TIJUM accommodation in ${city.name} with transparent room-type pricing and exact meal information.`}
            />

            <section className="relative overflow-hidden bg-tijum-plum py-6 text-tijum-cream sm:py-8 lg:py-9">
                {/* Background image anchored to the right, blending seamlessly into the 40% solid brand dark area */}
                <div className="pointer-events-none absolute inset-0 z-0">
                    <picture className="absolute inset-y-0 right-0 h-full w-full sm:w-[70%] lg:w-[62%]">
                        <source
                            srcSet={cityImage.webpSrcSet}
                            sizes="(min-width: 1024px) 62vw, 100vw"
                            type="image/webp"
                        />
                        <source
                            srcSet={cityImage.jpgSrcSet}
                            sizes={cityImage.sizes}
                            type="image/jpeg"
                        />
                        <img
                            src={cityImage.fallbackSrc}
                            alt=""
                            width={cityImage.width}
                            height={cityImage.height}
                            className="h-full w-full object-cover object-center lg:object-right"
                            style={{
                                maskImage:
                                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 15%, rgba(0,0,0,0.9) 32%, black 48%)',
                                WebkitMaskImage:
                                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 15%, rgba(0,0,0,0.9) 32%, black 48%)',
                            }}
                            fetchPriority="high"
                            aria-hidden="true"
                        />
                    </picture>

                    {/* Gradient overlay: 40% solid brand dark color on left, softly feathered into the image */}
                    <div
                        className="absolute inset-0 hidden sm:block"
                        style={{
                            background:
                                'linear-gradient(to right, #442f41 0%, #442f41 38%, rgba(68,47,65,0.92) 46%, rgba(68,47,65,0.3) 60%, transparent 80%)',
                        }}
                    />

                    {/* Mobile fallback: soft top-to-bottom blend */}
                    <div
                        className="absolute inset-0 sm:hidden"
                        style={{
                            background:
                                'linear-gradient(to top, #442f41 0%, #442f41 55%, rgba(68,47,65,0.7) 75%, rgba(68,47,65,0.3) 100%)',
                        }}
                    />
                </div>

                <div className="relative z-10">
                    <ResponsiveContainer width="wide">
                        <Breadcrumbs
                            items={[
                                {
                                    label: 'Cities',
                                    href: `${home.url()}#launch-cities`,
                                },
                                {
                                    label: `Stays in ${city.name}`,
                                    current: true,
                                },
                            ]}
                            tone="light"
                            className="mb-3 sm:mb-4"
                        />

                        <div className="max-w-xl space-y-2.5 sm:space-y-3">
                            <p className="flex items-center gap-1.5 font-heading text-xs font-semibold text-tijum-peach">
                                <MapPin
                                    className="size-3.5 text-tijum-coral"
                                    aria-hidden="true"
                                />
                                {city.name}, {city.state}
                            </p>
                            <div className="space-y-1 sm:space-y-1.5">
                                <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl leading-tight">
                                    Find your stay in {city.name}
                                </h1>
                                <p className="max-w-lg text-xs leading-relaxed text-tijum-cream/85 sm:text-sm">
                                    {cityContent?.context ??
                                        `Search TIJUM accommodation in ${city.name} using live dates, room-type quantity, and exact meal filters.`}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Button
                                    size="default"
                                    asChild
                                >
                                    <a href="#city-stays">
                                        Search {city.name} stays
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </a>
                                </Button>
                                <Button
                                    size="default"
                                    variant="outline"
                                    asChild
                                    className="border-tijum-cream/35 bg-tijum-plum/55 text-white hover:bg-tijum-plum hover:text-white"
                                >
                                    <Link
                                        href={search.url({
                                            query: defaultSearchParams,
                                        })}
                                    >
                                        Live search & filters
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </ResponsiveContainer>
                </div>
            </section>

            <section
                aria-labelledby="city-guide-heading"
                className="bg-tijum-cream py-10 sm:py-12"
            >
                <ResponsiveContainer
                    width="wide"
                    className="space-y-6 sm:space-y-7"
                >
                    <SectionHeading
                        id="city-guide-heading"
                        size="sm"
                        title={`A practical orientation to ${city.name}`}
                        description="Use this city overview to understand broad locality context, then confirm the exact property address and live availability before requesting a reservation."
                    />

                    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                        <div className="divide-y divide-tijum-surface border-y border-tijum-surface lg:col-span-8">
                            {editorial.neighborhoods.map(
                                (neighborhood, index) => (
                                    <article
                                        key={`${neighborhood.name}-${index}`}
                                        className="grid gap-2 py-4 sm:grid-cols-[2.5rem_1fr_1.6fr] sm:gap-4 sm:py-5"
                                    >
                                        <span className="font-heading text-xs font-bold tabular-nums text-tijum-plum sm:text-sm">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <div>
                                            <h3 className="font-heading text-base font-bold text-tijum-plum sm:text-lg">
                                                {neighborhood.name}
                                            </h3>
                                            <p className="mt-0.5 text-xs font-medium text-tijum-lavender">
                                                {neighborhood.suitable_for}
                                            </p>
                                        </div>
                                        <p className="text-xs leading-relaxed text-tijum-plum/80 sm:text-sm">
                                            {neighborhood.description}
                                        </p>
                                    </article>
                                ),
                            )}
                        </div>

                        <aside className="rounded-[24px] border border-tijum-surface bg-white p-6 shadow-tijum-card lg:col-span-4">
                            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                <Compass
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <h3 className="mt-4 font-heading text-lg font-bold tracking-tight text-tijum-plum sm:text-xl">
                                Search before you decide
                            </h3>
                            <p className="mt-2 text-xs leading-relaxed text-tijum-lavender sm:text-sm">
                                Locality descriptions are editorial context.
                                Search results remain the source for eligible
                                properties, exact meal inclusions, and
                                date-specific quantity.
                            </p>
                            {timing && (
                                <p className="mt-5 flex items-start gap-2 border-t border-tijum-surface pt-4 text-xs text-tijum-plum">
                                    <Clock3
                                        className="mt-0.5 size-4 shrink-0 text-tijum-plum"
                                        aria-hidden="true"
                                    />
                                    Standard check-in{' '}
                                    {formatStayTime(
                                        timing.standard_check_in_time,
                                    )}{' '}
                                    · Checkout{' '}
                                    {formatStayTime(
                                        timing.standard_check_out_time,
                                    )}
                                </p>
                            )}
                        </aside>
                    </div>
                </ResponsiveContainer>
            </section>

            <section
                id="city-stays"
                aria-labelledby="city-properties-heading"
                className="scroll-mt-16 border-t border-tijum-surface bg-tijum-cream py-10 sm:scroll-mt-20 sm:py-12"
            >
                <ResponsiveContainer
                    width="wide"
                    className="space-y-6 sm:space-y-7"
                >
                    <SectionHeading
                        id="city-properties-heading"
                        size="sm"
                        title={`Property previews in ${city.name}`}
                        description="These previews show property-provided details. Use date-specific search to confirm current eligibility, availability, and real room-type pricing."
                    />

                    {properties.length === 0 ? (
                        <div className="rounded-[24px] border border-tijum-surface bg-white p-8 text-center shadow-tijum-card sm:p-12">
                            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-tijum-peach/30 text-tijum-plum">
                                <MapPin
                                    className="size-6"
                                    aria-hidden="true"
                                />
                            </span>
                            <h3 className="font-heading text-xl font-bold text-tijum-plum">
                                Partner Onboarding in Progress for {city.name}
                            </h3>
                            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-tijum-lavender">
                                We are currently verifying top-tier,
                                food-inclusive accommodation hosts in{' '}
                                {city.name}. In the meantime, explore verified
                                stays in nearby launch cities or partner with us
                                to list your property.
                            </p>
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                {city.slug === 'guntur' && (
                                    <Button variant="default" asChild>
                                        <Link href="/stays-in-vijayawada">
                                            Explore nearby Vijayawada stays (35
                                            km)
                                        </Link>
                                    </Button>
                                )}

                                <Button variant="outline" asChild>
                                    <Link href={search.url()}>
                                        View all launch cities
                                    </Link>
                                </Button>
                                <Button variant="plum" asChild>
                                    <Link href="/become-a-partner">
                                        Become a partner in {city.name}
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-7 lg:grid-cols-[270px_minmax(0,1fr)]">
                            {/* Desktop Side Filter */}
                            <aside className="hidden lg:block">
                                <div className="rounded-[24px] border border-tijum-surface bg-white p-5 shadow-tijum-card">
                                    {FilterPanel}
                                </div>
                            </aside>

                            {/* Stays Content Column */}
                            <div className="min-w-0 space-y-5">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tijum-surface pb-4">
                                    <div className="flex items-center gap-2.5">
                                        {/* Mobile Filter Drawer */}
                                        <Sheet
                                            open={mobileFilterOpen}
                                            onOpenChange={setMobileFilterOpen}
                                        >
                                            <SheetTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-10 gap-1.5 rounded-xl border-tijum-surface bg-white text-xs font-semibold text-tijum-plum lg:hidden"
                                                >
                                                    <SlidersHorizontal className="size-3.5 text-tijum-plum" />
                                                    Filters
                                                    {hasActiveFilters && (
                                                        <span className="flex size-2 rounded-full bg-tijum-coral" />
                                                    )}
                                                </Button>
                                            </SheetTrigger>
                                            <SheetContent
                                                side="left"
                                                className="tijum-public w-[min(22rem,calc(100vw-2rem))] overflow-y-auto border-r border-tijum-surface bg-white p-5"
                                            >
                                                <SheetHeader className="border-b border-tijum-surface pb-3">
                                                    <SheetTitle className="font-heading text-base font-bold text-tijum-plum">
                                                        Filters
                                                    </SheetTitle>
                                                </SheetHeader>
                                                <div className="mt-4">
                                                    {FilterPanel}
                                                </div>
                                            </SheetContent>
                                        </Sheet>

                                        <p className="text-xs font-medium text-tijum-plum sm:text-sm">
                                            <span className="font-heading text-base font-bold tabular-nums">
                                                {filteredProperties.length}
                                            </span>{' '}
                                            stay
                                            {filteredProperties.length === 1
                                                ? ''
                                                : 's'}{' '}
                                            available
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {/* Duration / Billing Cycle Switcher */}
                                        <div className="flex items-center rounded-xl border border-tijum-surface bg-white p-1 shadow-2xs">
                                            {[
                                                {
                                                    value: 'daily' as const,
                                                    label: 'Daily',
                                                },
                                                {
                                                    value: 'weekly' as const,
                                                    label: 'Weekly',
                                                },
                                                {
                                                    value: 'monthly' as const,
                                                    label: 'Monthly',
                                                },
                                            ].map((d) => (
                                                <button
                                                    key={d.value}
                                                    type="button"
                                                    onClick={() =>
                                                        setDurationBasis(
                                                            d.value,
                                                        )
                                                    }
                                                    className={`cursor-pointer rounded-lg px-3 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                                        durationBasis ===
                                                        d.value
                                                            ? 'bg-tijum-plum text-tijum-cream'
                                                            : 'text-tijum-lavender hover:text-tijum-plum'
                                                    }`}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* View Mode Toggle */}
                                        <div className="flex items-center rounded-xl border border-tijum-surface bg-white p-1 shadow-2xs">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewMode('list')
                                                }
                                                aria-label="List view"
                                                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                                    viewMode === 'list'
                                                        ? 'bg-tijum-plum text-tijum-cream'
                                                        : 'text-tijum-lavender hover:text-tijum-plum'
                                                }`}
                                            >
                                                <LayoutList className="size-3.5" />
                                                <span>List</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewMode('grid')
                                                }
                                                aria-label="Grid view"
                                                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                                    viewMode === 'grid'
                                                        ? 'bg-tijum-plum text-tijum-cream'
                                                        : 'text-tijum-lavender hover:text-tijum-plum'
                                                }`}
                                            >
                                                <LayoutGrid className="size-3.5" />
                                                <span>Grid</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {filteredProperties.length === 0 ? (
                                    <div className="rounded-[24px] border border-tijum-surface bg-white p-10 text-center shadow-tijum-card">
                                        <p className="font-heading text-base font-bold text-tijum-plum">
                                            No stays match your selected filters
                                        </p>
                                        <p className="mt-1 text-xs text-tijum-lavender">
                                            Try clearing some filter options or
                                            adjusting your criteria.
                                        </p>
                                        <div className="mt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={clearFilters}
                                            >
                                                Clear filters
                                            </Button>
                                        </div>
                                    </div>
                                ) : viewMode === 'list' ? (
                                    <ScrollReveal
                                        direction="up"
                                        distance={20}
                                        stagger={0.08}
                                    >
                                        <div className="space-y-4">
                                            {paginatedProperties.map(
                                                (property) => (
                                                    <PropertyCard
                                                        key={property.id}
                                                        layout="horizontal"
                                                        property={cardPropertyProps(
                                                            property,
                                                        )}
                                                        href={propertyShow.url({
                                                            property:
                                                                property.slug,
                                                        })}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </ScrollReveal>
                                ) : (
                                    <ScrollReveal
                                        direction="up"
                                        distance={20}
                                        stagger={0.08}
                                    >
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                            {paginatedProperties.map(
                                                (property) => (
                                                    <PropertyCard
                                                        key={property.id}
                                                        layout="vertical"
                                                        property={cardPropertyProps(
                                                            property,
                                                        )}
                                                        href={propertyShow.url({
                                                            property:
                                                                property.slug,
                                                        })}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </ScrollReveal>
                                )}

                                {totalPages > 1 && (
                                    <nav
                                        className="flex items-center justify-center gap-2 pt-4"
                                        aria-label="Property previews pagination"
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage <= 1}
                                            onClick={() =>
                                                setCurrentPage((p) =>
                                                    Math.max(1, p - 1),
                                                )
                                            }
                                        >
                                            <ChevronLeft className="size-4" />
                                            Previous
                                        </Button>

                                        <span className="px-3 text-xs font-semibold text-tijum-plum">
                                            Page {currentPage} of {totalPages}
                                        </span>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage >= totalPages}
                                            onClick={() =>
                                                setCurrentPage((p) =>
                                                    Math.min(totalPages, p + 1),
                                                )
                                            }
                                        >
                                            Next
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </nav>
                                )}
                            </div>
                        </div>
                    )}
                    {ENABLE_MAP_VIEW && (
                        <div className="hidden">
                            <SearchMap
                                properties={mapProperties}
                                selectedSlug={selectedMapSlug}
                                onSelectProperty={setSelectedMapSlug}
                                cityName={city.name}
                            />
                        </div>
                    )}
                </ResponsiveContainer>
            </section>

            <CompareDrawer />
        </>
    );
}
