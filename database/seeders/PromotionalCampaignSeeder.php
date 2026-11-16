<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Models\CouponCode;
use App\Models\PromotionalCampaign;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

class PromotionalCampaignSeeder extends Seeder
{
    public function run(): void
    {
        $now = CarbonImmutable::now();

        // 1. Welcome to TIJUM Campaign
        $welcomeCampaign = PromotionalCampaign::updateOrCreate(
            ['slug' => 'welcome-to-tijum'],
            [
                'campaign_reference' => 'CMP-2026-WLCM01',
                'name' => 'Welcome to TIJUM',
                'description' => 'Special launch discount for new TIJUM guests on their first booking.',
                'type' => CampaignType::NewCustomerWelcome,
                'status' => CampaignStatus::Active,
                'starts_at' => $now->subDays(10),
                'ends_at' => $now->addMonths(6),
                'budget_minor' => 100000000, // ₹10,00,000 platform budget
                'spent_minor' => 0,
            ]
        );

        CouponCode::updateOrCreate(
            ['code' => 'WELCOME500'],
            [
                'campaign_id' => $welcomeCampaign->id,
                'description' => 'Flat ₹500 off on your first TIJUM booking (Min ₹2,000 spend)',
                'offer_type' => CouponOfferType::FixedAmount,
                'discount_amount_minor' => 50000, // ₹500
                'funding_source' => CouponFundingSource::Platform,
                'min_booking_amount_minor' => 200000, // ₹2,000
                'first_booking_only' => true,
                'per_user_limit' => 1,
                'is_active' => true,
                'starts_at' => $now->subDays(10),
                'expires_at' => $now->addMonths(6),
            ]
        );

        // 2. Festival Stays 2026
        $festivalCampaign = PromotionalCampaign::updateOrCreate(
            ['slug' => 'festival-delight-2026'],
            [
                'campaign_reference' => 'CMP-2026-FEST01',
                'name' => 'Festival Delight Stays',
                'description' => '10% discount across all hostels, homestays and co-living properties.',
                'type' => CampaignType::OccasionFestival,
                'status' => CampaignStatus::Active,
                'starts_at' => $now->subDays(5),
                'ends_at' => $now->addDays(90),
                'budget_minor' => 250000000,
                'spent_minor' => 0,
            ]
        );

        CouponCode::updateOrCreate(
            ['code' => 'FESTIVAL10'],
            [
                'campaign_id' => $festivalCampaign->id,
                'description' => '10% discount up to ₹1,000 off on stays of 2+ days',
                'offer_type' => CouponOfferType::Percentage,
                'discount_percentage' => 10.0,
                'max_discount_amount_minor' => 100000, // ₹1,000 cap
                'funding_source' => CouponFundingSource::Platform,
                'min_booking_amount_minor' => 150000, // ₹1,500
                'min_stay_days' => 2,
                'per_user_limit' => 3,
                'is_active' => true,
                'starts_at' => $now->subDays(5),
                'expires_at' => $now->addDays(90),
            ]
        );

        // 3. Rewards Points Booster
        $boosterCampaign = PromotionalCampaign::updateOrCreate(
            ['slug' => 'points-booster-2026'],
            [
                'campaign_reference' => 'CMP-2026-PTS01',
                'name' => 'Loyalty Points Booster',
                'description' => 'Earn 200 bonus loyalty points upon checkout.',
                'type' => CampaignType::Standard,
                'status' => CampaignStatus::Active,
                'starts_at' => $now->subDays(1),
                'ends_at' => $now->addMonths(12),
                'budget_minor' => 50000000,
                'spent_minor' => 0,
            ]
        );

        CouponCode::updateOrCreate(
            ['code' => 'TIJUMPOINTS'],
            [
                'campaign_id' => $boosterCampaign->id,
                'description' => 'Get +200 bonus loyalty points credited on completing your stay',
                'offer_type' => CouponOfferType::PointsReward,
                'bonus_points' => 200,
                'funding_source' => CouponFundingSource::Platform,
                'min_booking_amount_minor' => 100000, // ₹1,000
                'per_user_limit' => 2,
                'is_active' => true,
                'starts_at' => $now->subDays(1),
                'expires_at' => $now->addMonths(12),
            ]
        );

        // 4. Combined Offer (Cozy Stay)
        $cozyCampaign = PromotionalCampaign::updateOrCreate(
            ['slug' => 'cozy-stay-split-offer'],
            [
                'campaign_reference' => 'CMP-2026-COZY01',
                'name' => 'Cozy Stay Partner Special',
                'description' => 'Special co-funded discount + bonus points.',
                'type' => CampaignType::PropertySpecific,
                'status' => CampaignStatus::Active,
                'starts_at' => $now->subDays(1),
                'ends_at' => $now->addMonths(6),
                'budget_minor' => 50000000,
                'spent_minor' => 0,
            ]
        );

        CouponCode::updateOrCreate(
            ['code' => 'COZYSTAY15'],
            [
                'campaign_id' => $cozyCampaign->id,
                'description' => '15% discount (up to ₹750) + 100 bonus loyalty points',
                'offer_type' => CouponOfferType::Combined,
                'discount_percentage' => 15.0,
                'max_discount_amount_minor' => 75000, // ₹750 cap
                'bonus_points' => 100,
                'funding_source' => CouponFundingSource::Split,
                'property_funding_percentage' => 50.0, // 50% property funded, 50% platform funded
                'min_booking_amount_minor' => 100000,
                'min_stay_days' => 1,
                'per_user_limit' => 2,
                'is_active' => true,
                'starts_at' => $now->subDays(1),
                'expires_at' => $now->addMonths(6),
            ]
        );
    }
}
