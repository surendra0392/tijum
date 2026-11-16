<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\CustomerCases;

use App\Enums\CaseStatus;
use App\Enums\RelocationStatus;
use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\ReservationRelocation;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class OwnerRelocationController extends Controller
{
    public function respond(Request $request, ReservationRelocation $relocation): RedirectResponse
    {
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 401);
        abort_if($relocation->destination_owner_id !== $owner->id, 403);

        $decision = $request->input('decision'); // 'accept' or 'decline'

        if ($decision === 'accept') {
            $relocation->forceFill([
                'destination_owner_accepted_at' => CarbonImmutable::now(),
                'status' => RelocationStatus::Offered,
            ])->save();

            if ($relocation->case !== null) {
                $relocation->case->forceFill(['status' => CaseStatus::RelocationOffered])->save();
            }

            return back()->with('status', 'Relocation guest acceptance confirmed. Offer is now visible to the customer.');
        }

        $relocation->forceFill([
            'status' => RelocationStatus::Declined,
            'admin_notes' => 'Destination host declined relocation request.',
        ])->save();

        return back()->with('status', 'Relocation request declined.');
    }
}
