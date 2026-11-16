<?php

declare(strict_types=1);

namespace Tests\Feature\Owner\Amenities;

use App\Enums\AmenityApplicabilityScope;
use App\Enums\AmenityAssignmentEventType;
use App\Enums\AmenityAvailability;
use App\Enums\AmenityVerificationStatus;
use App\Models\Amenity;
use App\Models\AmenityCategory;
use App\Models\Owner;
use App\Models\PropertyAmenity;
use App\Models\PropertyRoomTypeAmenity;
use App\Services\PropertyAmenityCustomerData;
use App\Services\PropertyAmenityReadiness;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PropertyTestHelpers;
use Tests\TestCase;

class PropertyAmenityManagementTest extends TestCase
{
    use PropertyTestHelpers;
    use RefreshDatabase;

    public function test_owner_can_view_amenity_workspace_and_catalogue_is_scoped(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);
        $this->createRoomType($property, 'Deluxe AC');

        $category = AmenityCategory::factory()->create(['name' => 'Connectivity', 'is_active' => true]);
        Amenity::factory()->create([
            'amenity_category_id' => $category->id,
            'name' => 'WiFi',
            'applicability_scope' => AmenityApplicabilityScope::Both,
            'is_active' => true,
        ]);

        $this->actingAs($owner, 'owner')
            ->get(route('owner.properties.amenities.index', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/properties/amenities/index')
                ->where('property.id', $property->id)
                ->has('catalogue')
                ->where('canManage', true));
    }

    public function test_owner_cannot_access_another_owners_property_amenities(): void
    {
        $owner = Owner::factory()->active()->create();
        $other = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);

