<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Actions\Owner\Availability\CreatePropertyAvailabilityBlock;
use App\Actions\Owner\Properties\UpdatePropertyRoomOperationalStatus;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ReservationAvailabilityTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_shared_and_private_quantity_bases_consume_capacity_differently(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        $shared = $this->createBookableRoomType($property, name: 'Shared 4', mode: PropertyRoomTypeMode::Shared, maxGuests: 4, dailyRate: 50000);
        $this->createActiveRoom($property, $shared, number: 'S-1');

        $private = $this->createBookableRoomType($property, name: 'Private 1', mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 100000);
        $this->createActiveRoom($property, $private, number: 'P-1');

        $user = $this->createCustomerUser();
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();

        $sharedPayload = $this->validReservationPayload($property, $shared, $checkIn, 'daily', 1, quantity: 2);
        $this->submitReservation($user, $sharedPayload)->assertRedirect();

        $privatePayload = $this->validReservationPayload($property, $private, $checkIn, 'daily', 1, quantity: 1);
        $this->submitReservation($user, $privatePayload)->assertRedirect();

        $this->assertSame(2, Reservation::query()->where('property_room_type_id', $shared->id)->consuming()->sum('quantity'));
        $this->assertSame(1, Reservation::query()->where('property_room_type_id', $private->id)->consuming()->sum('quantity'));
    }

    public function test_non_overlapping_stays_do_not_block_each_other(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, maxGuests: 2, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType, number: 'N-1');
        $user = $this->createCustomerUser();

        $checkIn1 = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();
        $checkIn2 = CarbonImmutable::now('Asia/Kolkata')->addDays(10)->startOfDay()->toDateString();

        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn1, 'daily', 1, quantity: 1);
        $this->submitReservation($user, $payload1)->assertRedirect();

        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn2, 'daily', 1, quantity: 1);
        $payload2['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user, $payload2)->assertRedirect();

        $this->assertCount(2, Reservation::query()->where('property_room_type_id', $roomType->id)->consuming()->get());
    }

    public function test_partially_overlapping_stays_reject_when_capacity_exceeded(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType, number: 'PO-1');
        $user1 = $this->createCustomerUser();
        $user2 = $this->createCustomerUser(['email' => 'user2@example.test']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();

        // First reservation occupies the single private room for days 5-6.
        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $this->submitReservation($user1, $payload1)->assertRedirect();

        // Second reservation starting on same day overlaps completely.
        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $payload2['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user2, $payload2)->assertSessionHasErrors('reservation');
    }

    public function test_checkout_exclusive_means_back_to_back_bookings_are_allowed(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType, number: 'CE-1');
        $user1 = $this->createCustomerUser();
        $user2 = $this->createCustomerUser(['email' => 'user2@example.test']);

        $checkIn1 = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();
        $checkIn2 = CarbonImmutable::now('Asia/Kolkata')->addDays(6)->startOfDay()->toDateString();

        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn1, 'daily', 1, quantity: 1);
        $this->submitReservation($user1, $payload1)->assertRedirect();

        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn2, 'daily', 1, quantity: 1);
        $payload2['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user2, $payload2)->assertRedirect();
    }

    public function test_property_level_block_reduces_capacity(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        $roomType = $this->createBookableRoomType($property, maxGuests: 2, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType, number: 'B-1');
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();
        $end = CarbonImmutable::now('Asia/Kolkata')->addDays(8)->startOfDay()->toDateString();

        $this->createPropertyBlock($property, $checkIn, $end, PropertyAvailabilityBlockScope::Property->value);
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $this->submitReservation($user, $payload)->assertSessionHasErrors('reservation');
    }

    public function test_room_type_level_block_reduces_capacity(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        $roomType = $this->createBookableRoomType($property, maxGuests: 2, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType, number: 'B-2');
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(15)->startOfDay()->toDateString();
        $end = CarbonImmutable::now('Asia/Kolkata')->addDays(18)->startOfDay()->toDateString();

        $this->createPropertyBlock($property, $checkIn, $end, PropertyAvailabilityBlockScope::RoomType->value, $roomType);
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $payload['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user, $payload)->assertSessionHasErrors('reservation');
    }

    public function test_room_level_block_reduces_capacity(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        $roomType = $this->createBookableRoomType($property, maxGuests: 2, dailyRate: 50000);
        $room = $this->createActiveRoom($property, $roomType, number: 'B-3');
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(25)->startOfDay()->toDateString();
        $end = CarbonImmutable::now('Asia/Kolkata')->addDays(28)->startOfDay()->toDateString();

        $this->createPropertyBlock($property, $checkIn, $end, PropertyAvailabilityBlockScope::Room->value, null, $room);
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $payload['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user, $payload)->assertSessionHasErrors('reservation');
    }

    public function test_min_capacity_must_hold_for_entire_stay(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType, number: 'MC-1');
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();

        // First reservation consumes the single private room for days 5-6.
        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 3, quantity: 1);
        $this->submitReservation($user, $payload1)->assertRedirect();

        // Second reservation for overlapping days should fail.
        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $payload2['submission_token'] = (string) Str::uuid();
        $user2 = $this->createCustomerUser(['email' => 'user2@example.test']);
        $this->submitReservation($user2, $payload2)->assertSessionHasErrors('reservation');
    }

    public function test_owner_cannot_block_or_deactivate_capacity_below_existing_reservations(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType(
            $property,
            mode: PropertyRoomTypeMode::Private,
            maxGuests: 1,
        );
        $room = $this->createActiveRoom($property, $roomType, number: 'GUARD-1');
        $user = $this->createCustomerUser();
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $this->submitReservation(
            $user,
            $this->validReservationPayload($property, $roomType, $checkIn),
        )->assertRedirect();

        try {
            app(CreatePropertyAvailabilityBlock::class)->execute($owner, $property, [
                'scope' => PropertyAvailabilityBlockScope::Property->value,
                'block_type' => 'maintenance',
                'start_date' => $checkIn,
                'end_date' => $checkIn,
                'reason' => 'Conflicts with reservation',
            ]);
            $this->fail('Expected the overlapping property block to be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('availability', $exception->errors());
        }

        try {
            app(UpdatePropertyRoomOperationalStatus::class)->execute(
                $owner,
                $property,
                $room,
                PropertyRoomStatus::Inactive,
            );
            $this->fail('Expected room deactivation to be rejected.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('room', $exception->errors());
        }
    }

    public function test_public_search_and_detail_report_remaining_reservation_aware_quantity(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType(
            $property,
            mode: PropertyRoomTypeMode::Private,
            maxGuests: 1,
        );
        $this->createActiveRoom($property, $roomType, number: 'PUBLIC-1');
        $this->createActiveRoom($property, $roomType, number: 'PUBLIC-2');
        $user = $this->createCustomerUser();
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $this->submitReservation(
            $user,
            $this->validReservationPayload($property, $roomType, $checkIn),
        )->assertRedirect();

        $query = [
            'city' => $property->city_id,
            'check_in' => $checkIn,
            'duration_type' => 'daily',
            'duration_count' => 1,
            'guests' => 1,
        ];

        $this->get(route('public.search', $query))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('results.data.0.slug', $property->slug)
                ->where('results.data.0.room_summaries.0.available_quantity', 1));
        $this->get(route('public.properties.show', array_merge(['property' => $property], $query)))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('property.room_types.0.id', $roomType->id)
                ->where('property.room_types.0.available_quantity', 1));
    }

    private function createPropertyBlock(Property $property, string $start, string $end, string $scope, ?PropertyRoomType $roomType = null, ?PropertyRoom $room = null): void
    {
        $block = new PropertyAvailabilityBlock;
        $block->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType?->id,
            'property_room_id' => $room?->id,
            'scope' => $scope,
            'block_type' => 'maintenance',
            'status' => PropertyAvailabilityBlockStatus::Active->value,
            'start_date' => $start,
            'end_date' => $end,
            'is_admin_restriction' => false,
        ])->save();
    }
}
