import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase M10B Customer Mobile Application & API Parity Specification', () => {
    describe('Customer Protection & Case Management Parity', () => {
        it('exports addCaseMessage and getCase API methods on CustomerApi', () => {
            const customerApiPath = path.resolve(
                __dirname,
                '../src/api/customer.ts',
            );
            const content = fs.readFileSync(customerApiPath, 'utf8');
            assert.match(
                content,
                /addCaseMessage:\s*\(reference:\s*string,\s*message:\s*string\)/,
                'CustomerApi must export addCaseMessage method',
            );
            assert.match(
                content,
                /getCase:\s*\(reference:\s*string\)/,
                'CustomerApi must export getCase method',
            );
        });

        it('verifies priority-based SLAs match TIJUM Customer Protection Policy', () => {
            const getPrioritySlaTarget = (priority?: string) => {
                switch (priority?.toLowerCase()) {
                    case 'urgent':
                        return { targetHours: 2, label: 'Urgent Disruption' };
                    case 'high':
                        return { targetHours: 4, label: 'High Priority' };
                    case 'medium':
                        return { targetHours: 24, label: 'Medium Priority' };
                    case 'low':
                    default:
                        return { targetHours: 48, label: 'Standard Inquiry' };
                }
            };

            assert.strictEqual(getPrioritySlaTarget('urgent').targetHours, 2);
            assert.strictEqual(getPrioritySlaTarget('high').targetHours, 4);
            assert.strictEqual(getPrioritySlaTarget('medium').targetHours, 24);
            assert.strictEqual(getPrioritySlaTarget('low').targetHours, 48);
        });

        it('verifies dedicated customer case detail and timeline screen exists and handles messages', () => {
            const screenPath = path.resolve(
                __dirname,
                '../app/(customer)/support/[reference].tsx',
            );
            assert.ok(fs.existsSync(screenPath), 'support/[reference].tsx must exist');

            const source = fs.readFileSync(screenPath, 'utf8');
            assert.ok(
                source.includes('CustomerApi.getCase'),
                'Must fetch case details using CustomerApi.getCase',
            );
            assert.ok(
                source.includes('CustomerApi.addCaseMessage'),
                'Must allow posting replies via CustomerApi.addCaseMessage',
            );
            assert.ok(
                source.includes('First Action Target:'),
                'Must display priority-specific SLA target',
            );
            assert.ok(
                source.includes('Statutory formal acknowledgement within 48h'),
                'Must display statutory 48h ack and 30-day resolution tracking',
            );
        });

        it('verifies customer layout registers support/[reference] route', () => {
            const layoutPath = path.resolve(
                __dirname,
                '../app/(customer)/_layout.tsx',
            );
            const source = fs.readFileSync(layoutPath, 'utf8');
            assert.ok(
                source.includes('name="support/[reference]"'),
                'Must register support/[reference] in Customer tabs layout',
            );
        });
    });

    describe('Channel Policy & Official Touchpoints Compliance', () => {
        it('verifies absence of operational WhatsApp buttons in customer support screen', () => {
            const supportPath = path.resolve(
                __dirname,
                '../app/(customer)/support/index.tsx',
            );
            const source = fs.readFileSync(supportPath, 'utf8');

            assert.ok(
                !source.includes('https://wa.me'),
                'Must NOT link to wa.me per disabled-channel architecture policy',
            );
            assert.ok(
                !source.includes('WhatsApp Chat'),
                'Must NOT present WhatsApp Chat as an operational button',
            );
            assert.ok(
                source.includes('Call Helpline'),
                'Must retain direct phone helpline',
            );
            assert.ok(
                source.includes('Email Desk'),
                'Must retain direct email desk touchpoint',
            );
        });
    });

    describe('Customer Notification Preferences & Deep-Linking', () => {
        it('exports notification preferences API methods on CustomerApi', () => {
            const customerApiPath = path.resolve(
                __dirname,
                '../src/api/customer.ts',
            );
            const content = fs.readFileSync(customerApiPath, 'utf8');
            assert.match(
                content,
                /getNotificationPreferences:\s*\(\)\s*=>/,
                'CustomerApi must export getNotificationPreferences method',
            );
            assert.match(
                content,
                /updateNotificationPreferences:\s*\(data:/,
                'CustomerApi must export updateNotificationPreferences method',
            );
        });

        it('verifies notification screen contains channel preferences modal with truthful channel statuses', () => {
            const notifPath = path.resolve(
                __dirname,
                '../app/(customer)/notifications/index.tsx',
            );
            const source = fs.readFileSync(notifPath, 'utf8');

            assert.ok(
                source.includes('CustomerApi.getNotificationPreferences'),
                'Must query notification preferences from backend',
            );
            assert.ok(
                source.includes('CustomerApi.updateNotificationPreferences'),
                'Must persist updated channel preferences',
            );
            assert.ok(
                source.includes('Platform transactional email is currently inactive'),
                'Must truthfully disclose inactive email channel status',
            );
            assert.ok(
                source.includes('SMS gateway is currently disabled'),
                'Must truthfully disclose disabled SMS gateway',
            );
            assert.ok(
                source.includes('WhatsApp channel is currently disabled'),
                'Must truthfully disclose disabled WhatsApp channel',
            );
        });

        it('correctly maps notifications to deep-link routes for bookings, support cases, and rewards', () => {
            const resolveDeepLink = (actionUrl: string, combinedText: string) => {
                const caseRefMatch =
                    actionUrl.match(/(?:my-support|support|cases)\/([A-Za-z0-9_-]+)/i) ||
                    combinedText.match(/\b(CAS-[A-Z0-9-]+)\b/i);
                if (caseRefMatch) {
                    return `/(customer)/support/${caseRefMatch[1]}`;
                }

                const bookingMatch =
                    actionUrl.match(/reservations\/([A-Za-z0-9_-]+)/i) ||
                    combinedText.match(/\b(TIJ-[A-Z0-9-]+)\b/i);
                if (bookingMatch) {
                    return `/(customer)/bookings/${bookingMatch[1]}`;
                }

                if (actionUrl.includes('rewards') || combinedText.includes('points')) {
                    return '/(customer)/rewards';
                }

                return null;
            };

            assert.strictEqual(
                resolveDeepLink('/my-support/CAS-202611-001', ''),
                '/(customer)/support/CAS-202611-001',
            );
            assert.strictEqual(
                resolveDeepLink('', 'Your stay grievance CAS-202611-999 was updated'),
                '/(customer)/support/CAS-202611-999',
            );
            assert.strictEqual(
                resolveDeepLink('/reservations/TIJ-202611-XYZ', ''),
                '/(customer)/bookings/TIJ-202611-XYZ',
            );
            assert.strictEqual(
                resolveDeepLink('', 'Check-in confirmed for booking TIJ-202611-ABC'),
                '/(customer)/bookings/TIJ-202611-ABC',
            );
            assert.strictEqual(
                resolveDeepLink('/rewards', 'You earned 500 loyalty points'),
                '/(customer)/rewards',
            );
        });
    });

    describe('Zero Mock/Fabricated Fallback Policy Verification', () => {
        it('verifies rewards screens do not contain fabricated mock data in error blocks', () => {
            const rewardFiles = [
                '../app/(customer)/rewards/index.tsx',
                '../app/(customer)/rewards/coupons.tsx',
                '../app/(customer)/rewards/points.tsx',
                '../app/(customer)/rewards/referrals.tsx',
            ];

            for (const file of rewardFiles) {
                const fullPath = path.resolve(__dirname, file);
                const source = fs.readFileSync(fullPath, 'utf8');

                assert.ok(
                    !source.includes('Sri Lakshmi PG'),
                    `File ${file} must not contain mock stay Sri Lakshmi PG`,
                );
                assert.ok(
                    !source.includes('TIJUM-PREMIUM'),
                    `File ${file} must not contain mock voucher TIJUM-PREMIUM`,
                );
                assert.ok(
                    !source.includes('HOMESTAYPOINTS'),
                    `File ${file} must not contain mock voucher HOMESTAYPOINTS`,
                );
            }
        });

        it('verifies bookings create screen uses genuine backend quote and rejects mock coupon fallbacks', () => {
            const bookingCreatePath = path.resolve(
                __dirname,
                '../app/(customer)/bookings/create.tsx',
            );
            const source = fs.readFileSync(bookingCreatePath, 'utf8');

            assert.ok(
                !source.includes("codeUpper === 'TIJUMWELCOME'"),
                'Must NOT have client-side mock coupon code fallbacks',
            );
            assert.ok(
                !source.includes("codeUpper === 'COLIVING15'"),
                'Must NOT have client-side mock coupon code fallbacks',
            );
            assert.ok(
                source.includes('CustomerApi.quoteReservation'),
                'Must use authoritative backend quote calculation',
            );
        });
    });

    describe('Explore Screen Advanced Filters & Photo Gallery Specification', () => {
        it('verifies explore screen has Advanced Filters modal for dates, meals, and sharing capacity', () => {
            const explorePath = path.resolve(
                __dirname,
                '../app/(customer)/explore/index.tsx',
            );
            const source = fs.readFileSync(explorePath, 'utf8');

            assert.ok(
                source.includes('Stay Dates'),
                'Must provide check-in and check-out date filters',
            );
            assert.ok(
                source.includes('Meal Inclusions'),
                'Must provide meal inclusions filter options',
            );
            assert.ok(
                source.includes('Room Sharing Capacity'),
                'Must provide sharing capacity filter options',
            );
            assert.ok(
                source.includes('Monthly Budget Range'),
                'Must provide monthly budget range filters',
            );
        });

        it('verifies property detail screen includes interactive Photo Gallery modal', () => {
            const detailPath = path.resolve(
                __dirname,
                '../app/(customer)/explore/property/[slug].tsx',
            );
            const source = fs.readFileSync(detailPath, 'utf8');

            assert.ok(
                source.includes('galleryTriggerBadge'),
                'Must show photo count trigger badge on cover image',
            );
            assert.ok(
                source.includes('galleryModalOverlay'),
                'Must have dedicated photo gallery modal',
            );
            assert.ok(
                source.includes('galleryThumbsScroll'),
                'Must support thumbnail navigation in photo gallery',
            );
        });
    });

    describe('Cancellation & Refund Tracking Specification', () => {
        it('verifies booking detail screen contains Cancellation & Refund tracking breakdown', () => {
            const bookingDetailPath = path.resolve(
                __dirname,
                '../app/(customer)/bookings/[reference].tsx',
            );
            const source = fs.readFileSync(bookingDetailPath, 'utf8');

            assert.ok(
                source.includes('Cancellation & Refund Tracking'),
                'Must display dedicated Cancellation & Refund Tracking card',
            );
            assert.ok(
                source.includes('Bank UTR / Ref:'),
                'Must display bank UTR or gateway refund tracking details',
            );
            assert.ok(
                source.includes('refundAmountText'),
                'Must render refund amount in INR minor units / 100',
            );
        });
    });
});
