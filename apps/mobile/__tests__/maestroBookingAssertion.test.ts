import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../.maestro/scripts/assert-booking-cancelled.js', import.meta.url), 'utf8');
const baseUrl = 'http://127.0.0.1:8091/api/v1';
const reference = 'TJR-2026-01ARZ3NDEKTSV4RRFFQ69G5FAV';
const oldReference = 'TJR-2026-01ARZ3NDEKTSV4RRFFQ69G5FAW';
const reason = 'Customer requested cancellation via mobile app';

function assertBookingStatus(expectedStatus: string, booking: Record<string, string>) {
    runInNewContext(script, {
        MAESTRO_API_URL: baseUrl,
        MAESTRO_CUSTOMER_EMAIL: 'customer@example.test',
        MAESTRO_CUSTOMER_PASSWORD: 'fixture-password',
        EXPECTED_BOOKING_STATUS: expectedStatus,
        output: { reservationReference: reference },
        json: JSON.parse,
        http: {
            post: () => ({ ok: true, body: JSON.stringify({ data: { token: 'test-token' } }) }),
            get: (url: string) => {
                assert.equal(url, `${baseUrl}/customer/reservations/${reference}`);
                return { ok: true, body: JSON.stringify({ data: booking }) };
            },
        },
    });
}

test('Maestro requires the same booking shown by the app to transition from a hold to cancelled', () => {
    assertBookingStatus('awaiting_payment', { reference, status: 'awaiting_payment' });
    assertBookingStatus('cancelled', { reference, status: 'cancelled', cancellation_reason: reason });

    assert.throws(() => assertBookingStatus('cancelled', { reference, status: 'awaiting_payment' }), /to be cancelled/);
    assert.throws(() => assertBookingStatus('cancelled', {
        reference: oldReference, status: 'cancelled', cancellation_reason: reason,
    }), /to be cancelled/);
});
