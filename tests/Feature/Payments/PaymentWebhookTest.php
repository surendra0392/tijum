<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\PaymentWebhookEvent;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        config(['tijum.payments.razorpay.webhook_secret' => 'test-webhook-secret']);
    }

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

    public function test_unmatched_capture_can_be_replayed_after_the_order_is_available(): void
    {
        $payment = $this->createAwaitingPayment('order_not_synced_yet');

        $this->deliverCapture('order_replay', $payment->amount_minor)->assertOk();
        $this->assertDatabaseHas('payment_webhook_events', [
            'gateway_order_id' => 'order_replay',
            'status' => 'unresolved',
        ]);

        $payment->update(['gateway_order_id' => 'order_replay']);
        $this->deliverCapture('order_replay', $payment->amount_minor)->assertOk();

        $this->assertSame(PaymentStatus::Captured, $payment->fresh()->status);
        $this->assertSame(ReservationStatus::Confirmed, $payment->reservation->fresh()->status);
        $this->assertDatabaseCount('payment_webhook_events', 1);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_capture_amount_mismatch_cannot_confirm_a_booking(): void
    {
        $payment = $this->createAwaitingPayment('order_incorrect_amount');

        $this->deliverCapture('order_incorrect_amount', $payment->amount_minor - 1)->assertUnprocessable();

        $this->assertSame(PaymentStatus::Created, $payment->fresh()->status);
        $this->assertSame(ReservationStatus::AwaitingPayment, $payment->reservation->fresh()->status);
        $this->assertDatabaseHas('payment_webhook_events', ['gateway_order_id' => 'order_incorrect_amount', 'status' => 'failed']);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
    }

    public function test_later_duplicate_capture_does_not_overwrite_a_refund_state(): void
    {
        $payment = $this->createAwaitingPayment('order_refund_state');

        $this->deliverCapture('order_refund_state', $payment->amount_minor)->assertOk();
        $payment->update(['status' => PaymentStatus::PartiallyRefunded]);
        $this->deliverCapture('order_refund_state', $payment->amount_minor, 'evt_duplicate_capture')->assertOk();

        $this->assertSame(PaymentStatus::PartiallyRefunded, $payment->fresh()->status);
        $this->assertSame(ReservationStatus::Confirmed, $payment->reservation->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_reconcile_payment_events_command_replays_unresolved_capture_including_temp_order(): void
    {
        config([
            'tijum.payments.razorpay.key_id' => 'rzp_test_webhook',
            'tijum.payments.razorpay.key_secret' => 'test-webhook-key',
        ]);
        $this->app->forgetInstance(PaymentGateway::class);

        $payment = $this->createAwaitingPayment('order_placeholder_pending_sync');

        $this->deliverCapture('order_recovered_cmd', $payment->amount_minor, 'evt_cmd_temp_recover')->assertOk();
        $this->assertDatabaseHas('payment_webhook_events', [
            'event_id' => 'evt_cmd_temp_recover',
            'status' => 'unresolved',
        ]);

        $receipt = 'tijum_'.str_repeat('a', 32);
        $payment->update([
            'gateway_order_id' => 'temp_'.$receipt,
            'metadata' => ['gateway_order_receipt' => $receipt],
        ]);

        Http::fake([
            'https://api.razorpay.com/v1/orders/order_recovered_cmd' => Http::response([
                'id' => 'order_recovered_cmd',
                'receipt' => $receipt,
                'amount' => $payment->amount_minor,
                'currency' => 'INR',
                'status' => 'paid',
            ]),
        ]);

        $this->artisan('tijum:reconcile-payment-events')->assertSuccessful();

        $freshPayment = $payment->fresh();
        $this->assertSame('order_recovered_cmd', $freshPayment->gateway_order_id);
        $this->assertSame(PaymentStatus::Captured, $freshPayment->status);
        $this->assertSame(ReservationStatus::Confirmed, $payment->reservation->fresh()->status);
        $this->assertDatabaseHas('payment_webhook_events', [
            'event_id' => 'evt_cmd_temp_recover',
            'status' => 'processed',
        ]);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_order_paid_webhook_validates_order_and_confirms_booking_idempotently(): void
    {
        config([
            'tijum.payments.razorpay.key_id' => 'rzp_test_webhook',
            'tijum.payments.razorpay.key_secret' => 'test-webhook-key',
        ]);
        $this->app->forgetInstance(PaymentGateway::class);

        $payment = $this->createAwaitingPayment('order_paid_hook_1');

        Http::fake([
            'https://api.razorpay.com/v1/orders/order_paid_hook_1/payments' => Http::response([
                'items' => [[
                    'id' => 'pay_order_paid_hook_1',
                    'order_id' => 'order_paid_hook_1',
                    'amount' => $payment->amount_minor,
                    'currency' => 'INR',
                    'status' => 'captured',
                    'method' => 'upi',
                ]],
            ]),
        ]);

        $tamperedPayload = json_encode([
            'event' => 'order.paid',
            'payload' => ['order' => ['entity' => [
                'id' => 'order_paid_hook_1',
                'amount' => $payment->amount_minor - 100,
                'currency' => 'INR',
                'status' => 'paid',
            ]]],
        ], JSON_THROW_ON_ERROR);

        $this->call('POST', route('webhooks.razorpay'), server: [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $tamperedPayload, 'test-webhook-secret'),
            'HTTP_X_RAZORPAY_EVENT_ID' => 'evt_order_paid_bad_amount',
        ], content: $tamperedPayload)->assertUnprocessable();

        $this->assertSame(PaymentStatus::Created, $payment->fresh()->status);
        $this->assertSame(ReservationStatus::AwaitingPayment, $payment->reservation->fresh()->status);

        $validPayload = json_encode([
            'event' => 'order.paid',
            'payload' => ['order' => ['entity' => [
                'id' => 'order_paid_hook_1',
                'amount' => $payment->amount_minor,
                'currency' => 'INR',
                'status' => 'paid',
            ]]],
        ], JSON_THROW_ON_ERROR);

        $this->call('POST', route('webhooks.razorpay'), server: [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $validPayload, 'test-webhook-secret'),
            'HTTP_X_RAZORPAY_EVENT_ID' => 'evt_order_paid_ok_1',
        ], content: $validPayload)->assertOk();

        $freshPayment = $payment->fresh();
        $this->assertSame(PaymentStatus::Captured, $freshPayment->status);
        $this->assertSame('pay_order_paid_hook_1', $freshPayment->gateway_payment_id);
        $this->assertSame(ReservationStatus::Confirmed, $payment->reservation->fresh()->status);

        // Duplicate order.paid (new event id) and later payment.captured remain idempotent
        $this->call('POST', route('webhooks.razorpay'), server: [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $validPayload, 'test-webhook-secret'),
            'HTTP_X_RAZORPAY_EVENT_ID' => 'evt_order_paid_ok_dup',
        ], content: $validPayload)->assertOk();
        $this->deliverCapture('order_paid_hook_1', $payment->amount_minor, 'evt_order_paid_follow_capture')->assertOk();

        $this->assertSame(PaymentStatus::Captured, $payment->fresh()->status);
        $this->assertSame(ReservationStatus::Confirmed, $payment->reservation->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_capture_after_failed_attempt_clears_stale_failure_fields(): void
    {
        $payment = $this->createAwaitingPayment('order_retry_after_fail');

        $failedPayload = json_encode([
            'event' => 'payment.failed',
            'payload' => ['payment' => ['entity' => [
                'id' => 'pay_failed_first',
                'order_id' => 'order_retry_after_fail',
                'amount' => $payment->amount_minor,
                'currency' => 'INR',
                'status' => 'failed',
                'error_code' => 'BAD_REQUEST_ERROR',
                'error_description' => 'Card declined by issuer',
            ]]],
        ], JSON_THROW_ON_ERROR);

        $this->call('POST', route('webhooks.razorpay'), server: [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $failedPayload, 'test-webhook-secret'),
            'HTTP_X_RAZORPAY_EVENT_ID' => 'evt_failed_first',
        ], content: $failedPayload)->assertOk();

        $failedPayment = $payment->fresh();
        $this->assertSame(PaymentStatus::Failed, $failedPayment->status);
        $this->assertSame('BAD_REQUEST_ERROR', $failedPayment->failure_code);
        $this->assertSame('Card declined by issuer', $failedPayment->failure_description);

        $this->deliverCapture('order_retry_after_fail', $payment->amount_minor, 'evt_capture_retry_ok')->assertOk();

        $recoveredPayment = $payment->fresh();
        $this->assertSame(PaymentStatus::Captured, $recoveredPayment->status);
        $this->assertNull($recoveredPayment->failure_code);
        $this->assertNull($recoveredPayment->failure_description);
        $this->assertSame(ReservationStatus::Confirmed, $payment->reservation->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    private function createAwaitingPayment(string $orderId): ReservationPayment
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();
        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        return $reservation->payments()->create([
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => $orderId,
            'idempotency_key' => 'idemp_'.$orderId,
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ]);
    }

    private function deliverCapture(string $orderId, int $amount, ?string $eventId = null): TestResponse
    {
        $payload = json_encode([
            'event' => 'payment.captured',
            'payload' => ['payment' => ['entity' => [
                'id' => 'pay_'.$orderId,
                'order_id' => $orderId,
                'amount' => $amount,
                'currency' => 'INR',
                'status' => 'captured',
            ]]],
        ], JSON_THROW_ON_ERROR);

        return $this->call('POST', route('webhooks.razorpay'), server: array_filter([
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $payload, 'test-webhook-secret'),
            'HTTP_X_RAZORPAY_EVENT_ID' => $eventId,
        ]), content: $payload);
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
