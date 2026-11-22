<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Enums\PropertyRoomTypeMode;
use App\Enums\ReservationStatus;
use App\Models\Owner;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ReservationLifecycleAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_confirmed_reservation_can_be_cancelled_by_owner(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();
        $reservation->forceFill(['status' => ReservationStatus::Confirmed->value])->save();

        // Owner cancels.
        $this->actingAs($owner, 'owner')
            ->post(route('owner.reservations.cancel', $reservation->booking_reference), ['cancellation_reason' => 'Owner cancel'])
            ->assertRedirect();

        $this->assertSame(ReservationStatus::Cancelled, $reservation->fresh()->status);
    }

    public function test_customer_can_cancel_awaiting_payment_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        // Cancel while awaiting payment.
        $this->actingAs($user, 'web')
            ->post(route('reservations.cancel', $reservation->booking_reference), ['cancellation_reason' => 'Changed mind'])
            ->assertRedirect();

        $this->assertSame(ReservationStatus::Cancelled, $reservation->fresh()->status);
        $this->actingAs($user, 'web')
            ->post(route('reservations.cancel', $reservation->booking_reference), ['cancellation_reason' => 'Repeated'])
            ->assertSessionHasErrors('reservation');
    }

    public function test_cancellation_releases_capacity(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType, number: 'RC-1');
        $user1 = $this->createCustomerUser();
        $user2 = $this->createCustomerUser(['email' => 'user2@example.test']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();

        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $this->submitReservation($user1, $payload1)->assertRedirect();
        $reservation1 = Reservation::query()->where('submission_token', $payload1['submission_token'])->first();

        // Cancel releases capacity.
        $this->actingAs($user1, 'web')
            ->post(route('reservations.cancel', $reservation1->booking_reference), ['cancellation_reason' => 'Customer cancelled'])
            ->assertRedirect();

        // Another user can now book the same dates.
        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 1, quantity: 1);
        $payload2['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user2, $payload2)->assertRedirect();
    }

    public function test_cross_tenant_owner_gets_404_on_other_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $otherOwner = $this->createActiveOwner(['email' => 'other@example.test']);
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        $this->actingAs($otherOwner, 'owner')
            ->get(route('owner.reservations.show', $reservation->booking_reference))
            ->assertNotFound();
    }

    public function test_cross_tenant_customer_gets_404_on_other_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user1 = $this->createCustomerUser();
        $user2 = $this->createCustomerUser(['email' => 'user2@example.test']);

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user1, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        $this->actingAs($user2, 'web')
            ->get(route('reservations.show', $reservation->booking_reference))
            ->assertNotFound();
        $this->actingAs($user2, 'web')
            ->post(route('reservations.cancel', $reservation->booking_reference), ['cancellation_reason' => 'Manipulated reference'])
            ->assertNotFound();
    }

    public function test_invalid_transitions_are_rejected(): void
    {
        $status = ReservationStatus::Confirmed;

        $this->assertTrue($status->canTransitionTo(ReservationStatus::Cancelled));
        $this->assertFalse($status->canTransitionTo(ReservationStatus::AwaitingPayment));
        $this->assertFalse($status->canTransitionTo(ReservationStatus::Expired));

        $cancelled = ReservationStatus::Cancelled;
        $this->assertFalse($cancelled->canTransitionTo(ReservationStatus::Confirmed));
        $this->assertFalse($cancelled->canTransitionTo(ReservationStatus::AwaitingPayment));
    }
}
