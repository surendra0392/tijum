<?php

namespace Tests\Feature\Owner\Onboarding;

use App\Enums\OwnerEntityType;
use App\Enums\OwnerVerificationDocumentType;
use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use App\Models\City;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Notifications\Owner\PartnerApplicationSubmittedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OwnerVerificationSubmissionTest extends TestCase
{
    use RefreshDatabase;

    private function uploadRequiredIndividualDocs(Owner $owner): void
    {
        $pdf = UploadedFile::fake()->createWithContent(
            'doc.pdf',
            "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
        );

        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.documents.store'), [
            'document_type' => OwnerVerificationDocumentType::IdentityProof->value,
            'document' => $pdf,
        ]);

        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.documents.store'), [
            'document_type' => OwnerVerificationDocumentType::BusinessAddressProof->value,
            'document' => UploadedFile::fake()->image('address.jpg', 300, 300),
        ]);
    }

    public function test_unverified_owner_and_incomplete_applications_cannot_be_submitted(): void
    {
        $unverified = Owner::factory()->unverified()->create();
        $hyderabad = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $this->actingAs($unverified, 'owner')->put(route('owner.onboarding.business-profile.update'), [
            'entity_type' => OwnerEntityType::Individual->value,
            'display_business_name' => 'Test Stay',
            'primary_contact_name' => 'Owner Test',
            'business_address_line_1' => '123 St',
            'city' => 'Hyderabad',
            'state' => 'Telangana',
        ]);
        $this->actingAs($unverified, 'owner')->put(route('owner.onboarding.cities.update'), [
            'city_ids' => [$hyderabad->id],
        ]);

        $this->actingAs($unverified, 'owner')
            ->from(route('owner.onboarding.review'))
            ->post(route('owner.onboarding.submit'), [
                'declaration_accepted' => true,
            ])
            ->assertRedirect(route('owner.onboarding.review'))
            ->assertSessionHasErrors('application');
    }

    public function test_complete_email_verified_owner_can_submit_application_with_reference_and_notification(): void
    {
        Storage::fake('owner_verification');
        Notification::fake();

        $owner = Owner::factory()->pendingReview()->create();
        $guntur = City::query()->where('slug', 'guntur')->firstOrFail();

        $this->actingAs($owner, 'owner')->put(route('owner.onboarding.business-profile.update'), [
            'entity_type' => OwnerEntityType::Individual->value,
            'display_business_name' => 'Guntur Home Stay',
            'primary_contact_name' => $owner->name,
            'business_address_line_1' => 'Brodipet 2nd Line',
            'city' => 'Guntur',
            'state' => 'Andhra Pradesh',
        ]);

        $this->actingAs($owner, 'owner')->put(route('owner.onboarding.cities.update'), [
            'city_ids' => [$guntur->id],
        ]);

        $this->uploadRequiredIndividualDocs($owner);

        $response = $this->actingAs($owner, 'owner')->post(route('owner.onboarding.submit'), [
            'declaration_accepted' => true,
            'notes' => 'Ready for review.',
            'status' => 'approved',
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('owner.onboarding.status'));

        $app = OwnerVerificationApplication::query()->where('owner_id', $owner->id)->firstOrFail();
        $this->assertSame(OwnerVerificationStatus::Submitted, $app->status);
        $this->assertMatchesRegularExpression('/^TJV-\d{4}-\d{6}$/', $app->application_number);
        $this->assertNotNull($app->submitted_at);
        $this->assertNotNull($app->declaration_accepted_at);
        $this->assertSame($owner->id, $app->active_owner_id);

        $this->assertDatabaseHas('owner_verification_events', [
            'verification_application_id' => $app->id,
            'event_type' => OwnerVerificationEventType::ApplicationSubmitted->value,
            'new_status' => OwnerVerificationStatus::Submitted->value,
        ]);

        Notification::assertSentTo($owner, PartnerApplicationSubmittedNotification::class);
    }

    public function test_duplicate_active_submission_is_rejected(): void
    {
        Storage::fake('owner_verification');
        Notification::fake();

        $owner = Owner::factory()->pendingReview()->create();
        $vijayawada = City::query()->where('slug', 'vijayawada')->firstOrFail();

        $this->actingAs($owner, 'owner')->put(route('owner.onboarding.business-profile.update'), [
            'entity_type' => OwnerEntityType::Individual->value,
            'display_business_name' => 'Krishna Comforts',
            'primary_contact_name' => $owner->name,
            'business_address_line_1' => 'Benz Circle',
            'city' => 'Vijayawada',
            'state' => 'Andhra Pradesh',
        ]);
        $this->actingAs($owner, 'owner')->put(route('owner.onboarding.cities.update'), [
            'city_ids' => [$vijayawada->id],
        ]);
        $this->uploadRequiredIndividualDocs($owner);

        $this->actingAs($owner, 'owner')->post(route('owner.onboarding.submit'), [
            'declaration_accepted' => true,
        ])->assertRedirect(route('owner.onboarding.status'));

        $this->actingAs($owner, 'owner')
            ->from(route('owner.onboarding.review'))
            ->post(route('owner.onboarding.submit'), ['declaration_accepted' => true])
            ->assertRedirect(route('owner.onboarding.review'))
            ->assertSessionHasErrors('application');

        $this->assertSame(1, OwnerVerificationApplication::query()->where('owner_id', $owner->id)->count());
    }
}
