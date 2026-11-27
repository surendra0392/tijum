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
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use App\Policies\ReservationPolicy;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Promotions\CouponRedemptionService;
use App\Services\ReservationAvailabilityService;
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
            // Booking creation serializes capacity decisions on the same property row.
            Property::query()->whereKey($reservation->property_id)->lockForUpdate()->firstOrFail();
            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();
            $resolvedPayment = $payment !== null
                ? $locked->payments()->whereKey($payment->id)->lockForUpdate()->firstOrFail()
                : $locked->payments()->where('status', PaymentStatus::Captured)->latest('id')->lockForUpdate()->first();

            if ($resolvedPayment === null || $resolvedPayment->status !== PaymentStatus::Captured
                || $resolvedPayment->gateway_payment_id === null || $resolvedPayment->user_id !== $locked->user_id
                || $resolvedPayment->amount_minor !== $locked->total_amount_minor
                || strtoupper($resolvedPayment->currency) !== strtoupper($locked->currency_code)) {
                throw ValidationException::withMessages(['payment' => 'A matching captured payment is required to confirm this reservation.']);
            }

            app(FinancialLedgerService::class)->recordPaymentCaptured($resolvedPayment);

            if ($locked->status === ReservationStatus::Confirmed) {
                if ($locked->payments()->whereKeyNot($resolvedPayment->id)
                    ->whereIn('status', [PaymentStatus::Captured, PaymentStatus::RefundPending, PaymentStatus::PartiallyRefunded, PaymentStatus::Refunded])->exists()) {
                    return $this->flagPaymentForReview($locked, $resolvedPayment, 'A second capture was received for a confirmed reservation.');
                }

                return $locked;
            }

            if ($locked->status !== ReservationStatus::AwaitingPayment) {
                return $this->flagPaymentForReview($locked, $resolvedPayment, 'Payment arrived after the reservation became '.$locked->status->value.'.');
            }

            $roomType = PropertyRoomType::query()->whereKey($locked->property_room_type_id)
                ->where('property_id', $locked->property_id)->lockForUpdate()->first();
            if ($roomType === null || ! $roomType->is_active || ! app(ReservationAvailabilityService::class)->stayCapacity(
                $roomType,
                $locked->check_in_date->toDateString(),
                $locked->checkout_date->toDateString(),
                $locked->quantity,
                excludingReservationId: $locked->id,
            )['available']) {
                return $this->flagPaymentForReview(
                    $this->expire($locked, notify: false),
                    $resolvedPayment,
                    'Payment was captured but there is insufficient inventory to fulfil the reservation.',
                );
            }

            $now = CarbonImmutable::now($this->timing->timezone());

            $locked->forceFill([
                'status' => ReservationStatus::Confirmed->value,
                'confirmed_at' => $now,
            ])->save();

            [$pointsHold, $pointsCommitted] = $this->commitPromotionalHolds($locked);

            $saved = $locked->fresh() ?? $locked;
            $savedId = $saved->id;
            $paymentId = $resolvedPayment->id;
            $pointsHeldAmount = $pointsCommitted && $pointsHold !== null ? (int) $pointsHold->points_held : 0;
            $pointsDiscountAmount = $pointsCommitted && $pointsHold !== null ? (int) $pointsHold->inr_discount_minor : 0;

            DB::afterCommit(fn () => $this->dispatchConfirmationNotifications(
                $savedId,
                $paymentId,
                $pointsCommitted,
                $pointsHeldAmount,
                $pointsDiscountAmount,
            ));

            return $saved;
        }, 3);
    }

    public function confirmZeroPayable(Reservation $reservation): Reservation
    {
        return DB::transaction(function () use ($reservation): Reservation {
            Property::query()->whereKey($reservation->property_id)->lockForUpdate()->firstOrFail();

            $locked = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();
            if ($locked->total_amount_minor !== 0) {
                throw ValidationException::withMessages([
                    'payment' => 'Zero-payable confirmation is only permitted when total_amount_minor is zero.',
                ]);
            }

            if ($locked->status === ReservationStatus::Confirmed) {
                return $locked;
            }

            if ($locked->status !== ReservationStatus::AwaitingPayment) {
                throw ValidationException::withMessages([
                    'reservation' => 'Only awaiting-payment reservations can be confirmed without a payment.',
                ]);
            }

            $roomType = PropertyRoomType::query()->whereKey($locked->property_room_type_id)
                ->where('property_id', $locked->property_id)->lockForUpdate()->first();
            if ($roomType === null || ! $roomType->is_active || ! app(ReservationAvailabilityService::class)->stayCapacity(
                $roomType,
                $locked->check_in_date->toDateString(),
                $locked->checkout_date->toDateString(),
                $locked->quantity,
                excludingReservationId: $locked->id,
            )['available']) {
                throw ValidationException::withMessages([
                    'room_type_id' => 'The selected rooms are no longer available for the chosen dates.',
                ]);
            }

            $now = CarbonImmutable::now($this->timing->timezone());

            $locked->forceFill([
                'status' => ReservationStatus::Confirmed->value,
                'confirmed_at' => $now,
                'payment_deadline_at' => null,
            ])->save();

            [$pointsHold, $pointsCommitted] = $this->commitPromotionalHolds($locked);

            $saved = $locked->fresh() ?? $locked;
            $savedId = $saved->id;
            $pointsHeldAmount = $pointsCommitted && $pointsHold !== null ? (int) $pointsHold->points_held : 0;
            $pointsDiscountAmount = $pointsCommitted && $pointsHold !== null ? (int) $pointsHold->inr_discount_minor : 0;

            DB::afterCommit(fn () => $this->dispatchConfirmationNotifications(
                $savedId,
                null,
                $pointsCommitted,
                $pointsHeldAmount,
                $pointsDiscountAmount,
            ));

            return $saved;
        }, 3);
    }

    /**
     * @return array{0: ?PointsReservationHold, 1: bool}
     */
    private function commitPromotionalHolds(Reservation $locked): array
    {
        $pointsHold = null;
        $pointsCommitted = false;

        try {
            /** @var CouponHold|null $couponHold */
            $couponHold = CouponHold::query()->where('reservation_id', $locked->id)->where('status', 'active')->first();
            if ($couponHold !== null) {
                app(CouponRedemptionService::class)->commitHold($couponHold, $locked);
            }

            /** @var PointsReservationHold|null $pointsHold */
            $pointsHold = PointsReservationHold::query()->where('reservation_id', $locked->id)->where('status', 'active')->first();
            if ($pointsHold !== null) {
                app(LoyaltyPointsService::class)->commitHold($pointsHold, $locked);
                $pointsCommitted = true;
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

        return [$pointsHold, $pointsCommitted];
    }

    private function dispatchConfirmationNotifications(
        int $savedId,
        ?int $paymentId,
        bool $pointsCommitted,
        int $pointsHeldAmount,
        int $pointsDiscountAmount,
    ): void {
        try {
            $confirmed = Reservation::query()->with(['user', 'property.owner', 'roomType', 'payments'])->find($savedId);
            if ($confirmed === null || $confirmed->user === null || $confirmed->property === null) {
                return;
            }

            $dispatcher = app(NotificationDispatcher::class);
            $timezone = $this->timing->timezone();
            $roomTypeName = $confirmed->snapshot_room_type_name ?: $confirmed->roomType->name;
            $amountFormatted = '₹'.number_format($confirmed->total_amount_minor / 100, 2);
            $checkInDateFormatted = $confirmed->check_in_date->format('d M Y');
            $checkoutDateFormatted = $confirmed->checkout_date->format('d M Y');
            $checkInTime = $this->timing->getStandardCheckInTime().' IST';
            $checkoutTime = $this->timing->getStandardCheckOutTime().' IST';
            $capturedPayment = $paymentId !== null
                ? (ReservationPayment::query()->find($paymentId)
                    ?? $confirmed->payments->where('status', PaymentStatus::Captured)->sortByDesc('id')->first())
                : null;
            $paymentReference = $capturedPayment !== null
                ? ($capturedPayment->gateway_payment_id ?: $capturedPayment->gateway_order_id)
                : 'PAY-'.$confirmed->booking_reference;
            $paymentMethod = Str::headline((string) data_get($capturedPayment?->metadata, 'method', 'Razorpay'));
            $capturedAtFormatted = ($capturedPayment !== null && $capturedPayment->captured_at !== null ? $capturedPayment->captured_at : ($confirmed->confirmed_at ?? now()))
                ->setTimezone($timezone)
                ->format('d M Y, H:i T');

            $dispatcher->dispatch(
                eventType: 'reservation.confirmed',
                recipients: $confirmed->user,
                variables: [
                    'customer_name' => $confirmed->user->name,
                    'booking_reference' => $confirmed->booking_reference,
                    'property_name' => $confirmed->property->name,
                    'room_type' => $roomTypeName,
                    'check_in_date' => $checkInDateFormatted,
                    'checkout_date' => $checkoutDateFormatted,
                    'check_in_time' => $checkInTime,
                    'checkout_time' => $checkoutTime,
                    'amount' => $amountFormatted,
                    'action_url' => route('reservations.show', $confirmed),
                ],
                related: $confirmed,
                relatedReference: $confirmed->booking_reference
            );

            if ($capturedPayment !== null) {
                $dispatcher->dispatch(
                    eventType: 'payment.captured',
                    recipients: $confirmed->user,
                    variables: [
                        'customer_name' => $confirmed->user->name,
                        'booking_reference' => $confirmed->booking_reference,
                        'property_name' => $confirmed->property->name,
                        'amount' => $amountFormatted,
                        'payment_reference' => $paymentReference,
                        'payment_method' => $paymentMethod,
                        'captured_at' => $capturedAtFormatted,
                        'action_url' => route('reservations.show', $confirmed),
                    ],
                    related: $confirmed,
                    relatedReference: $confirmed->booking_reference,
                    idempotencySeed: 'payment_captured_'.$confirmed->id.'_'.$capturedPayment->id
                );
            }

            if ($pointsCommitted && $pointsHeldAmount > 0) {
                $wallet = app(LoyaltyPointsService::class)->getOrCreateWallet($confirmed->user);
                $dispatcher->dispatch(
                    eventType: 'rewards.points_redeemed',
                    recipients: $confirmed->user,
                    variables: [
                        'customer_name' => $confirmed->user->name,
                        'booking_reference' => $confirmed->booking_reference,
                        'property_name' => $confirmed->property->name,
                        'points_redeemed' => number_format($pointsHeldAmount),
                        'points_balance' => number_format($wallet->available_points),
                        'monetary_value' => '₹'.number_format($pointsDiscountAmount / 100, 2),
                        'action_url' => url('/rewards'),
                    ],
                    related: $confirmed,
                    relatedReference: $confirmed->booking_reference,
                    idempotencySeed: 'points_redeemed_'.$confirmed->id
                );
            }

            if ($confirmed->property->owner !== null) {
                $dispatcher->dispatch(
                    eventType: 'partner.reservation_confirmed',
                    recipients: $confirmed->property->owner,
                    variables: [
                        'owner_name' => $confirmed->property->owner->name,
                        'booking_reference' => $confirmed->booking_reference,
                        'property_name' => $confirmed->property->name,
                        'room_type' => $roomTypeName,
                        'check_in_date' => $checkInDateFormatted,
                        'checkout_date' => $checkoutDateFormatted,
                        'guest_count' => (string) $confirmed->guest_count,
                        'amount' => $amountFormatted,
                        'action_url' => route('owner.reservations.show', $confirmed),
                    ],
                    related: $confirmed,
                    relatedReference: $confirmed->booking_reference
                );

                if ($capturedPayment !== null) {
                    $dispatcher->dispatch(
                        eventType: 'partner.payment_confirmed',
                        recipients: $confirmed->property->owner,
                        variables: [
                            'owner_name' => $confirmed->property->owner->name,
                            'booking_reference' => $confirmed->booking_reference,
                            'property_name' => $confirmed->property->name,
                            'amount' => $amountFormatted,
                            'payment_reference' => $paymentReference,
                            'captured_at' => $capturedAtFormatted,
                            'action_url' => route('owner.reservations.show', $confirmed),
                        ],
                        related: $confirmed,
                        relatedReference: $confirmed->booking_reference,
                        idempotencySeed: 'partner_payment_confirmed_'.$confirmed->id
                    );
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Reservation confirmation notification dispatch failed: '.$e->getMessage(), [
                'exception' => $e,
                'reservation_id' => $savedId,
            ]);
        }
    }

    private function flagPaymentForReview(Reservation $reservation, ReservationPayment $payment, string $reason): Reservation
    {
        $reservation->forceFill(['requires_refund_review' => true])->save();

        DB::afterCommit(function () use ($reservation, $payment, $reason): void {
            try {
                app(NotificationDispatcher::class)->dispatchToAdmins(
                    eventType: 'admin.payment_exception',
                    variables: [
                        'booking_reference' => $reservation->booking_reference,
                        'payment_reference' => $payment->gateway_payment_id ?? $payment->gateway_order_id,
                        'exception_type' => 'Captured Payment Requires Review',
                        'error_description' => $reason.' Manual refund review required.',
                        'created_at' => now()->setTimezone($this->timing->timezone())->format('d M Y, H:i T'),
                        'action_url' => route('admin.reservations.show', $reservation),
                    ],
                    related: $reservation,
                    relatedReference: $reservation->booking_reference,
                    idempotencySeed: 'late_payment_exception_'.$reservation->id.'_'.$payment->id,
                );
            } catch (\Throwable $e) {
                Log::warning('Failed to dispatch admin.payment_exception.', ['reservation_id' => $reservation->id, 'exception' => $e]);
            }
        });

        return $reservation;
    }

    public function expire(Reservation $reservation, bool $notify = true): Reservation
    {
        return DB::transaction(function () use ($reservation, $notify): Reservation {
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
                ->whereIn('status', [PaymentStatus::Created->value, PaymentStatus::Pending->value, PaymentStatus::Authorized->value])
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
            } catch (\Throwable $e) {
                Log::error('Failed to release promotional holds on reservation expiry: '.$e->getMessage(), [
                    'exception' => $e,
                    'reservation_id' => $locked->id,
                ]);
            }

            $saved = $locked->fresh() ?? $locked;

            if (! $notify) {
                return $saved;
            }

            try {
                $saved->loadMissing(['user', 'property']);
                if ($saved->user !== null && $saved->property !== null) {
                    app(NotificationDispatcher::class)->dispatch(
                        eventType: 'reservation.payment_expired',
                        recipients: $saved->user,
                        variables: [
                            'customer_name' => $saved->user->name,
                            'booking_reference' => $saved->booking_reference,
                            'property_name' => $saved->property->name,
                            'expired_at' => ($saved->expired_at ?? now())->setTimezone($this->timing->timezone())->format('d M Y, H:i T'),
                            'action_url' => route('reservations.show', $saved),
                        ],
                        related: $saved,
                        relatedReference: $saved->booking_reference,
                        idempotencySeed: 'payment_expired_'.$saved->id
                    );
                }
            } catch (\Throwable $e) {
                Log::warning('Reservation expiry notification dispatch failed: '.$e->getMessage(), [
                    'reservation_id' => $saved->id,
                ]);
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

            $previousStatus = $locked->status;
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
                    ->whereIn('status', [PaymentStatus::Created->value, PaymentStatus::Pending->value, PaymentStatus::Authorized->value])
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

            // Promotions rollback on cancellation (handles both paid and zero-payable confirmed reservations):
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

                $hadCommittedPromotions = $previousStatus === ReservationStatus::Confirmed
                    || $hasCapturedPayment
                    || CouponRedemption::query()->where('reservation_id', $locked->id)->where('is_reverted', false)->exists();

                if ($hadCommittedPromotions) {
                    app(LoyaltyPointsService::class)->reversePendingPoints($locked, $reason ?? 'Reservation cancelled');
                    app(LoyaltyPointsService::class)->refundRedeemedPoints($locked, $reason ?? 'Reservation cancelled');

                    /** @var CouponRedemption|null $redemption */
                    $redemption = CouponRedemption::query()->where('reservation_id', $locked->id)->where('is_reverted', false)->first();
                    if ($redemption !== null) {
                        app(CouponRedemptionService::class)->revertRedemption($redemption, $reason ?? 'Reservation cancelled');
                    }
                }
            } catch (\Throwable $e) {
                Log::error('Failed to roll back promotions on reservation cancellation: '.$e->getMessage(), [
                    'exception' => $e,
                    'reservation_id' => $locked->id,
                ]);
            }

            $saved = $locked->fresh() ?? $locked;

            try {
                $saved->loadMissing(['user', 'property.owner', 'payments', 'refunds']);
                if ($saved->user !== null && $saved->property !== null) {
                    $dispatcher = app(NotificationDispatcher::class);
                    $cancelledAt = ($saved->cancelled_at ?? now())->setTimezone($this->timing->timezone())->format('d M Y, H:i T');
                    $cancellationReason = filled($saved->cancellation_reason) ? (string) $saved->cancellation_reason : 'Cancelled upon request';
                    $latestRefund = $saved->refunds->sortByDesc('id')->first();
                    $refundStatus = match (true) {
                        $latestRefund !== null => Str::headline($latestRefund->status->value),
                        $hasCapturedPayment => 'Eligible for refund review',
                        default => 'No payment captured',
                    };

                    $dispatcher->dispatch(
                        eventType: 'reservation.cancelled',
                        recipients: $saved->user,
                        variables: [
                            'customer_name' => $saved->user->name,
                            'booking_reference' => $saved->booking_reference,
                            'property_name' => $saved->property->name,
                            'cancellation_reason' => $cancellationReason,
                            'cancelled_at' => $cancelledAt,
                            'refund_status' => $refundStatus,
                            'action_url' => route('reservations.show', $saved),
                        ],
                        related: $saved,
                        relatedReference: $saved->booking_reference,
                        idempotencySeed: 'reservation_cancelled_'.$saved->id
                    );

                    if ($saved->property->owner !== null && ($previousStatus === ReservationStatus::Confirmed || $hasCapturedPayment)) {
                        $dispatcher->dispatch(
                            eventType: 'partner.reservation_cancelled',
                            recipients: $saved->property->owner,
                            variables: [
                                'owner_name' => $saved->property->owner->name,
                                'booking_reference' => $saved->booking_reference,
                                'property_name' => $saved->property->name,
                                'cancelled_at' => $cancelledAt,
                                'cancellation_reason' => $cancellationReason,
                                'inventory_release_status' => 'Room inventory released',
                                'action_url' => route('owner.reservations.show', $saved),
                            ],
                            related: $saved,
                            relatedReference: $saved->booking_reference,
                            idempotencySeed: 'partner_reservation_cancelled_'.$saved->id
                        );
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('Reservation cancellation notification dispatch failed: '.$e->getMessage(), [
                    'reservation_id' => $saved->id,
                ]);
            }

            return $saved;
        }, 3);
    }
}
