<?php

declare(strict_types=1);

namespace Tests\Feature\Owner\Properties;

use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationApplication;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PropertyMediaTest extends TestCase
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

    public function test_image_upload_strips_metadata_and_stores_private_derivatives_only_prior_to_approval(): void
    {
        Storage::fake('property_media_private');
        Storage::fake('property_media_public');

        $owner = Owner::factory()->active()->create();
        $otherOwner = Owner::factory()->active()->create();
        $property = $this->createEditableProperty($owner);

        $image = UploadedFile::fake()->image('front.png', 1800, 1200);

        $this->actingAs($owner, 'owner')->post(route('owner.properties.media.store', $property), [
            'image' => $image,
            'media_type' => PropertyMediaCategory::Exterior->value,
            'alt_text' => 'Front exterior gate view',
            'is_cover' => true,
        ])->assertRedirect(route('owner.properties.media.index', $property));

        $media = PropertyMedia::query()->where('property_id', $property->id)->firstOrFail();

        $this->assertSame(PropertyMediaModerationStatus::Pending, $media->moderation_status);
        $this->assertSame(PropertyMediaPublicationStatus::Private, $media->publication_status);
        $this->assertTrue($media->is_cover);
        $this->assertNull($media->public_optimized_path);

        Storage::disk('property_media_private')->assertExists($media->storage_path);
        Storage::disk('property_media_private')->assertExists($media->optimized_private_path);
        Storage::disk('property_media_private')->assertExists($media->thumbnail_path);
        $this->assertSame([], Storage::disk('property_media_public')->allFiles());

        // Owning partner can stream private WebP preview; another owner gets 403.
        $this->actingAs($owner, 'owner')
            ->get(route('owner.properties.media.preview', [$property, $media]))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/webp');

        $this->actingAs($otherOwner, 'owner')
            ->get(route('owner.properties.media.preview', [$property, $media]))
            ->assertForbidden();
    }

    public function test_svg_and_spoofed_executables_are_rejected_even_with_jpg_extension(): void
    {
        Storage::fake('property_media_private');

        $owner = Owner::factory()->active()->create();
        $property = $this->createEditableProperty($owner);

        $svgSpoof = UploadedFile::fake()->createWithContent(
            'evil.jpg',
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        );

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.media.store', $property), [
                'image' => $svgSpoof,
                'media_type' => PropertyMediaCategory::Exterior->value,
                'alt_text' => 'Malicious SVG payload',
            ])
            ->assertSessionHasErrors('image');

        $realSvg = UploadedFile::fake()->createWithContent(
            'vector.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>',
        );

        $this->actingAs($owner, 'owner')
            ->post(route('owner.properties.media.store', $property), [
                'image' => $realSvg,
                'media_type' => PropertyMediaCategory::Exterior->value,
                'alt_text' => 'Vector SVG file',
            ])
            ->assertSessionHasErrors('image');

        $this->assertSame(0, PropertyMedia::query()->where('property_id', $property->id)->count());
    }

    public function test_owner_can_reorder_update_cover_and_delete_unpublished_photos(): void
    {
        Storage::fake('property_media_private');

        $owner = Owner::factory()->active()->create();
        $property = $this->createEditableProperty($owner);

        $this->actingAs($owner, 'owner')->post(route('owner.properties.media.store', $property), [
            'image' => UploadedFile::fake()->image('one.jpg', 400, 300),
            'media_type' => PropertyMediaCategory::Exterior->value,
            'alt_text' => 'Building exterior view',
            'is_cover' => true,
        ]);
        $this->actingAs($owner, 'owner')->post(route('owner.properties.media.store', $property), [
            'image' => UploadedFile::fake()->image('two.png', 400, 300),
            'media_type' => PropertyMediaCategory::Dining->value,
            'alt_text' => 'Dining hall seating',
            'is_cover' => false,
        ]);

        [$first, $second] = PropertyMedia::query()->where('property_id', $property->id)->orderBy('id')->get();

        $this->actingAs($owner, 'owner')->patch(route('owner.properties.media.update', [$property, $second]), [
            'alt_text' => 'Spacious clean dining area',
            'media_type' => PropertyMediaCategory::Dining->value,
            'is_cover' => true,
        ])->assertRedirect();

        $this->assertFalse($first->fresh()->is_cover);
        $this->assertTrue($second->fresh()->is_cover);

        $this->actingAs($owner, 'owner')->patch(route('owner.properties.media.reorder', $property), [
            'media_ids' => [$second->id, $first->id],
        ])->assertRedirect();

        $this->assertSame(1, $second->fresh()->sort_order);
        $this->assertSame(2, $first->fresh()->sort_order);

        $this->actingAs($owner, 'owner')->delete(route('owner.properties.media.destroy', [$property, $first]))->assertRedirect();
        $this->assertDatabaseMissing('property_media', ['id' => $first->id]);
        Storage::disk('property_media_private')->assertMissing($first->optimized_private_path);
    }
}
