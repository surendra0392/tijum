<?php

declare(strict_types=1);

namespace Tests\Feature\Owner\Properties;

use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PropertyManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createPropertyWithApp(
        Owner $owner,
        PropertyVerificationStatus $appStatus = PropertyVerificationStatus::Draft,
        PropertyOperationalStatus $opStatus = PropertyOperationalStatus::Draft,
        bool $approved = false,
    ): array {
        $property = Property::factory()->for($owner)->create([
            'name' => 'Baseline Residency',
            'status' => $opStatus,
            'is_verified' => $approved,
            'booking_eligible' => $approved && $opStatus === PropertyOperationalStatus::Active,
            'approved_at' => $approved ? now() : null,
        ]);

        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $appStatus->isTerminal() ? null : $property->id,
            'application_number' => 'TJPV-'.now()->format('Y').'-'.str_pad((string) $property->id, 6, '0', STR_PAD_LEFT),
            'status' => $appStatus,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
            'approved_snapshot' => $approved ? ['property' => $property->toApprovedPropertyFieldsSnapshot()] : null,
        ])->save();

        if ($approved) {
            $property->forceFill([
                'latest_approved_application_id' => $app->id,
                'approved_snapshot' => ['property' => $property->toApprovedPropertyFieldsSnapshot()],
            ])->save();
        }

        return [$property->fresh(), $app->fresh()];
    }

    public function test_owners_cannot_view_or_mutate_another_owners_property(): void
    {
        $ownerA = Owner::factory()->active()->create();
        $ownerB = Owner::factory()->active()->create();
        [$propertyA] = $this->createPropertyWithApp($ownerA);

        $this->actingAs($ownerB, 'owner')->get(route('owner.properties.show', $propertyA))->assertForbidden();
        $this->actingAs($ownerB, 'owner')->get(route('owner.properties.edit', $propertyA))->assertForbidden();
        $this->actingAs($ownerB, 'owner')->put(route('owner.properties.update', $propertyA), [
            'property_category_id' => $propertyA->property_category_id,
            'city_id' => $propertyA->city_id,
            'name' => 'Hijacked Name',
            'description' => 'Should be forbidden immediately across tenant boundary.',
            'contact_person_name' => 'Attacker',
            'contact_phone' => '+919999999999',
            'address_line_1' => 'Fake Street',
            'locality' => 'Fake',
            'postal_code' => '500001',
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator->value,
        ])->assertForbidden();
        $this->actingAs($ownerB, 'owner')->patch(route('owner.properties.operational-status.update', $propertyA), [
            'status' => PropertyOperationalStatus::TemporarilyClosed->value,
        ])->assertForbidden();
    }

    public function test_submitted_property_blocks_detail_edits_until_returned_for_information(): void
    {
        $owner = Owner::factory()->active()->create();
        [$property] = $this->createPropertyWithApp($owner, PropertyVerificationStatus::Submitted);

        $this->actingAs($owner, 'owner')
            ->put(route('owner.properties.update', $property), [
                'property_category_id' => $property->property_category_id,
                'city_id' => $property->city_id,
                'name' => 'Locked Mutation Attempt',
                'description' => 'Attempted mutation during submitted review state must fail cleanly.',
                'contact_person_name' => 'Owner',
                'contact_phone' => '+919848099887',
                'address_line_1' => 'Plot 1',
                'locality' => 'Madhapur',
                'postal_code' => '500081',
                'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator->value,
            ])
            ->assertForbidden();

        $this->assertSame('Baseline Residency', $property->fresh()->name);
    }

    public function test_approved_property_operational_toggle_is_live_while_amendment_stages_and_cancels_cleanly(): void
    {
        Storage::fake('property_media_private');
        Storage::fake('property_media_public');

        $owner = Owner::factory()->active()->create();
        [$property, $approvedApp] = $this->createPropertyWithApp(
            $owner,
            PropertyVerificationStatus::Approved,
            PropertyOperationalStatus::Active,
            approved: true,
        );

        $rt = new PropertyRoomType;
        $rt->forceFill([
            'property_id' => $property->id,
            'name' => '2 Sharing AC',
            'slug' => '2-sharing-ac',
            'accommodation_mode' => PropertyRoomTypeMode::Shared,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'gender_policy' => 'all_genders',
            'guest_composition_policy' => ['individuals'],
            'early_check_in_enabled' => true,
            'is_active' => true,
            'is_approved_version' => true,
        ])->save();

        // Direct detail edit without amendment must fail.
        $this->actingAs($owner, 'owner')
            ->put(route('owner.properties.update', $property), [
                'property_category_id' => $property->property_category_id,
                'city_id' => $property->city_id,
                'name' => 'Illegal Direct Change',
                'description' => 'Direct edits on approved properties must require starting an amendment.',
                'contact_person_name' => 'Owner',
                'contact_phone' => '+919848099887',
                'address_line_1' => 'Plot 1',
                'locality' => 'Madhapur',
                'postal_code' => '500081',
                'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator->value,
            ])
            ->assertForbidden();

        // Operational toggle Active <-> TemporarilyClosed works immediately without losing verification.
        $this->actingAs($owner, 'owner')
            ->patch(route('owner.properties.operational-status.update', $property), [
                'status' => PropertyOperationalStatus::TemporarilyClosed->value,
            ])
            ->assertRedirect();

        $property->refresh();
        $this->assertSame(PropertyOperationalStatus::TemporarilyClosed, $property->status);
        $this->assertTrue($property->is_verified);
        $this->assertFalse($property->booking_eligible);

        $this->actingAs($owner, 'owner')
            ->patch(route('owner.properties.operational-status.update', $property), [
                'status' => PropertyOperationalStatus::Active->value,
            ])
            ->assertRedirect();

        $this->assertTrue($property->fresh()->booking_eligible);

        // Start Re-Verification Amendment (Revision 2).
        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.amendment.start', $property))
            ->assertRedirect();

        $property->refresh();
        $amendment = $property->activeVerificationApplication()->firstOrFail();
        $this->assertSame(2, $amendment->revision_number);
        $this->assertTrue($amendment->is_amendment);
        $this->assertSame(PropertyVerificationStatus::Draft, $amendment->status);
        $this->assertFalse($property->booking_eligible);

        // Edit property details during Draft amendment stages changes cleanly without touching approved snapshot!
        $cityVizag = City::query()->where('slug', 'visakhapatnam')->firstOrFail();
        $categoryHostel = PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->first()
            ?? PropertyCategory::query()->where('slug', 'independent-hostel')->firstOrFail();

        $this->actingAs($owner, 'owner')
            ->put(route('owner.properties.update', $property), [
                'property_category_id' => $categoryHostel->id,
                'city_id' => $cityVizag->id,
                'name' => 'Proposed Amended Name',
                'description' => 'Staged amendment description that should not overwrite approved baseline yet.',
                'contact_person_name' => 'Amended Contact',
                'contact_phone' => '+919988776655',
                'address_line_1' => 'Beach Road 22',
                'locality' => 'MVP Colony',
                'postal_code' => '530017',
                'ownership_arrangement' => PropertyOwnershipArrangement::AuthorisedManager->value,
            ])
            ->assertRedirect();

        $property->refresh();
        $amendment->refresh();
        $this->assertSame('Baseline Residency', $property->name);
        $this->assertSame('Proposed Amended Name', $amendment->proposed_property_data['name'] ?? null);

        // Also stage a pending amendment room type + physical room so cancel cleans them up!
        $stagedRt = new PropertyRoomType;
        $stagedRt->forceFill([
            'property_id' => $property->id,
            'name' => 'Staged 3 Sharing',
            'slug' => 'staged-3-sharing',
            'accommodation_mode' => PropertyRoomTypeMode::Shared,
            'sharing_capacity' => 3,
            'max_guests_per_room' => 3,
            'is_air_conditioned' => false,
            'gender_policy' => 'female_only',
            'guest_composition_policy' => ['individuals'],
            'early_check_in_enabled' => false,
            'is_active' => true,
            'is_approved_version' => false,
            'amendment_application_id' => $amendment->id,
        ])->save();

        $stagedRoom = new PropertyRoom;
        $stagedRoom->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $stagedRt->id,
            'room_number' => '909-DRAFT',
            'is_approved_version' => false,
            'amendment_application_id' => $amendment->id,
        ])->save();

        // Cancel Amendment discards staged drafts and restores baseline & booking_eligible!
        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.amendment.cancel', $property))
            ->assertRedirect();

        $property->refresh();
        $this->assertSame('Baseline Residency', $property->name);
        $this->assertTrue($property->is_verified);
        $this->assertTrue($property->booking_eligible);
        $this->assertNull($property->activeVerificationApplication()->first());
        $this->assertDatabaseMissing('property_room_types', ['id' => $stagedRt->id]);
        $this->assertDatabaseMissing('property_rooms', ['id' => $stagedRoom->id]);
        $this->assertDatabaseHas('property_room_types', ['id' => $rt->id]);

        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'verification_application_id' => null,
            'event_type' => PropertyVerificationEventType::PropertyOperationalStatusChanged->value,
        ]);
        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'verification_application_id' => $amendment->id,
            'event_type' => PropertyVerificationEventType::AmendmentCancelled->value,
        ]);

        // Withdrawing a submitted amendment discards staged edits and restores booking_eligible cleanly.
        $this->actingAs($owner, 'owner')->post(route('owner.properties.amendment.start', $property))->assertRedirect();
        $secondAmendment = $property->activeVerificationApplication()->firstOrFail();
        $secondAmendment->forceFill(['status' => PropertyVerificationStatus::Submitted, 'submitted_at' => now()])->save();
        $this->assertFalse($property->fresh()->booking_eligible);

        $this->actingAs($owner, 'owner')->post(route('owner.properties.verification.withdraw', $property), [
            'reason' => 'Keeping approved listing unchanged for now.',
        ])->assertRedirect();

        $this->assertTrue($property->fresh()->booking_eligible);
        $this->assertNull($property->fresh()->activeVerificationApplication()->first());
    }
}
