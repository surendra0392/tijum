<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Reservations;

use App\Actions\Reservations\SaveReservationAllocations;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reservations\SaveReservationAllocationsRequest;
use App\Models\Owner;
use App\Models\Reservation;
use Symfony\Component\HttpFoundation\RedirectResponse;

class ReservationAllocationController extends Controller
{
    public function update(
        SaveReservationAllocationsRequest $request,
        mixed $reservation,
        SaveReservationAllocations $action,
    ): RedirectResponse {
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 401);
        $model = Reservation::query()
            ->where('booking_reference', (string) $reservation)
            ->whereHas('property', fn ($property) => $property->where('owner_id', $owner->id))
            ->firstOrFail();
        $action->execute($owner, $model, $request->validated());

        return to_route('owner.reservations.show', $model)
            ->with('status', 'Physical room allocation updated.');
    }
}
