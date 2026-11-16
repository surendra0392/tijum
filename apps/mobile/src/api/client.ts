import { SecureTokenStorage } from '../auth/SecureTokenStorage.ts';

const DEFAULT_BASE_URL = 'https://tijum.com/api/v1';

export class ApiError extends Error {
    readonly status: number;
    readonly errorCode?: string;
    readonly errors?: Record<string, string[]>;

    constructor(
        message: string,
        status: number,
        errorCode?: string,
        errors?: Record<string, string[]>,
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errorCode = errorCode;
        this.errors = errors;
    }
}

export class ApiClient {
    private static getBaseUrl(): string {
        return process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL;
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

        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            ...(options.headers as Record<string, string>),
        };

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
                if (response.status === 401) {
                    // Token expired or invalid
                    await SecureTokenStorage.clearAll();
                }

                const fallbackMessage =
                    response.status >= 500
                        ? `Server error (${response.status}). Please try again later.`
                        : `Request failed with status ${response.status}.`;

                throw new ApiError(
                    json?.message || fallbackMessage,
                    response.status,
                    json?.error_code ||
                        json?.error ||
                        (response.status >= 500
                            ? 'SERVER_ERROR'
                            : 'HTTP_ERROR'),
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
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    static async put<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    static async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}
