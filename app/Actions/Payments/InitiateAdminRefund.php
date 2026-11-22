<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\ProviderTransfer;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

class InitiateAdminRefund
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly ReconcilePaymentRefund $reconciliation,
    ) {}

    public function execute(
        ReservationPayment $payment,
        Admin $admin,
        int $amountMinor,
        string $reason,
        ?string $idempotencyKey = null,
        ?int $caseId = null,
    ): ReservationRefund {
        if (! $admin->isActive() || (! $admin->hasPermission('bookings.manage') && ! $admin->hasPermission('refunds.manage'))) {
            throw ValidationException::withMessages(['admin' => 'You are not authorised to initiate refunds.']);
        }

        $reason = trim($reason);
        if ($amountMinor <= 0 || $reason === '') {
            throw ValidationException::withMessages(['amount' => 'A positive refund amount and reason are required.']);
        }

        $normalizedKey = $idempotencyKey !== null && trim($idempotencyKey) !== ''
            ? trim($idempotencyKey)
            : null;

        $idempotency = hash('sha256', json_encode(
            ['refund', $payment->id, $normalizedKey ?? [$amountMinor, $reason, $caseId]],
            JSON_THROW_ON_ERROR,
        ));

        [$refund, $shouldSend] = DB::transaction(function () use ($admin, $payment, $amountMinor, $reason, $idempotency, $caseId): array {
            $lockedPayment = ReservationPayment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            $existing = $lockedPayment->refunds()->where('idempotency_key', $idempotency)->lockForUpdate()->first();

            if ($existing !== null) {
                if ($existing->amount_minor !== $amountMinor || $existing->reason !== $reason || $existing->customer_protection_case_id !== $caseId) {
                    throw ValidationException::withMessages(['idempotency_key' => 'This request key was used for a different refund.']);
                }

                return [$existing, false];
            }

            $mode = $this->reconciliation->gatewayMode();
            if (! $lockedPayment->isCaptured() || $lockedPayment->gateway !== 'razorpay'
                || ! ReconcilePaymentRefund::isPaymentId($lockedPayment->gateway_payment_id)) {
                throw ValidationException::withMessages(['payment' => 'Only captured Razorpay payments with a valid provider reference can be refunded.']);
            }

            if ($mode === null) {
                throw ValidationException::withMessages(['payment' => 'Razorpay is unavailable for refunds in the current mode.']);
            }

            if ($caseId !== null && ! CustomerProtectionCase::query()->whereKey($caseId)->where('reservation_id', $lockedPayment->reservation_id)->exists()) {
                throw ValidationException::withMessages(['case' => 'The protection case does not belong to this reservation.']);
            }

            // Old failures without a gateway ID can also represent an accepted refund with a lost response.
            $unresolved = $lockedPayment->refunds()->whereNull('gateway_refund_id')
                ->whereIn('status', [RefundStatus::Pending, RefundStatus::Processing, RefundStatus::Uncertain, RefundStatus::Failed])
                ->lockForUpdate()->first();
            if ($unresolved !== null) {
                throw ValidationException::withMessages(['amount' => 'Reconcile the earlier refund with Razorpay before requesting another refund.']);
            }

            $transferAmount = ProviderTransfer::query()->where('reservation_payment_id', $lockedPayment->id)
                ->whereIn('status', [ProviderTransferStatus::Processed, ProviderTransferStatus::Pending, ProviderTransferStatus::Uncertain])
                ->lockForUpdate()->pluck('amount_minor')->sum();
            $reservedRefundAmount = $lockedPayment->refunds()
                ->whereIn('status', [RefundStatus::Approved, RefundStatus::Pending, RefundStatus::Uncertain, RefundStatus::Processing, RefundStatus::Processed])
                ->lockForUpdate()->pluck('amount_minor')->sum();
            $refundable = max(0, $lockedPayment->amount_minor - $reservedRefundAmount - $transferAmount);
            if ($amountMinor > $refundable) {
                $maxFormatted = number_format($refundable / 100, 2);
                throw ValidationException::withMessages(['amount' => "Refund amount exceeds the available balance of ₹{$maxFormatted}."]);
            }

            $refund = $lockedPayment->refunds()->create([
                'reservation_id' => $lockedPayment->reservation_id,
                'customer_protection_case_id' => $caseId,
                'initiated_by_admin_id' => $admin->id,
                'idempotency_key' => $idempotency,
                'amount_minor' => $amountMinor,
                'currency' => $lockedPayment->currency,
                'status' => RefundStatus::Uncertain,
                'reason' => $reason,
                'metadata' => [
                    'request_receipt' => ReservationRefund::receiptFor($idempotency),
                    'request_payment_id' => $lockedPayment->gateway_payment_id,
                    'request_mode' => $mode,
                ],
            ]);

            if ($lockedPayment->status === PaymentStatus::Captured) {
                $lockedPayment->update(['status' => PaymentStatus::RefundPending]);
            }

            return [$refund->setRelation('payment', $lockedPayment), true];
        }, 3);

        if (! $shouldSend) {
            return $refund;
        }

        if (DB::transactionLevel() !== 0) {
            DB::afterCommit(fn () => $this->dispatch($refund));

            return $refund;
        }

        return $this->dispatch($refund);
    }

    private function dispatch(ReservationRefund $refund): ReservationRefund
    {
        if (DB::transactionLevel() !== 0) {
            return $refund;
        }

        try {
            $response = $this->gateway->createRefund($refund->payment, $refund->amount_minor, $refund->reason, $refund->idempotency_key);

            return $this->reconciliation->apply($refund, $response);
        } catch (Throwable $exception) {
            ReservationRefund::query()->whereKey($refund->id)->where('status', RefundStatus::Uncertain)
                ->update(['failure_reason' => 'Awaiting authoritative Razorpay reconciliation.']);

            Log::warning('Refund dispatch or local confirmation requires reconciliation.', [
                'refund_id' => $refund->id,
                'payment_id' => $refund->reservation_payment_id,
                'exception_type' => $exception::class,
            ]);

            return $refund->refresh();
        }
    }
}
