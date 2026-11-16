<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Properties;

use App\Enums\AdminRole;
use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationDocumentType;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Jobs\PublishApprovedPropertyMediaJob;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use App\Notifications\Owner\PropertyApplicationApprovedNotification;
use App\Services\PropertyMediaProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PropertyVerificationApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function prepareCompleteUnderReviewProperty(bool $approveAllMedia = true): array
    {
        $owner = Owner::factory()->active()->create();
        $property = Property::factory()->for($owner)->create(['name' => 'Kukatpally Pearl PG']);

        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-2026-000701',
            'status' => PropertyVerificationStatus::UnderReview,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
            'declaration_version' => '2026.1',
            'declaration_accepted_at' => now(),
            'submitted_at' => now(),
        ])->save();

        $rt = new PropertyRoomType;
        $rt->forceFill([
            'property_id' => $property->id,
            'name' => '3 Sharing AC',
            'slug' => '3-sharing-ac',
            'accommodation_mode' => PropertyRoomTypeMode::Shared,
            'sharing_capacity' => 3,
            'max_guests_per_room' => 3,
            'is_air_conditioned' => true,
            'gender_policy' => PropertyGenderPolicy::AllGenders,
            'guest_composition_policy' => [PropertyGuestComposition::Individuals->value],
            'early_check_in_enabled' => true,
            'is_active' => true,
        ])->save();

        $room = new PropertyRoom;
        $room->forceFill([
            'property_id' => $property->id,
            'property_room_type_id' => $rt->id,
            'room_number' => '101',
            'operational_status' => PropertyRoomStatus::Active,
        ])->save();

        $processor = app(PropertyMediaProcessor::class);
        $mediaItems = [];

        $configs = [
            ['cat' => PropertyMediaCategory::Exterior, 'cover' => true, 'rt_id' => null, 'room_id' => null],
            ['cat' => PropertyMediaCategory::Dining, 'cover' => false, 'rt_id' => null, 'room_id' => null],
            ['cat' => PropertyMediaCategory::CommonArea, 'cover' => false, 'rt_id' => null, 'room_id' => null],
            ['cat' => PropertyMediaCategory::RoomInterior, 'cover' => false, 'rt_id' => $rt->id, 'room_id' => $room->id],
        ];

        foreach ($configs as $idx => $cfg) {
            $processed = $processor->processPrivateUpload(
                $property->id,
                UploadedFile::fake()->image("img-{$idx}.png", 600, 450),
            );

            $m = new PropertyMedia;
            $m->forceFill([
                'property_id' => $property->id,
                'property_room_type_id' => $cfg['rt_id'],
                'property_room_id' => $cfg['room_id'],
                'property_verification_application_id' => $app->id,
                'media_type' => $cfg['cat'],
                'original_filename' => "img-{$idx}.png",
                ...$processed,
                'alt_text' => "Verified space {$idx}",
                'sort_order' => $idx + 1,
                'is_cover' => $cfg['cover'],
                'moderation_status' => ($approveAllMedia || $idx > 0)
                    ? PropertyMediaModerationStatus::Approved
                    : PropertyMediaModerationStatus::Pending,
            ])->save();

            $mediaItems[] = $m;
        }

        foreach ([PropertyVerificationDocumentType::PropertyAddressProof, PropertyVerificationDocumentType::OwnershipOrLeaseProof] as $docType) {
            $docPath = "{$property->id}/{$app->id}/{$docType->value}.pdf";
            Storage::disk('property_verification')->put($docPath, "%PDF-1.4\n%verified-test\n");

            $doc = new PropertyVerificationDocument;
            $doc->forceFill([
                'application_id' => $app->id,
                'document_type' => $docType,
                'original_filename' => $docType->value.'.pdf',
                'storage_path' => $docPath,
                'mime_type' => 'application/pdf',
                'file_size' => 2048,
                'checksum' => hash('sha256', $docType->value),
                'status' => PropertyVerificationDocumentStatus::Uploaded,
            ])->save();
        }

        return [$owner, $property, $app, $rt, $room, $mediaItems];
    }

    public function test_approval_is_blocked_while_any_uploaded_photo_remains_unmoderated(): void
    {
        Storage::fake('property_media_private');
        Storage::fake('property_media_public');
        Storage::fake('property_verification');

        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        [, $property] = $this->prepareCompleteUnderReviewProperty(approveAllMedia: false);

        $this->actingAs($admin, 'admin')
            ->from(route('admin.properties.show', $property))
            ->post(route('admin.properties.approve', $property), [
                'decision_reason' => 'Premature attempt while cover photo is pending moderation.',
            ])
            ->assertSessionHasErrors('application');

        $this->assertFalse($property->fresh()->is_verified);
        $this->assertSame([], Storage::disk('property_media_public')->allFiles());
    }

    public function test_approval_promotes_property_and_publishes_moderated_webp_assets_from_private_to_public(): void
    {
        Storage::fake('property_media_private');
        Storage::fake('property_media_public');
        Storage::fake('property_verification');
        Notification::fake();

        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        [$owner, $property, $app, $rt, $room, $mediaItems] = $this->prepareCompleteUnderReviewProperty(approveAllMedia: true);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.properties.approve', $property), [
                'decision_reason' => 'All property checks, room setups, and photographs verified.',
            ])
            ->assertRedirect(route('admin.properties.show', $property));

        $property->refresh();
        $app->refresh();

        $this->assertTrue($property->is_verified);
        $this->assertSame(PropertyOperationalStatus::Active, $property->status);
        $this->assertTrue($property->booking_eligible);
        $this->assertNotNull($property->approved_snapshot);
        $this->assertSame(PropertyVerificationStatus::Approved, $app->status);
        $this->assertNull($app->active_property_id);
        $this->assertTrue($rt->fresh()->is_approved_version);
        $this->assertTrue($room->fresh()->is_approved_version);

        foreach ($mediaItems as $mediaItem) {
            $mediaItem->refresh();
            $this->assertSame(PropertyMediaPublicationStatus::Published, $mediaItem->publication_status);
            $this->assertNotNull($mediaItem->public_optimized_path);
            $this->assertNotNull($mediaItem->public_thumbnail_path);
            Storage::disk('property_media_public')->assertExists($mediaItem->public_optimized_path);
            Storage::disk('property_media_public')->assertExists($mediaItem->public_thumbnail_path);
        }

        Notification::assertSentTo($owner, PropertyApplicationApprovedNotification::class);
        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'event_type' => PropertyVerificationEventType::ApplicationApproved->value,
        ]);
        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'event_type' => PropertyVerificationEventType::MediaPublished->value,
        ]);
    }

    public function test_transient_publish_failure_queues_retryable_publish_job_safely(): void
    {
        Storage::fake('property_media_private');
        Storage::fake('property_media_public');
        Storage::fake('property_verification');
        Queue::fake();

        [, $property, , , , $mediaItems] = $this->prepareCompleteUnderReviewProperty(approveAllMedia: true);
        $cover = $mediaItems[0];

        // Remove private derivative bytes temporarily to trigger retryable fallback dispatch.
        Storage::disk('property_media_private')->delete($cover->optimized_private_path);

        app(PropertyMediaProcessor::class)->schedulePublication($cover->id);

        $this->assertSame(PropertyMediaPublicationStatus::Failed, $cover->fresh()->publication_status);
        Queue::assertPushed(PublishApprovedPropertyMediaJob::class, static fn (PublishApprovedPropertyMediaJob $job): bool => $job->mediaId === $cover->id);
    }

    public function test_amendment_approval_promotes_proposed_fields_updates_snapshot_and_unpublishes_removed_photos(): void
    {
        Storage::fake('property_media_private');
        Storage::fake('property_media_public');
        Storage::fake('property_verification');
        Notification::fake();

        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        [$owner, $property, , , , $baselineMedia] = $this->prepareCompleteUnderReviewProperty(approveAllMedia: true);

        // First approve baseline Rev 1 cleanly.
        $this->actingAs($admin, 'admin')->post(route('admin.properties.approve', $property))->assertRedirect();
        $oldMediaToRemove = $baselineMedia[2]; // CommonArea photo #3

        // Owner starts Revision 2 amendment, changes name, uploads 1 replacement photo, flags photo #3 for removal, and submits.
        $this->actingAs($owner, 'owner')->post(route('owner.properties.amendment.start', $property))->assertRedirect();
        $amendment = $property->activeVerificationApplication()->firstOrFail();

        $this->actingAs($owner, 'owner')->put(route('owner.properties.update', $property), [
            'property_category_id' => $property->property_category_id,
            'city_id' => $property->city_id,
            'name' => 'Kukatpally Pearl PG Annex',
            'description' => 'Updated spacious hostel annex with renovated dining floor.',
            'contact_person_name' => $property->contact_person_name,
            'contact_phone' => $property->contact_phone,
            'address_line_1' => $property->address_line_1,
            'locality' => $property->locality,
            'postal_code' => $property->postal_code,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator->value,
        ])->assertRedirect();

        $this->actingAs($owner, 'owner')->post(route('owner.properties.media.store', $property), [
            'image' => UploadedFile::fake()->image('new-common.png', 500, 400),
            'media_type' => PropertyMediaCategory::CommonArea->value,
            'alt_text' => 'Renovated study lounge',
        ])->assertRedirect();

        $this->actingAs($owner, 'owner')->delete(route('owner.properties.media.destroy', [$property, $oldMediaToRemove]))->assertRedirect();
        $this->assertSame($amendment->id, $oldMediaToRemove->fresh()->pending_removal_in_application_id);

        $this->actingAs($owner, 'owner')->post(route('owner.properties.verification.submit', $property), [
            'declaration_accepted' => true,
        ])->assertRedirect();

        // Admin starts review, approves new photo, and approves Revision 2 amendment.
        $this->actingAs($admin, 'admin')->post(route('admin.properties.start-review', $property))->assertRedirect();
        $newPhoto = PropertyMedia::query()->where('property_verification_application_id', $amendment->id)->firstOrFail();
        $this->actingAs($admin, 'admin')->post(route('admin.properties.media.moderate', [$property, $newPhoto]), [
            'moderation_status' => PropertyMediaModerationStatus::Approved->value,
        ])->assertRedirect();

        $this->actingAs($admin, 'admin')->post(route('admin.properties.approve', $property), [
            'decision_reason' => 'Amendment verified cleanly.',
        ])->assertRedirect();

        $property->refresh();
        $this->assertSame('Kukatpally Pearl PG Annex', $property->name);
        $this->assertTrue($property->booking_eligible);
        $this->assertSame(PropertyMediaPublicationStatus::Unpublished, $oldMediaToRemove->fresh()->publication_status);
        $this->assertTrue($oldMediaToRemove->fresh()->is_archived);
        $this->assertSame(PropertyMediaPublicationStatus::Published, $newPhoto->fresh()->publication_status);
    }
}
