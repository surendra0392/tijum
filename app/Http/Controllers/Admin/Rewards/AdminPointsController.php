<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Rewards;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\CustomerPointsLedger;
use App\Models\CustomerPointsWallet;
use App\Models\RewardsSetting;
use App\Models\User;
use App\Services\Rewards\LoyaltyPointsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminPointsController extends Controller
{
    public function __construct(
        private readonly LoyaltyPointsService $pointsService,
    ) {}

    public function index(): Response
    {
        $settings = [
            'points_earning_rate_bps' => (int) RewardsSetting::get('points_earning_rate_bps', 500),
            'points_redemption_rate_paise' => (int) RewardsSetting::get('points_redemption_rate_paise', 100),
            'points_redemption_min_balance' => (int) RewardsSetting::get('points_redemption_min_balance', 100),
            'points_redemption_max_percentage' => (int) RewardsSetting::get('points_redemption_max_percentage', 50),
            'points_expiry_days' => (int) RewardsSetting::get('points_expiry_days', 365),
            'referral_referrer_reward_points' => (int) RewardsSetting::get('referral_referrer_reward_points', 500),
            'referral_referred_reward_points' => (int) RewardsSetting::get('referral_referred_reward_points', 250),
            'referral_max_successful_referrals' => (int) RewardsSetting::get('referral_max_successful_referrals', 5),
            'referral_min_booking_value_minor' => (int) RewardsSetting::get('referral_min_booking_value_minor', 100000),
        ];

        $wallets = CustomerPointsWallet::query()
            ->with('user')
            ->orderByDesc('available_points')
            ->limit(15)
            ->get();

        $adjustments = CustomerPointsLedger::query()
            ->with(['user', 'admin'])
            ->where('transaction_type', 'admin_adjustment')
            ->latest('id')
            ->limit(15)
            ->get();

        return Inertia::render('admin/rewards/points/index', [
            'settings' => $settings,
            'wallets' => $wallets->map(fn (CustomerPointsWallet $w) => [
                'user_id' => $w->user_id,
                'customer_name' => $w->user->name,
                'customer_email' => $w->user->email,
                'available_points' => $w->available_points,
                'pending_points' => $w->pending_points,
                'redeemed_points' => $w->redeemed_points,
                'total_earned_points' => $w->total_points_earned,
            ])->all(),
            'adjustments' => $adjustments->map(fn (CustomerPointsLedger $a) => [
                'id' => $a->id,
                'customer_name' => $a->user->name,
                'admin_name' => $a->admin !== null ? $a->admin->name : 'System',
                'points' => $a->points,
                'notes' => $a->notes,
                'created_at' => $a->created_at?->format('d M Y, h:i A'),
            ])->all(),
        ]);
    }

    public function adjust(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'points' => ['required', 'integer', 'not_in:0'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        /** @var User $user */
        $user = User::query()->findOrFail($validated['user_id']);
        /** @var Admin $admin */
        $admin = $request->user();

        $this->pointsService->adjustPoints(
            user: $user,
            pointsDelta: (int) $validated['points'],
            reason: (string) $validated['reason'],
            admin: $admin,
        );

        return back()->with('status', "Points adjusted for customer {$user->name}.");
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'points_earning_rate_bps' => ['required', 'integer', 'min:0', 'max:5000'],
            'points_redemption_rate_paise' => ['required', 'integer', 'min:1'],
            'points_redemption_min_balance' => ['required', 'integer', 'min:0'],
            'points_redemption_max_percentage' => ['required', 'integer', 'min:1', 'max:100'],
            'points_expiry_days' => ['required', 'integer', 'min:30'],
            'referral_referrer_reward_points' => ['required', 'integer', 'min:0'],
            'referral_referred_reward_points' => ['required', 'integer', 'min:0'],
            'referral_max_successful_referrals' => ['required', 'integer', 'min:1', 'max:100'],
            'referral_min_booking_value_inr' => ['required', 'numeric', 'min:0'],
        ]);

        RewardsSetting::set('points_earning_rate_bps', (int) $validated['points_earning_rate_bps']);
        RewardsSetting::set('points_redemption_rate_paise', (int) $validated['points_redemption_rate_paise']);
        RewardsSetting::set('points_redemption_min_balance', (int) $validated['points_redemption_min_balance']);
        RewardsSetting::set('points_redemption_max_percentage', (int) $validated['points_redemption_max_percentage']);
        RewardsSetting::set('points_expiry_days', (int) $validated['points_expiry_days']);
        RewardsSetting::set('referral_referrer_reward_points', (int) $validated['referral_referrer_reward_points']);
        RewardsSetting::set('referral_referred_reward_points', (int) $validated['referral_referred_reward_points']);
        RewardsSetting::set('referral_max_successful_referrals', (int) $validated['referral_max_successful_referrals']);
        RewardsSetting::set('referral_min_booking_value_minor', (int) ($validated['referral_min_booking_value_inr'] * 100));

        return back()->with('status', 'Rewards settings updated successfully.');
    }
}
