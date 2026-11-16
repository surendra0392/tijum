<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Amenities;

use App\Enums\AdminRole;
use App\Enums\AmenityApplicabilityScope;
use App\Enums\AmenityAssignmentEventType;
use App\Enums\AmenityVerificationStatus;
use App\Models\Admin;
use App\Models\Amenity;
use App\Models\AmenityCategory;
use App\Models\Owner;
use App\Models\PropertyAmenity;
use App\Models\PropertyRoomTypeAmenity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\PropertyTestHelpers;
use Tests\TestCase;

class AmenityVerificationTest extends TestCase
{
    use PropertyTestHelpers;
    use RefreshDatabase;

    public function test_admin_amenity_console_enforces_guard_totp_and_role_matrix(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);
        $amenity = Amenity::factory()->create(['applicability_scope' => AmenityApplicabilityScope::Property, 'is_active' => true]);
        PropertyAmenity::factory()->create([
            'property_id' => $property->id,
            'amenity_id' => $amenity->id,
            'status' => AmenityVerificationStatus::Submitted,
            'is_current' => true,
            'submitted_at' => now(),
        ]);

        $this->get(route('admin.amenities.index'))->assertRedirect(route('admin.login'));
        $this->actingAs($owner, 'owner')->get(route('admin.amenities.index'))->assertRedirect(route('admin.login'));

        $operations = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();
        $this->actingAs($operations, 'admin')->get(route('admin.amenities.index'))->assertOk();

        $noTotp = Admin::factory()->role(AdminRole::PropertyVerification)->withoutTwoFactor()->create();
        $this->actingAs($noTotp, 'admin')->get(route('admin.amenities.index'))->assertRedirect(route('admin.two-factor.setup'));
    }

    public function test_admin_can_review_approve_property_amenity_with_append_only_events(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);
        $amenity = Amenity::factory()->create(['applicability_scope' => AmenityApplicabilityScope::Property, 'is_active' => true]);
        $assignment = PropertyAmenity::factory()->create([
            'property_id' => $property->id,
            'amenity_id' => $amenity->id,
            'status' => AmenityVerificationStatus::Submitted,
            'is_current' => true,
            'submitted_at' => now(),
            'declaration_version' => '2026.1',
            'declaration_accepted_at' => now(),
        ]);

        $reviewer = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();

        $this->actingAs($reviewer, 'admin')->post(route('admin.amenities.property.start-review', $assignment))->assertRedirect();
        $this->assertSame(AmenityVerificationStatus::UnderReview, $assignment->fresh()->status);
        $this->assertDatabaseHas('amenity_assignment_events', ['assignable_type' => 'property_amenity', 'assignable_id' => $assignment->id, 'event_type' => AmenityAssignmentEventType::ReviewStarted->value]);

        $this->actingAs($reviewer, 'admin')->post(route('admin.amenities.property.approve', $assignment), ['decision_reason' => 'Verified.'])->assertRedirect();
        $assignment->refresh();
        $this->assertSame(AmenityVerificationStatus::Approved, $assignment->status);
        $this->assertTrue($assignment->is_current);
        $this->assertNotNull($assignment->approved_at);
        $this->assertDatabaseHas('amenity_assignment_events', ['assignable_type' => 'property_amenity', 'assignable_id' => $assignment->id, 'event_type' => AmenityAssignmentEventType::Approved->value]);
    }

    public function test_request_information_and_reject_workflow_for_room_type_amenity(): void
    {
        $owner = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);
        $roomType = $this->createRoomType($property, 'Dorm');
        $amenity = Amenity::factory()->create(['applicability_scope' => AmenityApplicabilityScope::RoomType, 'is_active' => true]);
        $assignment = PropertyRoomTypeAmenity::factory()->create([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'amenity_id' => $amenity->id,
            'status' => AmenityVerificationStatus::Submitted,
            'is_current' => true,
            'submitted_at' => now(),
        ]);
        $admin = Admin::factory()->superAdmin()->withTwoFactor()->create();

        $this->actingAs($admin, 'admin')
            ->post(route('admin.amenities.room-type.start-review', $assignment))
            ->assertRedirect();
        $this->assertSame(AmenityVerificationStatus::UnderReview, $assignment->fresh()->status);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.amenities.room-type.request-information', $assignment), ['requested_information' => 'Please clarify the amenity details.'])
            ->assertRedirect();
        $this->assertSame(AmenityVerificationStatus::NeedsInformation, $assignment->fresh()->status);

        $assignment->forceFill(['status' => AmenityVerificationStatus::UnderReview])->save();
        $this->actingAs($admin, 'admin')
            ->post(route('admin.amenities.room-type.reject', $assignment), ['decision_reason' => 'Not verifiable from evidence.'])
            ->assertRedirect();
        $this->assertSame(AmenityVerificationStatus::Rejected, $assignment->fresh()->status);
    }

    public function test_admin_can_manage_catalogue_but_cannot_deactivate_referenced_amenity(): void
    {
        $admin = Admin::factory()->superAdmin()->withTwoFactor()->create();
        $category = AmenityCategory::factory()->create(['code' => 'TEST_CAT', 'name' => 'Test Cat', 'slug' => 'test-cat', 'is_active' => true]);

        $this->actingAs($admin, 'admin')->post(route('admin.amenities.items.store'), [
            'amenity_category_id' => $category->id,
            'code' => 'NEW_AMENITY',
            'name' => 'New Amenity',
            'slug' => 'new-amenity',
            'applicability_scope' => AmenityApplicabilityScope::Both->value,
            'is_customer_visible' => true,
            'requires_review' => true,
            'is_active' => true,
        ])->assertRedirect();

        $amenity = Amenity::query()->where('code', 'NEW_AMENITY')->firstOrFail();
        $owner = Owner::factory()->active()->create();
        $property = $this->createApprovedProperty($owner);
        PropertyAmenity::factory()->create(['property_id' => $property->id, 'amenity_id' => $amenity->id, 'status' => AmenityVerificationStatus::Draft]);

        $this->actingAs($admin, 'admin')->patch(route('admin.amenities.items.update', $amenity), [
            'amenity_category_id' => $category->id,
            'code' => 'NEW_AMENITY',
            'name' => 'New Amenity',
            'slug' => 'new-amenity',
            'applicability_scope' => AmenityApplicabilityScope::Both->value,
            'is_customer_visible' => true,
            'requires_review' => true,
            'is_active' => false,
        ])->assertSessionHasErrors('is_active');

        $this->assertTrue($amenity->fresh()->is_active);
    }

    public function test_amenity_queue_renders_for_authorized_admin(): void
    {
        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $this->actingAs($admin, 'admin')
            ->get(route('admin.amenities.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/amenities/index')->has('assignments')->has('categories')->has('amenities')->where('canManageCatalogue', true));
    }
}
