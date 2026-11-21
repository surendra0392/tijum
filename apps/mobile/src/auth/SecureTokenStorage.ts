/**
 * Storage adapter interface for secure key-value persistence.
 * Defaults to expo-secure-store in production; can be injected for testing.
 */
export interface StorageEngine {
    getItemAsync(key: string): Promise<string | null>;
    setItemAsync(key: string, value: string): Promise<void>;
    deleteItemAsync(key: string): Promise<void>;
}

export class StorageWriteError extends Error {
    readonly cause?: unknown;

    constructor(message: string, cause?: unknown) {
        super(message);
        this.name = 'StorageWriteError';
        this.cause = cause;
    }
}

const inMemoryStore: Record<string, string> = {};

const webStorage: StorageEngine = {
    getItemAsync: async (key: string) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
        } catch {}
        return inMemoryStore[key] ?? null;
    },
    setItemAsync: async (key: string, value: string) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
                return;
            }
        } catch {}
        inMemoryStore[key] = value;
    },
    deleteItemAsync: async (key: string) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
                return;
            }
        } catch {}
        delete inMemoryStore[key];
    },
};

let nativeSecureStore: StorageEngine;
try {
    if (
        typeof window !== 'undefined' &&
        typeof window.localStorage !== 'undefined'
    ) {
        nativeSecureStore = webStorage;
    } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const secureStore = require('expo-secure-store');
        nativeSecureStore = {
            getItemAsync: async (key: string) => {
                try {
                    return await secureStore.getItemAsync(key);
                } catch {
                    return webStorage.getItemAsync(key);
                }
            },
            setItemAsync: async (key: string, value: string) => {
                try {
                    await secureStore.setItemAsync(key, value);
                } catch {
                    await webStorage.setItemAsync(key, value);
                }
            },
            deleteItemAsync: async (key: string) => {
                try {
                    await secureStore.deleteItemAsync(key);
                } catch {
                    await webStorage.deleteItemAsync(key);
                }
            },
        };
    }
} catch {
    nativeSecureStore = webStorage;
}

let activeStorage: StorageEngine = nativeSecureStore;

/**
 * Single Active Session Keys
 * Only ONE authenticated principal is permitted in the mobile client at any time.
 */
const ACTIVE_SESSION_TOKEN_KEY = 'tijum_active_session_token';
const ACTIVE_PRINCIPAL_TYPE_KEY = 'tijum_active_principal_type';
const ACTIVE_DEVICE_SESSION_ID_KEY = 'tijum_active_device_session_id';
const PENDING_REVOCATIONS_QUEUE_KEY = 'tijum_pending_revocations_queue';
// Legacy single-item key for backward migration
const LEGACY_PENDING_REVOCATION_KEY = 'tijum_pending_revocation_token';

// Legacy keys for migration/cleanup
const LEGACY_TOKEN_KEY = 'tijum_mobile_auth_token';
const LEGACY_ACCOUNT_TYPE_KEY = 'tijum_mobile_account_type';

export const MAX_REVOCATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const MAX_REVOCATION_RETRIES = 10;

export type PrincipalType = 'customer' | 'owner';

export interface ActiveSessionRecord {
    token: string;
    principalType: PrincipalType;
    deviceSessionId: string;
}

export interface RevocationQueueItem {
    token: string;
    principalType: PrincipalType;
    recordedAt: number;
    retryCount?: number;
    lastError?: string;
}

export class SecureTokenStorage {
    private static queueLock: Promise<void> = Promise.resolve();

    /**
     * Inject mock storage engine for automated tests without native bridge dependencies.
     */
    static setStorageEngineForTesting(engine: StorageEngine | null): void {
        activeStorage = engine ?? nativeSecureStore;
    }

    /**
     * Retrieve active session record if present.
     */
    static async getActiveSession(): Promise<ActiveSessionRecord | null> {
        try {
            // Clean up any legacy multi-slot tokens first
            await this.cleanupLegacySlots();

            const token = await activeStorage.getItemAsync(
                ACTIVE_SESSION_TOKEN_KEY,
            );
            const principalType = (await activeStorage.getItemAsync(
                ACTIVE_PRINCIPAL_TYPE_KEY,
            )) as PrincipalType | null;

            if (
                !token ||
                !principalType ||
                (principalType !== 'customer' && principalType !== 'owner')
            ) {
                return null;
            }

            const deviceSessionId = await this.getDeviceSessionId();

            return {
                token,
                principalType,
                deviceSessionId,
            };
        } catch (err) {
            console.warn(
                '[SecureTokenStorage] SecureStore read failure in getActiveSession:',
                err,
            );
            return null;
        }
    }

