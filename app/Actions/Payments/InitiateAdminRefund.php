<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Models\Admin;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class InitiateAdminRefund
{
    public function __construct(private readonly PaymentGateway $gateway) {}

    public function execute(
        ReservationPayment $payment,
        Admin $admin,
        int $amountMinor,
        string $reason,
        ?string $idempotencyKey = null,
        ?int $caseId = null,
    ): ReservationRefund {
        if (! $admin->isActive() || (! $admin->hasPermission('bookings.manage') && ! $admin->hasPermission('refunds.manage'))) {
            throw ValidationException::withMessages([
                'admin' => 'You are not authorised to initiate refunds.',
            ]);
        }

        if ($amountMinor <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Refund amount must be greater than zero.',
            ]);
        }

        $idempotency = $idempotencyKey ?: (string) Str::uuid();

        // Phase 1: Create pending refund in DB transaction
        /** @var ReservationRefund $refund */
        $refund = DB::transaction(function () use ($admin, $payment, $amountMinor, $reason, $idempotency, $caseId): ReservationRefund {
            $lockedPayment = ReservationPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if (! $lockedPayment->isCaptured()) {
                throw ValidationException::withMessages([
                    'payment' => 'Only captured payments can be refunded.',
                ]);
            }

            $refundable = $lockedPayment->remainingRefundableAmount();
            if ($amountMinor > $refundable) {
                $maxFormatted = number_format($refundable / 100, 2);
                throw ValidationException::withMessages([
                    'amount' => "Refund amount exceeds maximum refundable balance of ₹{$maxFormatted}.",
                ]);
            }

            return ReservationRefund::create([
                'reservation_payment_id' => $lockedPayment->id,
                'reservation_id' => $lockedPayment->reservation_id,
                'customer_protection_case_id' => $caseId,
                'initiated_by_admin_id' => $admin->id,
                'idempotency_key' => $idempotency,
                'amount_minor' => $amountMinor,
                'currency' => $lockedPayment->currency,
                'status' => RefundStatus::Pending->value,
                'reason' => trim($reason),
            ]);
        });

        // Phase 2: External Gateway Call
        try {
            $gatewayRefund = $this->gateway->createRefund(
                $payment,
                $amountMinor,
                $reason,
                $idempotency,
            );

            $gatewayRefundId = (string) ($gatewayRefund['id'] ?? '');
            $gatewayStatus = (string) ($gatewayRefund['status'] ?? 'processing');

            $finalStatus = match ($gatewayStatus) {
                'failed' => RefundStatus::Failed->value,
                'processed' => RefundStatus::Processed->value,
                default => RefundStatus::Processing->value,
            };

            // Phase 3: Update local records
            DB::transaction(function () use ($refund, $payment, $gatewayRefundId, $finalStatus, $gatewayRefund): void {
                $lockedRefund = ReservationRefund::query()->whereKey($refund->id)->lockForUpdate()->firstOrFail();
                $lockedPayment = ReservationPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

                $lockedRefund->forceFill([
                    'gateway_refund_id' => $gatewayRefundId,
                    'status' => $finalStatus,
                    'gateway_processed_at' => $finalStatus === RefundStatus::Processed->value ? CarbonImmutable::now() : null,
                    'metadata' => $gatewayRefund,
                ])->save();

                $totalRefunded = (int) $lockedPayment->refunds()
                    ->where('status', RefundStatus::Processed->value)
                    ->sum('amount_minor');

                if ($totalRefunded > 0) {
                    $newPaymentStatus = $totalRefunded >= $lockedPayment->amount_minor
                        ? PaymentStatus::Refunded
                        : PaymentStatus::PartiallyRefunded;

                    $lockedPayment->forceFill(['status' => $newPaymentStatus->value])->save();
                } elseif ($finalStatus === RefundStatus::Processing->value) {
                    $lockedPayment->forceFill(['status' => PaymentStatus::RefundPending->value])->save();
                }

                if ($finalStatus === RefundStatus::Processed->value) {
                    try {
                        app(FinancialLedgerService::class)->recordRefundCompleted($lockedRefund);
                    } catch (\Throwable $ledgerError) {
                        Log::error('Failed to record refund in financial ledger: '.$ledgerError->getMessage(), [
                            'refund_id' => $lockedRefund->id,
                        ]);
                    }
                }
            });

            try {
                $updatedRefund = $refund->fresh(['payment.reservation.user']);
                $reservation = $updatedRefund?->payment?->reservation;
                $dispatcher = app(NotificationDispatcher::class);

                if ($updatedRefund !== null && $reservation !== null && $reservation->user !== null) {
                    $refundRef = $updatedRefund->gateway_refund_id ?: ('REF-'.$updatedRefund->id);
                    $formattedAmount = '₹'.number_format($updatedRefund->amount_minor / 100, 2);

                    if ($finalStatus === RefundStatus::Processing->value) {
                        $dispatcher->dispatch(
                            eventType: 'refund.initiated',
                            recipients: $reservation->user,
                            variables: [
                                'customer_name' => $reservation->user->name,
                                'booking_reference' => $reservation->booking_reference,
                                'amount' => $formattedAmount,
                                'refund_reference' => $refundRef,
                                'initiated_at' => now()->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                                'action_url' => url("/reservations/{$reservation->id}"),
                            ],
                            related: $reservation,
                            relatedReference: $reservation->booking_reference,
                            idempotencySeed: 'refund_initiated_'.$updatedRefund->id
                        );
                    } elseif ($finalStatus === RefundStatus::Processed->value) {
                        $dispatcher->dispatch(
                            eventType: 'refund.completed',
                            recipients: $reservation->user,
                            variables: [
                                'customer_name' => $reservation->user->name,
                                'booking_reference' => $reservation->booking_reference,
                                'amount' => $formattedAmount,
                                'refund_reference' => $refundRef,
                                'completed_at' => ($updatedRefund->gateway_processed_at ?? now())->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                                'action_url' => url("/reservations/{$reservation->id}"),
                            ],
                            related: $reservation,
                            relatedReference: $reservation->booking_reference,
                            idempotencySeed: 'refund_complete_'.$updatedRefund->id
                        );
                    } elseif ($finalStatus === RefundStatus::Failed->value) {
                        $dispatcher->dispatchToAdmins(
                            eventType: 'admin.refund_exception',
                            variables: [
                                'booking_reference' => $reservation->booking_reference,
                                'refund_reference' => $refundRef,
                                'amount' => $formattedAmount,
                                'error_description' => 'Gateway immediately marked refund as failed.',
                                'created_at' => now()->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                                'action_url' => url("/admin/reservations/{$reservation->id}"),
                            ],
                            related: $updatedRefund,
                            relatedReference: $refundRef,
                            idempotencySeed: 'refund_failed_'.$updatedRefund->id
                        );
                    }
                }
            } catch (\Throwable $notifyError) {
                Log::warning('Failed to dispatch refund notification: '.$notifyError->getMessage());
            }
        } catch (\Throwable $e) {
            $refund->forceFill([
                'status' => RefundStatus::Failed->value,
                'failure_reason' => $e->getMessage(),
            ])->save();

            Log::error('Refund gateway dispatch failed: '.$e->getMessage(), [
                'refund_id' => $refund->id,
                'payment_id' => $payment->id,
            ]);

            try {
                $payment->loadMissing('reservation');
                $reservation = $payment->reservation;
                app(NotificationDispatcher::class)->dispatchToAdmins(
                    eventType: 'admin.refund_exception',
                    variables: [
                        'booking_reference' => $reservation->booking_reference,
                        'refund_reference' => $refund->gateway_refund_id ?: ('REF-'.$refund->id),
                        'amount' => '₹'.number_format($amountMinor / 100, 2),
                        'error_description' => Str::limit($e->getMessage(), 200),
                        'created_at' => now()->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                        'action_url' => url("/admin/reservations/{$reservation->id}"),
                    ],
                    related: $refund,
                    relatedReference: $reservation->booking_reference,
                    idempotencySeed: 'refund_failed_'.$refund->id
                );
            } catch (\Throwable) {
                // Never mask gateway failure exception
            }

            throw new RuntimeException("Refund processing failed: {$e->getMessage()}", 0, $e);
        }

        return $refund->fresh() ?? $refund;
    }
}
