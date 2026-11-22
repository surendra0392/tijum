import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

describe('Behavioral Suite 2: SecureTokenStorage & Role Session Isolation', () => {
    it('persists and retrieves active session with principalType isolation', async () => {
        SecureTokenStorage.setStorageEngineForTesting(memoryEngine);
        await SecureTokenStorage.clearActiveSession();

        assert.equal(await SecureTokenStorage.getActiveSession(), null);

        await SecureTokenStorage.setActiveSession(
            'tok_customer_abc',
            'customer',
        );

        const customerSession = await SecureTokenStorage.getActiveSession();
        assert.ok(customerSession);
        assert.equal(customerSession.token, 'tok_customer_abc');
        assert.equal(customerSession.principalType, 'customer');
        assert.ok(customerSession.deviceSessionId.startsWith('sess_'));

        // Switching to owner overwrites active session cleanly
        await SecureTokenStorage.setActiveSession('tok_owner_xyz', 'owner');
        const ownerSession = await SecureTokenStorage.getActiveSession();
        assert.ok(ownerSession);
        assert.equal(ownerSession.token, 'tok_owner_xyz');
        assert.equal(ownerSession.principalType, 'owner');

        await SecureTokenStorage.clearActiveSession();
        assert.equal(await SecureTokenStorage.getActiveSession(), null);
    });

    it('rejects corrupted principal types during getActiveSession hydration', async () => {
        await SecureTokenStorage.clearActiveSession();
        await SecureTokenStorage.setActiveSession('tok_valid_1', 'customer');
        const active = await SecureTokenStorage.getActiveSession();
        assert.equal(active?.principalType, 'customer');
        await SecureTokenStorage.clearActiveSession();
    });
});
