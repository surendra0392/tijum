<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PaymentOrderCreationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_customer_can_initiate_payment_order_for_awaiting_payment_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->status);

        // Fake Razorpay orders API.
        Http::fake([
            'https://api.razorpay.com/v1/orders' => Http::response([
                'id' => 'order_test_123456',
                'entity' => 'order',
                'amount' => $reservation->total_amount_minor,
                'currency' => 'INR',
                'status' => 'created',
                'receipt' => $reservation->booking_reference,
            ], 200),
        ]);

        $response = $this->actingAs($user, 'web')
            ->postJson(route('reservations.pay', $reservation->booking_reference));

        $response->assertOk()
            ->assertJson([
                'gateway_order_id' => 'order_test_123456',
                'amount_minor' => $reservation->total_amount_minor,
                'currency' => 'INR',
            ]);

        $this->assertDatabaseHas('reservation_payments', [
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_test_123456',
            'amount_minor' => $reservation->total_amount_minor,
            'status' => PaymentStatus::Pending->value,
        ]);
    }

    public function test_existing_order_is_reused_if_valid_and_unpaid(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        // Create an initial payment attempt.
        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_existing_999',
            'idempotency_key' => 'idemp_existing_999',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ])->save();

        // Gateway order creation should NOT be called because existing order is reused.
        Http::fake([
            'https://api.razorpay.com/v1/orders' => Http::response([], 500),
        ]);

        $response = $this->actingAs($user, 'web')
            ->postJson(route('reservations.pay', $reservation->booking_reference));

        $response->assertOk()
            ->assertJson([
                'gateway_order_id' => 'order_existing_999',
                'amount_minor' => $reservation->total_amount_minor,
            ]);

        $this->assertSame(1, ReservationPayment::query()->where('reservation_id', $reservation->id)->count());
    }

    public function test_prevents_payment_initiation_if_reservation_is_not_awaiting_payment(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        // Put reservation into a non-awaiting-payment status (e.g. Confirmed).
        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
        ])->save();

        $response = $this->actingAs($user, 'web')
            ->postJson(route('reservations.pay', $reservation->booking_reference));

        $response->assertStatus(422)
            ->assertJson(['message' => 'This reservation is not awaiting payment.']);
    }

    public function test_prevents_payment_initiation_if_deadline_is_expired(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now()->subMinute(),
        ])->save();

        $response = $this->actingAs($user, 'web')
            ->postJson(route('reservations.pay', $reservation->booking_reference));

        $response->assertStatus(422)
            ->assertJson(['message' => 'The payment window for this reservation has expired.']);
    }

    public function test_other_customer_cannot_initiate_payment(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();
        $otherUser = $this->createCustomerUser(['email' => 'intruder@example.test']);

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now()->addMinutes(15),
        ])->save();

        $this->actingAs($otherUser, 'web')
            ->postJson(route('reservations.pay', $reservation->booking_reference))
            ->assertForbidden();
    }
}
