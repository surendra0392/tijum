<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Rewards;

use App\Enums\ReferralStatus;
use App\Http\Controllers\Controller;
use App\Models\CouponCode;
use App\Models\CouponRedemption;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerPointsWallet;
use App\Models\CustomerReferral;
use App\Models\PromotionalCampaign;
use Inertia\Inertia;
use Inertia\Response;

class AdminRewardsOverviewController extends Controller
{
    public function index(): Response
    {
        $totalCampaigns = PromotionalCampaign::query()->count();
        $activeCampaigns = PromotionalCampaign::query()->where('status', 'active')->count();

        $totalCoupons = CouponCode::query()->count();
        $totalRedemptions = CouponRedemption::query()->count();
        $totalDiscountGivenMinor = (int) CouponRedemption::query()->where('is_reverted', false)->sum('discount_amount_minor');
        $platformFundedDiscountMinor = (int) CouponRedemption::query()->where('is_reverted', false)->sum('platform_funded_amount_minor');
        $propertyFundedDiscountMinor = (int) CouponRedemption::query()->where('is_reverted', false)->sum('property_funded_amount_minor');

        $totalPointsIssued = (int) CustomerPointsWallet::query()->sum('total_points_earned');
        $totalPointsRedeemed = (int) CustomerPointsWallet::query()->sum('redeemed_points');
        $totalPointsOutstanding = (int) CustomerPointsWallet::query()->sum('available_points');

        $totalReferrals = CustomerReferral::query()->count();
        $qualifiedReferrals = CustomerReferral::query()->whereIn('status', [
            ReferralStatus::Qualified->value,
            ReferralStatus::RewardCredited->value,
        ])->count();

        $duplicateIps = CustomerReferral::query()
            ->whereNotNull('attribution_ip')
            ->where('attribution_ip', '!=', '')
            ->groupBy('attribution_ip')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('attribution_ip')
            ->all();

        $duplicateDevices = CustomerReferral::query()
            ->whereNotNull('attribution_device_fingerprint')
            ->where('attribution_device_fingerprint', '!=', '')
            ->groupBy('attribution_device_fingerprint')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('attribution_device_fingerprint')
            ->all();

        $referralFraudAlertsCount = CustomerReferral::query()
            ->where(function ($query) use ($duplicateIps, $duplicateDevices): void {
                $query->where('status', ReferralStatus::Disqualified->value);
                if ($duplicateIps !== []) {
                    $query->orWhereIn('attribution_ip', $duplicateIps);
                }
                if ($duplicateDevices !== []) {
                    $query->orWhereIn('attribution_device_fingerprint', $duplicateDevices);
                }
            })
            ->count();

        $topCoupons = CouponCode::query()
            ->with('campaign')
            ->orderByDesc('total_used_count')
            ->latest('id')
            ->limit(8)
            ->get();

        $recentRedemptions = CouponRedemption::query()
            ->with(['couponCode', 'user', 'reservation'])
            ->latest('id')
            ->limit(8)
            ->get();

        $recentLedger = CustomerPointsLedger::query()
            ->with(['user', 'admin'])
            ->latest('id')
            ->limit(8)
            ->get();

        return Inertia::render('admin/rewards/index', [
            'metrics' => [
                // Keys consumed by AdminRewardsDashboard (admin/rewards/index.tsx)
                'active_campaigns_count' => $activeCampaigns,
                'total_coupons_redeemed' => $totalRedemptions,
                'total_discount_disbursed_minor' => $totalDiscountGivenMinor,
                'platform_funded_discount_minor' => $platformFundedDiscountMinor,
                'property_funded_discount_minor' => $propertyFundedDiscountMinor,
                'active_loyalty_points_outstanding' => $totalPointsOutstanding,
                'total_referrals_count' => $totalReferrals,
                'successful_stays_count' => $qualifiedReferrals,
                'referral_fraud_alerts_count' => $referralFraudAlertsCount,

                // Preserved legacy summary keys
                'total_campaigns' => $totalCampaigns,
                'active_campaigns' => $activeCampaigns,
                'total_coupons' => $totalCoupons,
                'total_redemptions' => $totalRedemptions,
                'total_discount_given_minor' => $totalDiscountGivenMinor,
                'total_points_issued' => $totalPointsIssued,
                'total_points_redeemed' => $totalPointsRedeemed,
                'total_points_outstanding' => $totalPointsOutstanding,
                'total_referrals' => $totalReferrals,
                'qualified_referrals' => $qualifiedReferrals,
            ],
            'topCampaigns' => $topCoupons->map(function (CouponCode $coupon): array {
                $campaign = $coupon->campaign;

                return [
                    'id' => $coupon->campaign_id,
                    'code' => $coupon->code,
                    'title' => $campaign !== null ? $campaign->name : $coupon->code,
                    'description' => $coupon->description ?? ($campaign !== null ? ($campaign->description ?? '') : ''),
                    'offer_type' => $coupon->offer_type->value,
                    'discount_percentage' => $coupon->discount_percentage,
                    'discount_amount_minor' => $coupon->discount_amount_minor,
                    'max_discount_minor' => $coupon->max_discount_amount_minor,
                    'min_booking_amount_minor' => $coupon->min_booking_amount_minor,
                    'funding_source' => $coupon->funding_source->value,
                    'valid_from' => ($coupon->starts_at ?? $campaign?->starts_at)?->toIso8601String() ?? '',
                    'valid_to' => ($coupon->expires_at ?? $campaign?->ends_at)?->toIso8601String() ?? '',
                    'usage_limit_total' => $coupon->total_usage_limit,
                    'usage_limit_per_user' => $coupon->per_user_limit,
                    'usage_count' => $coupon->total_used_count,
                    'status' => $campaign !== null ? $campaign->status->value : ($coupon->is_active ? 'active' : 'paused'),
                ];
            })->all(),
            'recentAdjustments' => $recentLedger->map(fn (CustomerPointsLedger $entry): array => [
                'id' => $entry->id,
                'transaction_type' => $entry->transaction_type->value,
                'type_label' => $entry->transaction_type->label(),
                'status' => $entry->status->value,
                'points' => $entry->points,
                'inr_value_minor' => $entry->inr_equivalent_minor,
                'description' => $entry->notes ?: ($entry->user->name.' · '.$entry->transaction_type->label()),
                'reference_code' => $entry->idempotency_key ?? ($entry->reference_id !== null ? '#'.$entry->reference_id : null),
                'created_at' => $entry->created_at?->toIso8601String() ?? now()->toIso8601String(),
            ])->all(),
            'recent_redemptions' => $recentRedemptions->map(fn (CouponRedemption $r): array => [
                'id' => $r->id,
                'code' => $r->couponCode !== null ? $r->couponCode->code : 'N/A',
                'customer_name' => $r->user !== null ? $r->user->name : 'Guest',
                'booking_reference' => $r->reservation !== null ? $r->reservation->booking_reference : 'N/A',
                'discount_minor' => $r->discount_amount_minor,
                'redeemed_at' => $r->redeemed_at?->format('d M Y, h:i A'),
            ])->all(),
            'recent_ledger' => $recentLedger->map(fn (CustomerPointsLedger $l): array => [
                'id' => $l->id,
                'customer_name' => $l->user->name,
                'type' => $l->transaction_type->label(),
                'points' => $l->points,
                'status' => $l->status->label(),
                'created_at' => $l->created_at?->format('d M Y, h:i A'),
            ])->all(),
        ]);
    }
}
