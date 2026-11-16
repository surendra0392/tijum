<?php

namespace Tests\Feature\Owner\Onboarding;

use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use App\Models\Owner;
use App\Models\OwnerVerificationDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OwnerVerificationDocumentTest extends TestCase
{
    use RefreshDatabase;

    private function fakePdfUpload(string $filename = 'id-proof.pdf'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $filename,
            "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
        );
    }

    public function test_owner_can_upload_pdf_and_image_documents_to_private_disk_without_exposing_storage_path(): void
    {
        Storage::fake('owner_verification');
        $owner = Owner::factory()->pendingReview()->create();

        $pdfResponse = $this->actingAs($owner, 'owner')->post(route('owner.onboarding.documents.store'), [
            'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
            'document' => $this->fakePdfUpload('passport.pdf'),
        ]);
        $pdfResponse->assertSessionHasNoErrors()->assertRedirect(route('owner.onboarding.documents'));

        $pngResponse = $this->actingAs($owner, 'owner')->post(route('owner.onboarding.documents.store'), [
            'document_type' => OwnerVerificationDocumentType::BusinessAddressProof->value,
            'document' => UploadedFile::fake()->image('electricity-bill.png', 600, 400),
        ]);
        $pngResponse->assertSessionHasNoErrors()->assertRedirect(route('owner.onboarding.documents'));

        $docs = OwnerVerificationDocument::query()->get();
        $this->assertCount(2, $docs);

        foreach ($docs as $doc) {
            Storage::disk('owner_verification')->assertExists($doc->storage_path);
            $this->assertNotSame('passport.pdf', basename($doc->storage_path));
            $this->assertNotSame('electricity-bill.png', basename($doc->storage_path));
            $this->assertSame(64, strlen($doc->checksum));
        }

        $this->actingAs($owner, 'owner')
            ->get(route('owner.onboarding.documents'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/onboarding/documents')
                ->where('evaluation.checklist.0.document.original_filename', 'passport.pdf')
                ->missing('evaluation.checklist.0.document.storage_path'),
            );
    }

    public function test_mime_spoofing_svg_and_oversized_uploads_are_rejected(): void
    {
        Storage::fake('owner_verification');
        $owner = Owner::factory()->pendingReview()->create();

        $spoofedSvg = UploadedFile::fake()->createWithContent(
            'malicious.pdf',
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        );

        $this->actingAs($owner, 'owner')
            ->from(route('owner.onboarding.documents'))
            ->post(route('owner.onboarding.documents.store'), [
                'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
                'document' => $spoofedSvg,
            ])
            ->assertSessionHasErrors('document');

        $oversized = UploadedFile::fake()->createWithContent(
            'huge.pdf',
            "%PDF-1.4\n".str_repeat('A', 11 * 1024 * 1024),
        );

        $this->actingAs($owner, 'owner')
            ->from(route('owner.onboarding.documents'))
            ->post(route('owner.onboarding.documents.store'), [
                'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
                'document' => $oversized,
            ])
            ->assertSessionHasErrors('document');

        $this->assertSame(0, OwnerVerificationDocument::query()->count());
        $this->assertSame([], Storage::disk('owner_verification')->allFiles());
    }

    public function test_replacing_document_marks_previous_upload_as_replaced_and_blocks_other_owners(): void
    {
        Storage::fake('owner_verification');
        $owner = Owner::factory()->pendingReview()->create();
        $otherOwner = Owner::factory()->pendingReview()->create();

        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.documents.store'), [
            'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
            'document' => $this->fakePdfUpload('old-id.pdf'),
        ]);

        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.documents.store'), [
            'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
            'document' => $this->fakePdfUpload('new-id.pdf'),
        ]);

        $oldDoc = OwnerVerificationDocument::query()->where('original_filename', 'old-id.pdf')->firstOrFail();
        $newDoc = OwnerVerificationDocument::query()->where('original_filename', 'new-id.pdf')->firstOrFail();

        $this->assertSame(OwnerVerificationDocumentStatus::Replaced, $oldDoc->status);
        $this->assertSame(OwnerVerificationDocumentStatus::Uploaded, $newDoc->status);

        $downloadResponse = $this->actingAs($owner, 'owner')
            ->get(route('owner.onboarding.documents.show', ['document' => $newDoc, 'download' => 1]));
        $downloadResponse->assertOk();
        $downloadResponse->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->actingAs($otherOwner, 'owner')
            ->get(route('owner.onboarding.documents.show', $newDoc))
            ->assertForbidden();

        $this->actingAs($otherOwner, 'owner')
            ->delete(route('owner.onboarding.documents.destroy', $newDoc))
            ->assertForbidden();

        $this->actingAs($owner, 'owner')
            ->delete(route('owner.onboarding.documents.destroy', $newDoc))
            ->assertRedirect(route('owner.onboarding.documents'));

        $this->assertDatabaseMissing('owner_verification_documents', ['id' => $newDoc->id]);
        Storage::disk('owner_verification')->assertMissing($newDoc->storage_path);
    }
}
