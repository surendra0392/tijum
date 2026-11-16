import type { PublicPropertyCardData } from '@/components/public/property-card';

const STORAGE_KEY = 'tijum_compare_properties';
const EVENT_NAME = 'tijum-compare-update';
export const MAX_COMPARE = 4;

export type CompareItem = {
    id?: number;
    name: string;
    slug: string;
    category?: string | null;
    city?: string | null;
    locality?: string | null;
    genderEligibility?: string | null;
    imageUrl?: string | null;
    food: {
        food_provided: boolean;
        breakfast_included?: boolean;
        lunch_included?: boolean;
        dinner_included?: boolean;
    };
    amenities?: Array<{ id: number; name: string }>;
    roomTypes?: string[];
    price?: {
        amountMinor: number;
        rateLabel: string;
        currency?: string;
    } | null;
    rating?: number | null;
    reviewCount?: number;
};

export function getCompareItems(): CompareItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function isComparing(slug: string): boolean {
    return getCompareItems().some((item) => item.slug === slug);
}

export function toggleCompare(
    property: PublicPropertyCardData & { id?: number },
): boolean {
    if (typeof window === 'undefined') return false;

    const current = getCompareItems();
    const exists = current.some((item) => item.slug === property.slug);

    let updated: CompareItem[];
    if (exists) {
        updated = current.filter((item) => item.slug !== property.slug);
    } else {
        if (current.length >= MAX_COMPARE) {
            alert(`You can compare up to ${MAX_COMPARE} properties at once.`);
            return false;
        }
        const item: CompareItem = {
            id: property.id,
            name: property.name,
            slug: property.slug,
            category: property.category,
            city: property.city,
            locality: property.locality,
            genderEligibility: property.genderEligibility,
            imageUrl: property.imageUrl,
            food: property.food,
            amenities: (property.amenities || []).map((a) => ({
                id: a.id,
                name: a.name,
            })),
            roomTypes: property.roomTypes,
            price: property.price
                ? {
                      amountMinor: property.price.amountMinor,
                      rateLabel: property.price.rateLabel,
                      currency: property.price.currency,
                  }
                : null,
            rating: property.rating,
            reviewCount: property.reviewCount,
        };
        updated = [...current, item];
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // LocalStorage fallback
    }

    window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
            detail: { items: updated },
        }),
    );

    return !exists;
}

export function removeCompareItem(slug: string): void {
    if (typeof window === 'undefined') return;
    const current = getCompareItems();
    const updated = current.filter((item) => item.slug !== slug);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
        // LocalStorage fallback
    }
    window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
            detail: { items: updated },
        }),
    );
}

export function clearCompare(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // LocalStorage fallback
    }
    window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
            detail: { items: [] },
        }),
    );
}

export function subscribeToCompare(
    callback: (event: CustomEvent<{ items: CompareItem[] }>) => void,
) {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: Event) => callback(e as CustomEvent);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
}
