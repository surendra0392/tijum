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

class PaymentVerificationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_valid_checkout_signature_and_server_capture_confirms_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now()->addMinutes(15),
        ])->save();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_verify_123',
            'idempotency_key' => 'idemp_verify_123',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ])->save();

        $keySecret = config('tijum.payments.razorpay.key_secret', 'rzp_test_secret');
        $signature = hash_hmac('sha256', 'order_verify_123|pay_capture_456', (string) $keySecret);

        // Fake Razorpay payment fetch endpoint.
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_capture_456' => Http::response([
                'id' => 'pay_capture_456',
                'order_id' => 'order_verify_123',
                'amount' => $reservation->total_amount_minor,
                'currency' => 'INR',
                'status' => 'captured',
                'method' => 'upi',
            ], 200),
        ]);

        $response = $this->actingAs($user, 'web')
            ->post(route('reservations.verify-payment', $reservation->booking_reference), [
                'razorpay_order_id' => 'order_verify_123',
                'razorpay_payment_id' => 'pay_capture_456',
                'razorpay_signature' => $signature,
            ]);

        $response->assertRedirect(route('reservations.show', $reservation->booking_reference));
        $response->assertSessionHas('status', 'Payment successful! Your stay reservation is confirmed.');

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Confirmed, $reservation->status);
        $this->assertNotNull($reservation->confirmed_at);

        $payment->refresh();
        $this->assertSame(PaymentStatus::Captured, $payment->status);
        $this->assertSame('pay_capture_456', $payment->gateway_payment_id);
        $this->assertSame('upi', $payment->payment_method);
        $this->assertNotNull($payment->captured_at);
    }

    public function test_invalid_signature_rejects_verification_and_does_not_confirm(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now()->addMinutes(15),
        ])->save();

        $response = $this->actingAs($user, 'web')
            ->post(route('reservations.verify-payment', $reservation->booking_reference), [
                'razorpay_order_id' => 'order_fake_123',
                'razorpay_payment_id' => 'pay_fake_456',
                'razorpay_signature' => 'invalid_tampered_signature',
            ]);

        $response->assertSessionHasErrors(['signature' => 'Payment signature verification failed.']);

        $reservation->refresh();
        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->status);
    }
}
