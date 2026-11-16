<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\Owner;
use App\Models\Property;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerReservationController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $propertyIds = Property::query()->where('owner_id', $owner->id)->pluck('id');

        $query = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->with(['property.city', 'roomType', 'user'])
            ->latest('created_at');

        if ($request->filled('status')) {
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
            ->with(['property.city', 'roomType', 'user', 'payments'])
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found or unauthorized.", 'NOT_FOUND', 404);
        }

        return $this->success(new ReservationResource($reservation));
    }
}
