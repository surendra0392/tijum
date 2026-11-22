<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockType;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Models\City;
use App\Models\PropertyCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class OwnerPropertyManagementApiTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_owner_can_fetch_reference_data(): void
    {
        $owner = $this->createActiveOwner();
        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/reference-data');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'cities',
                    'categories',
                    'canonical_categories',
                    'room_type_modes',
                    'gender_policies',
                    'guest_compositions',
                    'room_operational_statuses',
                    'block_scopes',
                    'block_types',
                    'amenities',
                ],
            ]);
    }

    public function test_owner_can_create_and_update_property_draft(): void
    {
        $owner = $this->createActiveOwner();
        $token = $owner->createToken('partner_tab')->plainTextToken;
        $city = City::query()->active()->first() ?? City::factory()->create(['is_active' => true]);
        $category = PropertyCategory::query()->active()->where('slug', 'hostels-pg')->first()
            ?? PropertyCategory::factory()->create(['slug' => 'hostels-pg', 'is_active' => true]);

        $createResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/owner/properties', [
                'name' => 'Royal Heritage Stay',
                'category_id' => $category->id,
                'city_id' => $city->id,
                'description' => 'A premier accommodation for students and young working professionals.',
                'contact_person_name' => 'Rajesh Sharma',
                'contact_phone' => '9876543210',
                'contact_email' => 'rajesh@example.com',
                'address_line_1' => 'Plot 42, Hitec City Road',
                'locality' => 'Madhapur',
                'postal_code' => '500081',
            ]);

        $createResponse->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Royal Heritage Stay');

        $propertyId = $createResponse->json('data.id');
        $this->assertNotNull($propertyId);

        // Update details
        $updateResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/v1/owner/properties/{$propertyId}", [
                'name' => 'Royal Heritage Luxury Stay',
                'category_id' => $category->id,
                'city_id' => $city->id,
                'description' => 'Updated premier accommodation with upgraded amenities.',
                'contact_person_name' => 'Rajesh Sharma',
                'contact_phone' => '9876543210',
                'contact_email' => 'rajesh@example.com',
                'address_line_1' => 'Plot 42, Hitec City Road',
                'locality' => 'Madhapur',
                'postal_code' => '500081',
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Royal Heritage Luxury Stay');
    }

    public function test_owner_can_manage_room_types_and_physical_rooms(): void
    {
        $owner = $this->createActiveOwner();
        $token = $owner->createToken('partner_tab')->plainTextToken;
        $property = $this->createProperty($owner);

        // 1. Create Room Type
        $rtResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/properties/{$property->id}/room-types", [
                'name' => '2 Sharing AC Room',
                'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
                'sharing_capacity' => 2,
                'gender_policy' => PropertyGenderPolicy::AllGenders->value,
                'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
                'is_air_conditioned' => true,
                'is_active' => true,
            ]);

        $rtResponse->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', '2 Sharing AC Room');

        $roomTypeId = $rtResponse->json('data.id');

        // 2. Create Physical Room
        $roomResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/properties/{$property->id}/rooms", [
                'room_number' => '201',
                'property_room_type_id' => $roomTypeId,
                'floor_number' => '2',
                'wing_name' => 'East Wing',
            ]);

        $roomResponse->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.room_number', '201');

        $roomId = $roomResponse->json('data.id');

        // 3. Update Room Status to Maintenance
        $statusResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson("/api/v1/owner/properties/{$property->id}/rooms/{$roomId}/status", [
                'operational_status' => PropertyRoomStatus::Maintenance->value,
                'internal_description' => 'Scheduled AC servicing',
            ]);

        $statusResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.operational_status', PropertyRoomStatus::Maintenance->value);
    }

    public function test_owner_can_manage_pricing_and_food_configuration(): void
    {
        $owner = $this->createActiveOwner();
        $token = $owner->createToken('partner_tab')->plainTextToken;
        $property = $this->createProperty($owner);
        $roomType = $this->createRoomType($property);

        // Get pricing
        $getResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/v1/owner/properties/{$property->id}/pricing");

        $getResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['property_id', 'food', 'room_types', 'evaluation']]);

        // Update pricing
        $putResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson("/api/v1/owner/properties/{$property->id}/pricing", [
                'food_provided' => true,
                'breakfast_included' => true,
                'lunch_included' => false,
                'dinner_included' => true,
                'room_types' => [
                    [
                        'id' => $roomType->id,
                        'daily_rate_minor' => 85000,
                        'weekly_rate_minor' => 550000,
                        'monthly_rate_minor' => 1800000,
                    ],
                ],
            ]);

        $putResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.food.provided', true)
            ->assertJsonPath('data.food.breakfast', true)
            ->assertJsonPath('data.food.dinner', true);
    }

    public function test_owner_can_create_and_cancel_availability_blocks(): void
    {
        $owner = $this->createActiveOwner();
        $token = $owner->createToken('partner_tab')->plainTextToken;
        $property = $this->createProperty($owner);

        // Create availability block
        $blockResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/owner/properties/{$property->id}/availability-blocks", [
                'scope' => PropertyAvailabilityBlockScope::Property->value,
                'block_type' => PropertyAvailabilityBlockType::Maintenance->value,
                'start_date' => now()->addDays(10)->toDateString(),
                'end_date' => now()->addDays(15)->toDateString(),
                'reason' => 'Annual facility renovation',
            ]);

        $blockResponse->assertCreated()
            ->assertJsonPath('success', true);

        $blockId = $blockResponse->json('data.id');

        // Cancel availability block
        $deleteResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson("/api/v1/owner/properties/{$property->id}/availability-blocks/{$blockId}", [
                'reason' => 'Renovation completed ahead of schedule',
            ]);

        $deleteResponse->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_owner_cannot_mutate_another_owners_property(): void
    {
        $owner1 = $this->createActiveOwner();
        $owner2 = $this->createActiveOwner();
        $property = $this->createProperty($owner1);

        $token2 = $owner2->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token2)
            ->putJson("/api/v1/owner/properties/{$property->id}", [
                'name' => 'Hacked Property Name',
                'category_id' => $property->property_category_id,
                'city_id' => $property->city_id,
                'description' => 'Should fail with 404 unauthorized.',
                'contact_person_name' => 'Hacker',
                'contact_phone' => '9876543210',
                'address_line_1' => 'Street 1',
                'locality' => 'Locality',
                'postal_code' => '500001',
            ]);

        $response->assertNotFound();
    }
}
