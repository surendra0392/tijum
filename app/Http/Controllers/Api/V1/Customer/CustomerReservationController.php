<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Actions\Reservations\CreateReservation;
use App\Actions\Reservations\ReservationLifecycle;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Requests\Reservations\QuoteReservationRequest;
use App\Http\Requests\Reservations\StoreReservationRequest;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\Property;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\User;
use App\Services\ReservationQuoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class CustomerReservationController extends ApiController
{
    public function __construct(
        private readonly ReservationQuoteService $quotes,
        private readonly CreateReservation $createAction,
        private readonly ReservationLifecycle $lifecycle,
    ) {}

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $query = Reservation::query()
            ->where('user_id', $user->id)
            ->with(['property.city', 'roomType'])
            ->latest('created_at');

        if ($request->filled('status')) {
            $query->where('status', (string) $request->query('status'));
        }

        $perPage = min((int) ($request->query('per_page', 10)), 30);
        $paginated = $query->paginate($perPage);

        return $this->success(
            ReservationResource::collection($paginated->items()),
            'Customer reservations retrieved',
            200,
            [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ]
        );
    }

    public function quote(QuoteReservationRequest $request, Property $property): JsonResponse
    {
        $validated = $request->validated();
        $roomType = PropertyRoomType::query()
            ->where('property_id', $property->id)
            ->whereKey((int) $validated['property_room_type_id'])
            ->first();

        if ($roomType === null) {
            return $this->error('The selected room type is not valid for this property.', 'INVALID_ROOM_TYPE', 422);
        }

        $quoteResult = $this->quotes->quote(
            $property,
            $roomType,
            (string) $validated['check_in_date'],
            (string) $validated['duration_type'],
            (int) $validated['duration_quantity'],
            (int) $validated['quantity'],
        );

        if (! $quoteResult['eligible'] || ! is_array($quoteResult['quote'])) {
            return $this->error(
                implode(' ', $quoteResult['errors']),
                'QUOTE_INELIGIBLE',
                422,
                ['errors' => $quoteResult['errors']]
            );
        }

        return $this->success([
            'quote' => $quoteResult['quote'],
            'availability' => $quoteResult['availability'],
            'property' => [
                'id' => $property->id,
                'name' => $property->name,
                'slug' => $property->slug,
                'breakfast_included' => (bool) $property->breakfast_included,
                'lunch_included' => (bool) $property->lunch_included,
                'dinner_included' => (bool) $property->dinner_included,
            ],
            'room_type' => [
                'id' => $roomType->id,
                'name' => $roomType->name,
                'is_air_conditioned' => (bool) $roomType->is_air_conditioned,
            ],
        ]);
    }

    public function store(StoreReservationRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        try {
            $reservation = $this->createAction->execute(
                $user,
                $request->validated()
            );

            $reservation->loadMissing(['property.city', 'roomType']);

            return $this->success(
                new ReservationResource($reservation),
                'Reservation created successfully. Please complete payment within 15 minutes to confirm.',
                201
            );
        } catch (Throwable $e) {
            return $this->error(
                $e->getMessage(),
                'RESERVATION_CREATION_FAILED',
                422
            );
        }
    }

    public function show(Request $request, string $reference): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $reference)
            ->where('user_id', $user->id)
            ->with(['property.city', 'roomType', 'payments'])
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found.", 'RESERVATION_NOT_FOUND', 404);
        }

        return $this->success(new ReservationResource($reservation));
    }

    public function cancel(Request $request, string $reference): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $reservation = Reservation::query()
            ->where('booking_reference', $reference)
            ->where('user_id', $user->id)
            ->first();

        if ($reservation === null) {
            return $this->error("Reservation '{$reference}' not found.", 'RESERVATION_NOT_FOUND', 404);
        }

        if (! $reservation->status->isCancellableByCustomer()) {
            return $this->error('This reservation cannot be cancelled in its current status.', 'NOT_CANCELLABLE', 422);
        }

        $reason = (string) $request->input('reason', 'Cancelled by customer');
        $this->lifecycle->cancel($user, $reservation, $reason);

        $reservation->refresh();
        $reservation->loadMissing(['property.city', 'roomType']);

        return $this->success(new ReservationResource($reservation), 'Reservation cancelled successfully.');
    }
}
