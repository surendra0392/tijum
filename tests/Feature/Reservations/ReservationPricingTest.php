<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Enums\PropertyRoomTypeMode;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ReservationPricingTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_daily_weekly_and_monthly_integer_totals(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $user = $this->createCustomerUser();

        $cases = [
            ['daily', 1, 100000, 100000],
            ['daily', 3, 100000, 300000],
            ['weekly', 1, 650000, 650000],
            ['weekly', 2, 650000, 1300000],
            ['monthly', 1, 2600000, 2600000],
            ['monthly', 2, 2600000, 5200000],
        ];

        $counter = 0;
        foreach ($cases as [$durationType, $units, $rate, $expectedTotal]) {
            $counter++;
            $roomType = $this->createBookableRoomType(
                $property,
                name: 'Pricing Room '.$durationType.' '.$counter,
                mode: PropertyRoomTypeMode::Private,
                maxGuests: 1,
                dailyRate: $durationType === 'daily' ? $rate : 100000,
                weeklyRate: $durationType === 'weekly' ? $rate : 650000,
                monthlyRate: $durationType === 'monthly' ? $rate : 2600000,
            );
            $this->createActiveRoom($property, $roomType, number: 'P-'.$durationType[0].$counter);

            $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(10)->startOfDay()->toDateString();
            $payload = $this->validReservationPayload($property, $roomType, $checkIn, $durationType, $units, quantity: 1);

            $this->submitReservation($user, $payload)->assertRedirect();

            $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();
            $this->assertSame($expectedTotal, $reservation->total_amount_minor);
            $this->assertSame($rate, $reservation->unit_rate_minor);
        }
    }

    public function test_multiple_units_quantity_multiplies_total(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Shared, maxGuests: 4, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(10)->startOfDay()->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 3);

        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();
        $this->assertSame(150000, $reservation->total_amount_minor);
        $this->assertSame(3, $reservation->quantity);
        $this->assertSame(3, $reservation->guest_count);
    }

    public function test_later_price_change_preserves_snapshot(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(10)->startOfDay()->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);

        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();
        $originalTotal = $reservation->total_amount_minor;
        $originalRate = $reservation->unit_rate_minor;

        // Change the room type rate after reservation is created.
        $roomType->forceFill(['daily_rate_minor' => 999999])->save();

        // The reservation snapshot must remain unchanged.
        $reservation->refresh();
        $this->assertSame($originalRate, $reservation->unit_rate_minor);
        $this->assertSame($originalTotal, $reservation->total_amount_minor);
        $this->assertSame(100000, $reservation->unit_rate_minor);
    }

    public function test_private_room_type_rate_must_be_positive(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 0);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);

        $this->submitReservation($user, $payload)
            ->assertSessionHasErrors('reservation');
    }
}
