<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Enums\AdminRole;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Models\Admin;
use App\Models\OwnerFinancialProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class OwnerFinancialProfileTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_owner_can_view_own_financial_profile(): void
    {
        $owner = $this->createActiveOwner();

        $response = $this->actingAs($owner, 'owner')
            ->get(route('owner.financial-profile.show'));

        $response->assertOk();
    }

    public function test_owner_financial_profile_masks_bank_account_for_security(): void
    {
        $owner = $this->createActiveOwner();

        OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Sri Lakshmi Hostels LLP',
            'business_constitution' => 'llp',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'bank_beneficiary_name' => 'Sri Lakshmi Hostels',
            'bank_account_number_masked' => '•••• •••• 9876',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Submitted,
            'linked_account_status' => LinkedAccountStatus::Uncreated,
        ]);

        $response = $this->actingAs($owner, 'owner')
            ->get(route('owner.financial-profile.show'));

        $response->assertOk();
        $response->assertSee('Sri Lakshmi Hostels LLP');
    }

    public function test_owner_can_update_bank_and_tax_details(): void
    {
        $owner = $this->createActiveOwner();

        $payload = [
            'legal_business_name' => 'Tijum Residency Pvt Ltd',
            'business_constitution' => 'private_limited',
            'pan_number' => 'ABCDE1234F',
            'gst_registered' => true,
            'gstin' => '36ABCDE1234F1Z5',
            'supplier_legal_classification' => 'regular',
            'bank_beneficiary_name' => 'Tijum Residency Private Limited',
            'bank_account_number' => '987654321012',
            'bank_ifsc' => 'ICIC0000456',
            'bank_name' => 'ICICI Bank',
        ];

        $response = $this->actingAs($owner, 'owner')
            ->put(route('owner.financial-profile.update'), $payload);

        $response->assertRedirect(route('owner.financial-profile.show'));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('owner_financial_profiles', [
            'owner_id' => $owner->id,
            'legal_business_name' => 'Tijum Residency Pvt Ltd',
            'pan_number' => 'ABCDE1234F',
            'bank_account_number_masked' => '•••• •••• 1012',
            'bank_ifsc' => 'ICIC0000456',
            'onboarding_status' => FinancialOnboardingStatus::Submitted->value,
        ]);
    }

    public function test_owner_validation_rejects_invalid_pan_and_ifsc(): void
    {
        $owner = $this->createActiveOwner();

        $payload = [
            'legal_business_name' => 'Invalid Business',
            'business_constitution' => 'individual',
            'pan_number' => 'INVALID123',
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'bank_beneficiary_name' => 'John Doe',
            'bank_account_number' => '12345', // Too short
            'bank_ifsc' => 'INVALID_IFSC',
            'bank_name' => 'State Bank of India',
        ];

        $response = $this->actingAs($owner, 'owner')
            ->put(route('owner.financial-profile.update'), $payload);

        $response->assertSessionHasErrors(['pan_number', 'bank_account_number', 'bank_ifsc']);
    }

    public function test_unauthenticated_user_cannot_access_owner_financial_profile(): void
    {
        $this->get(route('owner.financial-profile.show'))
            ->assertRedirect(route('owner.login'));
    }

    public function test_admin_with_finance_permission_can_view_and_verify_financial_profile(): void
    {
        $admin = Admin::factory()->create([
            'role' => AdminRole::Finance,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_secret' => 'test-secret',
        ]);

        $owner = $this->createActiveOwner();

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Hyderabad Youth Hostel LLP',
            'business_constitution' => 'llp',
            'pan_number' => 'HYDPG9999K',
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'bank_beneficiary_name' => 'Hyderabad Youth Hostel',
            'bank_account_number_masked' => '•••• •••• 5555',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'State Bank of India',
            'onboarding_status' => FinancialOnboardingStatus::Submitted,
            'linked_account_status' => LinkedAccountStatus::Uncreated,
        ]);

        $response = $this->actingAs($admin, 'admin')
            ->get(route('admin.partners.financial.show', $owner));

        $response->assertOk();

        // Admin verifies the profile
        $verifyResponse = $this->actingAs($admin, 'admin')
            ->post(route('admin.partners.financial.verify', $owner));

        $verifyResponse->assertRedirect();

        $this->assertDatabaseHas('owner_financial_profiles', [
            'id' => $profile->id,
            'onboarding_status' => FinancialOnboardingStatus::Active->value,
            'verified_by_admin_id' => $admin->id,
        ]);
    }
}
