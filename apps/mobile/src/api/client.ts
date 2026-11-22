import { SecureTokenStorage } from '../auth/SecureTokenStorage.ts';

const PRODUCTION_HOSTS = new Set(['tijum.com', 'www.tijum.com']);
const LOCAL_FALLBACK_BASE_URL = 'http://127.0.0.1:8000/api/v1';
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const MULTIPART_REQUEST_TIMEOUT_MS = 60000;

export interface ApiRequestOptions extends RequestInit {
    skipAuthInterceptor?: boolean;
    timeoutMs?: number;
    idempotencyKey?: string;
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
    unauthorizedHandler = handler;
}

export class ApiError extends Error {
    readonly status: number;
    readonly errorCode?: string;
    readonly errors?: Record<string, any>;
    readonly retryAfter?: number;

    constructor(
        message: string,
        status: number,
        errorCode?: string,
        errors?: Record<string, any>,
        retryAfter?: number,
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errorCode = errorCode;
        this.errors = errors;
        this.retryAfter = retryAfter;
    }
}

export function resolveApiBaseUrl(
    env: Record<string, string | undefined> = typeof process !== 'undefined'
        ? (process.env as Record<string, string | undefined>)
        : {},
): string {
    const rawUrl = env.EXPO_PUBLIC_API_URL?.trim();
    const environment = (env.EXPO_PUBLIC_ENVIRONMENT ?? 'development')
        .trim()
        .toLowerCase();
    const nodeEnv = (env.NODE_ENV ?? '').trim().toLowerCase();

    if (rawUrl) {
        const normalized = rawUrl.replace(/\/+$/, '');
        let hostname = '';
        let protocol = '';
        try {
            const parsedUrl = new URL(normalized);
            hostname = parsedUrl.hostname.toLowerCase();
            protocol = parsedUrl.protocol.toLowerCase();
        } catch {
            hostname = '';
        }

        if (
            (environment === 'production' || environment === 'preview') &&
            protocol !== 'https:'
        ) {
            throw new ApiError(
                `Refusing insecure non-HTTPS API URL while EXPO_PUBLIC_ENVIRONMENT is '${environment}'.`,
                0,
                'INSECURE_API_URL',
            );
        }

        if (
            PRODUCTION_HOSTS.has(hostname) &&
            (nodeEnv === 'test' || environment !== 'production')
        ) {
            throw new ApiError(
                "Refusing to send requests to production API while EXPO_PUBLIC_ENVIRONMENT is not 'production'.",
                0,
                'UNSAFE_PRODUCTION_TARGET',
            );
        }

        return normalized;
    }

    if (environment === 'production') {
        throw new ApiError(
            'EXPO_PUBLIC_API_URL must be explicitly configured for production builds.',
            0,
            'MISSING_PRODUCTION_API_URL',
        );
    }

    return LOCAL_FALLBACK_BASE_URL;
}

export function resolveApiOrigin(
    env: Record<string, string | undefined> = typeof process !== 'undefined'
        ? (process.env as Record<string, string | undefined>)
        : {},
): string {
    return resolveApiBaseUrl(env).replace(/\/api\/v1\/?$/, '');
}

function parseRetryAfterSeconds(
    response: Response,
    json: any,
): number | undefined {
    const rawHeader = response.headers?.get?.('Retry-After');
    if (rawHeader) {
        const parsedHeader = Number(rawHeader);
        if (Number.isFinite(parsedHeader) && parsedHeader > 0) {
            return Math.ceil(parsedHeader);
        }
        const parsedDateMs = Date.parse(rawHeader);
        if (!Number.isNaN(parsedDateMs)) {
            const deltaSeconds = Math.ceil((parsedDateMs - Date.now()) / 1000);
            if (deltaSeconds > 0) {
                return deltaSeconds;
            }
        }
    }

    const bodyRetry = json?.errors?.retry_after;
    if (typeof bodyRetry === 'number' && Number.isFinite(bodyRetry) && bodyRetry > 0) {
        return Math.ceil(bodyRetry);
    }

    if (response.status === 429 && typeof json?.message === 'string') {
        const match = json.message.match(/(\d+)\s+seconds?/i);
        if (match) {
            const parsedMessage = Number(match[1]);
            if (Number.isFinite(parsedMessage) && parsedMessage > 0) {
                return parsedMessage;
            }
        }
    }

    return undefined;
}

