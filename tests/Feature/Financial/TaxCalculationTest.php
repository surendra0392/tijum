<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Models\OwnerFinancialProfile;
use App\Models\TaxConfiguration;
use App\Services\Financial\TaxCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class TaxCalculationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_income_tax_act_2025_section_393_withholding_calculated_at_point_one_percent(): void
    {
        TaxConfiguration::create([
            'code' => 'ITA_2025_SEC_393',
            'name' => 'TDS on E-Commerce Accommodation (ITA 2025)',
            'legal_reference' => 'Income-tax Act, 2025 Section 393(1) Table Sl. No. 8(v)',
            'supplier_type' => 'all',
            'rate_bps' => 10, // 0.10% (10 bps)
            'calculation_base' => 'gross_amount',
            'is_exempt' => false,
            'effective_from' => '2026-04-01',
            'is_approved' => true,
        ]);

        $owner = $this->createActiveOwner();

        // Corporate LLP entity (not individual/proprietor, so threshold does not exempt)
        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Charminar Stays LLP',
            'business_constitution' => 'llp',
            'pan_number' => 'AAAAC1234D',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'bank_beneficiary_name' => 'Charminar Stays',
            'bank_account_number_masked' => '•••• •••• 1111',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'linked_account_status' => LinkedAccountStatus::Active,
        ]);

        $service = app(TaxCalculationService::class);
        $result = $service->evaluateTaxes(
            owner: $owner,
            profile: $profile,
            grossAmountMinor: 10000000, // ₹100,000 (10,000,000 paise)
            date: CarbonImmutable::parse('2026-05-01'),
        );

        $this->assertSame(10, $result['tds_rate_bps']);
        $this->assertSame(10000, $result['tds_amount_minor']); // 0.10% of ₹100,000 = ₹100 (10,000 paise)
    }

    public function test_individual_under_threshold_is_exempt_from_tds(): void
    {
        TaxConfiguration::create([
            'code' => 'ITA_2025_SEC_393',
            'name' => 'TDS on E-Commerce Accommodation (ITA 2025)',
            'legal_reference' => 'Income-tax Act, 2025 Section 393(1) Table Sl. No. 8(v)',
            'supplier_type' => 'all',
            'rate_bps' => 10,
            'calculation_base' => 'gross_amount',
            'is_exempt' => false,
            'effective_from' => '2026-04-01',
            'is_approved' => true,
        ]);

        $owner = $this->createActiveOwner();

        // Individual with verified PAN and turnover under ₹500,000
        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Ramesh Kumar',
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'bank_beneficiary_name' => 'Ramesh Kumar',
            'bank_account_number_masked' => '•••• •••• 2222',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'State Bank of India',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'linked_account_status' => LinkedAccountStatus::Active,
        ]);

        $service = app(TaxCalculationService::class);
        $result = $service->evaluateTaxes(
            owner: $owner,
            profile: $profile,
            grossAmountMinor: 5000000, // ₹50,000 (under ₹5,00,000 threshold)
            date: CarbonImmutable::parse('2026-05-01'),
        );

        $this->assertSame(0, $result['tds_amount_minor']); // Exempt
    }

    public function test_unregistered_partner_classified_under_section_9_5_cgst(): void
    {
        $owner = $this->createActiveOwner();

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Sri Sai PG Homestay',
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'bank_beneficiary_name' => 'Sri Sai PG',
            'bank_account_number_masked' => '•••• •••• 3333',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'State Bank of India',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'linked_account_status' => LinkedAccountStatus::Active,
        ]);

        $service = app(TaxCalculationService::class);
        $result = $service->evaluateTaxes(
            owner: $owner,
            profile: $profile,
            grossAmountMinor: 100000,
            date: CarbonImmutable::now(),
        );

        $this->assertTrue($result['is_section_9_5_applicable']);
        $this->assertSame(0, $result['tcs_amount_minor']); // TCS not applicable when Section 9(5) applies
    }

    public function test_tax_review_required_flagged_for_unverified_pan(): void
    {
        $owner = $this->createActiveOwner();

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Pending Verification Homestay',
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => null, // Not yet verified!
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'bank_beneficiary_name' => 'John Doe',
            'bank_account_number_masked' => '•••• •••• 4444',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'State Bank of India',
            'onboarding_status' => FinancialOnboardingStatus::Submitted,
            'linked_account_status' => LinkedAccountStatus::Uncreated,
        ]);

        $service = app(TaxCalculationService::class);
        $result = $service->evaluateTaxes(
            owner: $owner,
            profile: $profile,
            grossAmountMinor: 100000,
            date: CarbonImmutable::now(),
        );

        $this->assertTrue($result['is_tax_review_required']);
        $this->assertNotNull($result['tax_review_reason']);
    }
}
