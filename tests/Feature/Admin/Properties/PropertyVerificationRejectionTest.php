<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Properties;

use App\Enums\AdminRole;
use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Notifications\Owner\PropertyApplicationRejectedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PropertyVerificationRejectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_initial_rejection_keeps_property_unverified_and_allows_starting_next_revision(): void
    {
        Storage::fake('property_media_private');
        Storage::fake('property_media_public');
        Notification::fake();

        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $owner = Owner::factory()->active()->create();
        $property = Property::factory()->for($owner)->create();

        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-2026-000801',
            'status' => PropertyVerificationStatus::UnderReview,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
            'submitted_at' => now(),
        ])->save();

        // Rejection requires at least 10-character reason.
        $this->actingAs($admin, 'admin')
            ->post(route('admin.properties.reject', $property), [
                'decision_reason' => 'Too short',
            ])
            ->assertSessionHasErrors('decision_reason');

        $this->actingAs($admin, 'admin')
            ->post(route('admin.properties.reject', $property), [
                'decision_reason' => 'Lease document address mismatch with physical building plaque.',
            ])
            ->assertRedirect();

        $app->refresh();
        $property->refresh();
        $this->assertSame(PropertyVerificationStatus::Rejected, $app->status);
        $this->assertNull($app->active_property_id);
        $this->assertFalse($property->is_verified);
        $this->assertFalse($property->booking_eligible);

        Notification::assertSentTo($owner, PropertyApplicationRejectedNotification::class);

        // Partner can start Revision 2 from verification page.
        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.verification.start-revision', $property))
            ->assertRedirect();

        $rev2 = $property->activeVerificationApplication()->firstOrFail();
        $this->assertSame(2, $rev2->revision_number);
        $this->assertFalse($rev2->is_amendment);
        $this->assertSame(PropertyVerificationStatus::Draft, $rev2->status);
    }

    public function test_rejecting_amendment_preserves_approved_baseline_and_super_admin_suspension_unpublishes_media(): void
    {
        Storage::fake('property_media_private');
        Storage::fake('property_media_public');
        Notification::fake();

        $verifAdmin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $superAdmin = Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
        $owner = Owner::factory()->active()->create();

        $property = Property::factory()->for($owner)->activeApproved()->create(['name' => 'Verified Pearl Stay']);
        $snapshot = $property->toApprovedPropertyFieldsSnapshot();

        $approvedApp = new PropertyVerificationApplication;
        $approvedApp->forceFill([
            'property_id' => $property->id,
            'active_property_id' => null,
            'application_number' => 'TJPV-2026-000810',
            'status' => PropertyVerificationStatus::Approved,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
            'approved_snapshot' => ['property' => $snapshot],
        ])->save();

        $property->forceFill([
            'latest_approved_application_id' => $approvedApp->id,
            'approved_snapshot' => ['property' => $snapshot],
        ])->save();

        // Published baseline photo exists on public disk.
        Storage::disk('property_media_public')->put("properties/{$property->id}/baseline-opt.webp", 'webp-data');
        Storage::disk('property_media_public')->put("properties/{$property->id}/baseline-thumb.webp", 'thumb-data');
        $baselineMedia = new PropertyMedia;
        $baselineMedia->forceFill([
            'property_id' => $property->id,
            'property_verification_application_id' => $approvedApp->id,
            'media_type' => PropertyMediaCategory::Exterior,
            'original_filename' => 'baseline.png',
            'storage_path' => "properties/{$property->id}/orig.png",
            'optimized_private_path' => "properties/{$property->id}/opt.webp",
            'thumbnail_path' => "properties/{$property->id}/thumb.webp",
            'public_optimized_path' => "properties/{$property->id}/baseline-opt.webp",
            'public_thumbnail_path' => "properties/{$property->id}/baseline-thumb.webp",
            'mime_type' => 'image/png',
            'file_size' => 1024,
            'width' => 600,
            'height' => 450,
            'alt_text' => 'Approved front',
            'sort_order' => 1,
            'is_cover' => true,
            'moderation_status' => PropertyMediaModerationStatus::Approved,
            'publication_status' => PropertyMediaPublicationStatus::Published,
            'published_at' => now(),
        ])->save();

        // Create Revision 2 amendment in UnderReview with proposed renamed title.
        $amendment = new PropertyVerificationApplication;
        $amendment->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-2026-000811',
            'status' => PropertyVerificationStatus::UnderReview,
            'revision_number' => 2,
            'is_amendment' => true,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
            'proposed_property_data' => [
                ...$snapshot,
                'name' => 'Rejected New Name Attempt',
            ],
            'submitted_at' => now(),
        ])->save();
        $property->forceFill(['booking_eligible' => false])->save();

        // Reject amendment -> approved baseline & public media stay intact!
        $this->actingAs($verifAdmin, 'admin')
            ->post(route('admin.properties.reject', $property), [
                'decision_reason' => 'Amended name does not match municipal signage photo.',
            ])
            ->assertRedirect();

        $property->refresh();
        $this->assertSame('Verified Pearl Stay', $property->name);
        $this->assertTrue($property->is_verified);
        $this->assertSame(PropertyMediaPublicationStatus::Published, $baselineMedia->fresh()->publication_status);

        // Partner cancels rejected amendment -> booking_eligible restores to true!
        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.amendment.cancel', $property))
            ->assertRedirect();
        $this->assertTrue($property->fresh()->booking_eligible);

        // SuperAdmin suspends property -> immediately unpublishes public files!
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.properties.operational-status', $property), [
                'status' => PropertyOperationalStatus::Suspended->value,
                'reason' => 'Temporary fire safety compliance hold pending inspection.',
            ])
            ->assertRedirect();

        $property->refresh();
        $this->assertSame(PropertyOperationalStatus::Suspended, $property->status);
        $this->assertFalse($property->booking_eligible);
        $this->assertSame(PropertyMediaPublicationStatus::Unpublished, $baselineMedia->fresh()->publication_status);
        Storage::disk('property_media_public')->assertMissing("properties/{$property->id}/baseline-opt.webp");
        Storage::disk('property_media_public')->assertMissing("properties/{$property->id}/baseline-thumb.webp");

        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'event_type' => PropertyVerificationEventType::MediaUnpublished->value,
        ]);
    }
}
