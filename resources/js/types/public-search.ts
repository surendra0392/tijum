import type { SeoMetadata } from '@/types/seo';

export type SearchCity = {
    id: number;
    name: string;
    slug: string;
    state?: string | null;
};

export type SearchLocationOption = {
    id: string;
    name: string;
    type: 'city' | 'locality' | 'landmark';
    secondary_text: string;
    city: string;
    locality: string | null;
    lat: number | null;
    lng: number | null;
};

export type SearchCategory = {
    id: number;
    name: string;
    slug: string;
    code?: string;
};

export const CANONICAL_ACCOMMODATION_CATEGORIES = [
    {
        slug: 'hostels-pg',
        code: 'hostel_pg',
        name: 'Hostels/PG',
        accentColor: '#442F41',
        icon: 'Building2',
        description:
            'Explore hostel and paying guest accommodation with room options, amenities and meal arrangements shown for each property.',
    },
    {
        slug: 'homestays',
        code: 'homestay',
        name: 'Homestays',
        accentColor: '#442F41',
        icon: 'Home',
        description:
            'Explore accommodation in residential homes, with property details, room options and available services shown for each property.',
    },
    {
        slug: 'co-living',
        code: 'coliving',
        name: 'Co-Living',
        accentColor: '#442F41',
        icon: 'Users',
        description:
            'Explore shared-living accommodation with room options, property details and available amenities shown for each space.',
    },
] as const;

export type CanonicalCategorySlug =
    (typeof CANONICAL_ACCOMMODATION_CATEGORIES)[number]['slug'];
export type CanonicalCategoryCode =
    (typeof CANONICAL_ACCOMMODATION_CATEGORIES)[number]['code'];
export type CanonicalCategoryName =
    (typeof CANONICAL_ACCOMMODATION_CATEGORIES)[number]['name'];
export type SearchAmenity = {
    id: number;
    name: string;
    code: string;
    icon_key?: string | null;
    scope: 'property' | 'room_type' | 'both';
    scope_label: string;
};

export type PublicAmenityItem = {
    id: number;
    name: string;
    code: string;
    icon_key?: string | null;
};

export type StayTimingData = {
    standard_check_in_time: string;
    standard_check_out_time: string;
    earliest_early_check_in_time: string;
    timezone: string;
};

export type SearchFiltersState = {
    city: number | string;
    locality?: string | null;
    lat?: number | null;
    lng?: number | null;
    check_in: string;
    duration_type: 'daily' | 'weekly' | 'monthly';
    duration_count: number | string;
    guests: number | string;
    category: number[];
    gender_preference: 'male' | 'female' | 'both' | 'all' | 'any';
    sharing_capacity: number[];
    ac: string[];
    food_meals: string[];
    amenities: number[];
    min_price?: number | string | null;
    max_price?: number | string | null;
    min_rating?: number | string | null;
    early_check_in: boolean;
    sort:
        | 'relevant'
        | 'price_asc'
        | 'price_desc'
        | 'recent'
        | 'highest_rated'
        | 'distance_asc'
        | 'distance_desc';
    page?: number | string;
};

export type SearchCardRoomSummary = {
    id: number;
    name: string;
    sharing_label: string;
    is_air_conditioned: boolean;
    pricing_basis: string;
    pricing_basis_label: string;
    price_label: string;
    available_quantity: number;
    quantity_basis_label: string;
    room_type_amenities: PublicAmenityItem[];
};

export type SearchResultCard = {
    id?: number;
    slug: string;
    name: string;
    category: { name?: string | null; slug?: string | null };
    city: { name?: string | null; slug?: string | null };
    locality: string;
    latitude?: number | null;
    longitude?: number | null;
    gender_eligibility: string;
    cover_image: {
        url?: string | null;
        thumbnail_url?: string | null;
        alt_text?: string | null;
    } | null;
    property_amenities: PublicAmenityItem[];
    property_amenities_more_count: number;
    food: {
        food_provided: boolean;
        breakfast_included: boolean;
        lunch_included: boolean;
        dinner_included: boolean;
    };
    timing: { check_in: string; check_out: string };
    price: {
        amount_minor: number;
        total_minor: number;
        currency: string;
        duration_type: string;
        duration_count: number;
        pricing_basis: string;
        pricing_basis_label: string;
        is_estimate: boolean;
        label: string;
    };
    room_summaries: SearchCardRoomSummary[];
    has_early_check_in: boolean;
    average_rating?: number | null;
    review_count?: number;
    distance_km?: number | null;
    distance_label?: string | null;
    is_locality_match?: boolean;
};

export type SearchResultsPayload = {
    data: SearchResultCard[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    links: { url: string | null; label: string; active: boolean }[];
};

export type SearchPageProps = {
    filters: SearchFiltersState;
    hasSearchIntent: boolean;
    results: SearchResultsPayload | null;
    resultTotal: number;
    localityFallback?: boolean;
    searchedLocality?: string | null;
    locationLabel: string | null;
    checkoutDate: string | null;
    cities: SearchCity[];
    locations: SearchLocationOption[];
    categories: SearchCategory[];
    amenities: SearchAmenity[];
    timing: StayTimingData;
    durations: Record<string, { days: number; label?: string }>;
    seo: SeoMetadata;
    errors?: Record<string, string>;
};

export type PropertyDetailRoomType = {
    id: number;
    name: string;
    accommodation_mode: string;
    accommodation_mode_label: string;
    sharing_label: string;
    sharing_capacity?: number | null;
    max_guests_per_room: number;
    is_air_conditioned: boolean;
    gender_policy: string;
    gender_policy_label: string;
    pricing_basis: string;
    pricing_basis_label: string;
    early_check_in_enabled: boolean;
    daily_rate_minor: number | null;
    weekly_rate_minor: number | null;
    monthly_rate_minor: number | null;
    matches_search: boolean;
    eligible_room_count?: number | null;
    available_quantity: number;
    amenities: PublicAmenityItem[];
};

export type PropertyDetailPayload = {
    id?: number;
    slug: string;
    name: string;
    description?: string | null;
    category: { name?: string | null; slug?: string | null };
    city: { name?: string | null; slug?: string | null; state?: string | null };
    locality: string;
    address_line_1?: string | null;
    landmark?: string | null;
    gender_eligibility: string;
    food: {
        food_provided: boolean;
        breakfast_included: boolean;
        lunch_included: boolean;
        dinner_included: boolean;
        label?: string;
    };
    timing: {
        check_in: string;
        check_out: string;
        earliest_early_check_in_time: string;
    };
    property_amenities: PublicAmenityItem[];
    gallery: {
        url?: string | null;
        thumbnail_url?: string | null;
        alt_text?: string | null;
        is_cover: boolean;
        scope: string;
        room_type_name?: string | null;
    }[];
    room_types: PropertyDetailRoomType[];
    search_context: {
        check_in: string;
        check_out: string;
        duration_type: string;
        duration_count: number;
        guests: number;
    };
    durations: Record<string, { days: number; label?: string }>;
    rating_summary?: import('./reviews').PropertyRatingSummaryData | null;
    published_reviews?: import('./reviews').PublicReviewItem[];
};

export type PropertyDetailPageProps = {
    property: PropertyDetailPayload;
    seo: SeoMetadata;
};