    /**
     * Save a single active authenticated session.
     * Overwrites and purges any prior session context.
     */
    static async setActiveSession(
        token: string,
        principalType: PrincipalType,
    ): Promise<void> {
        const deviceSessionId =
            'sess_' +
            Math.random().toString(36).substring(2, 12) +
            '_' +
            Date.now();

        try {
            await Promise.all([
                activeStorage.setItemAsync(ACTIVE_SESSION_TOKEN_KEY, token),
                activeStorage.setItemAsync(
                    ACTIVE_PRINCIPAL_TYPE_KEY,
                    principalType,
                ),
                activeStorage.setItemAsync(
                    ACTIVE_DEVICE_SESSION_ID_KEY,
                    deviceSessionId,
                ),
                // Clean up legacy keys
                this.cleanupLegacySlots(),
            ]);
        } catch (err) {
            console.warn(
                '[SecureTokenStorage] SecureStore write failure in setActiveSession, saving to fallback:',
                err,
            );
            try {
                await Promise.all([
                    webStorage.setItemAsync(ACTIVE_SESSION_TOKEN_KEY, token),
                    webStorage.setItemAsync(
                        ACTIVE_PRINCIPAL_TYPE_KEY,
                        principalType,
                    ),
                    webStorage.setItemAsync(
                        ACTIVE_DEVICE_SESSION_ID_KEY,
                        deviceSessionId,
                    ),
                ]);
            } catch {
                inMemoryStore[ACTIVE_SESSION_TOKEN_KEY] = token;
                inMemoryStore[ACTIVE_PRINCIPAL_TYPE_KEY] = principalType;
                inMemoryStore[ACTIVE_DEVICE_SESSION_ID_KEY] = deviceSessionId;
            }
        }
    }

    /**
     * Clear active session upon logout or session expiration.
     * Resilient to delete failures: warns but guarantees local completion.
     */
    static async clearActiveSession(): Promise<void> {
        try {
            await Promise.all([
                activeStorage
                    .deleteItemAsync(ACTIVE_SESSION_TOKEN_KEY)
                    .catch((e) => {
                        console.warn(
                            '[SecureTokenStorage] Delete failure for active session token:',
                            e,
                        );
                    }),
                activeStorage
                    .deleteItemAsync(ACTIVE_PRINCIPAL_TYPE_KEY)
                    .catch((e) => {
                        console.warn(
                            '[SecureTokenStorage] Delete failure for principal type:',
                            e,
                        );
                    }),
                activeStorage
                    .deleteItemAsync(ACTIVE_DEVICE_SESSION_ID_KEY)
                    .catch((e) => {
                        console.warn(
                            '[SecureTokenStorage] Delete failure for device session ID:',
                            e,
                        );
                    }),
                this.cleanupLegacySlots(),
            ]);
        } catch (err) {
            console.warn(
                '[SecureTokenStorage] Error during clearActiveSession:',
                err,
            );
        }
    }

