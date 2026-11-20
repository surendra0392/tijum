<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\PropertyRoomTypeMode;
use App\Enums\RefundStatus;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationRateUnit;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\OwnerFinancialProfile;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Models\TaxConfiguration;
use App\Models\User;
use App\Services\Financial\TaxCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PhaseM10C2FinancialAndSlaTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    private function createReservationWithDates(
        Property $property,
        PropertyRoomType $roomType,
        User $user,
        int $amountMinor,
        string $checkIn,
        string $checkOut,
        ReservationStatus $status = ReservationStatus::Confirmed,
        ?CarbonImmutable $confirmedAt = null
    ): Reservation {
        $res = new Reservation;
        $res->forceFill([
            'booking_reference' => 'RES-TEST-'.strtoupper(Str::random(8)),
            'submission_token' => (string) Str::uuid(),
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'status' => $status->value,
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
            'submitted_at' => $confirmedAt ?? CarbonImmutable::parse($checkIn),
            'confirmed_at' => $status === ReservationStatus::Confirmed ? ($confirmedAt ?? CarbonImmutable::parse($checkIn)) : null,
            'created_at' => $confirmedAt ?? CarbonImmutable::parse($checkIn),
        ]);
        $res->save();

        return $res;
    }

    /**
     * Requirement 1: Business constitution & HUF support in TaxCalculationService.
     */
    public function test_tds_exempt_for_proprietorship_and_huf_with_verified_pan_under_threshold(): void
    {
        $ownerProp = $this->createActiveOwner(['email' => 'proprietor@example.com']);
        $ownerHuf = $this->createActiveOwner(['email' => 'huf@example.com']);
        $taxService = app(TaxCalculationService::class);
        $date = CarbonImmutable::parse('2026-11-20 12:00:00');

        // Test Proprietorship
        $profileProp = new OwnerFinancialProfile;
        $profileProp->forceFill([
            'owner_id' => $ownerProp->id,
            'business_constitution' => 'proprietorship',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'supplier_legal_classification' => 'unregistered',
            'gst_registered' => false,
        ])->save();

        $evalProp = $taxService->evaluateTaxes($ownerProp, $profileProp, 4000000, $date);
        $this->assertEquals(0, $evalProp['tds_rate_bps']);
        $this->assertEquals(0, $evalProp['tds_amount_minor']);

        // Test HUF (Hindu Undivided Family)
        $profileHuf = new OwnerFinancialProfile;
        $profileHuf->forceFill([
            'owner_id' => $ownerHuf->id,
            'business_constitution' => 'huf',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'supplier_legal_classification' => 'unregistered',
            'gst_registered' => false,
        ])->save();

        $evalHuf = $taxService->evaluateTaxes($ownerHuf, $profileHuf, 4000000, $date);
        $this->assertEquals(0, $evalHuf['tds_rate_bps']);
        $this->assertEquals(0, $evalHuf['tds_amount_minor']);
    }

    /**
     * Requirement 1: TaxConfiguration is_exempt cannot blanket bypass non-individual entities or unverified PANs.
     */
    public function test_tax_config_is_exempt_cannot_bypass_unverified_pan_or_companies_without_ca_approval(): void
    {
        $owner = $this->createActiveOwner(['email' => 'exempt_attempt@example.com']);
        $taxService = app(TaxCalculationService::class);
        $date = CarbonImmutable::parse('2026-11-20 12:00:00');

        // Create TaxConfiguration marked is_exempt = true BUT without CA approval reference
        TaxConfiguration::create([
            'code' => 'ITA_2025_SEC_393',
            'name' => 'Section 393 Withholding',
            'legal_reference' => 'Income-tax Act, 2025 Section 393(1)',
            'rate_bps' => 10,
            'is_exempt' => true,
            'is_approved' => true,
            'ca_approval_reference' => null, // No CA approval reference!
            'effective_from' => '2026-04-01',
        ]);

        // Case A: Unverified PAN partner -> Must NOT be exempt!
        $profileUnverified = new OwnerFinancialProfile;
        $profileUnverified->forceFill([
            'owner_id' => $owner->id,
            'business_constitution' => 'individual',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => null,
            'supplier_legal_classification' => 'unregistered',
        ])->save();

        $evalA = $taxService->evaluateTaxes($owner, $profileUnverified, 1000000, $date);
        $this->assertEquals(10, $evalA['tds_rate_bps'], 'Unverified PAN partner must not receive exemption even if config is_exempt');
        $this->assertEquals(1000, $evalA['tds_amount_minor']);

        // Case B: Company -> Must NOT be exempt through general config without CA reference
        $ownerCompany = $this->createActiveOwner(['email' => 'company@example.com']);
        $profileCompany = new OwnerFinancialProfile;
        $profileCompany->forceFill([
            'owner_id' => $ownerCompany->id,
            'business_constitution' => 'private_limited',
            'pan_number' => 'ABCDE1234F',
            'pan_verified_at' => now(),
            'supplier_legal_classification' => 'registered',
        ])->save();

        $evalB = $taxService->evaluateTaxes($ownerCompany, $profileCompany, 1000000, $date);
        $this->assertEquals(10, $evalB['tds_rate_bps'], 'Company must not receive blanket exemption without CA approval reference');
        $this->assertEquals(1000, $evalB['tds_amount_minor']);

        // Case C: Valid CA approval reference on TaxConfiguration + verified PAN -> exempt
        TaxConfiguration::query()->where('code', 'ITA_2025_SEC_393')->update([
            'ca_approval_reference' => 'CA-CERT-2026-9941',
        ]);

        $evalC = $taxService->evaluateTaxes($ownerCompany, $profileCompany, 1000000, $date);
        $this->assertEquals(0, $evalC['tds_rate_bps'], 'Entity with verified PAN and CA approval reference is exempt');
        $this->assertEquals(0, $evalC['tds_amount_minor']);
    }

    /**
     * Requirement 1: Turnover date basis (confirmed_at vs check_in_date), cancellation exclusion, and refund deduction.
     */
    public function test_turnover_uses_confirmed_at_excludes_cancellations_and_deducts_refunds(): void
    {
        $owner = $this->createActiveOwner(['email' => 'turnover_test@example.com']);
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = User::factory()->create();
        $taxService = app(TaxCalculationService::class);

        // Booking A: Confirmed in March 2026 (FY 2025-26) with stay in May 2026 (FY 2026-27)
        // Amount: INR 4,00,000 (40,000,000 paise).
        // Since confirmed_at is March 2026, it belongs to FY 2025-26!
        $this->createReservationWithDates(
            $property,
            $roomType,
            $user,
            40000000,
            '2026-05-01',
            '2026-05-10',
            ReservationStatus::Confirmed,
            CarbonImmutable::parse('2026-03-25 10:00:00')
        );

        // Booking B: Confirmed in June 2026 (FY 2026-27).
        // Amount: INR 3,00,000 (30,000,000 paise).
        $resB = $this->createReservationWithDates(
            $property,
            $roomType,
            $user,
            30000000,
            '2026-07-01',
            '2026-07-05',
            ReservationStatus::Confirmed,
            CarbonImmutable::parse('2026-06-15 11:00:00')
        );

        // Booking C: Cancelled booking in FY 2026-27 of INR 2,00,000 (20,000,000 paise).
        // Must be EXCLUDED from FY turnover!
        $this->createReservationWithDates(
            $property,
            $roomType,
            $user,
            20000000,
            '2026-08-01',
            '2026-08-05',
            ReservationStatus::Cancelled,
            CarbonImmutable::parse('2026-06-20 12:00:00')
        );

        // Booking D: Confirmed in July 2026 of INR 1,50,000 (15,000,000 paise).
        $this->createReservationWithDates(
            $property,
            $roomType,
            $user,
            15000000,
            '2026-08-10',
            '2026-08-15',
            ReservationStatus::Confirmed,
            CarbonImmutable::parse('2026-07-01 14:00:00')
        );

        // Create a processed refund on Booking B of INR 50,000 (5,000,000 paise)
        $payment = ReservationPayment::forceCreate([
            'reservation_id' => $resB->id,
            'amount_minor' => 30000000,
            'currency' => 'INR',
            'status' => 'captured',
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_123',
            'gateway_payment_id' => 'pay_123',
            'idempotency_key' => (string) Str::uuid(),
        ]);

        $admin = Admin::factory()->create();

        ReservationRefund::forceCreate([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $resB->id,
            'initiated_by_admin_id' => $admin->id,
            'amount_minor' => 5000000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Service guarantee adjustment',
            'idempotency_key' => (string) Str::uuid(),
        ]);

        // Evaluate FY 2026-27 sales as of 2026-11-20:
        // Expected turnover = Booking B (30,000,000) + Booking D (15,000,000) - Processed Refund (5,000,000) = 40,000,000 paise.
        // Booking A is excluded because confirmed_at was in FY 2025-26.
        // Booking C is excluded because status is Cancelled.
        $dateNov = CarbonImmutable::parse('2026-11-20 12:00:00');
        $fySales = $taxService->getCumulativeFinancialYearSales($owner, $dateNov);

        $this->assertEquals(40000000, $fySales, 'Cumulative FY sales must exclude prior FY credit, exclude cancellations, and subtract processed refunds');
    }

    /**
     * Requirement 2: Customer Protection SLA Isolation.
     * sla_due_at cannot override or truncate the statutory 30-day resolution period.
     */
    public function test_customer_protection_sla_isolation_and_no_statutory_truncation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = User::factory()->create();

        $res = $this->createReservationWithDates($property, $roomType, $user, 5000000, '2026-12-01', '2026-12-05');
        $now = CarbonImmutable::parse('2026-11-20 10:00:00');

        // Case with legacy sla_due_at set to 2 hours (first-action operational target)
        $case = CustomerProtectionCase::create([
            'case_reference' => 'TPC-2026-'.strtoupper(uniqid()),
            'reservation_id' => $res->id,
            'user_id' => $user->id,
            'property_id' => $property->id,
            'owner_id' => $owner->id,
            'category' => CaseCategory::FoodNotProvided,
            'status' => CaseStatus::Open,
            'priority' => CasePriority::Urgent,
            'description' => 'Testing statutory resolution isolation.',
            'sla_due_at' => $now->addHours(2), // Legacy first-action SLA stored in sla_due_at
            'created_at' => $now,
        ]);

        // The statutory resolution deadline MUST remain 30 days and NOT be truncated to 2 hours!
        $this->assertEquals($now->addHours(2)->toIso8601String(), $case->first_action_due_at->toIso8601String());
        $this->assertEquals($now->addHours(48)->toIso8601String(), $case->acknowledgement_due_at->toIso8601String());
        $this->assertEquals($now->addDays(30)->toIso8601String(), $case->resolution_due_at->toIso8601String());
    }

    /**
     * Requirement 3: Public Property Date Filtering Strict Validation (422 responses).
     */
    public function test_public_property_date_validation_returns_422_on_invalid_ranges(): void
    {
        // 1. Only check_in provided -> 422
        $res1 = $this->getJson('/api/v1/public/properties?check_in_date=2026-12-01');
        $res1->assertStatus(422);
        $res1->assertJsonPath('error_code', 'VALIDATION_ERROR');

        // 2. Only check_out provided -> 422
        $res2 = $this->getJson('/api/v1/public/properties?check_out_date=2026-12-05');
        $res2->assertStatus(422);
        $res2->assertJsonPath('error_code', 'VALIDATION_ERROR');

        // 3. Invalid date string -> 422
        $res3 = $this->getJson('/api/v1/public/properties?check_in_date=invalid-date&check_out_date=2026-12-05');
        $res3->assertStatus(422);

        // 4. Check-in in the past -> 422
        $res4 = $this->getJson('/api/v1/public/properties?check_in_date=2020-01-01&check_out_date=2020-01-05');
        $res4->assertStatus(422);
        $res4->assertJsonPath('error_code', 'VALIDATION_ERROR');

        // 5. Check-out before check-in -> 422
        $res5 = $this->getJson('/api/v1/public/properties?check_in_date=2026-12-10&check_out_date=2026-12-05');
        $res5->assertStatus(422);
        $res5->assertJsonPath('error_code', 'VALIDATION_ERROR');

        // 6. Check-out equal to check-in -> 422
        $res6 = $this->getJson('/api/v1/public/properties?check_in_date=2026-12-10&check_out_date=2026-12-10');
        $res6->assertStatus(422);
        $res6->assertJsonPath('error_code', 'VALIDATION_ERROR');
    }

    /**
     * Requirement 3: Real Inventory Availability Filtering against Confirmed Bookings and Active Payment Holds.
     */
    public function test_property_search_excludes_properties_with_fully_booked_inventory(): void
    {
        $owner = $this->createActiveOwner(['email' => 'search_avail_test@example.com']);
        $user = User::factory()->create();

        // Property A: 1 room, fully booked by confirmed reservation
        $propertyA = $this->createBookableProperty($owner);
        $rtA = $this->createBookableRoomType($propertyA, mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($propertyA, $rtA, 'A-101');

        $this->createReservationWithDates(
            $propertyA,
            $rtA,
            $user,
            5000000,
            '2026-12-01',
            '2026-12-05',
            ReservationStatus::Confirmed,
            now()
        );

        // Property B: 1 room, fully booked by active 15-minute payment hold
        $propertyB = $this->createBookableProperty($owner);
        $rtB = $this->createBookableRoomType($propertyB, mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($propertyB, $rtB, 'B-101');

        $holdRes = $this->createReservationWithDates(
            $propertyB,
            $rtB,
            $user,
            5000000,
            '2026-12-01',
            '2026-12-05',
            ReservationStatus::AwaitingPayment,
            now()
        );
        $holdRes->update(['payment_deadline_at' => now()->addMinutes(15)]);

        // Property C: 1 room, completely available
        $propertyC = $this->createBookableProperty($owner);
        $rtC = $this->createBookableRoomType($propertyC, mode: PropertyRoomTypeMode::Private, maxGuests: 1);
        $this->createActiveRoom($propertyC, $rtC, 'C-101');

        // Search for 2026-12-02 to 2026-12-04
        $res = $this->getJson('/api/v1/public/properties?check_in_date=2026-12-02&check_out_date=2026-12-04');
        $res->assertOk();

        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertNotContains($propertyA->id, $ids, 'Property A with confirmed booking must be excluded');
        $this->assertNotContains($propertyB->id, $ids, 'Property B with active payment hold must be excluded');
        $this->assertContains($propertyC->id, $ids, 'Property C with available room must be included');
    }
}
