<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Enums\PropertyGuestComposition;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\ReservationRefund;
use App\Services\StayTimingPolicy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Reservation
 */
class ReservationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $timing = app(StayTimingPolicy::class)->timingSummary();
        $compositionEnum = PropertyGuestComposition::tryFrom((string) $this->guest_composition);

        $checkInTime = strlen((string) ($timing['standard_check_in_time'] ?? '')) === 5
            ? $timing['standard_check_in_time'].':00'
            : '09:00:00';
        $checkOutTime = strlen((string) ($timing['standard_check_out_time'] ?? '')) === 5
            ? $timing['standard_check_out_time'].':00'
            : '08:00:00';

        return [
            'id' => $this->id,
            'reference' => $this->booking_reference,
            'booking_reference' => $this->booking_reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_semantic' => $this->status->semantic(),
            'is_cancellable' => $this->status->canBeCancelled(),
            'is_awaiting_payment' => $this->status === ReservationStatus::AwaitingPayment,
            'is_confirmed' => $this->status === ReservationStatus::Confirmed,
            'is_cancelled' => $this->status === ReservationStatus::Cancelled,
            'is_expired' => $this->status === ReservationStatus::Expired,
            'check_in_date' => $this->check_in_date?->format('Y-m-d'),
            'check_out_date' => ($this->checkout_date ?? $this->check_out_date)?->format('Y-m-d'),
            'check_in_time' => $checkInTime,
            'check_out_time' => $checkOutTime,
            'duration_type' => $this->duration_type ?: 'monthly',
            'duration_quantity' => (int) $this->duration_quantity,
            'total_stay_days' => (int) ($this->total_stay_days ?? 0),
            'quantity' => (int) $this->quantity,
            'guest_count' => (int) $this->guest_count,
            'guest_gender' => $this->guest_gender,
            'guest_composition' => $this->guest_composition ?: PropertyGuestComposition::Individuals->value,
            'guest_composition_label' => $compositionEnum?->label() ?? 'Individuals',
            'contact_name' => $this->contact_name,
            'contact_email' => $this->contact_email,
            'contact_phone' => $this->contact_phone,
            'customer_name' => $this->contact_name ?: ($this->relationLoaded('user') ? $this->user?->name : null),
            'original_amount_paise' => (int) ($this->original_amount_minor ?? $this->total_amount_minor ?? 0),
            'total_amount_paise' => (int) ($this->total_amount_minor ?? $this->total_amount_paise ?? 0),
            'coupon_code' => $this->coupon_code,
            'coupon_discount_paise' => (int) ($this->coupon_discount_minor ?? 0),
            'points_redeemed' => (int) ($this->points_redeemed ?? 0),
            'points_discount_paise' => (int) ($this->points_discount_minor ?? 0),
            'points_awarded_potential' => (int) ($this->points_awarded_potential ?? 0),
            'early_check_in_requested' => (bool) $this->early_check_in_requested,
            'requested_arrival_time' => $this->requested_arrival_time,
            'cancellation_reason' => $this->cancellation_reason,
            'property_name' => $this->snapshot_property_name ?: ($this->property?->name ?? 'Stay'),
            'room_type_name' => $this->snapshot_room_type_name ?: ($this->roomType?->name ?? 'Room'),
            'currency_code' => $this->currency_code,
            'payment_deadline_at' => $this->payment_deadline_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'checked_in_at' => $this->checked_in_at?->toIso8601String(),
            'checked_out_at' => $this->checked_out_at?->toIso8601String(),
            'is_allocated' => $this->relationLoaded('allocations')
                ? $this->allocations->isNotEmpty()
                : $this->allocatedQuantity() > 0,
            'primary_room_number' => $this->relationLoaded('allocations')
                ? $this->allocations->first()?->room->room_number
                : null,
            'allocations' => $this->relationLoaded('allocations')
                ? $this->allocations->map(static fn ($a): array => [
                    'id' => $a->id,
                    'property_room_id' => $a->property_room_id,
                    'room_number' => $a->room->room_number,
                    'floor_number' => $a->room->floor_number,
                    'allocated_quantity' => (int) $a->allocated_quantity,
                ])->values()->all()
                : [],
            'created_at' => $this->created_at?->toIso8601String(),
            'food_inclusions' => [
                'provided' => (bool) ($this->snapshot_food_provided ?? ($this->property ? $this->property->food_provided : false)),
                'breakfast' => (bool) ($this->snapshot_breakfast_included ?? ($this->property ? $this->property->breakfast_included : false)),
                'lunch' => (bool) ($this->snapshot_lunch_included ?? ($this->property ? $this->property->lunch_included : false)),
                'dinner' => (bool) ($this->snapshot_dinner_included ?? ($this->property ? $this->property->dinner_included : false)),
            ],
            'property' => $this->property ? [
                'id' => $this->property->id,
                'name' => $this->property->name,
                'slug' => $this->property->slug,
                'locality' => $this->property->locality ?: $this->property->city?->name,
                'city' => $this->property->city?->name,
                'address' => $this->property->address_line_1,
                'latitude' => $this->property->latitude !== null ? (float) $this->property->latitude : null,
                'longitude' => $this->property->longitude !== null ? (float) $this->property->longitude : null,
                'cover_image_url' => $this->property->coverImageUrl() ?: '/images/public/hero-stay.jpg',
                'food_provided' => (bool) $this->property->food_provided,
                'breakfast_included' => (bool) $this->property->breakfast_included,
                'lunch_included' => (bool) $this->property->lunch_included,
                'dinner_included' => (bool) $this->property->dinner_included,
            ] : null,
            'room_type' => $this->roomType ? [
                'id' => $this->roomType->id,
                'name' => $this->roomType->name,
                'accommodation_mode' => $this->roomType->accommodation_mode?->value ?? 'private',
                'is_air_conditioned' => (bool) $this->roomType->is_air_conditioned,
            ] : null,
            'refunds' => $this->relationLoaded('refunds')
                ? $this->refunds->map(static fn (ReservationRefund $r): array => [
                    'id' => $r->id,
                    'amount_minor' => (int) $r->amount_minor,
                    'currency' => $r->currency,
                    'status' => $r->status->value,
                    'status_label' => $r->status->label(),
                    'reason' => $r->reason,
                    'gateway_refund_id' => $r->gateway_refund_id,
                    'utr' => (string) ($r->metadata['utr'] ?? $r->metadata['acquirer_data']['rrn'] ?? $r->gateway_refund_id ?? ''),
                    'gateway_processed_at' => $r->gateway_processed_at?->toIso8601String(),
                    'created_at' => $r->created_at->toIso8601String(),
                ])->values()->all()
                : [],
            'timing' => $timing,
        ];
    }
}
