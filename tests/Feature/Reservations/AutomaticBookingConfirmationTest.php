<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Actions\Payments\InitiatePaymentOrder;
use App\Actions\Payments\ProcessWebhookEvent;
use App\Actions\Payments\ReconcileExpiredReservations;
use App\Actions\Payments\VerifyCheckoutPayment;
use App\Actions\Reservations\CreateReservation;
use App\Actions\Reservations\ReservationLifecycle;
use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\ReservationStatus;
use App\Models\Owner;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\ReservationAvailabilityService;
use App\Services\ReservationData;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class AutomaticBookingConfirmationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    private function setupMockGateway(int $amount, string $orderId = 'order_test_123', string $paymentId = 'pay_test_123'): Mockery\MockInterface
    {
        $mock = Mockery::mock(PaymentGateway::class);
        $mock->shouldReceive('getPublicKey')
            ->byDefault()
            ->andReturn('rzp_test_key_123');

        $mock->shouldReceive('createOrder')
            ->byDefault()
            ->andReturn([
                'id' => $orderId,
                'entity' => 'order',
                'amount' => $amount,
                'currency' => 'INR',
                'status' => 'created',
            ]);

        $mock->shouldReceive('verifyCheckoutSignature')
            ->byDefault()
            ->andReturn(true);

        $mock->shouldReceive('fetchPayment')
            ->with($paymentId)
            ->byDefault()
            ->andReturn([
                'id' => $paymentId,
                'entity' => 'payment',
                'amount' => $amount,
                'currency' => 'INR',
                'status' => 'captured',
                'order_id' => $orderId,
                'method' => 'upi',
            ]);

        $mock->shouldReceive('verifyWebhookSignature')
            ->byDefault()
            ->andReturn(true);

        $this->app->instance(PaymentGateway::class, $mock);

        return $mock;
    }

    // ==========================================
    // GROUP A: AUTOMATIC CONFIRMATION TESTS
    // ==========================================

    public function test_a1_instant_booking_flow_from_quote_to_confirmation_without_owner_approval(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // Step 1: Customer submits reservation
        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        // Verification: Status is immediately AwaitingPayment (NO PendingOwnerConfirmation)
        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->status);
        $this->assertNotNull($reservation->payment_deadline_at);
        $this->assertNull($reservation->confirmed_at);

        // Step 2: Customer initiates payment
        $this->setupMockGateway($reservation->total_amount_minor, 'order_a1', 'pay_a1');
        $orderData = app(InitiatePaymentOrder::class)->execute($reservation, $user);
        $this->assertSame('order_a1', $orderData['order_id']);

        // Step 3: Backend verifies captured payment
        $confirmed = app(VerifyCheckoutPayment::class)->execute(
            $reservation,
            $user,
            'order_a1',
            'pay_a1',
            'valid_signature_hash'
        );

        // Verification: Reservation is automatically Confirmed without owner intervention
        $this->assertSame(ReservationStatus::Confirmed, $confirmed->status);
        $this->assertNotNull($confirmed->confirmed_at);
        $this->assertSame(PaymentStatus::Captured, $confirmed->payments()->first()->status);
    }

    public function test_a2_owner_offline_scenario_automatic_confirmation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // Customer creates booking while owner is completely offline
        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->status);

        // Payment completes automatically
        $this->setupMockGateway($reservation->total_amount_minor, 'order_a2', 'pay_a2');
        app(InitiatePaymentOrder::class)->execute($reservation, $user);
        $confirmed = app(VerifyCheckoutPayment::class)->execute(
            $reservation,
            $user,
            'order_a2',
            'pay_a2',
            'sig_a2'
        );

        $this->assertSame(ReservationStatus::Confirmed, $confirmed->status);
    }

    public function test_a3_owner_never_opens_partner_portal_and_receives_confirmation_notification(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $dispatchedEvents = [];
        $dispatcher = Mockery::mock(NotificationDispatcher::class);
        $dispatcher->shouldReceive('dispatch')
            ->andReturnUsing(function (string $eventType, $recipients, array $variables = []) use (&$dispatchedEvents) {
                $dispatchedEvents[] = [
                    'event' => $eventType,
                    'recipients' => $recipients,
                    'variables' => $variables,
                ];

                return ['success' => true];
            });
        $this->app->instance(NotificationDispatcher::class, $dispatcher);

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        // Verification: On creation, customer is notified, but owner does NOT receive a request to approve
        $eventsOnCreation = collect($dispatchedEvents)->pluck('event')->all();
        $this->assertContains('reservation.submitted', $eventsOnCreation);
        $this->assertNotContains('partner.reservation_received', $eventsOnCreation);

        // Payment completes
        $this->setupMockGateway($reservation->total_amount_minor, 'order_a3', 'pay_a3');
        app(InitiatePaymentOrder::class)->execute($reservation, $user);
        app(VerifyCheckoutPayment::class)->execute($reservation, $user, 'order_a3', 'pay_a3', 'sig_a3');

        // Verification: Owner received confirmed booking notification
        $allEvents = collect($dispatchedEvents)->pluck('event')->all();
        $this->assertContains('reservation.confirmed', $allEvents);
        $this->assertContains('partner.reservation_confirmed', $allEvents);
    }

    public function test_a4_notification_failure_resilience(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // Notification dispatcher throws an unexpected network error
        $brokenDispatcher = Mockery::mock(NotificationDispatcher::class);
        $brokenDispatcher->shouldReceive('dispatch')
            ->andThrow(new \RuntimeException('Notification service unavailable'));
        $this->app->instance(NotificationDispatcher::class, $brokenDispatcher);

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);
        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->status);

        $this->setupMockGateway($reservation->total_amount_minor, 'order_a4', 'pay_a4');
        app(InitiatePaymentOrder::class)->execute($reservation, $user);

        // Payment verification must succeed even if downstream notifications throw
        $confirmed = app(VerifyCheckoutPayment::class)->execute($reservation, $user, 'order_a4', 'pay_a4', 'sig_a4');
        $this->assertSame(ReservationStatus::Confirmed, $confirmed->status);
    }

    // ==========================================
    // GROUP B: INVENTORY VALIDATION & CONSISTENCY
    // ==========================================

    public function test_b1_no_rooms_available_rejected_before_hold(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        // Do NOT create any physical rooms
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);

        $this->expectException(ValidationException::class);
        app(CreateReservation::class)->execute($user, $payload);

        $this->assertDatabaseCount('reservations', 0);
    }

    public function test_b2_disabled_room_type_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $roomType->forceFill(['is_active' => false])->save();

        $user = $this->createCustomerUser();
        $payload = $this->validReservationPayload($property, $roomType);

        $this->expectException(ValidationException::class);
        app(CreateReservation::class)->execute($user, $payload);
    }

    public function test_b3_room_under_maintenance_inventory_adjusted(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $room1 = $this->createActiveRoom($property, $roomType, number: '101');
        $room2 = $this->createActiveRoom($property, $roomType, number: '102');

        // Put room2 in maintenance
        $room2->forceFill(['operational_status' => PropertyRoomStatus::Maintenance->value])->save();

        $user = $this->createCustomerUser();

        // Requesting 2 rooms should fail
        $payload2 = $this->validReservationPayload($property, $roomType, quantity: 2);
        try {
            app(CreateReservation::class)->execute($user, $payload2);
            $this->fail('Expected ValidationException for requesting 2 rooms when only 1 active.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('reservation', $e->errors());
        }

        // Requesting 1 room should succeed
        $payload1 = $this->validReservationPayload($property, $roomType, quantity: 1);
        $res = app(CreateReservation::class)->execute($user, $payload1);
        $this->assertSame(ReservationStatus::AwaitingPayment, $res->status);
    }

    public function test_b4_different_date_range_available(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($property, $roomType, number: '101');
        $user1 = $this->createCustomerUser();
        $user2 = $this->createCustomerUser(['email' => 'user2@example.test']);

        $checkIn1 = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn1, 'daily', 2, quantity: 1);
        $res1 = app(CreateReservation::class)->execute($user1, $payload1);

        // Same dates should fail for user2
        $payloadOverlap = $this->validReservationPayload($property, $roomType, $checkIn1, 'daily', 2, quantity: 1);
        try {
            app(CreateReservation::class)->execute($user2, $payloadOverlap);
            $this->fail('Expected overlapping reservation to fail.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('reservation', $e->errors());
        }

        // Different dates (e.g. 10 days later) must succeed
        $checkIn2 = CarbonImmutable::now('Asia/Kolkata')->addDays(10)->toDateString();
        $payloadNonOverlap = $this->validReservationPayload($property, $roomType, $checkIn2, 'daily', 2, quantity: 1);
        $res2 = app(CreateReservation::class)->execute($user2, $payloadNonOverlap);
        $this->assertSame(ReservationStatus::AwaitingPayment, $res2->status);
    }

    public function test_b5_multi_room_request_validation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($property, $roomType, number: '101');
        $this->createActiveRoom($property, $roomType, number: '102');
        $user = $this->createCustomerUser();

        // Only 2 rooms exist; request 3
        $payload = $this->validReservationPayload($property, $roomType, quantity: 3);

        $this->expectException(ValidationException::class);
        app(CreateReservation::class)->execute($user, $payload);
    }

    public function test_b6_search_and_booking_consistency(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($property, $roomType, number: '101');
        $this->createActiveRoom($property, $roomType, number: '102');
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $checkout = CarbonImmutable::now('Asia/Kolkata')->addDays(7)->toDateString();

        $availService = app(ReservationAvailabilityService::class);

        // Before booking: 2 rooms available
        $capBefore = $availService->stayCapacity($roomType, $checkIn, $checkout, 1);
        $this->assertSame(2, $capBefore['minimum_remaining']);

        // Book 1 room
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, 'daily', 2, quantity: 1);
        app(CreateReservation::class)->execute($user, $payload);

        // After booking hold: 1 room remaining
        $capAfter = $availService->stayCapacity($roomType, $checkIn, $checkout, 1);
        $this->assertSame(1, $capAfter['minimum_remaining']);
    }

    // ==========================================
    // GROUP D: HOLD LIFECYCLE & EXPIRY ENGINE
    // ==========================================

    public function test_d1_hold_created_with_15_minute_deadline_and_consumes_capacity(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->status);
        $this->assertTrue($reservation->status->consumesCapacity());

        $this->assertNotNull($reservation->payment_deadline_at);
        $this->assertTrue($reservation->payment_deadline_at->isFuture());
        $diffSeconds = abs($reservation->payment_deadline_at->getTimestamp() - now()->addMinutes(15)->getTimestamp());
        $this->assertLessThan(60, $diffSeconds);
    }

    public function test_d2_successful_payment_converts_hold_to_permanent_confirmed(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        $this->setupMockGateway($reservation->total_amount_minor, 'ord_d2', 'pay_d2');
        app(InitiatePaymentOrder::class)->execute($reservation, $user);

        $confirmed = app(VerifyCheckoutPayment::class)->execute($reservation, $user, 'ord_d2', 'pay_d2', 'sig_d2');

        $this->assertSame(ReservationStatus::Confirmed, $confirmed->status);
        $this->assertTrue($confirmed->status->consumesCapacity());
        $this->assertNotNull($confirmed->confirmed_at);
    }

    public function test_d3_payment_failure_preserves_hold_until_expiry(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        $this->setupMockGateway($reservation->total_amount_minor, 'ord_d3', 'pay_d3');
        app(InitiatePaymentOrder::class)->execute($reservation, $user);

        // Webhook for payment.failed
        $webhookSecret = 'test_secret_d3';
        Config::set('tijum.payments.razorpay.webhook_secret', $webhookSecret);
        $raw = json_encode([
            'id' => 'evt_fail_d3',
            'event' => 'payment.failed',
            'payload' => [
                'payment' => [
                    'entity' => [
                        'id' => 'pay_fail_d3',
                        'order_id' => 'ord_d3',
                        'status' => 'failed',
                    ],
                ],
            ],
        ], JSON_THROW_ON_ERROR);
        $sig = hash_hmac('sha256', $raw, $webhookSecret);

        app(ProcessWebhookEvent::class)->execute($raw, $sig);

        // Reservation remains in AwaitingPayment so user can retry before deadline
        $reservation->refresh();
        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->status);
    }

    public function test_d4_hold_expires_after_15_minutes_and_releases_inventory(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($property, $roomType, number: '101');
        $user1 = $this->createCustomerUser();
        $user2 = $this->createCustomerUser(['email' => 'user2@example.test']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 1);
        $reservation = app(CreateReservation::class)->execute($user1, $payload1);

        // Fast-forward payment deadline to past
        $reservation->forceFill([
            'payment_deadline_at' => CarbonImmutable::now()->subHours(2),
        ])->save();

        // Run expiry reconciliation
        $result = app(ReconcileExpiredReservations::class)->execute();
        $this->assertSame(1, $result['expired']);

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Expired, $reservation->status);
        $this->assertFalse($reservation->status->consumesCapacity());

        // User 2 can now immediately book the released room
        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 1);
        $res2 = app(CreateReservation::class)->execute($user2, $payload2);
        $this->assertSame(ReservationStatus::AwaitingPayment, $res2->status);
    }

    public function test_d5_duplicate_expiry_job_is_idempotent(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);
        $reservation->forceFill(['payment_deadline_at' => CarbonImmutable::now()->subHours(2)])->save();

        // First run
        $res1 = app(ReconcileExpiredReservations::class)->execute();
        $this->assertSame(1, $res1['expired']);

        // Second run
        $res2 = app(ReconcileExpiredReservations::class)->execute();
        $this->assertSame(0, $res2['expired']);

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Expired, $reservation->status);
    }

    public function test_d6_payment_and_expiry_race_handled_safely(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        $mockGateway = $this->setupMockGateway($reservation->total_amount_minor, 'ord_d6', 'pay_d6');
        app(InitiatePaymentOrder::class)->execute($reservation, $user);

        // Deadline has passed, but gateway reports order is PAID
        $reservation->forceFill(['payment_deadline_at' => CarbonImmutable::now()->subHours(2)])->save();

        $mockGateway->shouldReceive('fetchOrder')
            ->with('ord_d6')
            ->andReturn([
                'id' => 'ord_d6',
                'status' => 'paid',
                'amount_paid' => $reservation->total_amount_minor,
            ]);

        $mockGateway->shouldReceive('fetchOrderPayments')
            ->with('ord_d6')
            ->andReturn([
                [
                    'id' => 'pay_d6',
                    'status' => 'captured',
                    'amount' => $reservation->total_amount_minor,
                ],
            ]);

        $result = app(ReconcileExpiredReservations::class)->execute();

        // Should confirm rather than expire because payment was captured
        $this->assertSame(1, $result['confirmed']);
        $this->assertSame(0, $result['expired']);

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Confirmed, $reservation->status);
    }

    public function test_d7_delayed_webhook_idempotent_confirmation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        $this->setupMockGateway($reservation->total_amount_minor, 'ord_d7', 'pay_d7');
        app(InitiatePaymentOrder::class)->execute($reservation, $user);

        // Already confirmed by frontend verify call
        app(VerifyCheckoutPayment::class)->execute($reservation, $user, 'ord_d7', 'pay_d7', 'sig_d7');
        $this->assertSame(ReservationStatus::Confirmed, $reservation->fresh()->status);

        // Delayed webhook arrives later
        $secret = 'test_secret_d7';
        Config::set('tijum.payments.razorpay.webhook_secret', $secret);
        $raw = json_encode([
            'id' => 'evt_d7',
            'event' => 'payment.captured',
            'payload' => [
                'payment' => [
                    'entity' => [
                        'id' => 'pay_d7',
                        'order_id' => 'ord_d7',
                        'amount' => $reservation->total_amount_minor,
                        'currency' => 'INR',
                        'status' => 'captured',
                    ],
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $res = app(ProcessWebhookEvent::class)->execute($raw, hash_hmac('sha256', $raw, $secret));
        $this->assertSame('success', $res['status']);
        $this->assertSame(ReservationStatus::Confirmed, $reservation->fresh()->status);
    }

    public function test_d8_late_capture_after_release_handled_safely(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        // Reservation already expired
        $reservation->forceFill(['status' => ReservationStatus::Expired->value])->save();

        // Late payment capture attempt via confirmPaid
        app(ReservationLifecycle::class)->confirmPaid($reservation);

        $reservation->refresh();
        $this->assertSame(ReservationStatus::Expired, $reservation->status);
        $this->assertTrue($reservation->requires_refund_review);
    }

    // ==========================================
    // GROUP E: PARTNER EXPERIENCE & ALLOCATION
    // ==========================================

    public function test_e1_owner_views_confirmed_booking_without_action_needed(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);
        $reservation->forceFill(['status' => ReservationStatus::Confirmed->value])->save();

        $resData = app(ReservationData::class)->detail($reservation, 'owner');

        $this->assertTrue($resData['can_allocate']);
        $this->assertArrayNotHasKey('can_confirm', $resData);
        $this->assertArrayNotHasKey('can_decline', $resData);
    }

    public function test_e2_physical_room_allocation_post_confirmation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $room = $this->createActiveRoom($property, $roomType, number: '201');
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);
        $reservation->forceFill(['status' => ReservationStatus::Confirmed->value])->save();

        // Owner allocates physical room
        $response = $this->actingAs($owner, 'owner')
            ->put(route('owner.reservations.allocations', $reservation->booking_reference), [
                'allocations' => [
                    [
                        'property_room_id' => $room->id,
                        'allocated_quantity' => 1,
                    ],
                ],
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('reservation_room_allocations', [
            'reservation_id' => $reservation->id,
            'property_room_id' => $room->id,
            'allocated_quantity' => 1,
        ]);
    }

    public function test_e3_owner_disabling_room_type_protects_existing_confirmed(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);
        $reservation->forceFill(['status' => ReservationStatus::Confirmed->value])->save();

        // Owner deactivates the room type
        $roomType->forceFill(['is_active' => false])->save();

        // Existing reservation remains Confirmed
        $reservation->refresh();
        $this->assertSame(ReservationStatus::Confirmed, $reservation->status);
    }

    public function test_e4_owner_cannot_decline_confirmed_booking(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);
        $reservation->forceFill(['status' => ReservationStatus::Confirmed->value])->save();

        // The owner decline route has been eradicated; attempting to decline returns 404
        $response = $this->actingAs($owner, 'owner')
            ->post("/owner/reservations/{$reservation->booking_reference}/decline", [
                'decline_reason' => 'Want to cancel guest',
            ]);

        $response->assertNotFound();
        $reservation->refresh();
        $this->assertSame(ReservationStatus::Confirmed, $reservation->status);
    }

    // ==========================================
    // GROUP F: PAYMENT IDEMPOTENCY
    // ==========================================

    public function test_f1_duplicate_verify_payment_calls_idempotent(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        $this->setupMockGateway($reservation->total_amount_minor, 'ord_f1', 'pay_f1');
        app(InitiatePaymentOrder::class)->execute($reservation, $user);

        // Call 1
        $conf1 = app(VerifyCheckoutPayment::class)->execute($reservation, $user, 'ord_f1', 'pay_f1', 'sig_f1');
        $this->assertSame(ReservationStatus::Confirmed, $conf1->status);

        // Call 2 (idempotent replay)
        $conf2 = app(VerifyCheckoutPayment::class)->execute($reservation, $user, 'ord_f1', 'pay_f1', 'sig_f1');
        $this->assertSame(ReservationStatus::Confirmed, $conf2->status);

        $this->assertSame(1, $reservation->payments()->count());
    }

    // ==========================================
    // GROUP G: STATUS & PROJECTION COMPATIBILITY
    // ==========================================

    public function test_g1_reservation_lifecycle_and_projection(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $reservation = app(CreateReservation::class)->execute($user, $payload);

        $reservation->refresh();
        $this->assertSame(ReservationStatus::AwaitingPayment, $reservation->status);
        $this->assertSame('Awaiting Payment', $reservation->status->label());
        $this->assertTrue($reservation->status->consumesCapacity());

        // Viewable in customer and owner detail
        $customerDetail = app(ReservationData::class)->detail($reservation, 'customer');
        $this->assertSame('awaiting_payment', $customerDetail['status']);

        $ownerDetail = app(ReservationData::class)->detail($reservation, 'owner');
        $this->assertSame('awaiting_payment', $ownerDetail['status']);
    }
}
