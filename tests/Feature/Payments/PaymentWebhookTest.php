<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\PaymentWebhookEvent;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_webhook_requires_signature_and_payload(): void
    {
        $response = $this->postJson(route('webhooks.razorpay'), []);
        $response->assertBadRequest();
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $payload = json_encode([
            'entity' => 'event',
            'event' => 'payment.captured',
        ]);

        $response = $this->call(
            'POST',
            route('webhooks.razorpay'),
            [],
            [],
            [],
            [
                'HTTP_X-Razorpay-Signature' => 'invalid_sha256_signature',
                'CONTENT_TYPE' => 'application/json',
            ],
            $payload,
        );

        $response->assertBadRequest();
    }

    public function test_webhook_processes_payment_captured_and_deduplicates(): void
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
            'gateway_order_id' => 'order_hook_111',
            'idempotency_key' => 'idemp_hook_111',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ])->save();

        $webhookSecret = config('tijum.payments.razorpay.webhook_secret', 'rzp_test_webhook_secret');

        $body = [
            'entity' => 'event',
            'account_id' => 'acc_test',
            'event' => 'payment.captured',
            'contains' => ['payment'],
            'payload' => [
                'payment' => [
                    'entity' => [
                        'id' => 'pay_hook_999',
                        'order_id' => 'order_hook_111',
                        'amount' => $reservation->total_amount_minor,
                        'currency' => 'INR',
                        'status' => 'captured',
                        'method' => 'card',
                    ],
                ],
            ],
            'created_at' => time(),
        ];

        $rawBody = (string) json_encode($body);
        $signature = hash_hmac('sha256', $rawBody, (string) $webhookSecret);

        // First delivery: processes successfully.
        $response1 = $this->call(
            'POST',
            route('webhooks.razorpay'),
            [],
            [],
            [],
            [
                'HTTP_X-Razorpay-Signature' => $signature,
                'CONTENT_TYPE' => 'application/json',
            ],
            $rawBody,
        );

        $response1->assertOk()
            ->assertJson(['status' => 'ok']);

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Confirmed, $reservation->status);

        $payment->refresh();
        $this->assertSame(PaymentStatus::Captured, $payment->status);
        $this->assertSame('pay_hook_999', $payment->gateway_payment_id);
        $this->assertSame('card', $payment->payment_method);

        // Second delivery of exact same payload: deduplicated, no error, returns OK.
        $response2 = $this->call(
            'POST',
            route('webhooks.razorpay'),
            [],
            [],
            [],
            [
                'HTTP_X-Razorpay-Signature' => $signature,
                'CONTENT_TYPE' => 'application/json',
            ],
            $rawBody,
        );

        $response2->assertOk()
            ->assertJson(['status' => 'ok']);

        $this->assertSame(1, PaymentWebhookEvent::query()->count());
    }

    public function test_webhook_processes_payment_failed(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_fail_222',
            'idempotency_key' => 'idemp_fail_222',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ])->save();

        $webhookSecret = config('tijum.payments.razorpay.webhook_secret', 'rzp_test_webhook_secret');

        $body = [
            'entity' => 'event',
            'event' => 'payment.failed',
            'payload' => [
                'payment' => [
                    'entity' => [
                        'id' => 'pay_fail_222',
                        'order_id' => 'order_fail_222',
                        'amount' => $reservation->total_amount_minor,
                        'currency' => 'INR',
                        'status' => 'failed',
                        'error_description' => 'Card expired',
                    ],
                ],
            ],
            'created_at' => time(),
        ];

        $rawBody = (string) json_encode($body);
        $signature = hash_hmac('sha256', $rawBody, (string) $webhookSecret);

        $this->call(
            'POST',
            route('webhooks.razorpay'),
            [],
            [],
            [],
            [
                'HTTP_X-Razorpay-Signature' => $signature,
                'CONTENT_TYPE' => 'application/json',
            ],
            $rawBody,
        )->assertOk();

        $payment->refresh();
        $this->assertSame(PaymentStatus::Failed, $payment->status);
        $this->assertSame('Card expired', $payment->failure_reason);
    }
}
