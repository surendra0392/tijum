<?php

namespace Tests\Feature\Owner\Onboarding;

use App\Actions\Admin\PartnerVerification\RejectPartnerApplication;
use App\Actions\Admin\PartnerVerification\RequestPartnerInformation;
use App\Actions\Admin\PartnerVerification\StartPartnerReview;
use App\Enums\AdminRole;
use App\Enums\OwnerEntityType;
use App\Enums\OwnerStatus;
use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationDocumentType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OwnerVerificationStatusTest extends TestCase
{
    use RefreshDatabase;

    private function createSubmittedApplication(Owner $owner): OwnerVerificationApplication
    {
        Storage::fake('owner_verification');
        Notification::fake();

        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $this->actingAs($owner, 'owner')->put(route('owner.onboarding.business-profile.update'), [
            'entity_type' => OwnerEntityType::Individual->value,
            'display_business_name' => 'Deccan Hostels',
            'primary_contact_name' => $owner->name,
            'business_address_line_1' => 'Ameerpet Main Road',
            'city' => 'Hyderabad',
            'state' => 'Telangana',
        ]);
        $this->actingAs($owner, 'owner')->put(route('owner.onboarding.cities.update'), [
            'city_ids' => [$city->id],
        ]);
        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.documents.store'), [
            'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
            'document' => UploadedFile::fake()->createWithContent('id.pdf', "%PDF-1.4\n%%EOF\n"),
        ]);
        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.documents.store'), [
            'document_type' => OwnerVerificationDocumentType::BusinessAddressProof->value,
            'document' => UploadedFile::fake()->image('bill.png', 300, 300),
        ]);
        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.submit'), [
            'declaration_accepted' => true,
        ]);

        return OwnerVerificationApplication::query()->where('owner_id', $owner->id)->firstOrFail();
    }

    public function test_owner_can_respond_to_information_request_replace_document_and_resubmit_revision(): void
    {
        $owner = Owner::factory()->pendingReview()->create();
        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $app = $this->createSubmittedApplication($owner);

        $identityDoc = $app->documents()
            ->where('document_type', OwnerVerificationDocumentType::IdentityProof->value)
            ->firstOrFail();

        app(StartPartnerReview::class)->execute($admin, $app);
        app(RequestPartnerInformation::class)->execute($admin, $app->refresh(), [
            'requested_information' => 'Please upload a clearer photo ID.',
            'required_document_types' => [OwnerVerificationDocumentType::IdentityProof->value],
            'document_notes' => [(string) $identityDoc->id => 'Blurry corner text.'],
        ]);

        $this->actingAs($owner, 'owner')
            ->get(route('owner.onboarding.status'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('owner/onboarding/application-status')
                ->where('application.status', OwnerVerificationStatus::NeedsInformation->value)
                ->where('application.requested_information', 'Please upload a clearer photo ID.'),
            );

        // Cannot resubmit before replacing the rejected document
        $this->actingAs($owner, 'owner')
            ->from(route('owner.onboarding.review'))
            ->post(route('owner.onboarding.submit'), ['declaration_accepted' => true])
            ->assertSessionHasErrors('application');

        // Replace rejected identity proof & resubmit
        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.documents.store'), [
            'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
            'document' => UploadedFile::fake()->image('clear-id.jpg', 500, 400),
        ])->assertRedirect(route('owner.onboarding.documents'));

        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.submit'), [
            'declaration_accepted' => true,
            'notes' => 'Uploaded high-resolution image.',
        ])->assertRedirect(route('owner.onboarding.status'));

        $app->refresh();
        $this->assertSame(OwnerVerificationStatus::Submitted, $app->status);
        $this->assertSame(2, $app->revision_number);
        $this->assertSame(OwnerVerificationDocumentStatus::Replaced, $identityDoc->refresh()->status);
        $this->assertSame(2, OwnerVerificationDocument::query()->where('document_type', OwnerVerificationDocumentType::IdentityProof->value)->count());
    }

    public function test_owner_can_withdraw_or_start_new_revision_after_rejection_while_retaining_login(): void
    {
        $owner = Owner::factory()->pendingReview()->create();
        $admin = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();
        $app = $this->createSubmittedApplication($owner);

        app(RejectPartnerApplication::class)->execute(
            $admin,
            $app,
            'Submitted address proof does not correspond to the declared business address.',
        );

        $owner->refresh();
        $this->assertSame(OwnerStatus::PendingReview, $owner->status);
        $this->actingAs($owner, 'owner')->get(route('owner.dashboard'))->assertOk();

        $this->actingAs($owner, 'owner')
            ->post(route('owner.onboarding.start-revision'))
            ->assertRedirect(route('owner.onboarding.index'));

        $latest = $owner->latestVerificationApplication()->firstOrFail();
        $this->assertSame(2, $latest->revision_number);
        $this->assertSame(OwnerVerificationStatus::Draft, $latest->status);
        $this->assertNotSame($app->id, $latest->id);

        $this->actingAs($owner, 'owner')
            ->post(route('owner.onboarding.withdraw'), ['reason' => 'Switching entity details'])
            ->assertRedirect(route('owner.onboarding.status'));

        $latest->refresh();
        $this->assertSame(OwnerVerificationStatus::Withdrawn, $latest->status);
        $this->assertNull($latest->active_owner_id);
    }
}
