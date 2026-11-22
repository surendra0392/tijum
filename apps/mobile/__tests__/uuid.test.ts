import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createUuid } from '../src/utils/uuid.ts';

describe('submission UUIDs', () => {
    it('creates unique RFC 4122 version 4 identifiers', () => {
        const first = createUuid();
        const second = createUuid();

        assert.match(
            first,
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        assert.notEqual(first, second);
    });
});
