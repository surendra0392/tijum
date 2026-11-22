import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    buildLoginPayload,
    classifyCustomerLoginError,
} from '../src/auth/payloads.ts';
import {
    ApiClient,
    ApiError,
    resolveApiBaseUrl,
    resolveApiOrigin,
} from '../src/api/client.ts';
import {
    canCancelReservation,
    canPayReservation,
    canSubmitReview,
    resolvePaymentVerifyAlert,
    resolveRefundNotice,
    resolveReservationListActionRoute,
    shouldShowRefundSection,
} from '../src/utils/reservationState.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(mobileRoot, '../..');

describe('Phase 5 Mobile Auth, Booking Consistency & Geolocation Readiness', () => {
    describe('1. Two-Factor Auth Payloads & Error Classification', () => {
        it('builds login payload for password-only, TOTP code, and recovery code flows', () => {
            const passwordOnly = buildLoginPayload(
                '  guest@tijum.test ',
                'secret-pass',
                'iPhone Test',
            );
            assert.deepEqual(passwordOnly, {
                email: 'guest@tijum.test',
                password: 'secret-pass',
                device_name: 'iPhone Test',
            });

            const withTotp = buildLoginPayload(
                'guest@tijum.test',
                'secret-pass',
                'iPhone Test',
                { code: ' 123456 ' },
            );
            assert.equal(withTotp.code, '123456');
            assert.equal(withTotp.recovery_code, undefined);

            const withRecovery = buildLoginPayload(
                'guest@tijum.test',
                'secret-pass',
                'iPhone Test',
                { code: '123456', recoveryCode: ' ABCD-EFGH ' },
            );
            assert.equal(withRecovery.recovery_code, 'ABCD-EFGH');
            assert.equal(withRecovery.code, undefined);
        });

        it('classifies 2FA required, invalid 2FA code, rate limit retry_after, and invalid credentials', () => {
            const required = classifyCustomerLoginError({
                status: 403,
                errorCode: 'TWO_FACTOR_REQUIRED',
                message: '2FA required.',
            });
            assert.equal(required.kind, 'two_factor_required');

            const invalidCode = classifyCustomerLoginError({
                status: 422,
                errorCode: 'INVALID_TWO_FACTOR_CODE',
                message: 'Invalid code.',
            });
            assert.equal(invalidCode.kind, 'invalid_two_factor_code');

            const rateLimitedHeader = classifyCustomerLoginError({
                status: 429,
                errorCode: 'RATE_LIMITED',
                retryAfter: 47,
                message: 'Too many attempts.',
            });
            assert.equal(rateLimitedHeader.kind, 'rate_limited');
            if (rateLimitedHeader.kind === 'rate_limited') {
                assert.equal(rateLimitedHeader.retryAfterSeconds, 47);
            }

            const rateLimitedBody = classifyCustomerLoginError({
                status: 429,
                errors: { retry_after: 23.2 },
                message: 'Too many attempts.',
            });
            assert.equal(rateLimitedBody.kind, 'rate_limited');
            if (rateLimitedBody.kind === 'rate_limited') {
                assert.equal(rateLimitedBody.retryAfterSeconds, 24);
            }

            const invalidCreds = classifyCustomerLoginError({
                status: 401,
                errorCode: 'INVALID_CREDENTIALS',
                message: 'Bad password.',
            });
            assert.equal(invalidCreds.kind, 'invalid_credentials');
        });
    });

    describe('2. Environment & Production API Target Safety', () => {
        it('defaults to local loopback URL in non-production environments and rejects production URLs outside production', () => {
            assert.equal(
                resolveApiBaseUrl({ NODE_ENV: 'test' }),
                'http://127.0.0.1:8000/api/v1',
            );
            assert.equal(
                resolveApiOrigin({ NODE_ENV: 'test' }),
                'http://127.0.0.1:8000',
            );

            assert.throws(
                () =>
                    resolveApiBaseUrl({
                        EXPO_PUBLIC_API_URL: 'https://tijum.com/api/v1',
                        EXPO_PUBLIC_ENVIRONMENT: 'production',
                        NODE_ENV: 'test',
                    }),
                (err: unknown) =>
                    err instanceof ApiError &&
                    err.errorCode === 'UNSAFE_PRODUCTION_TARGET',
            );

            assert.throws(
                () =>
                    resolveApiBaseUrl({
                        EXPO_PUBLIC_API_URL: 'https://www.tijum.com/api/v1/',
                        EXPO_PUBLIC_ENVIRONMENT: 'preview',
                        NODE_ENV: 'production',
                    }),
                (err: unknown) =>
                    err instanceof ApiError &&
                    err.errorCode === 'UNSAFE_PRODUCTION_TARGET',
            );

            assert.throws(
                () =>
                    resolveApiBaseUrl({
                        EXPO_PUBLIC_ENVIRONMENT: 'production',
                        NODE_ENV: 'production',
                    }),
                (err: unknown) =>
                    err instanceof ApiError &&
                    err.errorCode === 'MISSING_PRODUCTION_API_URL',
            );

            assert.equal(
                resolveApiBaseUrl({
                    EXPO_PUBLIC_API_URL: 'https://tijum.com/api/v1/',
                    EXPO_PUBLIC_ENVIRONMENT: 'production',
                    NODE_ENV: 'production',
                }),
                'https://tijum.com/api/v1',
            );
            assert.equal(
                resolveApiOrigin({
                    EXPO_PUBLIC_API_URL: 'https://tijum.com/api/v1',
                    EXPO_PUBLIC_ENVIRONMENT: 'production',
                    NODE_ENV: 'production',
                }),
                'https://tijum.com',
            );
        });

        it('configures EAS preview profile on staging and production profile on tijum.com', () => {
            const eas = JSON.parse(
                fs.readFileSync(path.join(mobileRoot, 'eas.json'), 'utf8'),
            );

            assert.equal(
                eas.build.preview.env.EXPO_PUBLIC_API_URL,
                'https://staging.tijum.com/api/v1',
            );
            assert.equal(
                eas.build.preview.env.EXPO_PUBLIC_ENVIRONMENT,
                'preview',
            );
            assert.equal(
                eas.build.production.env.EXPO_PUBLIC_API_URL,
                'https://tijum.com/api/v1',
            );
            assert.equal(
                eas.build.production.env.EXPO_PUBLIC_ENVIRONMENT,
                'production',
            );
        });
    });

    describe('3. Authoritative Booking, Payment, Review & Refund State Helpers', () => {
        it('enforces payment deadline and backend capability flags accurately', () => {
            const nowMs = Date.parse('2026-11-22T12:00:00Z');

            assert.equal(
                canPayReservation(
                    {
                        status: 'awaiting_payment',
                        payment_deadline_at: '2026-11-22T12:10:00Z',
                    },
                    nowMs,
                ),
                true,
            );
            assert.equal(
                canPayReservation(
                    {
                        status: 'awaiting_payment',
                        payment_deadline_at: '2026-11-22T11:55:00Z',
                    },
                    nowMs,
                ),
                false,
            );
            assert.equal(
                canPayReservation(
                    {
                        status: 'awaiting_payment',
                        can_pay: false,
                        payment_deadline_at: '2026-11-22T12:10:00Z',
                    },
                    nowMs,
                ),
                false,
            );
            assert.equal(canPayReservation({ status: 'confirmed' }, nowMs), false);

            assert.equal(
                canCancelReservation({ status: 'confirmed', can_cancel: true }),
                true,
            );
            assert.equal(
                canCancelReservation({ status: 'expired', can_cancel: false }),
                false,
            );

            assert.equal(
                canSubmitReview({
                    status: 'confirmed',
                    is_reviewed: false,
                    review_eligibility: { is_eligible: true },
                }),
                true,
            );
            assert.equal(
                canSubmitReview({
                    status: 'confirmed',
                    is_reviewed: false,
                    review_eligibility: {
                        is_eligible: false,
                        reason: 'Check-in required.',
                    },
                }),
                false,
            );
            assert.equal(
                canSubmitReview({
                    status: 'confirmed',
                    is_reviewed: true,
                    review_eligibility: { is_eligible: true },
                }),
                false,
            );
        });

        it('distinguishes expired reservations, late-capture refund reviews, and verification alerts', () => {
            assert.equal(
                shouldShowRefundSection({
                    status: 'expired',
                    requires_refund_review: true,
                }),
                true,
            );
            assert.equal(
                shouldShowRefundSection({
                    status: 'confirmed',
                    requires_refund_review: false,
                    refunds: [],
                }),
                false,
            );

            assert.match(
                resolveRefundNotice({
                    status: 'expired',
                    requires_refund_review: true,
                }),
                /reviewing it for refund/i,
            );
            assert.match(
                resolveRefundNotice({
                    status: 'expired',
                    requires_refund_review: false,
                    has_captured_payment: false,
                }),
                /15-minute payment window expired/i,
            );

            const reviewAlert = resolvePaymentVerifyAlert({
                status: 'expired',
                requires_refund_review: true,
            });
            assert.equal(reviewAlert.title, 'Payment Under Review');

            const confirmedAlert = resolvePaymentVerifyAlert({
                status: 'confirmed',
                requires_refund_review: false,
            });
            assert.equal(confirmedAlert.title, 'Payment Successful');

            assert.equal(
                resolveReservationListActionRoute('TJM-2026-0001'),
                '/(customer)/bookings/TJM-2026-0001',
            );
        });
    });

    describe('4. Screen & Web Map Source Invariants', () => {
        it('ensures auth, booking, property, and map files enforce Phase 5 guarantees', () => {
            const loginSource = fs.readFileSync(
                path.join(mobileRoot, 'app/(auth)/customer-login.tsx'),
                'utf8',
            );
            assert.ok(loginSource.includes('classifyCustomerLoginError'));
            assert.ok(loginSource.includes('recoveryCode'));
            assert.ok(loginSource.includes('session_expired'));

            const registerSource = fs.readFileSync(
                path.join(mobileRoot, 'app/(auth)/customer-register.tsx'),
                'utf8',
            );
            assert.ok(registerSource.includes('/legal/terms'));
            assert.ok(registerSource.includes('/legal/privacy'));

            const profileSource = fs.readFileSync(
                path.join(mobileRoot, 'app/(customer)/profile/index.tsx'),
                'utf8',
            );
            assert.ok(profileSource.includes('resendEmailVerification'));

            const propertyCardSource = fs.readFileSync(
                path.join(mobileRoot, 'src/components/PropertyCard.tsx'),
                'utf8',
            );
            assert.ok(propertyCardSource.includes('resolveApiOrigin'));
            assert.equal(propertyCardSource.includes('tijum.com'), false);

            const partnerEditSource = fs.readFileSync(
                path.join(mobileRoot, 'app/(partner)/properties/[id]/edit.tsx'),
                'utf8',
            );
            assert.equal(partnerEditSource.includes('500081'), false);

            const slugSource = fs.readFileSync(
                path.join(mobileRoot, 'app/(customer)/explore/property/[slug].tsx'),
                'utf8',
            );
            assert.ok(slugSource.includes('has_coordinates'));
            assert.ok(slugSource.includes('google_maps_url'));
            assert.ok(slugSource.includes('Exact map pin unavailable'));

            const detailSource = fs.readFileSync(
                path.join(mobileRoot, 'app/(customer)/bookings/[reference].tsx'),
                'utf8',
            );
            assert.ok(detailSource.includes('shouldShowRefundSection'));
            assert.ok(detailSource.includes('resolveRefundNotice'));
            assert.ok(detailSource.includes('resolvePaymentVerifyAlert'));
            assert.ok(detailSource.includes('canSubmitReview'));
            assert.equal(detailSource.includes("'payment_pending'"), false);
            assert.equal(detailSource.includes("'checked_out'"), false);

            const partnerDetailSource = fs.readFileSync(
                path.join(mobileRoot, 'app/(partner)/reservations/[reference].tsx'),
                'utf8',
            );
            assert.ok(partnerDetailSource.includes('is_checked_in'));
            assert.ok(partnerDetailSource.includes('checked_in_at'));
            assert.ok(partnerDetailSource.includes('is_checked_out'));
            assert.ok(partnerDetailSource.includes('checked_out_at'));
            assert.equal(partnerDetailSource.includes("'checked_in'"), false);
            assert.equal(partnerDetailSource.includes("'checked_out'"), false);

            const searchMapSource = fs.readFileSync(
                path.join(repoRoot, 'resources/js/components/public/search-map.tsx'),
                'utf8',
            );
            assert.equal(searchMapSource.includes('DEMO_OFFSETS'), false);
        });
    });

    describe('5. ApiClient Non-JSON 5xx, 204 & Envelope Parsing Safety', () => {
        it('normalizes HTML 500 responses into SERVER_ERROR ApiError', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (async () =>
                ({
                    status: 500,
                    statusText: 'Internal Server Error',
                    ok: false,
                    text: async () => '<html><body>500</body></html>',
                    headers: new Headers(),
                }) as unknown as Response) as typeof fetch;

            try {
                await assert.rejects(
                    () => ApiClient.get('/test-500'),
                    (err: unknown) =>
                        err instanceof ApiError &&
                        err.status === 500 &&
                        err.errorCode === 'SERVER_ERROR',
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('returns empty object cleanly on HTTP 204 No Content', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (async () =>
                ({
                    status: 204,
                    statusText: 'No Content',
                    ok: true,
                    text: async () => '',
                    headers: new Headers(),
                }) as unknown as Response) as typeof fetch;

            try {
                const res = await ApiClient.delete('/test-204');
                assert.deepEqual(res, {});
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('rejects HTTP 200 envelope payloads with success: false', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = (async () =>
                ({
                    status: 200,
                    statusText: 'OK',
                    ok: true,
                    text: async () =>
                        JSON.stringify({
                            success: false,
                            message: 'Action rejected by policy',
                            error_code: 'POLICY_DENIED',
                        }),
                    headers: new Headers(),
                }) as unknown as Response) as typeof fetch;

            try {
                await assert.rejects(
                    () => ApiClient.get('/test-envelope-fail'),
                    (err: unknown) =>
                        err instanceof ApiError &&
                        err.errorCode === 'POLICY_DENIED' &&
                        err.message === 'Action rejected by policy',
                );
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });
});
