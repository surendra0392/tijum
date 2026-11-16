<?php

declare(strict_types=1);

namespace App\Actions\Reservations;

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Models\CouponHold;
use App\Models\CouponRedemption;
use App\Models\CustomerProtectionCase;
use App\Models\CustomerProtectionCaseMessage;
use App\Models\Owner;
use App\Models\PointsReservationHold;
use App\Models\Property;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use App\Policies\ReservationPolicy;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Promotions\CouponRedemptionService;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\StayTimingPolicy;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ReservationLifecycle
{
    public function __construct(
        private readonly ReservationPolicy $policy,
        private readonly StayTimingPolicy $timing,
    ) {}

    public function confirmPaid(Reservation $reservation, ?ReservationPayment $payment = null): Reservation
    {
        return DB::transaction(function () use ($reservation, $payment): Reservation {
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === ReservationStatus::Confirmed) {
                return $locked;
            }

            if ($locked->status !== ReservationStatus::AwaitingPayment) {
                // If payment captured after cancellation or expiry, do not reconfirm. Flag for refund review.
                $locked->forceFill([
                    'requires_refund_review' => true,
                ])->save();

                return $locked->fresh() ?? $locked;
            }

            $now = CarbonImmutable::now($this->timing->timezone());

            $locked->forceFill([
                'status' => ReservationStatus::Confirmed->value,
                'confirmed_at' => $now,
            ])->save();

            try {
                $resolvedPayment = $payment ?? $locked->payments()
                    ->where('status', PaymentStatus::Captured->value)
                    ->latest('id')
                    ->first();

                if ($resolvedPayment !== null) {
                    app(FinancialLedgerService::class)
                        ->recordPaymentCaptured($resolvedPayment);
                }

                // Commit promotional holds and register pending points
                /** @var CouponHold|null $couponHold */
                $couponHold = CouponHold::query()->where('reservation_id', $locked->id)->where('status', 'active')->first();
                if ($couponHold !== null) {
                    app(CouponRedemptionService::class)->commitHold($couponHold, $locked);
                }

                /** @var PointsReservationHold|null $pointsHold */
                $pointsHold = PointsReservationHold::query()->where('reservation_id', $locked->id)->where('status', 'active')->first();
                if ($pointsHold !== null) {
                    app(LoyaltyPointsService::class)->commitHold($pointsHold, $locked);
                }

                if ($locked->user !== null && $locked->points_awarded_potential > 0) {
                    app(LoyaltyPointsService::class)->recordPendingBookingPoints(
                        $locked->user,
                        $locked,
                        $locked->points_awarded_potential,
                    );
                }
            } catch (\Throwable $e) {
                Log::error('Reservation confirmation post-processing failed: '.$e->getMessage(), [
                    'exception' => $e,
                    'reservation_id' => $locked->id,
                ]);
            }

            $saved = $locked->fresh() ?? $locked;

            try {
                $saved->loadMissing(['user', 'property.owner']);
                if ($saved->user !== null && $saved->property !== null) {
                    app(NotificationDispatcher::class)->dispatch(
                        eventType: 'reservation.confirmed',
                        recipients: $saved->user,
                        variables: [
                            'customer_name' => $saved->user->name,
                            'booking_reference' => $saved->booking_reference,
                            'property_name' => $saved->property->name,
                            'check_in_date' => $saved->check_in_date->format('d M Y'),
                            'checkout_date' => $saved->checkout_date->format('d M Y'),
                            'amount' => number_format($saved->total_amount_minor / 100, 2),
                            'action_url' => url("/reservations/{$saved->id}"),
                        ],
                        related: $saved,
                        relatedReference: $saved->booking_reference
                    );

                    if ($saved->property->owner !== null) {
                        app(NotificationDispatcher::class)->dispatch(
                            eventType: 'partner.reservation_confirmed',
                            recipients: $saved->property->owner,
                            variables: [
                                'owner_name' => $saved->property->owner->name,
                                'booking_reference' => $saved->booking_reference,
                                'property_name' => $saved->property->name,
                                'check_in_date' => $saved->check_in_date->format('d M Y'),
                                'amount' => number_format($saved->total_amount_minor / 100, 2),
                                'action_url' => url("/owner/reservations/{$saved->id}"),
                            ],
                            related: $saved,
                            relatedReference: $saved->booking_reference
                        );
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Reservation confirmation notification dispatch failed: '.$e->getMessage(), [
                    'exception' => $e,
                    'reservation_id' => $saved->id,
                ]);
            }

            return $saved;
        }, 3);
    }

    public function expire(Reservation $reservation): Reservation
    {
        return DB::transaction(function () use ($reservation): Reservation {
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== ReservationStatus::AwaitingPayment) {
                return $locked;
            }

            $now = CarbonImmutable::now($this->timing->timezone());

            $locked->forceFill([
                'status' => ReservationStatus::Expired->value,
                'expired_at' => $now,
            ])->save();

            $locked->payments()
                ->whereIn('status', [PaymentStatus::Created->value, PaymentStatus::Authorized->value])
                ->update(['status' => PaymentStatus::Cancelled->value]);

            // Release promotions holds
            try {
                CouponHold::query()
                    ->where('reservation_id', $locked->id)
                    ->where('status', 'active')
                    ->get()
                    ->each(fn (CouponHold $h) => app(CouponRedemptionService::class)->releaseHold($h));

                PointsReservationHold::query()
                    ->where('reservation_id', $locked->id)
                    ->where('status', 'active')
                    ->get()
                    ->each(fn (PointsReservationHold $h) => app(LoyaltyPointsService::class)->releaseHold($h));
            } catch (\Throwable) {
                // Handled safely
            }

            $saved = $locked->fresh() ?? $locked;

            try {
                $saved->loadMissing(['user', 'property.owner']);
                if ($saved->user !== null && $saved->property !== null) {
                    app(NotificationDispatcher::class)->dispatch(
                        eventType: 'reservation.cancelled',
                        recipients: $saved->user,
                        variables: [
                            'customer_name' => $saved->user->name,
                            'booking_reference' => $saved->booking_reference,
                            'property_name' => $saved->property->name,
                            'action_url' => url("/reservations/{$saved->id}"),
                        ],
                        related: $saved,
                        relatedReference: $saved->booking_reference
                    );
                }
            } catch (\Throwable) {
            }

            return $saved;
        }, 3);
    }

    public function cancel(User|Owner $actor, Reservation $reservation, ?string $reason = null): Reservation
    {
        return DB::transaction(function () use ($actor, $reservation, $reason): Reservation {
            $isOwner = $actor instanceof Owner;

            if ($isOwner) {
                $lockedProperty = Property::query()->whereKey($reservation->property_id)->lockForUpdate()->firstOrFail();
                if ($lockedProperty->owner_id !== $actor->id || ! $this->policy->cancelByOwner($actor, $reservation)) {
                    throw ValidationException::withMessages([
                        'reservation' => 'You are not authorised to cancel this reservation.',
                    ]);
                }
            } elseif (! $this->policy->cancelByUser($actor, $reservation)) {
                throw ValidationException::withMessages([
                    'reservation' => 'You are not authorised to cancel this reservation.',
                ]);
            }

            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            if (! $locked->status->canBeCancelled()) {
                throw ValidationException::withMessages([
                    'status' => 'Only a pending, awaiting payment, or confirmed reservation can be cancelled.',
                ]);
            }

            $hasCapturedPayment = $locked->successfulPayment()->exists();

            $updates = [
                'status' => ReservationStatus::Cancelled->value,
                'cancelled_at' => CarbonImmutable::now($this->timing->timezone()),
                'cancellation_reason' => $reason !== null ? trim($reason) : null,
                'requires_refund_review' => $hasCapturedPayment,
            ];

            if ($isOwner) {
                $updates['cancelled_by_owner_id'] = $actor->id;
            } else {
                $updates['cancelled_by_user_id'] = $actor->id;
            }

            $locked->forceFill($updates)->save();

            // Cancel any pending payment orders if cancelled before payment capture
            if (! $hasCapturedPayment) {
                $locked->payments()
                    ->whereIn('status', [PaymentStatus::Created->value, PaymentStatus::Authorized->value])
                    ->update(['status' => PaymentStatus::Cancelled->value]);
            } else {
                // Auto-create customer protection case for paid reservation cancellations
                $nowUtc = CarbonImmutable::now();
                $caseRef = 'TPC-'.$nowUtc->format('Y').'-'.strtoupper(Str::ulid()->toBase32());
                $category = $isOwner ? CaseCategory::OwnerCancelled : CaseCategory::RefundRequest;
                $caseStatus = $isOwner ? CaseStatus::UnderReview : CaseStatus::RefundReview;
                $priority = $isOwner ? CasePriority::High : CasePriority::Standard;
                $desc = $isOwner
                    ? 'Host cancelled confirmed stay: '.($reason ?: 'Accommodation unavailable')
                    : 'Customer requested cancellation and refund review: '.($reason ?: 'Customer cancellation');

                /** @var CustomerProtectionCase $case */
                $case = CustomerProtectionCase::create([
                    'case_reference' => $caseRef,
                    'reservation_id' => $locked->id,
                    'user_id' => $locked->user_id,
                    'property_id' => $locked->property_id,
                    'owner_id' => $locked->property->owner_id,
                    'category' => $category,
                    'status' => $caseStatus,
                    'priority' => $priority,
                    'description' => $desc,
                    'sla_due_at' => $nowUtc->addDays((int) config('tijum.customer_protection.sla.resolution_days', 30)),
                ]);

                CustomerProtectionCaseMessage::create([
                    'customer_protection_case_id' => $case->id,
                    'sender_type' => $isOwner ? 'owner' : 'customer',
                    'sender_id' => $actor->id,
                    'sender_name' => $actor->name,
                    'message' => $desc,
                    'is_internal_note' => false,
                ]);
            }

            // Promotions rollback on cancellation:
            try {
                if (! $hasCapturedPayment) {
                    CouponHold::query()
                        ->where('reservation_id', $locked->id)
                        ->where('status', 'active')
                        ->get()
                        ->each(fn (CouponHold $h) => app(CouponRedemptionService::class)->releaseHold($h));

                    PointsReservationHold::query()
                        ->where('reservation_id', $locked->id)
                        ->where('status', 'active')
                        ->get()
                        ->each(fn (PointsReservationHold $h) => app(LoyaltyPointsService::class)->releaseHold($h));
                } else {
                    app(LoyaltyPointsService::class)->reversePendingPoints($locked, $reason ?? 'Reservation cancelled');
                    app(LoyaltyPointsService::class)->refundRedeemedPoints($locked, $reason ?? 'Reservation cancelled');

                    /** @var CouponRedemption|null $redemption */
                    $redemption = CouponRedemption::query()->where('reservation_id', $locked->id)->where('is_reverted', false)->first();
                    if ($redemption !== null) {
                        app(CouponRedemptionService::class)->revertRedemption($redemption, $reason ?? 'Reservation cancelled');
                    }
                }
            } catch (\Throwable) {
                // Handled safely
            }

            $saved = $locked->fresh() ?? $locked;

            try {
                $saved->loadMissing(['user', 'property.owner']);
                if ($saved->user !== null && $saved->property !== null) {
                    app(NotificationDispatcher::class)->dispatch(
                        eventType: 'reservation.cancelled',
                        recipients: $saved->user,
                        variables: [
                            'customer_name' => $saved->user->name,
                            'booking_reference' => $saved->booking_reference,
                            'property_name' => $saved->property->name,
                            'action_url' => url("/reservations/{$saved->id}"),
                        ],
                        related: $saved,
                        relatedReference: $saved->booking_reference
                    );
                }
            } catch (\Throwable) {
            }

            return $saved;
        }, 3);
    }
}
