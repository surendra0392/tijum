<?php

declare(strict_types=1);

namespace Tests\Feature\Owner\Properties;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Support\PropertyPortalData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyRoomTest extends TestCase
{
    use RefreshDatabase;

    private function createPropertyWithRoomType(
        Owner $owner,
        PropertyVerificationStatus $status = PropertyVerificationStatus::Draft,
        bool $approved = false,
    ): array {
        $property = Property::factory()->for($owner)->create([
            'status' => $approved ? PropertyOperationalStatus::Active : PropertyOperationalStatus::Draft,
            'is_verified' => $approved,
            'booking_eligible' => $approved,
            'approved_at' => $approved ? now() : null,
        ]);

        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $status->isTerminal() ? null : $property->id,
            'application_number' => 'TJPV-2026-'.str_pad((string) $property->id, 6, '0', STR_PAD_LEFT),
            'status' => $status,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
        ])->save();

        $rt = new PropertyRoomType;
        $rt->forceFill([
            'property_id' => $property->id,
            'name' => '4 Sharing AC',
            'slug' => '4-sharing-ac',
            'accommodation_mode' => PropertyRoomTypeMode::Shared,
            'sharing_capacity' => 4,
            'max_guests_per_room' => 4,
            'is_air_conditioned' => true,
            'gender_policy' => PropertyGenderPolicy::AllGenders,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
            'early_check_in_enabled' => false,
            'is_active' => true,
            'is_approved_version' => $approved,
        ])->save();

        return [$property, $rt];
    }

    public function test_physical_room_creation_enforces_unique_room_number_and_derives_capacity_without_beds(): void
    {
        $owner = Owner::factory()->active()->create();
        $otherOwner = Owner::factory()->active()->create();

        [$property, $rt] = $this->createPropertyWithRoomType($owner);
        [$otherProperty, $otherRt] = $this->createPropertyWithRoomType($otherOwner);

        // Creating Room 101 works.
        $this->actingAs($owner, 'owner')->post(route('owner.properties.rooms.store', $property), [
            'property_room_type_id' => $rt->id,
            'room_number' => '101',
            'floor_number' => '1',
            'wing_name' => 'North',
            'operational_status' => PropertyRoomStatus::Active->value,
        ])->assertRedirect(route('owner.properties.rooms.index', $property));

        // Duplicate Room 101 in the same property is rejected.
        $this->actingAs($owner, 'owner')->post(route('owner.properties.rooms.store', $property), [
            'property_room_type_id' => $rt->id,
            'room_number' => '101',
            'operational_status' => PropertyRoomStatus::Active->value,
        ])->assertSessionHasErrors('room_number');

        // Same room_number 101 on another property is allowed, while cross-property room type ID is rejected.
        $this->actingAs($otherOwner, 'owner')->post(route('owner.properties.rooms.store', $otherProperty), [
            'property_room_type_id' => $rt->id,
            'room_number' => '101',
            'operational_status' => PropertyRoomStatus::Active->value,
        ])->assertSessionHasErrors('property_room_type_id');

        $this->actingAs($otherOwner, 'owner')->post(route('owner.properties.rooms.store', $otherProperty), [
            'property_room_type_id' => $otherRt->id,
            'room_number' => '101',
            'operational_status' => PropertyRoomStatus::Active->value,
        ])->assertRedirect();

        // Add Room 102 in Maintenance status -> nominal_active_capacity counts only Active room 101 (4 guests, not 8).
        $this->actingAs($owner, 'owner')->post(route('owner.properties.rooms.store', $property), [
            'property_room_type_id' => $rt->id,
            'room_number' => '102',
            'operational_status' => PropertyRoomStatus::Maintenance->value,
        ])->assertRedirect();

        $summary = PropertyPortalData::ownerSummary($property->fresh());
        $this->assertSame(2, $summary['rooms_count']);
        $this->assertSame(1, $summary['active_rooms_count']);
        $this->assertSame(4, $summary['nominal_active_capacity']);
    }

    public function test_approved_property_room_operational_status_toggles_live_without_reverification(): void
    {
        $owner = Owner::factory()->active()->create();
        $otherOwner = Owner::factory()->active()->create();
        [$property, $rt] = $this->createPropertyWithRoomType($owner, PropertyVerificationStatus::Approved, approved: true);

        $room = new PropertyRoom;
        $room->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $rt->id,
            'room_number' => 'A-201',
            'operational_status' => PropertyRoomStatus::Active,
            'is_approved_version' => true,
        ])->save();

        // Cross-owner status toggle blocked with 403.
        $this->actingAs($otherOwner, 'owner')->patch(route('owner.properties.rooms.status.update', [$property, $room]), [
            'operational_status' => PropertyRoomStatus::Blocked->value,
        ])->assertForbidden();

        // Owning partner updates A-201 -> Blocked without altering verification status.
        $this->actingAs($owner, 'owner')->patch(route('owner.properties.rooms.status.update', [$property, $room]), [
            'operational_status' => PropertyRoomStatus::Blocked->value,
        ])->assertRedirect();

        $this->assertSame(PropertyRoomStatus::Blocked, $room->fresh()->operational_status);
        $this->assertTrue($property->fresh()->is_verified);
        $this->assertSame(0, PropertyPortalData::ownerSummary($property->fresh())['nominal_active_capacity']);
    }
}
