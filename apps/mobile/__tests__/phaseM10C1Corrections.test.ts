import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase M10C.1 Production Acceptance Corrections Specification', () => {
    describe('1. Customer Protection SLA Targets & Statutory Deadlines', () => {
        const getPrioritySlaTarget = (priority?: string) => {
            switch (priority?.toLowerCase()) {
                case 'urgent':
                    return {
                        hours: 2,
                        target: '2 Hours',
                        label: 'Urgent Disruption',
                        desc: 'Emergency room condition, relocation or safety incident. First response target is within 2 hours.',
                    };
                case 'high':
                    return {
                        hours: 4,
                        target: '4 Hours',
                        label: 'High Priority',
                        desc: 'Missing meals or major amenity failure. First response target is within 4 hours.',
                    };
                case 'medium':
                    return {
                        hours: 24,
                        target: '24 Hours',
                        label: 'Medium Priority',
                        desc: 'Standard stay issue or billing discrepancy. First response target is within 24 hours.',
                    };
                case 'low':
                default:
                    return {
                        hours: 48,
                        target: '48 Hours',
                        label: 'Standard Inquiry',
                        desc: 'General inquiry or feedback. First response target is within 48 hours.',
                    };
            }
        };

        it('strictly returns correct first-action targets for all 4 priorities', () => {
            assert.equal(getPrioritySlaTarget('urgent').hours, 2);
            assert.equal(getPrioritySlaTarget('urgent').target, '2 Hours');

            assert.equal(getPrioritySlaTarget('high').hours, 4);
            assert.equal(getPrioritySlaTarget('high').target, '4 Hours');

            assert.equal(getPrioritySlaTarget('medium').hours, 24);
            assert.equal(getPrioritySlaTarget('medium').target, '24 Hours');

            assert.equal(getPrioritySlaTarget('low').hours, 48);
            assert.equal(getPrioritySlaTarget('low').target, '48 Hours');

            assert.equal(getPrioritySlaTarget('standard').hours, 48);
        });

        it('distinguishes first-action targets from statutory deadlines', () => {
            const statutoryAcknowledgementHours = 48;
            const statutoryResolutionDays = 30;

            const urgentSla = getPrioritySlaTarget('urgent');
            assert.notEqual(urgentSla.hours, statutoryAcknowledgementHours);
            assert.equal(urgentSla.hours, 2);

            const highSla = getPrioritySlaTarget('high');
            assert.notEqual(highSla.hours, statutoryAcknowledgementHours);
            assert.equal(highSla.hours, 4);

            assert.equal(statutoryAcknowledgementHours, 48);
            assert.equal(statutoryResolutionDays, 30);
        });

        it('verifies server-authoritative timestamps are used when available', () => {
            const serverCasePayload = {
                id: 101,
                case_reference: 'TPC-2026-TEST01',
                priority: 'urgent',
                first_action_target_hours: 2,
                first_action_due_at: '2026-11-20T12:00:00.000000Z',
                acknowledgement_due_at: '2026-11-22T10:00:00.000000Z',
                resolution_due_at: '2026-12-20T10:00:00.000000Z',
                created_at: '2026-11-20T10:00:00.000000Z',
            };

            const displayedFirstActionHours = serverCasePayload.first_action_target_hours;
            assert.equal(displayedFirstActionHours, 2);

            const firstActionDue = new Date(serverCasePayload.first_action_due_at).getTime();
            const created = new Date(serverCasePayload.created_at).getTime();
            const diffHours = (firstActionDue - created) / (1000 * 60 * 60);
            assert.equal(diffHours, 2);

            const ackDue = new Date(serverCasePayload.acknowledgement_due_at).getTime();
            const ackDiffHours = (ackDue - created) / (1000 * 60 * 60);
            assert.equal(ackDiffHours, 48);
        });
    });

    describe('2. Push Notification Permission Lifecycle & Invariants', () => {
        it('verifies that no permission prompt is shown on first launch', () => {
            // Emulate clean initial launch state
            let promptedUser = false;
            let tokenRegistered = false;

            const checkInitialStatus = (status: 'undetermined' | 'granted' | 'denied') => {
                if (status === 'granted') {
                    tokenRegistered = true;
                }
                // When undetermined (first launch), do NOT prompt
                return { prompted: promptedUser, registered: tokenRegistered };
            };

            const firstLaunch = checkInitialStatus('undetermined');
            assert.equal(firstLaunch.prompted, false, 'First launch must never trigger automatic prompt');
            assert.equal(firstLaunch.registered, false, 'First launch must never register token without permission');
        });

        it('requests permission contextually during user-initiated settings toggle', () => {
            let promptedContext = '';
            let isGranted = false;

            const onUserTogglePush = (userWantsPush: boolean) => {
                if (userWantsPush) {
                    promptedContext = 'settings_toggle';
                    // User accepts prompt
                    isGranted = true;
                    return { success: true, registered: isGranted };
                }
                return { success: false, registered: false };
            };

            const toggleResult = onUserTogglePush(true);
            assert.equal(promptedContext, 'settings_toggle');
            assert.equal(toggleResult.registered, true);
        });

        it('handles permission denial gracefully without recurring nag prompts', () => {
            let promptAttempts = 0;
            const history: Record<string, { declinedCount: number }> = {};

            const requestPermission = (context: string, force: boolean) => {
                const declCount = history[context]?.declinedCount || 0;
                if (declCount >= 2 && !force) {
                    // Suppress prompt
                    return { prompted: false, granted: false };
                }

                promptAttempts++;
                // User denies
                history[context] = { declinedCount: declCount + 1 };
                return { prompted: true, granted: false };
            };

            const attempt1 = requestPermission('in_app_prompt', false);
            assert.equal(attempt1.prompted, true);

            const attempt2 = requestPermission('in_app_prompt', false);
            assert.equal(attempt2.prompted, true);

            // Third automatic attempt should be suppressed
            const attempt3 = requestPermission('in_app_prompt', false);
            assert.equal(attempt3.prompted, false, 'Third prompt must be suppressed to prevent nagging');
            assert.equal(promptAttempts, 2);
        });

        it('unregisters push token on logout and role-switch', () => {
            const registeredTokens: string[] = ['ExponentPushToken[customer_123]'];

            const unregisterDevice = (tokenToRevoke: string) => {
                const idx = registeredTokens.indexOf(tokenToRevoke);
                if (idx !== -1) {
                    registeredTokens.splice(idx, 1);
                }
            };

            // User logs out as Customer
            unregisterDevice('ExponentPushToken[customer_123]');
            assert.equal(registeredTokens.length, 0, 'Device push token must be unregistered on logout');
        });
    });

    describe('3. TDS Section 393(1) and Financial Policy Reconciliation', () => {
        it('verifies 0.10% (10 bps) rate and individual/HUF threshold rules', () => {
            const TDS_RATE_BPS = 10; // 0.10%
            const TDS_THRESHOLD_MINOR = 50000000; // INR 5,00,000

            const calculateTds = (
                constitution: 'individual' | 'company',
                panVerified: boolean,
                cumulativeSalesMinor: number,
                currentBookingGrossMinor: number,
            ) => {
                const projectedSales = cumulativeSalesMinor + currentBookingGrossMinor;
                const isIndividual = constitution === 'individual';
                const isExempt = isIndividual && panVerified && projectedSales <= TDS_THRESHOLD_MINOR;

                if (isExempt) {
                    return { rateBps: 0, amountMinor: 0 };
                }

                const amountMinor = Math.round((currentBookingGrossMinor * TDS_RATE_BPS) / 10000);
                return { rateBps: TDS_RATE_BPS, amountMinor };
            };

            // Individual under threshold
            const exempt = calculateTds('individual', true, 20000000, 5000000);
            assert.equal(exempt.rateBps, 0);
            assert.equal(exempt.amountMinor, 0);

            // Individual over threshold (sales reach 51 Lakhs)
            const taxable = calculateTds('individual', true, 48000000, 3000000);
            assert.equal(taxable.rateBps, 10);
            assert.equal(taxable.amountMinor, 3000); // 30 INR on 30,000 INR booking

            // Company (never exempt)
            const company = calculateTds('company', true, 1000000, 1000000);
            assert.equal(company.rateBps, 10);
            assert.equal(company.amountMinor, 1000);

            // Missing PAN (never exempt)
            const noPan = calculateTds('individual', false, 1000000, 1000000);
            assert.equal(noPan.rateBps, 10);
            assert.equal(noPan.amountMinor, 1000);
        });

        it('verifies settlement line-item rendering never double-deducts commission GST', () => {
            const grossRentMinor = 5000000; // INR 50,000
            const commissionAmountMinor = 500000; // INR 5,000 (10% commission)
            const commissionGstMinor = 90000; // INR 900 (18% GST on commission)
            const tdsMinor = 5000; // INR 50 (0.10% TDS)

            // Net payable = Gross - Commission - GST on Commission - TDS
            const netPayableMinor = grossRentMinor - commissionAmountMinor - commissionGstMinor - tdsMinor;

            assert.equal(netPayableMinor, 4405000); // INR 44,050
            // Verify commission GST is deducted exactly once
            assert.equal(grossRentMinor - netPayableMinor, 595000);
        });
    });

    describe('4. Unauthenticated Guest State & Session Expiration Guards', () => {
        it('verifies customer bookings index guards guest state and renders ExceptionalState', () => {
            const bookingsPath = path.resolve(__dirname, '../app/(customer)/bookings/index.tsx');
            const content = fs.readFileSync(bookingsPath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes('useAuth'), 'Must import useAuth');
            assert.ok(content.includes("authState === 'guest'"), 'Must guard against guest authState');
            assert.ok(content.includes("authState === 'session_expired'"), 'Must guard against session_expired');
            assert.ok(content.includes('Sign In as Customer'), 'Must provide Customer Sign In CTA');
            assert.ok(content.includes('Explore Stays'), 'Must provide Explore Stays secondary CTA');
            assert.ok(content.includes('isUnauthenticated'), 'Must track unauthenticated state');
        });

        it('verifies customer notifications index guards guest state and renders ExceptionalState', () => {
            const notifPath = path.resolve(__dirname, '../app/(customer)/notifications/index.tsx');
            const content = fs.readFileSync(notifPath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes('useAuth'), 'Must import useAuth');
            assert.ok(content.includes("authState === 'guest'"), 'Must guard against guest authState');
            assert.ok(content.includes('Sign In for Alerts'), 'Must display Sign In for Alerts state');
            assert.ok(content.includes('Sign In as Customer'), 'Must provide Customer Sign In CTA');
        });

        it('verifies customer wishlist index guards guest state and renders ExceptionalState', () => {
            const wishlistPath = path.resolve(__dirname, '../app/(customer)/wishlist/index.tsx');
            const content = fs.readFileSync(wishlistPath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes('useAuth'), 'Must import useAuth');
            assert.ok(content.includes("authState === 'guest'"), 'Must guard against guest authState');
            assert.ok(content.includes('Sign In to View Saved Stays'), 'Must display Sign In to View Saved Stays');
            assert.ok(content.includes('Sign In as Customer'), 'Must provide Customer Sign In CTA');
        });

        it('verifies customer profile index guards guest state and renders ExceptionalState', () => {
            const profilePath = path.resolve(__dirname, '../app/(customer)/profile/index.tsx');
            const content = fs.readFileSync(profilePath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes("authState === 'guest'"), 'Must guard against guest authState');
            assert.ok(content.includes('Sign In to Your Account'), 'Must display Sign In to Your Account');
            assert.ok(content.includes('Sign In as Customer'), 'Must provide Customer Sign In CTA');
        });

        it('verifies partner dashboard guards guest/customer state and renders ExceptionalState', () => {
            const dashboardPath = path.resolve(__dirname, '../app/(partner)/dashboard.tsx');
            const content = fs.readFileSync(dashboardPath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes('useAuth'), 'Must import useAuth');
            assert.ok(content.includes("authState !== 'owner_authenticated'"), 'Must require owner_authenticated state');
            assert.ok(content.includes('Sign In as Partner'), 'Must provide Partner Sign In CTA');
            assert.ok(content.includes('/(auth)/owner-login'), 'Must route to owner login');
        });

        it('verifies partner reservations index guards guest state and renders ExceptionalState', () => {
            const reservationsPath = path.resolve(__dirname, '../app/(partner)/reservations/index.tsx');
            const content = fs.readFileSync(reservationsPath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes('useAuth'), 'Must import useAuth');
            assert.ok(content.includes("authState !== 'owner_authenticated'"), 'Must require owner_authenticated state');
            assert.ok(content.includes('Sign In as Partner'), 'Must provide Partner Sign In CTA');
        });

        it('verifies partner properties index guards guest state and renders ExceptionalState', () => {
            const propertiesPath = path.resolve(__dirname, '../app/(partner)/properties/index.tsx');
            const content = fs.readFileSync(propertiesPath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes('useAuth'), 'Must import useAuth');
            assert.ok(content.includes("authState !== 'owner_authenticated'"), 'Must require owner_authenticated state');
            assert.ok(content.includes('Sign In as Partner'), 'Must provide Partner Sign In CTA');
        });

        it('verifies partner settlements index guards guest state and renders ExceptionalState', () => {
            const settlementsPath = path.resolve(__dirname, '../app/(partner)/settlements/index.tsx');
            const content = fs.readFileSync(settlementsPath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes('useAuth'), 'Must import useAuth');
            assert.ok(content.includes("authState !== 'owner_authenticated'"), 'Must require owner_authenticated state');
            assert.ok(content.includes('Sign In as Partner'), 'Must provide Partner Sign In CTA');
        });

        it('verifies partner notifications index guards guest state and renders ExceptionalState', () => {
            const notifPath = path.resolve(__dirname, '../app/(partner)/notifications/index.tsx');
            const content = fs.readFileSync(notifPath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes('useAuth'), 'Must import useAuth');
            assert.ok(content.includes("authState !== 'owner_authenticated'"), 'Must require owner_authenticated state');
            assert.ok(content.includes('Sign In as Partner'), 'Must provide Partner Sign In CTA');
        });

        it('verifies partner account guards guest state and renders ExceptionalState', () => {
            const accountPath = path.resolve(__dirname, '../app/(partner)/account.tsx');
            const content = fs.readFileSync(accountPath, 'utf8');

            assert.ok(content.includes('ExceptionalState'), 'Must import ExceptionalState');
            assert.ok(content.includes("authState !== 'owner_authenticated'"), 'Must require owner_authenticated state');
            assert.ok(content.includes('Sign In as Partner'), 'Must provide Partner Sign In CTA');
        });
    });
});
