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
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OwnerRelocationController extends Controller
{
    public function respond(Request $request, ReservationRelocation $relocation): RedirectResponse
    {
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 401);
        abort_if($relocation->destination_owner_id !== $owner->id, 403);

        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:accept,decline'],
        ]);

        $decision = $validated['decision'];

        $statusMessage = DB::transaction(function () use ($relocation, $decision): string {
            $locked = ReservationRelocation::query()
                ->whereKey($relocation->id)
                ->with('case')
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->status !== RelocationStatus::Draft || $locked->isExpired()) {
                throw ValidationException::withMessages([
                    'decision' => 'This relocation request is no longer pending host confirmation or has expired.',
                ]);
            }

            if ($decision === 'accept') {
                $locked->forceFill([
                    'destination_owner_accepted_at' => CarbonImmutable::now(),
                    'status' => RelocationStatus::Offered,
                ])->save();

                if ($locked->case !== null) {
                    $locked->case->forceFill(['status' => CaseStatus::RelocationOffered])->save();
                }

                return 'Relocation guest acceptance confirmed. Offer is now visible to the customer.';
            }

            $locked->forceFill([
                'status' => RelocationStatus::Declined,
                'admin_notes' => 'Destination host declined relocation request.',
            ])->save();

            return 'Relocation request declined.';
        });

        return back()->with('status', $statusMessage);
    }
}
