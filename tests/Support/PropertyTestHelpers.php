<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;

trait PropertyTestHelpers
{
    protected function createApprovedProperty(Owner $owner): Property
    {
        $property = $this->createProperty($owner, approved: true, appStatus: PropertyVerificationStatus::Approved, opStatus: PropertyOperationalStatus::Active);

        return $property->fresh();
    }

    protected function createProperty(
        Owner $owner,
        bool $approved = false,
        PropertyVerificationStatus $appStatus = PropertyVerificationStatus::Draft,
        PropertyOperationalStatus $opStatus = PropertyOperationalStatus::Draft,
    ): Property {
        $cityId = City::query()->value('id');
        if ($cityId === null) {
            $cityId = City::query()->create([
                'name' => 'Hyderabad',
                'slug' => 'hyderabad',
                'state' => 'Telangana',
                'state_code' => 'TG',
                'country_code' => 'IN',
                'is_active' => true,
                'sort_order' => 1,
            ])->id;
        }
        $categoryId = PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->value('id')
            ?? PropertyCategory::query()->value('id');
        if ($categoryId === null) {
            $categoryId = PropertyCategory::query()->create([
                'name' => 'Hostels/PG',
                'slug' => PropertyCategory::SLUG_HOSTELS_PG,
                'code' => 'hostel_pg',
                'is_active' => true,
                'sort_order' => 1,
            ])->id;
        }

        $property = new Property;
        $property->forceFill([
            'owner_id' => $owner->id,
            'property_category_id' => $categoryId,
            'city_id' => $cityId,
            'property_reference' => 'TJP-'.now()->format('Y').'-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT),
            'name' => 'Test Residency '.strtoupper(bin2hex(random_bytes(2))),
            'slug' => 'test-residency-'.strtolower(bin2hex(random_bytes(3))),
            'description' => 'Test property description for Phase 09A flows.',
            'contact_person_name' => 'Test Contact',
            'contact_phone' => '+919999999999',
            'contact_email' => 'property@example.test',
            'address_line_1' => 'Plot 1',
            'address_line_2' => null,
            'locality' => 'Madhapur',
            'landmark' => null,
            'postal_code' => '500081',
            'state' => 'Telangana',
            'country_code' => 'IN',
            'food_provided' => false,
            'breakfast_included' => false,
            'lunch_included' => false,
            'dinner_included' => false,
            'status' => $opStatus->value,
            'is_verified' => $approved,
            'booking_eligible' => $approved && $opStatus === PropertyOperationalStatus::Active,
            'approved_at' => $approved ? now() : null,
        ])->save();

        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $appStatus->isTerminal() ? null : $property->id,
            'application_number' => 'TJPV-'.now()->format('Y').'-'.str_pad((string) $property->id, 6, '0', STR_PAD_LEFT),
            'status' => $appStatus->value,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator->value,
            'approved_snapshot' => $approved ? ['property' => $property->toApprovedPropertyFieldsSnapshot()] : null,
        ])->save();

        if ($approved) {
            $property->forceFill([
                'latest_approved_application_id' => $app->id,
                'approved_snapshot' => ['property' => $property->toApprovedPropertyFieldsSnapshot()],
            ])->save();
        }

        return $property->fresh();
    }

    protected function createRoomType(Property $property, string $name = 'Standard Room', array $overrides = []): PropertyRoomType
    {
        $roomType = new PropertyRoomType;
        $roomType->forceFill(array_merge([
            'property_id' => $property->id,
            'name' => $name,
            'slug' => str($name)->slug()->toString().'-'.strtolower(bin2hex(random_bytes(2))),
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'gender_policy' => 'all_genders',
            'guest_composition_policy' => ['individuals'],
            'early_check_in_enabled' => false,
            'is_active' => true,
            'is_approved_version' => true,
            'display_order' => 0,
        ], $overrides))->save();

        return $roomType->fresh();
    }

    protected function createRoom(Property $property, PropertyRoomType $roomType, string $number = '101', array $overrides = []): PropertyRoom
    {
        $room = new PropertyRoom;
        $room->forceFill(array_merge([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'room_number' => $number,
            'floor_number' => '1',
            'operational_status' => 'active',
            'is_approved_version' => true,
        ], $overrides))->save();

        return $room->fresh();
    }
}
