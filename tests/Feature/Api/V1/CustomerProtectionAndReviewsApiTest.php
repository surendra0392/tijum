<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\AmenityApplicabilityScope;
use App\Enums\AmenityVerificationStatus;
use App\Enums\CaseCategory;
use App\Enums\PropertyOperationalStatus;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Models\Amenity;
use App\Models\AmenityCategory;
use App\Models\PropertyAmenity;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class CustomerProtectionAndReviewsApiTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_property_detail_endpoint_serializes_amenities_without_error(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $property->forceFill([
            'status' => PropertyOperationalStatus::Active,
            'is_verified' => true,
            'booking_eligible' => true,
        ])->save();

        $category = AmenityCategory::query()->create([
            'code' => 'GENERAL',
            'name' => 'General',
            'slug' => 'general',
            'display_order' => 1,
        ]);

        $amenity = Amenity::query()->create([
            'amenity_category_id' => $category->id,
            'code' => 'WIFI',
            'name' => 'High-Speed Wi-Fi',
            'slug' => 'high-speed-wifi',
            'applicability_scope' => AmenityApplicabilityScope::Both->value,
            'is_customer_visible' => true,
            'is_active' => true,
        ]);

        PropertyAmenity::query()->create([
            'property_id' => $property->id,
            'amenity_id' => $amenity->id,
            'assignment_group_id' => (string) Str::ulid(),
            'assignment_reference' => 'PA-'.strtoupper(Str::random(10)),
            'availability' => 'included',
            'status' => AmenityVerificationStatus::Approved->value,
            'is_current' => true,
            'is_customer_visible' => true,
        ]);

        $response = $this->getJson("/api/v1/public/properties/{$property->slug}");

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', $property->name)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'amenities' => [
                        '*' => [
                            'id',
                            'name',
                            'code',
                        ],
                    ],
                ],
            ]);
    }

    public function test_customer_reservations_endpoint_serializes_duration_type_correctly(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = $this->createCustomerUser();
        $token = $user->createToken('test')->plainTextToken;

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(2);
        $checkOut = $checkIn->addDays(30);

        Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'TEST-RES-1234',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 30,
            'duration_type' => 'monthly',
            'duration_quantity' => 1,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::GuestPlaces->value,
            'rate_unit' => ReservationRateUnit::PerGuest->value,
            'guest_count' => 1,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => 'Test Guest',
            'contact_email' => 'guest@example.test',
            'contact_phone' => '+919999999999',
            'currency_code' => 'INR',
            'unit_rate_minor' => 2600000,
            'total_amount_minor' => 2600000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Hostels/PG',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => false,
            'snapshot_food_provided' => true,
            'snapshot_breakfast_included' => true,
            'snapshot_lunch_included' => true,
            'snapshot_dinner_included' => true,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/reservations');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.booking_reference', 'TEST-RES-1234')
            ->assertJsonPath('data.0.duration_type', 'monthly');
    }

    public function test_customer_can_create_food_protection_case(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = $this->createCustomerUser();
        $token = $user->createToken('test')->plainTextToken;

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->subDays(2);
        $checkOut = $checkIn->addDays(30);

        $reservation = Reservation::query()->create([
            'submission_token' => (string) Str::uuid(),
            'booking_reference' => 'CASE-RES-5678',
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => $checkIn->toDateString(),
            'checkout_date' => $checkOut->toDateString(),
            'total_stay_days' => 30,
            'duration_type' => 'monthly',
            'duration_quantity' => 1,
            'quantity' => 1,
            'quantity_basis' => ReservationQuantityBasis::GuestPlaces->value,
            'rate_unit' => ReservationRateUnit::PerGuest->value,
            'guest_count' => 1,
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => 'Test Guest',
            'contact_email' => 'guest@example.test',
            'contact_phone' => '+919999999999',
            'currency_code' => 'INR',
            'unit_rate_minor' => 2600000,
            'total_amount_minor' => 2600000,
            'snapshot_property_name' => $property->name,
            'snapshot_category_name' => 'Hostels/PG',
            'snapshot_room_type_name' => $roomType->name,
            'snapshot_is_air_conditioned' => false,
            'snapshot_food_provided' => true,
            'snapshot_breakfast_included' => true,
            'snapshot_lunch_included' => true,
            'snapshot_dinner_included' => true,
            'submitted_at' => now(),
            'confirmed_at' => now(),
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/customer/cases', [
                'booking_reference' => $reservation->booking_reference,
                'category' => 'food_not_provided',
                'description' => 'Dinner was not served despite inclusive plan on the listing.',
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.category', 'food_not_provided')
            ->assertJsonPath('data.status', 'open');

        $this->assertDatabaseHas('customer_protection_cases', [
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'category' => CaseCategory::FoodNotProvided->value,
        ]);
    }

    public function test_customer_reviews_eligible_endpoint_returns_successfully(): void
    {
        $user = $this->createCustomerUser();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/reviews/eligible');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertIsArray($response->json('data'));
    }
}
