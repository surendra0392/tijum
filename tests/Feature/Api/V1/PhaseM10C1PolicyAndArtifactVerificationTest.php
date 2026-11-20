<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Enums\SupportTicketPriority;
use App\Models\CustomerProtectionCase;
use App\Models\OwnerFinancialProfile;
use App\Models\PropertyAvailabilityBlock;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Financial\TaxCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PhaseM10C1PolicyAndArtifactVerificationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    private function createConfirmedReservation($property, $roomType, $user, int $amountMinor = 500000, string $checkIn = '2026-11-20', string $checkOut = '2026-11-25'): Reservation
    {
        $res = new Reservation;
        $res->forceFill([
            'booking_reference' => 'RES-TEST-'.strtoupper(Str::random(8)),
            'submission_token' => (string) Str::uuid(),
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => ReservationStatus::Confirmed->value,
            'check_in_date' => $checkIn,
            'checkout_date' => $checkOut,
            'duration_type' => 'daily',
            'duration_quantity' => 1,
            'total_stay_days' => 5,
            'quantity' => 1,
            'guest_count' => 1,
            'quantity_basis' => ReservationQuantityBasis::GuestPlaces->value,
            'guest_gender' => 'all',
            'guest_composition' => 'individuals',
            'contact_name' => $user->name,
            'contact_email' => $user->email,
            'contact_phone' => '+919876543210',
            'snapshot_property_name' => $property->name,
            'snapshot_room_type_name' => $roomType->name,
            'currency_code' => 'INR',
            'unit_rate_minor' => $amountMinor,
            'rate_unit' => ReservationRateUnit::PerGuest->value,
            'total_amount_minor' => $amountMinor,
            'submitted_at' => now(),
        ]);
        $res->save();

        return $res;
    }

    /**
     * Requirement 1: Customer Protection SLA First-Action Targets and Statutory Deadlines.
     * Urgent: 2h, High: 4h, Medium: 24h, Low: 48h.
     * Statutory Acknowledgement: 48h, Statutory Resolution: 30 days.
     */
    public function test_customer_protection_sla_targets_and_statutory_deadlines(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = User::factory()->create();

        $reservation = $this->createConfirmedReservation($property, $roomType, $user);

        $now = CarbonImmutable::parse('2026-11-20 10:00:00');

        // Test all four priorities
        $priorities = [
            [CasePriority::Urgent, 2],
            [CasePriority::High, 4],
            [CasePriority::Standard, 24],
            [CasePriority::Low, 48],
        ];

        foreach ($priorities as [$priority, $expectedHours]) {
            $case = CustomerProtectionCase::create([
                'case_reference' => 'TPC-2026-'.strtoupper(uniqid()),
                'reservation_id' => $reservation->id,
                'user_id' => $user->id,
                'property_id' => $property->id,
                'owner_id' => $owner->id,
                'category' => CaseCategory::FoodNotProvided,
                'status' => CaseStatus::Open,
                'priority' => $priority,
                'description' => "Testing priority {$priority->value} first-action target.",
                'sla_due_at' => $now->addDays(30),
                'created_at' => $now,
            ]);

            // Model accessors
            $this->assertEquals($expectedHours, $case->first_action_target_hours);
            $this->assertEquals($now->addHours($expectedHours)->toIso8601String(), $case->first_action_due_at->toIso8601String());
            $this->assertEquals($now->addHours(48)->toIso8601String(), $case->acknowledgement_due_at->toIso8601String());
            $this->assertEquals($now->addDays(30)->toIso8601String(), $case->resolution_due_at->toIso8601String());

            // API V1 Customer Endpoint
            Sanctum::actingAs($user, ['role:customer']);
            $customerRes = $this->getJson("/api/v1/customer/cases/{$case->case_reference}");
            $customerRes->assertOk();
            $customerRes->assertJsonPath('data.first_action_target_hours', $expectedHours);
            $customerRes->assertJsonPath('data.first_action_due_at', $now->addHours($expectedHours)->toIso8601String());
            $customerRes->assertJsonPath('data.acknowledgement_due_at', $now->addHours(48)->toIso8601String());
            $customerRes->assertJsonPath('data.resolution_due_at', $now->addDays(30)->toIso8601String());

            // API V1 Owner Endpoint
            Sanctum::actingAs($owner, ['role:owner']);
            $ownerRes = $this->getJson("/api/v1/owner/cases/{$case->case_reference}");
            $ownerRes->assertOk();
            $ownerRes->assertJsonPath('data.first_action_target_hours', $expectedHours);
            $ownerRes->assertJsonPath('data.first_action_due_at', $now->addHours($expectedHours)->toIso8601String());
            $ownerRes->assertJsonPath('data.acknowledgement_due_at', $now->addHours(48)->toIso8601String());
            $ownerRes->assertJsonPath('data.resolution_due_at', $now->addDays(30)->toIso8601String());
        }

        // SupportTicketPriority parity verification
        $this->assertEquals(2, SupportTicketPriority::Urgent->defaultSlaHours());
        $this->assertEquals(4, SupportTicketPriority::High->defaultSlaHours());
        $this->assertEquals(24, SupportTicketPriority::Standard->defaultSlaHours());
        $this->assertEquals(48, SupportTicketPriority::Low->defaultSlaHours());
    }

    /**
     * Requirement 2: TDS Under Section 393(1) of Income-tax Act, 2025.
     * Case A: Exempt individual partner (Verified PAN, cumulative FY sales <= 5,00,000).
     */
    public function test_tds_exempt_for_individual_partner_with_verified_pan_under_threshold(): void
    {
        $owner = $this->createActiveOwner(['email' => 'exempt_owner@example.com']);
        $profile = new OwnerFinancialProfile;
        $profile->forceFill([
            'owner_id' => $owner->id,
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'supplier_legal_classification' => 'unregistered',
            'gst_registered' => false,
        ])->save();

        $taxService = app(TaxCalculationService::class);
        $date = CarbonImmutable::parse('2026-11-20 12:00:00');

        // Booking of INR 40,000 (4,000,000 minor)
        $eval = $taxService->evaluateTaxes($owner, $profile, 4000000, $date);

        $this->assertEquals(0, $eval['tds_rate_bps'], 'Exempt individual partner must have 0 bps TDS');
        $this->assertEquals(0, $eval['tds_amount_minor'], 'Exempt individual partner must have 0 TDS amount');
    }

    /**
     * Requirement 2: Case B: Non-exempt individual partner (Verified PAN, cumulative FY sales > 5,00,000).
     */
    public function test_tds_applied_to_individual_when_cumulative_fy_sales_exceed_threshold(): void
    {
        $owner = $this->createActiveOwner(['email' => 'non_exempt_owner@example.com']);
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = User::factory()->create();

        $profile = new OwnerFinancialProfile;
        $profile->forceFill([
            'owner_id' => $owner->id,
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'supplier_legal_classification' => 'unregistered',
            'gst_registered' => false,
        ])->save();

        $date = CarbonImmutable::parse('2026-11-20 12:00:00');

        // Create historical confirmed reservation in same financial year of INR 4,80,000 (48,000,000 paise)
        $this->createConfirmedReservation($property, $roomType, $user, 48000000, '2026-06-01', '2026-06-30');

        $taxService = app(TaxCalculationService::class);

        // New booking of INR 30,000 (3,000,000 paise).
        // Projected cumulative FY sales: 48,000,000 + 3,000,000 = 51,000,000 (> 50,000,000 threshold).
        $eval = $taxService->evaluateTaxes($owner, $profile, 3000000, $date);

        $this->assertEquals(10, $eval['tds_rate_bps'], '0.10% (10 bps) TDS must apply when threshold is exceeded');
        // 0.10% of 30,000 INR = 30 INR = 3000 paise
        $this->assertEquals(3000, $eval['tds_amount_minor'], 'TDS on 3,000,000 paise at 10 bps is 3,000 paise');
    }

    /**
     * Requirement 2: Case C: Non-individual entity (e.g. company/llp).
     * Exemption threshold does NOT apply to non-individuals under Section 393(1).
     */
    public function test_tds_applied_to_non_individual_entity_regardless_of_turnover(): void
    {
        $owner = $this->createActiveOwner(['email' => 'company_owner@example.com']);
        $profile = new OwnerFinancialProfile;
        $profile->forceFill([
            'owner_id' => $owner->id,
            'business_constitution' => 'company',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'supplier_legal_classification' => 'registered',
            'gst_registered' => true,
            'gstin' => '36ABCDE1234F1Z5',
        ])->save();

        $taxService = app(TaxCalculationService::class);
        $date = CarbonImmutable::parse('2026-11-20 12:00:00');

        // Small booking of INR 10,000 (1,000,000 paise)
        $eval = $taxService->evaluateTaxes($owner, $profile, 1000000, $date);

        $this->assertEquals(10, $eval['tds_rate_bps'], 'Companies must be subject to 0.10% TDS without individual threshold');
        $this->assertEquals(1000, $eval['tds_amount_minor'], 'TDS on 1,000,000 paise at 10 bps is 1,000 paise');
    }

    /**
     * Requirement 2: Case D: Missing or unverified PAN.
     */
    public function test_tds_applied_when_pan_is_unverified(): void
    {
        $owner = $this->createActiveOwner(['email' => 'unverified_pan_owner@example.com']);
        $profile = new OwnerFinancialProfile;
        $profile->forceFill([
            'owner_id' => $owner->id,
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => null, // Unverified PAN
            'supplier_legal_classification' => 'unregistered',
            'gst_registered' => false,
        ])->save();

        $taxService = app(TaxCalculationService::class);
        $date = CarbonImmutable::parse('2026-11-20 12:00:00');

        $eval = $taxService->evaluateTaxes($owner, $profile, 1000000, $date);

        $this->assertEquals(10, $eval['tds_rate_bps'], 'Unverified PAN partner must not receive exemption');
        $this->assertEquals(1000, $eval['tds_amount_minor']);
    }

    /**
     * Requirement 2: Case E: Threshold boundary (exactly INR 5,00,000 is exempt; 5,00,001 is taxable).
     */
    public function test_tds_threshold_boundary_evaluation(): void
    {
        $owner = $this->createActiveOwner(['email' => 'boundary_owner@example.com']);
        $profile = new OwnerFinancialProfile;
        $profile->forceFill([
            'owner_id' => $owner->id,
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'supplier_legal_classification' => 'unregistered',
            'gst_registered' => false,
        ])->save();

        $taxService = app(TaxCalculationService::class);
        $date = CarbonImmutable::parse('2026-11-20 12:00:00');

        // Exactly INR 5,00,000 (50,000,000 paise) -> Exempt
        $evalAtLimit = $taxService->evaluateTaxes($owner, $profile, 50000000, $date);
        $this->assertEquals(0, $evalAtLimit['tds_rate_bps']);
        $this->assertEquals(0, $evalAtLimit['tds_amount_minor']);

        // INR 5,00,001 (50,000,100 paise) -> Taxable
        $evalAboveLimit = $taxService->evaluateTaxes($owner, $profile, 50000100, $date);
        $this->assertEquals(10, $evalAboveLimit['tds_rate_bps']);
        $this->assertGreaterThan(0, $evalAboveLimit['tds_amount_minor']);
    }

    /**
     * Requirement 2: Case F: Financial Year Boundary (prior FY sales do not bleed into current FY).
     */
    public function test_financial_year_boundary_isolation(): void
    {
        $owner = $this->createActiveOwner(['email' => 'fy_owner@example.com']);
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = User::factory()->create();

        $profile = new OwnerFinancialProfile;
        $profile->forceFill([
            'owner_id' => $owner->id,
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'supplier_legal_classification' => 'unregistered',
            'gst_registered' => false,
        ])->save();

        // Prior financial year booking: 2025-11-15 (FY 2025-26) with large turnover of INR 10,00,000
        $this->createConfirmedReservation($property, $roomType, $user, 100000000, '2025-11-15', '2025-11-20');

        $taxService = app(TaxCalculationService::class);

        // Current evaluation date: 2026-11-20 (FY 2026-27).
        // Cumulative sales in FY 2026-27 must be 0!
        $currentDate = CarbonImmutable::parse('2026-11-20 12:00:00');
        $cumulativeFy26 = $taxService->getCumulativeFinancialYearSales($owner, $currentDate);
        $this->assertEquals(0, $cumulativeFy26, 'Sales from prior financial year must not count toward FY 2026-27');

        // New booking in FY 2026-27 of INR 1,00,000 must be exempt
        $eval = $taxService->evaluateTaxes($owner, $profile, 10000000, $currentDate);
        $this->assertEquals(0, $eval['tds_rate_bps'], 'First booking in fresh FY under threshold must be exempt');
    }

    /**
     * Requirement 5: Real Inventory Availability Filtering for Date Range.
     * Properties with active availability blocks or no rooms in the date range must be filtered out.
     */
    public function test_property_search_filters_by_real_date_availability(): void
    {
        $owner = $this->createActiveOwner(['email' => 'avail_owner@example.com']);

        // Property A: Fully available
        $propertyA = $this->createBookableProperty($owner);
        $rtA = $this->createBookableRoomType($propertyA);
        $this->createActiveRoom($propertyA, $rtA, 'A-101');

        // Property B: Blocked during search window
        $propertyB = $this->createBookableProperty($owner);
        $rtB = $this->createBookableRoomType($propertyB);
        $this->createActiveRoom($propertyB, $rtB, 'B-101');

        $block = new PropertyAvailabilityBlock;
        $block->forceFill([
            'property_id' => $propertyB->id,
            'property_room_type_id' => null,
            'property_room_id' => null,
            'scope' => PropertyAvailabilityBlockScope::Property->value,
            'block_type' => PropertyAvailabilityBlockType::Maintenance->value,
            'start_date' => '2026-12-01',
            'end_date' => '2026-12-10',
            'status' => PropertyAvailabilityBlockStatus::Active->value,
            'reason' => 'Annual property maintenance',
            'created_by_owner_id' => $owner->id,
        ])->save();

        // Search with overlapping dates: 2026-12-02 to 2026-12-05
        $res = $this->getJson('/api/v1/public/properties?check_in_date=2026-12-02&check_out_date=2026-12-05');
        $res->assertOk();

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertContains($propertyA->id, $ids, 'Property A without blocks must be included');
        $this->assertNotContains($propertyB->id, $ids, 'Property B with active maintenance block must be excluded');
    }
}
