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
use App\Services\Promotions\CouponRedemptionService;
use App\Services\Rewards\LoyaltyPointsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class RewardsConcurrencySafetyTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_prevents_points_wallet_from_going_negative_under_insufficient_balance(): void
    {
        $user = $this->createCustomerUser();
        $service = app(LoyaltyPointsService::class);

        // Credit 150 points
        $service->creditPoints($user, 150, PointsTransactionType::PromotionalBonus);

        // 1. Hold 100 points -> Succeeds (50 points available)
        $hold1 = $service->createHold($user, 100);
        $this->assertSame(100, $hold1->points_held);

        $wallet = $service->getOrCreateWallet($user);
        $this->assertSame(50, $wallet->available_points);
        $this->assertSame(100, $wallet->reserved_points);

        // 2. Attempting to hold 100 points when only 50 points available fails with exception
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Insufficient available points balance.');

        $service->createHold($user, 100);
    }

    public function test_coupon_hold_enforces_row_locked_global_usage_limit(): void
    {
        $user1 = $this->createCustomerUser();
        $user2 = $this->createCustomerUser();

        $campaign = PromotionalCampaign::create([
            'campaign_reference' => 'CMP-CONC-01',
            'name' => 'Concurrency Test Campaign',
            'slug' => 'concurrency-test-campaign',
            'type' => CampaignType::Standard,
            'status' => CampaignStatus::Active,
        ]);

        $coupon = CouponCode::create([
            'campaign_id' => $campaign->id,
            'code' => 'LIMITED1',
            'offer_type' => CouponOfferType::FixedAmount,
            'discount_amount_minor' => 10000,
            'funding_source' => CouponFundingSource::Platform,
            'total_usage_limit' => 1,
            'total_used_count' => 1, // Already reached limit
            'is_active' => true,
        ]);

        $service = app(CouponRedemptionService::class);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Coupon has reached its maximum usage limit.');

        $service->createHold($coupon, $user1, 10000);
    }
}
