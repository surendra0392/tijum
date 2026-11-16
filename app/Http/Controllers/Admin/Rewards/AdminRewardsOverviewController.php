<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Rewards;

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

        $totalPointsIssued = (int) CustomerPointsWallet::query()->sum('total_points_earned');
        $totalPointsRedeemed = (int) CustomerPointsWallet::query()->sum('redeemed_points');
        $totalPointsOutstanding = (int) CustomerPointsWallet::query()->sum('available_points');

        $totalReferrals = CustomerReferral::query()->count();
        $qualifiedReferrals = CustomerReferral::query()->whereIn('status', ['qualified', 'reward_credited'])->count();

        $recentRedemptions = CouponRedemption::query()
            ->with(['couponCode', 'user', 'reservation'])
            ->latest('id')
            ->limit(8)
            ->get();

        $recentLedger = CustomerPointsLedger::query()
            ->with('user')
            ->latest('id')
            ->limit(8)
            ->get();

        return Inertia::render('admin/rewards/index', [
            'metrics' => [
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
            'recent_redemptions' => $recentRedemptions->map(fn (CouponRedemption $r) => [
                'id' => $r->id,
                'code' => $r->couponCode !== null ? $r->couponCode->code : 'N/A',
                'customer_name' => $r->user !== null ? $r->user->name : 'Guest',
                'booking_reference' => $r->reservation !== null ? $r->reservation->booking_reference : 'N/A',
                'discount_minor' => $r->discount_amount_minor,
                'redeemed_at' => $r->redeemed_at?->format('d M Y, h:i A'),
            ])->all(),
            'recent_ledger' => $recentLedger->map(fn (CustomerPointsLedger $l) => [
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
