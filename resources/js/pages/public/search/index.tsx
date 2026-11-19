import { Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Clock3,
    Gift,
    LayoutGrid,
    LayoutList,
    Loader2,
    Map as MapIcon,
    MapPin,
    SlidersHorizontal,
    Star,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CompareDrawer } from '@/components/public/compare-drawer';
import { PropertyCard } from '@/components/public/property-card';
import { PublicSeoHead } from '@/components/public/public-seo-head';
import { SearchMap } from '@/components/public/search-map';
import { SearchPanel } from '@/components/public/search-panel';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { ResponsiveContainer } from '@/components/shared/responsive-container';
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

const GENDER_OPTIONS = [
    { v: 'all', l: 'All stays' },
    { v: 'male', l: 'Male only' },
    { v: 'female', l: 'Female only' },
    { v: 'both', l: 'Co-Living' },
] as const;

const SHARING_OPTIONS = [
    { v: 1, l: 'Single' },
    { v: 2, l: '2 Sharing' },
    { v: 3, l: '3 Sharing' },
    { v: 4, l: '4 Sharing' },
] as const;

const AC_OPTIONS = [
    { v: 'ac', l: 'AC' },
    { v: 'non_ac', l: 'Non-AC' },
] as const;

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
    const [skipAutoLocate, setSkipAutoLocate] = useState(false);
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

    const navigateWithPartialReload = (overrides: Record<string, unknown>) => {
        const currentScrollY =
            window.pageYOffset || document.documentElement.scrollTop || 0;
        router.get(
            publicSearch.url(),
            buildParams({ ...overrides, page: undefined }) as any,
            {
                preserveScroll: true,
                preserveState: true,
                only: [
                    'results',
                    'resultTotal',
                    'filters',
                    'timing',
                    'checkoutDate',
                    'localityFallback',
                    'searchedLocality',
                    'locationLabel',
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

    const handleQuickCitySelect = (targetCityId?: number) => {
        setSkipAutoLocate(true);
        setLocality('');
        setSearchLocationLabel('');

        if (!targetCityId) {
            const nonIntentParams: Record<string, unknown> = {
                category: selectedCategories.length
                    ? selectedCategories
                    : undefined,
                gender_preference:
                    genderPref !== 'all' ? genderPref : undefined,
                sharing_capacity: sharing.length ? sharing : undefined,
                ac: ac.length ? ac : undefined,
                min_price:
                    minPrice !== '' ? rupeesInputToMinor(minPrice) : undefined,
                max_price:
                    maxPrice !== '' ? rupeesInputToMinor(maxPrice) : undefined,
                min_rating: minRating !== '' ? Number(minRating) : undefined,
                early_check_in: earlyCheckIn ? true : undefined,
                sort: sort !== 'relevant' ? sort : undefined,
            };
            Object.keys(nonIntentParams).forEach(
                (k) =>
                    nonIntentParams[k] === undefined &&
                    delete nonIntentParams[k],
            );

            router.get(publicSearch.url(), nonIntentParams as any, {
                preserveScroll: false,
            });
            return;
        }

        router.get(
            publicSearch.url(),
            buildParams({
                city: String(targetCityId),
                locality: undefined,
                location_label: undefined,
                lat: undefined,
                lng: undefined,
                page: undefined,
            }) as any,
            { preserveScroll: false },
        );
    };

    const applyFilters = () => {
        setMobileOpen(false);
        navigateWithPartialReload({});
    };

    const handleDurationChange = (newType: string) => {
        if (newType === activeDuration) return;
        setActiveDuration(newType);
        navigateWithPartialReload({
            duration_type: newType,
            duration_count: 1,
        });
    };

    const clearFilters = () => {
        setSkipAutoLocate(true);
        setSelectedCategories([]);
        setGenderPref('all');
        setSharing([]);
        setAc([]);
        setMinPrice('');
        setMaxPrice('');
        setMinRating('');
        setEarlyCheckIn(false);
        setSort('relevant');
        setMobileOpen(false);
        router.get(
            publicSearch.url(),
            city
                ? {
                      city,
                      locality: locality || undefined,
                      check_in: checkIn || undefined,
                      duration_type: durationType,
                      duration_count: Number(durationCount || 1),
                      guests: Number(guests || 1),
                  }
                : {},
            { preserveScroll: false, preserveState: false },
        );
    };

    const toggleIn = <T,>(arr: T[], v: T) =>
        arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

    const matchedCity = cities.find((c) => String(c.id) === String(city));
    const cityName = matchedCity?.name ?? '';

    const activeFilterCount =
        selectedCategories.length +
        (genderPref !== 'all' ? 1 : 0) +
        sharing.length +
        ac.length +
        (minPrice !== '' || maxPrice !== '' ? 1 : 0) +
        (minRating !== '' ? 1 : 0) +
        (earlyCheckIn ? 1 : 0);

    // Active removable filter chips derived from applied server filters
    const activeChips: Array<{ key: string; label: string; onRemove: () => void }> =
        [];

    if (locality) {
        activeChips.push({
            key: 'locality',
            label: `Area: ${locality}`,
            onRemove: clearLocalityFilter,
        });
    }

    for (const catId of filters.category ?? []) {
        const cat = categories.find((c) => c.id === catId);
        if (cat) {
            activeChips.push({
                key: `cat-${catId}`,
                label: cat.name,
                onRemove: () => {
                    const next = selectedCategories.filter((x) => x !== catId);
                    setSelectedCategories(next);
                    navigateWithPartialReload({
                        category: next.length ? next : undefined,
                    });
                },
            });
        }
    }

    if (filters.gender_preference && filters.gender_preference !== 'all') {
        const label =
            GENDER_OPTIONS.find((g) => g.v === filters.gender_preference)?.l ??
            filters.gender_preference;
        activeChips.push({
            key: 'gender',
            label,
            onRemove: () => {
                setGenderPref('all');
                navigateWithPartialReload({ gender_preference: 'all' });
            },
        });
    }

    for (const cap of filters.sharing_capacity ?? []) {
        const label =
            SHARING_OPTIONS.find((s) => s.v === cap)?.l ?? `${cap} Sharing`;
        activeChips.push({
            key: `sharing-${cap}`,
            label,
            onRemove: () => {
                const next = sharing.filter((x) => x !== cap);
                setSharing(next);
                navigateWithPartialReload({
                    sharing_capacity: next.length ? next : undefined,
                });
            },
        });
    }

    for (const acVal of filters.ac ?? []) {
        const label = acVal === 'ac' ? 'AC' : 'Non-AC';
        activeChips.push({
            key: `ac-${acVal}`,
            label,
            onRemove: () => {
                const next = ac.filter((x) => x !== acVal);
                setAc(next);
                navigateWithPartialReload({
                    ac: next.length ? next : undefined,
                });
            },
        });
    }

    if (filters.min_price != null || filters.max_price != null) {
        const minLabel =
            filters.min_price != null
                ? `₹${minorToRupeesInput(filters.min_price)}`
                : '₹0';
        const maxLabel =
            filters.max_price != null
                ? `₹${minorToRupeesInput(filters.max_price)}`
                : 'Any';
        activeChips.push({
            key: 'price',
            label: `${minLabel} – ${maxLabel}`,
            onRemove: () => {
                setMinPrice('');
                setMaxPrice('');
                navigateWithPartialReload({
                    min_price: undefined,
                    max_price: undefined,
                });
            },
        });
    }

    if (filters.min_rating != null) {
        activeChips.push({
            key: 'rating',
            label: `${filters.min_rating}+ ★`,
            onRemove: () => {
                setMinRating('');
                navigateWithPartialReload({ min_rating: undefined });
            },
        });
    }

    if (filters.early_check_in) {
        activeChips.push({
            key: 'early-checkin',
            label: 'Early check-in',
            onRemove: () => {
                setEarlyCheckIn(false);
                navigateWithPartialReload({ early_check_in: undefined });
            },
        });
    }

    const renderFilterPanel = (inSheet = false) => (
        <div className="flex flex-col">
            <div
                className={`flex items-center justify-between border-b border-tijum-surface/80 px-5 py-4 ${
                    inSheet ? 'pr-12' : ''
                }`}
            >
                <div className="flex items-center gap-2">
                    <h2 className="font-heading text-base font-bold text-tijum-plum">
                        Filters
                    </h2>
                    {activeFilterCount > 0 && (
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-tijum-coral font-heading text-[11px] font-bold text-white">
                            {activeFilterCount}
                        </span>
                    )}
                </div>
                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="cursor-pointer font-heading text-xs font-semibold text-tijum-lavender underline underline-offset-4 transition-colors hover:text-[#D9523F]"
                    >
                        Reset
                    </button>
                )}
            </div>

            <div className="divide-y divide-tijum-surface/70 px-5 lg:max-h-[calc(100dvh-16.5rem)] lg:overflow-y-auto">
                {/* Stay Format */}
                <div className="space-y-2.5 py-4">
                    <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase">
                        Stay format
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map((c) => {
                            const active = selectedCategories.includes(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() =>
                                        setSelectedCategories((s) =>
                                            toggleIn(s, c.id),
                                        )
                                    }
                                    className={`cursor-pointer rounded-xl border px-3 py-1.5 font-heading text-xs font-semibold transition-all ${
                                        active
                                            ? 'border-tijum-plum bg-tijum-plum text-tijum-cream shadow-2xs'
                                            : 'border-tijum-surface bg-tijum-cream/40 text-tijum-plum hover:border-tijum-peach hover:bg-tijum-cream'
                                    }`}
                                >
                                    {c.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Guest Eligibility */}
                <div className="space-y-2.5 py-4">
                    <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase">
                        Guest eligibility
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {GENDER_OPTIONS.map((o) => {
                            const active = genderPref === o.v;
                            return (
                                <button
                                    key={o.v}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setGenderPref(o.v)}
                                    className={`cursor-pointer rounded-xl border px-3 py-2 text-left font-heading text-xs font-semibold transition-all ${
                                        active
                                            ? 'border-tijum-plum bg-tijum-plum text-tijum-cream shadow-2xs'
                                            : 'border-tijum-surface bg-tijum-cream/40 text-tijum-plum hover:border-tijum-peach hover:bg-tijum-cream'
                                    }`}
                                >
                                    {o.l}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sharing Configuration */}
                <div className="space-y-2.5 py-4">
                    <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase">
                        Room sharing
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {SHARING_OPTIONS.map((o) => {
                            const active = sharing.includes(o.v);
                            return (
                                <button
                                    key={o.v}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() =>
                                        setSharing((s) => toggleIn(s, o.v))
                                    }
                                    className={`cursor-pointer rounded-xl border px-3 py-2 text-left font-heading text-xs font-semibold transition-all ${
                                        active
                                            ? 'border-tijum-plum bg-tijum-plum text-tijum-cream shadow-2xs'
                                            : 'border-tijum-surface bg-tijum-cream/40 text-tijum-plum hover:border-tijum-peach hover:bg-tijum-cream'
                                    }`}
                                >
                                    {o.l}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* AC / Non-AC */}
                <div className="space-y-2.5 py-4">
                    <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase">
                        Room cooling
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {AC_OPTIONS.map((o) => {
                            const active = ac.includes(o.v);
                            return (
                                <button
                                    key={o.v}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() =>
                                        setAc((s) => toggleIn(s, o.v))
                                    }
                                    className={`cursor-pointer rounded-xl border px-3 py-2 text-center font-heading text-xs font-semibold transition-all ${
                                        active
                                            ? 'border-tijum-plum bg-tijum-plum text-tijum-cream shadow-2xs'
                                            : 'border-tijum-surface bg-tijum-cream/40 text-tijum-plum hover:border-tijum-peach hover:bg-tijum-cream'
                                    }`}
                                >
                                    {o.l}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Price Range */}
                <div className="space-y-2.5 py-4">
                    <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase">
                        Price range (₹)
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                            <Label
                                htmlFor="min_price"
                                className="text-[11px] font-medium text-tijum-lavender"
                            >
                                Min
                            </Label>
                            <div className="relative">
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-semibold text-tijum-lavender"
                                >
                                    ₹
                                </span>
                                <Input
                                    id="min_price"
                                    type="number"
                                    min={0}
                                    step="1"
                                    placeholder="0"
                                    value={minPrice}
                                    onChange={(e) =>
                                        setMinPrice(e.target.value)
                                    }
                                    className="h-10 pl-7 text-sm tabular-nums"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label
                                htmlFor="max_price"
                                className="text-[11px] font-medium text-tijum-lavender"
                            >
                                Max
                            </Label>
                            <div className="relative">
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-semibold text-tijum-lavender"
                                >
                                    ₹
                                </span>
                                <Input
                                    id="max_price"
                                    type="number"
                                    min={0}
                                    step="1"
                                    placeholder="Any"
                                    value={maxPrice}
                                    onChange={(e) =>
                                        setMaxPrice(e.target.value)
                                    }
                                    className="h-10 pl-7 text-sm tabular-nums"
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-tijum-lavender">
                        Matched against selected duration and guest count.
                    </p>
                </div>

                {/* Minimum Rating */}
                <div className="space-y-2.5 py-4">
                    <p className="font-heading text-xs font-semibold tracking-wide text-tijum-plum-muted uppercase">
                        Minimum rating
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            { label: 'Any', value: '' },
                            { label: '3.5+', value: '3.5' },
                            { label: '4.0+', value: '4.0' },
                            { label: '4.5+', value: '4.5' },
                        ].map((r) => {
                            const active = minRating === r.value;
                            return (
                                <button
                                    key={r.label}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() =>
                                        setMinRating(
                                            minRating === r.value
                                                ? ''
                                                : r.value,
                                        )
                                    }
                                    className={`inline-flex cursor-pointer items-center justify-center gap-0.5 rounded-xl border px-2 py-2 font-heading text-xs font-semibold transition-all ${
                                        active
                                            ? 'border-tijum-plum bg-tijum-plum text-tijum-cream shadow-2xs'
                                            : 'border-tijum-surface bg-tijum-cream/40 text-tijum-plum hover:border-tijum-peach hover:bg-tijum-cream'
                                    }`}
                                >
                                    {r.value && (
                                        <Star
                                            className={`size-3 ${
                                                active
                                                    ? 'fill-tijum-peach text-tijum-peach'
                                                    : 'fill-[#FF7A67] text-[#FF7A67]'
                                            }`}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span>{r.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Early Check-in */}
                <div className="py-4">
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-tijum-surface/80 bg-tijum-cream/35 p-3 transition-colors hover:border-tijum-peach">
                        <Checkbox
                            className="mt-0.5"
                            checked={earlyCheckIn}
                            onCheckedChange={(v) => setEarlyCheckIn(v === true)}
                        />
                        <span className="min-w-0 text-xs leading-relaxed text-tijum-plum">
                            <span className="flex items-center gap-1 font-heading font-semibold">
                                <Clock3
                                    className="size-3.5 text-[#E05A47]"
                                    aria-hidden="true"
                                />
                                Early check-in from{' '}
                                {formatStayTime(
                                    timing.earliest_early_check_in_time,
                                )}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-tijum-lavender">
                                Requestable at ₹0 fee, subject to readiness.
                            </span>
                        </span>
                    </label>
                </div>
            </div>

            <div className="border-t border-tijum-surface/80 bg-tijum-cream/35 p-4">
                <Button
                    type="button"
                    size="default"
                    className="w-full"
                    onClick={applyFilters}
                >
                    {activeFilterCount > 0
                        ? `Apply filters (${activeFilterCount})`
                        : 'Apply filters'}
                </Button>
            </div>
        </div>
    );

    const ReferralPerkCard = (
        <div className="rounded-[22px] border border-tijum-peach/70 bg-white p-4 shadow-2xs">
            <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tijum-cream text-[#E05A47]">
                    <Gift className="size-4.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                    <p className="font-heading text-sm font-bold text-tijum-plum">
                        Earn ₹500 stay credits
                    </p>
                    <p className="text-xs leading-relaxed text-tijum-lavender">
                        Invite a friend: they get ₹250 on sign-up and you earn
                        ₹500 after their first stay.
                    </p>
                    <Link
                        href="/rewards/referrals"
                        className="inline-flex items-center gap-1 pt-1 font-heading text-xs font-semibold text-tijum-plum underline decoration-tijum-coral/60 underline-offset-4 transition-colors hover:text-[#D9523F]"
                    >
                        <span>Refer &amp; earn</span>
                        <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <PublicSeoHead
                seo={seo}
                fallbackTitle="Search Accommodation | TIJUM"
                fallbackDescription="Search TIJUM stays with transparent room pricing and exact meal information."
            />

            {/* Clean Light Discovery Header */}
            <section className="relative z-20 border-b border-tijum-surface/85 bg-white pt-5 pb-6 sm:pt-6 sm:pb-7">
                <ResponsiveContainer width="wide" className="space-y-5">
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
                    />

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 space-y-1.5">
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-tijum-plum sm:text-3xl">
                                {hasSearchIntent && cityName
                                    ? `Stays in ${cityName}`
                                    : 'Explore verified stays'}
                            </h1>
                            <p className="text-sm text-tijum-lavender">
                                Compare Hostels/PG, Homestays, and Co-Living
                                with clear room pricing and meal inclusions.
                            </p>
                        </div>

                        {/* Quick Launch City Switcher */}
                        {cities.length > 0 && (
                            <div
                                aria-label="Filter by launch city"
                                className="flex flex-wrap items-center gap-1.5"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleQuickCitySelect(undefined)
                                    }
                                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 font-heading text-xs font-semibold transition-all ${
                                        !city
                                            ? 'border-tijum-plum bg-tijum-plum text-tijum-cream'
                                            : 'border-tijum-surface bg-tijum-cream/55 text-tijum-plum hover:border-tijum-peach hover:bg-tijum-cream'
                                    }`}
                                >
                                    All cities
                                </button>
                                {cities.map((c) => {
                                    const active =
                                        String(c.id) === String(city);
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() =>
                                                handleQuickCitySelect(c.id)
                                            }
                                            className={`cursor-pointer rounded-full border px-3.5 py-1.5 font-heading text-xs font-semibold transition-all ${
                                                active
                                                    ? 'border-tijum-plum bg-tijum-plum text-tijum-cream'
                                                    : 'border-tijum-surface bg-tijum-cream/55 text-tijum-plum hover:border-tijum-peach hover:bg-tijum-cream'
                                            }`}
                                        >
                                            {c.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {errors && Object.keys(errors).length > 0 && (
                        <div
                            role="alert"
                            className="rounded-xl border border-status-error-border bg-status-error-bg px-4 py-3 text-sm font-medium text-status-error-fg"
                        >
                            {Object.values(errors).map((message) => (
                                <p key={message}>{message}</p>
                            ))}
                        </div>
                    )}

                    <SearchPanel
                        compact
                        className="border-tijum-surface/90 bg-tijum-cream/45 shadow-2xs"
                        autoLocate={
                            !skipAutoLocate &&
                            !hasSearchIntent &&
                            !city &&
                            !locality &&
                            !searchLocationLabel
                        }
                        autoSubmitOnLocate={
                            !skipAutoLocate &&
                            !city &&
                            !locality &&
                            !searchLocationLabel
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
                </ResponsiveContainer>
            </section>

            {/* Main Discovery Workspace */}
            <section className="bg-tijum-cream py-8 sm:py-10">
                <ResponsiveContainer width="wide">
                    {!results ? (
                        <Card className="rounded-[24px] border-tijum-surface bg-white shadow-tijum-card">
                            <CardContent className="py-14 text-center">
                                <span className="mx-auto mb-3.5 flex size-12 items-center justify-center rounded-2xl bg-tijum-cream text-[#E05A47]">
                                    <MapPin
                                        className="size-6"
                                        aria-hidden="true"
                                    />
                                </span>
                                <p className="font-heading text-lg font-bold text-tijum-plum">
                                    Start your search
                                </p>
                                <p className="mt-1 text-sm text-tijum-lavender">
                                    Choose a city, check-in date, stay duration,
                                    and guests to browse verified stays.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div
                            className={
                                ENABLE_MAP_VIEW && viewMode === 'map'
                                    ? 'space-y-6'
                                    : 'grid items-start gap-7 lg:grid-cols-[296px_minmax(0,1fr)]'
                            }
                        >
                            {/* Left Sticky Filter Sidebar */}
                            {(viewMode !== 'map' || !ENABLE_MAP_VIEW) && (
                                <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block">
                                    <div className="overflow-hidden rounded-[24px] border border-tijum-surface/90 bg-white shadow-tijum-card">
                                        {renderFilterPanel(false)}
                                    </div>
                                    {ReferralPerkCard}
                                </aside>
                            )}

                            {/* Right Results Column */}
                            <div className="min-w-0 space-y-5">
                                {/* Results Control Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-tijum-surface/85 bg-white px-4 py-3 shadow-2xs sm:px-5">
                                    <div className="flex flex-wrap items-center gap-3">
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
                                                            ? 'h-9 gap-1.5'
                                                            : 'h-9 gap-1.5 lg:hidden'
                                                    }
                                                >
                                                    <SlidersHorizontal
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Filters</span>
                                                    {activeFilterCount > 0 && (
                                                        <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-tijum-coral text-[10px] font-bold text-white">
                                                            {activeFilterCount}
                                                        </span>
                                                    )}
                                                </Button>
                                            </SheetTrigger>
                                            <SheetContent
                                                side="left"
                                                className="tijum-public w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto border-r border-tijum-surface bg-white p-0"
                                            >
                                                <SheetHeader className="sr-only">
                                                    <SheetTitle>
                                                        Filters
                                                    </SheetTitle>
                                                </SheetHeader>
                                                {renderFilterPanel(true)}
                                            </SheetContent>
                                        </Sheet>

                                        <div className="flex min-w-0 items-baseline gap-x-2">
                                            <p className="shrink-0 text-sm text-tijum-plum">
                                                <span className="font-heading text-base font-bold tabular-nums">
                                                    {resultTotal}
                                                </span>{' '}
                                                stay
                                                {resultTotal === 1 ? '' : 's'}
                                            </p>
                                            {(searchLocationLabel ||
                                                cityName) && (
                                                <span
                                                    title={
                                                        searchLocationLabel ||
                                                        cityName
                                                    }
                                                    className="max-w-[210px] truncate text-xs text-tijum-lavender sm:max-w-[290px] xl:max-w-[340px]"
                                                >
                                                    in{' '}
                                                    <strong className="font-semibold text-tijum-plum">
                                                        {searchLocationLabel ||
                                                            cityName}
                                                    </strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Rate Basis Switcher */}
                                        <div
                                            role="group"
                                            aria-label="Rate basis"
                                            className="flex items-center rounded-xl border border-tijum-surface/80 bg-tijum-cream/55 p-0.5"
                                        >
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
                                                    className={`cursor-pointer rounded-lg px-2.5 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                                        activeDuration ===
                                                        d.value
                                                            ? 'bg-tijum-plum text-tijum-cream shadow-2xs'
                                                            : 'text-tijum-lavender hover:text-tijum-plum'
                                                    }`}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* View Mode Toggle */}
                                        <div
                                            role="group"
                                            aria-label="Layout view"
                                            className="flex items-center rounded-xl border border-tijum-surface/80 bg-tijum-cream/55 p-0.5"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewMode('list')
                                                }
                                                aria-label="List view"
                                                aria-pressed={
                                                    viewMode === 'list'
                                                }
                                                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                                    viewMode === 'list'
                                                        ? 'bg-tijum-plum text-tijum-cream shadow-2xs'
                                                        : 'text-tijum-lavender hover:text-tijum-plum'
                                                }`}
                                            >
                                                <LayoutList
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span className="hidden sm:inline">
                                                    List
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setViewMode('grid')
                                                }
                                                aria-label="Grid view"
                                                aria-pressed={
                                                    viewMode === 'grid'
                                                }
                                                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                                    viewMode === 'grid'
                                                        ? 'bg-tijum-plum text-tijum-cream shadow-2xs'
                                                        : 'text-tijum-lavender hover:text-tijum-plum'
                                                }`}
                                            >
                                                <LayoutGrid
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                <span className="hidden sm:inline">
                                                    Grid
                                                </span>
                                            </button>
                                            {ENABLE_MAP_VIEW && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setViewMode('map')
                                                    }
                                                    aria-label="Map view"
                                                    aria-pressed={
                                                        viewMode === 'map'
                                                    }
                                                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-heading text-xs font-semibold transition-colors ${
                                                        viewMode === 'map'
                                                            ? 'bg-tijum-plum text-tijum-cream shadow-2xs'
                                                            : 'text-tijum-lavender hover:text-tijum-plum'
                                                    }`}
                                                >
                                                    <MapIcon
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Map</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Sort Select */}
                                        <div className="flex items-center gap-1.5">
                                            <Label
                                                htmlFor="sort"
                                                className="sr-only"
                                            >
                                                Sort stays
                                            </Label>
                                            <Select
                                                value={sort}
                                                onValueChange={(v) => {
                                                    setSort(v);
                                                    navigateWithPartialReload({
                                                        sort:
                                                            v !== 'relevant'
                                                                ? v
                                                                : undefined,
                                                    });
                                                }}
                                            >
                                                <SelectTrigger
                                                    id="sort"
                                                    className="h-9 w-[178px] rounded-xl border-tijum-surface/90 bg-white text-xs font-semibold text-tijum-plum"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="relevant">
                                                        Sort: Relevant
                                                    </SelectItem>
                                                    <SelectItem value="distance_asc">
                                                        Nearest First
                                                    </SelectItem>
                                                    <SelectItem value="distance_desc">
                                                        Farthest First
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

                                {/* Active Removable Filter Chips */}
                                {activeChips.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        {activeChips.map((chip) => (
                                            <button
                                                key={chip.key}
                                                type="button"
                                                onClick={chip.onRemove}
                                                className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-tijum-surface bg-white px-3 py-1 font-heading text-xs font-semibold text-tijum-plum shadow-2xs transition-colors hover:border-tijum-coral/60 hover:bg-tijum-cream"
                                            >
                                                <span>{chip.label}</span>
                                                <X
                                                    className="size-3.5 text-tijum-lavender transition-colors group-hover:text-[#D9523F]"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        ))}
                                        {activeChips.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="cursor-pointer px-1.5 font-heading text-xs font-semibold text-tijum-lavender underline underline-offset-4 hover:text-tijum-plum"
                                            >
                                                Clear all
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Locality Fallback Notice */}
                                {localityFallback && searchedLocality && (
                                    <div className="flex flex-col justify-between gap-3 rounded-[20px] border border-tijum-peach bg-white px-5 py-4 text-xs text-tijum-plum shadow-2xs sm:flex-row sm:items-center">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tijum-cream text-[#E05A47]">
                                                <MapPin
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </span>
                                            <span className="leading-relaxed">
                                                No stays found directly in{' '}
                                                <strong>
                                                    {searchedLocality}
                                                </strong>
                                                . Showing all{' '}
                                                <strong>{resultTotal}</strong>{' '}
                                                available stays in{' '}
                                                <strong>
                                                    {cityName ||
                                                        'selected city'}
                                                </strong>
                                                .
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={clearLocalityFilter}
                                            className="shrink-0 cursor-pointer self-start font-heading font-semibold text-tijum-plum underline decoration-tijum-coral underline-offset-4 hover:text-[#D9523F] sm:self-auto"
                                        >
                                            Clear area filter
                                        </button>
                                    </div>
                                )}

                                {/* Empty State */}
                                {results && displayedItems.length === 0 && (
                                    <div className="rounded-[24px] border border-tijum-surface bg-white p-8 text-center shadow-tijum-card sm:p-12">
                                        <span className="mx-auto mb-3.5 flex size-12 items-center justify-center rounded-2xl bg-tijum-cream text-[#E05A47]">
                                            <MapPin
                                                className="size-6"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <h3 className="font-heading text-xl font-bold text-tijum-plum sm:text-2xl">
                                            {cityName
                                                ? `No available stays found in ${cityName}`
                                                : 'No stays match these filters'}
                                        </h3>
                                        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-tijum-lavender">
                                            {cityName === 'Guntur'
                                                ? 'We are onboarding verified partner stays in Guntur. Meanwhile, explore verified stays in nearby Vijayawada (35 km away) or browse all launch cities.'
                                                : cityName
                                                  ? `Try clearing a few filters or exploring another launch city while we onboard more stays in ${cityName}.`
                                                  : 'Try adjusting your dates, clearing sharing or price filters, or switching cities.'}
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
                                                            handleQuickCitySelect(
                                                                vijayawadaCity.id,
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
                                                    Clear area ({locality})
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                onClick={clearFilters}
                                            >
                                                Reset all filters
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Results Grid / List / Map */}
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
                                                cityName={
                                                    cityName || 'All Cities'
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                                        {displayedItems.map((item) => (
                                            <PropertyCard
                                                key={item.slug}
                                                layout="vertical"
                                                property={cardPropertyProps(
                                                    item,
                                                )}
                                                href={itemLinkHref(item.slug)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {displayedItems.map((item) => (
                                            <PropertyCard
                                                key={item.slug}
                                                layout="horizontal"
                                                property={cardPropertyProps(
                                                    item,
                                                )}
                                                href={itemLinkHref(item.slug)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Mobile Refer & Earn Card */}
                                {displayedItems.length > 0 && (
                                    <div className="pt-2 lg:hidden">
                                        {ReferralPerkCard}
                                    </div>
                                )}

                                {/* Continuous Infinite Scrolling Sentinel & Status */}
                                <div
                                    ref={sentinelRef}
                                    className="flex flex-col items-center justify-center py-6"
                                >
                                    {isLoadingMore && (
                                        <div className="flex items-center gap-2.5 rounded-full border border-tijum-surface bg-white px-5 py-2.5 text-xs font-semibold text-tijum-plum shadow-tijum-card">
                                            <Loader2
                                                className="size-4 animate-spin text-[#E05A47]"
                                                aria-hidden="true"
                                            />
                                            <span>Loading more stays…</span>
                                        </div>
                                    )}
                                    {!hasMore && displayedItems.length > 0 && (
                                        <p className="text-xs font-medium text-tijum-plum-muted">
                                            Showing all{' '}
                                            {resultTotal ||
                                                displayedItems.length}{' '}
                                            available stay
                                            {(resultTotal ||
                                                displayedItems.length) === 1
                                                ? ''
                                                : 's'}
                                            .
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
