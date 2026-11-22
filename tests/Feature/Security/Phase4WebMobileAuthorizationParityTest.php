<?php

declare(strict_types=1);

namespace Tests\Feature\Security;

use App\Actions\Protection\CreateProtectionCase;
use App\Enums\AdminRole;
use App\Enums\CaseCategory;
use App\Enums\CommissionBaseType;
use App\Enums\CommissionGstType;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\OwnerStatus;
use App\Enums\RelocationSubsidyStatus;
use App\Models\Admin;
use App\Models\City;
use App\Models\CustomerProtectionCaseMessage;
use App\Models\OwnerFinancialProfile;
use App\Models\PlatformRelocationSubsidy;
use App\Models\PropertyCategory;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class Phase4WebMobileAuthorizationParityTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_mobile_customer_login_enforces_two_factor_authentication_when_enabled(): void
    {
        $provider = app(TwoFactorAuthenticationProvider::class);
        $secret = $provider->generateSecretKey();

        $user = User::factory()->create([
            'email' => 'totp.customer@example.test',
            'password' => Hash::make('SecurePass123!'),
            'two_factor_secret' => encrypt($secret),
            'two_factor_recovery_codes' => encrypt(json_encode(['REC-CODE-1111', 'REC-CODE-2222'])),
            'two_factor_confirmed_at' => now(),
        ]);

        // 1. Login without 2FA code must be rejected with 403 TWO_FACTOR_REQUIRED
        $this->postJson('/api/v1/auth/customer/login', [
            'email' => $user->email,
            'password' => 'SecurePass123!',
        ])
            ->assertStatus(403)
            ->assertJsonPath('error_code', 'TWO_FACTOR_REQUIRED');

        // 2. Login with invalid 2FA code must be rejected with 422
        $this->postJson('/api/v1/auth/customer/login', [
            'email' => $user->email,
            'password' => 'SecurePass123!',
            'code' => '000000',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_TWO_FACTOR_CODE');

        // 3. Login with valid recovery code succeeds and consumes the single-use recovery code
        $this->postJson('/api/v1/auth/customer/login', [
            'email' => $user->email,
            'password' => 'SecurePass123!',
            'recovery_code' => 'REC-CODE-1111',
        ])
            ->assertOk()
            ->assertJsonPath('success', true);

        // Reusing the same recovery code must fail with 422
        $this->postJson('/api/v1/auth/customer/login', [
            'email' => $user->email,
            'password' => 'SecurePass123!',
            'recovery_code' => 'REC-CODE-1111',
        ])
            ->assertStatus(422);
    }

    public function test_mobile_customer_and_owner_registration_require_terms_acceptance(): void
    {
        // Customer registration without terms acceptance -> 422
        $this->postJson('/api/v1/auth/customer/register', [
            'name' => 'No Terms Customer',
            'email' => 'noterms.customer@example.test',
            'phone' => '+919876543210',
            'password' => 'SecurePass123!',
            'terms' => false,
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/customer/register', [
            'name' => 'Missing Terms Customer',
            'email' => 'missingterms.customer@example.test',
            'phone' => '+919876543211',
            'password' => 'SecurePass123!',
        ])->assertStatus(422);

        // Customer registration with terms_accepted = true -> 201
        $this->postJson('/api/v1/auth/customer/register', [
            'name' => 'Accepted Terms Customer',
            'email' => 'accepted.customer@example.test',
            'phone' => '+919876543212',
            'password' => 'SecurePass123!',
            'terms_accepted' => true,
        ])->assertCreated();

        // Owner registration without terms acceptance -> 422
        $this->postJson('/api/v1/auth/owner/register', [
            'name' => 'No Terms Host',
            'email' => 'noterms.host@example.test',
            'phone' => '+919876543213',
            'password' => 'SecurePass123!',
            'property_name' => 'Sunrise PG',
            'property_type' => 'hostels-pg',
            'available_for' => 'all_genders',
            'location' => 'Hyderabad',
            'locality' => 'Gachibowli',
            'terms' => false,
        ])->assertStatus(422);
    }

    public function test_password_changes_revoke_other_active_mobile_tokens_for_customer_and_owner(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('OldPass123!'),
        ]);
        $tokenCurrent = $user->createToken('device_1')->plainTextToken;
        $tokenOther = $user->createToken('device_2')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$tokenCurrent)
            ->putJson('/api/v1/customer/password', [
                'current_password' => 'OldPass123!',
                'password' => 'NewPass123!',
                'password_confirmation' => 'NewPass123!',
            ])
            ->assertOk();

        $this->app['auth']->forgetGuards();

        // Secondary device token must be revoked (401)
        $this->withHeader('Authorization', 'Bearer '.$tokenOther)
            ->getJson('/api/v1/customer/profile')
            ->assertUnauthorized();

        // Current device token remains valid
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$tokenCurrent)
            ->getJson('/api/v1/customer/profile')
            ->assertOk();

        // Owner password change via API also revokes other device tokens
        $owner = $this->createActiveOwner(['password' => Hash::make('OwnerOld123!')]);
        $ownerTokenCurrent = $owner->createToken('owner_device_1')->plainTextToken;
        $ownerTokenOther = $owner->createToken('owner_device_2')->plainTextToken;

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$ownerTokenCurrent)
            ->putJson('/api/v1/owner/password', [
                'current_password' => 'OwnerOld123!',
                'password' => 'OwnerNew123!',
                'password_confirmation' => 'OwnerNew123!',
            ])
            ->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$ownerTokenOther)
            ->getJson('/api/v1/owner/dashboard')
            ->assertUnauthorized();
    }

    public function test_unverified_or_non_active_owner_cannot_publish_or_mutate_properties_on_mobile_api(): void
    {
        $pendingOwner = $this->createActiveOwner();
        $pendingOwner->forceFill([
            'status' => OwnerStatus::PendingVerification,
            'email_verified_at' => null,
        ])->save();

        $city = City::query()->active()->first() ?? City::factory()->create(['is_active' => true]);
        $category = PropertyCategory::query()->active()->first() ?? PropertyCategory::factory()->create(['is_active' => true]);
        $token = $pendingOwner->createToken('pending_owner_device')->plainTextToken;

        // Pending/unverified owner can sign in to view onboarding/profile, but cannot create properties (403)
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/owner/properties', [
                'name' => 'Unauthorized Draft Property',
                'category_id' => $category->id,
                'city_id' => $city->id,
                'description' => 'Should be forbidden until email verified and partner active.',
                'contact_person_name' => 'Pending Host',
                'contact_phone' => '9876543210',
                'address_line_1' => 'Street 1',
                'locality' => 'Madhapur',
                'postal_code' => '500081',
            ])
            ->assertForbidden();

        // Suspended owner token is immediately rejected with 403 and revoked
        $pendingOwner->forceFill(['status' => OwnerStatus::Suspended])->save();
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/dashboard')
            ->assertForbidden();
    }

    public function test_internal_admin_case_notes_are_hidden_from_customer_and_owner_mobile_endpoints_and_mobile_case_creation_flags_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();
        $otherCustomer = $this->createCustomerUser();
        $otherOwner = $this->createActiveOwner();

        $reservation = Reservation::factory()->confirmed()->create([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'user_id' => $customer->id,
            'check_in_date' => now()->toDateString(),
            'checkout_date' => now()->addDays(2)->toDateString(),
        ]);

        // Customer files OwnerCancelled grievance via mobile API V1
        $customerToken = $customer->createToken('customer_mobile')->plainTextToken;
        $createRes = $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->postJson('/api/v1/customer/cases', [
                'booking_reference' => $reservation->booking_reference,
                'category' => CaseCategory::OwnerCancelled->value,
                'description' => 'Owner denied check-in upon arrival at the property.',
            ]);

        $createRes->assertCreated();
        $caseReference = (string) $createRes->json('data.case_reference');

        // Parity with web CreateProtectionCase: reservation must be flagged requires_refund_review = true
        $this->assertTrue($reservation->fresh()->requires_refund_review);

        // Add an internal admin note to the case
        $caseId = (int) $createRes->json('data.id');
        CustomerProtectionCaseMessage::create([
            'customer_protection_case_id' => $caseId,
            'sender_type' => 'admin',
            'sender_id' => 1,
            'sender_name' => 'Internal Audit Admin',
            'message' => 'CONFIDENTIAL INTERNAL NOTE: Do not release host payout.',
            'is_internal_note' => true,
        ]);

        // Customer mobile view must NOT expose internal admin note
        $customerCaseView = $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson("/api/v1/customer/cases/{$caseReference}");
        $customerCaseView->assertOk();
        $this->assertStringNotContainsString(
            'CONFIDENTIAL INTERNAL NOTE',
            (string) $customerCaseView->getContent(),
        );

        // Owner mobile view must NOT expose internal admin note
        $this->app['auth']->forgetGuards();
        $ownerToken = $owner->createToken('owner_mobile')->plainTextToken;
        $ownerCaseView = $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->getJson("/api/v1/owner/cases/{$caseReference}");
        $ownerCaseView->assertOk();
        $this->assertStringNotContainsString(
            'CONFIDENTIAL INTERNAL NOTE',
            (string) $ownerCaseView->getContent(),
        );

        // Cross-customer and cross-owner access must be denied (404)
        $this->app['auth']->forgetGuards();
        $otherCustomerToken = $otherCustomer->createToken('other_customer')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$otherCustomerToken)
            ->getJson("/api/v1/customer/cases/{$caseReference}")
            ->assertNotFound();

        $this->app['auth']->forgetGuards();
        $otherOwnerToken = $otherOwner->createToken('other_owner')->plainTextToken;
        $this->withHeader('Authorization', 'Bearer '.$otherOwnerToken)
            ->getJson("/api/v1/owner/cases/{$caseReference}")
            ->assertNotFound();
    }

    public function test_admin_role_boundaries_block_operations_from_finance_mutations_and_support_from_operations_mutations(): void
    {
        $operationsAdmin = Admin::factory()->create([
            'role' => AdminRole::Operations,
            'is_active' => true,
            'two_factor_secret' => 'test-secret',
            'two_factor_confirmed_at' => now(),
        ]);

        $supportAdmin = Admin::factory()->create([
            'role' => AdminRole::CustomerSupport,
            'is_active' => true,
            'two_factor_secret' => 'test-secret',
            'two_factor_confirmed_at' => now(),
        ]);

        $owner = $this->createActiveOwner();
        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Guntur Residency',
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'bank_beneficiary_name' => 'Guntur Residency',
            'bank_account_number_masked' => '•••• 1234',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'SBI',
            'onboarding_status' => FinancialOnboardingStatus::Submitted,
            'linked_account_status' => LinkedAccountStatus::Uncreated,
        ]);

        // 1. Operations admin cannot verify or reject a partner financial profile (Finance-only)
        $this->actingAs($operationsAdmin, 'admin')
            ->post(route('admin.partners.financial.verify', $owner))
            ->assertForbidden();

        $this->actingAs($operationsAdmin, 'admin')
            ->post(route('admin.partners.financial.reject', $owner), ['rejection_reason' => 'Not allowed'])
            ->assertForbidden();

        $this->assertSame(FinancialOnboardingStatus::Submitted, $profile->fresh()->onboarding_status);

        // 2. Operations admin cannot create or activate a commission agreement (Finance-only)
        $this->actingAs($operationsAdmin, 'admin')
            ->post(route('admin.partner-commissions.store'), [
                'owner_id' => $owner->id,
                'commission_rate_bps' => 1000,
                'commission_base_type' => CommissionBaseType::GrossBooking->value,
                'commission_gst_type' => CommissionGstType::Exclusive->value,
                'effective_from' => CarbonImmutable::now()->toDateString(),
            ])
            ->assertForbidden();

        // 3. Operations admin cannot approve a relocation subsidy (Finance-only)
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = $this->createCustomerUser();
        $res1 = Reservation::factory()->confirmed()->create([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'user_id' => $user->id,
        ]);
        $res2 = Reservation::factory()->confirmed()->create([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'user_id' => $user->id,
        ]);
        $subsidy = PlatformRelocationSubsidy::create([
            'subsidy_reference' => 'TRS-2026-TEST001',
            'source_reservation_id' => $res1->id,
            'replacement_reservation_id' => $res2->id,
            'source_amount_minor' => 100000,
            'destination_amount_minor' => 140000,
            'subsidy_amount_minor' => 40000,
            'currency' => 'INR',
            'status' => RelocationSubsidyStatus::PendingApproval,
            'funding_reference' => 'PLATFORM_OPS_SUBSIDY',
        ]);

        $this->actingAs($operationsAdmin, 'admin')
            ->post(route('admin.relocation-subsidies.approve', $subsidy))
            ->assertForbidden();

        // 4. CustomerSupport admin cannot mark check-in or check-out in Admin Operations (Operations-only)
        $this->actingAs($supportAdmin, 'admin')
            ->post(route('admin.operations.check-ins.mark', $res1))
            ->assertForbidden();

        $this->actingAs($supportAdmin, 'admin')
            ->post(route('admin.operations.check-outs.mark', $res1))
            ->assertForbidden();
    }
}