function normalizeHeaders(headersInit?: HeadersInit): Record<string, string> {
    const record: Record<string, string> = {};
    if (!headersInit) {
        return record;
    }
    if (typeof Headers !== 'undefined' && headersInit instanceof Headers) {
        headersInit.forEach((value, key) => {
            record[key] = value;
        });
        return record;
    }
    if (Array.isArray(headersInit)) {
        headersInit.forEach(([key, value]) => {
            record[key] = value;
        });
        return record;
    }
    Object.assign(record, headersInit);
    return record;
}

function buildQueryString(queryParams?: Record<string, any>): string {
    if (!queryParams) {
        return '';
    }
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') {
            return;
        }
        if (Array.isArray(v)) {
            const arrayKey = k.endsWith('[]') ? k : `${k}[]`;
            v.forEach((item) => {
                if (item !== undefined && item !== null && item !== '') {
                    params.append(arrayKey, String(item));
                }
            });
            return;
        }
        params.append(k, String(v));
    });
    return params.toString();
}

export class ApiClient {
    private static getBaseUrl(): string {
        return resolveApiBaseUrl();
    }

    static async request<T>(
        endpoint: string,
        options: ApiRequestOptions = {},
    ): Promise<T> {
        const {
            skipAuthInterceptor = false,
            timeoutMs,
            idempotencyKey,
            ...fetchOptions
        } = options;
        const baseUrl = this.getBaseUrl();
        const cleanEndpoint = endpoint.startsWith('/')
            ? endpoint.slice(1)
            : endpoint;
        const url = `${baseUrl}/${cleanEndpoint}`;

        const callerHeaders = normalizeHeaders(fetchOptions.headers);
        const hasExplicitAuthorization = Object.keys(callerHeaders).some(
            (key) => key.toLowerCase() === 'authorization',
        );
        const token = hasExplicitAuthorization
            ? null
            : await SecureTokenStorage.getToken();
        const requestId = 'req_' + Math.random().toString(36).substring(2, 11);
        const isFormData =
            typeof FormData !== 'undefined' &&
            fetchOptions.body instanceof FormData;

        const headers: Record<string, string> = {
            Accept: 'application/json',
            'X-Request-ID': requestId,
            ...callerHeaders,
        };

        const method = (fetchOptions.method || 'GET').toUpperCase();
        if (
            !isFormData &&
            !headers['Content-Type'] &&
            (fetchOptions.body || ['POST', 'PUT', 'PATCH'].includes(method))
        ) {
            headers['Content-Type'] = 'application/json';
        }

        if (idempotencyKey && !headers['Idempotency-Key']) {
            headers['Idempotency-Key'] = idempotencyKey;
        }

        if (!hasExplicitAuthorization && token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const effectiveTimeout =
            timeoutMs ??
            (isFormData
                ? MULTIPART_REQUEST_TIMEOUT_MS
                : DEFAULT_REQUEST_TIMEOUT_MS);
        const controller =
            typeof AbortController !== 'undefined'
                ? new AbortController()
                : null;
        let timedOut = false;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        const externalSignal = fetchOptions.signal;
        const onExternalAbort = () => controller?.abort();

        if (controller) {
            if (externalSignal?.aborted) {
                controller.abort();
            } else if (externalSignal) {
                externalSignal.addEventListener('abort', onExternalAbort);
            }
            if (effectiveTimeout > 0 && Number.isFinite(effectiveTimeout)) {
                timeoutHandle = setTimeout(() => {
                    timedOut = true;
                    controller.abort();
                }, effectiveTimeout);
            }
        }

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                headers,
                signal: controller ? controller.signal : fetchOptions.signal,
            });

            if (response.status === 204) {
                return {} as T;
            }

