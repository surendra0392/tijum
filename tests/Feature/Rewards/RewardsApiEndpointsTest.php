<?php

declare(strict_types=1);

namespace Tests\Feature\Rewards;

use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Enums\PointsTransactionType;
use App\Models\CouponCode;
use App\Models\PromotionalCampaign;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class RewardsApiEndpointsTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_customer_can_retrieve_rewards_overview_via_api(): void
    {
        $user = $this->createCustomerUser();
        Sanctum::actingAs($user, ['customer:read']);

        app(LoyaltyPointsService::class)->creditPoints($user, 350, PointsTransactionType::PromotionalBonus);
        app(ReferralService::class)->getOrCreateProfile($user);

        $response = $this->getJson('/api/v1/customer/rewards/overview');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'wallet' => [
                        'available_points',
                        'pending_points',
                        'reserved_points',
                        'redeemed_points',
                        'expired_points',
                        'total_earned_points',
                        'point_to_inr_rate',
                        'estimated_inr_value',
                    ],
                    'referral_profile' => [
                        'referral_code',
                        'referral_link',
                        'referrer_reward_points',
                        'referee_reward_points',
                        'total_referrals_count',
                        'completed_referrals_count',
                        'pending_referrals_count',
                        'total_points_earned',
                    ],
                    'active_coupons_count',
                    'recent_transactions',
                ],
            ])
            ->assertJsonPath('data.wallet.available_points', 350);
    }

    public function test_customer_can_retrieve_points_wallet_and_ledger(): void
    {
        $user = $this->createCustomerUser();
        Sanctum::actingAs($user, ['customer:read']);

        $service = app(LoyaltyPointsService::class);
        $service->creditPoints($user, 200, PointsTransactionType::PromotionalBonus, notes: 'Welcome 200');

        $walletRes = $this->getJson('/api/v1/customer/rewards/points');
        $walletRes->assertOk()
            ->assertJsonPath('data.wallet.available_points', 200);

        $ledgerRes = $this->getJson('/api/v1/customer/rewards/points/ledger');
        $ledgerRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'wallet',
                    'ledger' => [
                        '*' => [
                            'id',
                            'transaction_type',
                            'points',
                            'direction',
                            'status',
                            'description',
                        ],
                    ],
                    'pagination',
                ],
            ]);
    }

    public function test_customer_can_retrieve_referral_profile(): void
    {
        $user = $this->createCustomerUser();
        Sanctum::actingAs($user, ['customer:read']);

        $response = $this->getJson('/api/v1/customer/rewards/referrals');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'profile' => [
                        'referral_code',
                        'referral_link',
                        'referrer_reward_points',
                        'referee_reward_points',
                        'total_referrals_count',
                    ],
                    'referrals',
                ],
            ]);
    }

    public function test_customer_can_list_and_validate_available_coupons(): void
    {
        $user = $this->createCustomerUser();
        Sanctum::actingAs($user, ['customer:read']);

        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-API-01',
            'name' => 'API Coupon Test',
            'slug' => 'api-coupon-test',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'APIDISC250',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 25000,
            'funding_source' => CouponFundingSource::Platform,
            'min_booking_amount_minor' => 100000,
            'is_active' => true,
        ]);

        // List coupons
        $listRes = $this->getJson('/api/v1/customer/coupons');
        $listRes->assertOk()
            ->assertJsonPath('success', true);

        // Validate coupon (success)
        $valRes = $this->postJson('/api/v1/customer/coupons/validate', [
            'code' => 'APIDISC250',
            'subtotal_paise' => 150000,
            'property_id' => $property->id,
        ]);

        $valRes->assertOk()
            ->assertJsonPath('data.valid', true)
            ->assertJsonPath('data.discount_amount_paise', 25000);

        // Validate coupon (fail: below minimum spend)
        $valFail = $this->postJson('/api/v1/customer/coupons/validate', [
            'code' => 'APIDISC250',
            'subtotal_paise' => 50000,
            'property_id' => $property->id,
        ]);

        $valFail->assertOk()
            ->assertJsonPath('data.valid', false);
    }

    public function test_checkout_quote_promotions_endpoint(): void
    {
        $user = $this->createCustomerUser();
        Sanctum::actingAs($user, ['customer:read', 'customer:write']);

        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);

        // Credit 300 points
        app(LoyaltyPointsService::class)->creditPoints($user, 300, PointsTransactionType::PromotionalBonus);

        // Create coupon ₹200 off
        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-QUOTE-01',
            'name' => 'Quote Test',
            'slug' => 'quote-test',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'QUOTE200',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 20000, // ₹200
            'funding_source' => CouponFundingSource::Platform,
            'is_active' => true,
        ]);

        // Request quote: Subtotal = ₹2,000 (200,000 paise), Tax = ₹100 (10,000 paise)
        // Coupon discount = ₹200 (20,000 paise)
        // Points to redeem = 300 (₹300 = 30,000 paise)
        // Final payable = ₹2,000 - ₹200 + ₹100 - ₹300 = ₹1,600 (160,000 paise)
        $response = $this->postJson('/api/v1/checkout/quote-promotions', [
            'property_id' => $property->id,
            'subtotal_paise' => 200000,
            'tax_amount_paise' => 10000,
            'coupon_code' => 'QUOTE200',
            'points_to_redeem' => 300,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.subtotal_paise', 200000)
            ->assertJsonPath('data.coupon_discount_paise', 20000)
            ->assertJsonPath('data.tax_amount_paise', 10000)
            ->assertJsonPath('data.points_redeemed', 300)
            ->assertJsonPath('data.points_discount_paise', 30000)
            ->assertJsonPath('data.final_payable_paise', 160000);
    }
}