    /**
     * Retrieve the full queue of pending offline revocations.
     * Self-healing: parses valid entries, drops corrupted ones, and migrates legacy tokens.
     */
    static async getPendingRevocationQueue(): Promise<RevocationQueueItem[]> {
        try {
            let queue: RevocationQueueItem[] = [];
            const rawQueue = await activeStorage.getItemAsync(
                PENDING_REVOCATIONS_QUEUE_KEY,
            );
            if (rawQueue) {
                try {
                    const parsed = JSON.parse(rawQueue);
                    if (Array.isArray(parsed)) {
                        let healed = false;
                        for (const item of parsed) {
                            if (
                                item &&
                                typeof item === 'object' &&
                                typeof item.token === 'string' &&
                                item.token.trim().length > 0 &&
                                (item.principalType === 'customer' ||
                                    item.principalType === 'owner')
                            ) {
                                queue.push({
                                    token: item.token,
                                    principalType: item.principalType,
                                    recordedAt:
                                        typeof item.recordedAt === 'number'
                                            ? item.recordedAt
                                            : Date.now(),
                                    retryCount:
                                        typeof item.retryCount === 'number'
                                            ? item.retryCount
                                            : 0,
                                    lastError: item.lastError,
                                });
                            } else {
                                healed = true;
                                console.warn(
                                    '[SecureTokenStorage] Self-healing: dropping corrupted queue entry:',
                                    item,
                                );
                            }
                        }
                        if (healed) {
                            await activeStorage
                                .setItemAsync(
                                    PENDING_REVOCATIONS_QUEUE_KEY,
                                    JSON.stringify(queue),
                                )
                                .catch(() => {});
                        }
                    } else {
                        console.warn(
                            '[SecureTokenStorage] Self-healing: revocation queue was not an array; resetting.',
                        );
                        await activeStorage
                            .deleteItemAsync(PENDING_REVOCATIONS_QUEUE_KEY)
                            .catch(() => {});
                    }
                } catch (jsonErr) {
                    console.warn(
                        '[SecureTokenStorage] Self-healing: malformed JSON in revocation queue; purging corrupt entry:',
                        jsonErr,
                    );
                    await activeStorage
                        .deleteItemAsync(PENDING_REVOCATIONS_QUEUE_KEY)
                        .catch(() => {});
                }
            }

            // Check legacy single-slot key for migration
            try {
                const legacyRaw = await activeStorage.getItemAsync(
                    LEGACY_PENDING_REVOCATION_KEY,
                );
                if (legacyRaw) {
                    try {
                        const legacyItem = JSON.parse(legacyRaw);
                        if (
                            legacyItem &&
                            legacyItem.token &&
                            !queue.some((i) => i.token === legacyItem.token)
                        ) {
                            queue.push({
                                token: legacyItem.token,
                                principalType:
                                    legacyItem.principalType === 'owner'
                                        ? 'owner'
                                        : 'customer',
                                recordedAt: legacyItem.recordedAt || Date.now(),
                                retryCount: 0,
                            });
                            await activeStorage.setItemAsync(
                                PENDING_REVOCATIONS_QUEUE_KEY,
                                JSON.stringify(queue),
                            );
                        }
                    } catch {}
                    await activeStorage
                        .deleteItemAsync(LEGACY_PENDING_REVOCATION_KEY)
                        .catch(() => {});
                }
            } catch {}

            return queue;
        } catch (readErr) {
            console.warn(
                '[SecureTokenStorage] SecureStore read failure in getPendingRevocationQueue:',
                readErr,
            );
            return [];
        }
    }

    /**
     * Record a token requiring server-side revocation reconciliation in persistent FIFO queue.
     * Retains multiple offline logouts without overwriting previous events.
     * Serialized via internal promise queue lock to prevent read-modify-write race corruption.
     * Throws StorageWriteError upon persistent write failure so caller can respond appropriately.
     */
    static async recordPendingRevocation(
        token: string,
        principalType: PrincipalType,
    ): Promise<boolean> {
        let succeeded = false;
        let thrownError: unknown = null;

        const operation = this.queueLock
            .then(async () => {
                try {
                    const queue = await this.getPendingRevocationQueue();
                    // Deduplicate by token
                    const filtered = queue.filter(
                        (item) => item.token !== token,
                    );
                    filtered.push({
                        token,
                        principalType,
                        recordedAt: Date.now(),
                        retryCount: 0,
                    });
                    await activeStorage.setItemAsync(
                        PENDING_REVOCATIONS_QUEUE_KEY,
                        JSON.stringify(filtered),
                    );
                    succeeded = true;
                } catch (err) {
                    succeeded = false;
                    thrownError = err;
                    console.warn(
                        '[SecureTokenStorage] SecureStore write failure during recordPendingRevocation:',
                        err,
                    );
                }
            })
            .catch((lockErr) => {
                thrownError = lockErr;
            });

        this.queueLock = operation;
        await operation;

        if (!succeeded && thrownError) {
            throw new StorageWriteError(
                'Failed to record pending revocation token in SecureStore',
                thrownError,
            );
        }

        return succeeded;
    }

