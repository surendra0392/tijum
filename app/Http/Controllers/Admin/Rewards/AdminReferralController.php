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
            $query->where(function ($q) use ($search) {
                $q->where('referral_code_used', 'like', $search)
                    ->orWhereHas('referrer', fn ($rq) => $rq->where('name', 'like', $search)->orWhere('email', 'like', $search))
                    ->orWhereHas('referred', fn ($rq) => $rq->where('name', 'like', $search)->orWhere('email', 'like', $search));
            });
        }

        $referrals = $query->paginate(20)->withQueryString();

        return Inertia::render('admin/rewards/referrals/index', [
            'referrals' => [
                'data' => collect($referrals->items())->map(fn (CustomerReferral $r) => [
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
            'statusOptions' => array_map(fn ($s) => ['value' => $s->value, 'label' => $s->label()], ReferralStatus::cases()),
        ]);
    }

    public function disqualify(Request $request, CustomerReferral $referral): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $referral->update([
            'status' => ReferralStatus::Disqualified,
            'disqualification_reason' => $validated['reason'],
        ]);

        return back()->with('status', 'Referral has been disqualified.');
    }

    public function toggleProfileBlock(Request $request, CustomerReferralProfile $profile): RedirectResponse
    {
        $profile->update(['is_blocked' => ! $profile->is_blocked]);

        $msg = $profile->is_blocked ? 'Referral profile blocked.' : 'Referral profile unblocked.';

        return back()->with('status', $msg);
    }
}
