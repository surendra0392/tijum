<?php

namespace Tests\Feature\Admin\PartnerVerification;

use App\Enums\AdminRole;
use App\Enums\OwnerEntityType;
use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerBusinessProfile;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use App\Notifications\Owner\PartnerApplicationUnderReviewNotification;
use App\Notifications\Owner\PartnerInformationRequestedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PartnerVerificationReviewTest extends TestCase
{
    use RefreshDatabase;

    private function seedApplicationWithDoc(string $ref, string $citySlug, OwnerVerificationStatus $status): OwnerVerificationApplication
    {
        $owner = Owner::factory()->pendingReview()->create();

        $profile = new OwnerBusinessProfile;
        $profile->fill([
            'entity_type' => OwnerEntityType::Individual->value,
            'display_business_name' => "Business {$ref}",
            'primary_contact_name' => $owner->name,
            'business_address_line_1' => 'Main Road',
            'city' => 'Hyderabad',
            'state' => 'Telangana',
            'country_code' => 'IN',
        ]);
        $profile->owner_id = $owner->id;
        $profile->save();

        $city = City::query()->where('slug', $citySlug)->firstOrFail();
        $owner->operatingCities()->attach($city->id);

        $app = new OwnerVerificationApplication;
        $app->forceFill([
            'owner_id' => $owner->id,
            'active_owner_id' => $status->isActive() ? $owner->id : null,
            'application_number' => $ref,
            'status' => $status,
            'revision_number' => 1,
            'submitted_at' => now(),
        ])->save();

        $doc = new OwnerVerificationDocument;
        $doc->forceFill([
            'application_id' => $app->id,
            'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
            'original_filename' => 'id.pdf',
            'storage_path' => "{$owner->id}/{$app->id}/doc-{$ref}.pdf",
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'checksum' => hash('sha256', $ref),
            'status' => OwnerVerificationDocumentStatus::Uploaded,
        ])->save();

        return $app;
    }

    public function test_admin_queue_supports_search_status_city_and_entity_type_filtering(): void
    {
        $verifier = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();

        $this->seedApplicationWithDoc('TJV-2026-000301', 'hyderabad', OwnerVerificationStatus::Submitted);
        $this->seedApplicationWithDoc('TJV-2026-000302', 'guntur', OwnerVerificationStatus::Approved);

        $this->actingAs($verifier, 'admin')
            ->get(route('admin.partners.index', [
                'status' => 'submitted',
                'city' => 'hyderabad',
                'entity_type' => OwnerEntityType::Individual->value,
                'search' => '000301',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/partners/index')
                ->where('stats.total', 2)
                ->where('stats.submitted', 1)
                ->where('stats.approved', 1)
                ->has('applications.data', 1)
                ->where('applications.data.0.application_number', 'TJV-2026-000301'),
            );
    }

    public function test_reviewer_assignment_start_review_and_request_information_workflows(): void
    {
        Notification::fake();

        $superAdmin = Admin::factory()->superAdmin()->withTwoFactor()->create();
        $verifier = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $financeAdmin = Admin::factory()->role(AdminRole::Finance)->withTwoFactor()->create();
        $inactiveVerifier = Admin::factory()->role(AdminRole::PropertyVerification)->inactive()->withTwoFactor()->create();

        $app = $this->seedApplicationWithDoc('TJV-2026-000303', 'vijayawada', OwnerVerificationStatus::Submitted);
        $doc = $app->documents()->firstOrFail();

        // Reject assigning finance or inactive admin
        $this->actingAs($superAdmin, 'admin')
            ->from(route('admin.partners.show', $app))
            ->post(route('admin.partners.assign', $app), ['assigned_admin_id' => $financeAdmin->id])
            ->assertSessionHasErrors('assigned_admin_id');

        $this->actingAs($superAdmin, 'admin')
            ->from(route('admin.partners.show', $app))
            ->post(route('admin.partners.assign', $app), ['assigned_admin_id' => $inactiveVerifier->id])
            ->assertSessionHasErrors('assigned_admin_id');

        // Assign active PropertyVerification reviewer
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.partners.assign', $app), ['assigned_admin_id' => $verifier->id])
            ->assertRedirect(route('admin.partners.show', $app));

        $this->assertSame($verifier->id, $app->refresh()->assigned_admin_id);

        // Start review
        $this->actingAs($verifier, 'admin')
            ->post(route('admin.partners.start-review', $app))
            ->assertRedirect(route('admin.partners.show', $app));

        $this->assertSame(OwnerVerificationStatus::UnderReview, $app->refresh()->status);
        Notification::assertSentTo($app->owner, PartnerApplicationUnderReviewNotification::class);

        // Request additional information & flag doc
        $this->actingAs($verifier, 'admin')
            ->post(route('admin.partners.request-information', $app), [
                'requested_information' => 'Clarify street address and re-upload legible identity document.',
                'required_profile_changes' => ['Correspondence Address'],
                'required_document_types' => [OwnerVerificationDocumentType::IdentityProof->value],
                'document_notes' => [(string) $doc->id => 'Corners clipped in scan.'],
            ])
            ->assertRedirect(route('admin.partners.show', $app));

        $app->refresh();
        $this->assertSame(OwnerVerificationStatus::NeedsInformation, $app->status);
        $this->assertSame(OwnerVerificationDocumentStatus::Rejected, $doc->refresh()->status);
        $this->assertSame('Corners clipped in scan.', $doc->reviewer_note);

        Notification::assertSentTo($app->owner, PartnerInformationRequestedNotification::class);
    }
}