    /**
     * Update an existing queue item (e.g. increment retry count or record lastError).
     */
    static async updatePendingRevocationItem(
        updatedItem: RevocationQueueItem,
    ): Promise<void> {
        const operation = this.queueLock
            .then(async () => {
                try {
                    const queue = await this.getPendingRevocationQueue();
                    const index = queue.findIndex(
                        (i) => i.token === updatedItem.token,
                    );
                    if (index !== -1) {
                        queue[index] = updatedItem;
                        await activeStorage.setItemAsync(
                            PENDING_REVOCATIONS_QUEUE_KEY,
                            JSON.stringify(queue),
                        );
                    }
                } catch (e) {
                    console.warn(
                        '[SecureTokenStorage] Failed to update pending revocation item:',
                        e,
                    );
                }
            })
            .catch(() => {});

        this.queueLock = operation;
        await operation;
    }

    /**
     * Remove a specific successfully reconciled token from the pending revocation queue.
     * Serialized via internal promise queue lock to prevent read-modify-write race corruption.
     */
    static async removePendingRevocation(token: string): Promise<void> {
        const operation = this.queueLock
            .then(async () => {
                try {
                    const queue = await this.getPendingRevocationQueue();
                    const remaining = queue.filter(
                        (item) => item.token !== token,
                    );
                    if (remaining.length === 0) {
                        await activeStorage
                            .deleteItemAsync(PENDING_REVOCATIONS_QUEUE_KEY)
                            .catch(() => {});
                    } else {
                        await activeStorage.setItemAsync(
                            PENDING_REVOCATIONS_QUEUE_KEY,
                            JSON.stringify(remaining),
                        );
                    }
                } catch (e) {
                    console.warn(
                        '[SecureTokenStorage] Failed to remove pending revocation token:',
                        e,
                    );
                }
            })
            .catch(() => {});

        this.queueLock = operation;
        await operation;
    }

    /**
     * Pop the first pending revocation record (for backward compatibility).
     */
    static async popPendingRevocation(): Promise<{
        token: string;
        principalType: PrincipalType;
    } | null> {
        try {
            const queue = await this.getPendingRevocationQueue();
            if (queue.length === 0) return null;
            const first = queue[0];
            await this.removePendingRevocation(first.token);
            return { token: first.token, principalType: first.principalType };
        } catch {
            return null;
        }
    }

    /**
     * Persistent hardware/device installation ID (unique per installation).
     */
    static async getDeviceSessionId(): Promise<string> {
        try {
            let id = await activeStorage.getItemAsync(
                ACTIVE_DEVICE_SESSION_ID_KEY,
            );
            if (!id) {
                id =
                    'dev_' +
                    Math.random().toString(36).substring(2, 15) +
                    '_' +
                    Date.now().toString(36);
                await activeStorage.setItemAsync(
                    ACTIVE_DEVICE_SESSION_ID_KEY,
                    id,
                );
            }
            return id;
        } catch {
            return 'dev_fallback_' + Date.now().toString(36);
        }
    }

    /**
     * Remove old legacy multi-slot token keys to prevent dormant token attacks.
     */
    private static async cleanupLegacySlots(): Promise<void> {
        try {
            await Promise.all([
                activeStorage.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => {}),
                activeStorage
                    .deleteItemAsync(LEGACY_ACCOUNT_TYPE_KEY)
                    .catch(() => {}),
            ]);
        } catch {
            // Ignored
        }
    }

    // Backwards-compatible aliases
    static async getInstallationId(): Promise<string> {
        return this.getDeviceSessionId();
    }

    static async getToken(): Promise<string | null> {
        const session = await this.getActiveSession();
        return session ? session.token : null;
    }

    static async getAccountType(): Promise<'customer' | 'partner' | null> {
        const session = await this.getActiveSession();
        if (!session) return null;
        return session.principalType === 'owner' ? 'partner' : 'customer';
    }

    static async clearAll(): Promise<void> {
        await this.clearActiveSession();
    }
}

export interface ReconcileResult {
    reconciled: string[];
    retained: string[];
    terminalPurged: string[];
    agedOutPurged: string[];
}

