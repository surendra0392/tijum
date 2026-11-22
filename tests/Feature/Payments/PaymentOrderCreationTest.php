<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PaymentOrderCreationTest extends TestCase
{
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->assertSame('sqlite', DB::getDriverName());
        $this->assertSame(':memory:', DB::getDatabaseName());
        $this->artisan('migrate', ['--force' => true])->assertSuccessful();

        config([
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_checkout',
            'tijum.payments.razorpay.key_secret' => 'test-checkout-secret',
        ]);
    }

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
            'https://api.razorpay.com/v1/orders' => fn (Request $request) => Http::response([
                'id' => 'order_test_123456',
                'entity' => 'order',
                'amount' => $reservation->total_amount_minor,
                'currency' => 'INR',
                'status' => 'created',
                'receipt' => $request['receipt'],
                'amount_paid' => 0,
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

        Http::fake([
            'https://api.razorpay.com/v1/orders/order_existing_999' => Http::response([
                'id' => $payment->gateway_order_id,
                'receipt' => $reservation->booking_reference,
                'amount' => $payment->amount_minor,
                'currency' => $payment->currency,
                'amount_paid' => 0,
                'status' => 'attempted',
            ]),
        ]);

        $response = $this->actingAs($user, 'web')
            ->postJson(route('reservations.pay', $reservation->booking_reference));

        $response->assertOk()
            ->assertJson([
                'gateway_order_id' => 'order_existing_999',
                'amount_minor' => $reservation->total_amount_minor,
            ]);

        $this->assertSame(1, ReservationPayment::query()->where('reservation_id', $reservation->id)->count());
        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request): bool => $request->method() === 'GET');
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

    public function test_returns_401_and_500_cleanly_when_razorpay_order_api_fails(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        Http::fake([
            'https://api.razorpay.com/v1/orders' => Http::sequence()
                ->push(['error' => ['description' => 'Authentication failed']], 401)
                ->push(['error' => ['description' => 'Gateway internal error']], 500),
        ]);

        $this->actingAs($user, 'web')
            ->postJson(route('reservations.pay', $reservation->booking_reference))
            ->assertStatus(401);

        $this->actingAs($user, 'web')
            ->postJson(route('reservations.pay', $reservation->booking_reference))
            ->assertStatus(500);

        Http::assertSentCount(2);
        $this->assertSame([PaymentStatus::Failed, PaymentStatus::Created], $reservation->payments()->reorder('id')->get()->pluck('status')->all());
    }

    public function test_rejects_razorpay_order_below_minimum_100_paise(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill(['total_amount_minor' => 50])->save();

        $this->actingAs($user, 'web')
            ->postJson(route('reservations.pay', $reservation->booking_reference))
            ->assertStatus(422)
            ->assertJson(['message' => 'Minimum Razorpay order amount is 100 paise.']);
    }

    public function test_order_timeout_preserves_the_attempt_and_reconciles_without_a_second_post(): void
    {
        [$reservation, $user] = $this->createPayableReservation();
        $order = [];
        $postCount = 0;
        $lookupCount = 0;
        Http::fake(function (Request $request) use (&$order, &$postCount, &$lookupCount) {
            if ($request->method() === 'POST') {
                $postCount++;
                $this->assertSame(0, DB::transactionLevel());
                $this->assertDatabaseHas('reservation_payments', [
                    'gateway_order_id' => 'temp_'.$request['receipt'],
                    'status' => PaymentStatus::Created->value,
                ]);
                $order = [
                    'id' => 'order_after_timeout',
                    'amount' => $request['amount'],
                    'currency' => $request['currency'],
                    'receipt' => $request['receipt'],
                    'amount_paid' => 0,
                    'status' => 'created',
                ];

                return Http::failedConnection();
            }

            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
            $this->assertSame($order['receipt'], $query['receipt'] ?? null);

            return Http::response(['items' => ++$lookupCount === 1 ? [] : [$order]]);
        });

        $url = route('reservations.pay', $reservation->booking_reference);
        $this->actingAs($user, 'web')->postJson($url)->assertStatus(500);

        $attempt = $reservation->payments()->sole();
        $this->assertSame(PaymentStatus::Created, $attempt->status);
        $this->assertSame('temp_'.$order['receipt'], $attempt->gateway_order_id);
        $this->assertSame($order['receipt'], $attempt->metadata['gateway_order_receipt']);

        $this->postJson($url)->assertUnprocessable()->assertJsonValidationErrors('payment');
        $this->postJson($url)->assertOk()->assertJsonPath('order_id', $order['id']);

        $this->assertSame(1, $postCount);
        $this->assertSame($order['id'], $attempt->fresh()->gateway_order_id);
        $this->assertSame(1, $reservation->payments()->count());
    }

    public function test_an_already_paid_provider_order_is_not_reused_for_checkout(): void
    {
        [$reservation, $user] = $this->createPayableReservation();
        $reservation->payments()->create([
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_already_paid',
            'idempotency_key' => 'idemp_already_paid',
            'amount_minor' => $reservation->total_amount_minor,
            'currency' => $reservation->currency_code,
            'status' => PaymentStatus::Pending,
        ]);

        Http::fake([
            'https://api.razorpay.com/v1/orders/order_already_paid' => Http::response([
                'id' => 'order_already_paid',
                'receipt' => $reservation->booking_reference,
                'amount' => $reservation->total_amount_minor,
                'currency' => $reservation->currency_code,
                'amount_paid' => $reservation->total_amount_minor,
                'status' => 'paid',
            ]),
        ]);

        $this->actingAs($user, 'web')->postJson(route('reservations.pay', $reservation->booking_reference))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment');

        Http::assertSentCount(1);
        $this->assertSame(1, $reservation->payments()->count());
    }

    public function test_order_is_linked_for_recovery_when_checkout_expires_during_dispatch(): void
    {
        [$reservation, $user] = $this->createPayableReservation();
        Http::fake([
            'https://api.razorpay.com/v1/orders' => function (Request $request) use ($reservation) {
                $reservation->forceFill(['status' => ReservationStatus::Expired])->save();

                return Http::response([
                    'id' => 'order_late_checkout',
                    'receipt' => $request['receipt'],
                    'amount' => $request['amount'],
                    'currency' => $request['currency'],
                    'amount_paid' => 0,
                    'status' => 'created',
                ]);
            },
        ]);

        $this->actingAs($user, 'web')->postJson(route('reservations.pay', $reservation->booking_reference))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reservation');

        $this->assertSame('order_late_checkout', $reservation->payments()->sole()->gateway_order_id);
        Http::assertSentCount(1);
    }

    public function test_multiple_unresolved_order_records_block_checkout_until_reconciled(): void
    {
        [$reservation, $user] = $this->createPayableReservation();

        foreach (['earlier', 'latest'] as $attempt) {
            $reservation->payments()->create([
                'user_id' => $user->id,
                'gateway' => 'razorpay',
                'gateway_order_id' => 'order_'.$attempt,
                'idempotency_key' => 'idemp_'.$attempt,
                'amount_minor' => $reservation->total_amount_minor,
                'currency' => $reservation->currency_code,
                'status' => $attempt === 'earlier' ? PaymentStatus::Failed : PaymentStatus::Pending,
            ]);
        }

        Http::fake([
            'https://api.razorpay.com/v1/orders/order_latest' => Http::response([
                'id' => 'order_latest',
                'receipt' => $reservation->booking_reference,
                'amount' => $reservation->total_amount_minor,
                'currency' => $reservation->currency_code,
                'amount_paid' => 0,
                'status' => 'created',
            ]),
        ]);

        $this->actingAs($user, 'web')->postJson(route('reservations.pay', $reservation->booking_reference))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment');

        Http::assertNothingSent();
        $this->assertSame(2, $reservation->payments()->count());
    }

    /** @return array{Reservation, User} */
    private function createPayableReservation(): array
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();

        return [Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail(), $user];
    }
}
