<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Reservations;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Reservations\ReservationFilterRequest;
use App\Models\Admin;
use App\Models\Property;
use App\Models\Reservation;
use App\Policies\ReservationPolicy;
use App\Services\ReservationData;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class ReservationController extends Controller
{
    public function __construct(
        private readonly ReservationData $data,
        private readonly ReservationPolicy $policy,
    ) {}

    public function index(ReservationFilterRequest $request): Response
    {
        $admin = $this->admin($request->user('admin'));
        abort_unless($this->policy->viewAnyByAdmin($admin), 403);
        $filters = $request->validated();
        $query = Reservation::query()
            ->with(['property.owner', 'roomType', 'user', 'successfulPayment', 'review'])
            ->latest('created_at')
            ->latest('id');

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['property_id'])) {
            $query->where('property_id', $filters['property_id']);
        }
        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }
        if (isset($filters['from'])) {
            $query->whereDate('check_in_date', '>=', $filters['from']);
        }
        if (isset($filters['to'])) {
            $query->whereDate('check_in_date', '<=', $filters['to']);
        }

        $reservations = $query->paginate((int) ($filters['per_page'] ?? 20))->withQueryString();

        return Inertia::render('admin/reservations/index', [
            'reservations' => $this->pagination($reservations),
            'filters' => [
                'status' => $filters['status'] ?? null,
                'property_id' => $filters['property_id'] ?? null,
                'from' => $filters['from'] ?? null,
                'to' => $filters['to'] ?? null,
            ],
            'statusOptions' => $this->statusOptions(),
            'properties' => Property::query()
                ->whereHas('reservations')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(static fn (Property $property): array => [
                    'id' => $property->id,
                    'name' => $property->name,
                ])->all(),
        ]);
    }

    public function show(Request $request, mixed $reservation): Response
    {
        $admin = $this->admin($request->user('admin'));
        $model = Reservation::query()
            ->where('booking_reference', (string) $reservation)
            ->firstOrFail();
        abort_unless($this->policy->viewByAdmin($admin, $model), 403);

        return Inertia::render('admin/reservations/show', [
            'reservation' => $this->data->detail($model, 'admin'),
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

    private function admin(mixed $admin): Admin
    {
        abort_unless($admin instanceof Admin, 401);

        return $admin;
    }
}
