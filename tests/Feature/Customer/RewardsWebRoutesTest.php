<?php

declare(strict_types=1);

namespace Tests\Feature\Customer;

use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Enums\PointsTransactionType;
use App\Models\CouponCode;
use App\Models\PromotionalCampaign;
use App\Models\User;
use App\Services\Rewards\LoyaltyPointsService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RewardsWebRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_rewards_hub_page_renders_for_authenticated_customer(): void
    {
        $user = User::factory()->create();

        $service = app(LoyaltyPointsService::class);
        $service->creditPoints(
            user: $user,
            points: 250,
            type: PointsTransactionType::BookingEarned,
            notes: 'Test booking points',
            expiresAt: CarbonImmutable::now()->addDays(365),
        );

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-WEB-01',
            'name' => 'Web Promo',
            'slug' => 'web-promo',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'TIJUMTEST10',
            'description' => 'Test 10% Discount',
            'offer_type' => CouponOfferType::Percentage,
            'discount_percentage' => 10,
            'funding_source' => CouponFundingSource::Platform,
            'is_active' => true,
            'expires_at' => CarbonImmutable::now()->addMonths(3),
        ]);

        $response = $this->actingAs($user)->get('/customer/rewards');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('customer/rewards/index')
            ->has('wallet', fn (Assert $wallet) => $wallet
                ->where('available_points', 250)
                ->where('total_earned_points', 250)
                ->where('total_redeemed_points', 0)
                ->etc()
            )
            ->has('referral')
            ->has('activeCoupons', 1, fn (Assert $coupon) => $coupon
                ->where('code', 'TIJUMTEST10')
                ->has('title')
                ->has('valid_to')
                ->etc()
            )
            ->has('recentActivity', 1, fn (Assert $item) => $item
                ->where('transaction_type', 'booking_earned')
                ->where('type', 'booking_earned')
                ->where('is_credit', true)
                ->etc()
            )
        );

        // Also test alias /rewards
        $this->actingAs($user)->get('/rewards')->assertOk();
    }

    public function test_points_wallet_page_renders_for_authenticated_customer(): void
    {
        $user = User::factory()->create();

        $service = app(LoyaltyPointsService::class);
        $service->creditPoints(
            user: $user,
            points: 500,
            type: PointsTransactionType::ReferralBonusReferrer,
            notes: 'Test referral points',
            expiresAt: CarbonImmutable::now()->addDays(365),
        );

        $response = $this->actingAs($user)->get('/customer/rewards/points');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('customer/rewards/points')
            ->has('wallet', fn (Assert $wallet) => $wallet
                ->where('available_points', 500)
                ->where('total_earned_points', 500)
                ->etc()
            )
            ->has('ledger.data', 1, fn (Assert $item) => $item
                ->where('transaction_type', 'referral_bonus_referrer')
                ->where('type', 'referral_bonus_referrer')
                ->where('is_credit', true)
                ->etc()
            )
        );

        $this->actingAs($user)->get('/rewards/points')->assertOk();
    }

    public function test_referrals_page_renders_for_authenticated_customer(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/customer/rewards/referrals');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('customer/rewards/referrals')
            ->has('profile')
            ->has('invites')
        );

        $this->actingAs($user)->get('/rewards/referrals')->assertOk();
    }

    public function test_coupons_page_renders_for_authenticated_customer(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/customer/rewards/coupons');

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('customer/rewards/coupons')
            ->has('coupons')
        );

        $this->actingAs($user)->get('/rewards/coupons')->assertOk();
    }
}
