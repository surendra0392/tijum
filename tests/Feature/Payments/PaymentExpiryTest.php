<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Services\ReservationAvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PaymentExpiryTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_expiry',
            'tijum.payments.razorpay.key_secret' => 'test-expiry-secret',
        ]);

        $this->app->forgetInstance(PaymentGateway::class);
    }

    public function test_expiry_requires_a_matching_capture_before_confirming_a_paid_order(): void
    {
        $property = $this->createBookableProperty($this->createActiveOwner());
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();
        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();
        $reservation->update(['payment_deadline_at' => now()->subMinute()]);
        $payment = ReservationPayment::query()->create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway_order_id' => 'order_unmatched_capture',
            'idempotency_key' => 'idemp_unmatched_capture',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Pending,
        ]);

        Http::fake([
            'https://api.razorpay.com/v1/orders/order_unmatched_capture' => Http::response([
                'id' => 'order_unmatched_capture',
                'status' => 'paid',
                'amount' => $payment->amount_minor,
                'currency' => 'INR',
            ]),
            'https://api.razorpay.com/v1/orders/order_unmatched_capture/payments' => Http::response([
                'items' => [[
                    'id' => 'pay_wrong_amount',
                    'order_id' => 'order_unmatched_capture',
                    'status' => 'captured',
                    'amount' => $payment->amount_minor - 100,
                    'currency' => 'INR',
                ]],
            ]),
        ]);

        $this->artisan('tijum:expire-reservations')->assertSuccessful();

        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->refresh()->status);
        $this->assertSame(PaymentStatus::Pending, $payment->refresh()->status);
        $this->assertNull($payment->gateway_payment_id);
    }

    public function test_reconcile_expired_expires_unpaid_reservations_past_deadline(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, maxGuests: 1, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $availability = app(ReservationAvailabilityService::class);
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $checkout = CarbonImmutable::now('Asia/Kolkata')->addDays(4)->toDateString();

        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
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
            'gateway_order_id' => 'order_expiry_001',
            'idempotency_key' => 'idemp_expiry_001',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ])->save();

        // Gateway fetch order returns still unpaid (status: created, attempts: 0).
        Http::fake([
            'https://api.razorpay.com/v1/orders/order_expiry_001' => Http::response([
                'id' => 'order_expiry_001',
                'amount' => $reservation->total_amount_minor,
                'currency' => 'INR',
                'status' => 'created',
                'attempts' => 0,
            ], 200),
            'https://api.razorpay.com/v1/orders/order_expiry_001/payments' => Http::response([
                'entity' => 'collection',
                'count' => 0,
                'items' => [],
            ], 200),
        ]);

        $this->assertSame(0, $availability->stayCapacity($roomType, $checkIn, $checkout, 1)['minimum_remaining']);

        $reservation->forceFill([
            'payment_deadline_at' => CarbonImmutable::now()->subMinutes(5),
        ])->save();

        $this->artisan('tijum:expire-reservations')
            ->assertSuccessful();

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Expired, $reservation->status);
        $this->assertNotNull($reservation->expired_at);

        $payment->refresh();
        $this->assertSame(PaymentStatus::Cancelled, $payment->status);

        // Capacity is released.
        $this->assertSame(1, $availability->stayCapacity($roomType, $checkIn, $checkout, 1)['minimum_remaining']);
    }

    public function test_reconcile_expired_confirms_if_payment_was_captured_in_flight(): void
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
            'payment_deadline_at' => CarbonImmutable::now()->subMinutes(5),
        ])->save();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_inflight_002',
            'idempotency_key' => 'idemp_inflight_002',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ])->save();

        // Gateway reports that the order has a captured payment.
        Http::fake([
            'https://api.razorpay.com/v1/orders/order_inflight_002' => Http::response([
                'id' => 'order_inflight_002',
                'amount' => $reservation->total_amount_minor,
                'currency' => 'INR',
                'status' => 'paid',
                'attempts' => 1,
            ], 200),
            'https://api.razorpay.com/v1/orders/order_inflight_002/payments' => Http::response([
                'entity' => 'collection',
                'count' => 1,
                'items' => [
                    [
                        'id' => 'pay_inflight_999',
                        'order_id' => 'order_inflight_002',
                        'amount' => $reservation->total_amount_minor,
                        'currency' => 'INR',
                        'status' => 'captured',
                        'method' => 'upi',
                    ],
                ],
            ], 200),
        ]);

        $this->artisan('tijum:expire-reservations')
            ->assertSuccessful();

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Confirmed, $reservation->status);
        $this->assertNull($reservation->expired_at);
        $this->assertNotNull($reservation->confirmed_at);

        $payment->refresh();
        $this->assertSame(PaymentStatus::Captured, $payment->status);
        $this->assertSame('pay_inflight_999', $payment->gateway_payment_id);
    }

    public function test_reconcile_expired_does_not_hold_database_transaction_during_gateway_lookups(): void
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
            'payment_deadline_at' => CarbonImmutable::now()->subMinutes(5),
        ])->save();

        $payment = ReservationPayment::query()->create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_no_tx_lock',
            'idempotency_key' => 'idemp_no_tx_lock',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Pending,
        ]);

        $baselineTransactionLevel = DB::transactionLevel();
        $observedTransactionLevels = [];
        Http::fake([
            'https://api.razorpay.com/v1/orders/order_no_tx_lock' => function () use ($payment, &$observedTransactionLevels) {
                $observedTransactionLevels[] = DB::transactionLevel();

                return Http::response([
                    'id' => 'order_no_tx_lock',
                    'amount' => $payment->amount_minor,
                    'currency' => 'INR',
                    'status' => 'created',
                    'attempts' => 0,
                ]);
            },
        ]);

        $this->artisan('tijum:expire-reservations')->assertSuccessful();

        $this->assertSame([$baselineTransactionLevel], $observedTransactionLevels);
        $this->assertSame(ReservationStatus::Expired, $reservation->fresh()->status);
        $this->assertSame(PaymentStatus::Cancelled, $payment->fresh()->status);
    }

    public function test_reconcile_expired_does_not_expire_when_order_payments_lookup_fails(): void
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
            'payment_deadline_at' => CarbonImmutable::now()->subMinutes(5),
        ])->save();

        $payment = ReservationPayment::query()->create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_payments_500',
            'idempotency_key' => 'idemp_payments_500',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Created,
        ]);

        Http::fake([
            'https://api.razorpay.com/v1/orders/order_payments_500' => Http::response([
                'id' => 'order_payments_500',
                'amount' => $payment->amount_minor,
                'currency' => 'INR',
                'status' => 'paid',
                'amount_paid' => $payment->amount_minor,
            ]),
            'https://api.razorpay.com/v1/orders/order_payments_500/payments' => Http::response([
                'error' => ['description' => 'Gateway busy'],
            ], 500),
        ]);

        $this->artisan('tijum:expire-reservations')
            ->expectsOutputToContain('Errors: 1')
            ->assertSuccessful();

        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->fresh()->status);
        $this->assertSame(PaymentStatus::Created, $payment->fresh()->status);
    }
}
