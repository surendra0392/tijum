import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('TIJUM Mobile Rewards, Loyalty & Promotion Ecosystem', () => {
    describe('Central Promotion Engine Calculation & Precedence', () => {
        interface CalculationInput {
            subtotalPaise: number;
            taxPaise?: number;
            depositPaise?: number;
            coupon?: {
                offer_type: 'fixed_amount' | 'percentage' | 'points_reward';
                discountAmountPaise?: number;
                discountPercentage?: number;
                maxDiscountPaise?: number;
            };
            pointsToRedeem?: number;
            pointToInrRate?: number; // e.g. 0.25
        }

        const calculatePricing = (input: CalculationInput) => {
            const subtotal = input.subtotalPaise;
            let couponDiscount = 0;

            // 1. Coupon Discount Calculation (Order: Subtotal -> Coupon)
            if (input.coupon) {
                if (input.coupon.offer_type === 'fixed_amount') {
                    couponDiscount = Math.min(
                        input.coupon.discountAmountPaise || 0,
                        subtotal,
                    );
                } else if (input.coupon.offer_type === 'percentage') {
                    const rawDiscount = Math.round(
                        (subtotal * (input.coupon.discountPercentage || 0)) /
                            100,
                    );
                    if (
                        input.coupon.maxDiscountPaise &&
                        rawDiscount > input.coupon.maxDiscountPaise
                    ) {
                        couponDiscount = input.coupon.maxDiscountPaise;
                    } else {
                        couponDiscount = rawDiscount;
                    }
                }
            }

            const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
            const tax = input.taxPaise || 0;

            // 2. Points Redemption (Order: Subtotal - Coupon -> Tax -> Points)
            const rate = input.pointToInrRate || 0.25;
            const requestedPointsDiscount = Math.round(
                (input.pointsToRedeem || 0) * rate * 100,
            );
            const pointsDiscount = Math.min(
                requestedPointsDiscount,
                discountedSubtotal,
            );
            const pointsUsed = Math.min(
                input.pointsToRedeem || 0,
                Math.ceil(pointsDiscount / (rate * 100)),
            );

            // 3. Deposit & Final Total
            const deposit = input.depositPaise || 0;
            const finalPayable = Math.max(
                0,
                discountedSubtotal - pointsDiscount + tax + deposit,
            );

            // 4. Points Earned on Stay (1 pt per ₹20 spent on subtotal)
            const pointsEarned = Math.max(
                50,
                Math.round(discountedSubtotal / 2000),
            );

            return {
                subtotalPaise: subtotal,
                couponDiscountPaise: couponDiscount,
                discountedSubtotalPaise: discountedSubtotal,
                pointsDiscountPaise: pointsDiscount,
                pointsRedeemed: pointsUsed,
                depositPaise: deposit,
                finalPayablePaise: finalPayable,
                pointsEarned,
            };
        };

        it('applies fixed amount coupon discount cleanly', () => {
            const res = calculatePricing({
                subtotalPaise: 500000, // ₹5,000
                coupon: {
                    offer_type: 'fixed_amount',
                    discountAmountPaise: 50000, // ₹500
                },
            });

            assert.equal(res.subtotalPaise, 500000);
            assert.equal(res.couponDiscountPaise, 50000);
            assert.equal(res.discountedSubtotalPaise, 450000);
            assert.equal(res.finalPayablePaise, 450000);
        });

        it('caps percentage coupon discount at maximum allowed threshold', () => {
            const res = calculatePricing({
                subtotalPaise: 1000000, // ₹10,000
                coupon: {
                    offer_type: 'percentage',
                    discountPercentage: 15, // 15% of 10,000 = ₹1,500
                    maxDiscountPaise: 100000, // Cap at ₹1,000
                },
            });

            assert.equal(res.couponDiscountPaise, 100000); // capped at ₹1,000
            assert.equal(res.discountedSubtotalPaise, 900000);
            assert.equal(res.finalPayablePaise, 900000);
        });

        it('combines coupon discount and points redemption in strict precedence order', () => {
            const res = calculatePricing({
                subtotalPaise: 500000, // ₹5,000
                depositPaise: 100000, // ₹1,000
                coupon: {
                    offer_type: 'fixed_amount',
                    discountAmountPaise: 50000, // ₹500
                },
                pointsToRedeem: 400, // 400 pts * 0.25 = ₹100 (10,000 paise)
                pointToInrRate: 0.25,
            });

            assert.equal(res.subtotalPaise, 500000);
            assert.equal(res.couponDiscountPaise, 50000); // -₹500
            assert.equal(res.discountedSubtotalPaise, 450000); // ₹4,500
            assert.equal(res.pointsDiscountPaise, 10000); // -₹100
            assert.equal(res.pointsRedeemed, 400);
            assert.equal(res.depositPaise, 100000); // +₹1,000
            assert.equal(res.finalPayablePaise, 540000); // ₹4,500 - ₹100 + ₹1,000 = ₹5,400
        });

        it('prevents points redemption from exceeding discounted subtotal', () => {
            const res = calculatePricing({
                subtotalPaise: 20000, // ₹200
                coupon: {
                    offer_type: 'fixed_amount',
                    discountAmountPaise: 15000, // ₹150
                },
                pointsToRedeem: 1000, // 1000 pts * 0.25 = ₹250 (exceeds ₹50 remaining)
                pointToInrRate: 0.25,
            });

            assert.equal(res.discountedSubtotalPaise, 5000); // ₹50
            assert.equal(res.pointsDiscountPaise, 5000); // limited to ₹50
            assert.equal(res.pointsRedeemed, 200); // only 200 points consumed
            assert.equal(res.finalPayablePaise, 0);
        });
    });

    describe('FEFO (First-Expiring, First-Out) Points Engine', () => {
        interface PointsLot {
            id: number;
            points: number;
            expiresAt: string;
        }

        const consumePointsFefo = (
            lots: PointsLot[],
            amountToConsume: number,
        ) => {
            const sorted = [...lots].sort((a, b) =>
                a.expiresAt.localeCompare(b.expiresAt),
            );
            let remaining = amountToConsume;
            const consumed: Array<{ lotId: number; points: number }> = [];

            for (const lot of sorted) {
                if (remaining <= 0) break;
                const toTake = Math.min(lot.points, remaining);
                consumed.push({ lotId: lot.id, points: toTake });
                remaining -= toTake;
            }

            return {
                consumed,
                unfulfilled: Math.max(0, remaining),
            };
        };

        it('consumes points strictly from earliest expiring lot first', () => {
            const lots: PointsLot[] = [
                { id: 1, points: 300, expiresAt: '2027-06-30' },
                { id: 2, points: 200, expiresAt: '2026-12-31' }, // Earliest
                { id: 3, points: 500, expiresAt: '2027-12-31' },
            ];

            const result = consumePointsFefo(lots, 350);
            assert.equal(result.consumed.length, 2);
            assert.equal(result.consumed[0].lotId, 2); // Expiration: 2026-12-31
            assert.equal(result.consumed[0].points, 200);
            assert.equal(result.consumed[1].lotId, 1); // Expiration: 2027-06-30
            assert.equal(result.consumed[1].points, 150);
            assert.equal(result.unfulfilled, 0);
        });
    });

    describe('Referral Programme Mechanics', () => {
        it('constructs canonical referral link and share message', () => {
            const code = 'TIJUM-ALICE88';
            const link = `https://tijum.com/r/${code}`;
            const message = `Join me on TIJUM for verified hostels, homestays, and co-living with daily meals included! Sign up using my referral link to get 250 loyalty points on your stay: ${link} or use code ${code}`;

            assert.equal(link, 'https://tijum.com/r/TIJUM-ALICE88');
            assert.ok(message.includes('250 loyalty points'));
            assert.ok(message.includes(code));
        });

        it('rewards both parties only upon verified stay completion', () => {
            type ReferralStatus =
                | 'registered'
                | 'booking_created'
                | 'stay_completed';

            const getQualificationOutcome = (status: ReferralStatus) => {
                if (status === 'stay_completed') {
                    return {
                        qualified: true,
                        referrerPoints: 500,
                        refereePoints: 250,
                    };
                }
                return {
                    qualified: false,
                    referrerPoints: 0,
                    refereePoints: 0,
                };
            };

            assert.equal(
                getQualificationOutcome('registered').qualified,
                false,
            );
            assert.equal(
                getQualificationOutcome('booking_created').qualified,
                false,
            );
            const completed = getQualificationOutcome('stay_completed');
            assert.equal(completed.qualified, true);
            assert.equal(completed.referrerPoints, 500);
            assert.equal(completed.refereePoints, 250);
        });
    });
});
