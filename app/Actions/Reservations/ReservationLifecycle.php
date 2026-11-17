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

                try {
                    app(NotificationDispatcher::class)->dispatchToAdmins(
                        eventType: 'admin.payment_exception',
                        variables: [
                            'booking_reference' => $locked->booking_reference,
                            'payment_reference' => $payment !== null ? ($payment->gateway_payment_id ?? $payment->gateway_order_id) : 'N/A',
                            'exception_type' => 'Late Payment After '.Str::headline($locked->status->value),
                            'error_description' => 'Payment captured after reservation status transitioned to '.$locked->status->value.'. Manual refund review required.',
                            'created_at' => now()->setTimezone($this->timing->timezone())->format('d M Y, H:i T'),
                            'action_url' => url("/admin/reservations/{$locked->id}"),
                        ],
                        related: $locked,
                        relatedReference: $locked->booking_reference,
                        idempotencySeed: 'late_payment_exception_'.$locked->id.'_'.($payment !== null ? $payment->id : 'none'),
                    );
                } catch (\Throwable $e) {
                    Log::warning('Failed to dispatch admin.payment_exception: '.$e->getMessage(), [
                        'reservation_id' => $locked->id,
                    ]);
                }

                return $locked->fresh() ?? $locked;
            }

            $now = CarbonImmutable::now($this->timing->timezone());

            $locked->forceFill([
                'status' => ReservationStatus::Confirmed->value,
                'confirmed_at' => $now,
            ])->save();

            $pointsHold = null;

            $pointsHold = null;
            $pointsCommitted = false;

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

            $saved = $locked->fresh() ?? $locked;
            $savedId = $saved->id;
            $paymentId = $payment?->id;
            $pointsHeldAmount = $pointsCommitted && $pointsHold !== null ? (int) $pointsHold->points_held : 0;
            $pointsDiscountAmount = $pointsCommitted && $pointsHold !== null ? (int) $pointsHold->inr_discount_minor : 0;

            DB::afterCommit(function () use ($savedId, $paymentId, $pointsCommitted, $pointsHeldAmount, $pointsDiscountAmount): void {
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
                        ? ReservationPayment::query()->find($paymentId)
                        : $confirmed->payments->where('status', PaymentStatus::Captured)->sortByDesc('id')->first();
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
                            'action_url' => url("/reservations/{$confirmed->id}"),
                        ],
                        related: $confirmed,
                        relatedReference: $confirmed->booking_reference
                    );

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
                            'action_url' => url("/reservations/{$confirmed->id}"),
                        ],
                        related: $confirmed,
                        relatedReference: $confirmed->booking_reference,
                        idempotencySeed: 'payment_captured_'.$confirmed->id.'_'.($capturedPayment !== null ? $capturedPayment->id : 'confirmed')
                    );

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
                                'action_url' => url("/owner/reservations/{$confirmed->id}"),
                            ],
                            related: $confirmed,
                            relatedReference: $confirmed->booking_reference
                        );

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
                                'action_url' => url("/owner/reservations/{$confirmed->id}"),
                            ],
                            related: $confirmed,
                            relatedReference: $confirmed->booking_reference,
                            idempotencySeed: 'partner_payment_confirmed_'.$confirmed->id
                        );
                    }
                } catch (\Throwable $e) {
                    Log::warning('Reservation confirmation notification dispatch failed: '.$e->getMessage(), [
                        'exception' => $e,
                        'reservation_id' => $savedId,
                    ]);
                }
            });

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
                            'action_url' => url("/reservations/{$saved->id}"),
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
                            'action_url' => url("/reservations/{$saved->id}"),
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
                                'action_url' => url("/owner/reservations/{$saved->id}"),
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
