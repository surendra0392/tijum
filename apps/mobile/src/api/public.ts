import { ApiClient } from './client';
import {
    ApiResponse,
    CanonicalCategory,
    CanonicalCategorySlug,
    City,
    PropertyCard,
    PropertyDetail,
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
        city?: string;
        locality?: string;
        category?: CanonicalCategorySlug | string;
        breakfast?: boolean;
        lunch?: boolean;
        dinner?: boolean;
        ac?: boolean;
        gender?: string;
        gender_preference?: string;
        min_price?: number;
        max_price?: number;
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

    getPage: (slug: string) =>
        ApiClient.get<ApiResponse<any>>(`public/pages/${slug}`),

    getFaqs: () => ApiClient.get<ApiResponse<any[]>>('public/faqs'),

    getBanners: () => ApiClient.get<ApiResponse<any[]>>('public/banners'),
};
