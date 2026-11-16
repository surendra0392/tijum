<?php

declare(strict_types=1);

namespace Tests\Feature\Rewards;

use App\Actions\Financial\ApprovePartnerSettlement;
use App\Actions\Financial\CreatePartnerSettlement;
use App\Actions\Reservations\CreateReservation;
use App\Actions\Reservations\ReservationLifecycle;
use App\Enums\AdminRole;
use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use App\Enums\CommissionAgreementStatus;
use App\Enums\CommissionBaseType;
use App\Enums\CommissionGstType;
use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\PointsTransactionType;
use App\Models\Admin;
use App\Models\CouponCode;
use App\Models\FinancialLedgerEntry;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerCommissionAgreement;
use App\Models\PartnerSettlement;
use App\Models\PromotionalCampaign;
use App\Models\ReservationPayment;
use App\Services\Promotions\CentralPromotionEngine;
use App\Services\Rewards\LoyaltyPointsService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class CentralPromotionPricingAndSettlementTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

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
            'legal_business_name' => 'Bangalore Stays Pvt Ltd',
            'business_constitution' => 'private_limited',
            'pan_number' => 'BNGST1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => 'acc_test_promo_123',
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => 'Bangalore Stays Private Limited',
            'bank_account_number_masked' => '•••• •••• 1234',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        return [$owner, $profile];
    }

    public function test_shared_central_promotion_calculation_pipeline(): void
    {
        $user = $this->createCustomerUser();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        // Credit 500 points to user
        app(LoyaltyPointsService::class)->creditPoints($user, 500, PointsTransactionType::PromotionalBonus);

        // Create 10% coupon
        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-PIPE-01',
            'name' => 'Pipeline Promo',
            'slug' => 'pipeline-promo',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'PIPE10',
            'offer_type' => CouponOfferType::Percentage,
            'discount_percentage' => 10.0,
            'funding_source' => CouponFundingSource::Platform,
            'is_active' => true,
        ]);

        $engine = app(CentralPromotionEngine::class);

        // Subtotal = ₹2,000 (200,000 minor), Tax = ₹100 (10,000 minor)
        // Coupon 10% on ₹2,000 = ₹200 discount (20,000 minor) -> Subtotal after coupon = ₹1,800
        // Total before points = ₹1,800 + ₹100 tax = ₹1,900 (190,000 minor)
        // Points redeemed = 250 points (₹250 discount = 25,000 minor)
        // Final Payable = ₹1,900 - ₹250 = ₹1,650 (165,000 minor)
        $quote = $engine->calculate(
            user: $user,
            property: $property,
            subtotalMinor: 200000,
            taxMinor: 10000,
            couponCode: 'PIPE10',
            pointsToRedeem: 250,
        );

        $this->assertTrue($quote['is_valid']);
        $this->assertTrue($quote['coupon_applied']);
        $this->assertSame(20000, $quote['coupon_discount_minor']); // ₹200
        $this->assertSame(250, $quote['points_redeemed']);
        $this->assertSame(25000, $quote['points_discount_minor']); // ₹250
        $this->assertSame(165000, $quote['total_payable_minor']); // ₹1,650 final payable
        $this->assertTrue($quote['owner_settlement_protected']);
    }

    public function test_platform_funded_coupon_and_points_redemption_protect_owner_payout(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000); // ₹1,000/day
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // 10% commission agreement
        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-PROMO01',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000, // 10%
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        // Credit 300 points to user
        app(LoyaltyPointsService::class)->creditPoints($user, 300, PointsTransactionType::PromotionalBonus);

        // Create platform coupon: ₹200 off
        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-PROMO-02',
            'name' => 'Platform Funded Promo',
            'slug' => 'platform-funded-promo',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'PLATFORM200',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 20000, // ₹200
            'funding_source' => CouponFundingSource::Platform,
            'is_active' => true,
        ]);

        // Create booking: 2 days = ₹2,000
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $payload['coupon_code'] = 'PLATFORM200';
        $payload['points_to_redeem'] = 300; // ₹300 off

        $reservation = app(CreateReservation::class)->execute($user, $payload);

        // Customer paid: ₹2,000 - ₹200 coupon - ₹300 points = ₹1,500 (150,000 minor)
        $this->assertSame(200000, $reservation->original_amount_minor);
        $this->assertSame(150000, $reservation->total_amount_minor);

        app(ReservationLifecycle::class)->confirmPaid($reservation);

        // Simulate stay completed in past
        $reservation->forceFill([
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        // Create payment record
        ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_promo_settle_01',
            'gateway_payment_id' => 'pay_promo_settle_01',
            'idempotency_key' => 'idemp_promo_settle_01',
            'amount_minor' => 150000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        // Generate partner settlement
        $settlement = app(CreatePartnerSettlement::class)->execute($owner, $admin);

        // VERIFICATION OF OWNER SETTLEMENT PROTECTION:
        // Partner gross booking value must be ₹2,000 (200000 minor), NOT the discounted ₹1,500!
        $this->assertSame(200000, $settlement->gross_booking_value_minor);
        $this->assertSame(20000, $settlement->commission_amount_minor); // 10% of ₹2,000 = ₹200
        $this->assertSame(3600, $settlement->commission_tax_amount_minor); // 18% GST on ₹200 = ₹36

        // Approve settlement and verify balanced ledger
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
}
