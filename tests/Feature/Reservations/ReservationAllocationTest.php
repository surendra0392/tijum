<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Models\Owner;
use App\Models\PropertyAvailabilityBlock;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ReservationAllocationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_only_confirmed_reservations_can_be_allocated(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $room = $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room->id, 'allocated_quantity' => 1]],
            ])
            ->assertSessionHasErrors('reservation');
    }

    public function test_owner_can_allocate_partial_sync_and_remove_rooms(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Shared, maxGuests: 4, dailyRate: 50000);
        $room1 = $this->createActiveRoom($property, $roomType, number: 'A-101');
        $room2 = $this->createActiveRoom($property, $roomType, number: 'A-102');
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, quantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        $reservation = $this->confirmAndPayReservation($reservation);

        $reservation = $this->confirmAndPayReservation($reservation);

        // Partial allocation: only room 101 with quantity 1.
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room1->id, 'allocated_quantity' => 1]],
            ])
            ->assertRedirect();

        $this->assertSame(1, $reservation->fresh()->allocatedQuantity());
        $this->assertTrue($reservation->fresh()->allocations()->where('property_room_id', $room1->id)->exists());
        $this->actingAs($owner, 'owner')
            ->get(route('owner.reservations.show', $reservation->booking_reference))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('reservation.allocations.0.room_number', $room1->room_number)
                ->where('reservation.allocations.0.allocated_quantity', 1));

        // Sync: update to room 102 with quantity 1 (room1 is removed by whereNotIn).
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room2->id, 'allocated_quantity' => 1]],
            ])
            ->assertRedirect();

        $reservation->refresh();
        $this->assertSame(1, $reservation->allocatedQuantity());
        $this->assertFalse($reservation->allocations()->where('property_room_id', $room1->id)->exists());
        $this->assertTrue($reservation->allocations()->where('property_room_id', $room2->id)->exists());

        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [],
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(0, $reservation->fresh()->allocatedQuantity());
    }

    public function test_cross_owner_allocation_is_not_found(): void
    {
        $owner = $this->createActiveOwner();
        $otherOwner = $this->createActiveOwner(['email' => 'other@example.test']);
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $room = $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        $reservation = $this->confirmAndPayReservation($reservation);

        $reservation = $this->confirmAndPayReservation($reservation);

        // Cross-owner gets 404 because reservation lookup is scoped to owner's properties.
        $this->actingAs($otherOwner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room->id, 'allocated_quantity' => 1]],
            ])
            ->assertNotFound();
    }

    public function test_private_room_accepts_single_allocation_only(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 100000);
        $room = $this->createActiveRoom($property, $roomType, number: 'PR-1');
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, quantity: 1);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        $reservation = $this->confirmAndPayReservation($reservation);

        $reservation = $this->confirmAndPayReservation($reservation);

        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room->id, 'allocated_quantity' => 2]],
            ])
            ->assertSessionHasErrors('allocations');
    }

    public function test_shared_room_overlap_cap_not_exceeded(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Shared, maxGuests: 2, dailyRate: 50000);
        $room = $this->createActiveRoom($property, $roomType, number: 'SH-1');
        $user1 = $this->createCustomerUser();
        $user2 = $this->createCustomerUser(['email' => 'user2@example.test']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();

        // First reservation: quantity 1 in shared room (capacity 2).
        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $this->submitReservation($user1, $payload1)->assertRedirect();
        $reservation1 = Reservation::query()->where('submission_token', $payload1['submission_token'])->first();

        $reservation1 = $this->confirmAndPayReservation($reservation1);

        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation1->booking_reference), [
                'allocations' => [['property_room_id' => $room->id, 'allocated_quantity' => 1]],
            ])
            ->assertRedirect();

        // Second reservation for same dates: quantity 2 would exceed capacity (1 + 2 > 2).
        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 2);
        $payload2['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user2, $payload2)->assertSessionHasErrors('reservation');
    }

    public function test_no_inventory_double_count_on_release(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 100000);
        $room = $this->createActiveRoom($property, $roomType, number: 'DC-1');
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();

        $payload = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        $reservation = $this->confirmAndPayReservation($reservation);

        $reservation = $this->confirmAndPayReservation($reservation);

        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room->id, 'allocated_quantity' => 1]],
            ])
            ->assertRedirect();

        // Cancel releases capacity.
        $this->actingAs($user, 'web')
            ->post(route('reservations.cancel', $reservation->booking_reference), ['cancellation_reason' => 'Release'])
            ->assertRedirect();

        // Another user can book the same dates.
        $user2 = $this->createCustomerUser(['email' => 'user2@example.test']);
        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $payload2['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user2, $payload2)->assertRedirect();
    }

    public function test_allocation_total_cannot_exceed_reservation_quantity(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Shared, maxGuests: 4, dailyRate: 50000);
        $room1 = $this->createActiveRoom($property, $roomType, number: 'TQ-1');
        $room2 = $this->createActiveRoom($property, $roomType, number: 'TQ-2');
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, quantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        $reservation = $this->confirmAndPayReservation($reservation);

        $reservation = $this->confirmAndPayReservation($reservation);

        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [
                    ['property_room_id' => $room1->id, 'allocated_quantity' => 2],
                    ['property_room_id' => $room2->id, 'allocated_quantity' => 1],
                ],
            ])
            ->assertSessionHasErrors('allocations');
    }

    public function test_inactive_wrong_type_and_blocked_rooms_cannot_be_allocated(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, name: 'Selected Type');
        $otherType = $this->createBookableRoomType($property, name: 'Other Type');
        $selectedRoom = $this->createActiveRoom($property, $roomType, number: 'VALID-1');
        $otherRoom = $this->createActiveRoom($property, $otherType, number: 'WRONG-1');
        $user = $this->createCustomerUser();
        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation = $this->confirmAndPayReservation($reservation);

        $selectedRoom->forceFill(['operational_status' => PropertyRoomStatus::Inactive->value])->save();
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $selectedRoom->id, 'allocated_quantity' => 1]],
            ])->assertSessionHasErrors('allocations');

        $selectedRoom->forceFill(['operational_status' => PropertyRoomStatus::Active->value])->save();
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $otherRoom->id, 'allocated_quantity' => 1]],
            ])->assertSessionHasErrors('allocations');

        $block = new PropertyAvailabilityBlock;
        $block->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'property_room_id' => $selectedRoom->id,
            'scope' => PropertyAvailabilityBlockScope::Room->value,
            'block_type' => 'maintenance',
            'status' => PropertyAvailabilityBlockStatus::Active->value,
            'start_date' => $reservation->check_in_date,
            'end_date' => $reservation->checkout_date->subDay(),
            'is_admin_restriction' => false,
        ])->save();
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $selectedRoom->id, 'allocated_quantity' => 1]],
            ])->assertSessionHasErrors('allocations');
    }

    public function test_overlapping_private_reservations_cannot_share_the_same_physical_room(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType(
            $property,
            mode: PropertyRoomTypeMode::Private,
            maxGuests: 1,
        );
        $room1 = $this->createActiveRoom($property, $roomType, number: 'PRIVATE-1');
        $this->createActiveRoom($property, $roomType, number: 'PRIVATE-2');
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $reservations = [];

        foreach ([1, 2] as $index) {
            $user = $this->createCustomerUser(['email' => "private{$index}@example.test"]);
            $payload = $this->validReservationPayload($property, $roomType, $checkIn);
            $payload['submission_token'] = (string) Str::uuid();
            $this->submitReservation($user, $payload)->assertRedirect();
            $reservations[] = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();
            $reservations[$index - 1] = $this->confirmAndPayReservation($reservations[$index - 1]);
        }

        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservations[0]->booking_reference), [
                'allocations' => [['property_room_id' => $room1->id, 'allocated_quantity' => 1]],
            ])->assertRedirect();
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservations[1]->booking_reference), [
                'allocations' => [['property_room_id' => $room1->id, 'allocated_quantity' => 1]],
            ])->assertSessionHasErrors('allocations');
    }

    public function test_room_change_history_is_recorded_and_locked_after_checkout(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 100000);
        $room101 = $this->createActiveRoom($property, $roomType, number: '101');
        $room104 = $this->createActiveRoom($property, $roomType, number: '104');
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, quantity: 1);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();
        $reservation = $this->confirmAndPayReservation($reservation);

        // Initial room allocation: Room 101
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room101->id, 'allocated_quantity' => 1]],
            ])
            ->assertRedirect();

        $reservation->refresh();
        $reservation->markCheckedIn('owner', $owner->id, 'Checked in to 101');

        // Customer changes room mid-stay to Room 104
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room104->id, 'allocated_quantity' => 1]],
            ])
            ->assertRedirect();

        $reservation->refresh();
        $reservation->markCheckedOut('owner', $owner->id, 'Checked out from 104');

        // Verify owner reservation show locks can_allocate & can_cancel and exposes complete room history
        $this->actingAs($owner, 'owner')
            ->get(route('owner.reservations.show', $reservation->booking_reference))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('reservation.is_checked_out', true)
                ->where('reservation.can_allocate', false)
                ->where('reservation.can_cancel', false)
                ->where('reservation.room_history.0.room_number', '101')
                ->where('reservation.room_history.0.status', 'changed')
                ->where('reservation.room_history.1.room_number', '104')
                ->where('reservation.room_history.1.status', 'checked_out'));

        // Attempting to change room allocations after checkout is rejected
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [['property_room_id' => $room101->id, 'allocated_quantity' => 1]],
            ])
            ->assertSessionHasErrors('reservation');
    }

    public function test_owner_reservations_index_filters_by_stage_room_number_and_open_end_date(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 100000);
        $room201 = $this->createActiveRoom($property, $roomType, number: '201');
        $this->createActiveRoom($property, $roomType, number: '202');

        $user1 = $this->createCustomerUser(['name' => 'Riya Sharma', 'email' => 'riya@example.test']);
        $user2 = $this->createCustomerUser(['name' => 'Karan Verma', 'email' => 'karan@example.test']);

        $payload1 = $this->validReservationPayload($property, $roomType, quantity: 1);
        $this->submitReservation($user1, $payload1)->assertRedirect();
        $res1 = Reservation::query()->where('submission_token', $payload1['submission_token'])->firstOrFail();
        $res1 = $this->confirmAndPayReservation($res1);

        // Allocate Room 201 and check out res1
        $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $res1->booking_reference), [
                'allocations' => [['property_room_id' => $room201->id, 'allocated_quantity' => 1]],
            ])->assertRedirect();
        $res1->refresh();
        $res1->markCheckedIn('owner', $owner->id);
        $res1->markCheckedOut('owner', $owner->id);

        // Second confirmed booking without room allocation
        $payload2 = $this->validReservationPayload($property, $roomType, quantity: 1);
        $payload2['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user2, $payload2)->assertRedirect();
        $res2 = Reservation::query()->where('submission_token', $payload2['submission_token'])->firstOrFail();
        $res2 = $this->confirmAndPayReservation($res2);

        // Needs room stage filter returns only res2
        $this->actingAs($owner, 'owner')
            ->get(route('owner.reservations.index', ['stay_stage' => 'needs_room']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('stageCounts.all', 2)
                ->where('stageCounts.needs_room', 1)
                ->where('stageCounts.checked_out', 1)
                ->has('reservations.data', 1)
                ->where('reservations.data.0.booking_reference', $res2->booking_reference));

        // Search by room number finds checked-out guest who stayed in Room 201
        $this->actingAs($owner, 'owner')
            ->get(route('owner.reservations.index', ['search' => '201']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('reservations.data', 1)
                ->where('reservations.data.0.booking_reference', $res1->booking_reference));

        // Filtering with `to` date alone (without `from`) succeeds cleanly
        $this->actingAs($owner, 'owner')
            ->get(route('owner.reservations.index', ['to' => CarbonImmutable::now('Asia/Kolkata')->addDays(30)->toDateString()]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('reservations.data', 2));
    }
}