/**
 * Reconcile all pending server-side revocations queued during offline logouts.
 * Adheres strictly to Closure 04 HTTP Semantics:
 * - 200..299 / 204: Reconciled & purged.
 * - 401 Unauthenticated: Dead token on backend, safely purged.
 * - Explicit revoked payload: Confirmed revoked, purged.
 * - Age > 7 days or retries >= 10: Aged out & purged.
 * - 403 Forbidden: Token remains VALID on backend; RETAINED for retry/re-routing.
 * - 404 Not Found: Endpoint or version mismatch; RETAINED for retry.
 * - 422, 429, 5xx, Network failure: RETAINED for retry.
 */
export async function reconcilePendingRevocationQueue(
    requester?: (
        endpoint: string,
        options: { method: string; headers: Record<string, string> },
    ) => Promise<any>,
): Promise<ReconcileResult> {
    const result: ReconcileResult = {
        reconciled: [],
        retained: [],
        terminalPurged: [],
        agedOutPurged: [],
    };

    try {
        const queue = await SecureTokenStorage.getPendingRevocationQueue();
        if (!queue.length) return result;

        const now = Date.now();

        for (const item of queue) {
            // 1. Age and retry count retention expiration check
            const ageMs = now - item.recordedAt;
            const retryCount = item.retryCount ?? 0;

            if (
                ageMs > MAX_REVOCATION_RETENTION_MS ||
                retryCount >= MAX_REVOCATION_RETRIES
            ) {
                await SecureTokenStorage.removePendingRevocation(item.token);
                result.agedOutPurged.push(item.token);
                continue;
            }

            const endpoint =
                item.principalType === 'customer'
                    ? 'auth/customer/logout'
                    : 'auth/owner/logout';

            try {
                if (requester) {
                    await requester(endpoint, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${item.token}` },
                    });
                }

                await SecureTokenStorage.removePendingRevocation(item.token);
                result.reconciled.push(item.token);
            } catch (e: any) {
                const status =
                    e?.status ?? e?.statusCode ?? e?.response?.status;
                const responseBody = e?.data ?? e?.response?.data;
                const isExplicitRevoked =
                    responseBody?.revoked === true ||
                    responseBody?.status === 'revoked' ||
                    (typeof responseBody?.message === 'string' &&
                        responseBody.message.toLowerCase().includes('revoked'));

                if (status === 401 || isExplicitRevoked) {
                    // Token is dead or expired on backend: safe to terminal-purge
                    await SecureTokenStorage.removePendingRevocation(
                        item.token,
                    );
                    result.terminalPurged.push(item.token);
                } else if (status === 403) {
                    // 403 Forbidden (e.g. INVALID_ACCOUNT_TYPE): Token is still valid on backend!
                    // DO NOT purge. Retain in queue.
                    item.retryCount = retryCount + 1;
                    item.lastError =
                        'HTTP 403 Forbidden (retained, valid token)';
                    await SecureTokenStorage.updatePendingRevocationItem(item);
                    result.retained.push(item.token);
                } else if (status === 404) {
                    // 404 Not Found: Route mismatch or proxy issue; DO NOT purge.
                    item.retryCount = retryCount + 1;
                    item.lastError =
                        'HTTP 404 Not Found (retained for route retry)';
                    await SecureTokenStorage.updatePendingRevocationItem(item);
                    result.retained.push(item.token);
                } else if (
                    status === 422 ||
                    status === 429 ||
                    (status >= 500 && status < 600)
                ) {
                    // 422 Validation, 429 Rate Limit, 5xx Server Error: Retain.
                    item.retryCount = retryCount + 1;
                    item.lastError = `HTTP ${status} (transient failure, retained)`;
                    await SecureTokenStorage.updatePendingRevocationItem(item);
                    result.retained.push(item.token);
                    break; // Pause batch on server error or rate limiting
                } else {
                    // Network connection error / timeout: Retain and pause batch until next network reconnect
                    item.retryCount = retryCount + 1;
                    item.lastError = e?.message || 'Network connection error';
                    await SecureTokenStorage.updatePendingRevocationItem(item);
                    result.retained.push(item.token);
                    break;
                }
            }
        }
    } catch (err) {
        console.warn(
            '[SecureTokenStorage] Error during reconcilePendingRevocationQueue:',
            err,
        );
    }

    return result;
}
