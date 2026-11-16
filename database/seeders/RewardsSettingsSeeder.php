<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\RewardsSetting;
use Illuminate\Database\Seeder;

class RewardsSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            [
                'key' => 'points_earning_rate_bps',
                'value' => 500,
                'description' => 'Loyalty points earned per booking in basis points (500 bps = 5% of gross booking).',
            ],
            [
                'key' => 'points_redemption_rate_paise',
                'value' => 100,
                'description' => 'Conversion rate of 1 loyalty point to paise (100 paise = ₹1.00).',
            ],
            [
                'key' => 'points_redemption_min_balance',
                'value' => 100,
                'description' => 'Minimum points balance required to unlock redemption at checkout.',
            ],
            [
                'key' => 'points_redemption_max_percentage',
                'value' => 50,
                'description' => 'Maximum percentage of booking total that can be discounted using points.',
            ],
            [
                'key' => 'points_expiry_days',
                'value' => 365,
                'description' => 'Number of days before earned loyalty points expire via FEFO schedule.',
            ],
            [
                'key' => 'referral_referrer_reward_points',
                'value' => 500,
                'description' => 'Points awarded to referring customer upon friend first completed stay.',
            ],
            [
                'key' => 'referral_referred_reward_points',
                'value' => 250,
                'description' => 'Welcome points awarded to referred friend upon first completed stay.',
            ],
            [
                'key' => 'referral_min_booking_value_minor',
                'value' => 100000,
                'description' => 'Minimum booking value in minor units (paise) required to qualify referral rewards.',
            ],
            [
                'key' => 'hold_duration_minutes',
                'value' => 15,
                'description' => 'Duration in minutes for row-locked checkout holds on coupons and points.',
            ],
        ];

        foreach ($settings as $item) {
            RewardsSetting::set($item['key'], $item['value'], $item['description']);
        }
    }
}
