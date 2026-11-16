<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Models\Reservation;
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

        return [
            'id' => $this->id,
            'reference' => $this->booking_reference,
            'booking_reference' => $this->booking_reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_cancellable' => $this->status->canBeCancelled(),
            'is_awaiting_payment' => $this->status->value === 'awaiting_payment',
            'check_in_date' => $this->check_in_date?->format('Y-m-d'),
            'check_out_date' => ($this->checkout_date ?? $this->check_out_date)?->format('Y-m-d'),
            'duration_type' => $this->duration_type ?: 'monthly',
            'duration_quantity' => (int) $this->duration_quantity,
            'quantity' => (int) $this->quantity,
            'guest_count' => (int) $this->guest_count,
            'guest_gender' => $this->guest_gender,
            'total_amount_paise' => (int) ($this->total_amount_minor ?? $this->total_amount_paise ?? 0),
            'property_name' => $this->snapshot_property_name ?: ($this->property?->name ?? 'Stay'),
            'room_type_name' => $this->snapshot_room_type_name ?: ($this->roomType?->name ?? 'Room'),
            'currency_code' => $this->currency_code,
            'payment_deadline_at' => $this->payment_deadline_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'property' => $this->property ? [
                'id' => $this->property->id,
                'name' => $this->property->name,
                'slug' => $this->property->slug,
                'locality' => $this->property->locality ?: $this->property->city?->name,
                'city' => $this->property->city?->name,
                'address' => $this->property->address_line_1,
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
            'timing' => $timing,
        ];
    }
}
