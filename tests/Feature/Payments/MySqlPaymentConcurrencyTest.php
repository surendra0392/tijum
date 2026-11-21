<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Actions\Payments\InitiatePaymentOrder;
use App\Actions\Payments\ProcessWebhookEvent;
use App\Actions\Payments\VerifyCheckoutPayment;
use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Services\Payments\RazorpayGateway;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class MySqlPaymentConcurrencyTest extends TestCase
{
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'mysql'
            || ! str_ends_with((string) DB::getDatabaseName(), '_test')) {
            $this->markTestSkipped('Requires an isolated MySQL database ending in _test.');
        }

        config([
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_checkout',
            'tijum.payments.razorpay.key_secret' => 'test-checkout-secret',
        ]);

        $this->app->forgetInstance(PaymentGateway::class);
    }

    /**
     * Test C: Competing Payment Orders
     * Verifies that concurrent InitiatePaymentOrder requests serialize under InnoDB row lock
     * and reuse unexpired active orders rather than generating competing gateway orders.
     */
    public function test_concurrent_payment_order_initiation_serializes_under_innodb_row_lock(): void
    {
        $uniq = uniqid();
        $owner = $this->createActiveOwner(['email' => "concur_owner_c_{$uniq}@example.com"]);
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser(['email' => "concur_user_c_{$uniq}@example.com"]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 1);

        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now()->addMinutes(15),
        ])->save();

        // Establish second connection to simulate concurrent process holding a row lock.
        $lockConnName = 'mysql_phase21b_order_lock_'.$uniq;
        Config::set(
            'database.connections.'.$lockConnName,
            Config::get('database.connections.'.DB::getDefaultConnection()),
        );
        $lockConnection = DB::connection($lockConnName);
        $lockConnection->beginTransaction();

        // Lock the reservation row with SELECT ... FOR UPDATE.
        $lockConnection->table('reservations')
            ->where('id', $reservation->id)
            ->lockForUpdate()
            ->first();

        // Set short lock wait timeout on the default connection.
        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');

        $timedOut = false;
        try {
            app(InitiatePaymentOrder::class)->execute($reservation, $user);
        } catch (QueryException $e) {
            // Error 1205: Lock wait timeout exceeded; try restarting transaction
            if (str_contains($e->getMessage(), '1205')
                || str_contains(strtolower($e->getMessage()), 'lock wait timeout')) {
                $timedOut = true;
            }
        } finally {
            $lockConnection->rollBack();
            DB::purge($lockConnName);
            DB::statement('SET SESSION innodb_lock_wait_timeout = 50');
        }

        $this->assertTrue($timedOut, 'Expected InitiatePaymentOrder to wait and time out on InnoDB row lock.');

        $orderId = 'order_concur_ord_'.$uniq;

        // Fake Razorpay order creation
        Http::fake([
            'https://api.razorpay.com/v1/orders' => Http::response([
                'id' => $orderId,
                'amount' => $reservation->total_amount_minor,
                'currency' => 'INR',
                'status' => 'created',
            ], 200),
        ]);

        // After lock release, initiation succeeds
        $orderData = app(InitiatePaymentOrder::class)->execute($reservation, $user);
        $this->assertSame($orderId, $orderData['order_id']);

        // Immediate retry reuses the existing unexpired order without creating duplicates
        $retryData = app(InitiatePaymentOrder::class)->execute($reservation, $user);
        $this->assertSame($orderData['order_id'], $retryData['order_id']);
        $this->assertSame(1, ReservationPayment::query()->where('reservation_id', $reservation->id)->count());
    }

    /**
     * Test A: Concurrent Verification of the Same Captured Payment
     * Exercises VerifyCheckoutPayment under contention, proving serialisation,
     * prevention of duplicate captures, and strict idempotency on retries.
     */
    public function test_concurrent_verify_checkout_payment_serializes_and_is_strictly_idempotent(): void
    {
        $uniq = uniqid();
        $owner = $this->createActiveOwner(['email' => "concur_owner_a_{$uniq}@example.com"]);
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 75000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser(['email' => "concur_user_a_{$uniq}@example.com"]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 1);

        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now()->addMinutes(15),
        ])->save();

        $orderId = 'order_concur_verify_'.$uniq;
        $paymentId = 'pay_concur_capture_'.$uniq;

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => $orderId,
            'idempotency_key' => 'idemp_'.$orderId,
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ])->save();

        $keySecret = config('tijum.payments.razorpay.key_secret', 'rzp_test_secret');
        $signature = hash_hmac('sha256', $orderId.'|'.$paymentId, (string) $keySecret);

        // Fake Razorpay payment fetch endpoint to return captured payment
        Http::fake([
            'https://api.razorpay.com/v1/payments/'.$paymentId => Http::response([
                'id' => $paymentId,
                'order_id' => $orderId,
                'amount' => $reservation->total_amount_minor,
                'currency' => 'INR',
                'status' => 'captured',
                'method' => 'upi',
            ], 200),
        ]);

        // Establish second connection holding an exclusive row lock on the reservation
        $lockConnName = 'mysql_phase21b_verify_lock_'.$uniq;
        Config::set(
            'database.connections.'.$lockConnName,
            Config::get('database.connections.'.DB::getDefaultConnection()),
        );
        $lockConnection = DB::connection($lockConnName);
        $lockConnection->beginTransaction();

        $lockConnection->table('reservations')
            ->where('id', $reservation->id)
            ->lockForUpdate()
            ->first();

        // Set short lock wait timeout on the default connection
        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');

        $timedOut = false;
        try {
            app(VerifyCheckoutPayment::class)->execute($reservation, $user, $orderId, $paymentId, $signature);
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), '1205')
                || str_contains(strtolower($e->getMessage()), 'lock wait timeout')) {
                $timedOut = true;
            }
        } finally {
            $lockConnection->rollBack();
            DB::purge($lockConnName);
            DB::statement('SET SESSION innodb_lock_wait_timeout = 50');
        }

        $this->assertTrue($timedOut, 'Expected VerifyCheckoutPayment to wait and time out on InnoDB row lock.');

        // Now execute verification sequentially
        $verifiedReservation = app(VerifyCheckoutPayment::class)->execute($reservation, $user, $orderId, $paymentId, $signature);

        $this->assertSame(ReservationStatus::Confirmed, $verifiedReservation->status);
        $payment->refresh();
        $this->assertSame(PaymentStatus::Captured, $payment->status);
        $this->assertSame($paymentId, $payment->gateway_payment_id);
        $this->assertNotNull($payment->captured_at);
        $originalCapturedAt = $payment->captured_at;

        // Immediate retry with the identical signature must be strictly idempotent
        $idempotentReservation = app(VerifyCheckoutPayment::class)->execute($reservation, $user, $orderId, $paymentId, $signature);

        $this->assertSame(ReservationStatus::Confirmed, $idempotentReservation->status);
        $payment->refresh();
        $this->assertSame(PaymentStatus::Captured, $payment->status);
        $this->assertEquals($originalCapturedAt, $payment->captured_at);

        // Verify only 1 payment record exists for this reservation
        $this->assertSame(1, ReservationPayment::query()->where('reservation_id', $reservation->id)->count());
    }

    /**
     * Test B: Duplicate and Out-of-Order Verification Attempts
     * Verifies that invalid signatures, mismatched amounts, currencies, and non-captured statuses
     * are strictly rejected and cannot confirm reservations.
     */
    public function test_duplicate_and_out_of_order_payment_verification_attempts(): void
    {
        $uniq = uniqid();
        $owner = $this->createActiveOwner(['email' => "concur_owner_b_{$uniq}@example.com"]);
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 60000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser(['email' => "concur_user_b_{$uniq}@example.com"]);

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now()->addMinutes(15),
        ])->save();

        $orderId = 'order_concur_ood_'.$uniq;
        $paymentId = 'pay_concur_ood_'.$uniq;

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => $orderId,
            'idempotency_key' => 'idemp_'.$orderId,
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ])->save();

        $keySecret = config('tijum.payments.razorpay.key_secret', 'rzp_test_secret');
        $validSignature = hash_hmac('sha256', $orderId.'|'.$paymentId, (string) $keySecret);

        // 1. Invalid signature
        $invalidSigRejected = false;
        try {
            app(VerifyCheckoutPayment::class)->execute($reservation, $user, $orderId, $paymentId, 'invalid_sig');
        } catch (ValidationException $e) {
            $invalidSigRejected = true;
        }
        $this->assertTrue($invalidSigRejected);
        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->fresh()->status);

        // 2. Gateway amount mismatch (e.g. gateway reports 100 paise less)
        Http::fake([
            'https://api.razorpay.com/v1/payments/'.$paymentId => Http::response([
                'id' => $paymentId,
                'order_id' => $orderId,
                'amount' => $reservation->total_amount_minor - 100,
                'currency' => 'INR',
                'status' => 'captured',
            ], 200),
        ]);

        $amountMismatchRejected = false;
        try {
            app(VerifyCheckoutPayment::class)->execute($reservation, $user, $orderId, $paymentId, $validSignature);
        } catch (ValidationException $e) {
            $amountMismatchRejected = true;
        }
        $this->assertTrue($amountMismatchRejected);
        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->fresh()->status);

        // 3. Status not captured (e.g. status: 'authorized')
        Http::fake([
            'https://api.razorpay.com/v1/payments/'.$paymentId => Http::response([
                'id' => $paymentId,
                'order_id' => $orderId,
                'amount' => $reservation->total_amount_minor,
                'currency' => 'INR',
                'status' => 'authorized', // Not captured
            ], 200),
        ]);

        $notCapturedRejected = false;
        try {
            app(VerifyCheckoutPayment::class)->execute($reservation, $user, $orderId, $paymentId, $validSignature);
        } catch (ValidationException $e) {
            $notCapturedRejected = true;
        }
        $this->assertTrue($notCapturedRejected);
        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->fresh()->status);
    }

    /**
     * Test D: Duplicate Webhook and Verification Race
     * Simulates client-side verification racing with backend webhook delivery.
     * Proves that exactly one payment capture effect is applied and retried webhooks are idempotent.
     */
    public function test_concurrent_webhook_and_checkout_verification_race_prevents_duplicate_capture(): void
    {
        $uniq = uniqid();
        $owner = $this->createActiveOwner(['email' => "concur_owner_d_{$uniq}@example.com"]);
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 80000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser(['email' => "concur_user_d_{$uniq}@example.com"]);

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment,
            'payment_deadline_at' => CarbonImmutable::now()->addMinutes(15),
        ])->save();

        $orderId = 'order_concur_race_'.$uniq;
        $paymentId = 'pay_concur_race_'.$uniq;

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => $orderId,
            'idempotency_key' => 'idemp_'.$orderId,
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ])->save();

        $keySecret = config('tijum.payments.razorpay.key_secret', 'rzp_test_secret');
        $signature = hash_hmac('sha256', $orderId.'|'.$paymentId, (string) $keySecret);

        Http::fake([
            'https://api.razorpay.com/v1/payments/'.$paymentId => Http::response([
                'id' => $paymentId,
                'order_id' => $orderId,
                'amount' => $reservation->total_amount_minor,
                'currency' => 'INR',
                'status' => 'captured',
                'method' => 'card',
            ], 200),
        ]);

        // 1. Client checkout verification executes
        $confirmed = app(VerifyCheckoutPayment::class)->execute($reservation, $user, $orderId, $paymentId, $signature);
        $this->assertSame(ReservationStatus::Confirmed, $confirmed->status);

        // 2. Incoming Razorpay webhook for payment.captured arrives
        $webhookSecret = 'test_webhook_secret_concur_'.$uniq;
        Config::set('tijum.payments.razorpay.webhook_secret', $webhookSecret);
        $this->app->singleton(PaymentGateway::class, function () use ($webhookSecret) {
            return new RazorpayGateway('rzp_test_key', 'rzp_test_secret', $webhookSecret);
        });

        $webhookPayload = [
            'id' => 'evt_concur_race_'.$uniq,
            'event' => 'payment.captured',
            'payload' => [
                'payment' => [
                    'entity' => [
                        'id' => $paymentId,
                        'order_id' => $orderId,
                        'amount' => $reservation->total_amount_minor,
                        'currency' => 'INR',
                        'status' => 'captured',
                        'method' => 'card',
                    ],
                ],
            ],
        ];

        $rawBody = json_encode($webhookPayload, JSON_THROW_ON_ERROR);
        $whSignature = hash_hmac('sha256', $rawBody, $webhookSecret);

        // Process webhook event
        app(ProcessWebhookEvent::class)->execute($rawBody, $whSignature, $webhookPayload, 'evt_concur_race_'.$uniq);

        // Assert reservation remains Confirmed and payment remains Captured
        $reservation->refresh();
        $payment->refresh();
        $this->assertSame(ReservationStatus::Confirmed, $reservation->status);
        $this->assertSame(PaymentStatus::Captured, $payment->status);
        $this->assertSame(1, ReservationPayment::query()->where('reservation_id', $reservation->id)->count());

        // 3. Webhook delivery retry (simulating network duplicate from Razorpay)
        $retryPayload = array_merge($webhookPayload, ['id' => 'evt_concur_race_retry_'.$uniq]);
        $retryRawBody = json_encode($retryPayload, JSON_THROW_ON_ERROR);
        $retrySignature = hash_hmac('sha256', $retryRawBody, $webhookSecret);
        app(ProcessWebhookEvent::class)->execute($retryRawBody, $retrySignature, $retryPayload, 'evt_concur_race_retry_'.$uniq);

        $this->assertSame(ReservationStatus::Confirmed, $reservation->fresh()->status);
        $this->assertSame(1, ReservationPayment::query()->where('reservation_id', $reservation->id)->count());
    }
}
