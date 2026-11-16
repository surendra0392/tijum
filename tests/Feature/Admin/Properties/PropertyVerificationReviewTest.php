<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Properties;

use App\Enums\AdminRole;
use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationDocumentType;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyCategory;
use App\Models\PropertyMedia;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use App\Notifications\Owner\PropertyApplicationUnderReviewNotification;
use App\Notifications\Owner\PropertyInformationRequestedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PropertyVerificationReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_queue_supports_search_city_category_and_status_filters(): void
    {
        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $hyderabad = City::query()->where('slug', 'hyderabad')->firstOrFail();
        $guntur = City::query()->where('slug', 'guntur')->firstOrFail();
        $hostel = PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->first()
            ?? PropertyCategory::query()->where('slug', 'independent-hostel')->firstOrFail();
        $homestay = PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOMESTAYS)->first()
            ?? PropertyCategory::query()->where('slug', 'homestay')->firstOrFail();

        $propA = Property::factory()->create([
            'name' => 'Gachibowli Tech Hostel',
            'city_id' => $hyderabad->id,
            'property_category_id' => $hostel->id,
        ]);
        $appA = new PropertyVerificationApplication;
        $appA->forceFill([
            'property_id' => $propA->id,
            'active_property_id' => $propA->id,
            'application_number' => 'TJPV-2026-000611',
            'status' => PropertyVerificationStatus::Submitted,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
            'submitted_at' => now(),
        ])->save();

        $propB = Property::factory()->create([
            'name' => 'Brodipet Courtyard Homestay',
            'city_id' => $guntur->id,
            'property_category_id' => $homestay->id,
        ]);
        $appB = new PropertyVerificationApplication;
        $appB->forceFill([
            'property_id' => $propB->id,
            'active_property_id' => $propB->id,
            'application_number' => 'TJPV-2026-000612',
            'status' => PropertyVerificationStatus::UnderReview,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
            'submitted_at' => now(),
        ])->save();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.properties.index', [
                'city' => 'guntur',
                'category' => 'homestay',
                'verification_status' => PropertyVerificationStatus::UnderReview->value,
                'search' => 'Brodipet',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/properties/index')
                ->has('properties.data', 1)
                ->where('properties.data.0.name', 'Brodipet Courtyard Homestay')
            );
    }

    public function test_admin_property_review_exposes_room_type_early_check_in_and_canonical_timing(): void
    {
        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $owner = Owner::factory()->active()->create();
        $property = Property::factory()->for($owner)->create();
        $roomType = new PropertyRoomType;
        $roomType->forceFill([
            'property_id' => $property->id,
            'name' => 'Early Arrival Room',
            'slug' => 'early-arrival-room',
            'accommodation_mode' => 'shared',
            'sharing_capacity' => 2,
            'max_guests_per_room' => 2,
            'is_air_conditioned' => true,
            'gender_policy' => 'all_genders',
            'guest_composition_policy' => ['individuals'],
            'early_check_in_enabled' => true,
            'is_active' => true,
        ])->save();

        $this->actingAs($admin, 'admin')
            ->get(route('admin.properties.show', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/properties/show')
                ->where('roomTypes.0.id', $roomType->id)
                ->where('roomTypes.0.early_check_in_enabled', true)
                ->where('timingRules.standard_check_in_time', '09:00')
                ->where('timingRules.standard_check_out_time', '08:00')
                ->where('timingRules.earliest_early_check_in_time', '07:00')
                ->where('timingRules.timezone', 'Asia/Kolkata')
            );
    }

    public function test_admin_can_assign_start_review_moderate_photos_and_request_information(): void
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
            'application_number' => 'TJPV-2026-000620',
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
            'media_type' => PropertyMediaCategory::Dining,
            'original_filename' => 'dining.png',
            'storage_path' => "properties/{$property->id}/d/orig.png",
            'optimized_private_path' => "properties/{$property->id}/d/opt.webp",
            'thumbnail_path' => "properties/{$property->id}/d/thumb.webp",
            'mime_type' => 'image/png',
            'file_size' => 1024,
            'width' => 600,
            'height' => 450,
            'alt_text' => 'Dining space',
            'sort_order' => 1,
            'is_cover' => false,
        ])->save();

        $doc = new PropertyVerificationDocument;
        $doc->forceFill([
            'application_id' => $app->id,
            'document_type' => PropertyVerificationDocumentType::PropertyAddressProof,
            'original_filename' => 'bill.pdf',
            'storage_path' => "{$property->id}/{$app->id}/bill.pdf",
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'checksum' => hash('sha256', 'bill'),
            'status' => PropertyVerificationDocumentStatus::Uploaded,
        ])->save();

        // Start review.
        $this->actingAs($admin, 'admin')
            ->post(route('admin.properties.start-review', $property))
            ->assertRedirect();

        $this->assertSame(PropertyVerificationStatus::UnderReview, $app->fresh()->status);
        Notification::assertSentTo($owner, PropertyApplicationUnderReviewNotification::class);

        // Rejecting media without note fails validation.
        $this->actingAs($admin, 'admin')
            ->post(route('admin.properties.media.moderate', [$property, $media]), [
                'moderation_status' => PropertyMediaModerationStatus::Rejected->value,
                'moderation_note' => '',
            ])
            ->assertSessionHasErrors('moderation_note');

        // Approving photo marks moderation_status=Approved while still keeping it PRIVATE until whole property approval!
        $this->actingAs($admin, 'admin')
            ->post(route('admin.properties.media.moderate', [$property, $media]), [
                'moderation_status' => PropertyMediaModerationStatus::Approved->value,
            ])
            ->assertRedirect();

        $media->refresh();
        $this->assertSame(PropertyMediaModerationStatus::Approved, $media->moderation_status);
        $this->assertSame(PropertyMediaPublicationStatus::Private, $media->publication_status);
        $this->assertSame([], Storage::disk('property_media_public')->allFiles());

        // Request information & flag document.
        $this->actingAs($admin, 'admin')
            ->post(route('admin.properties.request-information', $property), [
                'requested_information' => 'Please upload a clearer utility bill showing the complete door number.',
                'internal_reviewer_notes' => 'Street number cropped on bill PDF.',
                'rejected_document_notes' => [
                    $doc->id => 'Door number is cropped at bottom corner.',
                ],
            ])
            ->assertRedirect();

        $app->refresh();
        $doc->refresh();
        $this->assertSame(PropertyVerificationStatus::NeedsInformation, $app->status);
        $this->assertSame(PropertyVerificationDocumentStatus::Rejected, $doc->status);
        $this->assertSame('Door number is cropped at bottom corner.', $doc->reviewer_note);

        Notification::assertSentTo($owner, PropertyInformationRequestedNotification::class);
        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'event_type' => PropertyVerificationEventType::InformationRequested->value,
        ]);
    }
}
