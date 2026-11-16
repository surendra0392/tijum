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

        // Attach cookie for 30 days
        $cookie = Cookie::make('tijum_referral_code', $normalizedCode, 60 * 24 * 30);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => $profile !== null,
                'referral_code' => $normalizedCode,
                'referrer_name' => $profile?->user->name ?? 'A TIJUM Member',
            ])->withCookie($cookie);
        }

        // If user is already logged in, redirect to rewards page
        if ($request->user()) {
            return redirect()->route('customer.rewards.index')
                ->with('status', "Referral code {$normalizedCode} registered.")
                ->withCookie($cookie);
        }

        return redirect()->route('register')
            ->with('status', "You were invited by {$profile?->user?->name}! Register to claim your ₹250 welcome rewards points on your first completed stay.")
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
