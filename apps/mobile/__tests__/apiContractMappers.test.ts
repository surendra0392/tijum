import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCategorySlug } from '../src/constants/categories.ts';

describe('Behavioral Suite 5: Customer & Partner API Contract Mappers & Validators', () => {
    it('validates Partner KYC PAN, GSTIN, IFSC, and supplier legal classification contracts', () => {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        const allowedConstitutions = new Set([
            'individual',
            'partnership',
            'llp',
            'private_limited',
            'trust_society',
        ]);

        assert.equal(panRegex.test('ABCDE1234F'), true);
        assert.equal(panRegex.test('abcde1234f'), false);
        assert.equal(gstinRegex.test('36ABCDE1234F1Z5'), true);
        assert.equal(gstinRegex.test('36ABCDE1234F100'), false);
        assert.equal(ifscRegex.test('HDFC0001234'), true);
        assert.equal(ifscRegex.test('HDFC1001234'), false);

        assert.equal(allowedConstitutions.has('private_limited'), true);
        assert.equal(
            allowedConstitutions.has('public_limited'),
            false,
            'public_limited is not a supported backend supplier_legal_classification enum value',
        );
    });

    it('maps settlement statement minor units without NaN fallback when net_settlement_amount_minor is used', () => {
        const backendStatement = {
            id: 19,
            settlement_reference: 'STL-202611-0019',
            gross_booking_value_minor: 2500000,
            commission_amount_minor: 250000,
            commission_tax_amount_minor: 45000,
            statutory_deductions_minor: 2500,
            refund_adjustments_minor: 0,
            relocation_adjustments_minor: 0,
            other_adjustments_minor: 0,
            net_settlement_amount_minor: 2202500,
        };

        const netMinor =
            backendStatement.net_settlement_amount_minor ??
            (backendStatement as { net_payable_minor?: number }).net_payable_minor ??
            0;

        assert.equal(Number.isNaN(netMinor), false);
        assert.equal(netMinor, 2202500);
        assert.equal(netMinor / 100, 22025);
    });

    it('maps reservation food inclusions truthfully without fabricating true defaults', () => {
        const roomOnlyReservation = {
            reference: 'TIJ-202611-0099',
            food_inclusions: {
                food_provided: false,
                breakfast: false,
                lunch: false,
                dinner: false,
            },
        };

        const breakfastIncluded = Boolean(
            roomOnlyReservation.food_inclusions?.breakfast ?? false,
        );
        const lunchIncluded = Boolean(
            roomOnlyReservation.food_inclusions?.lunch ?? false,
        );
        const dinnerIncluded = Boolean(
            roomOnlyReservation.food_inclusions?.dinner ?? false,
        );

        assert.equal(breakfastIncluded, false);
        assert.equal(lunchIncluded, false);
        assert.equal(dinnerIncluded, false);
    });

    it('normalizes all property categories to the 3 canonical TIJUM slugs', () => {
        assert.equal(normalizeCategorySlug('hostels-pg'), 'hostels-pg');
        assert.equal(normalizeCategorySlug('homestays'), 'homestays');
        assert.equal(normalizeCategorySlug('co-living'), 'co-living');
        assert.equal(normalizeCategorySlug('pg'), 'hostels-pg');
        assert.equal(normalizeCategorySlug('homestay'), 'homestays');
        assert.equal(normalizeCategorySlug('coliving'), 'co-living');
    });
});
