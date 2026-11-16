<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner\Operations;

use App\Enums\ReservationStatus;
use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Models\Property;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OwnerFrontDeskController extends Controller
{
    public function index(Request $request): Response
    {
        $owner = $this->resolveOwner($request);

        $properties = Property::query()
            ->where('owner_id', $owner->id)
            ->orderBy('name')
            ->get(['id', 'name', 'property_reference', 'address_line_1']);

        $selectedDate = $request->input('date')
            ? CarbonImmutable::parse($request->input('date'), 'Asia/Kolkata')->toDateString()
            : CarbonImmutable::now('Asia/Kolkata')->toDateString();

        $selectedPropertyId = $request->integer('property_id') ?: null;
        $activeTab = $request->input('tab', 'arrivals');
        $search = trim((string) $request->input('search', ''));

        $baseQuery = Reservation::query()
            ->whereHas('property', fn ($p) => $p->where('owner_id', $owner->id))
            ->with(['user', 'property', 'roomType', 'allocations.room']);

        if ($selectedPropertyId) {
            $baseQuery->where('property_id', $selectedPropertyId);
        }

        if ($search !== '') {
            $baseQuery->where(function ($q) use ($search): void {
                $q->where('booking_reference', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search): void {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // 1. Arrivals (Expected check-ins on or before selected date who haven't checked in yet)
        $arrivalsQuery = (clone $baseQuery)
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('check_in_date', '<=', $selectedDate)
            ->whereNull('checked_in_at')
            ->orderBy('early_check_in_requested', 'desc')
            ->orderBy('requested_arrival_time', 'asc')
            ->orderBy('check_in_date', 'asc');

        $arrivals = $arrivalsQuery->get()->map(fn (Reservation $res): array => $this->formatReservation($res));

        // 2. Departures (Expected check-outs on or before selected date who are in-house)
        $departuresQuery = (clone $baseQuery)
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('checkout_date', '<=', $selectedDate)
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->orderBy('checkout_date', 'asc');

        $departures = $departuresQuery->get()->map(fn (Reservation $res): array => $this->formatReservation($res));

        // 3. Currently In-House (Checked in, not checked out)
        $inHouseQuery = (clone $baseQuery)
            ->where('status', ReservationStatus::Confirmed)
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->orderBy('checkout_date', 'asc');

        $inHouse = $inHouseQuery->get()->map(fn (Reservation $res): array => $this->formatReservation($res));

        // 4. Upcoming Arrivals (Next 7 days after selected date)
        $upcomingQuery = (clone $baseQuery)
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('check_in_date', '>', $selectedDate)
            ->whereDate('check_in_date', '<=', CarbonImmutable::parse($selectedDate)->addDays(7)->toDateString())
            ->whereNull('checked_in_at')
            ->orderBy('check_in_date', 'asc');

        $upcoming = $upcomingQuery->get()->map(fn (Reservation $res): array => $this->formatReservation($res));

        // 5. Recent Departures / History
        $historyQuery = (clone $baseQuery)
            ->whereNotNull('checked_out_at')
            ->latest('checked_out_at')
            ->limit(20);

        $history = $historyQuery->get()->map(fn (Reservation $res): array => $this->formatReservation($res));

        // Unallocated count for confirmed active/arriving reservations
        $unallocatedCount = (clone $baseQuery)
            ->where('status', ReservationStatus::Confirmed)
            ->whereNull('checked_out_at')
            ->doesntHave('allocations')
            ->count();

        $stats = [
            'arrivals_count' => $arrivals->count(),
            'departures_count' => $departures->count(),
            'in_house_count' => $inHouse->count(),
            'upcoming_count' => $upcoming->count(),
            'unallocated_count' => $unallocatedCount,
        ];

        return Inertia::render('owner/front-desk/index', [
            'properties' => $properties->map(fn (Property $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'property_reference' => $p->property_reference,
            ])->values()->all(),
            'filters' => [
                'date' => $selectedDate,
                'property_id' => $selectedPropertyId,
                'tab' => $activeTab,
                'search' => $search,
            ],
            'stats' => $stats,
            'arrivals' => $arrivals->values()->all(),
            'departures' => $departures->values()->all(),
            'inHouse' => $inHouse->values()->all(),
            'upcoming' => $upcoming->values()->all(),
            'history' => $history->values()->all(),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatReservation(Reservation $res): array
    {
        $today = CarbonImmutable::now('Asia/Kolkata')->startOfDay();
        $checkIn = CarbonImmutable::parse($res->check_in_date)->startOfDay();
        $checkOut = CarbonImmutable::parse($res->checkout_date)->startOfDay();

        $isOverdueArrival = $res->status === ReservationStatus::Confirmed && ! $res->checked_in_at && $checkIn->isBefore($today);
        $isOverdueDeparture = $res->status === ReservationStatus::Confirmed && $res->checked_in_at && ! $res->checked_out_at && $checkOut->isBefore($today);

        return [
            'id' => $res->id,
            'booking_reference' => $res->booking_reference,
            'property_id' => $res->property_id,
            'property_name' => $res->property?->name,
            'room_type_name' => $res->snapshot_room_type_name ?? $res->roomType?->name,
            'guest_name' => $res->user->name,
            'guest_phone' => $res->user->phone,
            'guest_email' => $res->user->email,
            'guests_count' => $res->quantity,
            'check_in_date' => $res->check_in_date->toDateString(),
            'checkout_date' => $res->checkout_date->toDateString(),
            'stay_nights' => max(1, (int) $checkIn->diffInDays($checkOut)),
            'status' => $res->status->value,
            'status_label' => $res->statusLabel(),
            'early_check_in_requested' => (bool) $res->early_check_in_requested,
            'requested_arrival_time' => $res->requested_arrival_time,
            'checked_in_at' => $res->checked_in_at?->toISOString(),
            'checked_out_at' => $res->checked_out_at?->toISOString(),
            'check_in_notes' => $res->check_in_notes,
            'checkout_notes' => $res->checkout_notes,
            'total_amount_rupees' => number_format($res->total_amount_minor / 100, 2),
            'allocated_rooms' => $res->allocations->map(fn ($a) => [
                'room_id' => $a->property_room_id,
                'room_number' => $a->room->room_number,
            ])->values()->all(),
            'is_allocated' => $res->allocations->isNotEmpty(),
            'is_overdue_arrival' => $isOverdueArrival,
            'is_overdue_departure' => $isOverdueDeparture,
        ];
    }

    private function resolveOwner(Request $request): Owner
    {
        $owner = $request->user('owner');
        if (! $owner instanceof Owner) {
            abort(401);
        }

        return $owner;
    }
}
