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
use Illuminate\Database\Eloquent\Builder;
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

        $scopedBaseQuery = Reservation::query()
            ->whereHas('property', fn (Builder $property) => $property->where('owner_id', $owner->id));

        if (! empty($filters['property_id'])) {
            $scopedBaseQuery->where('property_id', $filters['property_id']);
        }

        if (! empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $scopedBaseQuery->where(function (Builder $q) use ($search): void {
                $q->where('booking_reference', 'like', "%{$search}%")
                    ->orWhere('contact_name', 'like', "%{$search}%")
                    ->orWhere('contact_phone', 'like', "%{$search}%")
                    ->orWhere('contact_email', 'like', "%{$search}%")
                    ->orWhere('room_allocation_history', 'like', "%{$search}%")
                    ->orWhereHas('user', function (Builder $uq) use ($search): void {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('allocations.room', function (Builder $rq) use ($search): void {
                        $rq->where('room_number', 'like', "%{$search}%");
                    });
            });
        }

        if (! empty($filters['from'])) {
            $scopedBaseQuery->whereDate('check_in_date', '>=', $filters['from']);
        }

        if (! empty($filters['to'])) {
            $scopedBaseQuery->whereDate('check_in_date', '<=', $filters['to']);
        }

        $activeStayStage = ! empty($filters['stay_stage']) ? (string) $filters['stay_stage'] : null;
        $activeStatus = ! empty($filters['status']) ? (string) $filters['status'] : null;

        // Normalize legacy status query param into the unified stage pill when no explicit stay_stage is passed
        if ($activeStayStage === null && $activeStatus !== null) {
            $activeStayStage = match ($activeStatus) {
                ReservationStatus::AwaitingPayment->value => 'awaiting_payment',
                ReservationStatus::Cancelled->value, ReservationStatus::Expired->value => 'cancelled',
                default => null,
            };
        }

        $stageCounts = [
            'all' => (clone $scopedBaseQuery)->count(),
            'needs_room' => $this->applyNeedsRoomConstraint(clone $scopedBaseQuery)->count(),
            'awaiting_arrival' => (clone $scopedBaseQuery)
                ->where('status', ReservationStatus::Confirmed)
                ->whereNull('checked_in_at')
                ->whereNull('checked_out_at')
                ->count(),
            'checked_in' => (clone $scopedBaseQuery)
                ->where('status', ReservationStatus::Confirmed)
                ->whereNotNull('checked_in_at')
                ->whereNull('checked_out_at')
                ->count(),
            'checked_out' => (clone $scopedBaseQuery)
                ->whereNotNull('checked_out_at')
                ->count(),
            'awaiting_payment' => (clone $scopedBaseQuery)
                ->where('status', ReservationStatus::AwaitingPayment)
                ->count(),
            'cancelled' => (clone $scopedBaseQuery)
                ->whereIn('status', [ReservationStatus::Cancelled, ReservationStatus::Expired])
                ->count(),
        ];

        $confirmedRevenueMinor = (int) (clone $scopedBaseQuery)
            ->where('status', ReservationStatus::Confirmed)
            ->sum('total_amount_minor');

        $query = (clone $scopedBaseQuery)
            ->with(['property', 'roomType', 'successfulPayment', 'review', 'user', 'allocations.room']);

        if ($activeStayStage !== null) {
            match ($activeStayStage) {
                'needs_room' => $this->applyNeedsRoomConstraint($query),
                'awaiting_arrival' => $query
                    ->where('status', ReservationStatus::Confirmed)
                    ->whereNull('checked_in_at')
                    ->whereNull('checked_out_at'),
                'checked_in' => $query
                    ->where('status', ReservationStatus::Confirmed)
                    ->whereNotNull('checked_in_at')
                    ->whereNull('checked_out_at'),
                'checked_out' => $query
                    ->whereNotNull('checked_out_at'),
                'awaiting_payment' => $query
                    ->where('status', ReservationStatus::AwaitingPayment),
                'cancelled' => $query
                    ->whereIn('status', [ReservationStatus::Cancelled, ReservationStatus::Expired]),
                default => null,
            };
        } elseif ($activeStatus !== null) {
            $query->where('status', $activeStatus);
        }

        $sort = ! empty($filters['sort']) ? (string) $filters['sort'] : 'newest';

        match ($sort) {
            'check_in_asc' => $query->orderBy('check_in_date')->latest('id'),
            'check_in_desc' => $query->orderByDesc('check_in_date')->latest('id'),
            'amount_desc' => $query->orderByDesc('total_amount_minor')->latest('id'),
            default => $query->latest('created_at')->latest('id'),
        };

        $reservations = $query->paginate((int) ($filters['per_page'] ?? 15))->withQueryString();

        return Inertia::render('owner/reservations/index', [
            'reservations' => $this->pagination($reservations),
            'filters' => [
                'status' => $activeStatus,
                'stay_stage' => $activeStayStage,
                'search' => ! empty($filters['search']) ? trim((string) $filters['search']) : null,
                'property_id' => ! empty($filters['property_id']) ? (int) $filters['property_id'] : null,
                'from' => ! empty($filters['from']) ? (string) $filters['from'] : null,
                'to' => ! empty($filters['to']) ? (string) $filters['to'] : null,
                'sort' => $sort,
            ],
            'stageCounts' => $stageCounts,
            'metrics' => [
                'confirmed_revenue_minor' => $confirmedRevenueMinor,
                'currency_code' => 'INR',
            ],
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
     * @param  Builder<Reservation>  $query
     * @return Builder<Reservation>
     */
    private function applyNeedsRoomConstraint(Builder $query): Builder
    {
        return $query
            ->where('status', ReservationStatus::Confirmed)
            ->whereNull('checked_out_at')
            ->whereRaw(
                '(SELECT COALESCE(SUM(allocated_quantity), 0) FROM reservation_room_allocations WHERE reservation_room_allocations.reservation_id = reservations.id) < reservations.quantity',
            );
    }

    /**
     * @param  LengthAwarePaginator<int, Reservation>  $paginator
     * @return array<string, mixed>
     */
    private function pagination(LengthAwarePaginator $paginator): array
    {
        return [
            'data' => collect($paginator->items())
                ->map(fn (Reservation $reservation): array => $this->data->summary($reservation, 'owner'))
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
            ->whereHas('property', fn (Builder $property) => $property->where('owner_id', $owner->id))
            ->firstOrFail();
    }
}
