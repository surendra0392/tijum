<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Reservations;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\Reservation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ReservationCheckInOutController extends Controller
{
    public function checkIn(Request $request, string $reservation): RedirectResponse
    {
        $owner = $this->owner($request->user('owner'));
        $res = $this->ownedReservation($owner, $reservation);

        abort_unless($res->status === ReservationStatus::Confirmed, 422, 'Only confirmed reservations can be checked in.');

        if ($res->checked_in_at !== null || $res->checked_out_at !== null) {
            throw ValidationException::withMessages([
                'reservation' => 'This guest has already been checked in or checked out.',
            ]);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $res->markCheckedIn('owner', $owner->id, $validated['notes'] ?? null);

        return back()->with('status', "Guest for booking {$res->booking_reference} marked as checked in.");
    }

    public function checkOut(Request $request, string $reservation): RedirectResponse
    {
        $owner = $this->owner($request->user('owner'));
        $res = $this->ownedReservation($owner, $reservation);

        abort_unless($res->status === ReservationStatus::Confirmed, 422, 'Only confirmed reservations can be checked out.');
        abort_unless($res->checked_in_at !== null, 422, 'Guest must be checked in before marking check-out.');

        if ($res->checked_out_at !== null) {
            throw ValidationException::withMessages([
                'reservation' => 'This guest has already been checked out.',
            ]);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $res->markCheckedOut('owner', $owner->id, $validated['notes'] ?? null);

        return back()->with('status', "Guest for booking {$res->booking_reference} marked as checked out.");
    }

    private function owner(mixed $owner): Owner
    {
        abort_unless($owner instanceof Owner, 401);

        return $owner;
    }

    private function ownedReservation(Owner $owner, string $reference): Reservation
    {
        return Reservation::query()
            ->where('booking_reference', $reference)
            ->whereHas('property', static fn ($property) => $property->where('owner_id', $owner->id))
            ->firstOrFail();
    }
}
