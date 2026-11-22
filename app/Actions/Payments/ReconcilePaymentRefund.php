<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Contracts\PaymentGateway;
use App\Enums\LedgerEntryCategory;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Models\FinancialLedgerEntry;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
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

    public function byProviderId(string $providerId): ?ReservationRefund
    {
        if (! $this->isRefundId($providerId) || $this->gatewayMode() === null) {
            return null;
        }

        $response = $this->gateway->fetchRefund($providerId);
        if (($response['id'] ?? null) !== $providerId) {
            throw new RuntimeException('Razorpay returned a different refund.');
        }

        $refund = ReservationRefund::query()->where('gateway_refund_id', $providerId)->first();
        if ($refund === null && is_string($response['receipt'] ?? null) && $this->isPaymentId($response['payment_id'] ?? null)) {
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
                    $this->recordCompletedJournalIfMissing($locked);
                } elseif ($status === RefundStatus::Failed) {
                    throw new RuntimeException('Processed refund received a contradictory failed status from Razorpay.');
                }

                return $locked;
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
                $this->recordCompletedJournalIfMissing($locked);
            }

            DB::afterCommit(fn () => $this->notify($locked));

            return $locked;
        }, 3);
    }

    private function recordCompletedJournalIfMissing(ReservationRefund $refund): void
    {
        $alreadyRecorded = FinancialLedgerEntry::query()
            ->where('entity_type', ReservationRefund::class)
            ->where('entity_id', $refund->id)
            ->where('entry_category', LedgerEntryCategory::RefundCompleted)
            ->exists();

        if (! $alreadyRecorded) {
            $this->ledger->recordRefundCompleted($refund);
        }
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
            || ! $this->isRefundId($providerId) || ! self::isPaymentId($providerPaymentId)
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

    private function isRefundId(mixed $id): bool
    {
        return is_string($id) && preg_match('/^rfnd_[a-zA-Z0-9_]{1,96}$/D', $id) === 1;
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
