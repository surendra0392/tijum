<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Actions\Protection\ProcessRelocationDecision;
use App\Http\Controllers\Controller;
use App\Http\Requests\Protection\RelocationDecisionRequest;
use App\Models\ReservationRelocation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;

class CustomerRelocationController extends Controller
{
    public function decision(
        RelocationDecisionRequest $request,
        ReservationRelocation $relocation,
        ProcessRelocationDecision $action,
    ): RedirectResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $validated = $request->validated();
        $decision = (string) $validated['decision'];

        $updatedRelocation = $action->execute($relocation, $user, $decision);

        if ($decision === 'accepted' && $updatedRelocation->replacementReservation !== null) {
            return redirect()
                ->route('reservations.show', $updatedRelocation->replacementReservation)
                ->with('status', 'Alternative accommodation accepted! Your new confirmed stay is ready.');
        }

        return back()->with('status', 'Relocation offer declined. Our support team will coordinate your refund review.');
    }
}
