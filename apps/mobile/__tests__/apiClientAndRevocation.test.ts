import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    ApiClient,
    ApiError,
    resolveApiBaseUrl,
    setUnauthorizedHandler,
} from '../src/api/client.ts';
import {
    SecureTokenStorage,
    type StorageEngine,
} from '../src/auth/SecureTokenStorage.ts';

const mem: Record<string, string> = {};
const memoryEngine: StorageEngine = {
    getItemAsync: async (k) => mem[k] ?? null,
    setItemAsync: async (k, v) => {
        mem[k] = v;
    },
    deleteItemAsync: async (k) => {
        delete mem[k];
    },
};

describe('Behavioral Suite 1: ApiClient HTTP Lifecycle, FormData & Session Revocation', () => {
    it('attaches Bearer token and parses standard Laravel JSON envelope on 200 OK', async () => {
        SecureTokenStorage.setStorageEngineForTesting(memoryEngine);
        await SecureTokenStorage.setActiveSession(
            'test-sanctum-token-123',
            'customer',
        );
        const originalFetch = globalThis.fetch;
        let capturedHeaders: Record<string, string> = {};

        globalThis.fetch = (async (
            _input: RequestInfo | URL,
            init?: RequestInit,
        ) => {
            capturedHeaders = (init?.headers as Record<string, string>) || {};
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Profile fetched',
                    data: { id: 7, name: 'Aarav Rao', account_type: 'customer' },
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }) as typeof fetch;

        try {
            const res = await ApiClient.get<{
                success: boolean;
                data: { id: number; name: string };
            }>('customer/profile');
            assert.equal(res.data.id, 7);
            assert.equal(res.data.name, 'Aarav Rao');
            assert.equal(
                capturedHeaders.Authorization,
                'Bearer test-sanctum-token-123',
            );
            assert.equal(capturedHeaders.Accept, 'application/json');
        } finally {
            globalThis.fetch = originalFetch;
            await SecureTokenStorage.clearActiveSession();
        }
    });

    it('triggers unauthorizedHandler on HTTP 401 when authenticated', async () => {
        await SecureTokenStorage.setActiveSession(
            'expired-token-999',
            'customer',
        );
        const originalFetch = globalThis.fetch;
        let unauthorizedTriggered = false;

        setUnauthorizedHandler(() => {
            unauthorizedTriggered = true;
        });

        globalThis.fetch = (async () =>
            new Response(
                JSON.stringify({
                    success: false,
                    message: 'Unauthenticated.',
                    error_code: 'UNAUTHENTICATED',
                }),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' },
                },
            )) as typeof fetch;

        try {
            await assert.rejects(
                async () => {
                    await ApiClient.get('customer/reservations');
                },
                (err: unknown) => {
                    assert.ok(err instanceof ApiError);
                    assert.equal(err.status, 401);
                    return true;
                },
            );
            assert.equal(unauthorizedTriggered, true);
        } finally {
            globalThis.fetch = originalFetch;
            setUnauthorizedHandler(null);
            await SecureTokenStorage.clearActiveSession();
        }
    });

    it('rejects non-HTTPS API URLs when EXPO_PUBLIC_ENVIRONMENT is production or preview', () => {
        assert.throws(
            () => {
                resolveApiBaseUrl({
                    EXPO_PUBLIC_ENVIRONMENT: 'production',
                    EXPO_PUBLIC_API_URL: 'http://tijum.com/api/v1',
                    NODE_ENV: 'production',
                });
            },
            (err: unknown) => {
                assert.ok(err instanceof ApiError);
                assert.equal(err.errorCode, 'INSECURE_API_URL');
                return true;
            },
        );
    });

    it('sends multipart FormData without overriding Content-Type boundary header', async () => {
        await SecureTokenStorage.setActiveSession('owner-upload-token', 'owner');
        const originalFetch = globalThis.fetch;
        let capturedHeaders: Record<string, string> = {};

        globalThis.fetch = (async (
            _input: RequestInfo | URL,
            init?: RequestInit,
        ) => {
            capturedHeaders = (init?.headers as Record<string, string>) || {};
            return new Response(
                JSON.stringify({
                    success: true,
                    data: { id: 55, media_category: 'exterior', is_cover: true },
                }),
                {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                },
            );
        }) as typeof fetch;

        try {
            const form = new FormData();
            form.append('media_category', 'exterior');
            form.append('alt_text', 'Front elevation photo');
            const res = await ApiClient.postFormData<{
                success: boolean;
                data: { id: number; is_cover: boolean };
            }>('owner/properties/12/media', form);

            assert.equal(res.data.id, 55);
            assert.equal(
                'Content-Type' in capturedHeaders,
                false,
                'FormData request must let fetch generate multipart boundary header automatically',
            );
            assert.equal(
                capturedHeaders.Authorization,
                'Bearer owner-upload-token',
            );
        } finally {
            globalThis.fetch = originalFetch;
            await SecureTokenStorage.clearActiveSession();
        }
    });

    it('extracts field-level 422 validation errors into ApiError', async () => {
        const originalFetch = globalThis.fetch;

        globalThis.fetch = (async () =>
            new Response(
                JSON.stringify({
                    success: false,
                    message: 'The given data was invalid.',
                    error_code: 'VALIDATION_ERROR',
                    errors: {
                        pan_number: ['The PAN number format is invalid.'],
                    },
                }),
                {
                    status: 422,
                    headers: { 'Content-Type': 'application/json' },
                },
            )) as typeof fetch;

        try {
            await assert.rejects(
                async () => {
                    await ApiClient.put('owner/financial-profile', {
                        pan_number: 'INVALID',
                    });
                },
                (err: unknown) => {
                    assert.ok(err instanceof ApiError);
                    assert.equal(err.status, 422);
                    assert.deepEqual(err.errors?.pan_number, [
                        'The PAN number format is invalid.',
                    ]);
                    return true;
                },
            );
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
