<?php

namespace Tests\Feature\Admin\PartnerVerification;

use App\Enums\AdminRole;
use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PartnerVerificationDocumentsTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_authorised_admin_roles_can_stream_private_documents_and_access_is_audited(): void
    {
        Storage::fake('owner_verification');

        $owner = Owner::factory()->pendingReview()->create();
        $app = new OwnerVerificationApplication;
        $app->forceFill([
            'owner_id' => $owner->id,
            'active_owner_id' => $owner->id,
            'application_number' => 'TJV-2026-000601',
            'status' => OwnerVerificationStatus::Submitted,
            'revision_number' => 1,
            'submitted_at' => now(),
        ])->save();

        $path = "{$owner->id}/{$app->id}/private-doc.pdf";
        Storage::disk('owner_verification')->put($path, "%PDF-1.4\n%%EOF\n");

        $doc = new OwnerVerificationDocument;
        $doc->forceFill([
            'application_id' => $app->id,
            'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
            'original_filename' => 'operator-id.pdf',
            'storage_path' => $path,
            'mime_type' => 'application/pdf',
            'file_size' => 16,
            'checksum' => hash('sha256', "%PDF-1.4\n%%EOF\n"),
            'status' => OwnerVerificationDocumentStatus::Uploaded,
        ])->save();

        // Finance & Operations & CustomerSupport must be blocked from streaming documents
        foreach ([AdminRole::Finance, AdminRole::CustomerSupport, AdminRole::Operations] as $role) {
            $restrictedAdmin = Admin::factory()->role($role)->withTwoFactor()->create();
            $this->actingAs($restrictedAdmin, 'admin')
                ->get(route('admin.partners.documents.show', $doc))
                ->assertForbidden();
        }

        // Property Verification can stream & view/download triggers audit log
        $verifier = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $viewResponse = $this->actingAs($verifier, 'admin')
            ->get(route('admin.partners.documents.show', $doc));

        $viewResponse->assertOk();
        $viewResponse->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->assertDatabaseHas('owner_verification_events', [
            'verification_application_id' => $app->id,
            'event_type' => OwnerVerificationEventType::DocumentViewed->value,
            'actor_type' => 'admin',
            'actor_id' => $verifier->id,
        ]);

        $downloadResponse = $this->actingAs($verifier, 'admin')
            ->get(route('admin.partners.documents.show', ['document' => $doc, 'download' => 1]));
        $downloadResponse->assertOk();

        $this->assertDatabaseHas('owner_verification_events', [
            'verification_application_id' => $app->id,
            'event_type' => OwnerVerificationEventType::DocumentDownloaded->value,
            'actor_type' => 'admin',
            'actor_id' => $verifier->id,
        ]);
    }
}
