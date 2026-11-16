import { Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Gift,
    LayoutGrid,
    LayoutList,
    Loader2,
    Map as MapIcon,
    MapPin,
    SlidersHorizontal,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CompareDrawer } from '@/components/public/compare-drawer';
import { PropertyCard } from '@/components/public/property-card';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { SearchMap } from '@/components/public/search-map';
import { SearchPanel } from '@/components/public/search-panel';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ScrollReveal } from '@/components/shared/scroll-reveal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { formatStayTime } from '@/lib/stay-timing';
import { search as publicSearch } from '@/routes/public';
import { show as propertyShow } from '@/routes/public/properties';
import type {
    PublicAmenityItem,
    SearchPageProps,
    SearchResultCard,
} from '@/types/public-search';

function cardAmenities(item: SearchResultCard): PublicAmenityItem[] {
    const amenities = new Map<number, PublicAmenityItem>();

    for (const amenity of item.property_amenities) {
        amenities.set(amenity.id, amenity);
    }

    for (const roomType of item.room_summaries) {
        for (const amenity of roomType.room_type_amenities) {
            amenities.set(amenity.id, amenity);
        }
    }

    return [...amenities.values()];
}

function minorToRupeesInput(value: number | string | null | undefined) {
    if (value == null || value === '') {
        return '';
    }

    const minor = String(value).replace(/\D/g, '').padStart(3, '0');
    const whole = minor.slice(0, -2).replace(/^0+(?=\d)/, '');
    const fraction = minor.slice(-2);

    return fraction === '00' ? whole : `${whole}.${fraction}`;
}

function rupeesInputToMinor(value: string) {
    const match = value.trim().match(/^(\d+)(?:\.(\d{0,2}))?$/);
    if (!match) {
        return undefined;
    }

    const wholeMinor = Number(match[1]) * 100;
    const fractionMinor = Number((match[2] ?? '').padEnd(2, '0'));

    return wholeMinor + fractionMinor;
}

