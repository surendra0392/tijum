<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\RelocationStatus;
use App\Enums\ReservationStatus;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationRoomAllocation;
use App\Services\Protection\CancellationPolicyService;
use App\Services\Reviews\ReviewEligibilityService;
use Illuminate\Database\Eloquent\Builder;

/**
 * Safe, role-scoped projection of a reservation for Inertia responses.
 * Customer projections never include allocations or physical room numbers.
 */
class ReservationData
{
    public function __construct(
        private readonly StayTimingPolicy $timing,
        private readonly ?ReviewEligibilityService $eligibilityService = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function summary(Reservation $reservation): array
    {
        $reservation->loadMissing([
            'property',
            'roomType',
            'successfulPayment',
            'review',
            'user',
        ]);

        return [
            'booking_reference' => $reservation->booking_reference,
            'status' => $reservation->status->value,
            'status_label' => $reservation->statusLabel(),
            'status_semantic' => $reservation->statusSemantic(),
            'payment_status' => $reservation->paymentStatus()?->value,
            'payment_status_label' => $reservation->paymentStatus()?->label(),
            'payment_deadline_at' => $reservation->payment_deadline_at?->toISOString(),
            'requires_refund_review' => (bool) $reservation->requires_refund_review,
            'review_status' => $reservation->review?->status?->value,
            'property_name' => $reservation->snapshot_property_name ?? $reservation->property?->name,
            'room_type_name' => $reservation->snapshot_room_type_name ?? $reservation->roomType?->name,
            'contact_name' => $reservation->contact_name ?: $reservation->user?->name,
            'contact_email' => $reservation->contact_email ?: $reservation->user?->email,
            'contact_phone' => $reservation->contact_phone ?: $reservation->user?->phone,
            'guest_gender' => $reservation->guest_gender,
            'guest_composition' => $reservation->guest_composition,
            'quantity' => $reservation->quantity,
            'quantity_basis' => $reservation->quantity_basis->value,
            'quantity_basis_label' => $reservation->quantityBasisLabel(),
            'guest_count' => $reservation->guest_count,
            'check_in_date' => $reservation->check_in_date->toDateString(),
            'checkout_date' => $reservation->checkout_date->toDateString(),
            'duration_label' => $reservation->durationLabel(),
            'total_amount_minor' => $reservation->total_amount_minor,
            'currency_code' => $reservation->currency_code,
            'early_check_in_requested' => (bool) $reservation->early_check_in_requested,
            'requested_arrival_time' => $this->timeValue($reservation->requested_arrival_time),
            'is_checked_in' => $reservation->checked_in_at !== null,
            'checked_in_at' => $reservation->checked_in_at?->toISOString(),
            'check_in_notes' => $reservation->check_in_notes,
            'is_checked_out' => $reservation->checked_out_at !== null,
            'checked_out_at' => $reservation->checked_out_at?->toISOString(),
            'checkout_notes' => $reservation->checkout_notes,
            'created_at' => $reservation->created_at?->toISOString(),
        ];
    }

    /**
     * @param  'customer'|'owner'|'admin'  $viewer
     * @return array<string, mixed>
     */
    public function detail(Reservation $reservation, string $viewer = 'customer'): array
    {
        $reservation->loadMissing([
            'property.owner',
            'roomType',
            'allocations.room',
            'user',
            'cancelledByUser',
            'cancelledByOwner',
            'payments.refunds',
            'successfulPayment.refunds',
            'refunds.initiatedByAdmin',
            'cases.messages',
            'relocations.destinationProperty.city',
            'relocations.destinationRoomType',
            'review',
        ]);

        $property = $this->propertySummary($reservation);
        $data = array_merge($this->summary($reservation), [
            'property_id' => $reservation->property_id,
            'owner_id' => $reservation->property?->owner_id,
            'property_locality' => trim(implode(', ', array_filter([
                $property['locality'],
                $property['city'],
            ]))),
            'property_category' => $reservation->snapshot_category_name ?? 'Accommodation',
            'room_type_ac_label' => $reservation->snapshot_is_air_conditioned ? 'AC' : 'Non-AC',
            'sharing_label' => $reservation->snapshot_sharing_mode === 'shared'
                ? sprintf('%d Sharing', (int) $reservation->snapshot_max_capacity)
                : 'Private Room',
            'contact_name' => $reservation->contact_name,
            'contact_email' => $reservation->contact_email,
            'contact_phone' => $reservation->contact_phone,
            'guest_gender' => $reservation->guest_gender,
            'guest_composition' => $reservation->guest_composition,
            'unit_rate_minor' => $reservation->unit_rate_minor,
            'rate_unit' => $reservation->rate_unit->value,
            'rate_unit_label' => $reservation->rate_unit->label(),
            'duration_type' => $reservation->duration_type,
            'duration_quantity' => $reservation->duration_quantity,
            'total_stay_days' => $reservation->total_stay_days,
            'breakfast_included' => (bool) $reservation->snapshot_breakfast_included,
            'lunch_included' => (bool) $reservation->snapshot_lunch_included,
            'dinner_included' => (bool) $reservation->snapshot_dinner_included,
            'standard_check_in_time' => $this->timing->getStandardCheckInTime(),
            'standard_check_out_time' => $this->timing->getStandardCheckOutTime(),
            'timezone' => $this->timing->timezone(),
            'submitted_at' => $reservation->submitted_at->toISOString(),
            'payment_deadline_at' => $reservation->payment_deadline_at?->toISOString(),
            'expired_at' => $reservation->expired_at?->toISOString(),
            'confirmed_at' => $reservation->confirmed_at?->toISOString(),
            'cancelled_at' => $reservation->cancelled_at?->toISOString(),
            'cancellation_reason' => $reservation->cancellation_reason,
            'checked_in_by_type' => $reservation->checked_in_by_type,
            'check_in_notes' => $reservation->check_in_notes,
            'checked_out_by_type' => $reservation->checked_out_by_type,
            'checkout_notes' => $reservation->checkout_notes,
            'requires_refund_review' => (bool) $reservation->requires_refund_review,
            'payment_summary' => $this->paymentSummary($reservation),
            'refunds' => $this->refundsSummary($reservation),
            'updated_at' => $reservation->updated_at?->toISOString(),
        ]);

        if ($viewer === 'owner' || $viewer === 'admin') {
            $allocations = $this->allocationSummary($reservation);
            $data['allocations'] = $allocations['items'];
            $data['allocated_quantity'] = $allocations['allocated'];
            $data['remaining_quantity'] = $reservation->remainingQuantity();

            if ($viewer === 'owner') {
                $data['available_rooms'] = $this->availableRooms($reservation);
            }
        }

        if ($viewer === 'owner' || $viewer === 'admin') {
            $data['customer_name'] = $reservation->user?->name ?: $reservation->contact_name;
            $data['customer_email'] = $reservation->user?->email ?: $reservation->contact_email;
            $data['customer_phone'] = $reservation->user?->phone ?: $reservation->contact_phone;
        }

        if ($viewer === 'admin') {
            $data['owner_name'] = $reservation->property?->owner?->name;
        }

        $policyService = app(CancellationPolicyService::class);
        $data['cancellation_policy'] = $policyService->policyForReservation($reservation);
        $data['is_relocated_replacement'] = (bool) $reservation->is_relocated_replacement;
        $data['cases'] = $reservation->cases->map(fn ($c): array => [
            'id' => $c->id,
            'case_reference' => $c->case_reference,
            'category' => $c->category->value,
            'category_label' => $c->category->label(),
            'status' => $c->status->value,
            'status_label' => $c->status->label(),
            'priority' => $c->priority->value,
            'description' => $c->description,
            'sla_due_at' => $c->sla_due_at?->toISOString(),
            'is_overdue' => $c->isOverdue(),
            'resolved_at' => $c->resolved_at?->toISOString(),
            'resolution_summary' => $c->resolution_summary,
            'created_at' => $c->created_at?->toISOString(),
        ])->all();

        $activeReloc = $reservation->relocations->first(fn ($r) => $r->status === RelocationStatus::Offered);
        if ($activeReloc !== null) {
            $data['active_relocation'] = [
                'id' => $activeReloc->id,
                'status' => $activeReloc->status->value,
                'status_label' => $activeReloc->status->label(),
                'destination_property_name' => $activeReloc->destinationProperty->name,
                'destination_locality' => $activeReloc->destinationProperty->locality,
                'destination_city_name' => $activeReloc->destinationProperty->city?->name,
                'destination_room_type_name' => $activeReloc->destinationRoomType->name,
                'destination_is_air_conditioned' => (bool) $activeReloc->destinationRoomType->is_air_conditioned,
                'destination_food_provided' => (bool) $activeReloc->destinationProperty->food_provided,
                'destination_breakfast_included' => (bool) $activeReloc->destinationProperty->breakfast_included,
                'destination_lunch_included' => (bool) $activeReloc->destinationProperty->lunch_included,
                'destination_dinner_included' => (bool) $activeReloc->destinationProperty->dinner_included,
                'original_amount_minor' => $activeReloc->original_amount_minor,
                'alternative_amount_minor' => $activeReloc->alternative_amount_minor,
                'price_difference_minor' => $activeReloc->price_difference_minor,
                'offer_expires_at' => $activeReloc->offer_expires_at->toISOString(),
            ];
        }

        $review = $reservation->review;
        $eligibility = $this->eligibilityService?->checkEligibility($reservation, $reservation->user);

        $data['review'] = $review ? [
            'id' => $review->id,
            'overall_rating' => $review->overall_rating,
            'cleanliness_rating' => $review->cleanliness_rating,
            'food_quality_rating' => $review->food_quality_rating,
            'communication_rating' => $review->communication_rating,
            'value_rating' => $review->value_rating,
            'title' => $review->title,
            'content' => $review->content,
            'status' => $review->status->value,
            'status_label' => $review->status->label(),
            'can_be_edited' => $reservation->user ? $review->canBeEditedByUser($reservation->user) : false,
            'submitted_at' => $review->submitted_at?->toISOString(),
            'published_at' => $review->published_at?->toISOString(),
        ] : null;

        $data['review_eligibility'] = [
            'is_eligible' => $eligibility?->isEligible ?? false,
            'reason' => $eligibility?->reason ?? '',
            'days_remaining' => $eligibility?->daysRemaining,
            'window_deadline' => $eligibility?->windowDeadline?->format('d M Y'),
        ];

        $data = array_merge($data, $this->capabilities($reservation, $viewer));

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function propertySummary(Reservation $reservation): array
    {
        return [
            'name' => $reservation->snapshot_property_name ?? $reservation->property?->name,
            'locality' => $reservation->snapshot_property_locality ?? $reservation->property?->locality,
            'city' => $reservation->snapshot_property_city ?? $reservation->property?->city?->name,
            'state' => $reservation->snapshot_property_state ?? $reservation->property?->state,
            'country_code' => $reservation->snapshot_property_country_code ?? $reservation->property?->country_code,
        ];
    }

    /**
     * @return array{items: list<array<string, mixed>>, allocated: int}
     */
    private function allocationSummary(Reservation $reservation): array
    {
        $items = [];

        foreach ($reservation->allocations as $allocation) {
            $items[] = [
                'property_room_id' => $allocation->property_room_id,
                'room_number' => $allocation->room->room_number,
                'allocated_quantity' => $allocation->allocated_quantity,
            ];
        }

        return [
            'items' => $items,
            'allocated' => (int) $reservation->allocatedQuantity(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function availableRooms(Reservation $reservation): array
    {
        $roomType = $reservation->roomType;

        if (! $roomType instanceof PropertyRoomType) {
            return [];
        }

        $allocatedByRoom = $reservation->allocations->keyBy('property_room_id');
        $checkIn = $reservation->check_in_date->toDateString();
        $checkout = $reservation->checkout_date->toDateString();

        return $roomType->rooms()
            ->where('operational_status', PropertyRoomStatus::Active->value)
            ->whereDoesntHave('availabilityBlocks', function (Builder $query) use ($checkIn, $checkout): void {
                $query->where('scope', PropertyAvailabilityBlockScope::Room->value)
                    ->where('status', PropertyAvailabilityBlockStatus::Active->value)
                    ->whereDate('start_date', '<', $checkout)
                    ->whereDate('end_date', '>=', $checkIn);
            })
            ->orderBy('room_number')
            ->get()
            ->map(function (PropertyRoom $room) use ($allocatedByRoom, $reservation, $checkIn, $checkout): array {
                $occupiedByOthers = (int) ReservationRoomAllocation::query()
                    ->join('reservations', 'reservations.id', '=', 'reservation_room_allocations.reservation_id')
                    ->where('reservation_room_allocations.property_room_id', $room->id)
                    ->where('reservation_room_allocations.reservation_id', '!=', $reservation->id)
                    ->whereIn('reservations.status', ReservationStatus::consumableValues())
                    ->whereDate('reservations.check_in_date', '<', $checkout)
                    ->whereDate('reservations.checkout_date', '>', $checkIn)
                    ->sum('reservation_room_allocations.allocated_quantity');
                $roomCapacity = $reservation->quantity_basis->value === 'private_rooms'
                    ? 1
                    : (int) $reservation->snapshot_max_capacity;

                return [
                    'id' => $room->id,
                    'room_number' => $room->room_number,
                    'floor_number' => $room->floor_number,
                    'allocated_quantity' => $allocatedByRoom->has($room->id)
                        ? (int) $allocatedByRoom->get($room->id)->allocated_quantity
                        : 0,
                    'available_quantity' => max(0, $roomCapacity - $occupiedByOthers),
                ];
            })
            ->filter(static fn (array $room): bool => $room['available_quantity'] > 0 || $room['allocated_quantity'] > 0)
            ->values()
            ->all();
    }

    /**
     * @return array<string, bool>
     */
    private function capabilities(Reservation $reservation, string $viewer): array
    {
        $base = [
            'can_view' => true,
            'can_cancel' => false,
            'can_allocate' => false,
            'can_pay' => false,
            'can_view_receipt' => false,
            'can_refund' => false,
        ];

        if ($viewer === 'customer') {
            $base['can_cancel'] = $reservation->status->canBeCancelled();
            $base['can_pay'] = $reservation->status === ReservationStatus::AwaitingPayment
                && ($reservation->payment_deadline_at === null || $reservation->payment_deadline_at->isFuture());
            $base['can_view_receipt'] = $reservation->status === ReservationStatus::Confirmed
                && $reservation->successfulPayment !== null;

            return $base;
        }

        if ($viewer === 'owner') {
            $base['can_cancel'] = in_array($reservation->status, [ReservationStatus::AwaitingPayment, ReservationStatus::Confirmed], true);
            $base['can_allocate'] = $reservation->status === ReservationStatus::Confirmed;

            return $base;
        }

        if ($viewer === 'admin') {
            $base['can_refund'] = $reservation->successfulPayment !== null
                && $reservation->successfulPayment->refundableBalanceMinor() > 0;

            return $base;
        }

        return $base;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function paymentSummary(Reservation $reservation): ?array
    {
        $payment = $reservation->successfulPayment ?? $reservation->payments->first();

        if ($payment === null) {
            return null;
        }

        return [
            'id' => $payment->id,
            'gateway' => $payment->gateway,
            'gateway_order_id' => $payment->gateway_order_id,
            'gateway_payment_id' => $payment->gateway_payment_id,
            'status' => $payment->status->value,
            'status_label' => $payment->status->label(),
            'amount_minor' => $payment->amount_minor,
            'refunded_amount_minor' => $payment->refunded_amount_minor,
            'refundable_balance_minor' => $payment->refundableBalanceMinor(),
            'currency_code' => $payment->currency,
            'payment_method' => $payment->payment_method,
            'captured_at' => $payment->captured_at?->toISOString(),
            'failed_at' => $payment->failed_at?->toISOString(),
            'failure_reason' => $payment->failure_reason,
            'created_at' => $payment->created_at?->toISOString(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function refundsSummary(Reservation $reservation): array
    {
        return $reservation->refunds->map(fn ($refund): array => [
            'id' => $refund->id,
            'gateway_refund_id' => $refund->gateway_refund_id,
            'amount_minor' => $refund->amount_minor,
            'currency_code' => $refund->currency,
            'status' => $refund->status->value,
            'status_label' => $refund->status->label(),
            'reason' => $refund->reason,
            'admin_name' => $refund->initiatedByAdmin?->name,
            'processed_at' => $refund->gateway_processed_at?->toISOString(),
            'created_at' => $refund->created_at?->toISOString(),
        ])->all();
    }

    private function timeValue(mixed $time): ?string
    {
        if ($time === null) {
            return null;
        }

        if ($time instanceof \DateTimeInterface) {
            return $time->format('H:i');
        }

        return substr((string) $time, 0, 5);
    }
}
