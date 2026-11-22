import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    CANONICAL_CATEGORIES,
    isValidCanonicalCategory,
    normalizeCategorySlug,
} from '../src/constants/categories.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOBILE_ROOT = path.resolve(__dirname, '..');

describe('Phase M10A: Complete Property Owner / Partner Mobile Application Specification', () => {
    describe('1. Owner Operational Screen Files Integrity', () => {
        const expectedScreens = [
            'app/(partner)/properties/index.tsx',
            'app/(partner)/properties/create.tsx',
            'app/(partner)/properties/[id]/edit.tsx',
            'app/(partner)/properties/[id]/room-types.tsx',
            'app/(partner)/properties/[id]/rooms.tsx',
            'app/(partner)/properties/[id]/pricing.tsx',
            'app/(partner)/properties/[id]/availability.tsx',
            'app/(partner)/reservations/index.tsx',
            'app/(partner)/reservations/[reference].tsx',
            'app/(partner)/settlements/index.tsx',
            'app/(partner)/reviews/index.tsx',
            'app/(partner)/dashboard.tsx',
            'app/(partner)/account.tsx',
        ];

        for (const screenPath of expectedScreens) {
            it(`verifies existence of ${screenPath}`, () => {
                const fullPath = path.join(MOBILE_ROOT, screenPath);
                assert.ok(
                    fs.existsSync(fullPath),
                    `Missing expected owner screen: ${screenPath}`,
                );
            });
        }
    });

    describe('2. OwnerApi Complete Endpoint Contract Verification', () => {
        const ownerApiPath = path.join(MOBILE_ROOT, 'src/api/owner.ts');
        const ownerApiContent = fs.readFileSync(ownerApiPath, 'utf8');

        it('exports all M10A property management API methods', () => {
            assert.match(ownerApiContent, /\bgetProperties:\s*\(/);
            assert.match(ownerApiContent, /\bgetProperty:\s*\(/);
            assert.match(ownerApiContent, /\bcreateProperty:\s*\(/);
            assert.match(ownerApiContent, /\bupdateProperty:\s*\(/);
            assert.match(ownerApiContent, /\bsubmitVerification:\s*\(/);
            assert.match(ownerApiContent, /\bgetVerificationStatus:\s*\(/);
            assert.match(ownerApiContent, /\bgetReferenceData:\s*\(/);
        });

        it('exports all M10A room type management API methods', () => {
            assert.match(ownerApiContent, /\bgetRoomTypes:\s*\(/);
            assert.match(ownerApiContent, /\bcreateRoomType:\s*\(/);
            assert.match(ownerApiContent, /\bupdateRoomType:\s*\(/);
            assert.match(ownerApiContent, /\bdeleteRoomType:\s*\(/);
        });

        it('exports all M10A physical room inventory API methods', () => {
            assert.match(ownerApiContent, /\bgetPropertyRooms:\s*\(/);
            assert.match(ownerApiContent, /\bcreateRoom:\s*\(/);
            assert.match(ownerApiContent, /\bupdateRoom:\s*\(/);
            assert.match(ownerApiContent, /\bupdateRoomStatus:\s*\(/);
        });

        it('exports all M10A pricing and availability API methods', () => {
            assert.match(ownerApiContent, /\bgetPricing:\s*\(/);
            assert.match(ownerApiContent, /\bupdatePricing:\s*\(/);
            assert.match(ownerApiContent, /\bgetAvailabilityBlocks:\s*\(/);
            assert.match(ownerApiContent, /\bcreateAvailabilityBlock:\s*\(/);
            assert.match(ownerApiContent, /\bcancelAvailabilityBlock:\s*\(/);
        });

        it('exports all M10A front-desk and operations API methods', () => {
            assert.match(ownerApiContent, /\bgetReservations:\s*\(/);
            assert.match(ownerApiContent, /\bgetReservation:\s*\(/);
            assert.match(ownerApiContent, /\ballocateRoom:\s*\(/);
            assert.match(ownerApiContent, /\bcheckInReservation:\s*\(/);
            assert.match(ownerApiContent, /\bcheckOutReservation:\s*\(/);
            assert.match(ownerApiContent, /\bgetReviews:\s*\(/);
            assert.match(ownerApiContent, /\breplyToReview:\s*\(/);
            assert.match(ownerApiContent, /\bgetSettlements:\s*\(/);
            assert.match(ownerApiContent, /\bgetFinancialSummary:\s*\(/);
        });
    });

    describe('3. Canonical Category Enforcement (Non-Negotiable Business Architecture)', () => {
        it('strictly maintains only 3 canonical accommodation categories', () => {
            assert.strictEqual(CANONICAL_CATEGORIES.length, 3);
            const slugs = CANONICAL_CATEGORIES.map((c) => c.slug);
            assert.deepStrictEqual(slugs, ['hostels-pg', 'homestays', 'co-living']);
        });

        it('validates canonical category slugs with type guards', () => {
            assert.ok(isValidCanonicalCategory('hostels-pg'));
            assert.ok(isValidCanonicalCategory('homestays'));
            assert.ok(isValidCanonicalCategory('co-living'));
            assert.ok(!isValidCanonicalCategory('hotels'));
            assert.ok(!isValidCanonicalCategory('guest_houses'));
            assert.ok(!isValidCanonicalCategory('resorts'));
        });

        it('correctly maps legacy category names to canonical slugs', () => {
            assert.strictEqual(normalizeCategorySlug('independent-hostel'), 'hostels-pg');
            assert.strictEqual(normalizeCategorySlug('pg-accommodation'), 'hostels-pg');
            assert.strictEqual(normalizeCategorySlug('home_stay'), 'homestays');
            assert.strictEqual(normalizeCategorySlug('coliving'), 'co-living');
        });
    });

    describe('4. Inventory Hierarchy & Anti-Bed Architecture Verification', () => {
        it('verifies room types use sharing capacity and mode rather than beds', () => {
            const createScreen = fs.readFileSync(
                path.join(MOBILE_ROOT, 'app/(partner)/properties/[id]/room-types.tsx'),
                'utf8',
            );
            assert.ok(createScreen.includes('accommodation_mode'));
            assert.ok(createScreen.includes('sharing_capacity'));
            assert.ok(!createScreen.includes('property_beds'));
            assert.ok(!createScreen.includes('bed_number'));
        });

        it('verifies physical rooms represent discrete room numbers', () => {
            const roomsScreen = fs.readFileSync(
                path.join(MOBILE_ROOT, 'app/(partner)/properties/[id]/rooms.tsx'),
                'utf8',
            );
            assert.ok(roomsScreen.includes('room_number'));
            assert.ok(roomsScreen.includes('property_room_type_id'));
            assert.ok(!roomsScreen.includes('bed_id'));
        });
    });

    describe('5. Pricing and Currency Minor Unit Integrity', () => {
        it('verifies pricing submission converts rupees to integer paise', () => {
            const pricingScreen = fs.readFileSync(
                path.join(MOBILE_ROOT, 'app/(partner)/properties/[id]/pricing.tsx'),
                'utf8',
            );
            assert.ok(pricingScreen.includes('daily_rate_minor'));
            assert.ok(pricingScreen.includes('weekly_rate_minor'));
            assert.ok(pricingScreen.includes('monthly_rate_minor'));
            assert.ok(pricingScreen.includes('* 100'));
            assert.ok(pricingScreen.includes('/ 100'));
        });
    });
});