export default function SearchPage(props: SearchPageProps) {
    const {
        filters,
        hasSearchIntent,
        results,
        resultTotal,
        localityFallback,
        searchedLocality,
        locationLabel,
        cities,
        locations,
        categories,
        timing,
        durations,
        seo,
        errors,
    } = props;
    const [mobileOpen, setMobileOpen] = useState(false);
    // Feature flag: Map view is preserved ready for future activation per user request
    const ENABLE_MAP_VIEW = false;
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('list');
    const [selectedMapSlug, setSelectedMapSlug] = useState<string | null>(null);

    const city = String(filters.city ?? '');
    const [locality, setLocality] = useState(filters.locality ?? '');
    const [searchLocationLabel, setSearchLocationLabel] = useState(
        locationLabel ?? '',
    );
    const checkIn = String(filters.check_in ?? '');
    const durationType = String(filters.duration_type ?? 'daily');
    const [activeDuration, setActiveDuration] = useState(durationType);

    useEffect(() => {
        setActiveDuration(durationType);
    }, [durationType]);

    useEffect(() => {
        setLocality(filters.locality ?? '');
    }, [filters.locality]);

    useEffect(() => {
        setSearchLocationLabel(locationLabel ?? '');
    }, [locationLabel]);

    const durationCount = String(filters.duration_count ?? 1);
    const guests = String(filters.guests ?? 1);

    const [selectedCategories, setSelectedCategories] = useState<number[]>(
        filters.category ?? [],
    );
    const [genderPref, setGenderPref] = useState<string>(
        filters.gender_preference ?? 'all',
    );
    const [sharing, setSharing] = useState<number[]>(
        filters.sharing_capacity ?? [],
    );
    const [ac, setAc] = useState<string[]>(filters.ac ?? []);
    const [minPrice, setMinPrice] = useState(
        minorToRupeesInput(filters.min_price),
    );
    const [maxPrice, setMaxPrice] = useState(
        minorToRupeesInput(filters.max_price),
    );
    const [earlyCheckIn, setEarlyCheckIn] = useState<boolean>(
        !!filters.early_check_in,
    );
    const [minRating, setMinRating] = useState<string>(
        filters.min_rating != null ? String(filters.min_rating) : '',
    );
    const [sort, setSort] = useState<string>(filters.sort ?? 'relevant');

    // Continuous infinite scrolling state & page tracking
    const [displayedItems, setDisplayedItems] = useState<SearchResultCard[]>(
        () => results?.data ?? [],
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadedPages, setLoadedPages] = useState<Set<number>>(
        () => new Set([results?.meta?.current_page ?? 1]),
    );

    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Sync when filters change or initial page 1 results arrive
    useEffect(() => {
        if (!results?.meta || results.meta.current_page === 1) {
            setDisplayedItems(results?.data ?? []);
            setLoadedPages(new Set([results?.meta?.current_page ?? 1]));
        }
    }, [results]);

    const currentPage = results?.meta?.current_page ?? 1;
    const lastPage = results?.meta?.last_page ?? 1;
    const hasMore = currentPage < lastPage;

    const loadNextPage = useCallback(() => {
        if (isLoadingMore || !hasMore) return;
        const nextPage = currentPage + 1;
        if (loadedPages.has(nextPage)) return;

        setIsLoadingMore(true);

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('page', String(nextPage));

        router.get(
            currentUrl.pathname + currentUrl.search,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                only: ['results'],
                onSuccess: (page) => {
                    const newResults = (page.props as any).results;
                    if (newResults?.data) {
                        setDisplayedItems((prev) => {
                            const existingSlugs = new Set(
                                prev.map((item) => item.slug),
                            );
                            const uniqueNew = newResults.data.filter(
                                (item: SearchResultCard) =>
                                    !existingSlugs.has(item.slug),
                            );
                            return [...prev, ...uniqueNew];
                        });
                        setLoadedPages((prev) => new Set([...prev, nextPage]));
                    }
                    setIsLoadingMore(false);
                },
                onError: () => {
                    setIsLoadingMore(false);
                },
            },
        );
    }, [currentPage, lastPage, hasMore, isLoadingMore, loadedPages]);

    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadNextPage();
                }
            },
            { rootMargin: '300px' },
        );

        observer.observe(sentinelRef.current);

        return () => observer.disconnect();
    }, [loadNextPage, hasMore]);

    const cardPropertyProps = (item: SearchResultCard) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        category: item.category.name ?? null,
        city: item.city.name ?? null,
        locality: item.locality,
        genderEligibility: item.gender_eligibility,
        imageUrl:
            item.cover_image?.thumbnail_url ?? item.cover_image?.url ?? null,
        imageAlt: item.cover_image?.alt_text ?? null,
        food: item.food,
        amenities: cardAmenities(item),
        amenityMoreCount: item.property_amenities_more_count,
        roomTypes: item.room_summaries.map(
            (room) =>
                `${room.sharing_label} ${room.is_air_conditioned ? 'AC' : 'Non-AC'}`,
        ),
        price: {
            amountMinor: item.price.amount_minor,
            totalMinor: item.price.is_estimate ? item.price.total_minor : null,
            currency: item.price.currency,
            rateLabel: `${item.price.pricing_basis_label} · ${item.price.duration_type}`,
            totalLabel: item.price.is_estimate
                ? `${guests} guest estimate`
                : null,
        },
        rating: item.average_rating ?? null,
        reviewCount: item.review_count ?? 0,
        distanceKm: item.distance_km ?? null,
        distanceLabel: item.distance_label ?? null,
    });

    const itemLinkHref = (slug: string) =>
        propertyShow(slug, {
            query: {
                check_in: checkIn,
                duration_type: durationType,
                duration_count: durationCount,
                guests,
            },
        });

    const buildParams = (overrides: Record<string, unknown> = {}) => {
        const p: Record<string, unknown> = {
            city: city || undefined,
            locality: locality || undefined,
            location_label: searchLocationLabel || undefined,
            lat: filters.lat ?? undefined,
            lng: filters.lng ?? undefined,
            check_in: checkIn || undefined,
            duration_type: durationType,
            duration_count: Number(durationCount || 1),
            guests: Number(guests || 1),
            category: selectedCategories.length
                ? selectedCategories
                : undefined,
            gender_preference: genderPref || 'all',
            sharing_capacity: sharing.length ? sharing : undefined,
            ac: ac.length ? ac : undefined,
            min_price:
                minPrice !== '' ? rupeesInputToMinor(minPrice) : undefined,
            max_price:
                maxPrice !== '' ? rupeesInputToMinor(maxPrice) : undefined,
            min_rating: minRating !== '' ? Number(minRating) : undefined,
            early_check_in: earlyCheckIn ? true : undefined,
            sort: sort !== 'relevant' ? sort : undefined,
            ...overrides,
        };
        Object.keys(p).forEach(
            (k) =>
                (p[k] === undefined ||
                    p[k] === null ||
                    p[k] === '' ||
                    (Array.isArray(p[k]) &&
                        (p[k] as unknown[]).length === 0)) &&
                delete p[k],
        );
        return p;
    };

    const clearLocalityFilter = () => {
        setLocality('');
        setSearchLocationLabel('');
        router.get(
            publicSearch.url(),
            buildParams({
                locality: undefined,
                location_label: undefined,
                lat: undefined,
                lng: undefined,
                page: undefined,
            }) as any,
            { preserveScroll: true },
        );
    };

    const applyFilters = () => {
        setMobileOpen(false);
        const currentScrollY =
            window.pageYOffset || document.documentElement.scrollTop || 0;
        router.get(
            publicSearch.url(),
            buildParams({ page: undefined }) as any,
            {
                preserveScroll: true,
                preserveState: true,
                only: [
                    'results',
                    'resultTotal',
                    'filters',
                    'timing',
                    'checkoutDate',
                ],
                onFinish: () => {
                    window.scrollTo({
                        top: currentScrollY,
                        behavior: 'instant' as ScrollBehavior,
                    });
                },
            },
        );
    };

    const handleDurationChange = (newType: string) => {
        if (newType === activeDuration) return;
        setActiveDuration(newType);
        const currentScrollY =
            window.pageYOffset || document.documentElement.scrollTop || 0;
        router.get(
            publicSearch.url(),
            buildParams({
                duration_type: newType,
                duration_count: 1,
                page: undefined,
            }) as any,
            {
                preserveScroll: true,
                preserveState: true,
                only: [
                    'results',
                    'resultTotal',
                    'filters',
                    'timing',
                    'checkoutDate',
                ],
                onFinish: () => {
                    window.scrollTo({
                        top: currentScrollY,
                        behavior: 'instant' as ScrollBehavior,
                    });
                },
            },
        );
    };

    const clearFilters = () => {
        setSelectedCategories([]);
        setGenderPref('all');
        setSharing([]);
        setAc([]);
        setMinPrice('');
        setMaxPrice('');
        setMinRating('');
        setEarlyCheckIn(false);
        setSort('relevant');
        router.get(
            publicSearch.url(),
            {
                city: city || undefined,
                locality: locality || undefined,
                check_in: checkIn || undefined,
                duration_type: durationType,
                duration_count: Number(durationCount || 1),
                guests: Number(guests || 1),
            },
            { preserveScroll: false, preserveState: false },
        );
    };

    const toggleIn = <T,>(arr: T[], v: T) =>
        arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

    const cityName =
        cities.find((c) => String(c.id) === String(city))?.name ??
        'Selected city';

    const FilterPanel = (
        <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-tijum-surface pb-3">
                <h2 className="font-heading text-base font-bold text-tijum-plum">
                    Filters
                </h2>
                <button
                    type="button"
                    onClick={clearFilters}
                    className="cursor-pointer font-heading text-xs font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 hover:text-tijum-coral"
                >
                    Clear all
                </button>
            </div>

            <div className="space-y-1.5">
                <p className="text-xs font-semibold text-tijum-plum">
                    Accommodation category
                </p>
                {categories.map((c) => (
                    <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-tijum-plum"
                    >
                        <Checkbox
                            checked={selectedCategories.includes(c.id)}
                            onCheckedChange={() =>
                                setSelectedCategories((s) => toggleIn(s, c.id))
                            }
                        />
                        <span>{c.name}</span>
                    </label>
                ))}
            </div>

            <div className="space-y-1.5">
                <p className="text-xs font-semibold text-tijum-plum">
                    Guest eligibility
                </p>
                {[
                    { v: 'all', l: 'All (Any Gender / All Stays)' },
                    { v: 'male', l: 'Male only' },
                    { v: 'female', l: 'Female only' },
                    { v: 'both', l: 'Both (Co-Living / Unisex)' },
                ].map((o) => (
                    <label
                        key={o.v}
                        className="flex cursor-pointer items-center gap-2 text-sm text-tijum-plum"
                    >
                        <input
                            type="radio"
                            name="gender"
                            checked={genderPref === o.v}
                            onChange={() => setGenderPref(o.v)}
                            className="accent-tijum-plum"
                        />
                        <span>{o.l}</span>
                    </label>
                ))}
            </div>

            <div className="space-y-1.5">
                <p className="text-xs font-semibold text-tijum-plum">
                    Sharing configuration
                </p>
                {[
                    { v: 4, l: '4 Sharing' },
                    { v: 3, l: '3 Sharing' },
                    { v: 2, l: '2 Sharing' },
                    { v: 1, l: 'Single Room' },
                ].map((o) => (
                    <label
                        key={o.v}
                        className="flex cursor-pointer items-center gap-2 text-sm text-tijum-plum"
                    >
                        <Checkbox
                            checked={sharing.includes(o.v)}
                            onCheckedChange={() =>
                                setSharing((s) => toggleIn(s, o.v))
                            }
                        />
                        <span>{o.l}</span>
                    </label>
                ))}
            </div>

            <div className="space-y-1.5">
                <p className="text-xs font-semibold text-tijum-plum">
                    AC / Non-AC
                </p>
                {[
                    { v: 'ac', l: 'AC' },
                    { v: 'non_ac', l: 'Non-AC' },
                ].map((o) => (
                    <label
                        key={o.v}
                        className="flex cursor-pointer items-center gap-2 text-sm text-tijum-plum"
                    >
                        <Checkbox
                            checked={ac.includes(o.v)}
                            onCheckedChange={() =>
                                setAc((s) => toggleIn(s, o.v))
                            }
                        />
                        <span>{o.l}</span>
                    </label>
                ))}
            </div>

            <div className="space-y-2">
                <p className="text-xs font-semibold text-tijum-plum">
                    Total price range (₹)
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor="min_price" className="text-[11px]">
                            Min
                        </Label>
                        <Input
                            id="min_price"
                            type="number"
                            min={0}
                            step="0.01"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="max_price" className="text-[11px]">
                            Max
                        </Label>
                        <Input
                            id="max_price"
                            type="number"
                            min={0}
                            step="0.01"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                        />
                    </div>
                </div>
                <p className="text-xs text-tijum-lavender">
                    Compared using selected duration and guest quantity.
                </p>
            </div>

            <div className="space-y-1.5">
                <label className="flex cursor-pointer items-start gap-2 text-sm text-tijum-plum">
                    <Checkbox
                        className="mt-0.5"
                        checked={earlyCheckIn}
                        onCheckedChange={(v) => setEarlyCheckIn(v === true)}
                    />
                    <span>
                        Room type allows early check-in from{' '}
                        {formatStayTime(timing.earliest_early_check_in_time)}{' '}
                        (subject to availability)
                    </span>
                </label>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-semibold text-tijum-plum">
                    Minimum Rating
                </Label>
                <div className="flex flex-wrap gap-1.5">
                    {[
                        { label: 'Any', value: '' },
                        { label: '4.5+', value: '4.5' },
                        { label: '4.0+', value: '4.0' },
                        { label: '3.5+', value: '3.5' },
                    ].map((r) => (
                        <button
                            key={r.label}
                            type="button"
                            onClick={() =>
                                setMinRating(
                                    minRating === r.value ? '' : r.value,
                                )
                            }
                            className={`cursor-pointer rounded-xl border px-3 py-2 font-heading text-xs font-semibold transition-colors ${
                                minRating === r.value
                                    ? 'border-tijum-plum bg-tijum-plum text-tijum-cream'
                                    : 'border-tijum-surface bg-tijum-cream/60 text-tijum-plum hover:border-tijum-peach hover:bg-tijum-peach/20'
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <Button type="button" size="lg" className="w-full" onClick={applyFilters}>
                Apply filters
            </Button>
        </div>
    );

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="Search Accommodation | TIJUM"
                fallbackDescription="Search TIJUM stays with transparent room pricing and exact meal information."
            />
            <section className="bg-tijum-plum py-10 text-tijum-cream sm:py-12">
                <ResponsiveContainer width="wide" className="space-y-7">
                    <div className="max-w-3xl space-y-3">
                        <p className="font-heading text-xs font-semibold uppercase tracking-wider text-tijum-peach sm:text-sm">
                            Find the right room type, meals, and duration
                        </p>
                        <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-cream sm:text-3xl lg:text-[40px] leading-tight">
                            {hasSearchIntent
                                ? `Stays in ${cityName}`
                                : 'Search TIJUM stays'}
                        </h1>
                        <p className="max-w-2xl text-base leading-relaxed text-tijum-cream/72">
                            Edit the essentials here, then refine real
                            availability, amenities, meal inclusions, and price
                            below.
                        </p>
                    </div>

                    {errors && Object.keys(errors).length > 0 && (
                        <div
                            role="alert"
                            className="rounded-xl border border-tijum-coral/55 bg-tijum-coral/12 px-4 py-3 text-sm font-semibold text-tijum-cream"
                        >
                            {Object.values(errors).map((message) => (
                                <p key={message}>{message}</p>
                            ))}
                        </div>
                    )}

                    <Breadcrumbs
                        items={[
                            {
                                label: 'Explore Stays',
                                href: publicSearch.url(),
                                current: !cityName,
                            },
                            ...(cityName
                                ? [
                                      {
                                          label: `Stays in ${cityName}`,
                                          current: true,
                                      },
                                  ]
                                : []),
                        ]}
                        tone="light"
                        className="mb-4"
                    />

                    <SearchPanel
                        compact
                        autoSubmitOnLocate={
                            !city && !locality && !searchLocationLabel
                        }
                        onDurationChange={handleDurationChange}
                        locations={locations}
                        cities={cities.map((option) => ({
                            id: option.id,
                            name: option.name,
                        }))}
                        durations={Object.entries(durations).map(
                            ([value, option]) => ({
                                value,
                                label:
                                    option.label ??
                                    `${value.charAt(0).toUpperCase()}${value.slice(1)}`,
                            }),
                        )}
                        timing={{
                            default_check_in: timing.standard_check_in_time,
                            default_check_out: timing.standard_check_out_time,
                            earliest_check_in:
                                timing.earliest_early_check_in_time,
                            early_check_in_fee_minor: 0,
                        }}
                        defaults={{
                            check_in: checkIn,
                            duration_type: durationType,
                            duration_count: Number(durationCount || 1),
                            guests: Number(guests || 1),
                        }}
                        initial={{
                            city,
                            locality,
                            locationLabel: searchLocationLabel,
                            lat: filters.lat ?? undefined,
                            lng: filters.lng ?? undefined,
                            checkIn,
                            durationType,
                            durationCount,
                            guests,
                            genderPreference: genderPref,
                        }}
                    />

                    {hasSearchIntent && (
                        <p className="rounded-xl border border-tijum-cream/15 bg-tijum-cream/8 px-4 py-2.5 text-sm text-tijum-cream/85">
                            <strong className="font-heading text-white">
                                Active search:
                            </strong>{' '}
                            {searchLocationLabel || cityName}
                            {!searchLocationLabel && locality
                                ? ` · ${locality}`
                                : ''}
                        </p>
                    )}
                </ResponsiveContainer>
            </section>

            <section className="bg-tijum-cream py-10 sm:py-12">
                <ResponsiveContainer width="wide">
                    {!results ? (
                        <Card className="rounded-[24px] border-tijum-surface bg-white shadow-tijum-card">
                            <CardContent className="py-12 text-center">
                                <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-tijum-peach/25 text-tijum-plum">
                                    <MapPin
                                        className="size-6"
                                        aria-hidden="true"
                                    />
                                </span>
                                <p className="font-heading text-lg font-bold text-tijum-plum">
                                    Start your search
                                </p>
                                <p className="mt-1 text-sm text-tijum-lavender">
                                    Select a city, check-in date, duration, and
                                    guests to find food-inclusive stays.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div
                            className={
                                ENABLE_MAP_VIEW && viewMode === 'map'
                                    ? 'space-y-6'
                                    : 'grid gap-7 lg:grid-cols-[290px_minmax(0,1fr)]'
                            }
                        >
                            {(viewMode !== 'map' || !ENABLE_MAP_VIEW) && (
                                <aside className="hidden lg:block">
                                    <div className="rounded-[24px] border border-tijum-surface bg-white p-5 shadow-tijum-card">
                                        {FilterPanel}
                                    </div>
                                </aside>
                            )}
                            <div className="min-w-0 space-y-5">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tijum-surface pb-4">
                                    <div className="flex items-center gap-2.5">
                                        <Sheet
                                            open={mobileOpen}
                                            onOpenChange={setMobileOpen}
                                        >
                                            <SheetTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={
                                                        ENABLE_MAP_VIEW &&
                                                        viewMode === 'map'
                                                            ? 'h-10'
                                                            : 'h-10 lg:hidden'
                                                    }
                                                >
                                                    <SlidersHorizontal className="size-4" />{' '}
                                                    Filters
                                                </Button>
                                            </SheetTrigger>
                                            <SheetContent
                                                side="left"
                                                className="tijum-public w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto border-r border-tijum-surface bg-white"
                                            >
                                                <SheetHeader>
                                                    <SheetTitle>
                                                        Filters
                                                    </SheetTitle>
                                                </SheetHeader>
                                                <div className="mt-4">
                                                    {FilterPanel}
                                                </div>
                                            </SheetContent>
                                        </Sheet>
                                        <p className="text-sm text-tijum-plum">
                                            <span className="font-heading text-base font-bold tabular-nums">
                                                {resultTotal}
                                            </span>{' '}
                                            stay{resultTotal === 1 ? '' : 's'}{' '}
                                            found
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {/* Duration / Rate Basis Switcher (Daily / Weekly / Monthly) */}
                                        <div className="flex items-center rounded-xl border border-tijum-surface bg-white p-1 shadow-2xs">
                                            {[
                                                {
                                                    value: 'daily',
                                                    label: 'Daily',
                                                },
                                                {
                                                    value: 'weekly',
                                                    label: 'Weekly',
                                                },
                                                {
                                                    value: 'monthly',
                                                    label: 'Monthly',
                                                },
                                            ].map((d) => (
                                                <button
                                                    key={d.value}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDurationChange(
                                                            d.value,
                                                        );
                                                    }}
                                                    className={`cursor-pointer rounded-lg px-3 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                                        activeDuration ===
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
                                            {ENABLE_MAP_VIEW && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setViewMode('map')
                                                    }
                                                    aria-label="Map view"
                                                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                                        viewMode === 'map'
                                                            ? 'bg-tijum-plum text-tijum-cream shadow-xs'
                                                            : 'text-tijum-lavender hover:text-tijum-plum'
                                                    }`}
                                                >
                                                    <MapIcon className="size-3.5" />
                                                    <span>Map</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Label
                                                htmlFor="sort"
                                                className="text-xs text-tijum-lavender"
                                            >
                                                Sort
                                            </Label>
                                            <Select
                                                value={sort}
                                                onValueChange={(v) => {
                                                    setSort(v);
                                                    const currentScrollY =
                                                        window.pageYOffset ||
                                                        document.documentElement
                                                            .scrollTop ||
                                                        0;
                                                    router.get(
                                                        publicSearch.url(),
                                                        buildParams({
                                                            sort:
                                                                v !== 'relevant'
                                                                    ? v
                                                                    : undefined,
                                                            page: undefined,
                                                        }) as any,
                                                        {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                            only: [
                                                                'results',
                                                                'resultTotal',
                                                                'filters',
                                                                'timing',
                                                                'checkoutDate',
                                                            ],
                                                            onFinish: () => {
                                                                window.scrollTo(
                                                                    {
                                                                        top: currentScrollY,
                                                                        behavior:
                                                                            'instant' as ScrollBehavior,
                                                                    },
                                                                );
                                                            },
                                                        },
                                                    );
                                                }}
                                            >
                                                <SelectTrigger
                                                    id="sort"
                                                    className="h-10 w-[190px] rounded-xl bg-white"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="relevant">
                                                        Relevant
                                                    </SelectItem>
                                                    <SelectItem value="distance_asc">
                                                        Nearest First (Nearby to
                                                        Farthest)
                                                    </SelectItem>
                                                    <SelectItem value="distance_desc">
                                                        Farthest First (Farthest
                                                        to Nearby)
                                                    </SelectItem>
                                                    <SelectItem value="price_asc">
                                                        Price: Low to High
                                                    </SelectItem>
                                                    <SelectItem value="price_desc">
                                                        Price: High to Low
                                                    </SelectItem>
                                                    <SelectItem value="recent">
                                                        Recently Listed
                                                    </SelectItem>
                                                    <SelectItem value="highest_rated">
                                                        Highest Rated
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Refer & Earn Banner for Customer Search */}
                                {displayedItems.length > 0 && (
                                    <div className="mb-6 flex flex-col justify-between gap-4 rounded-[20px] border border-tijum-peach bg-white p-5 shadow-tijum-card sm:flex-row sm:items-center sm:px-6">
                                        <div className="flex items-center gap-3.5">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tijum-peach/30 text-tijum-plum">
                                                <Gift
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <div>
                                                <p className="font-heading text-sm font-bold text-tijum-plum">
                                                    Invite friends to TIJUM
                                                    &amp; earn ₹500 stay
                                                    credits!
                                                </p>
                                                <p className="text-xs leading-relaxed text-tijum-lavender">
                                                    Your friend receives 250
                                                    welcome points. You earn 500
                                                    points (₹500 value) when
                                                    they complete their first
                                                    stay.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="plum"
                                            className="shrink-0"
                                            asChild
                                        >
                                            <Link href="/rewards/referrals">
                                                <span>Refer &amp; Earn Now</span>
                                                <ArrowRight
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </Button>
                                    </div>
                                )}

                                {localityFallback && searchedLocality && (
                                    <div className="mb-4 flex flex-col justify-between gap-3 rounded-[20px] border border-tijum-peach bg-tijum-peach/15 p-4 text-xs text-tijum-plum sm:flex-row sm:items-center sm:px-5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tijum-peach/45 text-tijum-plum">
                                                <MapPin className="size-4" />
                                            </div>
                                            <span>
                                                No stays found directly in{' '}
                                                <strong>
                                                    {searchedLocality}
                                                </strong>
                                                . Showing all{' '}
                                                <strong>{resultTotal}</strong>{' '}
                                                available stays in{' '}
                                                <strong>{cityName}</strong>.
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={clearLocalityFilter}
                                            className="shrink-0 cursor-pointer self-start font-heading font-semibold text-tijum-plum underline decoration-tijum-coral underline-offset-4 hover:text-tijum-coral sm:self-auto"
                                        >
                                            Clear area filter
                                        </button>
                                    </div>
                                )}

                                {results && displayedItems.length === 0 && (
                                    <div className="rounded-[24px] border border-tijum-surface bg-white p-8 text-center shadow-tijum-card sm:p-12">
                                        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-tijum-peach/25 text-tijum-plum">
                                            <MapPin
                                                className="size-6"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <h3 className="font-heading text-xl font-bold text-tijum-plum sm:text-2xl">
                                            {cityName
                                                ? `No available stays currently found in ${cityName}`
                                                : 'No stays match your search filters'}
                                        </h3>
                                        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-tijum-lavender">
                                            {cityName === 'Guntur'
                                                ? 'We are currently onboarding verified partner stays in Guntur. In the meantime, you can explore verified stays in nearby Vijayawada (35 km away) or browse all launch cities.'
                                                : cityName
                                                  ? `We are expanding in ${cityName} and verifying more properties. Try clearing your filters or exploring another launch city.`
                                                  : 'Try adjusting your dates, removing category or sharing filters, or selecting another launch city.'}
                                        </p>
                                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                            {cityName === 'Guntur' && (
                                                <Button
                                                    variant="default"
                                                    onClick={() => {
                                                        const vijayawadaCity =
                                                            cities.find(
                                                                (c) =>
                                                                    c.slug ===
                                                                    'vijayawada',
                                                            );
                                                        if (vijayawadaCity) {
                                                            setLocality('');
                                                            setSearchLocationLabel(
                                                                '',
                                                            );
                                                            router.get(
                                                                publicSearch.url(),
                                                                buildParams({
                                                                    city: String(
                                                                        vijayawadaCity.id,
                                                                    ),
                                                                    locality:
                                                                        undefined,
                                                                    location_label:
                                                                        undefined,
                                                                }) as Record<
                                                                    string,
                                                                    | string
                                                                    | number
                                                                    | boolean
                                                                >,
                                                                {
                                                                    preserveScroll: true,
                                                                },
                                                            );
                                                        }
                                                    }}
                                                >
                                                    Explore nearby Vijayawada
                                                    stays (35 km)
                                                </Button>
                                            )}
                                            {locality && (
                                                <Button
                                                    variant="outline"
                                                    onClick={
                                                        clearLocalityFilter
                                                    }
                                                >
                                                    Clear locality ({locality})
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                onClick={clearFilters}
                                            >
                                                View all launch cities
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {ENABLE_MAP_VIEW && viewMode === 'map' ? (
                                    <div className="grid items-start gap-6 lg:grid-cols-2">
                                        <div className="max-h-[calc(100dvh-12rem)] space-y-4 overflow-y-auto pr-1">
                                            {displayedItems.map((item) => (
                                                <div
                                                    key={item.slug}
                                                    onMouseEnter={() =>
                                                        setSelectedMapSlug(
                                                            item.slug,
                                                        )
                                                    }
                                                    className={
                                                        selectedMapSlug ===
                                                        item.slug
                                                            ? 'rounded-[22px] ring-2 ring-tijum-coral'
                                                            : ''
                                                    }
                                                >
                                                    <PropertyCard
                                                        layout="horizontal"
                                                        property={cardPropertyProps(
                                                            item,
                                                        )}
                                                        href={itemLinkHref(
                                                            item.slug,
                                                        )}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="sticky top-24 hidden h-[calc(100dvh-12rem)] lg:block">
                                            <SearchMap
                                                properties={displayedItems}
                                                selectedSlug={selectedMapSlug}
                                                onSelectProperty={
                                                    setSelectedMapSlug
                                                }
                                                cityName={cityName}
                                            />
                                        </div>
                                    </div>
                                ) : viewMode === 'grid' ? (
                                    <ScrollReveal
                                        direction="up"
                                        distance={20}
                                        stagger={0.07}
                                    >
                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-3">
                                            {displayedItems.map((item) => (
                                                <PropertyCard
                                                    key={item.slug}
                                                    layout="vertical"
                                                    property={cardPropertyProps(
                                                        item,
                                                    )}
                                                    href={itemLinkHref(
                                                        item.slug,
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </ScrollReveal>
                                ) : (
                                    <ScrollReveal
                                        direction="up"
                                        distance={20}
                                        stagger={0.07}
                                    >
                                        <div className="space-y-4">
                                            {displayedItems.map((item) => (
                                                <PropertyCard
                                                    key={item.slug}
                                                    layout="horizontal"
                                                    property={cardPropertyProps(
                                                        item,
                                                    )}
                                                    href={itemLinkHref(
                                                        item.slug,
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </ScrollReveal>
                                )}

                                {/* Continuous Infinite Scrolling Sentinel & Status */}
                                <div
                                    ref={sentinelRef}
                                    className="flex flex-col items-center justify-center py-8"
                                >
                                    {isLoadingMore && (
                                        <div className="flex items-center gap-2.5 rounded-full border border-tijum-surface bg-tijum-cream px-5 py-2.5 text-xs font-semibold text-tijum-plum shadow-md">
                                            <Loader2 className="size-4 animate-spin text-tijum-coral" />
                                            <span>
                                                Loading more nearby stays...
                                            </span>
                                        </div>
                                    )}
                                    {!hasMore && displayedItems.length > 0 && (
                                        <p className="text-xs font-medium text-tijum-plum-muted">
                                            Showing all{' '}
                                            {resultTotal ||
                                                displayedItems.length}{' '}
                                            available stays in this area.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </ResponsiveContainer>
            </section>

            <CompareDrawer />
        </>
    );
}
