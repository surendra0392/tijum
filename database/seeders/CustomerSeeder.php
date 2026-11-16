<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PointsTransactionStatus;
use App\Enums\PointsTransactionType;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerPointsWallet;
use App\Models\CustomerReferralProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CustomerSeeder extends Seeder
{
    /**
     * Seed verified customers with points wallets, referral profiles, and ledger entries.
     */
    public function run(): void
    {
        $customers = [
            [
                'name' => 'Rahul Sharma',
                'email' => 'customer@tijum.com',
                'phone' => '+919876543210',
                'password' => 'Password123!',
                'referral_code' => 'RAHUL2026',
                'points_earned' => 1250,
                'points_available' => 750,
                'points_redeemed' => 500,
            ],
            [
                'name' => 'Sneha Patel',
                'email' => 'sneha.patel@tijum.com',
                'phone' => '+919812345678',
                'password' => 'Password123!',
                'referral_code' => 'SNEHA2026',
                'points_earned' => 500,
                'points_available' => 500,
                'points_redeemed' => 0,
            ],
            [
                'name' => 'Vikram Aditya',
                'email' => 'vikram.aditya@tijum.com',
                'phone' => '+919701234567',
                'password' => 'Password123!',
                'referral_code' => 'VIKRAM2026',
                'points_earned' => 300,
                'points_available' => 300,
                'points_redeemed' => 0,
            ],
            [
                'name' => 'Priya Nair',
                'email' => 'priya.nair@tijum.com',
                'phone' => '+919900112233',
                'password' => 'Password123!',
                'referral_code' => 'PRIYA2026',
                'points_earned' => 400,
                'points_available' => 400,
                'points_redeemed' => 0,
            ],
        ];

        foreach ($customers as $data) {
            /** @var User $user */
            $user = User::query()
                ->where('email', $data['email'])
                ->orWhere('phone', $data['phone'])
                ->first();

            $userAttributes = [
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'password' => Hash::make($data['password']),
                'email_verified_at' => now(),
                'phone_verified_at' => now(),
                'terms_accepted_at' => now(),
            ];

            if ($user) {
                $user->update($userAttributes);
            } else {
                $user = User::query()->create($userAttributes);
            }

            // Points Wallet
            CustomerPointsWallet::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'available_points' => $data['points_available'],
                    'pending_points' => 0,
                    'reserved_points' => 0,
                    'redeemed_points' => $data['points_redeemed'],
                    'expired_points' => 0,
                    'total_points_earned' => $data['points_earned'],
                ]
            );

            // Referral Profile
            CustomerReferralProfile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'referral_code' => $data['referral_code'],
                    'total_referrals_count' => $data['points_earned'] > 500 ? 2 : 0,
                    'successful_referrals_count' => $data['points_earned'] > 500 ? 2 : 0,
                    'total_points_earned' => $data['points_earned'],
                    'is_blocked' => false,
                ]
            );

            // Welcome Points Ledger
            CustomerPointsLedger::query()->firstOrCreate(
                [
                    'user_id' => $user->id,
                    'transaction_type' => PointsTransactionType::PromotionalBonus,
                    'reference_type' => 'welcome_signup',
                ],
                [
                    'status' => PointsTransactionStatus::Available,
                    'points' => 500,
                    'inr_equivalent_minor' => 50000,
                    'running_balance_after' => 500,
                    'reference_id' => (string) $user->id,
                    'idempotency_key' => 'welcome-bonus-'.$user->id,
                    'expires_at' => now()->addMonths(12),
                    'points_remaining' => 500,
                    'notes' => 'TIJUM Welcome Sign-up Points',
                ]
            );
        }
    }
}
