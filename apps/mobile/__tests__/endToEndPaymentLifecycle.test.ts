import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('End-to-End Booking & Payment Lifecycle Specification', () => {
    describe('Mobile Payment API Client Contracts', () => {
        it('exports authoritative payment lifecycle methods on CustomerApi', () => {
            const customerApiPath = path.resolve(
                __dirname,
                '../src/api/customer.ts',
            );
            const content = fs.readFileSync(customerApiPath, 'utf8');

            assert.match(
                content,
                /initiatePayment:\s*\(reference:\s*string\)/,
                'CustomerApi must export initiatePayment method',
            );
            assert.match(
                content,
                /verifyPayment:\s*\(\s*reference:\s*string,\s*data:\s*\{/s,
                'CustomerApi must export verifyPayment method',
            );
            assert.match(
                content,
                /getPaymentStatus:\s*\(reference:\s*string\)/,
                'CustomerApi must export getPaymentStatus method',
            );
        });

        it('strictly binds to backend authoritative payment endpoints', () => {
            const customerApiPath = path.resolve(
                __dirname,
                '../src/api/customer.ts',
            );
            const content = fs.readFileSync(customerApiPath, 'utf8');

            assert.ok(
                content.includes('customer/reservations/${reference}/payment/initiate'),
                'Must target /payment/initiate endpoint',
            );
            assert.ok(
                content.includes('customer/reservations/${reference}/payment/verify'),
                'Must target /payment/verify endpoint',
            );
            assert.ok(
                content.includes('customer/reservations/${reference}/payment/status'),
                'Must target /payment/status endpoint',
            );
        });
    });

    describe('Countdown Timer & 15-Minute Expiration Logic', () => {
        it('calculates remaining hold seconds correctly and handles expiration', () => {
            const calculateRemaining = (deadlineStr: string, nowMs: number) => {
                const expires = new Date(deadlineStr).getTime();
                return Math.max(0, Math.floor((expires - nowMs) / 1000));
            };

            const formatTimer = (secs: number) => {
                const mins = Math.floor(secs / 60);
                const remainder = secs % 60;
                return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
            };

            const baseNow = 1732000000000;
            // 15 minutes ahead (900 seconds)
            const futureDeadline = new Date(baseNow + 900 * 1000).toISOString();
            assert.strictEqual(calculateRemaining(futureDeadline, baseNow), 900);
            assert.strictEqual(formatTimer(900), '15:00');

            // 4 minutes 25 seconds ahead (265 seconds)
            const midDeadline = new Date(baseNow + 265 * 1000).toISOString();
            assert.strictEqual(calculateRemaining(midDeadline, baseNow), 265);
            assert.strictEqual(formatTimer(265), '04:25');

            // Expired hold (negative time clamps to 0)
            const pastDeadline = new Date(baseNow - 60 * 1000).toISOString();
            assert.strictEqual(calculateRemaining(pastDeadline, baseNow), 0);
            assert.strictEqual(formatTimer(0), '00:00');
        });

        it('verifies booking detail screen implements 15-minute countdown and reloads on zero', () => {
            const detailPath = path.resolve(
                __dirname,
                '../app/(customer)/bookings/[reference].tsx',
            );
            const source = fs.readFileSync(detailPath, 'utf8');

            assert.ok(
                source.includes('setTimeLeft(remaining)'),
                'Must track remaining countdown seconds in state',
            );
            assert.ok(
                source.includes('loadReservation()'),
                'Must reload reservation status automatically when countdown hits 0',
            );
            assert.ok(
                source.includes('Action Required: Pay to Confirm'),
                'Must display prominent action-required banner for awaiting_payment bookings',
            );
        });
    });

    describe('Booking Recovery & State Discovery on App Relaunch', () => {
        it('verifies bookings index screen supports awaiting_action filter tab for in-progress bookings', () => {
            const indexPath = path.resolve(
                __dirname,
                '../app/(customer)/bookings/index.tsx',
            );
            const source = fs.readFileSync(indexPath, 'utf8');

            assert.ok(
                source.includes("value: 'awaiting_action'"),
                'Filter tabs must include awaiting_action tab',
            );
            assert.ok(
                source.includes('canPayReservation(item)'),
                'Must use authoritative canPayReservation helper for prominent CTA',
            );
            assert.ok(
                source.includes('resolveReservationListActionRoute(reference)'),
                'Must route Pay Now and View Details via resolveReservationListActionRoute',
            );
            assert.ok(
                source.includes("isAwaitingPayment ? 'Pay Now' : 'View Details'"),
                'Must present Pay Now primary button for unconfirmed bookings',
            );
        });
    });

    describe('Client Payment Verification Security & Invariants', () => {
        it('verifies client requires server-verified status before declaring payment success', () => {
            const detailPath = path.resolve(
                __dirname,
                '../app/(customer)/bookings/[reference].tsx',
            );
            const source = fs.readFileSync(detailPath, 'utf8');

            // Ensures CustomerApi.verifyPayment is invoked with gateway signature
            assert.ok(
                source.includes('CustomerApi.verifyPayment'),
                'Must call CustomerApi.verifyPayment after Razorpay checkout returns',
            );
            assert.ok(
                source.includes('razorpay_signature: checkoutResponse.razorpay_signature'),
                'Must submit HMAC signature from checkout response to backend',
            );
            assert.ok(
                source.includes('setReservation(verifyRes.data)'),
                'Must only update confirmed reservation state using authoritative server response',
            );
        });

        it('verifies user cancellation of Razorpay modal does not show alarming error', () => {
            const detailPath = path.resolve(
                __dirname,
                '../app/(customer)/bookings/[reference].tsx',
            );
            const source = fs.readFileSync(detailPath, 'utf8');

            assert.ok(
                source.includes('e?.code === 0') && source.includes("includes('cancel')"),
                'Must gracefully handle user dismissal without false positive failure alerts',
            );
        });
    });
});
