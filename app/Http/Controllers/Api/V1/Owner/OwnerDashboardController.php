<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Enums\PropertyOperationalStatus;
use App\Enums\ReservationStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\Owner;
use App\Models\Property;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerDashboardController extends ApiController
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $totalProperties = Property::query()->where('owner_id', $owner->id)->count();
        $activeProperties = Property::query()
            ->where('owner_id', $owner->id)
            ->where('status', PropertyOperationalStatus::Active)
            ->where('is_verified', true)
            ->count();

        $propertyIds = Property::query()->where('owner_id', $owner->id)->pluck('id');

        $awaitingPaymentCount = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::AwaitingPayment)
            ->count();

        $confirmedStays = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::Confirmed)
            ->count();

        $upcomingCheckIns = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('check_in_date', '>=', now()->toDateString())
            ->whereDate('check_in_date', '<=', now()->addDays(7)->toDateString())
            ->count();

        $recentReservations = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->with(['property.city', 'roomType'])
            ->latest('created_at')
            ->take(5)
            ->get();

        return $this->success([
            'pending_reservations_count' => 0,
            'awaiting_payment_count' => $awaitingPaymentCount,
            'confirmed_reservations_count' => $confirmedStays,
            'upcoming_checkins_count' => $upcomingCheckIns,
            'properties_count' => $activeProperties,
            'monthly_earnings_paise' => 0,
            'partner_profile' => [
                'name' => $owner->name,
                'email' => $owner->email,
                'status' => $owner->status->value,
                'status_label' => $owner->status->label(),
                'is_verified' => $owner->hasVerifiedEmail(),
            ],
            'statistics' => [
                'total_properties' => $totalProperties,
                'active_properties' => $activeProperties,
                'awaiting_payment' => $awaitingPaymentCount,
                'confirmed_stays' => $confirmedStays,
                'upcoming_checkins_7_days' => $upcomingCheckIns,
            ],
            'recent_reservations' => ReservationResource::collection($recentReservations),
        ]);
    }
}
