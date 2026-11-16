<?php

declare(strict_types=1);

namespace Tests\Feature\Owner\Properties;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PropertyRoomTypeTest extends TestCase
{
    use RefreshDatabase;

    private function createEditableProperty(Owner $owner): Property
    {
        $property = Property::factory()->for($owner)->create();
        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-2026-'.str_pad((string) $property->id, 6, '0', STR_PAD_LEFT),
            'status' => PropertyVerificationStatus::Draft,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
        ])->save();

        return $property;
    }

    public function test_shared_and_single_room_types_follow_strict_guest_capacity_and_uniqueness_rules(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createEditableProperty($owner);

        // Shared 4 Sharing AC succeeds.
        $this->actingAs($owner, 'owner')->post(route('owner.properties.room-types.store', $property), [
            'name' => 'Standard 4 Sharing AC',
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'sharing_capacity' => 4,
            'max_guests_per_room' => 4,
            'is_air_conditioned' => true,
            'gender_policy' => PropertyGenderPolicy::FemaleOnly->value,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
            'early_check_in_enabled' => true,
        ])->assertRedirect(route('owner.properties.room-types.index', $property));

        // Distinctly named 4 Sharing variant succeeds.
        $this->actingAs($owner, 'owner')->post(route('owner.properties.room-types.store', $property), [
            'name' => 'Premium 4 Sharing AC',
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'sharing_capacity' => 4,
            'max_guests_per_room' => 4,
            'is_air_conditioned' => true,
            'gender_policy' => PropertyGenderPolicy::FemaleOnly->value,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value, PropertyGuestComposition::Groups->value],
            'early_check_in_enabled' => false,
        ])->assertRedirect();

        // Duplicate name within the same property is rejected.
        $this->actingAs($owner, 'owner')->post(route('owner.properties.room-types.store', $property), [
            'name' => 'Standard 4 Sharing AC',
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => false,
            'gender_policy' => PropertyGenderPolicy::AllGenders->value,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
            'early_check_in_enabled' => false,
        ])->assertSessionHasErrors('name');

        // Single Room (Private) strictly rejects max_guests_per_room > 1 (e.g. 2 guests).
        $this->actingAs($owner, 'owner')->post(route('owner.properties.room-types.store', $property), [
            'name' => 'Private Couple Room',
            'accommodation_mode' => PropertyRoomTypeMode::Private->value,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'gender_policy' => PropertyGenderPolicy::NotApplicable->value,
            'guest_composition_policy' => [PropertyGuestComposition::Couples->value],
            'early_check_in_enabled' => false,
        ])->assertSessionHasErrors('max_guests_per_room');

        // Single Room (Private) with 1 guest succeeds.
        $this->actingAs($owner, 'owner')->post(route('owner.properties.room-types.store', $property), [
            'name' => 'Executive Single AC',
            'accommodation_mode' => PropertyRoomTypeMode::Private->value,
            'max_guests_per_room' => 1,
            'is_air_conditioned' => true,
            'gender_policy' => PropertyGenderPolicy::NotApplicable->value,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
            'early_check_in_enabled' => true,
        ])->assertRedirect();

        $privateType = PropertyRoomType::query()->where('property_id', $property->id)->where('name', 'Executive Single AC')->firstOrFail();
        $this->assertSame(1, $privateType->max_guests_per_room);
        $this->assertNull($privateType->sharing_capacity);
    }

    public function test_room_type_with_existing_rooms_locks_structural_fields_and_blocks_deletion(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createEditableProperty($owner);

        $roomType = new PropertyRoomType;
        $roomType->forceFill([
            'property_id' => $property->id,
            'name' => '3 Sharing Non-AC',
            'slug' => '3-sharing-non-ac',
            'accommodation_mode' => PropertyRoomTypeMode::Shared,
            'sharing_capacity' => 3,
            'max_guests_per_room' => 3,
            'is_air_conditioned' => false,
            'gender_policy' => PropertyGenderPolicy::MaleOnly,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
            'early_check_in_enabled' => false,
            'is_active' => true,
        ])->save();

        $room = new PropertyRoom;
        $room->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'room_number' => '101',
        ])->save();

        // Changing sharing_capacity or is_air_conditioned when physical rooms exist fails.
        $this->actingAs($owner, 'owner')->put(route('owner.properties.room-types.update', [$property, $roomType]), [
            'name' => '3 Sharing Non-AC',
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'gender_policy' => PropertyGenderPolicy::MaleOnly->value,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
            'early_check_in_enabled' => false,
            'is_active' => true,
        ])->assertSessionHasErrors('accommodation_mode');

        // Safe non-structural edit (deactivating / policy update) succeeds.
        $this->actingAs($owner, 'owner')->put(route('owner.properties.room-types.update', [$property, $roomType]), [
            'name' => '3 Sharing Non-AC (Refreshed)',
            'accommodation_mode' => PropertyRoomTypeMode::Shared->value,
            'sharing_capacity' => 3,
            'max_guests_per_room' => 3,
            'is_air_conditioned' => false,
            'gender_policy' => PropertyGenderPolicy::MaleOnly->value,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
            'early_check_in_enabled' => true,
            'is_active' => false,
        ])->assertRedirect();

        $this->assertFalse($roomType->fresh()->is_active);
        $this->assertTrue($roomType->fresh()->early_check_in_enabled);

        // Deleting a Room Type that has physical rooms redirects with status note or blocks deletion without cascade loss.
        $this->actingAs($owner, 'owner')->delete(route('owner.properties.room-types.destroy', [$property, $roomType]))->assertRedirect();
        $this->assertDatabaseHas('property_room_types', ['id' => $roomType->id]);
        $this->assertDatabaseHas('property_rooms', ['id' => $room->id]);
    }

    public function test_owner_room_type_pages_receive_canonical_timing_and_saved_early_check_in_state(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createEditableProperty($owner);
        $roomType = new PropertyRoomType;
        $roomType->forceFill([
            'property_id' => $property->id,
            'name' => 'Early Arrival Shared Room',
            'slug' => 'early-arrival-shared-room',
            'accommodation_mode' => PropertyRoomTypeMode::Shared,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'gender_policy' => PropertyGenderPolicy::AllGenders,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
            'early_check_in_enabled' => true,
            'is_active' => true,
        ])->save();

        $this->actingAs($owner, 'owner')
            ->get(route('owner.properties.room-types.index', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/properties/room-types/index')
                ->where('roomTypes.0.id', $roomType->id)
                ->where('roomTypes.0.early_check_in_enabled', true)
                ->where('timingRules.standard_check_in_time', '09:00')
                ->where('timingRules.standard_check_out_time', '08:00')
                ->where('timingRules.earliest_early_check_in_time', '07:00')
                ->where('timingRules.timezone', 'Asia/Kolkata')
            );
    }
}
