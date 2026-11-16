import { Colors } from '../theme/colors.ts';

export type CanonicalCategorySlug = 'hostels-pg' | 'homestays' | 'co-living';

export type CanonicalCategoryCode = 'hostel_pg' | 'homestay' | 'coliving';

export interface CanonicalCategory {
    slug: CanonicalCategorySlug;
    name: string;
    code: CanonicalCategoryCode;
    description: string;
    shortDescription: string;
    foodGuaranteeLabel: string;
    badgeVariant: 'primary' | 'emerald' | 'accent' | 'secondary' | 'amber';
    accentColor: string;
    bgLightColor: string;
    iconName: 'Building2' | 'Home' | 'Users';
}

/**
 * The 3 canonical accommodation categories on TIJUM platform.
 * Every accommodation on the platform strictly belongs to one of these three.
 */
export const CANONICAL_CATEGORIES: readonly CanonicalCategory[] = [
    {
        slug: 'hostels-pg',
        name: 'Hostels/PG',
        code: 'hostel_pg',
        description:
            'Explore hostel and paying guest accommodation with room options, amenities and meal arrangements shown for each property.',
        shortDescription: 'Hostel & paying guest accommodation',
        foodGuaranteeLabel: 'Meal arrangements configured per property',
        badgeVariant: 'primary',
        accentColor: Colors.deepPlum,
        bgLightColor: '#FFF4EE',
        iconName: 'Building2',
    },
    {
        slug: 'homestays',
        name: 'Homestays',
        code: 'homestay',
        description:
            'Explore accommodation in residential homes, with property details, room options and available services shown for each property.',
        shortDescription: 'Residential home-stay accommodation',
        foodGuaranteeLabel: 'Meal arrangements configured per property',
        badgeVariant: 'primary',
        accentColor: Colors.deepPlum,
        bgLightColor: '#FFF4EE',
        iconName: 'Home',
    },
    {
        slug: 'co-living',
        name: 'Co-Living',
        code: 'coliving',
        description:
            'Explore shared-living accommodation with room options, property details and available amenities shown for each space.',
        shortDescription: 'Shared-living accommodation',
        foodGuaranteeLabel: 'Meal arrangements configured per property',
        badgeVariant: 'primary',
        accentColor: Colors.deepPlum,
        bgLightColor: '#FFF4EE',
        iconName: 'Users',
    },
] as const;

/**
 * Backward compatibility dictionary mapping historical category identifiers
 * to canonical consolidated slugs.
 */
export const LEGACY_CATEGORY_MAP: Record<string, CanonicalCategorySlug> = {
    // Hostels & PG legacy variants
    'independent-hostel': 'hostels-pg',
    'pg-accommodation': 'hostels-pg',
    hostel: 'hostels-pg',
    hostels: 'hostels-pg',
    pg: 'hostels-pg',
    independent_hostel: 'hostels-pg',
    pg_accommodation: 'hostels-pg',
    'hostels-pg': 'hostels-pg',
    'hostel-pg': 'hostels-pg',

    // Homestays legacy variants
    homestay: 'homestays',
    homestays: 'homestays',
    home_stay: 'homestays',
    'home-stay': 'homestays',

    // Co-Living legacy variants
    'co-living': 'co-living',
    coliving: 'co-living',
    co_living: 'co-living',
    'shared-living': 'co-living',
    'co-live': 'co-living',
};

/**
 * Type guard checking if a slug is a valid canonical category slug.
 */
export function isValidCanonicalCategory(
    slug: unknown,
): slug is CanonicalCategorySlug {
    return (
        typeof slug === 'string' &&
        (slug === 'hostels-pg' || slug === 'homestays' || slug === 'co-living')
    );
}

/**
 * Normalizes any category string (canonical, legacy slug, or human label)
 * to one of the 3 canonical category slugs, or null if unrecognized.
 */
export function normalizeCategorySlug(
    slugOrName: string | null | undefined,
): CanonicalCategorySlug | null {
    if (!slugOrName || typeof slugOrName !== 'string') {
        return null;
    }

    const cleaned = slugOrName.trim().toLowerCase();

    // 1. Direct canonical check
    if (isValidCanonicalCategory(cleaned)) {
        return cleaned;
    }

    // 2. Legacy dictionary lookup
    if (LEGACY_CATEGORY_MAP[cleaned]) {
        return LEGACY_CATEGORY_MAP[cleaned];
    }

    // 3. Normalized slug variations (replacing underscores or spaces with hyphens)
    const normalizedKey = cleaned.replace(/[\s_]+/g, '-');
    if (isValidCanonicalCategory(normalizedKey)) {
        return normalizedKey;
    }
    if (LEGACY_CATEGORY_MAP[normalizedKey]) {
        return LEGACY_CATEGORY_MAP[normalizedKey];
    }

    // 4. Fuzzy / partial match for display names like "Independent Hostel", "Hostel / PG", "PG Stays"
    if (
        cleaned.includes('hostel') ||
        cleaned.includes('pg') ||
        cleaned.includes('paying guest')
    ) {
        return 'hostels-pg';
    }
    if (cleaned.includes('homestay') || cleaned.includes('home stay')) {
        return 'homestays';
    }
    if (
        cleaned.includes('co-living') ||
        cleaned.includes('coliving') ||
        cleaned.includes('co living')
    ) {
        return 'co-living';
    }

    return null;
}

/**
 * Retrieves the full CanonicalCategory record by slug or name.
 */
export function getCanonicalCategory(
    slugOrName: string | null | undefined,
): CanonicalCategory | null {
    const canonicalSlug = normalizeCategorySlug(slugOrName);
    if (!canonicalSlug) {
        return null;
    }
    return (
        CANONICAL_CATEGORIES.find((cat) => cat.slug === canonicalSlug) || null
    );
}

/**
 * Formats a clean, user-facing category name strictly matching the canonical 3.
 */
export function getCategoryDisplayName(
    slugOrName: string | null | undefined,
    fallback = 'Stay',
): string {
    const cat = getCanonicalCategory(slugOrName);
    return cat ? cat.name : fallback;
}

/**
 * Retrieves category-specific food guarantee marketing copy.
 */
export function getCategoryFoodGuarantee(
    slugOrName: string | null | undefined,
): string {
    const cat = getCanonicalCategory(slugOrName);
    return cat
        ? cat.foodGuaranteeLabel
        : 'Compare food and meal arrangements before booking. Meal availability and inclusion vary by property.';
}
