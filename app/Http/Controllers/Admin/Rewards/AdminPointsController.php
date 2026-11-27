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
use RuntimeException;

class AdminPointsController extends Controller
{
    public function __construct(
        private readonly LoyaltyPointsService $pointsService,
    ) {}

    public function index(): Response
    {
        $earningBps = (int) RewardsSetting::get('points_earning_rate_bps', 500);
        $redemptionRatePaise = (int) RewardsSetting::get('points_redemption_rate_paise', 100);
        $minBalance = (int) RewardsSetting::get('points_redemption_min_balance', 100);
        $maxPercentage = (int) RewardsSetting::get('points_redemption_max_percentage', 50);
        $expiryDays = (int) RewardsSetting::get('points_expiry_days', 365);
        $referrerPoints = (int) RewardsSetting::get('referral_referrer_reward_points', 500);
        $referredPoints = (int) RewardsSetting::get('referral_referred_reward_points', 250);
        $maxReferrals = (int) RewardsSetting::get('referral_max_successful_referrals', 5);
        $minBookingMinor = (int) RewardsSetting::get('referral_min_booking_value_minor', 100000);

        $settings = [
            'points_earning_rate_bps' => $earningBps,
            'points_redemption_rate_paise' => $redemptionRatePaise,
            'points_redemption_min_balance' => $minBalance,
            'points_redemption_max_percentage' => $maxPercentage,
            'points_expiry_days' => $expiryDays,
            'referral_referrer_reward_points' => $referrerPoints,
            'referral_referred_reward_points' => $referredPoints,
            'referral_max_successful_referrals' => $maxReferrals,
            'referral_min_booking_value_minor' => $minBookingMinor,
        ];

        $config = [
            'points_earn_per_hundred_inr' => round($earningBps / 100, 2),
            'points_to_inr_multiplier' => round($redemptionRatePaise / 100, 2),
            'points_expiry_days' => $expiryDays,
            'max_redemption_percent_of_subtotal' => $maxPercentage,
            'min_points_to_redeem' => $minBalance,
            'referrer_points_per_stay' => $referrerPoints,
            'referred_points_per_stay' => $referredPoints,
            'auto_qualification_hours' => 24,
        ];

        $wallets = CustomerPointsWallet::query()
            ->with('user')
            ->orderByDesc('available_points')
            ->limit(15)
            ->get();

        $ledgerEntries = CustomerPointsLedger::query()
            ->with(['user', 'admin'])
            ->latest('id')
            ->limit(100)
            ->get();

        $adjustments = CustomerPointsLedger::query()
            ->with(['user', 'admin'])
            ->where('transaction_type', 'admin_adjustment')
            ->latest('id')
            ->limit(15)
            ->get();

        return Inertia::render('admin/rewards/points/index', [
            'config' => $config,
            'ledger' => $ledgerEntries->map(fn (CustomerPointsLedger $entry): array => [
                'id' => $entry->id,
                'transaction_type' => $entry->transaction_type->value,
                'type_label' => $entry->transaction_type->label(),
                'status' => $entry->status->value,
                'points' => $entry->points,
                'inr_value_minor' => $entry->inr_equivalent_minor,
                'description' => $entry->notes ?: ($entry->user->name.' · '.$entry->transaction_type->label()),
                'reference_code' => $entry->idempotency_key ?? ($entry->reference_id !== null ? '#'.$entry->reference_id : null),
                'expires_at' => $entry->expires_at?->toIso8601String(),
                'created_at' => $entry->created_at?->toIso8601String() ?? now()->toIso8601String(),
            ])->all(),
            'settings' => $settings,
            'wallets' => $wallets->map(fn (CustomerPointsWallet $w): array => [
                'user_id' => $w->user_id,
                'customer_name' => $w->user->name,
                'customer_email' => $w->user->email,
                'available_points' => $w->available_points,
                'pending_points' => $w->pending_points,
                'redeemed_points' => $w->redeemed_points,
                'total_earned_points' => $w->total_points_earned,
            ])->all(),
            'adjustments' => $adjustments->map(fn (CustomerPointsLedger $a): array => [
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
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(401);
        }

        if ($request->filled('customer_identifier')) {
            $validated = $request->validate([
                'customer_identifier' => ['required', 'string', 'max:255'],
                'adjustment_type' => ['required', 'in:manual_credit,manual_debit'],
                'points' => ['required', 'integer', 'min:1'],
                'audit_reason' => ['required', 'string', 'max:255'],
            ]);

            $identifier = trim((string) $validated['customer_identifier']);
            $user = ctype_digit($identifier)
                ? User::query()->find((int) $identifier)
                : User::query()->whereRaw('LOWER(email) = ?', [strtolower($identifier)])->first();

            if (! $user instanceof User) {
                return back()->withErrors([
                    'customer_identifier' => 'No customer account found matching that email or ID.',
                ]);
            }

            $pointsDelta = $validated['adjustment_type'] === 'manual_debit'
                ? -abs((int) $validated['points'])
                : abs((int) $validated['points']);
            $reason = (string) $validated['audit_reason'];
        } else {
            $validated = $request->validate([
                'user_id' => ['required', 'integer', 'exists:users,id'],
                'points' => ['required', 'integer', 'not_in:0'],
                'reason' => ['required', 'string', 'max:255'],
            ]);

            /** @var User $user */
            $user = User::query()->findOrFail($validated['user_id']);
            $pointsDelta = (int) $validated['points'];
            $reason = (string) $validated['reason'];
        }

        try {
            $this->pointsService->adjustPoints(
                user: $user,
                pointsDelta: $pointsDelta,
                reason: $reason,
                admin: $admin,
            );
        } catch (RuntimeException $e) {
            return back()->withErrors(['points' => $e->getMessage()]);
        }

        return back()->with('status', "Points adjusted for customer {$user->name}.");
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        if ($request->has('points_earn_per_hundred_inr') || $request->has('points_to_inr_multiplier')) {
            $validated = $request->validate([
                'points_earn_per_hundred_inr' => ['required', 'numeric', 'min:0', 'max:50'],
                'points_to_inr_multiplier' => ['required', 'numeric', 'min:0.1', 'max:10'],
                'points_expiry_days' => ['required', 'integer', 'min:30', 'max:730'],
                'max_redemption_percent_of_subtotal' => ['required', 'integer', 'min:1', 'max:100'],
                'min_points_to_redeem' => ['nullable', 'integer', 'min:0'],
                'referrer_points_per_stay' => ['required', 'integer', 'min:0'],
                'referred_points_per_stay' => ['required', 'integer', 'min:0'],
            ]);

            RewardsSetting::set('points_earning_rate_bps', (int) round(((float) $validated['points_earn_per_hundred_inr']) * 100));
            RewardsSetting::set('points_redemption_rate_paise', (int) round(((float) $validated['points_to_inr_multiplier']) * 100));
            RewardsSetting::set('points_expiry_days', (int) $validated['points_expiry_days']);
            RewardsSetting::set('points_redemption_max_percentage', (int) $validated['max_redemption_percent_of_subtotal']);
            if (array_key_exists('min_points_to_redeem', $validated) && $validated['min_points_to_redeem'] !== null) {
                RewardsSetting::set('points_redemption_min_balance', (int) $validated['min_points_to_redeem']);
            }
            RewardsSetting::set('referral_referrer_reward_points', (int) $validated['referrer_points_per_stay']);
            RewardsSetting::set('referral_referred_reward_points', (int) $validated['referred_points_per_stay']);

            return back()->with('status', 'Rewards settings updated successfully.');
        }

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
