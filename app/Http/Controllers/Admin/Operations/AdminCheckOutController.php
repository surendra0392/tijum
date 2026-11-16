<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Operations;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Property;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminCheckOutController extends Controller
{
    public function index(Request $request): Response
    {
        $today = CarbonImmutable::now()->toDateString();
        $date = (string) $request->query('date', $today);
        $propertyId = $request->query('property_id') ? (int) $request->query('property_id') : null;
        $cityId = $request->query('city_id') ? (int) $request->query('city_id') : null;
        $status = (string) $request->query('status', 'all');
        $search = $request->query('search');

        $baseQuery = Reservation::query()
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('checkout_date', $date);

        // Stats
        $stats = [
            'total_due' => (clone $baseQuery)->count(),
            'checked_out' => (clone $baseQuery)->whereNotNull('checked_out_at')->count(),
            'pending' => (clone $baseQuery)->whereNull('checked_out_at')->count(),
            'overstays' => Reservation::query()
                ->where('status', ReservationStatus::Confirmed)
                ->whereDate('checkout_date', '<', $today)
                ->whereNull('checked_out_at')
                ->count(),
        ];

        if ($status === 'overstay') {
            $query = Reservation::query()
                ->where('status', ReservationStatus::Confirmed)
                ->whereDate('checkout_date', '<', $today)
                ->whereNull('checked_out_at');
        } else {
            $query = (clone $baseQuery);
            if ($status === 'pending') {
                $query->whereNull('checked_out_at');
            } elseif ($status === 'checked_out') {
                $query->whereNotNull('checked_out_at');
            }
        }

        $query->with([
            'property.city',
            'property.owner',
            'roomType',
            'allocations.room',
            'user',
        ])->latest('id');

        if ($propertyId !== null) {
            $query->where('property_id', $propertyId);
        }

        if ($cityId !== null) {
            $query->whereHas('property', static fn ($q) => $q->where('city_id', $cityId));
        }

        if (is_string($search) && trim($search) !== '') {
            $term = '%'.trim($search).'%';
            $query->where(static function ($q) use ($term): void {
                $q->where('booking_reference', 'like', $term)
                    ->orWhere('contact_name', 'like', $term)
                    ->orWhere('contact_email', 'like', $term)
                    ->orWhere('contact_phone', 'like', $term);
            });
        }

        $paginator = $query->paginate(20)->withQueryString();

        $reservations = [
            'data' => collect($paginator->items())->map(static fn (Reservation $res): array => [
                'id' => $res->id,
                'booking_reference' => $res->booking_reference,
                'guest_name' => $res->contact_name,
                'guest_email' => $res->contact_email,
                'guest_phone' => $res->contact_phone,
                'guest_gender' => $res->guest_gender,
                'guest_count' => $res->guest_count,
                'property_id' => $res->property_id,
                'property_name' => $res->snapshot_property_name ?? $res->property?->name,
                'property_locality' => $res->property?->locality,
                'city_name' => $res->property?->city?->name,
                'room_type_name' => $res->snapshot_room_type_name ?? $res->roomType?->name,
                'allocations' => $res->allocations->map(static fn ($a) => [
                    'id' => $a->id,
                    'room_number' => $a->room?->room_number ?? 'Assigned',
                ])->all(),
                'check_in_date' => $res->check_in_date->toDateString(),
                'checkout_date' => $res->checkout_date->toDateString(),
                'duration_label' => $res->durationLabel(),
                'is_overstay' => $res->checkout_date->toDateString() < $today && ! $res->isCheckedOut(),
                'is_checked_in' => $res->isCheckedIn(),
                'checked_in_at' => $res->checked_in_at?->toISOString(),
                'is_checked_out' => $res->isCheckedOut(),
                'checked_out_at' => $res->checked_out_at?->toISOString(),
                'checked_out_by_type' => $res->checked_out_by_type,
                'checkout_notes' => $res->checkout_notes,
            ])->all(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];

        return Inertia::render('admin/operations/check-outs/index', [
            'reservations' => $reservations,
            'stats' => $stats,
            'filters' => [
                'date' => $date,
                'property_id' => $propertyId,
                'city_id' => $cityId,
                'status' => $status,
                'search' => $search ?? '',
            ],
            'properties' => Property::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(static fn (Property $p) => ['id' => $p->id, 'name' => $p->name])
                ->all(),
            'cities' => City::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(static fn (City $c) => ['id' => $c->id, 'name' => $c->name])
                ->all(),
        ]);
    }

    public function markCheckOut(Request $request, Reservation $reservation): RedirectResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $admin = $request->user('admin');
        $reservation->markCheckedOut('admin', $admin ? $admin->id : 1, $validated['notes'] ?? null);

        return back()->with('status', "Guest for {$reservation->booking_reference} marked as checked out.");
    }

    public function undoCheckOut(Reservation $reservation): RedirectResponse
    {
        $reservation->undoCheckOut();

        return back()->with('status', "Check-out for {$reservation->booking_reference} reversed.");
    }
}
