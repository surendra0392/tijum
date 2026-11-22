<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\PropertyRoomStatus;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Enums\ReviewResponseStatus;
use App\Enums\ReviewStatus;
use App\Models\PropertyReview;
use App\Models\PropertyReviewResponse;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class OwnerRoomAllocationAndReviewsApiTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_owner_can_list_physical_rooms_for_their_property(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType, '101');
        $this->createActiveRoom($property, $roomType, '102');

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/owner/properties/{$property->id}/rooms");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.room_number', '101')
            ->assertJsonPath('data.1.room_number', '102')
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'property_id',
                        'property_room_type_id',
                        'room_type_name',
                        'room_number',
                        'floor_number',
                        'operational_status',
                        'is_active',
                        'configured_capacity',
                    ],
                ],
            ]);
    }

    public function test_owner_cannot_list_rooms_for_another_owners_property(): void
    {
        $ownerA = $this->createActiveOwner();
        $ownerB = $this->createActiveOwner();
        $propertyB = $this->createBookableProperty($ownerB);
        $roomTypeB = $this->createBookableRoomType($propertyB);
        $this->createActiveRoom($propertyB, $roomTypeB, '201');

        $tokenA = $ownerA->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$tokenA)
            ->getJson("/api/v1/owner/properties/{$propertyB->id}/rooms");

        $response->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'NOT_FOUND');
    }

    public function test_unauthenticated_request_cannot_list_property_rooms(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        $response = $this->getJson("/api/v1/owner/properties/{$property->id}/rooms");

        $response->assertUnauthorized();
    }

    public function test_owner_can_allocate_physical_room_to_confirmed_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $room = $this->createActiveRoom($property, $roomType, '301');
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1);
        $checkOut = $checkIn->addDays(7);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'ALLOC-TEST-001',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 7,
            'duration_type' => 'daily',
            'duration_quantity' => 7,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 1,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => 'Host Guest',
            'contact_email' => 'hostguest@example.test',
            'contact_phone' => '+919876543210',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 700000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/allocate", [
                'physical_room_id' => $room->id,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_allocated', true)
            ->assertJsonPath('data.primary_room_number', '301')
            ->assertJsonPath('data.allocations.0.property_room_id', $room->id)
            ->assertJsonPath('data.allocations.0.room_number', '301');

        $this->assertDatabaseHas('reservation_room_allocations', [
            'reservation_id' => $reservation->id,
            'property_room_id' => $room->id,
            'allocated_quantity' => 1,
        ]);
    }

    public function test_owner_can_allocate_multiple_physical_rooms_using_allocations_array(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $room1 = $this->createActiveRoom($property, $roomType, '401');
        $room2 = $this->createActiveRoom($property, $roomType, '402');
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(2);
        $checkOut = $checkIn->addDays(5);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'ALLOC-MULTI-002',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 5,
            'duration_type' => 'daily',
            'duration_quantity' => 5,
            'quantity' => 2,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 2,
            'guest_gender' => 'unspecified',
            'guest_composition' => 'individuals',
            'contact_name' => 'Group Lead',
            'contact_email' => 'group@example.test',
            'contact_phone' => '+919876543211',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 1000000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/allocate", [
                'allocations' => [
                    ['property_room_id' => $room1->id, 'allocated_quantity' => 1],
                    ['property_room_id' => $room2->id, 'allocated_quantity' => 1],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_allocated', true)
            ->assertJsonCount(2, 'data.allocations');

        $this->assertDatabaseHas('reservation_room_allocations', [
            'reservation_id' => $reservation->id,
            'property_room_id' => $room1->id,
        ]);
        $this->assertDatabaseHas('reservation_room_allocations', [
            'reservation_id' => $reservation->id,
            'property_room_id' => $room2->id,
        ]);
    }

    public function test_owner_cannot_allocate_room_to_unconfirmed_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $room = $this->createActiveRoom($property, $roomType, '501');
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1);
        $checkOut = $checkIn->addDays(3);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'ALLOC-AWAITING-003',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::AwaitingPayment,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 3,
            'duration_type' => 'daily',
            'duration_quantity' => 3,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 1,
            'guest_gender' => 'female',
            'guest_composition' => 'individuals',
            'contact_name' => 'Guest Unpaid',
            'contact_email' => 'unpaid@example.test',
            'contact_phone' => '+919876543212',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 300000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
        ]);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/allocate", [
                'physical_room_id' => $room->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'INVALID_STATUS');
    }

    public function test_owner_cannot_allocate_room_from_another_property(): void
    {
        $owner = $this->createActiveOwner();
        $propertyA = $this->createBookableProperty($owner);
        $roomTypeA = $this->createBookableRoomType($propertyA);

        $propertyB = $this->createBookableProperty($owner);
        $roomTypeB = $this->createBookableRoomType($propertyB);
        $roomB = $this->createActiveRoom($propertyB, $roomTypeB, '601');

        $user = $this->createCustomerUser();
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1);
        $checkOut = $checkIn->addDays(3);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'ALLOC-MISMATCH-004',
            'user_id' => $user->id,
            'property_id' => $propertyA->id,
            'property_room_type_id' => $roomTypeA->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 3,
            'duration_type' => 'daily',
            'duration_quantity' => 3,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 1,
            'guest_gender' => 'female',
            'guest_composition' => 'individuals',
            'contact_name' => 'Mismatch Guest',
            'contact_email' => 'mismatch@example.test',
            'contact_phone' => '+919876543213',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 300000,
            'snapshot_property_name' => $propertyA->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomTypeA->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/allocate", [
                'physical_room_id' => $roomB->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'VALIDATION_ERROR');
    }

    public function test_owner_cannot_allocate_inactive_room(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $room = $this->createActiveRoom($property, $roomType, '701');
        $room->update(['operational_status' => PropertyRoomStatus::Maintenance]);

        $user = $this->createCustomerUser();
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1);
        $checkOut = $checkIn->addDays(2);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'ALLOC-INACTIVE-005',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 2,
            'duration_type' => 'daily',
            'duration_quantity' => 2,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 1,
            'guest_gender' => 'female',
            'guest_composition' => 'individuals',
            'contact_name' => 'Inactive Room Guest',
            'contact_email' => 'inactiveroom@example.test',
            'contact_phone' => '+919876543214',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 200000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/allocate", [
                'physical_room_id' => $room->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'VALIDATION_ERROR');
    }

    public function test_owner_can_view_reviews_for_their_properties(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->subDays(10);
        $checkOut = $checkIn->addDays(5);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'REV-VIEW-001',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 5,
            'duration_type' => 'daily',
            'duration_quantity' => 5,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 1,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => 'Reviewing Guest',
            'contact_email' => 'revguest@example.test',
            'contact_phone' => '+919876543215',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 500000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        /** @var PropertyReview $review */
        $review = PropertyReview::query()->create([
            'reservation_id' => $reservation->id,
            'property_id' => $property->id,
            'user_id' => $user->id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 5,
            'cleanliness_rating' => 5,
            'food_quality_rating' => 4,
            'communication_rating' => 5,
            'value_rating' => 5,
            'title' => 'Exceptional hospitality!',
            'content' => 'The property was pristine and peaceful.',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Reviewer G.',
            'submitted_at' => now()->subDays(2),
            'published_at' => now()->subDay(),
        ]);

        PropertyReviewResponse::query()->create([
            'property_review_id' => $review->id,
            'owner_id' => $owner->id,
            'response_text' => 'Delighted to host you!',
            'status' => ReviewResponseStatus::Published,
            'submitted_at' => now()->subDay(),
            'published_at' => now()->subDay(),
        ]);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/reviews');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $review->id)
            ->assertJsonPath('data.0.property_name', $property->name)
            ->assertJsonPath('data.0.guest_name', 'Reviewer G.')
            ->assertJsonPath('data.0.overall_rating', 5)
            ->assertJsonPath('data.0.response.response_text', 'Delighted to host you!')
            ->assertJsonPath('data.0.stay_dates.check_in_date', $checkIn->toDateString())
            ->assertJsonPath('data.0.stay_dates.checkout_date', $checkOut->toDateString());
    }

    public function test_owner_can_respond_to_published_review(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->subDays(8);
        $checkOut = $checkIn->addDays(3);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'REV-RESP-002',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 3,
            'duration_type' => 'daily',
            'duration_quantity' => 3,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 1,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => 'Guest Happy',
            'contact_email' => 'happy@example.test',
            'contact_phone' => '+919876543216',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 300000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        /** @var PropertyReview $review */
        $review = PropertyReview::query()->create([
            'reservation_id' => $reservation->id,
            'property_id' => $property->id,
            'user_id' => $user->id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 4,
            'title' => 'Comfortable stay',
            'content' => 'Great value for money.',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Happy G.',
            'submitted_at' => now()->subDays(2),
            'published_at' => now()->subDay(),
        ]);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/reviews/{$review->id}/response", [
                'response' => 'Thank you Happy! Looking forward to welcoming you back.',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.response_text', 'Thank you Happy! Looking forward to welcoming you back.')
            ->assertJsonPath('data.status', 'pending_moderation');

        $this->assertDatabaseHas('property_review_responses', [
            'property_review_id' => $review->id,
            'owner_id' => $owner->id,
            'response_text' => 'Thank you Happy! Looking forward to welcoming you back.',
            'status' => ReviewResponseStatus::PendingModeration->value,
        ]);
    }

    public function test_owner_cannot_respond_to_another_owners_review(): void
    {
        $ownerA = $this->createActiveOwner();
        $ownerB = $this->createActiveOwner();
        $propertyA = $this->createBookableProperty($ownerA);
        $roomTypeA = $this->createBookableRoomType($propertyA);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->subDays(8);
        $checkOut = $checkIn->addDays(3);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'REV-CROSS-003',
            'user_id' => $user->id,
            'property_id' => $propertyA->id,
            'property_room_type_id' => $roomTypeA->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 3,
            'duration_type' => 'daily',
            'duration_quantity' => 3,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 1,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => 'Guest Cross',
            'contact_email' => 'cross@example.test',
            'contact_phone' => '+919876543217',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 300000,
            'snapshot_property_name' => $propertyA->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomTypeA->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        /** @var PropertyReview $review */
        $review = PropertyReview::query()->create([
            'reservation_id' => $reservation->id,
            'property_id' => $propertyA->id,
            'user_id' => $user->id,
            'property_room_type_id' => $roomTypeA->id,
            'owner_id' => $ownerA->id,
            'overall_rating' => 4,
            'title' => 'Cross owner test',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Cross G.',
            'submitted_at' => now()->subDay(),
            'published_at' => now()->subDay(),
        ]);

        $tokenB = $ownerB->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$tokenB)
            ->postJson("/api/v1/owner/reviews/{$review->id}/response", [
                'response' => 'Unauthorized response attempt',
            ]);

        $response->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'NOT_FOUND');
    }

    public function test_owner_cannot_respond_to_unpublished_review(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->subDays(5);
        $checkOut = $checkIn->addDays(2);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'REV-UNPUB-004',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 2,
            'duration_type' => 'daily',
            'duration_quantity' => 2,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 1,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => 'Guest Unpub',
            'contact_email' => 'unpub@example.test',
            'contact_phone' => '+919876543218',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 200000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        /** @var PropertyReview $review */
        $review = PropertyReview::query()->create([
            'reservation_id' => $reservation->id,
            'property_id' => $property->id,
            'user_id' => $user->id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 3,
            'title' => 'Pending review',
            'status' => ReviewStatus::PendingModeration,
            'verified_booking' => true,
            'customer_display_name' => 'Unpub G.',
            'submitted_at' => now(),
        ]);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/reviews/{$review->id}/response", [
                'response' => 'Trying to respond prematurely',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'INVALID_STATUS');
    }

    public function test_owner_response_validation_failure_for_blank_or_too_long(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->subDays(5);
        $checkOut = $checkIn->addDays(2);

        /** @var Reservation $reservation */
        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'REV-VAL-005',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 2,
            'duration_type' => 'daily',
            'duration_quantity' => 2,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::PrivateRooms->value,
            'rate_unit' => ReservationRateUnit::PerPrivateRoom->value,
            'guest_count' => 1,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => 'Guest Val',
            'contact_email' => 'val@example.test',
            'contact_phone' => '+919876543219',
            'currency_code' => 'INR',
            'unit_rate_minor' => 100000,
            'total_amount_minor' => 200000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Boutique Stay',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => true,
            'snapshot_food_provided' => false,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        /** @var PropertyReview $review */
        $review = PropertyReview::query()->create([
            'reservation_id' => $reservation->id,
            'property_id' => $property->id,
            'user_id' => $user->id,
            'property_room_type_id' => $roomType->id,
            'owner_id' => $owner->id,
            'overall_rating' => 4,
            'title' => 'Validation review',
            'status' => ReviewStatus::Published,
            'verified_booking' => true,
            'customer_display_name' => 'Val G.',
            'submitted_at' => now()->subDay(),
            'published_at' => now()->subDay(),
        ]);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        // 1. Blank response
        $blankRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/reviews/{$review->id}/response", [
                'response' => '   ',
            ]);
        $blankRes->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'VALIDATION_ERROR');

        // 2. Exceeding 2500 characters
        $longRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/reviews/{$review->id}/response", [
                'response' => str_repeat('a', 2501),
            ]);
        $longRes->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'VALIDATION_ERROR');
    }
}
