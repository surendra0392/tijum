<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Enums\RefundStatus;
use App\Enums\SettlementStatus;
use App\Models\PartnerSettlementItem;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class AuditAndRepairRefundJournals
{
    public function __construct(
        private readonly FinancialLedgerService $ledger,
        private readonly ReconcilePaymentRefund $reconciler,
    ) {}

    /**
     * Audit processed historical refunds and optionally apply verified corrective refund journals.
     *
     * @return array{
     *     mode: 'dry_run'|'apply',
     *     inspected: int,
     *     complete: int,
     *     repairable: int,
     *     repaired: int,
     *     quarantined: int,
     *     items: list<array<string, mixed>>,
     * }
     */
    public function execute(bool $apply = false, ?int $refundId = null): array
    {
        $query = ReservationRefund::query()
            ->with(['payment', 'reservation'])
            ->where('status', RefundStatus::Processed)
            ->orderBy('id');

        if ($refundId !== null) {
            $query->whereKey($refundId);
        }

        $inspected = 0;
        $complete = 0;
        $repairable = 0;
        $repaired = 0;
        $quarantined = 0;
        $items = [];

        foreach ($query->lazyById() as $refund) {
            $inspected++;

            if (! $apply) {
                $evaluation = $this->evaluateRefund($refund, $refund->payment);

                if ($evaluation['classification'] === 'complete') {
                    $complete++;
                    $items[] = $this->formatItem($refund, 'complete');
                } elseif ($evaluation['classification'] === 'repairable') {
                    $repairable++;
                    $items[] = $this->formatItem($refund, 'repairable', [
                        'effective_at' => $evaluation['effective_at']->toIso8601String(),
                    ]);
                } else {
                    $quarantined++;
                    $items[] = $this->formatItem($refund, 'quarantined', [
                        'reason' => $evaluation['reason'],
                        'details' => $evaluation['details'],
                    ]);
                }

                continue;
            }

            $evaluation = $this->evaluateRefund($refund, $refund->payment);

            if ($evaluation['classification'] === 'complete') {
                $complete++;
                $items[] = $this->formatItem($refund, 'complete');

                continue;
            }

            if ($evaluation['classification'] === 'quarantined') {
                DB::transaction(function () use ($refund, $evaluation): void {
                    $locked = ReservationRefund::query()->whereKey($refund->id)->lockForUpdate()->firstOrFail();
                    $this->quarantine($locked, $evaluation['reason'], $evaluation['details']);
                }, 3);

                $quarantined++;
                $items[] = $this->formatItem($refund, 'quarantined', [
                    'reason' => $evaluation['reason'],
                    'details' => $evaluation['details'],
                ]);

                continue;
            }

            if ($this->reconciler->gatewayMode() === null) {
                $reason = 'gateway_unavailable';
                $details = 'Razorpay reconciliation credentials are unavailable for provider verification.';

                DB::transaction(function () use ($refund, $reason, $details): void {
                    $locked = ReservationRefund::query()->whereKey($refund->id)->lockForUpdate()->firstOrFail();
                    $this->quarantine($locked, $reason, $details);
                }, 3);

                $quarantined++;
                $items[] = $this->formatItem($refund, 'quarantined', [
                    'reason' => $reason,
                    'details' => $details,
                ]);

                continue;
            }

            try {
                $this->reconciler->byProviderId((string) $refund->gateway_refund_id);
            } catch (Throwable $exception) {
                $reason = 'provider_verification_failed';
                $details = $exception->getMessage();

                DB::transaction(function () use ($refund, $reason, $details): void {
                    $locked = ReservationRefund::query()->whereKey($refund->id)->lockForUpdate()->firstOrFail();
                    $this->quarantine($locked, $reason, $details);
                }, 3);

                $quarantined++;
                $items[] = $this->formatItem($refund, 'quarantined', [
                    'reason' => $reason,
                    'details' => $details,
                ]);

                continue;
            }

            $reloaded = ReservationRefund::query()->findOrFail($refund->id);
            $postCheck = $this->ledger->inspectRefundJournal($reloaded);

            if ($postCheck['status'] === 'complete') {
                $repaired++;
                $items[] = $this->formatItem($reloaded, 'repaired', [
                    'effective_at' => $evaluation['effective_at']->toIso8601String(),
                ]);
            } else {
                $quarantineMeta = is_array($reloaded->metadata['accounting_quarantine'] ?? null)
                    ? $reloaded->metadata['accounting_quarantine']
                    : [];
                $reason = is_string($quarantineMeta['reason'] ?? null)
                    ? $quarantineMeta['reason']
                    : 'quarantined_during_reconciliation';
                $details = is_string($quarantineMeta['details'] ?? null)
                    ? $quarantineMeta['details']
                    : ($postCheck['reason'] ?? 'Refund remained unrepaired after provider reconciliation.');

                $quarantined++;
                $items[] = $this->formatItem($reloaded, 'quarantined', [
                    'reason' => $reason,
                    'details' => $details,
                ]);
            }
        }

        return [
            'mode' => $apply ? 'apply' : 'dry_run',
            'inspected' => $inspected,
            'complete' => $complete,
            'repairable' => $repairable,
            'repaired' => $repaired,
            'quarantined' => $quarantined,
            'items' => $items,
        ];
    }

    /**
     * @return array{classification: 'complete'}
     *                                           |array{classification: 'repairable', effective_at: CarbonImmutable}
     *                                           |array{classification: 'quarantined', reason: string, details: string}
     */
    private function evaluateRefund(ReservationRefund $refund, ?ReservationPayment $payment): array
    {
        $refundInspection = $this->ledger->inspectRefundJournal($refund);
        if ($refundInspection['status'] === 'complete') {
            return ['classification' => 'complete'];
        }

        if ($refundInspection['status'] !== 'missing') {
            return [
                'classification' => 'quarantined',
                'reason' => $refundInspection['status'].'_refund_journal',
                'details' => $refundInspection['reason'] ?? 'Existing refund journal is incomplete or inconsistent.',
            ];
        }

        if ($payment === null) {
            return [
                'classification' => 'quarantined',
                'reason' => 'missing_parent_payment',
                'details' => 'Processed refund is missing its parent reservation payment.',
            ];
        }

        if (! ReconcilePaymentRefund::isRefundId($refund->gateway_refund_id)) {
            return [
                'classification' => 'quarantined',
                'reason' => 'missing_provider_confirmation',
                'details' => 'Processed refund lacks an authoritative Razorpay rfnd_* identifier.',
            ];
        }

        if ($payment->gateway !== 'razorpay'
            || ! $payment->isCaptured()
            || ! ReconcilePaymentRefund::isPaymentId($payment->gateway_payment_id)) {
            return [
                'classification' => 'quarantined',
                'reason' => 'missing_provider_confirmation',
                'details' => 'Parent payment lacks authoritative Razorpay capture confirmation.',
            ];
        }

        $refundCurrency = strtoupper(trim((string) $refund->currency));
        $paymentCurrency = strtoupper(trim((string) $payment->currency));
        if ($refundCurrency === '' || $refundCurrency !== $paymentCurrency) {
            return [
                'classification' => 'quarantined',
                'reason' => 'currency_mismatch',
                'details' => "Refund currency [{$refund->currency}] does not match payment currency [{$payment->currency}].",
            ];
        }

        if ($refund->amount_minor <= 0 || $payment->totalRefundedAmount() > $payment->amount_minor) {
            return [
                'classification' => 'quarantined',
                'reason' => 'refund_exceeds_captured_amount',
                'details' => 'Refund amount is invalid or cumulative processed refunds exceed captured payment amount.',
            ];
        }

        $gatewayPayload = $refund->metadata['gateway_refund'] ?? null;
        if (is_array($gatewayPayload)) {
            $payloadCurrency = strtoupper(trim((string) ($gatewayPayload['currency'] ?? '')));
            if (($gatewayPayload['status'] ?? null) !== 'processed'
                || ($gatewayPayload['id'] ?? null) !== $refund->gateway_refund_id
                || ($gatewayPayload['payment_id'] ?? null) !== $payment->gateway_payment_id
                || ($gatewayPayload['amount'] ?? null) !== $refund->amount_minor
                || $payloadCurrency !== $refundCurrency) {
                return [
                    'classification' => 'quarantined',
                    'reason' => 'invalid_provider_evidence',
                    'details' => 'Stored provider refund payload conflicts with local refund or payment attributes.',
                ];
            }
        }

        $captureInspection = $this->ledger->inspectPaymentCaptureJournal($payment);
        if ($captureInspection['status'] !== 'complete') {
            $reason = $captureInspection['status'] === 'missing'
                ? 'missing_capture_journal'
                : $captureInspection['status'].'_capture_journal';

            return [
                'classification' => 'quarantined',
                'reason' => $reason,
                'details' => $captureInspection['reason'] ?? 'Parent payment capture journal is missing or inconsistent.',
            ];
        }

        $hasSettledConflict = PartnerSettlementItem::query()
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

        if ($hasSettledConflict) {
            return [
                'classification' => 'quarantined',
                'reason' => 'post_settlement_refund',
                'details' => 'Reservation belongs to an already-approved or settled partner settlement; cannot silently debit partner payable.',
            ];
        }

        return [
            'classification' => 'repairable',
            'effective_at' => $this->resolveEffectiveAt($refund, is_array($gatewayPayload) ? $gatewayPayload : null),
        ];
    }

    /** @param array<string, mixed>|null $gatewayPayload */
    private function resolveEffectiveAt(ReservationRefund $refund, ?array $gatewayPayload): CarbonImmutable
    {
        if ($refund->gateway_processed_at !== null) {
            return CarbonImmutable::instance($refund->gateway_processed_at);
        }

        if ($gatewayPayload !== null && isset($gatewayPayload['created_at']) && is_numeric($gatewayPayload['created_at'])) {
            return CarbonImmutable::createFromTimestampUTC((int) $gatewayPayload['created_at']);
        }

        return CarbonImmutable::instance($refund->updated_at);
    }

    private function quarantine(ReservationRefund $refund, string $reason, string $details): void
    {
        $metadata = $refund->metadata ?? [];
        $metadata['accounting_quarantine'] = [
            'reason' => $reason,
            'details' => $details,
            'quarantined_at' => CarbonImmutable::now()->toIso8601String(),
        ];

        $refund->forceFill(['metadata' => $metadata])->save();

        Reservation::query()
            ->whereKey($refund->reservation_id)
            ->update(['requires_refund_review' => true]);

        Log::warning('Historical refund quarantined during journal audit.', [
            'refund_id' => $refund->id,
            'payment_id' => $refund->reservation_payment_id,
            'reservation_id' => $refund->reservation_id,
            'reason' => $reason,
            'details' => $details,
        ]);
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function formatItem(ReservationRefund $refund, string $status, array $extra = []): array
    {
        return array_merge([
            'status' => $status,
            'refund_id' => $refund->id,
            'payment_id' => $refund->reservation_payment_id,
            'reservation_id' => $refund->reservation_id,
            'gateway_refund_id' => $refund->gateway_refund_id,
            'amount_minor' => $refund->amount_minor,
            'currency' => $refund->currency,
        ], $extra);
    }
}
