<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Enums\CaseStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\ReservationStatus;
use App\Enums\ReviewStatus;
use App\Enums\SettlementStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\ReservationResource;
use App\Models\CustomerProtectionCase;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyReview;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
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
        $today = CarbonImmutable::now('Asia/Kolkata')->toDateString();

        $verifiedProperties = Property::query()
            ->where('owner_id', $owner->id)
            ->where('is_verified', true)
            ->count();
        $roomTypesCount = PropertyRoomType::query()
            ->whereIn('property_id', $propertyIds)
            ->count();
        $roomsCount = PropertyRoom::query()
            ->whereIn('property_id', $propertyIds)
            ->count();

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

        $todayArrivals = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('check_in_date', '<=', $today)
            ->whereNull('checked_in_at')
            ->count();
        $todayDepartures = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('checkout_date', '<=', $today)
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->count();
        $inHouseGuests = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::Confirmed)
            ->whereNotNull('checked_in_at')
            ->whereNull('checked_out_at')
            ->count();
        $activeReservations = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReservationStatus::Confirmed)
            ->whereNull('checked_out_at')
            ->whereDate('checkout_date', '>=', $today)
            ->count();
        $pendingReviews = PropertyReview::query()
            ->whereIn('property_id', $propertyIds)
            ->where('status', ReviewStatus::Published)
            ->whereDoesntHave('response')
            ->count();
        $openComplaints = CustomerProtectionCase::query()
            ->where('owner_id', $owner->id)
            ->whereNotIn('status', [CaseStatus::Resolved, CaseStatus::Closed])
            ->count();
        $unsettledPayoutPaisa = (int) $owner->settlements()
            ->whereIn('status', [SettlementStatus::Draft, SettlementStatus::PendingApproval, SettlementStatus::Approved])
            ->sum('net_settlement_amount_minor');
        $monthlyEarningsPaisa = (int) $owner->settlements()
            ->where('status', SettlementStatus::Settled)
            ->whereBetween('settled_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->sum('net_settlement_amount_minor');

        $recentReservations = Reservation::query()
            ->whereIn('property_id', $propertyIds)
            ->with(['property.city', 'property.media', 'roomType'])
            ->latest('created_at')
            ->take(5)
            ->get();

        return $this->success([
            'pending_reservations_count' => 0,
            'awaiting_payment_count' => $awaitingPaymentCount,
            'confirmed_reservations_count' => $confirmedStays,
            'upcoming_checkins_count' => $upcomingCheckIns,
            'properties_count' => $activeProperties,
            'monthly_earnings_paise' => $monthlyEarningsPaisa,
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
                'today_arrivals' => $todayArrivals,
                'today_departures' => $todayDepartures,
                'in_house_guests' => $inHouseGuests,
                'active_reservations' => $activeReservations,
                'pending_reviews' => $pendingReviews,
                'open_complaints' => $openComplaints,
                'unsettled_payout_paise' => $unsettledPayoutPaisa,
            ],
            'property_summary' => [
                'properties_total' => $totalProperties,
                'verified_properties' => $verifiedProperties,
                'room_types_total' => $roomTypesCount,
                'rooms_total' => $roomsCount,
            ],
            'onboarding' => [
                'email_verified' => $owner->hasVerifiedEmail(),
                'account_status' => $owner->status->value,
                'account_status_label' => $owner->status->label(),
                'can_publish_properties' => $owner->canPublishProperties(),
            ],
            'recent_reservations' => ReservationResource::collection($recentReservations),
        ]);
    }
}
