import { SecureTokenStorage } from '../auth/SecureTokenStorage.ts';

const PRODUCTION_HOSTS = new Set(['tijum.com', 'www.tijum.com']);
const LOCAL_FALLBACK_BASE_URL = 'http://127.0.0.1:8000/api/v1';

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
        try {
            hostname = new URL(normalized).hostname.toLowerCase();
        } catch {
            hostname = '';
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

export class ApiClient {
    private static getBaseUrl(): string {
        return resolveApiBaseUrl();
    }

    static async request<T>(
        endpoint: string,
        options: RequestInit = {},
    ): Promise<T> {
        const baseUrl = this.getBaseUrl();
        const cleanEndpoint = endpoint.startsWith('/')
            ? endpoint.slice(1)
            : endpoint;
        const url = `${baseUrl}/${cleanEndpoint}`;

        const token = await SecureTokenStorage.getToken();
        const requestId = 'req_' + Math.random().toString(36).substring(2, 11);
        const isFormData =
            typeof FormData !== 'undefined' && options.body instanceof FormData;

        const headers: Record<string, string> = {
            Accept: 'application/json',
            'X-Request-ID': requestId,
            ...(options.headers as Record<string, string>),
        };

        const method = (options.method || 'GET').toUpperCase();
        if (
            !isFormData &&
            !headers['Content-Type'] &&
            (options.body || ['POST', 'PUT', 'PATCH'].includes(method))
        ) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
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
                if (response.status === 401 && token) {
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
            throw new ApiError(
                err.message ||
                    'Network request failed. Please check your internet connection.',
                0,
                'NETWORK_ERROR',
            );
        }
    }

    static async get<T>(
        endpoint: string,
        queryParams?: Record<string, any>,
    ): Promise<T> {
        let url = endpoint;
        if (queryParams) {
            const filtered: Record<string, string> = {};
            Object.entries(queryParams).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') {
                    filtered[k] = String(v);
                }
            });
            const query = new URLSearchParams(filtered).toString();
            if (query) {
                url += (endpoint.includes('?') ? '&' : '?') + query;
            }
        }
        return this.request<T>(url, { method: 'GET' });
    }

    static async post<T>(endpoint: string, body?: any): Promise<T> {
        const isFormData =
            typeof FormData !== 'undefined' && body instanceof FormData;
        return this.request<T>(endpoint, {
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
    ): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: formData,
        });
    }

    static async put<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    static async patch<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    static async delete<T>(
        endpoint: string,
        queryParams?: Record<string, any>,
    ): Promise<T> {
        let url = endpoint;
        if (queryParams) {
            const filtered: Record<string, string> = {};
            Object.entries(queryParams).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') {
                    filtered[k] = String(v);
                }
            });
            const query = new URLSearchParams(filtered).toString();
            if (query) {
                url += (endpoint.includes('?') ? '&' : '?') + query;
            }
        }
        return this.request<T>(url, { method: 'DELETE' });
    }
}
