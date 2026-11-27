<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\RewardsSetting;
use App\Models\User;
use App\Services\ReservationData;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class DashboardController extends Controller
{
    public function __invoke(
        Request $request,
        ReservationData $reservationData,
        ReferralService $referralService,
        LoyaltyPointsService $pointsService
    ): Response {
        $user = $request->user('web');

        if (! $user instanceof User) {
            abort(403);
        }

        $emailVerified = $user->hasVerifiedEmail();
        $phoneAdded = $user->phone !== null && $user->phone !== '';
        $phoneVerified = $user->phone_verified_at !== null;

        $incompleteFields = [];
        if (! $emailVerified) {
            $incompleteFields[] = 'email_verification';
        }
        if (! $phoneAdded) {
            $incompleteFields[] = 'phone';
        }

        $twoFactorSupported = Features::canManageTwoFactorAuthentication();
        $passkeysSupported = Features::canManagePasskeys();
        $reservationQuery = Reservation::query()->where('user_id', $user->id);
        $recentReservations = (clone $reservationQuery)
            ->with(['property', 'roomType', 'successfulPayment', 'review'])
            ->latest('created_at')
            ->latest('id')
            ->limit(3)
            ->get()
            ->map(fn (Reservation $reservation): array => $reservationData->summary($reservation))
            ->all();

        $activeStayModel = (clone $reservationQuery)
            ->where('status', ReservationStatus::Confirmed->value)
            ->whereNull('checked_out_at')
            ->whereDate('checkout_date', '>=', CarbonImmutable::now('Asia/Kolkata')->toDateString())
            ->with(['property', 'roomType', 'successfulPayment', 'review'])
            ->orderBy('check_in_date')
            ->first();

        $activeStay = $activeStayModel !== null ? $reservationData->summary($activeStayModel) : null;

        $wallet = $pointsService->getOrCreateWallet($user);
        $referralProfile = $referralService->getOrCreateProfile($user);
        $redemptionRatePaise = max(1, (int) RewardsSetting::get('points_redemption_rate_paise', 100));

        return Inertia::render('dashboard', [
            'customer' => $user->toCustomerAccountArray(),
            'activeStay' => $activeStay,
            'accountOverview' => [
                'emailVerified' => $emailVerified,
                'phoneAdded' => $phoneAdded,
                'phoneVerified' => $phoneVerified,
                'incompleteFields' => $incompleteFields,
                'profileComplete' => $incompleteFields === [],
            ],
            'securitySummary' => [
                'passwordConfigured' => $user->password !== '',
                'twoFactorSupported' => $twoFactorSupported,
                'twoFactorEnabled' => $twoFactorSupported && $user->hasEnabledTwoFactorAuthentication(),
                'twoFactorConfirmed' => $twoFactorSupported && $user->two_factor_confirmed_at !== null,
                'passkeysSupported' => $passkeysSupported,
                'passkeyCount' => $passkeysSupported ? $user->passkeys()->count() : 0,
            ],
            'reservationSummary' => [
                'total' => (clone $reservationQuery)->count(),
                'pending' => (clone $reservationQuery)->where('status', ReservationStatus::AwaitingPayment->value)->count(),
                'confirmed' => (clone $reservationQuery)->where('status', ReservationStatus::Confirmed->value)->count(),
            ],
            'referral' => [
                'referral_code' => $referralProfile->referral_code,
                'share_url' => url("/r/{$referralProfile->referral_code}"),
                'total_referrals' => $referralProfile->total_referrals_count,
                'successful_referrals' => $referralProfile->successful_referrals_count,
                'total_points_earned' => $referralProfile->total_points_earned,
                'referrer_reward' => (int) RewardsSetting::get('referral_referrer_reward_points', 500),
                'referred_reward' => (int) RewardsSetting::get('referral_referred_reward_points', 250),
            ],
            'wallet' => [
                'available_points' => $wallet->available_points,
                'estimated_inr_value' => round(($wallet->available_points * $redemptionRatePaise) / 100, 2),
            ],
            'recentReservations' => $recentReservations,
            'status' => $request->session()->get('status'),
        ]);
    }
}
