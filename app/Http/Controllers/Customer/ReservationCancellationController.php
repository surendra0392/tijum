<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Actions\Reservations\ReservationLifecycle;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reservations\CustomerCancelReservationRequest;
use App\Models\Reservation;
use App\Models\User;
use Symfony\Component\HttpFoundation\RedirectResponse;

class ReservationCancellationController extends Controller
{
    public function store(
        CustomerCancelReservationRequest $request,
        mixed $reservation,
        ReservationLifecycle $lifecycle,
    ): RedirectResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $model = Reservation::query()
            ->where('user_id', $user->id)
            ->where('booking_reference', (string) $reservation)
            ->firstOrFail();
        $lifecycle->cancel(
            $user,
            $model,
            $request->validated('cancellation_reason'),
        );

        return to_route('reservations.show', $model)
            ->with('status', 'Reservation cancelled and capacity released.');
    }
}
