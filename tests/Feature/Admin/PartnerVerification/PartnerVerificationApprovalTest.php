<?php

namespace Tests\Feature\Admin\PartnerVerification;

use App\Enums\AdminRole;
use App\Enums\OwnerEntityType;
use App\Enums\OwnerStatus;
use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerBusinessProfile;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Notifications\Owner\PartnerApplicationApprovedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PartnerVerificationApprovalTest extends TestCase
{
    use RefreshDatabase;

    private function prepareCompleteUnderReviewApp(bool $includeAllRequiredDocs = true): OwnerVerificationApplication
    {
        $owner = Owner::factory()->pendingReview()->create();

        $profile = new OwnerBusinessProfile;
        $profile->fill([
            'entity_type' => OwnerEntityType::Individual->value,
            'display_business_name' => 'Visakha Coastal Stays',
            'primary_contact_name' => $owner->name,
            'business_address_line_1' => 'Beach Road, MVP Colony',
            'city' => 'Visakhapatnam',
            'state' => 'Andhra Pradesh',
            'country_code' => 'IN',
        ]);
        $profile->owner_id = $owner->id;
        $profile->save();

        $vizag = City::query()->where('slug', 'visakhapatnam')->firstOrFail();
        $owner->operatingCities()->attach($vizag->id);

        $app = new OwnerVerificationApplication;
        $app->forceFill([
            'owner_id' => $owner->id,
            'active_owner_id' => $owner->id,
            'application_number' => 'TJV-2026-000401',
            'status' => OwnerVerificationStatus::UnderReview,
            'revision_number' => 1,
            'submitted_at' => now(),
        ])->save();

        $idDoc = new OwnerVerificationDocument;
        $idDoc->forceFill([
            'application_id' => $app->id,
            'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
            'original_filename' => 'id.pdf',
            'storage_path' => "{$owner->id}/{$app->id}/id.pdf",
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'checksum' => hash('sha256', 'id'),
            'status' => OwnerVerificationDocumentStatus::Uploaded,
        ])->save();

        if ($includeAllRequiredDocs) {
            $addrDoc = new OwnerVerificationDocument;
            $addrDoc->forceFill([
                'application_id' => $app->id,
                'document_type' => OwnerVerificationDocumentType::BusinessAddressProof->value,
                'original_filename' => 'address.png',
                'storage_path' => "{$owner->id}/{$app->id}/addr.png",
                'mime_type' => 'image/png',
                'file_size' => 2048,
                'checksum' => hash('sha256', 'addr'),
                'status' => OwnerVerificationDocumentStatus::Uploaded,
            ])->save();
        }

        return $app;
    }

    public function test_incomplete_application_cannot_be_approved_even_by_authorised_admin(): void
    {
        Notification::fake();

        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $app = $this->prepareCompleteUnderReviewApp(includeAllRequiredDocs: false);

        $this->actingAs($admin, 'admin')
            ->from(route('admin.partners.show', $app))
            ->post(route('admin.partners.approve', $app), [
                'decision_reason' => 'Approve anyway',
            ])
            ->assertRedirect(route('admin.partners.show', $app))
            ->assertSessionHasErrors('application');

        $this->assertSame(OwnerVerificationStatus::UnderReview, $app->refresh()->status);
        $this->assertSame(OwnerStatus::PendingReview, $app->owner->refresh()->status);
        Notification::assertNothingSent();
    }

    public function test_authorised_admin_approval_transitions_owner_to_active_records_attribution_and_notifies(): void
    {
        Notification::fake();

        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $app = $this->prepareCompleteUnderReviewApp(includeAllRequiredDocs: true);

        $response = $this->actingAs($admin, 'admin')->post(route('admin.partners.approve', $app), [
            'decision_reason' => 'All operator checks verified.',
            'internal_reviewer_notes' => 'Internal note: verified cleanly.',
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('admin.partners.show', $app));

        $app->refresh();
        $owner = $app->owner->refresh();

        $this->assertSame(OwnerVerificationStatus::Approved, $app->status);
        $this->assertNull($app->active_owner_id);
        $this->assertSame($admin->id, $app->reviewed_by_admin_id);
        $this->assertNotNull($app->reviewed_at);

        $this->assertSame(OwnerStatus::Active, $owner->status);
        $this->assertSame($admin->id, $owner->approved_by_admin_id);
        $this->assertNotNull($owner->approved_at);
        $this->assertTrue($owner->canPublishProperties());

        // Internal reviewer note must NOT be exposed in owner projection
        $this->assertArrayNotHasKey('internal_reviewer_notes', $app->toOwnerArray());

        Notification::assertSentTo($owner, PartnerApplicationApprovedNotification::class);
    }
}
