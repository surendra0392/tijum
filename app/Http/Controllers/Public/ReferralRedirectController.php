<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\CustomerReferralProfile;
use App\Models\RewardsSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Inertia\Response;

class ReferralRedirectController extends Controller
{
    public function handle(Request $request, string $code): RedirectResponse|Response|JsonResponse
    {
        $normalizedCode = strtoupper(trim($code));

        $profile = CustomerReferralProfile::query()
            ->with('user')
            ->where('referral_code', $normalizedCode)
            ->where('is_blocked', false)
            ->first();

        if ($profile === null) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'This referral link is invalid or no longer active.',
                ], 404);
            }

            return redirect()->route($request->user() ? 'customer.rewards.index' : 'register')
                ->with('error', 'This referral link is invalid or no longer active.');
        }

        // Attach cookie for 30 days only for verified active referral codes
        $cookie = Cookie::make('tijum_referral_code', $profile->referral_code, 60 * 24 * 30);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'referral_code' => $profile->referral_code,
                'referrer_name' => $profile->user->name,
            ])->withCookie($cookie);
        }

        // If user is already logged in, redirect to rewards page
        if ($request->user()) {
            return redirect()->route('customer.rewards.index')
                ->with('status', "Referral code {$profile->referral_code} noted. Referral bonuses apply to new customer registrations.")
                ->withCookie($cookie);
        }

        $referredPoints = (int) RewardsSetting::get('referral_referred_reward_points', 250);
        $ratePaise = max(1, (int) RewardsSetting::get('points_redemption_rate_paise', 100));
        $rewardInr = number_format(($referredPoints * $ratePaise) / 100, 0);

        return redirect()->route('register')
            ->with('status', "You were invited by {$profile->user->name}! Register to earn {$referredPoints} welcome points (worth ₹{$rewardInr}) upon your first completed stay.")
            ->withCookie($cookie);
    }

    /**
     * Live AJAX validation for customer registration referral code entry.
     */
    public function validateCode(Request $request): JsonResponse
    {
        $code = strtoupper(trim((string) $request->input('code', '')));

        if ($code === '') {
            return response()->json([
                'valid' => false,
                'message' => 'Please enter a referral code.',
            ]);
        }

        $profile = CustomerReferralProfile::query()
            ->with('user')
            ->where('referral_code', $code)
            ->first();

        if ($profile === null) {
            return response()->json([
                'valid' => false,
                'message' => 'Referral code not found. Please check and try again.',
            ]);
        }

        if ($profile->is_blocked) {
            return response()->json([
                'valid' => false,
                'message' => 'This referral code is inactive.',
            ]);
        }

        $referrer = $profile->user;
        if ($request->user() && $request->user()->id === $referrer->id) {
            return response()->json([
                'valid' => false,
                'message' => 'You cannot use your own referral code.',
            ]);
        }

        $referredReward = (int) RewardsSetting::get('referral_referred_reward_points', 250);

        return response()->json([
            'valid' => true,
            'code' => $profile->referral_code,
            'referrer_name' => $referrer->name,
            'reward_points' => $referredReward,
            'message' => "Valid code from {$referrer->name}! You will receive {$referredReward} bonus points instantly on registration.",
        ]);
    }
}
