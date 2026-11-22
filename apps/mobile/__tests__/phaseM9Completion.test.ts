import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase M9 Mobile Functional Completion & Architecture Reconciliation', () => {
    describe('Grievance Redressal SLA Compliance', () => {
        it('verifies support screen uses 48-hour acknowledgement and 30-day resolution SLA', () => {
            const supportPath = path.resolve(
                __dirname,
                '../app/(customer)/support/index.tsx',
            );
            const content = fs.readFileSync(supportPath, 'utf8');

            assert.match(
                content,
                /acknowledge your grievance within 48 hours and resolve it within 30 days/i,
                'Support screen must enforce 48h acknowledgement and 30d resolution SLA',
            );
            assert.doesNotMatch(
                content,
                /resolve within 2 hours/i,
                'Legacy 2-hour resolution promise must be removed',
            );
        });
    });

    describe('Referral Reward Copy Qualification', () => {
        it('verifies referrals screen references dynamic points or qualified administrator bonus copy', () => {
            const referralsPath = path.resolve(
                __dirname,
                '../app/(customer)/rewards/referrals.tsx',
            );
            const content = fs.readFileSync(referralsPath, 'utf8');

            assert.match(
                content,
                /referee_reward_points|administrator-configured bonus points/,
                'Must dynamically reference referee reward points or qualify as administrator-configured',
            );
            assert.doesNotMatch(
                content,
                /Give friends 250 points for their first stay\./,
                'Static unconditional 250-point promise must not be hardcoded in hero description',
            );
        });
    });

    describe('Dedicated Customer Wishlist Screen & Navigation', () => {
        it('verifies wishlist screen file exists and queries CustomerApi.getWishlist', () => {
            const wishlistPath = path.resolve(
                __dirname,
                '../app/(customer)/wishlist/index.tsx',
            );
            assert.strictEqual(
                fs.existsSync(wishlistPath),
                true,
                'Wishlist screen must exist',
            );

            const content = fs.readFileSync(wishlistPath, 'utf8');
            assert.match(content, /CustomerApi\.getWishlist/);
            assert.match(content, /CustomerApi\.toggleWishlist/);
            assert.match(content, /Saved Stays/);
        });

        it('verifies route registration in customer layout and link in profile screen', () => {
            const layoutPath = path.resolve(
                __dirname,
                '../app/(customer)/_layout.tsx',
            );
            const layoutContent = fs.readFileSync(layoutPath, 'utf8');
            assert.match(layoutContent, /name="wishlist\/index"/);

            const profilePath = path.resolve(
                __dirname,
                '../app/(customer)/profile/index.tsx',
            );
            const profileContent = fs.readFileSync(profilePath, 'utf8');
            assert.match(profileContent, /\/\(customer\)\/wishlist/);
        });
    });

    describe('Partner Review Management Screen & Navigation', () => {
        it('verifies partner reviews screen exists with 2,500-char limit counter and reply API call', () => {
            const reviewsPath = path.resolve(
                __dirname,
                '../app/(partner)/reviews/index.tsx',
            );
            assert.strictEqual(
                fs.existsSync(reviewsPath),
                true,
                'Partner reviews screen must exist',
            );

            const content = fs.readFileSync(reviewsPath, 'utf8');
            assert.match(content, /OwnerApi\.getReviews/);
            assert.match(content, /OwnerApi\.replyToReview/);
            assert.match(content, /MAX_RESPONSE_LENGTH\s*=\s*2500/);
            assert.match(content, /Cleanliness/);
            assert.match(content, /Food & Dining/);
        });

        it('verifies route registration in partner layout and link on dashboard', () => {
            const layoutPath = path.resolve(
                __dirname,
                '../app/(partner)/_layout.tsx',
            );
            const layoutContent = fs.readFileSync(layoutPath, 'utf8');
            assert.match(layoutContent, /name="reviews\/index"/);

            const dashboardPath = path.resolve(
                __dirname,
                '../app/(partner)/dashboard.tsx',
            );
            const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
            assert.match(
                dashboardContent,
                /\/\(partner\)\/reviews(?:\/index)?/,
            );
        });
    });

    describe('Partner Physical Rooms Inventory Viewer', () => {
        it('verifies properties screen provides physical rooms modal querying OwnerApi.getPropertyRooms', () => {
            const propertiesPath = path.resolve(
                __dirname,
                '../app/(partner)/properties/index.tsx',
            );
            const content = fs.readFileSync(propertiesPath, 'utf8');

            assert.match(content, /OwnerApi\.getPropertyRooms/);
            assert.match(content, /Inspect Physical Rooms/);
            assert.match(content, /Physical Room Inventory/);
        });
    });

    describe('API Client Methods Validation', () => {
        it('verifies CustomerApi exports getWishlist and toggleWishlist', () => {
            const customerPath = path.resolve(
                __dirname,
                '../src/api/customer.ts',
            );
            const content = fs.readFileSync(customerPath, 'utf8');

            assert.match(content, /getWishlist:\s*\(\)\s*=>/);
            assert.match(content, /toggleWishlist:\s*\(/);
        });

        it('verifies OwnerApi exports getReviews and replyToReview', () => {
            const ownerPath = path.resolve(__dirname, '../src/api/owner.ts');
            const content = fs.readFileSync(ownerPath, 'utf8');

            assert.match(content, /getReviews:\s*\(/);
            assert.match(content, /replyToReview:\s*\(/);
            assert.match(content, /getPropertyRooms:\s*\(/);
        });
    });
});
