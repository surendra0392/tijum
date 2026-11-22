<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ReservationTimingTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_seven_oh_zero_and_eight_five_nine_are_eligible_early_arrival(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, earlyCheckIn: true);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        foreach (['07:00', '08:59'] as $arrivalTime) {
            $payload = $this->validReservationPayload($property, $roomType, overrides: [
                'early_check_in_requested' => true,
                'requested_arrival_time' => $arrivalTime,
            ]);
            $this->submitReservation($user, $payload)->assertRedirect();

            $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();
            $this->assertTrue($reservation->early_check_in_requested);
            $this->assertSame($arrivalTime, $reservation->requested_arrival_time);
        }
    }

    public function test_before_seven_is_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, earlyCheckIn: true);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, overrides: [
            'early_check_in_requested' => true,
            'requested_arrival_time' => '06:59',
        ]);
        $this->submitReservation($user, $payload)->assertSessionHasErrors('reservation');
    }

    public function test_nine_or_later_as_early_is_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, earlyCheckIn: true);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, overrides: [
            'early_check_in_requested' => true,
            'requested_arrival_time' => '09:00',
        ]);
        $this->submitReservation($user, $payload)->assertSessionHasErrors('reservation');
    }

    public function test_early_check_in_disabled_is_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, earlyCheckIn: false);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, overrides: [
            'early_check_in_requested' => true,
            'requested_arrival_time' => '07:30',
        ]);
        $this->submitReservation($user, $payload)->assertSessionHasErrors('reservation');
    }

    public function test_timezone_is_asia_kolkata(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();
        $this->assertSame('Asia/Kolkata', config('tijum.pricing.timezone'));
        $this->assertSame('09:00', config('tijum.pricing.check_in_time'));
        $this->assertSame('08:00', config('tijum.pricing.check_out_time'));
        $this->assertSame('07:00', config('tijum.pricing.earliest_early_check_in_time'));
    }

    public function test_caveat_data_early_arrival_availability_not_verifiable(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, earlyCheckIn: true);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, overrides: [
            'early_check_in_requested' => true,
            'requested_arrival_time' => '07:30',
        ]);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();
        $this->assertTrue($reservation->early_check_in_requested);
        $this->assertSame('07:30', $reservation->requested_arrival_time);
    }
}
