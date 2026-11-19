<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Reservations;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reservations\ReservationFilterRequest;
use App\Models\Owner;
use App\Models\Property;
use App\Models\Reservation;
use App\Services\ReservationData;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class ReservationController extends Controller
{
    public function __construct(private readonly ReservationData $data) {}

    public function index(ReservationFilterRequest $request): Response
    {
        $owner = $this->owner($request->user('owner'));
        $filters = $request->validated();
        $baseOwnerQuery = Reservation::query()
            ->whereHas('property', fn ($property) => $property->where('owner_id', $owner->id));

        $query = (clone $baseOwnerQuery)
            ->with(['property', 'roomType', 'successfulPayment', 'review', 'user'])
            ->latest('created_at')
            ->latest('id');

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['property_id'])) {
            $query->where('property_id', $filters['property_id']);
        }
        if (isset($filters['stay_stage'])) {
            match ($filters['stay_stage']) {
                'awaiting_arrival' => $query
                    ->where('status', ReservationStatus::Confirmed)
                    ->whereNull('checked_in_at')
                    ->whereNull('checked_out_at'),
                'checked_in' => $query
                    ->whereNotNull('checked_in_at')
                    ->whereNull('checked_out_at'),
                'checked_out' => $query
                    ->whereNotNull('checked_out_at'),
                default => null,
            };
        }
        if (! empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->where(function ($q) use ($search): void {
                $q->where('booking_reference', 'like', "%{$search}%")
                    ->orWhere('contact_name', 'like', "%{$search}%")
                    ->orWhere('contact_phone', 'like', "%{$search}%")
                    ->orWhere('contact_email', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search): void {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }
        if (isset($filters['from'])) {
            $query->whereDate('check_in_date', '>=', $filters['from']);
        }
        if (isset($filters['to'])) {
            $query->whereDate('check_in_date', '<=', $filters['to']);
        }

        $reservations = $query->paginate((int) ($filters['per_page'] ?? 15))->withQueryString();

        $stageCounts = [
            'all' => (clone $baseOwnerQuery)->count(),
            'awaiting_arrival' => (clone $baseOwnerQuery)
                ->where('status', ReservationStatus::Confirmed)
                ->whereNull('checked_in_at')
                ->whereNull('checked_out_at')
                ->count(),
            'checked_in' => (clone $baseOwnerQuery)
                ->whereNotNull('checked_in_at')
                ->whereNull('checked_out_at')
                ->count(),
            'checked_out' => (clone $baseOwnerQuery)
                ->whereNotNull('checked_out_at')
                ->count(),
        ];

        return Inertia::render('owner/reservations/index', [
            'reservations' => $this->pagination($reservations),
            'filters' => [
                'status' => $filters['status'] ?? null,
                'stay_stage' => $filters['stay_stage'] ?? null,
                'search' => $filters['search'] ?? null,
                'property_id' => $filters['property_id'] ?? null,
                'from' => $filters['from'] ?? null,
                'to' => $filters['to'] ?? null,
            ],
            'stageCounts' => $stageCounts,
            'statusOptions' => $this->statusOptions(),
            'properties' => Property::query()
                ->where('owner_id', $owner->id)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(static fn (Property $property): array => [
                    'id' => $property->id,
                    'name' => $property->name,
                ])->all(),
        ]);
    }

    public function show(mixed $reservation): Response
    {
        $owner = $this->owner(request()->user('owner'));
        $model = $this->ownedReservation($owner, (string) $reservation);

        return Inertia::render('owner/reservations/show', [
            'reservation' => $this->data->detail($model, 'owner'),
            'status' => request()->session()->get('status'),
        ]);
    }

    /**
     * @param  LengthAwarePaginator<int, Reservation>  $paginator
     * @return array<string, mixed>
     */
    private function pagination(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => collect($paginator->items())
                ->map(fn (Reservation $reservation): array => $this->data->summary($reservation))
                ->values()->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];
    }

    /** @return list<array{value: string, label: string}> */
    private function statusOptions(): array
    {
        return array_map(
            static fn (ReservationStatus $status): array => [
                'value' => $status->value,
                'label' => $status->label(),
            ],
            ReservationStatus::cases(),
        );
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
            ->whereHas('property', fn ($property) => $property->where('owner_id', $owner->id))
            ->firstOrFail();
    }
}