        $this->actingAs($other, 'owner')
            ->get(route('owner.properties.amenities.index', $property))
            ->assertForbidden();
    }

    public function test_owner_can_create_submit_property_and_room_type_amenities_with_audit_events(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);
        $roomType = $this->createRoomType($property, '2 Sharing AC');
        $amenity = Amenity::factory()->create([
            'name' => 'WiFi',
            'applicability_scope' => AmenityApplicabilityScope::Both,
            'is_active' => true,
        ]);

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.amenities.property.store', $property), [
                'amenity_id' => $amenity->id,
                'availability' => AmenityAvailability::Included->value,
                'is_customer_visible' => true,
                'details' => 'Available in common areas.',
            ])
            ->assertRedirect();

        $propertyAssignment = PropertyAmenity::query()->where('property_id', $property->id)->firstOrFail();
        $this->assertSame(AmenityVerificationStatus::Draft, $propertyAssignment->status);
        $this->assertSame(1, $propertyAssignment->revision_number);
        $this->assertTrue($propertyAssignment->is_current);
        $this->assertStringStartsWith('TPA-', $propertyAssignment->assignment_reference);
        $this->assertDatabaseHas('amenity_assignment_events', [
            'assignable_type' => 'property_amenity',
            'assignable_id' => $propertyAssignment->id,
            'event_type' => AmenityAssignmentEventType::Created->value,
            'actor_type' => 'owner',
        ]);

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.amenities.property.submit', [$property, $propertyAssignment]), [
                'declaration_accepted' => true,
            ])
            ->assertRedirect();

        $propertyAssignment->refresh();
        $this->assertSame(AmenityVerificationStatus::Submitted, $propertyAssignment->status);
        $this->assertNotNull($propertyAssignment->submitted_at);
        $this->assertSame('2026.1', $propertyAssignment->declaration_version);
        $this->assertDatabaseHas('amenity_assignment_events', [
            'assignable_type' => 'property_amenity',
            'assignable_id' => $propertyAssignment->id,
            'event_type' => AmenityAssignmentEventType::Submitted->value,
        ]);

        $roomAmenity = Amenity::factory()->create([
            'name' => 'Study Table',
            'applicability_scope' => AmenityApplicabilityScope::RoomType,
            'is_active' => true,
        ]);

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.amenities.room-type.store', $property), [
                'property_room_type_id' => $roomType->id,
                'amenity_id' => $roomAmenity->id,
                'availability' => AmenityAvailability::Included->value,
                'is_customer_visible' => true,
            ])
            ->assertRedirect();

        $roomAssignment = PropertyRoomTypeAmenity::query()->where('property_room_type_id', $roomType->id)->firstOrFail();
        $this->assertDatabaseHas('amenity_assignment_events', [
            'assignable_type' => 'room_type_amenity',
            'assignable_id' => $roomAssignment->id,
            'event_type' => AmenityAssignmentEventType::Created->value,
        ]);
    }

    public function test_submission_requires_declaration_and_approved_property_baseline(): void
    {
        $owner = Owner::factory()->active()->create();
        $draftProperty = $this->createProperty($owner);
        $amenity = Amenity::factory()->create([
            'applicability_scope' => AmenityApplicabilityScope::Property,
            'is_active' => true,
        ]);

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.amenities.property.store', $draftProperty), [
                'amenity_id' => $amenity->id,
                'availability' => AmenityAvailability::Included->value,
                'is_customer_visible' => true,
            ])
            ->assertRedirect();

        $assignment = PropertyAmenity::query()->firstOrFail();

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.amenities.property.submit', [$draftProperty, $assignment]), [])
            ->assertSessionHasErrors('declaration_accepted');

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.amenities.property.submit', [$draftProperty, $assignment]), [
                'declaration_accepted' => true,
            ])
            ->assertSessionHasErrors('amenity');

        $this->assertSame(AmenityVerificationStatus::Draft, $assignment->fresh()->status);
    }

    public function test_readiness_and_customer_data_preserve_scope_and_hide_unapproved_or_internal_data(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);
        $roomType = $this->createRoomType($property, 'Deluxe');

        $propAmenity = Amenity::factory()->create(['name' => 'Power Backup', 'applicability_scope' => AmenityApplicabilityScope::Property, 'is_active' => true, 'is_customer_visible' => true]);
        $roomAmenity = Amenity::factory()->create(['name' => 'Study Desk', 'applicability_scope' => AmenityApplicabilityScope::RoomType, 'is_active' => true, 'is_customer_visible' => true]);
        $draftAmenity = Amenity::factory()->create(['name' => 'Draft Wifi', 'applicability_scope' => AmenityApplicabilityScope::Property, 'is_active' => true]);

        PropertyAmenity::factory()->create(['property_id' => $property->id, 'amenity_id' => $propAmenity->id, 'status' => AmenityVerificationStatus::Approved, 'is_current' => true, 'is_customer_visible' => true, 'details' => '24/7', 'internal_reviewer_notes' => 'secret-note', 'approved_at' => now()]);
        PropertyRoomTypeAmenity::factory()->create(['property_id' => $property->id, 'property_room_type_id' => $roomType->id, 'amenity_id' => $roomAmenity->id, 'status' => AmenityVerificationStatus::Approved, 'is_current' => true, 'is_customer_visible' => true, 'approved_at' => now()]);
        PropertyAmenity::factory()->create(['property_id' => $property->id, 'amenity_id' => $draftAmenity->id, 'status' => AmenityVerificationStatus::Submitted, 'is_current' => true]);

        $readiness = app(PropertyAmenityReadiness::class)->evaluate($property->fresh());
        $this->assertSame(2, $readiness['approved_count']);
        $this->assertSame(1, $readiness['pending_review_count']);

        $payload = app(PropertyAmenityCustomerData::class)->serialize($property->fresh());
        $this->assertNotNull($payload);
        $this->assertCount(1, $payload['property_amenities']);
        $this->assertSame('Power Backup', $payload['property_amenities'][0]['name']);
        $this->assertCount(1, $payload['room_type_amenities']);
        $this->assertSame('Study Desk', $payload['room_type_amenities'][0]['amenities'][0]['name']);
        $json = json_encode($payload, JSON_THROW_ON_ERROR);
        $this->assertStringNotContainsString('Draft Wifi', $json);
        $this->assertStringNotContainsString('secret-note', $json);
    }
}
