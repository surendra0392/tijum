import { ApiClient } from './client';
import {
    ApiResponse,
    CanonicalCategory,
    CanonicalCategorySlug,
    City,
    GuestContactValidationResult,
    LocationPrediction,
    PropertyCard,
    PropertyDetail,
    ReverseGeocodeResult,
    StayQuoteResponse,
} from './types';

export const PublicApi = {
    getConfig: () => ApiClient.get<ApiResponse<any>>('public/config'),

    getCategories: () =>
        ApiClient.get<ApiResponse<CanonicalCategory[]>>('public/categories'),

    getCities: () => ApiClient.get<ApiResponse<City[]>>('public/cities'),

    getCity: (slug: string) =>
        ApiClient.get<
            ApiResponse<{ city: City; featured_properties: PropertyCard[] }>
        >(`public/cities/${slug}`),

    getProperties: (filters: {
        city?: string | number;
        locality?: string;
        lat?: number;
        lng?: number;
        category?: CanonicalCategorySlug | string;
        breakfast?: boolean;
        lunch?: boolean;
        dinner?: boolean;
        food_meals?: string | string[];
        ac?: boolean | string | string[];
        gender?: string;
        gender_preference?: string;
        sharing_capacity?: number | string | number[];
        amenities?: string | number[];
        early_check_in?: boolean;
        min_price?: number;
        max_price?: number;
        min_rating?: number;
        sort?:
            | 'relevant'
            | 'distance_asc'
            | 'distance_desc'
            | 'price_asc'
            | 'price_desc'
            | 'highest_rated'
            | 'recent';
        page?: number;
        per_page?: number;
    }) =>
        ApiClient.get<ApiResponse<PropertyCard[]>>(
            'public/properties',
            filters,
        ),

    getPropertyDetail: (slug: string) =>
        ApiClient.get<ApiResponse<PropertyDetail>>(`public/properties/${slug}`),

    getProperty: (slug: string) =>
        ApiClient.get<ApiResponse<PropertyDetail>>(`public/properties/${slug}`),

    getPropertyReviews: (slug: string, page: number = 1) =>
        ApiClient.get<ApiResponse<any[]>>(`public/properties/${slug}/reviews`, {
            page,
        }),

    quoteStay: (
        propertyId: number,
        data: {
            property_room_type_id: number;
            check_in_date: string;
            duration_type: 'daily' | 'weekly' | 'monthly' | string;
            duration_quantity: number;
            quantity: number;
            guest_count?: number;
            early_check_in_requested?: boolean;
            requested_arrival_time?: string;
        },
    ) =>
        ApiClient.post<ApiResponse<StayQuoteResponse>>(
            `public/properties/${propertyId}/quote`,
            data,
        ),

    reverseGeocode: (lat: number, lng: number) =>
        ApiClient.get<ApiResponse<ReverseGeocodeResult>>(
            'public/geocode/reverse',
            { lat, lng },
        ),

    autocompleteLocations: (
        q: string,
        limit: number = 8,
        lat?: number,
        lng?: number,
    ) =>
        ApiClient.get<ApiResponse<LocationPrediction[]>>(
            'public/locations/autocomplete',
            { q, limit, lat, lng },
        ),

    validateGuestContact: (payload: {
        field?: 'name' | 'phone' | 'email';
        name?: string;
        phone?: string;
        email?: string;
    }) =>
        ApiClient.post<ApiResponse<GuestContactValidationResult>>(
            'public/validate-contact',
            payload,
        ),

    getPage: (slug: string) =>
        ApiClient.get<ApiResponse<any>>(`public/pages/${slug}`),

    getFaqs: () => ApiClient.get<ApiResponse<any[]>>('public/faqs'),

    getBanners: () => ApiClient.get<ApiResponse<any[]>>('public/banners'),

    submitContact: (payload: {
        name: string;
        email: string;
        mobile: string;
        subject: 'booking' | 'partner' | 'general' | string;
        message: string;
    }) => ApiClient.post<ApiResponse<any>>('public/contact', payload),

    forgotPassword: (
        email: string,
        userType: 'customer' | 'owner' = 'customer',
    ) =>
        ApiClient.post<ApiResponse<any>>(`auth/${userType}/forgot-password`, {
            email,
        }),
};
