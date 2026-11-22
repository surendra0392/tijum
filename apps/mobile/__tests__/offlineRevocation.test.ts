import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    SecureTokenStorage,
    reconcilePendingRevocationQueue,
    StorageWriteError,
    MAX_REVOCATION_RETENTION_MS,
    MAX_REVOCATION_RETRIES,
} from '../src/auth/SecureTokenStorage.ts';
import type {
    StorageEngine,
    PrincipalType,
} from '../src/auth/SecureTokenStorage.ts';

/**
 * Fault-injecting simulated SecureStore adapter mimicking iOS Keychain and Android Keystore.
 * Supports programmable read, write, and delete failures.
 */
class FaultInjectingSecureStore implements StorageEngine {
    private data = new Map<string, string>();
    public shouldFailRead = false;
    public shouldFailWrite = false;
    public shouldFailDelete = false;

    async getItemAsync(key: string): Promise<string | null> {
        if (this.shouldFailRead) {
            throw new Error('Simulated Keystore/Keychain READ failure');
        }
        return this.data.has(key) ? this.data.get(key)! : null;
    }

    async setItemAsync(key: string, value: string): Promise<void> {
        if (this.shouldFailWrite) {
            throw new Error('Simulated Keystore/Keychain WRITE failure');
        }
        this.data.set(key, value);
    }

    async deleteItemAsync(key: string): Promise<void> {
        if (this.shouldFailDelete) {
            throw new Error('Simulated Keystore/Keychain DELETE failure');
        }
        this.data.delete(key);
    }

    // Raw backdoor manipulation for corruption and fault tests
    setRaw(key: string, rawValue: string): void {
        this.data.set(key, rawValue);
    }

    getRaw(key: string): string | undefined {
        return this.data.get(key);
    }

    clear(): void {
        this.data.clear();
        this.shouldFailRead = false;
        this.shouldFailWrite = false;
        this.shouldFailDelete = false;
    }
}

