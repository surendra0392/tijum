<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\Owner;
use App\Models\Property;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OwnerReservationController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $propertyIds = Property::query()->where('owner_id', $owner->id)->pluck('id');

        $query = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->with(['property.city', 'property.media', 'roomType', 'user'])
            ->latest('created_at');

        $validated = $request->validate([
            'stage' => ['nullable', Rule::in(['upcoming', 'past', 'cancelled'])],
        ]);

        match ($validated['stage'] ?? null) {
            'upcoming' => $query
                ->where('status', ReservationStatus::Confirmed)
                ->whereDate('checkout_date', '>=', now()->toDateString()),
            'past' => $query
                ->where('status', ReservationStatus::Confirmed)
                ->whereDate('checkout_date', '<', now()->toDateString()),
            'cancelled' => $query->where('status', ReservationStatus::Cancelled),
            default => null,
        };

        if ($request->filled('status') && ! $request->filled('stage')) {
            $query->where('status', (string) $request->query('status'));
        }

        $perPage = min((int) ($request->query('per_page', 15)), 50);
        $paginated = $query->paginate($perPage);

        return $this->success(
            ReservationResource::collection($paginated->items()),
            'Partner reservations retrieved',
            200,
            [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ]
        );
    }

    public function show(Request $request, string $reference): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $reference)
            ->whereHas('property', fn ($p) => $p->where('owner_id', $owner->id))
            ->with(['property.city', 'property.media', 'roomType', 'user', 'payments'])
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        return $this->success(new ReservationResource($reservation));
    }

    public function checkIn(Request $request, string $reference): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $reference)
            ->whereHas('property', fn ($p) => $p->where('owner_id', $owner->id))
            ->with(['property.city', 'property.media', 'roomType', 'user', 'payments'])
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        if ($reservation->status !== ReservationStatus::Confirmed) {
            return $this->error('Only confirmed reservations can be checked in.', 'INVALID_STATUS', 422);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $reservation->markCheckedIn('owner', $owner->id, $validated['notes'] ?? null);

        return $this->success(
            new ReservationResource($reservation->fresh(['property.city', 'property.media', 'roomType', 'user', 'payments'])),
            "Guest for booking {$reservation->booking_reference} marked as checked in."
        );
    }

    public function checkOut(Request $request, string $reference): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $reference)
            ->whereHas('property', fn ($p) => $p->where('owner_id', $owner->id))
            ->with(['property.city', 'property.media', 'roomType', 'user', 'payments'])
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        if ($reservation->status !== ReservationStatus::Confirmed) {
            return $this->error('Only confirmed reservations can be checked out.', 'INVALID_STATUS', 422);
        }

        if ($reservation->checked_in_at === null) {
            return $this->error('Guest must be checked in before marking check-out.', 'NOT_CHECKED_IN', 422);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $reservation->markCheckedOut('owner', $owner->id, $validated['notes'] ?? null);

        return $this->success(
            new ReservationResource($reservation->fresh(['property.city', 'property.media', 'roomType', 'user', 'payments'])),
            "Guest for booking {$reservation->booking_reference} marked as checked out."
        );
    }
}
