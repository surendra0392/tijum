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
        } catch (\Throwable $e) {
            $refund->forceFill([
                'status' => RefundStatus::Failed->value,
                'failure_reason' => $e->getMessage(),
            ])->save();

            Log::error('Refund gateway dispatch failed: '.$e->getMessage(), [
                'refund_id' => $refund->id,
                'payment_id' => $payment->id,
            ]);

            throw new RuntimeException("Refund processing failed: {$e->getMessage()}", 0, $e);
        }

        return $refund->fresh() ?? $refund;
    }
}
