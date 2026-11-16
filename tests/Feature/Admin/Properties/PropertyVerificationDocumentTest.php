<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\Properties;

use App\Enums\AdminRole;
use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationDocumentType;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PropertyVerificationDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_authorised_verification_admin_can_preview_and_download_with_audit_logs_while_other_roles_are_forbidden(): void
    {
        Storage::fake('property_verification');

        $verifAdmin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $opsAdmin = Admin::factory()->role(AdminRole::Operations)->withTwoFactor()->create();
        $financeAdmin = Admin::factory()->role(AdminRole::Finance)->withTwoFactor()->create();
        $owner = Owner::factory()->active()->create();
        $otherOwner = Owner::factory()->active()->create();

        $property = Property::factory()->for($owner)->create();
        $app = new PropertyVerificationApplication;
        $app->forceFill([
            'property_id' => $property->id,
            'active_property_id' => $property->id,
            'application_number' => 'TJPV-2026-000901',
            'status' => PropertyVerificationStatus::Submitted,
            'revision_number' => 1,
            'is_amendment' => false,
            'ownership_arrangement' => PropertyOwnershipArrangement::OwnerOperator,
            'submitted_at' => now(),
        ])->save();

        $path = "properties/{$property->id}/{$app->id}/ownership-deed.pdf";
        Storage::disk('property_verification')->put($path, "%PDF-1.4\n%test\n");

        $doc = new PropertyVerificationDocument;
        $doc->forceFill([
            'application_id' => $app->id,
            'document_type' => PropertyVerificationDocumentType::OwnershipOrLeaseProof,
            'original_filename' => 'ownership-deed.pdf',
            'storage_path' => $path,
            'mime_type' => 'application/pdf',
            'file_size' => 16,
            'checksum' => hash('sha256', "%PDF-1.4\n%test\n"),
            'status' => PropertyVerificationDocumentStatus::Uploaded,
        ])->save();

        // Owner download works for owner, forbidden for otherOwner.
        $this->actingAs($owner, 'owner')
            ->get(route('owner.properties.verification.documents.show', [$property, $doc]))
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->actingAs($otherOwner, 'owner')
            ->get(route('owner.properties.verification.documents.show', [$property, $doc]))
            ->assertForbidden();

        // Operations & Finance admins forbidden from private documents.
        $this->actingAs($opsAdmin, 'admin')
            ->get(route('admin.properties.documents.show', $doc))
            ->assertForbidden();
        $this->actingAs($financeAdmin, 'admin')
            ->get(route('admin.properties.documents.show', $doc))
            ->assertForbidden();

        // PropertyVerification admin preview & download succeed and log audit events.
        $this->actingAs($verifAdmin, 'admin')
            ->get(route('admin.properties.documents.show', $doc))
            ->assertOk()
            ->assertHeader('Cache-Control', 'no-store, private');

        $this->actingAs($verifAdmin, 'admin')
            ->get(route('admin.properties.documents.show', ['document' => $doc, 'download' => 1]))
            ->assertOk()
            ->assertDownload('ownership-deed.pdf');

        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'actor_id' => $verifAdmin->id,
            'event_type' => PropertyVerificationEventType::DocumentViewed->value,
        ]);
        $this->assertDatabaseHas(PropertyVerificationEvent::class, [
            'property_id' => $property->id,
            'actor_id' => $verifAdmin->id,
            'event_type' => PropertyVerificationEventType::DocumentDownloaded->value,
        ]);
    }
}
