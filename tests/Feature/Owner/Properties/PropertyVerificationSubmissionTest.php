<?php

declare(strict_types=1);

namespace Tests\Feature\Owner\Properties;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\PropertyVerificationDocumentType;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use App\Notifications\Owner\PropertyApplicationSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PropertyVerificationSubmissionTest extends TestCase
{
    use RefreshDatabase;

    private function seedMinimumChecklistAssets(Owner $owner, Property $property): void
    {
        $rt = new PropertyRoomType;
        $rt->forceFill([
            'property_id' => $property->id,
            'name' => '2 Sharing AC',
            'slug' => '2-sharing-ac',
            'accommodation_mode' => PropertyRoomTypeMode::Shared,
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
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

        $categories = [
            PropertyMediaCategory::Exterior->value,
            PropertyMediaCategory::Dining->value,
            PropertyMediaCategory::CommonArea->value,
        ];

        foreach ($categories as $idx => $cat) {
            $this->actingAs($owner, 'owner')->post(route('owner.properties.media.store', $property), [
                'image' => UploadedFile::fake()->image("prop-{$idx}.png", 500, 400),
                'media_type' => $cat,
                'alt_text' => "Property photo {$idx}",
                'is_cover' => $idx === 0,
            ]);
        }

        $this->actingAs($owner, 'owner')->post(route('owner.properties.media.store', $property), [
            'image' => UploadedFile::fake()->image('room-101.png', 500, 400),
            'media_type' => PropertyMediaCategory::RoomInterior->value,
            'property_room_type_id' => $rt->id,
            'property_room_id' => $room->id,
            'alt_text' => 'Room interior view',
        ]);

        $pdf = UploadedFile::fake()->createWithContent(
            'proof.pdf',
            "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
        );

        $this->actingAs($owner, 'owner')->post(route('owner.properties.verification.documents.store', $property), [
            'document_type' => PropertyVerificationDocumentType::PropertyAddressProof->value,
            'document' => $pdf,
        ]);

        $this->actingAs($owner, 'owner')->post(route('owner.properties.verification.documents.store', $property), [
            'document_type' => PropertyVerificationDocumentType::OwnershipOrLeaseProof->value,
            'document' => UploadedFile::fake()->image('lease.jpg', 600, 600),
        ]);
    }

    public function test_property_document_types_do_not_collect_personal_kyc_and_reject_spoofed_files(): void
    {
        Storage::fake('property_verification');

        $caseValues = array_map(
            static fn (PropertyVerificationDocumentType $c): string => $c->value,
            PropertyVerificationDocumentType::cases(),
        );
        $this->assertNotContains('aadhaar', $caseValues);
        $this->assertNotContains('pan', $caseValues);
        $this->assertNotContains('gstin', $caseValues);

        $owner = Owner::factory()->active()->create();
        $property = Property::factory()->for($owner)->create();
        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-2026-000010',
            'status' => PropertyVerificationStatus::Draft,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
        ])->save();

        $fakePdf = UploadedFile::fake()->createWithContent('malware.pdf', '<?php echo "evil"; ?>');

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.verification.documents.store', $property), [
                'document_type' => PropertyVerificationDocumentType::PropertyAddressProof->value,
                'document' => $fakePdf,
            ])
            ->assertSessionHasErrors('document');
    }

    public function test_incomplete_property_cannot_be_submitted_and_complete_property_submits_and_withdraws_cleanly(): void
    {
        Storage::fake('property_media_private');
        Storage::fake('property_verification');
        Notification::fake();

        $owner = Owner::factory()->active()->create();
        $property = Property::factory()->for($owner)->create();
        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-2026-000011',
            'status' => PropertyVerificationStatus::Draft,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
        ])->save();

        // Submitting before room types, rooms, photos, and docs fails cleanly.
        $this->actingAs($owner, 'owner')
            ->from(route('owner.properties.verification.show', $property))
            ->post(route('owner.properties.verification.submit', $property), [
                'declaration_accepted' => true,
            ])
            ->assertSessionHasErrors('application');

        $this->seedMinimumChecklistAssets($owner, $property);

        // Must accept declaration checkbox.
        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.verification.submit', $property), [
                'declaration_accepted' => false,
            ])
            ->assertSessionHasErrors('declaration_accepted');

        // Complete submission succeeds cleanly.
        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.verification.submit', $property), [
                'declaration_accepted' => true,
            ])
            ->assertRedirect(route('owner.properties.verification.show', $property));

        $app->refresh();
        $this->assertSame(PropertyVerificationStatus::Submitted, $app->status);
        $this->assertNotNull($app->submitted_at);
        $this->assertSame(config('tijum.property_verification.declaration_version'), $app->declaration_version);

        $doc = PropertyVerificationDocument::query()->where('application_id', $app->id)->firstOrFail();
        Storage::disk('property_verification')->assertExists($doc->storage_path);
        $this->assertNotEmpty($doc->checksum);

        Notification::assertSentTo($owner, PropertyApplicationSubmittedNotification::class);

        // Withdraw transitions cleanly and closes active slot.
        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.verification.withdraw', $property), [
                'reason' => 'Updating floor plan before inspection.',
            ])
            ->assertRedirect();

        $app->refresh();
        $this->assertSame(PropertyVerificationStatus::Withdrawn, $app->status);
        $this->assertNull($app->active_property_id);

        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'event_type' => PropertyVerificationEventType::ApplicationWithdrawn->value,
        ]);
    }
}
