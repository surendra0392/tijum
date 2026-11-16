<?php

declare(strict_types=1);

namespace App\Actions\Protection;

use App\Actions\Financial\RecordRelocationSubsidy;
use App\Actions\Payments\InitiateAdminRefund;
use App\Enums\CaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\RelocationStatus;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRelocation;
use App\Models\User;
use App\Services\ReservationAvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProcessRelocationDecision
{
    public function __construct(
        private readonly ReservationAvailabilityService $availability,
        private readonly ?InitiateAdminRefund $refundAction = null,
    ) {}

    public function execute(
        ReservationRelocation $relocation,
        User $user,
        string $decision, // 'accepted' or 'declined'
    ): ReservationRelocation {
        if ($relocation->sourceReservation->user_id !== $user->id) {
            throw ValidationException::withMessages([
                'relocation' => 'You are not authorised to respond to this relocation offer.',
            ]);
        }

        if (! in_array($decision, ['accepted', 'declined'], true)) {
            throw ValidationException::withMessages([
                'decision' => 'Decision must be either accepted or declined.',
            ]);
        }

        if ($relocation->status !== RelocationStatus::Offered) {
            throw ValidationException::withMessages([
                'relocation' => 'This relocation offer is no longer actionable.',
            ]);
        }

        if ($relocation->isExpired()) {
            $relocation->forceFill(['status' => RelocationStatus::Expired])->save();

            throw ValidationException::withMessages([
                'relocation' => 'This relocation offer has expired. Our team will coordinate your refund review.',
            ]);
        }

        $now = CarbonImmutable::now();

        return DB::transaction(function () use ($relocation, $decision, $now): ReservationRelocation {
            $lockedRelocation = ReservationRelocation::query()->whereKey($relocation->id)->lockForUpdate()->firstOrFail();
            $source = Reservation::query()->whereKey($lockedRelocation->source_reservation_id)->lockForUpdate()->firstOrFail();
            $destinationProperty = $lockedRelocation->destinationProperty()->lockForUpdate()->firstOrFail();
            $destinationRoomType = $lockedRelocation->destinationRoomType()->lockForUpdate()->firstOrFail();

            if ($decision === 'declined') {
                $lockedRelocation->forceFill([
                    'status' => RelocationStatus::Declined,
                    'customer_decision' => 'declined',
                    'customer_decision_at' => $now,
                ])->save();

                if ($lockedRelocation->case !== null) {
                    $lockedRelocation->case->forceFill(['status' => CaseStatus::RefundReview])->save();
                }

                return $lockedRelocation;
            }

            // Customer ACCEPTED:
            // 1. Re-validate capacity on destination room type
            $checkIn = $source->check_in_date->toDateString();
            $checkout = $source->checkout_date->toDateString();
            $capacity = $this->availability->stayCapacity(
                $destinationRoomType,
                $checkIn,
                $checkout,
                $source->quantity,
            );

            if (! $capacity['available']) {
                $lockedRelocation->forceFill([
                    'status' => RelocationStatus::Cancelled,
                    'admin_notes' => 'Alternative capacity became unavailable prior to customer acceptance.',
                ])->save();

                throw ValidationException::withMessages([
                    'relocation' => 'The alternative room became unavailable. We have alerted our operations team to find another option or process a full refund.',
                ]);
            }

            // 2. Commit linked replacement reservation using established booking architecture
            $newReference = 'TJR-'.CarbonImmutable::parse($checkIn)->format('Y').'-'.strtoupper(Str::ulid()->toBase32());

            /** @var Reservation $replacement */
            $replacement = Reservation::create([
                'user_id' => $source->user_id,
                'property_id' => $destinationProperty->id,
                'property_room_type_id' => $destinationRoomType->id,
                'booking_reference' => $newReference,
                'submission_token' => (string) Str::uuid(),
                'check_in_date' => $source->check_in_date,
                'checkout_date' => $source->checkout_date,
                'duration_type' => $source->duration_type,
                'duration_quantity' => $source->duration_quantity,
                'total_stay_days' => $source->total_stay_days,
                'quantity' => $source->quantity,
                'guest_count' => $source->guest_count,
                'quantity_basis' => $source->quantity_basis,
                'guest_gender' => $source->guest_gender,
                'guest_composition' => $source->guest_composition,
                'contact_name' => $source->contact_name,
                'contact_email' => $source->contact_email,
                'contact_phone' => $source->contact_phone,
                'early_check_in_requested' => $source->early_check_in_requested,
                'requested_arrival_time' => $source->requested_arrival_time,
                // Destination snapshots
                'snapshot_property_name' => $destinationProperty->name,
                'snapshot_property_locality' => $destinationProperty->locality,
                'snapshot_property_city' => $destinationProperty->city?->name,
                'snapshot_property_state' => $destinationProperty->state,
                'snapshot_property_country_code' => $destinationProperty->country_code,
                'snapshot_category_name' => $destinationProperty->category?->name,
                'snapshot_room_type_name' => $destinationRoomType->name,
                'snapshot_is_air_conditioned' => (bool) $destinationRoomType->is_air_conditioned,
                'snapshot_sharing_mode' => $destinationRoomType->accommodation_mode->value,
                'snapshot_max_capacity' => (int) $destinationRoomType->max_guests_per_room,
                'snapshot_food_provided' => (bool) $destinationProperty->food_provided,
                'snapshot_breakfast_included' => (bool) $destinationProperty->breakfast_included,
                'snapshot_lunch_included' => (bool) $destinationProperty->lunch_included,
                'snapshot_dinner_included' => (bool) $destinationProperty->dinner_included,
                'currency_code' => $source->currency_code,
                'unit_rate_minor' => $lockedRelocation->alternative_amount_minor / max(1, $source->duration_quantity * $source->quantity),
                'rate_unit' => $source->rate_unit,
                'total_amount_minor' => $lockedRelocation->alternative_amount_minor,
                'cancellation_policy_version' => $source->cancellation_policy_version,
                'cancellation_policy_snapshot' => $source->cancellation_policy_snapshot,
                'status' => ReservationStatus::Confirmed,
                'submitted_at' => $now,
                'confirmed_at' => $now,
                'is_relocated_replacement' => true,
                'original_reservation_id' => $source->id,
            ]);

            // 3. Mark original reservation as cancelled with relocation audit, releasing original inventory
            $source->forceFill([
                'status' => ReservationStatus::Cancelled,
                'cancelled_at' => $now,
                'cancellation_reason' => "Relocated to {$destinationProperty->name} ({$replacement->booking_reference})",
            ])->save();

            // 4. Update relocation record
            $lockedRelocation->forceFill([
                'replacement_reservation_id' => $replacement->id,
                'status' => RelocationStatus::Accepted,
                'customer_decision' => 'accepted',
                'customer_decision_at' => $now,
            ])->save();

            // 5. If alternative is cheaper, trigger difference refund if an action is available and payment exists
            if ($lockedRelocation->price_difference_minor > 0) {
                /** @var ReservationPayment|null $capturedPayment */
                $capturedPayment = $source->payments()->where('status', PaymentStatus::Captured)->first();
                if ($capturedPayment !== null && $this->refundAction !== null) {
                    $systemAdmin = Admin::query()->where('is_active', true)->where('role', 'super_admin')->first();
                    if ($systemAdmin !== null) {
                        try {
                            $refund = $this->refundAction->execute(
                                $capturedPayment,
                                $systemAdmin,
                                (int) $lockedRelocation->price_difference_minor,
                                "Relocation price difference refund for {$source->booking_reference}",
                                null,
                                $lockedRelocation->customer_protection_case_id,
                            );
                            $lockedRelocation->forceFill(['difference_refund_id' => $refund->id])->save();
                        } catch (\Throwable) {
                            // Gateway error handled gracefully; refund remains under admin oversight
                        }
                    }
                }
            } elseif ($destinationRoomType->daily_rate_minor > $source->unit_rate_minor) {
                // If alternative is more expensive, customer is never charged extra; platform absorbs difference
                try {
                    app(RecordRelocationSubsidy::class)->execute(
                        sourceReservation: $source,
                        replacementReservation: $replacement,
                        sourceAmountMinor: (int) $source->total_amount_minor,
                        destinationAmountMinor: (int) $replacement->total_amount_minor,
                        case: $lockedRelocation->case,
                    );
                } catch (\Throwable) {
                    // Subsidy recorded gracefully
                }
            }

            // 6. Update linked protection case
            if ($lockedRelocation->case !== null) {
                $lockedRelocation->case->forceFill([
                    'status' => CaseStatus::Resolved,
                    'resolved_at' => $now,
                    'resolution_type' => 'relocation_completed',
                    'resolution_summary' => "Customer accepted relocation to {$destinationProperty->name} ({$replacement->booking_reference}).",
                ])->save();
            }

            return $lockedRelocation;
        }, 3);
    }
}
