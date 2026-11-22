<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationStatus;
use App\Enums\ReservationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

trait ReservationTestHelpers
{
    use PropertyTestHelpers;

    protected function createBookableProperty(Owner $owner, bool $foodProvided = true): Property
    {
        $property = $this->createProperty(
            $owner,
            approved: true,
            appStatus: PropertyVerificationStatus::Approved,
            opStatus: PropertyOperationalStatus::Active,
        );

        $property->forceFill([
            'food_provided' => $foodProvided,
            'breakfast_included' => true,
            'lunch_included' => true,
            'dinner_included' => true,
            'booking_eligible' => true,
        ])->save();

        return $property->fresh();
    }

    protected function createBookableRoomType(
        Property $property,
        string $name = 'Standard Room',
        PropertyRoomTypeMode $mode = PropertyRoomTypeMode::Shared,
        int $maxGuests = 4,
        int $dailyRate = 100000,
        int $weeklyRate = 650000,
        int $monthlyRate = 2600000,
        bool $earlyCheckIn = false,
        string $gender = 'all_genders',
        array $composition = ['individuals'],
    ): PropertyRoomType {
        $roomType = new PropertyRoomType;
        $roomType->forceFill(array_merge([
            'property_id' => $property->id,
            'name' => $name,
            'slug' => str($name)->slug()->toString().'-'.strtolower(bin2hex(random_bytes(2))),
            'accommodation_mode' => $mode->value,
            'sharing_capacity' => $maxGuests,
            'max_guests_per_room' => $maxGuests,
            'is_air_conditioned' => true,
            'gender_policy' => $gender,
            'guest_composition_policy' => $composition,
            'early_check_in_enabled' => $earlyCheckIn,
            'is_active' => true,
            'is_approved_version' => true,
            'display_order' => 0,
            'daily_rate_minor' => $dailyRate,
            'weekly_rate_minor' => $weeklyRate,
            'monthly_rate_minor' => $monthlyRate,
        ]))->save();

        return $roomType->fresh();
    }

    protected function createActiveRoom(
        Property $property,
        PropertyRoomType $roomType,
        string $number = '101',
    ): PropertyRoom {
        $room = new PropertyRoom;
        $room->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'room_number' => $number,
            'floor_number' => '1',
            'operational_status' => PropertyRoomStatus::Active->value,
            'is_approved_version' => true,
        ])->save();

        return $room->fresh();
    }

    protected function createCustomerUser(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'email_verified_at' => now(),
        ], $overrides));
    }

    protected function createActiveOwner(array $overrides = []): Owner
    {
        return Owner::factory()->active()->create(array_merge([
            'email_verified_at' => now(),
        ], $overrides));
    }

    protected function validReservationPayload(
        Property $property,
        PropertyRoomType $roomType,
        ?string $checkIn = null,
        string $durationType = 'daily',
        int $durationQuantity = 1,
        int $quantity = 1,
        array $overrides = [],
    ): array {
        $checkIn ??= CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();

        return array_merge([
            'submission_token' => (string) Str::uuid(),
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => $checkIn,
            'duration_type' => $durationType,
            'duration_quantity' => $durationQuantity,
            'quantity' => $quantity,
            'guest_count' => $quantity,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => 'Test Guest',
            'contact_email' => 'guest@example.test',
            'contact_phone' => '+919999999999',
            'early_check_in_requested' => false,
            'requested_arrival_time' => null,
        ], $overrides);
    }

    protected function submitReservation(User $user, array $payload)
    {
        return $this->actingAs($user, 'web')
            ->post(route('reservations.store'), $payload);
    }

    protected function assertPendingReservation(User $user, string $token, Property $property, PropertyRoomType $roomType): void
    {
        $reservation = Reservation::query()
            ->where('user_id', $user->id)
            ->where('submission_token', $token)
            ->firstOrFail();

        $this->assertSame('awaiting_payment', $reservation->status->value);
        $this->assertNotNull($reservation->payment_deadline_at);
        $this->assertSame($property->id, $reservation->property_id);
        $this->assertSame($roomType->id, $reservation->property_room_type_id);
        $this->assertSame($property->name, $reservation->snapshot_property_name);
        $this->assertSame($roomType->name, $reservation->snapshot_room_type_name);
        $this->assertSame($property->food_provided, $reservation->snapshot_food_provided);
        $this->assertSame($property->breakfast_included, $reservation->snapshot_breakfast_included);
        $this->assertSame($property->lunch_included, $reservation->snapshot_lunch_included);
        $this->assertSame($property->dinner_included, $reservation->snapshot_dinner_included);
        $this->assertSame($roomType->is_air_conditioned, $reservation->snapshot_is_air_conditioned);
        $this->assertSame($roomType->accommodation_mode->value, $reservation->snapshot_sharing_mode);
        $this->assertTrue($reservation->unit_rate_minor > 0);
        $this->assertTrue($reservation->total_amount_minor > 0);
        $this->assertNotNull($reservation->submitted_at);
    }

    protected function confirmAndPayReservation(Reservation $reservation): Reservation
    {
        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'confirmed_at' => now(),
        ])->save();

        return $reservation->fresh();
    }
}
