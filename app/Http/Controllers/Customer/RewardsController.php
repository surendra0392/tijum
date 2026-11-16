<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\CouponCode;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerReferral;
use App\Models\RewardsSetting;
use App\Models\User;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RewardsController extends Controller
{
    public function __construct(
        private readonly LoyaltyPointsService $pointsService,
        private readonly ReferralService $referralService,
    ) {}

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $wallet = $this->pointsService->getOrCreateWallet($user);
        $referralProfile = $this->referralService->getOrCreateProfile($user);

        $activeCoupons = CouponCode::query()->active()->latest('id')->limit(5)->get();
        $activeCouponsCount = $activeCoupons->count();

        $expiringSoon = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->expiringSoon(30)
            ->get(['points_remaining as points', 'expires_at']);

        $recentLedger = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(10)
            ->get();

        $referralData = [
            'referral_code' => $referralProfile->referral_code,
            'share_url' => url("/r/{$referralProfile->referral_code}"),
            'referral_link' => url("/r/{$referralProfile->referral_code}"),
            'total_referrals' => $referralProfile->total_referrals_count,
            'total_invites' => $referralProfile->total_referrals_count,
            'successful_referrals' => $referralProfile->successful_referrals_count,
            'total_points_earned' => $referralProfile->total_points_earned,
            'points_earned' => $referralProfile->total_points_earned,
            'pending_points' => 0,
            'referrer_reward' => (int) RewardsSetting::get('referral_referrer_reward_points', 500),
            'referrer_reward_points' => (int) RewardsSetting::get('referral_referrer_reward_points', 500),
            'referred_reward' => (int) RewardsSetting::get('referral_referred_reward_points', 250),
            'referred_reward_points' => (int) RewardsSetting::get('referral_referred_reward_points', 250),
        ];

        $activityData = $recentLedger->map(fn (CustomerPointsLedger $item) => [
            'id' => $item->id,
            'transaction_type' => $item->transaction_type->value,
            'type' => $item->transaction_type->value,
            'type_label' => $item->transaction_type->label(),
            'is_credit' => $item->transaction_type->isCredit(),
            'is_debit' => $item->transaction_type->isDebit(),
            'points' => $item->points,
            'status' => $item->status->value,
            'description' => $item->notes ?? $item->transaction_type->label(),
            'reference_code' => $item->reference_id ? "{$item->reference_type}-{$item->reference_id}" : ($item->idempotency_key ?? null),
            'inr_value_minor' => (int) round($item->points * 100),
            'created_at' => $item->created_at?->toIso8601String() ?? now()->toIso8601String(),
            'created_at_human' => $item->created_at?->format('d M Y, h:i A'),
        ])->all();

        $couponsData = $activeCoupons->map(fn (CouponCode $c) => [
            'id' => $c->id,
            'code' => $c->code,
            'title' => $c->description ?: $c->code,
            'description' => $c->description ?: 'Exclusive TIJUM promotional offer',
            'offer_type' => $c->offer_type->value,
            'offer_type_label' => $c->offer_type->label(),
            'discount_amount_minor' => $c->discount_amount_minor,
            'discount_percentage' => $c->discount_percentage,
            'max_discount_amount_minor' => $c->max_discount_amount_minor,
            'max_discount_minor' => $c->max_discount_amount_minor,
            'bonus_points' => $c->bonus_points,
            'min_booking_amount_minor' => $c->min_booking_amount_minor,
            'min_stay_days' => $c->min_stay_days,
            'funding_source' => $c->funding_source->value,
            'funding_source_label' => $c->funding_source->label(),
            'status' => 'active',
            'valid_from' => $c->starts_at?->toIso8601String() ?? now()->toIso8601String(),
            'valid_to' => $c->expires_at?->toIso8601String() ?? now()->addMonths(3)->toIso8601String(),
            'expires_at' => $c->expires_at?->format('d M Y') ?? 'Never expires',
        ])->all();

        return Inertia::render('customer/rewards/index', [
            'wallet' => [
                'available_points' => $wallet->available_points,
                'pending_points' => $wallet->pending_points,
                'reserved_points' => $wallet->reserved_points,
                'redeemed_points' => $wallet->redeemed_points,
                'expired_points' => $wallet->expired_points,
                'total_points_earned' => $wallet->total_points_earned,
                'total_earned_points' => $wallet->total_points_earned,
                'total_redeemed_points' => $wallet->redeemed_points,
                'expiring_points_30d' => (int) $expiringSoon->sum('points'),
                'estimated_inr_value' => $wallet->available_points * 1.0,
                'points_per_rupee' => 1.0,
                'max_redemption_percentage' => (int) RewardsSetting::get('points_max_booking_redemption_pct', 20),
            ],
            'referral' => $referralData,
            'referral_profile' => $referralData,
            'activeCoupons' => $couponsData,
            'active_coupons_count' => $activeCouponsCount,
            'expiring_soon_points' => $expiringSoon->map(fn (CustomerPointsLedger $e) => [
                'points' => (int) $e->points,
                'expires_at' => $e->expires_at?->format('d M Y'),
            ])->all(),
            'recentActivity' => $activityData,
            'recent_transactions' => $activityData,
        ]);
    }

    public function points(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $wallet = $this->pointsService->getOrCreateWallet($user);

        $expiringSoon = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->expiringSoon(30)
            ->get(['points_remaining as points', 'expires_at']);

        $ledger = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->paginate(20);

        return Inertia::render('customer/rewards/points', [
            'wallet' => [
                'available_points' => $wallet->available_points,
                'pending_points' => $wallet->pending_points,
                'reserved_points' => $wallet->reserved_points,
                'redeemed_points' => $wallet->redeemed_points,
                'expired_points' => $wallet->expired_points,
                'total_points_earned' => $wallet->total_points_earned,
                'total_earned_points' => $wallet->total_points_earned,
                'total_redeemed_points' => $wallet->redeemed_points,
                'expiring_points_30d' => (int) $expiringSoon->sum('points'),
                'estimated_inr_value' => $wallet->available_points * 1.0,
                'points_per_rupee' => 1.0,
                'max_redemption_percentage' => (int) RewardsSetting::get('points_max_booking_redemption_pct', 20),
            ],
            'ledger' => [
                'data' => collect($ledger->items())->map(fn (CustomerPointsLedger $item) => [
                    'id' => $item->id,
                    'transaction_type' => $item->transaction_type->value,
                    'type' => $item->transaction_type->value,
                    'type_label' => $item->transaction_type->label(),
                    'is_credit' => $item->transaction_type->isCredit(),
                    'is_debit' => $item->transaction_type->isDebit(),
                    'points' => $item->points,
                    'status' => $item->status->value,
                    'description' => $item->notes ?? $item->transaction_type->label(),
                    'reference_code' => $item->reference_id ? "{$item->reference_type}-{$item->reference_id}" : ($item->idempotency_key ?? null),
                    'inr_value_minor' => (int) round($item->points * 100),
                    'created_at' => $item->created_at?->toIso8601String() ?? now()->toIso8601String(),
                    'created_at_human' => $item->created_at?->format('d M Y, h:i A'),
                    'expires_at' => $item->expires_at?->format('d M Y'),
                    'expires_at_iso' => $item->expires_at?->toIso8601String(),
                ])->all(),
                'current_page' => $ledger->currentPage(),
                'last_page' => $ledger->lastPage(),
                'total' => $ledger->total(),
            ],
        ]);
    }

    public function referrals(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $profile = $this->referralService->getOrCreateProfile($user);

        $referrals = CustomerReferral::query()
            ->with('referred')
            ->where('referrer_user_id', $user->id)
            ->latest('id')
            ->get();

        $invitesList = $referrals->map(fn (CustomerReferral $r) => [
            'id' => $r->id,
            'code' => $profile->referral_code,
            'friend_name' => $r->referred->name,
            'friend_email_masked' => Str::mask($r->referred->email, '*', 3, -4),
            'referred_name' => $r->referred->name,
            'referred_email' => $r->referred->email,
            'referred_customer_name' => $r->referred->name,
            'status' => $r->status->value,
            'status_label' => $r->status->label(),
            'points_awarded' => (int) ($r->referrer_reward_points ?? 0),
            'reward_points' => (int) ($r->referrer_reward_points ?? 0),
            'points_reward' => (int) ($r->referrer_reward_points ?? 0),
            'created_at' => $r->created_at?->toIso8601String() ?? now()->toIso8601String(),
            'created_at_human' => $r->created_at?->format('d M Y'),
            'completed_at' => $r->reward_points_credited_at?->format('d M Y'),
            'stay_completed_at' => $r->reward_points_credited_at?->toIso8601String(),
        ])->all();

        $referralData = [
            'referral_code' => $profile->referral_code,
            'share_url' => url("/r/{$profile->referral_code}"),
            'referral_link' => url("/r/{$profile->referral_code}"),
            'total_referrals' => $profile->total_referrals_count,
            'total_invites' => $profile->total_referrals_count,
            'successful_referrals' => $profile->successful_referrals_count,
            'total_points_earned' => $profile->total_points_earned,
            'points_earned' => $profile->total_points_earned,
            'pending_points' => 0,
            'referrer_reward' => (int) RewardsSetting::get('referral_referrer_reward_points', 500),
            'referrer_reward_points' => (int) RewardsSetting::get('referral_referrer_reward_points', 500),
            'referred_reward' => (int) RewardsSetting::get('referral_referred_reward_points', 250),
            'referred_reward_points' => (int) RewardsSetting::get('referral_referred_reward_points', 250),
        ];

        return Inertia::render('customer/rewards/referrals', [
            'profile' => $referralData,
            'invites' => $invitesList,
            'referrals' => $invitesList,
        ]);
    }

    public function coupons(Request $request): Response
    {
        $coupons = CouponCode::query()
            ->active()
            ->with('campaign')
            ->latest('id')
            ->get();

        return Inertia::render('customer/rewards/coupons', [
            'coupons' => $coupons->map(fn (CouponCode $c) => [
                'id' => $c->id,
                'code' => $c->code,
                'title' => $c->description ?: $c->code,
                'description' => $c->description ?: 'Exclusive TIJUM promotional offer',
                'offer_type' => $c->offer_type->value,
                'offer_type_label' => $c->offer_type->label(),
                'discount_amount_minor' => $c->discount_amount_minor,
                'discount_percentage' => $c->discount_percentage,
                'max_discount_amount_minor' => $c->max_discount_amount_minor,
                'max_discount_minor' => $c->max_discount_amount_minor,
                'bonus_points' => $c->bonus_points,
                'min_booking_amount_minor' => $c->min_booking_amount_minor,
                'min_stay_days' => $c->min_stay_days,
                'funding_source' => $c->funding_source->value,
                'funding_source_label' => $c->funding_source->label(),
                'status' => 'active',
                'valid_from' => $c->starts_at?->toIso8601String() ?? now()->toIso8601String(),
                'valid_to' => $c->expires_at?->toIso8601String() ?? now()->addMonths(3)->toIso8601String(),
                'expires_at' => $c->expires_at?->format('d M Y') ?? 'Never expires',
            ])->all(),
        ]);
    }
}