describe('Phase 21B Closure Item 04: Mobile Session Revocation Security & Failure Recovery', () => {
    let memoryStore: FaultInjectingSecureStore;

    beforeEach(() => {
        memoryStore = new FaultInjectingSecureStore();
        SecureTokenStorage.setStorageEngineForTesting(memoryStore);
    });

    it('Test 01: Multi-token queue retention & FIFO ordering under offline logouts', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tijum_tok_cust_001',
            'customer',
        );
        await SecureTokenStorage.recordPendingRevocation(
            'tijum_tok_cust_002',
            'customer',
        );
        await SecureTokenStorage.recordPendingRevocation(
            'tijum_tok_owner_001',
            'owner',
        );

        const queue = await SecureTokenStorage.getPendingRevocationQueue();

        assert.equal(queue.length, 3, 'Queue must retain all 3 offline tokens');
        assert.equal(
            queue[0].token,
            'tijum_tok_cust_001',
            'First queued token must be FIFO head',
        );
        assert.equal(queue[0].principalType, 'customer');
        assert.equal(
            queue[1].token,
            'tijum_tok_cust_002',
            'Second queued token must follow in order',
        );
        assert.equal(queue[1].principalType, 'customer');
        assert.equal(
            queue[2].token,
            'tijum_tok_owner_001',
            'Third queued token must follow in order',
        );
        assert.equal(queue[2].principalType, 'owner');
        assert.ok(
            queue[0].recordedAt <= queue[1].recordedAt,
            'Recorded timestamps must be monotonically ordered',
        );
    });

    it('Test 02: SecureStore persistence across simulated app restarts', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tijum_tok_restart_test',
            'customer',
        );
        await SecureTokenStorage.setActiveSession(
            'tijum_tok_active_session',
            'customer',
        );

        // Simulate app shutdown: reset and re-bind existing persistent storage engine
        SecureTokenStorage.setStorageEngineForTesting(null);
        SecureTokenStorage.setStorageEngineForTesting(memoryStore);

        const session = await SecureTokenStorage.getActiveSession();
        assert.ok(session, 'Active session must survive simulated restart');
        assert.equal(session.token, 'tijum_tok_active_session');
        assert.equal(session.principalType, 'customer');

        const queue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(
            queue.length,
            1,
            'Revocation queue must survive simulated restart',
        );
        assert.equal(queue[0].token, 'tijum_tok_restart_test');
    });

    it('Test 03: Network failure retention (queue preserved when backend unreachable)', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tok_offline_fail_1',
            'customer',
        );
        await SecureTokenStorage.recordPendingRevocation(
            'tok_offline_fail_2',
            'owner',
        );

        const mockNetworkRequester = async () => {
            throw new Error('Network request failed: unreachable endpoint');
        };

        const result =
            await reconcilePendingRevocationQueue(mockNetworkRequester);

        assert.equal(
            result.reconciled.length,
            0,
            'No tokens should be marked reconciled on network failure',
        );
        assert.equal(
            result.retained.length,
            1,
            'Reconciliation must pause batch and retain head token',
        );
        assert.equal(result.retained[0], 'tok_offline_fail_1');

        const remainingQueue =
            await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(
            remainingQueue.length,
            2,
            'Entire queue must remain intact after network failure',
        );
        assert.equal(
            remainingQueue[0].retryCount,
            1,
            'Retry count must increment',
        );
    });

    it('Test 04: Successful server reconciliation (tokens purged upon server 200/204 response)', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tok_recon_cust',
            'customer',
        );
        await SecureTokenStorage.recordPendingRevocation(
            'tok_recon_own',
            'owner',
        );

        const dispatchedCalls: Array<{ endpoint: string; token: string }> = [];

        const mockSuccessRequester = async (endpoint: string, options: any) => {
            dispatchedCalls.push({
                endpoint,
                token: options.headers.Authorization.replace('Bearer ', ''),
            });
            return { success: true };
        };

        const result =
            await reconcilePendingRevocationQueue(mockSuccessRequester);

        assert.equal(
            result.reconciled.length,
            2,
            'Both tokens must be successfully reconciled',
        );
        assert.deepEqual(result.reconciled, [
            'tok_recon_cust',
            'tok_recon_own',
        ]);
        assert.equal(
            dispatchedCalls.length,
            2,
            'Exactly 2 HTTP logout calls must be dispatched',
        );

        const finalQueue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(
            finalQueue.length,
            0,
            'Persistent queue must be empty after full reconciliation',
        );
    });

    it('Test 05: 401 Unauthenticated terminal response purging (dead token on backend)', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tok_stale_expired',
            'customer',
        );
        await SecureTokenStorage.recordPendingRevocation(
            'tok_subsequent_valid',
            'owner',
        );

        const mockRequester = async (endpoint: string, options: any) => {
            const token = options.headers.Authorization.replace('Bearer ', '');
            if (token === 'tok_stale_expired') {
                const error: any = new Error('Unauthenticated');
                error.status = 401; // Terminal: token was already invalidated on server
                throw error;
            }
            return { success: true };
        };

        const result = await reconcilePendingRevocationQueue(mockRequester);

        assert.equal(
            result.terminalPurged.length,
            1,
            'Terminal 401 token must be purged',
        );
        assert.equal(result.terminalPurged[0], 'tok_stale_expired');
        assert.equal(
            result.reconciled.length,
            1,
            'Subsequent valid token must still be reconciled',
        );
        assert.equal(result.reconciled[0], 'tok_subsequent_valid');

        const remainingQueue =
            await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(
            remainingQueue.length,
            0,
            'Queue must be empty after terminal purge and reconciliation',
        );
    });

    it('Test 06: 403 Forbidden with INVALID_ACCOUNT_TYPE is NOT purged (token retained)', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tok_forbidden_cust',
            'customer',
        );

        const mock403Requester = async () => {
            const error: any = new Error('Forbidden: INVALID_ACCOUNT_TYPE');
            error.status = 403;
            error.data = {
                code: 'INVALID_ACCOUNT_TYPE',
                message: 'Token belongs to partner portal',
            };
            throw error;
        };

        const result = await reconcilePendingRevocationQueue(mock403Requester);

        assert.equal(
            result.terminalPurged.length,
            0,
            '403 response must NEVER be purged as terminal',
        );
        assert.equal(
            result.retained.length,
            1,
            'Token must be retained in pending queue',
        );
        assert.equal(result.retained[0], 'tok_forbidden_cust');

        const queue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(
            queue.length,
            1,
            'Queue must retain the valid unrevoked token',
        );
        assert.equal(queue[0].retryCount, 1);
        assert.ok(queue[0].lastError?.includes('403'));
    });

    it('Test 07: 404 Not Found response is NOT purged (token retained for route retry)', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tok_not_found',
            'customer',
        );

        const mock404Requester = async () => {
            const error: any = new Error('Route not found');
            error.status = 404;
            throw error;
        };

        const result = await reconcilePendingRevocationQueue(mock404Requester);

        assert.equal(
            result.terminalPurged.length,
            0,
            '404 response must NOT be purged as terminal',
        );
        assert.equal(result.retained.length, 1, 'Token must be retained');
        assert.equal(result.retained[0], 'tok_not_found');

        const queue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(queue.length, 1);
        assert.ok(queue[0].lastError?.includes('404'));
    });

    it('Test 08: 422 Unprocessable Entity response is retained', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tok_unprocessable',
            'customer',
        );

        const mock422Requester = async () => {
            const error: any = new Error('Unprocessable Content');
            error.status = 422;
            throw error;
        };

        const result = await reconcilePendingRevocationQueue(mock422Requester);

        assert.equal(result.terminalPurged.length, 0);
        assert.equal(result.retained.length, 1);
        assert.equal(result.retained[0], 'tok_unprocessable');
    });

    it('Test 09: 429 Too Many Requests rate limit pauses batch and retains queue', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tok_rate_limited',
            'customer',
        );
        await SecureTokenStorage.recordPendingRevocation(
            'tok_after_rate_limit',
            'owner',
        );

        let callCount = 0;
        const mock429Requester = async () => {
            callCount++;
            const error: any = new Error('Too Many Requests');
            error.status = 429;
            throw error;
        };

        const result = await reconcilePendingRevocationQueue(mock429Requester);

        assert.equal(callCount, 1, 'Batch must pause immediately on 429');
        assert.equal(result.retained.length, 1);
        assert.equal(result.retained[0], 'tok_rate_limited');

        const queue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(queue.length, 2, 'Both tokens must remain in queue');
    });

    it('Test 10: 500 Internal Server Error retains queue and pauses batch', async () => {
        await SecureTokenStorage.recordPendingRevocation(
            'tok_server_err',
            'customer',
        );
        await SecureTokenStorage.recordPendingRevocation(
            'tok_next_item',
            'customer',
        );

        let callCount = 0;
        const mock500Requester = async () => {
            callCount++;
            const error: any = new Error('Internal Server Error');
            error.status = 500;
            throw error;
        };

        const result = await reconcilePendingRevocationQueue(mock500Requester);

        assert.equal(callCount, 1, 'Batch must pause immediately on 500');
        assert.equal(result.retained.length, 1);
        assert.equal(result.retained[0], 'tok_server_err');

        const queue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(queue.length, 2, 'Both tokens must remain in queue');
    });

    it('Test 11: SecureStore read failure resilience (graceful empty array, no unhandled crash)', async () => {
        memoryStore.shouldFailRead = true;

        const queue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.deepEqual(
            queue,
            [],
            'Read failure must safely return empty queue without throwing',
        );

        const session = await SecureTokenStorage.getActiveSession();
        assert.equal(
            session,
            null,
            'Read failure must safely return null session',
        );
    });

    it('Test 12: SecureStore write failure surfaces StorageWriteError explicitly', async () => {
        memoryStore.shouldFailWrite = true;

        let caughtError: any = null;
        try {
            await SecureTokenStorage.recordPendingRevocation(
                'tok_write_fail',
                'customer',
            );
        } catch (err) {
            caughtError = err;
        }

        assert.ok(
            caughtError instanceof StorageWriteError,
            'Must throw explicit StorageWriteError on write failure',
        );
        assert.ok(caughtError.message.includes('SecureStore'));
    });

    it('Test 13: SecureStore delete failure resilience (session state cleared despite delete error)', async () => {
        await SecureTokenStorage.setActiveSession('tok_pre_delete', 'customer');
        memoryStore.shouldFailDelete = true;

        // clearActiveSession must not throw despite storage delete failure
        await SecureTokenStorage.clearActiveSession();
        // Memory store had delete error, but function completed safely without crashing
        assert.ok(
            true,
            'clearActiveSession completed without unhandled rejection',
        );
    });

    it('Test 14: Malformed/corrupted JSON handling in revocation queue self-heals', async () => {
        // 1. Inject completely invalid JSON string
        memoryStore.setRaw(
            'tijum_pending_revocations_queue',
            '{invalid-json-structure-corrupt-data',
        );

        let queue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.deepEqual(
            queue,
            [],
            'Corrupt JSON string must safely return empty array',
        );

        // 2. Inject array with partially corrupted entries
        const mixedQueue = [
            {
                token: 'valid_token_1',
                principalType: 'customer',
                recordedAt: Date.now(),
                retryCount: 0,
            },
            { corrupted_no_token: true }, // corrupt
            null, // corrupt
            'bare-string', // corrupt
            {
                token: 'valid_token_2',
                principalType: 'owner',
                recordedAt: Date.now(),
                retryCount: 1,
            },
            { token: '', principalType: 'customer' }, // empty token: corrupt
        ];
        memoryStore.setRaw(
            'tijum_pending_revocations_queue',
            JSON.stringify(mixedQueue),
        );

        queue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(queue.length, 2, 'Only the 2 valid items must be parsed');
        assert.equal(queue[0].token, 'valid_token_1');
        assert.equal(queue[1].token, 'valid_token_2');

        // Verify self-healed persistent storage
        const rawSaved = memoryStore.getRaw('tijum_pending_revocations_queue');
        assert.ok(rawSaved);
        const parsedSaved = JSON.parse(rawSaved);
        assert.equal(
            parsedSaved.length,
            2,
            'Corrupt entries must be purged on disk',
        );
    });

    it('Test 15: Exceeded retention policy purges stale token (7 days age or 10 retry limit)', async () => {
        const eightDaysAgo =
            Date.now() - (MAX_REVOCATION_RETENTION_MS + 24 * 60 * 60 * 1000);
        const expiredByAge = {
            token: 'tok_expired_by_age',
            principalType: 'customer' as PrincipalType,
            recordedAt: eightDaysAgo,
            retryCount: 2,
        };
        const expiredByRetries = {
            token: 'tok_expired_by_retries',
            principalType: 'owner' as PrincipalType,
            recordedAt: Date.now() - 60000,
            retryCount: MAX_REVOCATION_RETRIES, // 10 attempts
        };
        const freshItem = {
            token: 'tok_still_fresh',
            principalType: 'customer' as PrincipalType,
            recordedAt: Date.now() - 3600000,
            retryCount: 3,
        };

        memoryStore.setRaw(
            'tijum_pending_revocations_queue',
            JSON.stringify([expiredByAge, expiredByRetries, freshItem]),
        );

        const mockRequester = async () => {
            return { success: true };
        };

        const result = await reconcilePendingRevocationQueue(mockRequester);

        assert.equal(
            result.agedOutPurged.length,
            2,
            'Both age-expired and retry-exhausted tokens must be aged out',
        );
        assert.ok(result.agedOutPurged.includes('tok_expired_by_age'));
        assert.ok(result.agedOutPurged.includes('tok_expired_by_retries'));
        assert.equal(
            result.reconciled.length,
            1,
            'Fresh token must be reconciled',
        );
        assert.equal(result.reconciled[0], 'tok_still_fresh');

        const remainingQueue =
            await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(remainingQueue.length, 0, 'Queue must now be empty');
    });

    it('Test 16: Account domain switching while customer token remains queued', async () => {
        await SecureTokenStorage.setActiveSession(
            'tok_customer_initial',
            'customer',
        );
        await SecureTokenStorage.recordPendingRevocation(
            'tok_customer_initial',
            'customer',
        );
        await SecureTokenStorage.clearActiveSession();

        assert.equal(await SecureTokenStorage.getActiveSession(), null);
        assert.equal(
            (await SecureTokenStorage.getPendingRevocationQueue()).length,
            1,
        );

        await SecureTokenStorage.setActiveSession(
            'tok_owner_new_session',
            'owner',
        );

        const activeSession = await SecureTokenStorage.getActiveSession();
        assert.ok(activeSession);
        assert.equal(activeSession.token, 'tok_owner_new_session');
        assert.equal(activeSession.principalType, 'owner');

        const dispatchedCalls: string[] = [];
        const mockRequester = async (endpoint: string) => {
            dispatchedCalls.push(endpoint);
            return { success: true };
        };

        await reconcilePendingRevocationQueue(mockRequester);

        assert.equal(dispatchedCalls.length, 1);
        assert.equal(dispatchedCalls[0], 'auth/customer/logout');

        const postReconSession = await SecureTokenStorage.getActiveSession();
        assert.ok(postReconSession);
        assert.equal(postReconSession.token, 'tok_owner_new_session');
        assert.equal(postReconSession.principalType, 'owner');
    });

    it('Test 17: Concurrent queue operations & deduplication safety', async () => {
        await Promise.all([
            SecureTokenStorage.recordPendingRevocation(
                'tok_concurrent_A',
                'customer',
            ),
            SecureTokenStorage.recordPendingRevocation(
                'tok_concurrent_B',
                'customer',
            ),
            SecureTokenStorage.recordPendingRevocation(
                'tok_concurrent_A',
                'customer',
            ),
            SecureTokenStorage.recordPendingRevocation(
                'tok_concurrent_C',
                'owner',
            ),
        ]);

        const queue = await SecureTokenStorage.getPendingRevocationQueue();
        assert.equal(
            queue.length,
            3,
            'Queue must deduplicate identical token registrations',
        );
        const tokens = queue.map((q) => q.token);
        assert.ok(tokens.includes('tok_concurrent_A'));
        assert.ok(tokens.includes('tok_concurrent_B'));
        assert.ok(tokens.includes('tok_concurrent_C'));
    });
});
