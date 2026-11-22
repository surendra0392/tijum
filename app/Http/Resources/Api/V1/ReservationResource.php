<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Enums\PropertyGuestComposition;
use App\Enums\ReservationStatus;
use App\Models\Owner;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Models\User;
use App\Services\Reviews\ReviewEligibilityService;
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

        $paymentStatus = $this->paymentStatus();
        $hasCapturedPayment = $this->relationLoaded('successfulPayment')
            ? $this->successfulPayment !== null
            : ($this->relationLoaded('payments')
                ? $this->payments->contains(static fn (ReservationPayment $payment): bool => $payment->status->isSuccess())
                : $this->successfulPayment()->exists());

        /** @var ReservationPayment|null $latestPayment */
        $latestPayment = null;
        if ($this->relationLoaded('successfulPayment') && $this->successfulPayment !== null) {
            $latestPayment = $this->successfulPayment;
        } elseif ($this->relationLoaded('payments')) {
            $latestPayment = $this->payments->first(static fn (ReservationPayment $payment): bool => $payment->status->isSuccess())
                ?? $this->payments->sortByDesc('id')->first();
        }

        $paymentSummary = $latestPayment !== null ? [
            'id' => $latestPayment->id,
            'gateway' => $latestPayment->gateway,
            'gateway_order_id' => $latestPayment->gateway_order_id,
            'gateway_payment_id' => $latestPayment->gateway_payment_id,
            'status' => $latestPayment->status->value,
            'status_label' => $latestPayment->status->label(),
            'amount_minor' => (int) $latestPayment->amount_minor,
            'refunded_amount_minor' => (int) $latestPayment->refunded_amount_minor,
            'refundable_balance_minor' => $latestPayment->refundableBalanceMinor(),
            'currency_code' => $latestPayment->currency,
            'payment_method' => $latestPayment->payment_method,
            'captured_at' => $latestPayment->captured_at?->toIso8601String(),
            'failed_at' => $latestPayment->failed_at?->toIso8601String(),
            'failure_reason' => $latestPayment->failure_reason,
            'created_at' => $latestPayment->created_at->toIso8601String(),
        ] : null;

        $review = $this->relationLoaded('review') ? $this->review : null;
        $reviewEligibility = null;
        if ($this->relationLoaded('review')) {
            $actingUser = $request->user() instanceof User ? $request->user() : $this->user;
            $eligibilityResult = app(ReviewEligibilityService::class)->checkEligibility($this->resource, $actingUser);
            $reviewEligibility = [
                'is_eligible' => $eligibilityResult->isEligible,
                'reason' => $eligibilityResult->reason,
                'days_remaining' => $eligibilityResult->daysRemaining,
                'window_deadline' => $eligibilityResult->windowDeadline?->format('d M Y'),
            ];
        }

        $propertyCoords = $this->property?->resolvedCoordinates();
        $isOwner = $request->user() instanceof Owner;

        return array_merge([
            'id' => $this->id,
            'reference' => $this->booking_reference,
            'booking_reference' => $this->booking_reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_semantic' => $this->status->semantic(),
            'is_cancellable' => $this->status->canBeCancelled(),
            'can_cancel' => $this->status->canBeCancelled(),
            'can_pay' => $this->canAcceptPayment(),
            'is_awaiting_payment' => $this->status === ReservationStatus::AwaitingPayment,
            'is_payment_deadline_expired' => $this->isPaymentDeadlineExpired(),
            'is_confirmed' => $this->status === ReservationStatus::Confirmed,
            'is_cancelled' => $this->status === ReservationStatus::Cancelled,
            'is_expired' => $this->status === ReservationStatus::Expired,
            'requires_refund_review' => (bool) $this->requires_refund_review,
            'has_captured_payment' => $hasCapturedPayment,
            'payment_status' => $paymentStatus?->value,
            'payment_status_label' => $paymentStatus?->label(),
            'payment_summary' => $paymentSummary,
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
            'expired_at' => $this->expired_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'is_checked_in' => $this->checked_in_at !== null,
            'checked_in_at' => $this->checked_in_at?->toIso8601String(),
            'is_checked_out' => $this->checked_out_at !== null,
            'checked_out_at' => $this->checked_out_at?->toIso8601String(),
            'is_allocated' => $this->relationLoaded('allocations')
                ? $this->allocations->isNotEmpty()
                : $this->allocatedQuantity() > 0,
            'primary_room_number' => $this->relationLoaded('allocations')
                ? $this->allocations->first()?->room?->room_number
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
                'latitude' => $propertyCoords['latitude'] ?? null,
                'longitude' => $propertyCoords['longitude'] ?? null,
                'has_coordinates' => $propertyCoords !== null,
                'location_precision' => $propertyCoords !== null ? 'exact' : 'area_only',
                'cover_image_url' => $this->property->coverImageUrl(),
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
            'is_reviewed' => $this->relationLoaded('review') ? $review !== null : null,
            'review' => $review !== null ? [
                'id' => $review->id,
                'overall_rating' => (int) $review->overall_rating,
                'cleanliness_rating' => $review->cleanliness_rating !== null ? (int) $review->cleanliness_rating : null,
                'food_quality_rating' => $review->food_quality_rating !== null ? (int) $review->food_quality_rating : null,
                'communication_rating' => $review->communication_rating !== null ? (int) $review->communication_rating : null,
                'value_rating' => $review->value_rating !== null ? (int) $review->value_rating : null,
                'title' => $review->title,
                'content' => $review->content,
                'status' => $review->status->value,
                'status_label' => $review->status->label(),
                'submitted_at' => $review->submitted_at?->toIso8601String(),
                'published_at' => $review->published_at?->toIso8601String(),
                'created_at' => $review->created_at->toIso8601String(),
            ] : null,
            'review_eligibility' => $reviewEligibility,
            'timing' => $timing,
        ], $isOwner ? [
            'commission_amount_paise' => (int) ($this->commission_amount_minor ?? 0),
            'commission_tax_paise' => (int) ($this->commission_tax_amount_minor ?? 0),
            'owner_payable_paise' => (int) ($this->net_partner_payable_minor ?? 0),
        ] : []);
    }
}
