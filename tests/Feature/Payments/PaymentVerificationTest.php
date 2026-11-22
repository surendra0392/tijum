<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Actions\Reservations\ReservationLifecycle;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PaymentVerificationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'tijum.payments.razorpay.key_id' => 'rzp_test_verification',
            'tijum.payments.razorpay.key_secret' => 'test-checkout-secret',
            'tijum.payments.live_enabled' => false,
        ]);
    }

    public function test_checkout_rejects_a_different_provider_payment_identity(): void
    {
        [$reservation, $payment] = $this->createCheckout();
        $this->fakeCapturedPayment($payment, providerPaymentId: 'pay_different');

        $this->verifyCheckout($reservation, $payment)->assertSessionHasErrors('payment');

        $this->assertNull($payment->refresh()->gateway_payment_id);
        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->refresh()->status);
    }

    #[DataProvider('elapsedCheckoutStates')]
    public function test_late_checkout_capture_cannot_take_a_room_rebooked_after_the_hold_elapsed(bool $wasExpired): void
    {
        [$reservation, $payment] = $this->createCheckout();
        $reservation->update(['payment_deadline_at' => now()->subMinute()]);
        if ($wasExpired) {
            app(ReservationLifecycle::class)->expire($reservation);
        }
        $replacement = $this->validReservationPayload($reservation->property, $reservation->roomType, $reservation->check_in_date->toDateString());
        $this->submitReservation($this->createCustomerUser(), $replacement)->assertRedirect();
        $other = Reservation::query()->where('submission_token', $replacement['submission_token'])->firstOrFail();
        $this->fakeCapturedPayment($payment);

        $this->verifyCheckout($reservation, $payment)->assertSessionHas('status', 'Payment received. Your reservation requires manual review.');

        $this->assertSame(ReservationStatus::Expired, $reservation->refresh()->status);
        $this->assertTrue($reservation->requires_refund_review);
        $this->assertSame(ReservationStatus::AwaitingPayment, $other->refresh()->status);
        $this->assertSame(PaymentStatus::Captured, $payment->refresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    /** @return array<string, array{bool}> */
    public static function elapsedCheckoutStates(): array
    {
        return ['awaiting expiry job' => [false], 'already expired' => [true]];
    }

    public function test_checkout_replay_preserves_a_partially_refunded_payment(): void
    {
        [$reservation, $payment] = $this->createCheckout();
        $this->fakeCapturedPayment($payment);
        $this->verifyCheckout($reservation, $payment)->assertRedirect();
        $payment->update(['status' => PaymentStatus::PartiallyRefunded]);

        $this->verifyCheckout($reservation, $payment)->assertRedirect();

        $this->assertSame(PaymentStatus::PartiallyRefunded, $payment->refresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    /** @return array{Reservation, ReservationPayment} */
    private function createCheckout(): array
    {
        $property = $this->createBookableProperty($this->createActiveOwner());
        $roomType = $this->createBookableRoomType($property, maxGuests: 1, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();
        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();
        $payment = ReservationPayment::query()->create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_verify_identity',
            'idempotency_key' => 'idemp_verify_identity',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Pending,
        ]);

        return [$reservation, $payment];
    }

    private function fakeCapturedPayment(ReservationPayment $payment, string $providerPaymentId = 'pay_verified'): void
    {
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_verified' => Http::response([
                'id' => $providerPaymentId,
                'order_id' => $payment->gateway_order_id,
                'amount' => $payment->amount_minor,
                'currency' => $payment->currency,
                'status' => 'captured',
            ]),
        ]);
    }

    private function verifyCheckout(Reservation $reservation, ReservationPayment $payment): TestResponse
    {
        return $this->actingAs($reservation->user, 'web')
            ->post(route('reservations.verify-payment', $reservation->booking_reference), [
                'razorpay_order_id' => $payment->gateway_order_id,
                'razorpay_payment_id' => 'pay_verified',
                'razorpay_signature' => hash_hmac('sha256', $payment->gateway_order_id.'|pay_verified', 'test-checkout-secret'),
            ]);
    }

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
