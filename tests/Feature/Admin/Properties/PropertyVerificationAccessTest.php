<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Properties;

use App\Enums\AdminRole;
use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationDocumentType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyVerificationAccessTest extends TestCase
{
    use RefreshDatabase;

    private function createSubmittedProperty(): array
    {
        $owner = Owner::factory()->active()->create();
        $property = Property::factory()->for($owner)->create();

        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-2026-000501',
            'status' => PropertyVerificationStatus::Submitted,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
            'submitted_at' => now(),
        ])->save();

        $media = new PropertyMedia;
        $media->forceFill([
            'property_id' => $property->id,
            'property_verification_application_id' => $app->id,
            'media_type' => PropertyMediaCategory::Exterior,
            'original_filename' => 'front.png',
            'storage_path' => "properties/{$property->id}/sample/orig.png",
            'optimized_private_path' => "properties/{$property->id}/sample/opt.webp",
            'thumbnail_path' => "properties/{$property->id}/sample/thumb.webp",
            'mime_type' => 'image/png',
            'file_size' => 2048,
            'width' => 800,
            'height' => 600,
            'alt_text' => 'Front entrance',
            'sort_order' => 1,
            'is_cover' => true,
        ])->save();

        $doc = new PropertyVerificationDocument;
        $doc->forceFill([
            'application_id' => $app->id,
            'document_type' => PropertyVerificationDocumentType::PropertyAddressProof,
            'original_filename' => 'addr.pdf',
            'storage_path' => "{$property->id}/{$app->id}/addr.pdf",
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'checksum' => hash('sha256', 'addr'),
            'status' => PropertyVerificationDocumentStatus::Uploaded,
        ])->save();

        return [$property, $app, $media, $doc];
    }

    public function test_guests_customers_and_owners_cannot_access_admin_property_console(): void
    {
        [$property, , $media, $doc] = $this->createSubmittedProperty();
        $customer = User::factory()->create();
        $owner = Owner::factory()->active()->create();

        $this->get(route('admin.properties.index'))->assertRedirect(route('admin.login'));
        $this->actingAs($customer, 'web')->get(route('admin.properties.index'))->assertRedirect(route('admin.login'));
        $this->actingAs($owner, 'owner')->get(route('admin.properties.index'))->assertRedirect(route('admin.login'));
        $this->actingAs($owner, 'owner')->post(route('admin.properties.approve', $property))->assertRedirect(route('admin.login'));
        $this->actingAs($owner, 'owner')->post(route('admin.properties.media.moderate', [$property, $media]), [
            'moderation_status' => 'approved',
        ])->assertRedirect(route('admin.login'));
        $this->actingAs($owner, 'owner')->get(route('admin.properties.documents.show', $doc))->assertRedirect(route('admin.login'));
    }

    public function test_inactive_or_non_totp_admins_are_blocked_from_property_console(): void
    {
        [$property] = $this->createSubmittedProperty();

        $noTotp = Admin::factory()->role(AdminRole::PropertyVerification)->withoutTwoFactor()->create();
        $this->actingAs($noTotp, 'admin')
            ->get(route('admin.properties.index'))
            ->assertRedirect(route('admin.two-factor.setup'));

        $inactive = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->inactive()->create();
        $this->actingAs($inactive, 'admin')
            ->get(route('admin.properties.show', $property))
            ->assertRedirect(route('admin.login'));
    }

    public function test_role_based_access_matrix_across_all_five_admin_roles(): void
    {
        [$property, , $media, $doc] = $this->createSubmittedProperty();

        $finance = Admin::factory()->role(AdminRole::Finance)->withTwoFactor()->create();
        $support = Admin::factory()->role(AdminRole::CustomerSupport)->withTwoFactor()->create();
        $operations = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();
        $verification = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $superAdmin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();

        foreach ([$finance, $support] as $blockedRole) {
            $this->actingAs($blockedRole, 'admin')->get(route('admin.properties.index'))->assertForbidden();
            $this->actingAs($blockedRole, 'admin')->get(route('admin.properties.show', $property))->assertForbidden();
            $this->actingAs($blockedRole, 'admin')->get(route('admin.properties.documents.show', $doc))->assertForbidden();
        }

        // Operations can inspect queue & view page + update ordinary status, NOT verify/moderate/suspend/view private docs.
        $this->actingAs($operations, 'admin')->get(route('admin.properties.index'))->assertOk();
        $this->actingAs($operations, 'admin')->get(route('admin.properties.show', $property))->assertOk();
        $this->actingAs($operations, 'admin')->post(route('admin.properties.start-review', $property))->assertForbidden();
        $this->actingAs($operations, 'admin')->post(route('admin.properties.media.moderate', [$property, $media]), [
            'moderation_status' => 'approved',
        ])->assertForbidden();
        $this->actingAs($operations, 'admin')->get(route('admin.properties.documents.show', $doc))->assertForbidden();
        $this->actingAs($operations, 'admin')->post(route('admin.properties.operational-status', $property), [
            'status' => PropertyOperationalStatus::Suspended->value,
            'reason' => 'Operations cannot suspend without permission.',
        ])->assertForbidden();

        // Operations can toggle TemporarilyClosed.
        $this->actingAs($operations, 'admin')->post(route('admin.properties.operational-status', $property), [
            'status' => PropertyOperationalStatus::TemporarilyClosed->value,
        ])->assertRedirect();
        $this->assertSame(PropertyOperationalStatus::TemporarilyClosed, $property->fresh()->status);

        // PropertyVerification can inspect, assign, start review, moderate media, and cannot suspend.
        $this->actingAs($verification, 'admin')->get(route('admin.properties.index'))->assertOk();
        $this->actingAs($verification, 'admin')->get(route('admin.properties.show', $property))->assertOk();
        $this->actingAs($verification, 'admin')->post(route('admin.properties.operational-status', $property), [
            'status' => PropertyOperationalStatus::Suspended->value,
            'reason' => 'Verification admin cannot suspend.',
        ])->assertForbidden();
        $this->actingAs($verification, 'admin')->post(route('admin.properties.assign', $property), [
            'assigned_admin_id' => $verification->id,
        ])->assertRedirect();

        // SuperAdmin has full access including suspend.
        $this->actingAs($superAdmin, 'admin')->post(route('admin.properties.operational-status', $property), [
            'status' => PropertyOperationalStatus::Suspended->value,
            'reason' => 'SuperAdmin compliance suspension check passed.',
        ])->assertRedirect();
        $this->assertSame(PropertyOperationalStatus::Suspended, $property->fresh()->status);
    }
}
