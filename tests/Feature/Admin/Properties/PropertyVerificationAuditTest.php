<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Properties;

use App\Enums\AdminRole;
use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use Tests\TestCase;

class PropertyVerificationAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_audit_history_renders_chronological_events_without_exposing_private_storage_paths(): void
    {
        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $owner = Owner::factory()->active()->create();
        $property = Property::factory()->for($owner)->create();

        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-2026-000950',
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
            'storage_path' => 'secret/private-orig.png',
            'optimized_private_path' => 'secret/private-opt.webp',
            'thumbnail_path' => 'secret/private-thumb.webp',
            'mime_type' => 'image/png',
            'file_size' => 1024,
            'width' => 500,
            'height' => 400,
            'alt_text' => 'Secret-safe photo',
            'sort_order' => 1,
            'is_cover' => true,
        ])->save();

        $event = PropertyVerificationEvent::record(
            property: $property,
            application: $app,
            eventType: PropertyVerificationEventType::ApplicationSubmitted,
            actorType: 'owner',
            actorId: $owner->id,
            actorName: $owner->name,
            previousStatus: PropertyVerificationStatus::Draft,
            newStatus: PropertyVerificationStatus::Submitted,
            notes: 'Submitted for verification audit.',
        );

        // Append-only immutability enforcement.
        try {
            $event->forceFill(['notes' => 'Tampered'])->save();
            $this->fail('Expected LogicException when updating PropertyVerificationEvent.');
        } catch (LogicException) {
            $this->addToAssertionCount(1);
        }

        try {
            $event->delete();
            $this->fail('Expected LogicException when deleting PropertyVerificationEvent.');
        } catch (LogicException) {
            $this->addToAssertionCount(1);
        }

        $response = $this->actingAs($admin, 'admin')
            ->get(route('admin.properties.show', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/properties/show')
                ->missing('propertyPhotos.0.storage_path')
                ->missing('propertyPhotos.0.optimized_private_path')
                ->missing('propertyPhotos.0.thumbnail_path')
            );

        $this->assertStringNotContainsString('secret/private-orig.png', (string) $response->getContent());
        $this->assertStringNotContainsString('secret/private-opt.webp', (string) $response->getContent());

        $this->actingAs($admin, 'admin')
            ->get(route('admin.properties.history', $property))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/properties/history')
                ->has('events', 1)
                ->where('events.0.event_label', PropertyVerificationEventType::ApplicationSubmitted->label())
            );
    }
}
