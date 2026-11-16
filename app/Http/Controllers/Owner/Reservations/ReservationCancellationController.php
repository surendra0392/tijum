<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Reservations;

use App\Actions\Reservations\ReservationLifecycle;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reservations\OwnerCancelReservationRequest;
use App\Models\Owner;
use App\Models\Reservation;
use Symfony\Component\HttpFoundation\RedirectResponse;

class ReservationCancellationController extends Controller
{
    public function __invoke(OwnerCancelReservationRequest $request, mixed $reservation, ReservationLifecycle $lifecycle): RedirectResponse
    {
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 401);
        $model = Reservation::query()
            ->where('booking_reference', (string) $reservation)
            ->whereHas('property', fn ($property) => $property->where('owner_id', $owner->id))
            ->firstOrFail();
        $lifecycle->cancel($owner, $model, (string) $request->validated('cancellation_reason'));

        return to_route('owner.reservations.show', $model)
            ->with('status', 'Reservation cancelled and capacity released.');
    }
}
