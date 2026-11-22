<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Actions\Financial\ApprovePartnerSettlement;
use App\Actions\Financial\CreatePartnerSettlement;
use App\Actions\Financial\ReleasePartnerSettlement;
use App\Actions\Payments\InitiatePaymentOrder;
use App\Enums\AdminRole;
use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\CommissionAgreementStatus;
use App\Enums\CommissionBaseType;
use App\Enums\CommissionGstType;
use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LedgerEntryCategory;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\CouponCode;
use App\Models\CustomerProtectionCase;
use App\Models\FinancialLedgerEntry;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerCommissionAgreement;
use App\Models\PartnerSettlement;
use App\Models\PromotionalCampaign;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\SettlementCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class SettlementCalculationTest extends TestCase
{
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan('migrate:fresh', ['--force' => true])->assertSuccessful();
    }

    private function createFinanceAdmin(): Admin
    {
        return Admin::factory()->create([
            'role' => AdminRole::Finance,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_secret' => 'test-secret',
        ]);
    }

    private function setupEligibleOwnerAndProfile(): array
    {
        $owner = $this->createActiveOwner();

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Deccan Stays Pvt Ltd',
            'business_constitution' => 'private_limited',
            'pan_number' => 'DECST1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => 'acc_test_route_123',
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => 'Deccan Stays Private Limited',
            'bank_account_number_masked' => '•••• •••• 9999',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        return [$owner, $profile];
    }

    public function test_completed_booking_becomes_eligible_after_hold_period(): void
    {
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // Booking 1: Created with valid check-in, then backdated to simulate checkout 3 days ago
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payloadPast = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payloadPast)->assertRedirect();
        $resPast = Reservation::query()->where('submission_token', $payloadPast['submission_token'])->firstOrFail();

        $resPast->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(3)->toDateString(),
        ])->save();

        ReservationPayment::create([
            'reservation_id' => $resPast->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_past_001',
            'gateway_payment_id' => 'pay_past_001',
            'idempotency_key' => 'idemp_past_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        // Booking 2: Future checkout -> not eligible yet
        $checkInFuture = CarbonImmutable::now('Asia/Kolkata')->addDays(2)->toDateString();
        $payloadFuture = $this->validReservationPayload($property, $roomType, $checkInFuture, durationQuantity: 2);
        $this->submitReservation($user, $payloadFuture)->assertRedirect();
        $resFuture = Reservation::query()->where('submission_token', $payloadFuture['submission_token'])->firstOrFail();

        $resFuture->forceFill([
            'status' => ReservationStatus::Confirmed,
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->addDays(4)->toDateString(),
        ])->save();

        ReservationPayment::create([
            'reservation_id' => $resFuture->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_future_002',
            'gateway_payment_id' => 'pay_future_002',
            'idempotency_key' => 'idemp_future_002',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now(),
        ]);

        $service = app(SettlementCalculationService::class);
        $eligible = $service->getEligibleReservations($owner);

        $this->assertCount(1, $eligible);
        $this->assertSame($resPast->id, $eligible->first()->id);
    }

    public function test_reservation_with_open_customer_case_is_excluded_from_settlement(): void
    {
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $res->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(3)->toDateString(),
        ])->save();

        ReservationPayment::create([
            'reservation_id' => $res->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_dispute_001',
            'gateway_payment_id' => 'pay_dispute_001',
            'idempotency_key' => 'idemp_dispute_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        CustomerProtectionCase::create([
            'case_reference' => 'TPC-2026-DISPUTETEST01',
            'reservation_id' => $res->id,
            'user_id' => $user->id,
            'property_id' => $property->id,
            'owner_id' => $owner->id,
            'category' => CaseCategory::SafetyConcern,
            'status' => CaseStatus::Open,
            'priority' => CasePriority::Standard,
            'description' => 'Guest reported dirty linen.',
            'sla_due_at' => now()->addDays(5),
        ]);

        $service = app(SettlementCalculationService::class);
        $eligible = $service->getEligibleReservations($owner);

        $this->assertCount(0, $eligible);
    }

    public function test_settlement_batch_generation_creates_itemized_settlement(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // Commission agreement: 1000 bps (10%)
        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-SETTLE01',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $res->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        ReservationPayment::create([
            'reservation_id' => $res->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_settle_001',
            'gateway_payment_id' => 'pay_settle_001',
            'idempotency_key' => 'idemp_settle_001',
            'amount_minor' => 200000, // ₹2,000
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        $action = app(CreatePartnerSettlement::class);
        $settlement = $action->execute($owner, $admin);

        $this->assertInstanceOf(PartnerSettlement::class, $settlement);
        $this->assertSame(SettlementStatus::Draft, $settlement->status);
        $this->assertSame(200000, $settlement->gross_booking_value_minor);
        $this->assertSame(20000, $settlement->commission_amount_minor); // 10% = ₹200
        $this->assertSame(3600, $settlement->commission_tax_amount_minor); // 18% GST on ₹200 = ₹36
        $this->assertTrue($settlement->net_settlement_amount_minor > 0);
        $this->assertSame(1, $settlement->items()->count());
    }

    public function test_partially_refunded_payment_is_eligible_and_refund_is_deducted_from_settlement(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-REFUND01',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_settle_001',
            'gateway_payment_id' => 'pay_refund_settle_001',
            'idempotency_key' => 'idemp_refund_settle_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::PartiallyRefunded,
            'captured_at' => now()->subDays(5),
        ]);

        ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'idempotency_key' => 'refund_settle_001',
            'amount_minor' => 50000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Partial goodwill refund',
            'gateway_processed_at' => now()->subDay(),
        ]);

        $settlement = app(CreatePartnerSettlement::class)->execute($owner, $admin);

        $this->assertSame(50000, $settlement->refund_adjustments_minor);
        $this->assertSame(
            max(0, 200000 - $settlement->commission_amount_minor - $settlement->commission_tax_amount_minor - $settlement->statutory_deductions_minor - 50000),
            $settlement->net_settlement_amount_minor,
        );

        $item = $settlement->items()->firstOrFail();
        $this->assertSame($payment->id, $item->reservation_payment_id);
        $this->assertSame(50000, $item->refund_deduction_minor);
    }

    public function test_fully_refunded_reservation_is_not_eligible_for_settlement(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_full_001',
            'gateway_payment_id' => 'pay_refund_full_001',
            'idempotency_key' => 'idemp_refund_full_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::PartiallyRefunded,
            'captured_at' => now()->subDays(5),
        ]);

        ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'idempotency_key' => 'refund_full_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Full refund upon cancellation',
            'gateway_processed_at' => now()->subDay(),
        ]);

        $service = app(SettlementCalculationService::class);
        $eligible = $service->getEligibleReservations($owner);

        $this->assertTrue($eligible->isEmpty());
    }

    public function test_settlement_approval_posts_balanced_journal_with_refund_adjustment(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-REFUND02',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_ledger_001',
            'gateway_payment_id' => 'pay_refund_ledger_001',
            'idempotency_key' => 'idemp_refund_ledger_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::PartiallyRefunded,
            'captured_at' => now()->subDays(5),
        ]);

        ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'idempotency_key' => 'refund_ledger_001',
            'amount_minor' => 50000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Partial goodwill refund',
            'gateway_processed_at' => now()->subDay(),
        ]);

        $settlement = app(CreatePartnerSettlement::class)->execute($owner, $admin);
        app(ApprovePartnerSettlement::class)->execute($settlement, $admin);

        $entries = FinancialLedgerEntry::query()
            ->where('entity_type', PartnerSettlement::class)
            ->where('entity_id', $settlement->id)
            ->get();

        $this->assertGreaterThan(0, $entries->count());
        $this->assertSame(
            (int) $entries->sum('debit_minor'),
            (int) $entries->sum('credit_minor'),
        );
    }

    public function test_partner_without_verified_profile_is_rejected_for_settlement_generation(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner(); // No financial profile

        $this->expectException(ValidationException::class);

        $action = app(CreatePartnerSettlement::class);
        $action->execute($owner, $admin);
    }

    public function test_platform_funded_discount_exposes_funding_shortfall_and_blocks_approval_and_route_release(): void
    {
        config([
            'tijum.settlements.enabled' => true,
            'tijum.settlements.route_enabled' => true,
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_setl',
            'tijum.payments.razorpay.key_secret' => 'test-secret',
        ]);
        Http::fake();

        $admin = $this->createFinanceAdmin();
        [$owner] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-DISC-PLAT',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-PLAT-300',
            'name' => 'Platform 300 Off',
            'slug' => 'platform-300-off',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);
        $platformCoupon = CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'PLAT300',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 30000,
            'funding_source' => CouponFundingSource::Platform,
            'is_active' => true,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1, overrides: [
            'coupon_code' => $platformCoupon->code,
        ]);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $this->assertSame(100000, $reservation->original_amount_minor);
        $this->assertSame(70000, $reservation->total_amount_minor);
        $this->assertSame(0, $reservation->coupon_property_share_minor);

        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_plat_disc_1',
            'gateway_payment_id' => 'pay_plat_disc_1',
            'idempotency_key' => 'idemp_plat_disc_1',
            'amount_minor' => 70000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        $service = app(SettlementCalculationService::class);
        $summary = $service->calculateSettlementSummary($owner, collect([$reservation->fresh(['payments', 'refunds', 'cases', 'property'])]));
        $this->assertSame(30000, $summary['platform_discount_total_minor']);
        $this->assertSame(18100, $summary['payment_funding_shortfall_minor']); // 88100 payable - 70000 captured
        $this->assertTrue($summary['funding_review_required']);

        $settlement = app(CreatePartnerSettlement::class)->execute($owner, $admin);
        $this->assertSame(88100, $settlement->net_settlement_amount_minor);

        $approvalBlocked = false;
        try {
            app(ApprovePartnerSettlement::class)->execute($settlement, $admin);
        } catch (ValidationException $e) {
            $approvalBlocked = array_key_exists('settlement', $e->errors());
        }
        $this->assertTrue($approvalBlocked, 'Platform-funded discount exceeding captured funds must fail closed before approval.');
        $this->assertSame(SettlementStatus::Draft, $settlement->fresh()->status);

        // Even if pre-approved directly, release remains fail-closed blocked
        $settlement->forceFill(['status' => SettlementStatus::Approved])->save();
        $releaseBlocked = false;
        try {
            app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        } catch (ValidationException $e) {
            $releaseBlocked = array_key_exists('settlement', $e->errors());
        }
        $this->assertTrue($releaseBlocked);
        Http::assertNothingSent();

        // Property-funded ₹300 discount reduces bookingGross to 70000 so captured 70000 funds 100% cleanly
        $propCoupon = CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'PROP300',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 30000,
            'funding_source' => CouponFundingSource::Property,
            'is_active' => true,
        ]);
        $payloadProp = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1, overrides: [
            'coupon_code' => $propCoupon->code,
        ]);
        $this->submitReservation($user, $payloadProp)->assertRedirect();
        $resProp = Reservation::query()->where('submission_token', $payloadProp['submission_token'])->firstOrFail();
        $resProp->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();
        ReservationPayment::create([
            'reservation_id' => $resProp->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_prop_disc_1',
            'gateway_payment_id' => 'pay_prop_disc_1',
            'idempotency_key' => 'idemp_prop_disc_1',
            'amount_minor' => 70000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        $propSummary = $service->calculateSettlementSummary($owner, collect([$resProp->fresh(['payments', 'refunds', 'cases', 'property'])]));
        $this->assertSame(0, $propSummary['platform_discount_total_minor']);
        $this->assertSame(0, $propSummary['payment_funding_shortfall_minor']);
        $this->assertFalse($propSummary['funding_review_required']);

        $propSettlement = app(CreatePartnerSettlement::class)->execute($owner, $admin, [$resProp->id]);
        $approvedProp = app(ApprovePartnerSettlement::class)->execute($propSettlement, $admin);
        $this->assertSame(SettlementStatus::Approved, $approvedProp->status);
    }

    public function test_negative_settlement_item_preserves_signed_deficit_and_keeps_release_blocked(): void
    {
        config([
            'tijum.settlements.enabled' => true,
            'tijum.settlements.route_enabled' => true,
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_setl',
            'tijum.payments.razorpay.key_secret' => 'test-secret',
        ]);
        Http::fake();

        $admin = $this->createFinanceAdmin();
        [$owner] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000, maxGuests: 2);
        $this->createActiveRoom($property, $roomType, '101');
        $this->createActiveRoom($property, $roomType, '102');
        $user = $this->createCustomerUser();

        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-NEG-01',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1);
        $this->submitReservation($user, $payload1)->assertRedirect();
        $res1 = Reservation::query()->where('submission_token', $payload1['submission_token'])->firstOrFail();
        $res1->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();
        $pay1 = ReservationPayment::create([
            'reservation_id' => $res1->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_neg_1',
            'gateway_payment_id' => 'pay_neg_1',
            'idempotency_key' => 'idemp_neg_1',
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => PaymentStatus::PartiallyRefunded,
            'captured_at' => now()->subDays(5),
        ]);
        ReservationRefund::create([
            'reservation_payment_id' => $pay1->id,
            'reservation_id' => $res1->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_neg_1',
            'idempotency_key' => 'idemp_rfnd_neg_1',
            'amount_minor' => 95000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'High partial refund after stay',
            'gateway_processed_at' => now()->subDays(3),
        ]);

        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1);
        $this->submitReservation($user, $payload2)->assertRedirect();
        $res2 = Reservation::query()->where('submission_token', $payload2['submission_token'])->firstOrFail();
        $res2->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();
        ReservationPayment::create([
            'reservation_id' => $res2->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_neg_2',
            'gateway_payment_id' => 'pay_neg_2',
            'idempotency_key' => 'idemp_neg_2',
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        $settlement = app(CreatePartnerSettlement::class)->execute($owner, $admin);
        $negItem = $settlement->items()->where('reservation_id', $res1->id)->firstOrFail();
        $posItem = $settlement->items()->where('reservation_id', $res2->id)->firstOrFail();

        // Line 1 deficit (-6900) must be preserved explicitly instead of silently flooring to 0
        $this->assertSame(-6900, $negItem->net_payable_minor);
        $this->assertSame(88100, $posItem->net_payable_minor);
        $this->assertSame(81200, $settlement->net_settlement_amount_minor);
        $this->assertNotSame(
            $settlement->items()->where('net_payable_minor', '>', 0)->sum('net_payable_minor'),
            $settlement->net_settlement_amount_minor,
        );

        // Both ApprovePartnerSettlement and ReleasePartnerSettlement remain fail-closed blocked
        $approveBlocked = false;
        try {
            app(ApprovePartnerSettlement::class)->execute($settlement, $admin);
        } catch (ValidationException $e) {
            $approveBlocked = array_key_exists('settlement', $e->errors());
        }
        $this->assertTrue($approveBlocked);

        $settlement->forceFill(['status' => SettlementStatus::Approved])->save();
        $releaseBlocked = false;
        try {
            app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        } catch (ValidationException $e) {
            $releaseBlocked = array_key_exists('settlement', $e->errors());
        }
        $this->assertTrue($releaseBlocked);
        Http::assertNothingSent();
    }

    public function test_zero_payable_booking_and_zero_payable_settlement_avoid_invalid_razorpay_orders_or_transfers(): void
    {
        config([
            'tijum.settlements.enabled' => true,
            'tijum.settlements.route_enabled' => true,
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_zero',
            'tijum.payments.razorpay.key_secret' => 'test-zero-secret',
        ]);
        Http::fake();

        $admin = $this->createFinanceAdmin();
        [$owner] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-PROP-ZERO',
            'name' => 'Full Property Voucher',
            'slug' => 'full-property-voucher',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);
        $fullCoupon = CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'FREE100PROP',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 100000,
            'funding_source' => CouponFundingSource::Property,
            'is_active' => true,
        ]);
        $subInrCoupon = CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'SUBINR99950',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 99950,
            'funding_source' => CouponFundingSource::Property,
            'is_active' => true,
        ]);

        // 1. Sub-₹1 non-zero payable (50 paise) is rejected rather than creating an unpayable order
        $checkInSub = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->toDateString();
        $payloadSub = $this->validReservationPayload($property, $roomType, $checkInSub, durationQuantity: 1, overrides: [
            'coupon_code' => $subInrCoupon->code,
        ]);
        $this->submitReservation($user, $payloadSub)->assertSessionHasErrors('coupon_code');

        // 2. Clean 0-payable booking confirms directly without Razorpay payment order
        $checkInZero = CarbonImmutable::now('Asia/Kolkata')->addDays(8)->toDateString();
        $payloadZero = $this->validReservationPayload($property, $roomType, $checkInZero, durationQuantity: 1, overrides: [
            'coupon_code' => $fullCoupon->code,
        ]);
        $this->submitReservation($user, $payloadZero)->assertRedirect();
        $zeroReservation = Reservation::query()->where('submission_token', $payloadZero['submission_token'])->firstOrFail();

        $this->assertSame(ReservationStatus::Confirmed, $zeroReservation->status);
        $this->assertNotNull($zeroReservation->confirmed_at);
        $this->assertNull($zeroReservation->payment_deadline_at);
        $this->assertSame(0, $zeroReservation->total_amount_minor);
        $this->assertSame(100000, $zeroReservation->original_amount_minor);
        $this->assertDatabaseCount('reservation_payments', 0);

        $orderRejected = false;
        try {
            app(InitiatePaymentOrder::class)->execute($zeroReservation, $user);
        } catch (InvalidArgumentException) {
            $orderRejected = true;
        }
        $this->assertTrue($orderRejected);
        Http::assertNothingSent();

        // 3. Clean 0-payable settlement settles directly without creating 0-amount ProviderTransfer rows
        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-ZERO-SETL',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkInSettle = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payloadSettle = $this->validReservationPayload($property, $roomType, $checkInSettle, durationQuantity: 1);
        $this->submitReservation($user, $payloadSettle)->assertRedirect();
        $resSettle = Reservation::query()->where('submission_token', $payloadSettle['submission_token'])->firstOrFail();
        $resSettle->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();
        $paySettle = ReservationPayment::create([
            'reservation_id' => $resSettle->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_zero_setl',
            'gateway_payment_id' => 'pay_zero_setl',
            'idempotency_key' => 'idemp_zero_setl',
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => PaymentStatus::PartiallyRefunded,
            'captured_at' => now()->subDays(5),
        ]);
        // Exact refund of 88100 reduces raw line payable to 0 cleanly
        ReservationRefund::create([
            'reservation_payment_id' => $paySettle->id,
            'reservation_id' => $resSettle->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_zero_setl',
            'idempotency_key' => 'idemp_rfnd_zero_setl',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Exact net payable offset refund',
            'gateway_processed_at' => now()->subDays(3),
        ]);

        $zeroSettlement = app(CreatePartnerSettlement::class)->execute($owner, $admin);
        $this->assertSame(0, $zeroSettlement->net_settlement_amount_minor);
        $approvedZero = app(ApprovePartnerSettlement::class)->execute($zeroSettlement, $admin);
        $this->assertFalse(
            FinancialLedgerEntry::query()
                ->where('entity_type', PartnerSettlement::class)
                ->where('entity_id', $approvedZero->id)
                ->where('entry_category', LedgerEntryCategory::TransferPending)
                ->exists(),
        );

        $settledZero = app(ReleasePartnerSettlement::class)->execute($approvedZero, $admin);
        $this->assertSame(SettlementStatus::Settled, $settledZero->status);
        $this->assertSame(0, ProviderTransfer::query()->where('partner_settlement_id', $settledZero->id)->count());
        Http::assertNothingSent();
    }
}
