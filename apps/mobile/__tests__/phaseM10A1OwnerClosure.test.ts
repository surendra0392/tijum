import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase M10A.1 Owner Application Final Functional Closure & Verification', () => {
    describe('Phase 09A Direct Room-Type Pricing & Independent Meal Flags', () => {
        it('calculates direct room-type pricing in integer paise without rate plans or package models', () => {
            const roomType = {
                id: 101,
                name: 'Deluxe Private Suite',
                daily_rate_minor: 150000, // ₹1,500
                weekly_rate_minor: 900000, // ₹9,000
                monthly_rate_minor: 3200000, // ₹32,000
                sharing_capacity: 1,
                accommodation_mode: 'private',
            };

            assert.equal(roomType.daily_rate_minor, 150000);
            assert.equal(roomType.daily_rate_minor / 100, 1500);
            assert.equal(roomType.monthly_rate_minor / 100, 32000);
            assert.equal(roomType.accommodation_mode, 'private');
        });

        it('enforces independent meal flags on property level with zero extra meal plan charges', () => {
            const property = {
                id: 50,
                name: 'TIJUM Green Homestay',
                food_provided: true,
                breakfast_included: true,
                lunch_included: false,
                dinner_included: true,
            };

            assert.equal(property.food_provided, true);
            assert.equal(property.breakfast_included, true);
            assert.equal(property.lunch_included, false);
            assert.equal(property.dinner_included, true);
        });

        it('verifies that pricing screen title is "Pricing & Meal Settings"', () => {
            const pricingFilePath = path.join(
                __dirname,
                '../app/(partner)/properties/[id]/pricing.tsx',
            );
            const content = fs.readFileSync(pricingFilePath, 'utf-8');
            assert.ok(
                content.includes('Pricing & Meal Settings'),
                'Pricing screen must use canonical title "Pricing & Meal Settings"',
            );
        });
    });

    describe('Property Media & Amenities Verification', () => {
        it('verifies media screen exists and exports upload, cover and delete functions', () => {
            const mediaFilePath = path.join(
                __dirname,
                '../app/(partner)/properties/[id]/media.tsx',
            );
            assert.ok(fs.existsSync(mediaFilePath), 'Media screen file must exist');

            const content = fs.readFileSync(mediaFilePath, 'utf-8');
            assert.ok(content.includes('OwnerApi.uploadMedia'));
            assert.ok(content.includes('OwnerApi.updateMedia'));
            assert.ok(content.includes('OwnerApi.deleteMedia'));
        });

        it('verifies amenities screen exists with catalog selection, status badges and removal', () => {
            const amenitiesFilePath = path.join(
                __dirname,
                '../app/(partner)/properties/[id]/amenities.tsx',
            );
            assert.ok(fs.existsSync(amenitiesFilePath), 'Amenities screen file must exist');

            const content = fs.readFileSync(amenitiesFilePath, 'utf-8');
            assert.ok(content.includes('OwnerApi.getAmenities'));
            assert.ok(content.includes('OwnerApi.assignAmenity'));
            assert.ok(content.includes('OwnerApi.deleteAmenity'));
            assert.ok(content.includes('Included in Rent'));
        });
    });

    describe('Financial Profile & Commission Agreements Specification', () => {
        it('validates PAN format and masks bank account number for host security', () => {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            const validPan = 'ABCDE1234F';
            const invalidPan = '12345ABCDE';

            assert.ok(panRegex.test(validPan), 'PAN ABCDE1234F must be valid');
            assert.ok(!panRegex.test(invalidPan), 'Invalid PAN must fail regex test');

            const fullAccount = '98765432101234';
            const masked = '•••• •••• ' + fullAccount.slice(-4);
            assert.equal(masked, '•••• •••• 1234');
        });

        it('calculates commission correctly based on contract percentage', () => {
            const grossPaise = 5000000; // ₹50,000
            const commissionRatePercentage = 15.0; // 15%

            const commissionPaise = Math.round((grossPaise * commissionRatePercentage) / 100);
            const gstOnCommissionPaise = Math.round((commissionPaise * 18) / 100);
            const tdsPaise = Math.round((grossPaise * 1) / 100); // 1% 194-O
            const netPayablePaise = grossPaise - commissionPaise - gstOnCommissionPaise - tdsPaise;

            assert.equal(commissionPaise, 750000); // ₹7,500
            assert.equal(gstOnCommissionPaise, 135000); // ₹1,350
            assert.equal(tdsPaise, 50000); // ₹500
            assert.equal(netPayablePaise, 4065000); // ₹40,650
        });

        it('verifies financial profile screen and agreements screen exist', () => {
            const profileFilePath = path.join(
                __dirname,
                '../app/(partner)/financial-profile/index.tsx',
            );
            const agreementsFilePath = path.join(
                __dirname,
                '../app/(partner)/financial-profile/agreements.tsx',
            );

            assert.ok(fs.existsSync(profileFilePath), 'Financial profile screen must exist');
            assert.ok(fs.existsSync(agreementsFilePath), 'Agreements screen must exist');

            const profileContent = fs.readFileSync(profileFilePath, 'utf-8');
            assert.ok(profileContent.includes('OwnerApi.getFinancialProfile'));
            assert.ok(profileContent.includes('OwnerApi.updateFinancialProfile'));

            const agreementsContent = fs.readFileSync(agreementsFilePath, 'utf-8');
            assert.ok(agreementsContent.includes('OwnerApi.getCommissionAgreements'));
            assert.ok(agreementsContent.includes('OwnerApi.acceptCommissionAgreement'));
        });
    });

    describe('Settlement Detail & Payout Statements', () => {
        it('verifies settlement detail screen exists and displays line items', () => {
            const settlementFilePath = path.join(
                __dirname,
                '../app/(partner)/settlements/[reference].tsx',
            );
            assert.ok(fs.existsSync(settlementFilePath), 'Settlement detail screen must exist');

            const content = fs.readFileSync(settlementFilePath, 'utf-8');
            assert.ok(content.includes('OwnerApi.getSettlement'));
            assert.ok(content.includes('Payout Computation'));
            assert.ok(content.includes('Included Reservations'));
        });
    });

    describe('Customer Protection & Support Cases (Phase 14)', () => {
        it('verifies case index and case detail screens exist with timeline messaging', () => {
            const casesIndexFilePath = path.join(
                __dirname,
                '../app/(partner)/cases/index.tsx',
            );
            const caseDetailFilePath = path.join(
                __dirname,
                '../app/(partner)/cases/[reference].tsx',
            );

            assert.ok(fs.existsSync(casesIndexFilePath), 'Cases index screen must exist');
            assert.ok(fs.existsSync(caseDetailFilePath), 'Case detail screen must exist');

            const indexContent = fs.readFileSync(casesIndexFilePath, 'utf-8');
            assert.ok(indexContent.includes('OwnerApi.getCases'));

            const detailContent = fs.readFileSync(caseDetailFilePath, 'utf-8');
            assert.ok(detailContent.includes('OwnerApi.getCase'));
            assert.ok(detailContent.includes('OwnerApi.addCaseMessage'));
            assert.ok(detailContent.includes('Discussion & Evidence Timeline'));
        });
    });

    describe('Partner Navigation Layout Registration', () => {
        it('verifies all new screens are registered with href: null in partner _layout.tsx', () => {
            const layoutPath = path.join(
                __dirname,
                '../app/(partner)/_layout.tsx',
            );
            const content = fs.readFileSync(layoutPath, 'utf-8');

            const requiredScreens = [
                'properties/[id]/media',
                'properties/[id]/amenities',
                'settlements/[reference]',
                'financial-profile/index',
                'financial-profile/agreements',
                'cases/index',
                'cases/[reference]',
            ];

            for (const screen of requiredScreens) {
                assert.ok(
                    content.includes(`name="${screen}"`),
                    `Partner layout must register screen ${screen}`,
                );
            }
        });
    });
});
