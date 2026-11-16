<?php

declare(strict_types=1);

namespace App\Services\Rewards;

use App\Enums\PointsTransactionType;
use App\Enums\ReferralStatus;
use App\Enums\ReservationStatus;
use App\Models\CustomerReferral;
use App\Models\CustomerReferralProfile;
use App\Models\Reservation;
use App\Models\RewardsSetting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReferralService
{
    public function __construct(
        private readonly LoyaltyPointsService $pointsService,
    ) {}

    /**
     * Get or create customer's unique referral profile and code.
     */
    public function getOrCreateProfile(User $user): CustomerReferralProfile
    {
        /** @var CustomerReferralProfile $profile */
        $profile = CustomerReferralProfile::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'referral_code' => $this->generateUniqueReferralCode($user),
                'total_referrals_count' => 0,
                'successful_referrals_count' => 0,
                'total_points_earned' => 0,
                'is_blocked' => false,
            ]
        );

        return $profile;
    }

    /**
     * Attribute a referred user to a referrer code with anti-self-referral fraud protection.
     */
    public function attributeReferral(
        User $referredUser,
        string $referralCode,
        ?string $ip = null,
        ?string $userAgent = null,
        ?string $deviceFingerprint = null,
    ): ?CustomerReferral {
        $normalizedCode = strtoupper(trim($referralCode));

        /** @var CustomerReferralProfile|null $profile */
        $profile = CustomerReferralProfile::query()
            ->with('user')
            ->where('referral_code', $normalizedCode)
            ->first();

        if ($profile === null || $profile->is_blocked) {
            return null;
        }

        $referrer = $profile->user;

        // Anti-Fraud Safeguard 1: Self-referral prohibition
        if ($referrer->id === $referredUser->id) {
            return null;
        }

        // Anti-Fraud Safeguard 2: Matching phone or email
        if ($referrer->email === $referredUser->email) {
            return null;
        }

        if ($referrer->phone && $referredUser->phone && $referrer->phone === $referredUser->phone) {
            return null;
        }

        // Anti-Fraud Safeguard 3: Already attributed
        $alreadyAttributed = CustomerReferral::query()
            ->where('referred_user_id', $referredUser->id)
            ->exists();

        if ($alreadyAttributed) {
            return null;
        }

        return DB::transaction(function () use ($referrer, $referredUser, $normalizedCode, $ip, $userAgent, $deviceFingerprint, $profile): CustomerReferral {
            $referrerReward = (int) RewardsSetting::get('referral_referrer_reward_points', 500);
            $referredReward = (int) RewardsSetting::get('referral_referred_reward_points', 250);

            $referral = CustomerReferral::create([
                'referrer_user_id' => $referrer->id,
                'referred_user_id' => $referredUser->id,
                'referral_code_used' => $normalizedCode,
                'status' => ReferralStatus::Registered,
                'attribution_ip' => $ip,
                'attribution_user_agent' => $userAgent,
                'attribution_device_fingerprint' => $deviceFingerprint,
                'referrer_reward_points' => $referrerReward,
                'referred_reward_points' => $referredReward,
            ]);

            // Update user's referred_by_user_id
            $referredUser->update(['referred_by_user_id' => $referrer->id]);

            // Increment profile stats
            $profile->increment('total_referrals_count');

            // Credit Referee welcome bonus points immediately upon registration with valid referral code
            if ($referredReward > 0) {
                $this->pointsService->creditPoints(
                    user: $referredUser,
                    points: $referredReward,
                    type: PointsTransactionType::ReferralBonusReferred,
                    referenceType: User::class,
                    referenceId: $referredUser->id,
                    idempotencyKey: 'REG-REF-'.$referredUser->id.'-'.$referrer->id,
                    notes: "Welcome bonus for registering with referral code {$normalizedCode}",
                );
            }

            return $referral;
        });
    }

    /**
     * Qualify referral and credit dual points strictly upon first completed stay.
     */
    public function qualifyReferralOnCompletedStay(Reservation $reservation): ?CustomerReferral
    {
        if ($reservation->status !== ReservationStatus::Confirmed || $reservation->checkout_date->startOfDay()->isFuture()) {
            return null;
        }

        return DB::transaction(function () use ($reservation): ?CustomerReferral {
            /** @var CustomerReferral|null $referral */
            $referral = CustomerReferral::query()
                ->lockForUpdate()
                ->where('referred_user_id', $reservation->user_id)
                ->where('status', ReferralStatus::Registered)
                ->first();

            if ($referral === null) {
                return null;
            }

            // Minimum booking value for referral qualification (default ₹1,000 = 100,000 minor)
            $minBooking = (int) RewardsSetting::get('referral_min_booking_value_minor', 100000);
            if ($reservation->total_amount_minor < $minBooking) {
                return null;
            }

            /** @var User $referrer */
            $referrer = User::query()->findOrFail($referral->referrer_user_id);
            /** @var User $referred */
            $referred = User::query()->findOrFail($referral->referred_user_id);

            // Check max referral earning cap (default max 5 successful referrals)
            $maxReferrals = (int) RewardsSetting::get('referral_max_successful_referrals', 5);
            $currentSuccessful = (int) CustomerReferralProfile::query()
                ->where('user_id', $referrer->id)
                ->value('successful_referrals_count');

            // 1. Credit Referrer Points strictly if under max referral earnings cap
            $pointsCredited = 0;
            if ($currentSuccessful < $maxReferrals) {
                $this->pointsService->creditPoints(
                    user: $referrer,
                    points: $referral->referrer_reward_points,
                    type: PointsTransactionType::ReferralBonusReferrer,
                    referenceType: Reservation::class,
                    referenceId: $reservation->id,
                    idempotencyKey: 'REF-RFR-'.$reservation->id.'-'.$referrer->id,
                    notes: "Referral reward: {$referred->name} completed stay #{$reservation->booking_reference}",
                );
                $pointsCredited = $referral->referrer_reward_points;
            }

            $referral->update([
                'status' => ReferralStatus::RewardCredited,
                'qualifying_reservation_id' => $reservation->id,
                'reward_points_credited_at' => CarbonImmutable::now(),
            ]);

            // Update referrer profile stats
            CustomerReferralProfile::query()
                ->where('user_id', $referrer->id)
                ->increment('successful_referrals_count');

            if ($pointsCredited > 0) {
                CustomerReferralProfile::query()
                    ->where('user_id', $referrer->id)
                    ->increment('total_points_earned', $pointsCredited);
            }

            return $referral;
        });
    }

    private function generateUniqueReferralCode(User $user): string
    {
        $prefix = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $user->name) ?: 'TIJUM', 0, 4));

        do {
            $code = $prefix.strtoupper(Str::random(5));
        } while (CustomerReferralProfile::query()->where('referral_code', $code)->exists());

        return $code;
    }
}