            const rawText = await response.text();
            let json: any = null;
            if (rawText) {
                try {
                    json = JSON.parse(rawText);
                } catch {
                    json = null;
                }
            }

            if (!response.ok) {
                if (
                    response.status === 401 &&
                    token &&
                    !skipAuthInterceptor &&
                    !hasExplicitAuthorization
                ) {
                    // Token expired or revoked: purge it and let the auth layer react.
                    await SecureTokenStorage.clearActiveSession();
                    unauthorizedHandler?.();
                }

                const fallbackMessage =
                    response.status >= 500
                        ? `Server error (${response.status}). Please try again later.`
                        : `Request failed with status ${response.status}.`;
                const retryAfter = parseRetryAfterSeconds(response, json);

                throw new ApiError(
                    json?.message || fallbackMessage,
                    response.status,
                    json?.error_code ||
                        json?.error ||
                        (response.status >= 500
                            ? 'SERVER_ERROR'
                            : 'HTTP_ERROR'),
                    json?.errors,
                    retryAfter,
                );
            }

            // Explicit server-side failure on a 2xx HTTP status: reject the envelope.
            if (json && typeof json === 'object' && json.success === false) {
                throw new ApiError(
                    json?.message || 'Request failed.',
                    response.status,
                    json?.error_code || 'API_ERROR',
                    json?.errors,
                );
            }

            return (json ?? ({} as any)) as T;
        } catch (err: any) {
            if (err instanceof ApiError) {
                throw err;
            }
            if (timedOut) {
                throw new ApiError(
                    'Request timed out. Please check your connection and try again.',
                    0,
                    'TIMEOUT_ERROR',
                );
            }
            throw new ApiError(
                err.message ||
                    'Network request failed. Please check your internet connection.',
                0,
                'NETWORK_ERROR',
            );
        } finally {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
            if (externalSignal) {
                externalSignal.removeEventListener('abort', onExternalAbort);
            }
        }
    }

    static async get<T>(
        endpoint: string,
        queryParams?: Record<string, any>,
        requestOptions?: Omit<ApiRequestOptions, 'method' | 'body'>,
    ): Promise<T> {
        let url = endpoint;
        const query = buildQueryString(queryParams);
        if (query) {
            url += (endpoint.includes('?') ? '&' : '?') + query;
        }
        return this.request<T>(url, { ...requestOptions, method: 'GET' });
    }

    static async post<T>(
        endpoint: string,
        body?: any,
        requestOptions?: Omit<ApiRequestOptions, 'method' | 'body'>,
    ): Promise<T> {
        const isFormData =
            typeof FormData !== 'undefined' && body instanceof FormData;
        return this.request<T>(endpoint, {
            ...requestOptions,
            method: 'POST',
            body: isFormData
                ? body
                : body !== undefined
                  ? JSON.stringify(body)
                  : undefined,
        });
    }

    static async postFormData<T>(
        endpoint: string,
        formData: FormData,
        requestOptions?: Omit<ApiRequestOptions, 'method' | 'body'>,
    ): Promise<T> {
        return this.request<T>(endpoint, {
            ...requestOptions,
            method: 'POST',
            body: formData,
        });
    }

    static async put<T>(
        endpoint: string,
        body?: any,
        requestOptions?: Omit<ApiRequestOptions, 'method' | 'body'>,
    ): Promise<T> {
        return this.request<T>(endpoint, {
            ...requestOptions,
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    static async patch<T>(
        endpoint: string,
        body?: any,
        requestOptions?: Omit<ApiRequestOptions, 'method' | 'body'>,
    ): Promise<T> {
        return this.request<T>(endpoint, {
            ...requestOptions,
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    static async delete<T>(
        endpoint: string,
        queryParams?: Record<string, any>,
        requestOptions?: Omit<ApiRequestOptions, 'method' | 'body'>,
    ): Promise<T> {
        let url = endpoint;
        const query = buildQueryString(queryParams);
        if (query) {
            url += (endpoint.includes('?') ? '&' : '?') + query;
        }
        return this.request<T>(url, { ...requestOptions, method: 'DELETE' });
    }
}
