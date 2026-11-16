<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Api\V1\ApiController;
use App\Models\CouponCode;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerPointsWallet;
use App\Models\CustomerReferral;
use App\Models\CustomerReferralProfile;
use App\Models\Property;
use App\Models\RewardsSetting;
use App\Models\User;
use App\Services\Promotions\CentralPromotionEngine;
use App\Services\Promotions\CouponValidationService;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerRewardsController extends ApiController
{
    public function __construct(
        private readonly LoyaltyPointsService $pointsService,
        private readonly ReferralService $referralService,
        private readonly CouponValidationService $couponValidation,
        private readonly CentralPromotionEngine $promoEngine,
    ) {}

    /**
     * GET /api/v1/customer/rewards/overview
     */
    public function overview(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $wallet = $this->pointsService->getOrCreateWallet($user);
        $referralProfile = $this->referralService->getOrCreateProfile($user);

        $activeCouponsCount = CouponCode::query()->active()->count();

        $expiringSoon = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->expiringSoon(30)
            ->get(['points_remaining as points', 'expires_at']);

        $recentLedger = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->limit(10)
            ->get();

        return $this->success([
            'wallet' => $this->formatWallet($wallet),
            'referral_profile' => $this->formatReferralProfile($referralProfile),
            'active_coupons_count' => $activeCouponsCount,
            'expiring_soon_points' => $expiringSoon->map(fn (CustomerPointsLedger $e) => [
                'points' => (int) $e->points,
                'expires_at' => $e->expires_at?->toIso8601String(),
            ])->all(),
            'recent_transactions' => $recentLedger->map(fn (CustomerPointsLedger $item) => $this->formatLedgerItem($item))->all(),
        ]);
    }

    /**
     * GET /api/v1/customer/rewards/points
     */
    public function points(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $wallet = $this->pointsService->getOrCreateWallet($user);

        return $this->success([
            'wallet' => $this->formatWallet($wallet),
        ]);
    }

    /**
     * GET /api/v1/customer/rewards/points/ledger
     */
    public function ledger(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $wallet = $this->pointsService->getOrCreateWallet($user);

        $query = CustomerPointsLedger::query()
            ->where('user_id', $user->id)
            ->latest('id');

        if ($request->has('type') && $request->filled('type')) {
            $query->where('transaction_type', $request->input('type'));
        }

        $paginator = $query->paginate(20);

        return $this->success([
            'wallet' => $this->formatWallet($wallet),
            'ledger' => collect($paginator->items())->map(fn ($item) => $this->formatLedgerItem($item))->all(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * GET /api/v1/customer/rewards/referrals
     */
    public function referrals(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $profile = $this->referralService->getOrCreateProfile($user);

        $referrals = CustomerReferral::query()
            ->with('referred')
            ->where('referrer_user_id', $user->id)
            ->latest('id')
            ->get();

        return $this->success([
            'profile' => $this->formatReferralProfile($profile),
            'referrals' => $referrals->map(fn (CustomerReferral $r) => [
                'id' => $r->id,
                'referred_customer_name' => $r->referred->name,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'points_reward' => $r->referrer_reward_points,
                'created_at' => $r->created_at?->toIso8601String(),
                'completed_at' => $r->reward_points_credited_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    /**
     * GET /api/v1/customer/coupons
     */
    public function coupons(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $coupons = CouponCode::query()
            ->active()
            ->with('campaign')
            ->latest('id')
            ->get();

        return $this->success(
            $coupons->map(fn (CouponCode $c) => $this->formatCoupon($c))->all()
        );
    }

    /**
     * POST /api/v1/customer/coupons/validate
     */
    public function validateCoupon(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'code' => ['required', 'string'],
            'subtotal_paise' => ['required', 'integer', 'min:0'],
            'property_id' => ['nullable', 'integer'],
        ]);

        $property = isset($validated['property_id'])
            ? Property::query()->find($validated['property_id'])
            : Property::query()->first();

        if (! $property instanceof Property) {
            return $this->error('Property not found for coupon validation.', 'PROPERTY_NOT_FOUND', 404);
        }

        $result = $this->couponValidation->validate(
            code: (string) $validated['code'],
            user: $user,
            property: $property,
            bookingSubtotalMinor: (int) $validated['subtotal_paise'],
        );

        if (! $result['is_valid'] || $result['coupon'] === null) {
            return $this->success([
                'valid' => false,
                'message' => $result['error'] ?? 'Invalid coupon.',
            ]);
        }

        return $this->success([
            'valid' => true,
            'coupon' => $this->formatCoupon($result['coupon']),
            'discount_amount_paise' => $result['discount_amount_minor'],
            'bonus_points' => $result['bonus_points'],
            'message' => "Coupon '{$result['coupon']->code}' is valid!",
        ]);
    }

    /**
     * POST /api/v1/checkout/quote-promotions
     */
    public function quotePromotions(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'property_id' => ['required', 'integer'],
            'subtotal_paise' => ['required', 'integer', 'min:0'],
            'tax_amount_paise' => ['nullable', 'integer', 'min:0'],
            'deposit_amount_paise' => ['nullable', 'integer', 'min:0'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'points_to_redeem' => ['nullable', 'integer', 'min:0'],
        ]);

        /** @var Property $property */
        $property = Property::query()->findOrFail((int) $validated['property_id']);

        $subtotal = (int) $validated['subtotal_paise'];
        $tax = (int) ($validated['tax_amount_paise'] ?? 0);
        $deposit = (int) ($validated['deposit_amount_paise'] ?? 0);
        $couponCode = $validated['coupon_code'] ?? null;
        $points = (int) ($validated['points_to_redeem'] ?? 0);

        $calc = $this->promoEngine->calculate(
            user: $user,
            property: $property,
            subtotalMinor: $subtotal,
            taxMinor: $tax,
            couponCode: $couponCode,
            pointsToRedeem: $points,
        );

        return $this->success([
            'subtotal_paise' => $subtotal,
            'coupon_applied' => $calc['coupon_applied'] ? [
                'code' => (string) $calc['coupon_code'],
                'offer_type' => $calc['coupon_funding_source'] ?? 'standard',
                'discount_amount_paise' => $calc['coupon_discount_minor'],
                'points_awarded' => $calc['coupon_bonus_points'],
            ] : null,
            'coupon_discount_paise' => $calc['coupon_discount_minor'],
            'tax_amount_paise' => $tax,
            'deposit_amount_paise' => $deposit,
            'points_redeemed' => $calc['points_redeemed'],
            'points_discount_paise' => $calc['points_discount_minor'],
            'final_payable_paise' => $calc['total_payable_minor'] + $deposit,
            'points_to_earn_on_completion' => $calc['points_potential_earned'],
            'is_valid' => $calc['is_valid'],
            'messages' => $calc['messages'],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatWallet(CustomerPointsWallet $wallet): array
    {
        return [
            'available_points' => $wallet->available_points,
            'pending_points' => $wallet->pending_points,
            'reserved_points' => $wallet->reserved_points,
            'redeemed_points' => $wallet->redeemed_points,
            'expired_points' => $wallet->expired_points,
            'total_earned_points' => $wallet->total_points_earned,
            'point_to_inr_rate' => 1.0,
            'estimated_inr_value' => $wallet->available_points * 1.0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatReferralProfile(CustomerReferralProfile $profile): array
    {
        $code = $profile->referral_code;

        return [
            'referral_code' => $code,
            'referral_link' => url("/r/{$code}"),
            'referrer_reward_points' => (int) RewardsSetting::get('referral_referrer_reward_points', 500),
            'referee_reward_points' => (int) RewardsSetting::get('referral_referred_reward_points', 250),
            'total_referrals_count' => $profile->total_referrals_count,
            'completed_referrals_count' => $profile->successful_referrals_count,
            'pending_referrals_count' => max(0, $profile->total_referrals_count - $profile->successful_referrals_count),
            'total_points_earned' => $profile->total_points_earned,
            'pending_points_expected' => max(0, $profile->total_referrals_count - $profile->successful_referrals_count) * 500,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatLedgerItem(CustomerPointsLedger $item): array
    {
        return [
            'id' => $item->id,
            'transaction_type' => $item->transaction_type->value,
            'transaction_type_label' => $item->transaction_type->label(),
            'points' => $item->points,
            'direction' => $item->points >= 0 ? 'credit' : 'debit',
            'status' => $item->status->value,
            'description' => $item->notes ?? $item->transaction_type->label(),
            'created_at' => $item->created_at?->toIso8601String(),
            'expires_at' => $item->expires_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formatCoupon(CouponCode $c): array
    {
        return [
            'id' => $c->id,
            'code' => $c->code,
            'title' => $c->description ?? "Promo Code {$c->code}",
            'offer_type' => $c->offer_type->value,
            'discount_amount_paise' => $c->discount_amount_minor,
            'discount_percentage' => $c->discount_percentage,
            'max_discount_paise' => $c->max_discount_amount_minor,
            'bonus_points' => $c->bonus_points,
            'min_booking_amount_paise' => $c->min_booking_amount_minor,
            'min_stay_days' => $c->min_stay_days,
            'funding_source' => $c->funding_source->value,
            'expires_at' => $c->expires_at?->toIso8601String(),
        ];
    }
}
