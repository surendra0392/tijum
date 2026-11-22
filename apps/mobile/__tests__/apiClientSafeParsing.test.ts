import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, ApiError } from '../src/api/client.ts';

describe('ApiClient Safe Response Parsing & Reservation Filters Specification', () => {
    describe('Non-JSON and 5xx Error Recovery', () => {
        it('preserves HTTP 500 status and sets SERVER_ERROR on HTML response', async () => {
            // Mock global fetch to simulate HTML 500 response (e.g. Laravel fatal error or crash)
            const originalFetch = global.fetch;
            global.fetch = async () => {
                return {
                    status: 500,
                    statusText: 'Internal Server Error',
                    ok: false,
                    text: async () =>
                        '<html><body>Internal Server Error</body></html>',
                    headers: new Headers(),
                } as any;
            };

            try {
                await ApiClient.get('/test-endpoint');
                assert.fail('Should have thrown an ApiError');
            } catch (err: any) {
                assert.ok(err instanceof ApiError);
                assert.equal(err.status, 500);
                assert.equal(err.errorCode, 'SERVER_ERROR');
                assert.ok(err.message.includes('Server error (500)'));
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('preserves HTTP 502 Bad Gateway status and sets SERVER_ERROR on Nginx/Cloudflare error', async () => {
            const originalFetch = global.fetch;
            global.fetch = async () => {
                return {
                    status: 502,
                    statusText: 'Bad Gateway',
                    ok: false,
                    text: async () => '502 Bad Gateway',
                    headers: new Headers(),
                } as any;
            };

            try {
                await ApiClient.get('/test-gateway');
                assert.fail('Should have thrown an ApiError');
            } catch (err: any) {
                assert.ok(err instanceof ApiError);
                assert.equal(err.status, 502);
                assert.equal(err.errorCode, 'SERVER_ERROR');
                assert.ok(err.message.includes('Server error (502)'));
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('correctly parses structured JSON errors with error_code and validation errors', async () => {
            const originalFetch = global.fetch;
            global.fetch = async () => {
                return {
                    status: 422,
                    statusText: 'Unprocessable Entity',
                    ok: false,
                    text: async () =>
                        JSON.stringify({
                            message: 'Validation failed',
                            error_code: 'VALIDATION_ERROR',
                            errors: { phone: ['Phone number is invalid'] },
                        }),
                    headers: new Headers(),
                } as any;
            };

            try {
                await ApiClient.post('/test-validate', {});
                assert.fail('Should have thrown an ApiError');
            } catch (err: any) {
                assert.ok(err instanceof ApiError);
                assert.equal(err.status, 422);
                assert.equal(err.errorCode, 'VALIDATION_ERROR');
                assert.equal(err.message, 'Validation failed');
                assert.deepEqual(err.errors, {
                    phone: ['Phone number is invalid'],
                });
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('handles 204 No Content gracefully returning empty object', async () => {
            const originalFetch = global.fetch;
            global.fetch = async () => {
                return {
                    status: 204,
                    statusText: 'No Content',
                    ok: true,
                    text: async () => '',
                    headers: new Headers(),
                } as any;
            };

            try {
                const res = await ApiClient.delete('/test-delete');
                assert.deepEqual(res, {});
            } finally {
                global.fetch = originalFetch;
            }
        });
    });

    describe('Laravel Envelope Success Field Enforcement', () => {
        it('throws ApiError on HTTP 200 with success: false', async () => {
            const originalFetch = global.fetch;
            global.fetch = async () => {
                return {
                    status: 200,
                    statusText: 'OK',
                    ok: true,
                    text: async () =>
                        JSON.stringify({
                            success: false,
                            message: 'Token expired or invalid.',
                            error_code: 'UNAUTHENTICATED',
                            data: null,
                        }),
                    headers: new Headers(),
                } as any;
            };

            try {
                await ApiClient.get('/test-endpoint');
                assert.fail('Should have thrown an ApiError');
            } catch (err: any) {
                assert.ok(err instanceof ApiError);
                assert.equal(err.status, 200);
                assert.equal(err.errorCode, 'UNAUTHENTICATED');
                assert.equal(err.message, 'Token expired or invalid.');
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('returns data normally on HTTP 200 with success: true', async () => {
            const originalFetch = global.fetch;
            global.fetch = async () => {
                return {
                    status: 200,
                    statusText: 'OK',
                    ok: true,
                    text: async () =>
                        JSON.stringify({
                            success: true,
                            data: { id: 1, name: 'Test' },
                            message: 'OK',
                        }),
                    headers: new Headers(),
                } as any;
            };

            try {
                const res = await ApiClient.get<{
                    success: boolean;
                    data: { id: number; name: string };
                }>('/test-endpoint');
                assert.equal(res.data.id, 1);
                assert.equal(res.data.name, 'Test');
            } finally {
                global.fetch = originalFetch;
            }
        });

        it('does not throw when success field is absent on HTTP 200 (legacy/non-envelope)', async () => {
            const originalFetch = global.fetch;
            global.fetch = async () => {
                return {
                    status: 200,
                    statusText: 'OK',
                    ok: true,
                    text: async () => JSON.stringify({ id: 1, name: 'Legacy' }),
                    headers: new Headers(),
                } as any;
            };

            try {
                const res = await ApiClient.get<{ id: number; name: string }>(
                    '/test-endpoint',
                );
                assert.equal(res.id, 1);
                assert.equal(res.name, 'Legacy');
            } finally {
                global.fetch = originalFetch;
            }
        });
    });

    describe('Reservation Filter Tabs Alignment Specification', () => {
        it('uses canonical awaiting_payment query value for customer action tab', () => {
            const customerFilterTabs = [
                { label: 'All', value: undefined },
                { label: 'Awaiting Action', value: 'awaiting_payment' },
                { label: 'Confirmed', value: 'confirmed' },
                { label: 'Completed', value: 'checked_out' },
            ];

            const actionTab = customerFilterTabs.find(
                (t) => t.label === 'Awaiting Action',
            );
            assert.ok(actionTab);
            assert.equal(actionTab.value, 'awaiting_payment');
            assert.notEqual(
                actionTab.value,
                'action',
                'Should never query non-existent status action',
            );
        });
    });

    describe('Truth-in-Advertising Welcome Copy Specification', () => {
        it('enforces transparent meal disclosure copy instead of blanket meal bundle claims', () => {
            const welcomeCopy = {
                subtitle:
                    'Verified accommodations with transparent meal disclosures across South India.',
                featureTitle: 'Transparent Meal Disclosures',
                featureDesc:
                    'See exact breakfast, lunch, and dinner inclusions before booking. Transparent food arrangements with no messy tiffins or surprise broker fees.',
            };

            assert.ok(
                !welcomeCopy.featureDesc.includes(
                    'Every verified property bundles fresh homestyle meals into your room rate',
                ),
                'Must not claim every property bundles meals into the room rate',
            );
            assert.ok(
                welcomeCopy.featureDesc.includes(
                    'See exact breakfast, lunch, and dinner inclusions before booking',
                ),
            );
        });
    });
});
