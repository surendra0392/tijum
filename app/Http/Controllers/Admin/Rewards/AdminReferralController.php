<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Rewards;

use App\Enums\ReferralStatus;
use App\Http\Controllers\Controller;
use App\Models\CustomerReferral;
use App\Models\CustomerReferralProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminReferralController extends Controller
{
    public function index(Request $request): Response
    {
        $query = CustomerReferral::query()
            ->with(['referrer', 'referred', 'qualifyingReservation'])
            ->latest('id');

        if ($request->has('status') && $request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('search') && $request->filled('search')) {
            $search = '%'.$request->input('search').'%';
            $query->where(function ($q) use ($search): void {
                $q->where('referral_code_used', 'like', $search)
                    ->orWhereHas('referrer', fn ($rq) => $rq->where('name', 'like', $search)->orWhere('email', 'like', $search))
                    ->orWhereHas('referred', fn ($rq) => $rq->where('name', 'like', $search)->orWhere('email', 'like', $search));
            });
        }

        $referrals = $query->paginate(20)->withQueryString();

        $allReferrals = CustomerReferral::query()
            ->with(['referrer', 'referred', 'qualifyingReservation'])
            ->latest('id')
            ->limit(200)
            ->get();

        $ipCounts = $allReferrals
            ->filter(fn (CustomerReferral $r): bool => is_string($r->attribution_ip) && $r->attribution_ip !== '')
            ->countBy('attribution_ip');

        $deviceCounts = $allReferrals
            ->filter(fn (CustomerReferral $r): bool => is_string($r->attribution_device_fingerprint) && $r->attribution_device_fingerprint !== '')
            ->countBy('attribution_device_fingerprint');

        $blockedReferrerIds = CustomerReferralProfile::query()
            ->where('is_blocked', true)
            ->pluck('user_id')
            ->all();

        $fraudQueue = $allReferrals
            ->filter(function (CustomerReferral $r) use ($ipCounts, $deviceCounts, $blockedReferrerIds): bool {
                $hasIpMatch = is_string($r->attribution_ip) && $r->attribution_ip !== '' && ($ipCounts->get($r->attribution_ip, 0) > 1);
                $hasDeviceMatch = is_string($r->attribution_device_fingerprint) && $r->attribution_device_fingerprint !== '' && ($deviceCounts->get($r->attribution_device_fingerprint, 0) > 1);
                $isBlockedReferrer = in_array($r->referrer_user_id, $blockedReferrerIds, true);

                return $r->status === ReferralStatus::Disqualified || $hasIpMatch || $hasDeviceMatch || $isBlockedReferrer;
            })
            ->map(function (CustomerReferral $r) use ($ipCounts, $deviceCounts, $blockedReferrerIds): array {
                $hasIpMatch = is_string($r->attribution_ip) && $r->attribution_ip !== '' && ($ipCounts->get($r->attribution_ip, 0) > 1);
                $hasDeviceMatch = is_string($r->attribution_device_fingerprint) && $r->attribution_device_fingerprint !== '' && ($deviceCounts->get($r->attribution_device_fingerprint, 0) > 1);
                $isBlockedReferrer = in_array($r->referrer_user_id, $blockedReferrerIds, true);

                $reasons = [];
                if (is_string($r->disqualification_reason) && $r->disqualification_reason !== '') {
                    $reasons[] = $r->disqualification_reason;
                }
                if ($hasIpMatch) {
                    $reasons[] = "Shared attribution IP ({$r->attribution_ip}) across multiple referrals.";
                }
                if ($hasDeviceMatch) {
                    $reasons[] = 'Matching device fingerprint detected across multiple accounts.';
                }
                if ($isBlockedReferrer) {
                    $reasons[] = 'Referrer profile is currently flagged or blocked.';
                }

                return [
                    'id' => $r->id,
                    'referral_code' => $r->referral_code_used,
                    'referrer_name' => $r->referrer->name,
                    'referrer_email' => $r->referrer->email,
                    'referred_name' => $r->referred->name,
                    'referred_email' => $r->referred->email,
                    'ip_similarity' => $hasIpMatch,
                    'device_match' => $hasDeviceMatch,
                    'payment_method_match' => false,
                    'status' => $r->status === ReferralStatus::Disqualified ? 'disqualified' : 'flagged',
                    'flagged_reason' => implode(' ', $reasons) ?: 'Flagged for manual anti-fraud review.',
                    'created_at' => $r->created_at?->toIso8601String() ?? now()->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        $referralLedger = $allReferrals->map(fn (CustomerReferral $r): array => [
            'id' => $r->id,
            'friend_name' => $r->referred->name,
            'friend_email_masked' => $this->maskEmail($r->referred->email),
            'status' => match ($r->status) {
                ReferralStatus::PendingRegistration => 'invited',
                ReferralStatus::Registered => 'registered',
                ReferralStatus::Qualified => 'completed',
                ReferralStatus::RewardCredited => 'rewarded',
                ReferralStatus::Disqualified => 'disqualified',
            },
            'points_awarded' => $r->status === ReferralStatus::RewardCredited
                ? ($r->referrer_reward_points + $r->referred_reward_points)
                : $r->referred_reward_points,
            'created_at' => $r->created_at?->toIso8601String() ?? now()->toIso8601String(),
            'stay_completed_at' => $r->reward_points_credited_at?->toIso8601String(),
        ])->all();

        $totalInvitations = CustomerReferral::query()->count();
        $totalRegistered = CustomerReferral::query()
            ->where('status', '!=', ReferralStatus::PendingRegistration->value)
            ->count();
        $completedStays = CustomerReferral::query()
            ->whereIn('status', [ReferralStatus::Qualified->value, ReferralStatus::RewardCredited->value])
            ->count();
        $totalPointsAwarded = (int) CustomerReferralProfile::query()->sum('total_points_earned');

        return Inertia::render('admin/rewards/referrals/index', [
            'kpis' => [
                'total_invitations' => $totalInvitations,
                'total_registered' => $totalRegistered,
                'completed_stays' => $completedStays,
                'total_points_awarded' => $totalPointsAwarded,
                'flagged_cases_count' => count($fraudQueue),
            ],
            'fraudQueue' => $fraudQueue,
            'referralLedger' => $referralLedger,
            'referrals' => [
                'data' => collect($referrals->items())->map(fn (CustomerReferral $r): array => [
                    'id' => $r->id,
                    'referral_code' => $r->referral_code_used,
                    'referrer' => [
                        'id' => $r->referrer->id,
                        'name' => $r->referrer->name,
                        'email' => $r->referrer->email,
                    ],
                    'referred' => [
                        'id' => $r->referred->id,
                        'name' => $r->referred->name,
                        'email' => $r->referred->email,
                    ],
                    'status' => $r->status->value,
                    'status_label' => $r->status->label(),
                    'booking_reference' => $r->qualifyingReservation?->booking_reference,
                    'attribution_ip' => $r->attribution_ip,
                    'referrer_reward' => $r->referrer_reward_points,
                    'referred_reward' => $r->referred_reward_points,
                    'created_at' => $r->created_at?->format('d M Y, h:i A'),
                    'reward_credited_at' => $r->reward_points_credited_at?->format('d M Y, h:i A'),
                    'disqualification_reason' => $r->disqualification_reason,
                ])->all(),
                'current_page' => $referrals->currentPage(),
                'last_page' => $referrals->lastPage(),
                'total' => $referrals->total(),
            ],
            'filters' => $request->only(['status', 'search']),
            'statusOptions' => array_map(fn ($s): array => ['value' => $s->value, 'label' => $s->label()], ReferralStatus::cases()),
        ]);
    }

    public function clear(CustomerReferral $referral): RedirectResponse
    {
        $updates = [
            'disqualification_reason' => null,
        ];

        if ($referral->status === ReferralStatus::Disqualified) {
            $updates['status'] = $referral->reward_points_credited_at !== null
                ? ReferralStatus::RewardCredited
                : ReferralStatus::Registered;
        }

        $referral->update($updates);

        CustomerReferralProfile::query()
            ->where('user_id', $referral->referrer_user_id)
            ->where('is_blocked', true)
            ->update(['is_blocked' => false]);

        return back()->with('status', 'Referral cleared and restored for qualification.');
    }

    public function disqualify(Request $request, CustomerReferral $referral): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $reason = trim((string) ($validated['reason'] ?? ''));

        $referral->update([
            'status' => ReferralStatus::Disqualified,
            'disqualification_reason' => $reason !== '' ? $reason : 'Disqualified via admin anti-fraud review.',
        ]);

        return back()->with('status', 'Referral has been disqualified.');
    }

    public function toggleProfileBlock(Request $request, CustomerReferralProfile $profile): RedirectResponse
    {
        $profile->update(['is_blocked' => ! $profile->is_blocked]);

        $msg = $profile->is_blocked ? 'Referral profile blocked.' : 'Referral profile unblocked.';

        return back()->with('status', $msg);
    }

    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return $email;
        }

        [$local, $domain] = $parts;
        $visible = substr($local, 0, min(2, strlen($local)));

        return $visible.'***@'.$domain;
    }
}
