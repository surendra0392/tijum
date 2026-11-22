<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class CustomerReservationAndPaymentApiTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_customer_can_quote_reservation_pricing(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $user = $this->createCustomerUser();
        $token = $user->createToken('test')->plainTextToken;

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/reservations/quote/{$property->id}", [
                'property_room_type_id' => $roomType->id,
                'check_in_date' => $checkIn,
                'duration_type' => 'daily',
                'duration_quantity' => 2,
                'quantity' => 1,
                'guest_count' => 1,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'quote' => [
                        'total_stay_days',
                        'total_amount_minor',
                    ],
                ],
            ]);
    }

    public function test_customer_can_create_reservation_via_api(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $user = $this->createCustomerUser();
        $token = $user->createToken('test')->plainTextToken;

        $payload = $this->validReservationPayload($property, $roomType);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/customer/reservations', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'reference',
                    'status',
                    'property_name',
                    'room_type_name',
                    'total_amount_paise',
                ],
            ]);

        $this->assertDatabaseHas('reservations', [
            'user_id' => $user->id,
            'property_id' => $property->id,
            'status' => ReservationStatus::AwaitingPayment->value,
        ]);
    }

    public function test_customer_cannot_view_another_customer_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $userA = $this->createCustomerUser();
        $userB = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $tokenA = $userA->createToken('testA')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer '.$tokenA)
            ->postJson('/api/v1/customer/reservations', $payload);

        $reference = $createRes->json('data.reference');
        $this->assertNotEmpty($reference);

        // Clear cached auth guards
        $this->app['auth']->forgetGuards();

        // Customer B tries to view Customer A's reservation
        $tokenB = $userB->createToken('testB')->plainTextToken;
        $response = $this->withHeader('Authorization', 'Bearer '.$tokenB)
            ->getJson("/api/v1/customer/reservations/{$reference}");

        $response->assertNotFound();
    }

    public function test_customer_can_cancel_their_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $user = $this->createCustomerUser();
        $token = $user->createToken('test')->plainTextToken;

        $payload = $this->validReservationPayload($property, $roomType);
        $createRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/customer/reservations', $payload);

        $reference = $createRes->json('data.reference');

        $cancelRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/reservations/{$reference}/cancel", [
                'reason' => 'Schedule change',
            ]);

        $cancelRes->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('reservations', [
            'booking_reference' => $reference,
            'status' => ReservationStatus::Cancelled->value,
        ]);
    }

    public function test_payment_initiate_rejects_reservation_not_awaiting_payment(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $user = $this->createCustomerUser();
        $token = $user->createToken('test')->plainTextToken;

        $payload = $this->validReservationPayload($property, $roomType);
        $createRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/customer/reservations', $payload);

        $reference = $createRes->json('data.reference');

        // Set reservation to confirmed so it is not awaiting payment
        Reservation::query()->where('booking_reference', $reference)->update(['status' => ReservationStatus::Confirmed]);

        $payRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/reservations/{$reference}/payment/initiate");

        $payRes->assertStatus(422)
            ->assertJsonPath('error_code', 'NOT_AWAITING_PAYMENT');
    }

    public function test_payment_verify_rejects_invalid_signature(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $user = $this->createCustomerUser();
        $token = $user->createToken('test')->plainTextToken;

        $reservation = Reservation::query()->create([
            'booking_reference' => 'TIJ-TEST-PAY-01',
            'submission_token' => (string) str()->uuid(),
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::AwaitingPayment->value,
            'check_in_date' => now()->addDays(2)->startOfDay(),
            'checkout_date' => now()->addDays(3)->startOfDay(),
            'duration_type' => 'daily',
            'duration_quantity' => 1,
            'total_stay_days' => 1,
            'quantity' => 1,
            'guest_count' => 1,
            'quantity_basis' => ReservationQuantityBasis::GuestPlaces->value,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => $user->name,
            'contact_email' => $user->email,
            'contact_phone' => '+919876543210',
            'snapshot_property_name' => $property->name,
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => true,
            'snapshot_breakfast_included' => true,
            'snapshot_lunch_included' => true,
            'snapshot_dinner_included' => true,
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'rate_unit' => ReservationRateUnit::PerGuest->value,
            'total_amount_minor' => 100000,
            'submitted_at' => now(),
            'payment_deadline_at' => now()->addMinutes(15),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/reservations/{$reservation->booking_reference}/payment/verify", [
                'razorpay_order_id' => 'order_fake_123',
                'razorpay_payment_id' => 'pay_fake_456',
                'razorpay_signature' => 'invalid_forged_signature',
            ]);

        $response->assertStatus(422);
    }
}
