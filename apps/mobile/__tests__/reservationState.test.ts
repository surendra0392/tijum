import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PhysicalRoom, Reservation } from '../src/api/types.ts';
import {
    canPayReservation,
    filterAssignableRooms,
    formatPartnerBookingAmounts,
} from '../src/utils/reservationState.ts';

test('shows gross booking value separately from a calculated payout, including zero', () => {
    const booking = { original_amount_paise: 150000, total_amount_paise: 125000 };
    assert.deepEqual(formatPartnerBookingAmounts({ ...booking, estimated_partner_payout_paise: 98000 }), {
        grossBookingValue: '₹1,500',
        estimatedPayout: '₹980',
    });
    assert.equal(formatPartnerBookingAmounts({ ...booking, estimated_partner_payout_paise: 0 }).estimatedPayout, '₹0');
});

test('shows pending calculation with null estimates and older API responses', () => {
    const booking = { total_amount_paise: 125000, owner_payable_paise: 125000 };
    assert.deepEqual(formatPartnerBookingAmounts(booking), {
        grossBookingValue: '₹1,250',
        estimatedPayout: 'Settlement calculation pending',
    });
    assert.equal(formatPartnerBookingAmounts({ ...booking, estimated_partner_payout_paise: null }).estimatedPayout, 'Settlement calculation pending');
});

test('expires a previously payable hold at its deadline and respects server denial', () => {
    const deadline = '2026-11-23T12:00:00Z';
    const hold = { status: 'awaiting_payment', payment_deadline_at: deadline, can_pay: true };
    const expiresAt = Date.parse(deadline);

    assert.equal(canPayReservation(hold, expiresAt - 1), true);
    assert.equal(canPayReservation(hold, expiresAt), false);
    assert.equal(canPayReservation({ ...hold, can_pay: false }, expiresAt - 1), false);
    assert.equal(canPayReservation({ ...hold, status: 'cancelled' }, expiresAt - 1), false);
});

test('offers only active rooms in the API reservation category and leaves date availability to the server', () => {
    const room = { property_id: 9, property_room_type_id: 2, is_active: true };
    const rooms: PhysicalRoom[] = [
        { ...room, id: 10, room_number: '10' },
        { ...room, id: 2, room_number: '2', is_occupied: true },
        { ...room, id: 3, room_number: '3', property_room_type_id: 4 },
        { ...room, id: 4, room_number: '4', is_active: false, operational_status: 'blocked' },
    ];
    const roomType: Reservation['room_type'] = {
        id: 2, name: 'Shared', accommodation_mode: 'shared', is_air_conditioned: false,
    };

    assert.deepEqual(filterAssignableRooms(rooms, { room_type: roomType }).map(({ id }) => id), [2, 10]);
});
