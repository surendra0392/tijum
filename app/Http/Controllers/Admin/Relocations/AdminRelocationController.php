<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Relocations;

use App\Actions\Protection\CreateRelocationOffer;
use App\Enums\RelocationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Protection\CreateRelocationOfferRequest;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use App\Models\ReservationRelocation;
use App\Services\Protection\RelocationMatchingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminRelocationController extends Controller
{
    public function index(Request $request): Response
    {
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 401);

        $relocations = ReservationRelocation::query()
            ->with([
                'sourceReservation.user',
                'sourceReservation.property',
                'destinationProperty.city',
                'destinationRoomType',
                'replacementReservation',
                'createdByAdmin',
            ])
            ->latest('id')
            ->paginate(15)
            ->through(fn (ReservationRelocation $r): array => [
                'id' => $r->id,
                'source_booking_reference' => $r->sourceReservation->booking_reference,
                'customer_name' => $r->sourceReservation->user->name,
                'source_property_name' => $r->sourceReservation->property->name,
                'destination_property_name' => $r->destinationProperty->name,
                'destination_city_name' => $r->destinationProperty->city?->name,
                'destination_room_type_name' => $r->destinationRoomType->name,
                'original_amount_minor' => $r->original_amount_minor,
                'alternative_amount_minor' => $r->alternative_amount_minor,
                'price_difference_minor' => $r->price_difference_minor,
                'status' => $r->status->value,
                'status_label' => $r->status->label(),
                'destination_owner_accepted' => $r->destination_owner_accepted_at !== null,
                'customer_decision' => $r->customer_decision,
                'replacement_booking_reference' => $r->replacementReservation?->booking_reference,
                'offer_expires_at' => $r->offer_expires_at->toISOString(),
                'created_at' => $r->created_at->toISOString(),
            ]);

        return Inertia::render('admin/relocations/index', [
            'relocations' => $relocations,
        ]);
    }

    public function searchAlternatives(Request $request, RelocationMatchingService $service): JsonResponse
    {
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 401);

        $reservationId = (int) $request->query('reservation_id');
        $reservation = Reservation::query()->with('property')->findOrFail($reservationId);

        $alternatives = $service->findAlternatives($reservation);

        return response()->json([
            'reservation_id' => $reservation->id,
            'booking_reference' => $reservation->booking_reference,
            'alternatives' => $alternatives,
        ]);
    }

    public function store(
        CreateRelocationOfferRequest $request,
        CreateRelocationOffer $action,
    ): RedirectResponse {
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 401);

        $reservationId = (int) $request->input('reservation_id');
        $reservation = Reservation::query()->findOrFail($reservationId);

        $caseId = $request->input('case_id');
        $case = $caseId ? CustomerProtectionCase::query()->find($caseId) : null;

        $action->execute($reservation, $admin, $request->validated(), $case);

        return back()->with('status', 'Relocation offer created successfully.');
    }

    public function cancel(Request $request, ReservationRelocation $relocation): RedirectResponse
    {
        $admin = $request->user('admin');
        abort_unless($admin instanceof Admin, 401);

        if (! in_array($relocation->status, [RelocationStatus::Draft, RelocationStatus::Offered], true)) {
            abort(422, 'Only draft or active offered relocations can be cancelled.');
        }

        $relocation->forceFill(['status' => RelocationStatus::Cancelled])->save();

        return back()->with('status', 'Relocation offer cancelled.');
    }
}
