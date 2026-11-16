<?php

namespace Tests\Feature\Owner\Onboarding;

use App\Enums\OwnerEntityType;
use App\Enums\OwnerVerificationStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerBusinessProfile;
use App\Models\OwnerVerificationApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OwnerBusinessProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_individual_owner_can_create_and_update_business_profile_without_legal_business_name(): void
    {
        $owner = Owner::factory()->pendingReview()->create();

        $response = $this->actingAs($owner, 'owner')->put(
            route('owner.onboarding.business-profile.update'),
            [
                'entity_type' => OwnerEntityType::Individual->value,
                'legal_business_name' => '',
                'display_business_name' => 'Lakshmi Residency PG',
                'primary_contact_name' => 'Lakshmi Rao',
                'primary_contact_designation' => '',
                'business_email' => 'LAKSHMI@RESIDENCY.IN',
                'business_address_line_1' => 'Plot 14, Madhapur Main Rd',
                'business_address_line_2' => '',
                'locality' => 'Madhapur',
                'postal_code' => '500081',
                'city' => 'Hyderabad',
                'state' => 'Telangana',
                'country_code' => 'in',
                'website_url' => 'https://lakshmipg.example.com',
                'description' => 'Food-inclusive student PG.',
            ],
        );

        $response->assertSessionHasNoErrors()->assertRedirect(route('owner.onboarding.business-profile'));

        $profile = OwnerBusinessProfile::query()->where('owner_id', $owner->id)->firstOrFail();
        $this->assertSame(OwnerEntityType::Individual, $profile->entity_type);
        $this->assertNull($profile->legal_business_name);
        $this->assertSame('Lakshmi Residency PG', $profile->display_business_name);
        $this->assertSame('lakshmi@residency.in', $profile->business_email);
        $this->assertSame('IN', $profile->country_code);
        $this->assertTrue($profile->isComplete());
    }

    public function test_registered_entity_requires_legal_business_name_and_valid_urls_and_postal_codes(): void
    {
        $owner = Owner::factory()->pendingReview()->create();

        $invalidResponse = $this->actingAs($owner, 'owner')
            ->from(route('owner.onboarding.business-profile'))
            ->put(route('owner.onboarding.business-profile.update'), [
                'entity_type' => OwnerEntityType::PrivateLimitedCompany->value,
                'legal_business_name' => '',
                'display_business_name' => 'Tijum Partner Hospitality',
                'primary_contact_name' => 'Arjun Kumar',
                'business_address_line_1' => 'Road No 12, Banjara Hills',
                'postal_code' => '!!',
                'city' => 'Hyderabad',
                'state' => 'Telangana',
                'website_url' => 'javascript:alert(1)',
            ]);

        $invalidResponse
            ->assertRedirect(route('owner.onboarding.business-profile'))
            ->assertSessionHasErrors(['legal_business_name', 'postal_code', 'website_url']);
    }

    public function test_business_profile_cannot_be_modified_while_application_is_under_review(): void
    {
        $owner = Owner::factory()->pendingReview()->create();

        $app = new OwnerVerificationApplication;
        $app->forceFill([
            'owner_id' => $owner->id,
            'active_owner_id' => $owner->id,
            'application_number' => 'TJV-2026-000101',
            'status' => OwnerVerificationStatus::UnderReview,
            'revision_number' => 1,
        ])->save();

        $response = $this->actingAs($owner, 'owner')
            ->from(route('owner.onboarding.business-profile'))
            ->put(route('owner.onboarding.business-profile.update'), [
                'entity_type' => OwnerEntityType::Individual->value,
                'display_business_name' => 'Modified Name',
                'primary_contact_name' => 'Owner One',
                'business_address_line_1' => '123 Main St',
                'city' => 'Guntur',
                'state' => 'Andhra Pradesh',
            ]);

        $response->assertRedirect(route('owner.onboarding.business-profile'))->assertSessionHasErrors('entity_type');
        $this->assertDatabaseMissing('owner_business_profiles', ['owner_id' => $owner->id]);
    }

    public function test_customers_and_admins_cannot_access_owner_business_profile_routes(): void
    {
        $customer = User::factory()->create();
        $admin = Admin::factory()->withTwoFactor()->create();

        $this->actingAs($customer, 'web')
            ->get(route('owner.onboarding.business-profile'))
            ->assertRedirect(route('owner.login'));

        $this->actingAs($customer, 'web')
            ->put(route('owner.onboarding.business-profile.update'), [])
            ->assertRedirect(route('owner.login'));

        $this->actingAs($admin, 'admin')
            ->get(route('owner.onboarding.business-profile'))
            ->assertRedirect(route('owner.login'));
    }
}
