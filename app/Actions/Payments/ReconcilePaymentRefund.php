<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Enums\SettlementStatus;
use App\Models\PartnerSettlementItem;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class ReconcilePaymentRefund
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly FinancialLedgerService $ledger,
        private readonly NotificationDispatcher $notifications,
    ) {}

    public function gatewayMode(): ?string
    {
        $key = $this->gateway->getPublicKey();

        return match (true) {
            str_starts_with($key, 'rzp_live_') => 'live',
            str_starts_with($key, 'rzp_test_') && ! app()->isProduction() => 'test',
            default => null,
        };
    }

    public static function isPaymentId(mixed $id): bool
    {
        return is_string($id) && preg_match('/^pay_[a-zA-Z0-9_]{1,95}$/D', $id) === 1;
    }

    public static function isRefundId(mixed $id): bool
    {
        return is_string($id) && preg_match('/^rfnd_[a-zA-Z0-9_]{1,96}$/D', $id) === 1;
    }

    public function byProviderId(string $providerId): ?ReservationRefund
    {
        if (! self::isRefundId($providerId) || $this->gatewayMode() === null) {
            return null;
        }

        $response = $this->gateway->fetchRefund($providerId);
        if (($response['id'] ?? null) !== $providerId) {
            throw new RuntimeException('Razorpay returned a different refund.');
        }

        $refund = ReservationRefund::query()->where('gateway_refund_id', $providerId)->first();
        if ($refund === null && is_string($response['receipt'] ?? null) && self::isPaymentId($response['payment_id'] ?? null)) {
            $payment = ReservationPayment::query()->where('gateway', 'razorpay')
                ->where('gateway_payment_id', $response['payment_id'])->first();

            $refund = $payment?->refunds()->whereNull('gateway_refund_id')
                ->where('metadata->request_receipt', $response['receipt'])->first();
        }

        return $refund === null ? null : $this->apply($refund, $response);
    }

    public function lookup(ReservationRefund $refund): ?ReservationRefund
    {
        if ($this->gatewayMode() === null) {
            return null;
        }

        if ($refund->gateway_refund_id !== null) {
            return $this->byProviderId($refund->gateway_refund_id);
        }

        $metadata = $refund->metadata ?? [];
        $receipt = $metadata['request_receipt'] ?? null;
        $paymentId = $metadata['request_payment_id'] ?? null;
        if (! is_string($receipt) || ! self::isPaymentId($paymentId) || ($metadata['request_mode'] ?? null) !== $this->gatewayMode()) {
            return null;
        }

        $response = $this->gateway->fetchRefundByReceipt($paymentId, $receipt);

        return $response === null ? null : $this->apply($refund, $response);
    }

    /**
     * Apply only an authenticated Razorpay API response.
     *
     * @param  array<string, mixed>  $response
     */
    public function apply(ReservationRefund $refund, array $response): ReservationRefund
    {
        $status = match ($response['status'] ?? null) {
            'pending', 'processing' => RefundStatus::Processing,
            'processed' => RefundStatus::Processed,
            'failed' => RefundStatus::Failed,
            default => throw new RuntimeException('Razorpay returned an unknown refund state.'),
        };

        return DB::transaction(function () use ($refund, $response, $status): ReservationRefund {
            $payment = ReservationPayment::query()->whereKey($refund->reservation_payment_id)->lockForUpdate()->firstOrFail();
            $locked = $payment->refunds()->whereKey($refund->id)->lockForUpdate()->firstOrFail();
            $this->assertIdentity($locked, $payment, $response);

            $isLegacyFailed = $locked->status === RefundStatus::Failed && $locked->gateway_refund_id === null;

            if ($locked->status === RefundStatus::Processed) {
                if ($status === RefundStatus::Processed) {
                    $this->recordCompletedJournalIfMissing(
                        $locked,
                        $payment,
                        isCorrective: true,
                        effectiveAt: $this->resolveEffectiveAt($locked, $response),
                    );
                } elseif ($status === RefundStatus::Failed) {
                    throw new RuntimeException('Processed refund received a contradictory failed status from Razorpay.');
                }

                return $locked->fresh() ?? $locked;
            }

            if ($locked->status === RefundStatus::Failed && ! $isLegacyFailed) {
                if ($status === RefundStatus::Failed) {
                    return $locked;
                }

                throw new RuntimeException('Definitively failed refund cannot transition to '.$status->value.'.');
            }

            if ($locked->status === $status && $locked->gateway_refund_id === $response['id']) {
                return $locked;
            }

            if ($status === RefundStatus::Processed && $payment->totalRefundedAmount() + $locked->amount_minor > $payment->amount_minor) {
                throw new RuntimeException('Confirmed refunds exceed the captured balance and require manual reconciliation.');
            }

            $locked->update([
                'gateway_refund_id' => $response['id'],
                'status' => $status,
                'failure_reason' => $status === RefundStatus::Failed ? 'Razorpay reported that the refund failed.' : null,
                'gateway_processed_at' => $status === RefundStatus::Processed ? now() : null,
                'metadata' => array_merge($locked->metadata ?? [], ['gateway_refund' => $response]),
            ]);

            $refunded = $payment->totalRefundedAmount();
            $payment->update(['status' => match (true) {
                $refunded >= $payment->amount_minor => PaymentStatus::Refunded,
                $refunded > 0 => PaymentStatus::PartiallyRefunded,
                $payment->pendingRefundAmount() > 0 => PaymentStatus::RefundPending,
                default => PaymentStatus::Captured,
            }]);

            if ($status === RefundStatus::Processed) {
                $this->recordCompletedJournalIfMissing(
                    $locked,
                    $payment,
                    isCorrective: false,
                    effectiveAt: $locked->gateway_processed_at !== null
                        ? CarbonImmutable::instance($locked->gateway_processed_at)
                        : CarbonImmutable::now(),
                );
            }

            DB::afterCommit(fn () => $this->notify($locked));

            return $locked->fresh() ?? $locked;
        }, 3);
    }

    private function recordCompletedJournalIfMissing(
        ReservationRefund $refund,
        ReservationPayment $payment,
        bool $isCorrective = false,
        ?CarbonImmutable $effectiveAt = null,
    ): void {
        $refundInspection = $this->ledger->inspectRefundJournal($refund);
        if ($refundInspection['status'] === 'complete') {
            return;
        }

        if ($refundInspection['status'] !== 'missing') {
            $this->quarantineRefund(
                $refund,
                $refundInspection['status'].'_refund_journal',
                $refundInspection['reason'] ?? 'Existing refund journal is incomplete or inconsistent.',
            );

            return;
        }

        $captureInspection = $this->ledger->inspectPaymentCaptureJournal($payment);
        if ($captureInspection['status'] !== 'complete') {
            $code = $captureInspection['status'] === 'missing'
                ? 'missing_capture_journal'
                : $captureInspection['status'].'_capture_journal';

            $this->quarantineRefund(
                $refund,
                $code,
                $captureInspection['reason'] ?? 'Parent payment capture journal is missing or incomplete; cannot post refund journal.',
            );

            return;
        }

        if ($this->hasPostSettlementConflict($payment)) {
            $this->quarantineRefund(
                $refund,
                'post_settlement_refund',
                'Refund completed after partner settlement approval/payout; requires clawback or manual credit-note adjustment instead of silent payable debit.',
            );

            return;
        }

        $this->ledger->recordRefundCompleted(
            $refund,
            postedAt: CarbonImmutable::now(),
            effectiveAt: $effectiveAt ?? ($refund->gateway_processed_at !== null
                ? CarbonImmutable::instance($refund->gateway_processed_at)
                : CarbonImmutable::now()),
            isCorrective: $isCorrective,
        );
    }

    private function hasPostSettlementConflict(ReservationPayment $payment): bool
    {
        return PartnerSettlementItem::query()
            ->where(function (Builder $query) use ($payment): void {
                $query->where('reservation_id', $payment->reservation_id)
                    ->orWhere('reservation_payment_id', $payment->id);
            })
            ->whereHas('settlement', function (Builder $query): void {
                $query->whereIn('status', [
                    SettlementStatus::Approved->value,
                    SettlementStatus::TransferPending->value,
                    SettlementStatus::Settled->value,
                    SettlementStatus::Failed->value,
                    SettlementStatus::OnHold->value,
                ]);
            })
            ->exists();
    }

    private function quarantineRefund(ReservationRefund $refund, string $reasonCode, string $details): void
    {
        $metadata = $refund->metadata ?? [];
        $metadata['accounting_quarantine'] = [
            'reason' => $reasonCode,
            'details' => $details,
            'quarantined_at' => CarbonImmutable::now()->toIso8601String(),
        ];

        $refund->forceFill(['metadata' => $metadata])->save();

        Reservation::query()
            ->whereKey($refund->reservation_id)
            ->update(['requires_refund_review' => true]);

        Log::warning('Refund accounting quarantined during reconciliation.', [
            'refund_id' => $refund->id,
            'payment_id' => $refund->reservation_payment_id,
            'reservation_id' => $refund->reservation_id,
            'reason' => $reasonCode,
            'details' => $details,
        ]);
    }

    /** @param array<string, mixed> $response */
    private function resolveEffectiveAt(ReservationRefund $refund, array $response): CarbonImmutable
    {
        if ($refund->gateway_processed_at !== null) {
            return CarbonImmutable::instance($refund->gateway_processed_at);
        }

        if (isset($response['created_at']) && is_numeric($response['created_at'])) {
            return CarbonImmutable::createFromTimestampUTC((int) $response['created_at']);
        }

        return CarbonImmutable::now();
    }

    /** @param array<string, mixed> $response */
    private function assertIdentity(ReservationRefund $refund, ReservationPayment $payment, array $response): void
    {
        $providerId = $response['id'] ?? null;
        $providerPaymentId = $response['payment_id'] ?? null;
        $metadata = $refund->metadata ?? [];
        $receipt = $metadata['request_receipt'] ?? null;
        $mode = $this->gatewayMode();

        if ($mode === null || $payment->gateway !== 'razorpay' || ! $payment->isCaptured()
            || $refund->reservation_id !== $payment->reservation_id
            || ! self::isRefundId($providerId) || ! self::isPaymentId($providerPaymentId)
            || $providerPaymentId !== $payment->gateway_payment_id
            || ($response['currency'] ?? null) !== $refund->currency || $refund->currency !== $payment->currency
            || ($response['amount'] ?? null) !== $refund->amount_minor
            || ($refund->gateway_refund_id !== null && $providerId !== $refund->gateway_refund_id)
            || ($receipt === null && $refund->gateway_refund_id === null)
            || ($receipt !== null && (($response['receipt'] ?? null) !== $receipt
                || ($metadata['request_payment_id'] ?? null) !== $providerPaymentId
                || ($metadata['request_mode'] ?? null) !== $mode))) {
            throw new RuntimeException('Razorpay refund does not match the local refund request.');
        }
    }

    private function notify(ReservationRefund $refund): void
    {
        try {
            $reservation = $refund->reservation;

            if ($reservation->user === null) {
                return;
            }

            $reference = $refund->gateway_refund_id ?? 'REF-'.$refund->id;
            $variables = [
                'booking_reference' => $reservation->booking_reference,
                'refund_reference' => $reference,
                'amount' => '₹'.number_format($refund->amount_minor / 100, 2),
            ];

            if ($refund->status === RefundStatus::Failed) {
                $this->notifications->dispatchToAdmins(
                    eventType: 'admin.refund_exception',
                    variables: $variables + [
                        'error_description' => $refund->failure_reason ?? '',
                        'created_at' => now()->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                        'action_url' => url("/admin/reservations/{$reservation->id}"),
                    ],
                    related: $refund,
                    relatedReference: $reference,
                    idempotencySeed: 'refund_failed_'.$refund->id,
                );

                return;
            }

            $completed = $refund->status === RefundStatus::Processed;
            $timestamp = ($refund->gateway_processed_at ?? now())->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST';

            $this->notifications->dispatch(
                eventType: $completed ? 'refund.completed' : 'refund.initiated',
                recipients: $reservation->user,
                variables: $variables + [
                    'customer_name' => $reservation->user->name,
                    $completed ? 'completed_at' : 'initiated_at' => $timestamp,
                    'action_url' => url("/reservations/{$reservation->id}"),
                ],
                related: $reservation,
                relatedReference: $reservation->booking_reference,
                idempotencySeed: ($completed ? 'refund_complete_' : 'refund_initiated_').$refund->id,
            );
        } catch (Throwable $exception) {
            Log::warning('Refund notification could not be sent.', ['refund_id' => $refund->id, 'exception_type' => $exception::class]);
        }
    }
}
