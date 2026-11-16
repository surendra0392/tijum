<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Actions\Payments\InitiatePaymentOrder;
use App\Actions\Payments\VerifyCheckoutPayment;
use App\Actions\Reservations\CreateReservation;
use App\Contracts\PaymentGateway;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Services\ReservationAvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Mockery;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class MySqlInstantBookingConcurrencyTest extends TestCase
{
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'mysql'
            || ! str_ends_with((string) DB::getDatabaseName(), '_test')) {
            $this->markTestSkipped('Requires an isolated MySQL database ending in _test.');
        }
    }

    private function setupMockGateway(int $amount, string $orderId = 'ord_mysql_1', string $paymentId = 'pay_mysql_1'): Mockery\MockInterface
    {
        $mock = Mockery::mock(PaymentGateway::class);
        $mock->shouldReceive('getPublicKey')->byDefault()->andReturn('rzp_test_key');
        $mock->shouldReceive('createOrder')->byDefault()->andReturn([
            'id' => $orderId,
            'amount' => $amount,
            'currency' => 'INR',
            'status' => 'created',
        ]);
        $mock->shouldReceive('verifyCheckoutSignature')->byDefault()->andReturn(true);
        $mock->shouldReceive('fetchPayment')->with($paymentId)->byDefault()->andReturn([
            'id' => $paymentId,
            'amount' => $amount,
            'currency' => 'INR',
            'status' => 'captured',
            'order_id' => $orderId,
            'method' => 'card',
        ]);

        $this->app->instance(PaymentGateway::class, $mock);

        return $mock;
    }

    public function test_c1_competing_bookings_for_single_room_exactly_one_succeeds(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType(
            $property,
            name: 'Deluxe Single '.uniqid(),
            mode: PropertyRoomTypeMode::Private,
            maxGuests: 1,
            dailyRate: 150000,
        );
        $this->createActiveRoom($property, $roomType, number: 'C1-1');

        $user1 = $this->createCustomerUser(['email' => 'c1_user1_'.uniqid().'@example.test']);
        $user2 = $this->createCustomerUser(['email' => 'c1_user2_'.uniqid().'@example.test']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(10)->toDateString();
        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 1);
        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 1);

        // First customer secures the hold
        $res1 = app(CreateReservation::class)->execute($user1, $payload1);
        $this->assertSame(ReservationStatus::AwaitingPayment, $res1->status);

        // Second customer attempts to book the same room for the same date -> MUST BE REJECTED
        $user2Rejected = false;
        try {
            app(CreateReservation::class)->execute($user2, $payload2);
        } catch (ValidationException $e) {
            $user2Rejected = true;
            $this->assertArrayHasKey('reservation', $e->errors());
        }

        $this->assertTrue($user2Rejected, 'Competing booking was not rejected when room capacity was exhausted.');

        // Verify in MySQL database that exactly 1 reservation exists for this room type
        $count = Reservation::query()
            ->where('property_room_type_id', $roomType->id)
            ->where('check_in_date', $checkIn)
            ->consuming()
            ->count();
        $this->assertSame(1, $count);
    }

    public function test_c2_competing_multi_room_bookings_exhaustion(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType(
            $property,
            name: 'Executive '.uniqid(),
            mode: PropertyRoomTypeMode::Private,
            maxGuests: 1,
            dailyRate: 150000,
        );
        // Create 3 active rooms
        $this->createActiveRoom($property, $roomType, number: 'C2-1');
        $this->createActiveRoom($property, $roomType, number: 'C2-2');
        $this->createActiveRoom($property, $roomType, number: 'C2-3');

        $userA = $this->createCustomerUser(['email' => 'c2_a_'.uniqid().'@example.test']);
        $userB = $this->createCustomerUser(['email' => 'c2_b_'.uniqid().'@example.test']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(12)->toDateString();

        // Customer A requests 2 rooms
        $payloadA = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 2);
        $resA = app(CreateReservation::class)->execute($userA, $payloadA);
        $this->assertSame(2, $resA->quantity);

        // Customer B requests 2 rooms (only 1 remaining, so request for 2 must fail)
        $payloadB = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 2);
        $userBRejected = false;
        try {
            app(CreateReservation::class)->execute($userB, $payloadB);
        } catch (ValidationException $e) {
            $userBRejected = true;
            $this->assertArrayHasKey('reservation', $e->errors());
        }

        $this->assertTrue($userBRejected, 'Customer B request for 2 rooms succeeded when only 1 remained.');

        // Customer C requests 1 room -> should succeed since 1 is still available
        $userC = $this->createCustomerUser(['email' => 'c2_c_'.uniqid().'@example.test']);
        $payloadC = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 1);
        $resC = app(CreateReservation::class)->execute($userC, $payloadC);
        $this->assertSame(1, $resC->quantity);
    }

    public function test_c3_different_room_types_independent(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        $roomType1 = $this->createBookableRoomType($property, name: 'Standard '.uniqid(), mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($property, $roomType1, number: 'C3-1');

        $roomType2 = $this->createBookableRoomType($property, name: 'Premium '.uniqid(), mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($property, $roomType2, number: 'C3-2');

        $user1 = $this->createCustomerUser(['email' => 'c3_u1_'.uniqid().'@example.test']);
        $user2 = $this->createCustomerUser(['email' => 'c3_u2_'.uniqid().'@example.test']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(15)->toDateString();

        $payload1 = $this->validReservationPayload($property, $roomType1, $checkIn, quantity: 1);
        $payload2 = $this->validReservationPayload($property, $roomType2, $checkIn, quantity: 1);

        $res1 = app(CreateReservation::class)->execute($user1, $payload1);
        $res2 = app(CreateReservation::class)->execute($user2, $payload2);

        $this->assertSame(ReservationStatus::AwaitingPayment, $res1->status);
        $this->assertSame(ReservationStatus::AwaitingPayment, $res2->status);
        $this->assertNotSame($res1->property_room_type_id, $res2->property_room_type_id);
    }

    public function test_c4_different_properties_independent(): void
    {
        $owner1 = $this->createActiveOwner(['email' => 'owner_c4_1_'.uniqid().'@example.test']);
        $owner2 = $this->createActiveOwner(['email' => 'owner_c4_2_'.uniqid().'@example.test']);

        $prop1 = $this->createBookableProperty($owner1);
        $prop2 = $this->createBookableProperty($owner2);

        $rt1 = $this->createBookableRoomType($prop1, name: 'Prop1 Room '.uniqid(), mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($prop1, $rt1, number: 'C4-1');

        $rt2 = $this->createBookableRoomType($prop2, name: 'Prop2 Room '.uniqid(), mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($prop2, $rt2, number: 'C4-2');

        $user1 = $this->createCustomerUser(['email' => 'c4_u1_'.uniqid().'@example.test']);
        $user2 = $this->createCustomerUser(['email' => 'c4_u2_'.uniqid().'@example.test']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(20)->toDateString();

        $payload1 = $this->validReservationPayload($prop1, $rt1, $checkIn, quantity: 1);
        $payload2 = $this->validReservationPayload($prop2, $rt2, $checkIn, quantity: 1);

        $res1 = app(CreateReservation::class)->execute($user1, $payload1);
        $res2 = app(CreateReservation::class)->execute($user2, $payload2);

        $this->assertSame($prop1->id, $res1->property_id);
        $this->assertSame($prop2->id, $res2->property_id);
    }

    public function test_c5_confirmed_booking_consumes_availability_immediately(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, name: 'C5 Room '.uniqid(), mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($property, $roomType, number: 'C5-1');

        $user1 = $this->createCustomerUser(['email' => 'c5_u1_'.uniqid().'@example.test']);
        $user2 = $this->createCustomerUser(['email' => 'c5_u2_'.uniqid().'@example.test']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(25)->toDateString();
        $checkout = CarbonImmutable::now('Asia/Kolkata')->addDays(26)->toDateString();

        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 1);
        $reservation = app(CreateReservation::class)->execute($user1, $payload1);

        // Confirm the reservation with payment
        $orderId = 'ord_c5_'.uniqid();
        $payId = 'pay_c5_'.uniqid();
        $this->setupMockGateway($reservation->total_amount_minor, $orderId, $payId);
        app(InitiatePaymentOrder::class)->execute($reservation, $user1);
        $confirmed = app(VerifyCheckoutPayment::class)->execute($reservation, $user1, $orderId, $payId, 'sig_c5');

        $this->assertSame(ReservationStatus::Confirmed, $confirmed->status);

        // Availability check must report 0 rooms available
        $avail = app(ReservationAvailabilityService::class)->stayCapacity($roomType, $checkIn, $checkout, 1);
        $this->assertFalse($avail['available']);
        $this->assertSame(0, $avail['minimum_remaining']);

        // Subsequent booking attempt must be rejected
        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 1);
        $this->expectException(ValidationException::class);
        app(CreateReservation::class)->execute($user2, $payload2);
    }
}
