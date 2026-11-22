import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    CANONICAL_CATEGORIES,
    getCanonicalCategory,
    getCategoryDisplayName,
    getCategoryFoodGuarantee,
    isValidCanonicalCategory,
    normalizeCategorySlug,
} from '../src/constants/categories.ts';

describe('Accommodation Category Consolidation - Mobile Application', () => {
    describe('Canonical Categories Definition & Integrity', () => {
        it('defines strictly 3 canonical categories', () => {
            assert.equal(CANONICAL_CATEGORIES.length, 3);
        });

        it('enforces exact canonical slugs and names', () => {
            const slugs = CANONICAL_CATEGORIES.map((c) => c.slug);
            assert.deepEqual(slugs, ['hostels-pg', 'homestays', 'co-living']);

            const names = CANONICAL_CATEGORIES.map((c) => c.name);
            assert.deepEqual(names, ['Hostels/PG', 'Homestays', 'Co-Living']);

            const codes = CANONICAL_CATEGORIES.map((c) => c.code);
            assert.deepEqual(codes, ['hostel_pg', 'homestay', 'coliving']);
        });

        it('defines distinct icons, accent colors, and food guarantees for each category', () => {
            CANONICAL_CATEGORIES.forEach((cat) => {
                assert.ok(
                    cat.description.length > 10,
                    `${cat.slug} must have a description`,
                );
                assert.ok(
                    cat.foodGuaranteeLabel.length > 10,
                    `${cat.slug} must have a food guarantee`,
                );
                assert.ok(
                    cat.accentColor,
                    `${cat.slug} must define an accentColor`,
                );
                assert.ok(cat.iconName, `${cat.slug} must define an iconName`);
            });

            const iconNames = CANONICAL_CATEGORIES.map((c) => c.iconName);
            assert.deepEqual(iconNames, ['Building2', 'Home', 'Users']);
        });
    });

    describe('Type Guard: isValidCanonicalCategory', () => {
        it('returns true strictly for the 3 canonical slugs', () => {
            assert.equal(isValidCanonicalCategory('hostels-pg'), true);
            assert.equal(isValidCanonicalCategory('homestays'), true);
            assert.equal(isValidCanonicalCategory('co-living'), true);
        });

        it('returns false for legacy or invalid category slugs', () => {
            assert.equal(isValidCanonicalCategory('independent-hostel'), false);
            assert.equal(isValidCanonicalCategory('pg-accommodation'), false);
            assert.equal(isValidCanonicalCategory('homestay'), false);
            assert.equal(isValidCanonicalCategory('coliving'), false);
            assert.equal(isValidCanonicalCategory('hotel'), false);
            assert.equal(isValidCanonicalCategory('resort'), false);
            assert.equal(isValidCanonicalCategory(''), false);
            assert.equal(isValidCanonicalCategory(null), false);
            assert.equal(isValidCanonicalCategory(undefined), false);
            assert.equal(isValidCanonicalCategory(123), false);
        });
    });

    describe('Legacy Category Normalization', () => {
        it('normalizes legacy Hostel & PG slugs to hostels-pg', () => {
            const legacyHostelInputs = [
                'independent-hostel',
                'pg-accommodation',
                'hostel',
                'hostels',
                'pg',
                'independent_hostel',
                'pg_accommodation',
                'hostel-pg',
                'Hostel',
                'PG Accommodation',
                'Independent Hostel',
                'paying guest',
            ];

            legacyHostelInputs.forEach((input) => {
                assert.equal(
                    normalizeCategorySlug(input),
                    'hostels-pg',
                    `Input "${input}" should normalize to "hostels-pg"`,
                );
            });
        });

        it('normalizes legacy Homestay slugs to homestays', () => {
            const legacyHomestayInputs = [
                'homestay',
                'homestays',
                'home_stay',
                'home-stay',
                'Homestay',
                'Homestays',
                'Home Stay',
            ];

            legacyHomestayInputs.forEach((input) => {
                assert.equal(
                    normalizeCategorySlug(input),
                    'homestays',
                    `Input "${input}" should normalize to "homestays"`,
                );
            });
        });

        it('normalizes legacy Co-Living slugs to co-living', () => {
            const legacyCoLivingInputs = [
                'co-living',
                'coliving',
                'co_living',
                'shared-living',
                'co-live',
                'Co-Living',
                'Coliving',
                'Co Living',
            ];

            legacyCoLivingInputs.forEach((input) => {
                assert.equal(
                    normalizeCategorySlug(input),
                    'co-living',
                    `Input "${input}" should normalize to "co-living"`,
                );
            });
        });

        it('safely rejects unknown or invalid inputs', () => {
            const invalidInputs = [
                'hotel',
                'lodge',
                'resort',
                'motel',
                'guest-house',
                '',
                '   ',
                null,
                undefined,
            ];

            invalidInputs.forEach((input) => {
                assert.equal(
                    normalizeCategorySlug(input),
                    null,
                    `Invalid input "${input}" should return null`,
                );
            });
        });
    });

    describe('Category Record & Display Name Helpers', () => {
        it('resolves canonical category records for both canonical and legacy slugs', () => {
            const hostelFromLegacy = getCanonicalCategory('independent-hostel');
            assert.ok(hostelFromLegacy);
            assert.equal(hostelFromLegacy?.slug, 'hostels-pg');
            assert.equal(hostelFromLegacy?.name, 'Hostels/PG');

            const homestayFromCanonical = getCanonicalCategory('homestays');
            assert.ok(homestayFromCanonical);
            assert.equal(homestayFromCanonical?.slug, 'homestays');
            assert.equal(homestayFromCanonical?.name, 'Homestays');

            const colivingFromLegacy = getCanonicalCategory('coliving');
            assert.ok(colivingFromLegacy);
            assert.equal(colivingFromLegacy?.slug, 'co-living');
            assert.equal(colivingFromLegacy?.name, 'Co-Living');

            const invalid = getCanonicalCategory('hotel');
            assert.equal(invalid, null);
        });

        it('formats correct user-facing display names with fallback', () => {
            assert.equal(getCategoryDisplayName('hostels-pg'), 'Hostels/PG');
            assert.equal(
                getCategoryDisplayName('independent-hostel'),
                'Hostels/PG',
            );
            assert.equal(getCategoryDisplayName('homestay'), 'Homestays');
            assert.equal(getCategoryDisplayName('coliving'), 'Co-Living');
            assert.equal(getCategoryDisplayName('unknown-stay'), 'Stay');
            assert.equal(
                getCategoryDisplayName(null, 'Custom Fallback'),
                'Custom Fallback',
            );
        });

        it('returns neutral food arrangement copy by category', () => {
            const hostelGuarantee = getCategoryFoodGuarantee('hostels-pg');
            assert.match(hostelGuarantee, /meal arrangements/i);
            assert.doesNotMatch(
                hostelGuarantee,
                /all meals included|guaranteed/i,
            );

            const homestayGuarantee = getCategoryFoodGuarantee('homestay');
            assert.match(homestayGuarantee, /meal arrangements/i);

            const colivingGuarantee = getCategoryFoodGuarantee('coliving');
            assert.match(colivingGuarantee, /meal arrangements/i);

            const fallback = getCategoryFoodGuarantee('unknown');
            assert.match(fallback, /vary by property/i);
        });
    });

    describe('Property Category Filtering & Aggregation', () => {
        const mockProperties = [
            {
                id: 1,
                name: 'Srinivasa Executive Hostel',
                category: {
                    id: 1,
                    name: 'Independent Hostel',
                    slug: 'independent-hostel',
                },
            },
            {
                id: 2,
                name: 'Lakshmi PG for Women',
                category: {
                    id: 2,
                    name: 'PG Accommodation',
                    slug: 'pg-accommodation',
                },
            },
            {
                id: 3,
                name: 'Araku Valley Heritage Homestay',
                category: { id: 3, name: 'Homestays', slug: 'homestays' },
            },
            {
                id: 4,
                name: 'Hitec City Co-Living Hub',
                category: { id: 4, name: 'Co-Living', slug: 'co-living' },
            },
            {
                id: 5,
                name: 'Kavitha Homestay Guntur',
                category: { id: 5, name: 'Homestay', slug: 'homestay' },
            },
        ];

        it('filters properties accurately into the 3 canonical categories', () => {
            const hostels = mockProperties.filter(
                (p) => normalizeCategorySlug(p.category.slug) === 'hostels-pg',
            );
            assert.equal(hostels.length, 2);
            assert.deepEqual(
                hostels.map((p) => p.id),
                [1, 2],
            );

            const homestays = mockProperties.filter(
                (p) => normalizeCategorySlug(p.category.slug) === 'homestays',
            );
            assert.equal(homestays.length, 2);
            assert.deepEqual(
                homestays.map((p) => p.id),
                [3, 5],
            );

            const coliving = mockProperties.filter(
                (p) => normalizeCategorySlug(p.category.slug) === 'co-living',
            );
            assert.equal(coliving.length, 1);
            assert.deepEqual(
                coliving.map((p) => p.id),
                [4],
            );
        });

        it('correctly aggregates property counts by category for partner tabs', () => {
            const counts: Record<string, number> = {
                all: mockProperties.length,
                'hostels-pg': 0,
                homestays: 0,
                'co-living': 0,
            };

            mockProperties.forEach((p) => {
                const canonical = normalizeCategorySlug(p.category.slug);
                if (canonical && counts[canonical] !== undefined) {
                    counts[canonical] += 1;
                }
            });

            assert.equal(counts.all, 5);
            assert.equal(counts['hostels-pg'], 2);
            assert.equal(counts.homestays, 2);
            assert.equal(counts['co-living'], 1);
        });
    });

    describe('Food & Category Independence Scenarios', () => {
        const propertiesWithVaryingFoodFlags = [
            // 1. Hostels/PG
            {
                id: 101,
                name: 'Madhapur Executive Hostel (All Meals Included)',
                category: { id: 1, name: 'Hostels/PG', slug: 'hostels-pg' },
                food_provided: true,
                breakfast_included: true,
                lunch_included: true,
                dinner_included: true,
            },
            {
                id: 102,
                name: 'Gachibowli Student PG (Room Only / No Food)',
                category: { id: 1, name: 'Hostels/PG', slug: 'hostels-pg' },
                food_provided: false,
                breakfast_included: false,
                lunch_included: false,
                dinner_included: false,
            },
            {
                id: 103,
                name: 'Ameerpet Executive PG (Food Facility Available, No Meals Included)',
                category: { id: 1, name: 'Hostels/PG', slug: 'hostels-pg' },
                food_provided: true,
                breakfast_included: false,
                lunch_included: false,
                dinner_included: false,
            },

            // 2. Homestays
            {
                id: 201,
                name: 'Araku Valley Heritage Homestay (Breakfast & Dinner Included)',
                category: { id: 2, name: 'Homestays', slug: 'homestays' },
                food_provided: true,
                breakfast_included: true,
                lunch_included: false,
                dinner_included: true,
            },
            {
                id: 202,
                name: 'Vizag Beach Cottage Homestay (Self-Catering / No Food)',
                category: { id: 2, name: 'Homestays', slug: 'homestays' },
                food_provided: false,
                breakfast_included: false,
                lunch_included: false,
                dinner_included: false,
            },
            {
                id: 203,
                name: 'Guntur Plantation Homestay (Kitchen Available, No Meals Included)',
                category: { id: 2, name: 'Homestays', slug: 'homestays' },
                food_provided: true,
                breakfast_included: false,
                lunch_included: false,
                dinner_included: false,
            },

            // 3. Co-Living
            {
                id: 301,
                name: 'Financial District Co-Living Suites (Breakfast Only Included)',
                category: { id: 3, name: 'Co-Living', slug: 'co-living' },
                food_provided: true,
                breakfast_included: true,
                lunch_included: false,
                dinner_included: false,
            },
            {
                id: 302,
                name: 'Jubilee Hills Co-Living (Room Only / No Food)',
                category: { id: 3, name: 'Co-Living', slug: 'co-living' },
                food_provided: false,
                breakfast_included: false,
                lunch_included: false,
                dinner_included: false,
            },
            {
                id: 303,
                name: 'Hitec City Modern Co-Living (Community Kitchen, No Meals Included)',
                category: { id: 3, name: 'Co-Living', slug: 'co-living' },
                food_provided: true,
                breakfast_included: false,
                lunch_included: false,
                dinner_included: false,
            },
        ];

        it('verifies the 9-case orthogonal matrix across all 3 categories and food configurations', () => {
            ['hostels-pg', 'homestays', 'co-living'].forEach((categorySlug) => {
                const categoryProperties =
                    propertiesWithVaryingFoodFlags.filter(
                        (p) => p.category.slug === categorySlug,
                    );
                assert.equal(
                    categoryProperties.length,
                    3,
                    `Category ${categorySlug} must have exactly 3 test scenarios in 9-case matrix`,
                );

                // Scenario A: Food provided with meals included
                const mealsIncluded = categoryProperties.filter(
                    (p) =>
                        p.food_provided &&
                        (p.breakfast_included ||
                            p.lunch_included ||
                            p.dinner_included),
                );
                assert.equal(
                    mealsIncluded.length,
                    1,
                    `${categorySlug} must have a meals-included property`,
                );

                // Scenario B: Food provided but NO meals included in room rate
                const foodAvailableNoMeals = categoryProperties.filter(
                    (p) =>
                        p.food_provided &&
                        !p.breakfast_included &&
                        !p.lunch_included &&
                        !p.dinner_included,
                );
                assert.equal(
                    foodAvailableNoMeals.length,
                    1,
                    `${categorySlug} must have a food-available-no-meals-included property`,
                );

                // Scenario C: Room only / no food provided
                const roomOnly = categoryProperties.filter(
                    (p) => !p.food_provided,
                );
                assert.equal(
                    roomOnly.length,
                    1,
                    `${categorySlug} must have a room-only property`,
                );
            });
        });

        it('filters independently by meal flags without altering category classification', () => {
            // Filter Hostels/PG that provide dinner
            const hostelsWithDinner = propertiesWithVaryingFoodFlags.filter(
                (p) => p.category.slug === 'hostels-pg' && p.dinner_included,
            );
            assert.equal(hostelsWithDinner.length, 1);
            assert.equal(hostelsWithDinner[0].id, 101);

            // Filter Homestays that are self-catering / no food
            const selfCateringHomestays = propertiesWithVaryingFoodFlags.filter(
                (p) => p.category.slug === 'homestays' && !p.food_provided,
            );
            assert.equal(selfCateringHomestays.length, 1);
            assert.equal(selfCateringHomestays[0].id, 202);

            // Filter all properties offering breakfast regardless of category
            const breakfastAcrossAllCategories =
                propertiesWithVaryingFoodFlags.filter(
                    (p) => p.breakfast_included,
                );
            assert.equal(breakfastAcrossAllCategories.length, 3);
            assert.deepEqual(
                breakfastAcrossAllCategories.map((p) => p.category.slug).sort(),
                ['co-living', 'homestays', 'hostels-pg'],
            );

            // Filter properties where food facility is available but NO meals are included in room rate
            const foodAvailableNoMealsProperties =
                propertiesWithVaryingFoodFlags.filter(
                    (p) =>
                        p.food_provided &&
                        !p.breakfast_included &&
                        !p.lunch_included &&
                        !p.dinner_included,
                );
            assert.equal(foodAvailableNoMealsProperties.length, 3);
            assert.deepEqual(
                foodAvailableNoMealsProperties.map((p) => p.id),
                [103, 203, 303],
            );
        });
    });
});
