<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Actions\Reservations\ReservationLifecycle;
use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Enums\SettlementStatus;
use App\Models\PaymentWebhookEvent;
use App\Models\ProviderTransfer;
use App\Models\ProviderTransferReversal;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class ProcessWebhookEvent
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly ReservationLifecycle $lifecycle,
        private readonly ?NotificationDispatcher $notificationDispatcher = null,
    ) {}

    /**
     * @param  array<string, mixed>|null  $payload
     * @return array{status: string, message?: string, event_id: string, event_type?: string}
     */
    public function execute(string $rawPayload, string $signature, ?array $payload = null, ?string $eventId = null): array
    {
        // 1. Verify webhook signature
        if (! $this->gateway->verifyWebhookSignature($rawPayload, $signature)) {
            Log::warning('Razorpay webhook signature verification failed.');
            throw new RuntimeException('Invalid webhook signature.');
        }

        $payload = $payload ?? (json_decode($rawPayload, true) ?: []);

        $eventId = $eventId ?: (string) ($payload['event_id'] ?? $payload['id'] ?? '');
        $eventType = (string) ($payload['event'] ?? '');

        if ($eventId === '') {
            $eventId = 'evt_'.hash('sha256', $rawPayload);
        }

        // 2. Event deduplication
        $existingEvent = PaymentWebhookEvent::query()->where('event_id', $eventId)->first();
        if ($existingEvent instanceof PaymentWebhookEvent) {
            return [
                'status' => 'ignored',
                'message' => 'Event already processed.',
                'event_id' => $eventId,
            ];
        }

        $orderId = (string) ($payload['payload']['payment']['entity']['order_id'] ?? $payload['payload']['order']['entity']['id'] ?? '');
        $paymentId = (string) ($payload['payload']['payment']['entity']['id'] ?? '');
        $refundId = (string) ($payload['payload']['refund']['entity']['id'] ?? '');

        try {
            /** @var PaymentWebhookEvent $eventRecord */
            $eventRecord = PaymentWebhookEvent::create([
                'gateway' => 'razorpay',
                'event_id' => $eventId,
                'event_type' => $eventType,
                'gateway_order_id' => $orderId ?: null,
                'gateway_payment_id' => $paymentId ?: null,
                'gateway_refund_id' => $refundId ?: null,
                'payload' => $payload,
                'status' => 'received',
            ]);
        } catch (QueryException $e) {
            $existingEvent = PaymentWebhookEvent::query()->where('event_id', $eventId)->first();
            if ($existingEvent instanceof PaymentWebhookEvent) {
                return [
                    'status' => 'ignored',
                    'message' => 'Event already processed.',
                    'event_id' => $eventId,
                ];
            }

            throw $e;
        }

        try {
            DB::transaction(function () use ($eventType, $payload, $orderId, $paymentId, $refundId, $eventRecord): void {
                match ($eventType) {
                    'payment.captured', 'order.paid' => $this->handlePaymentCaptured($orderId, $paymentId, $payload),
                    'payment.failed' => $this->handlePaymentFailed($orderId, $paymentId, $payload),
                    'refund.processed' => $this->handleRefundProcessed($refundId, $payload),
                    'refund.failed' => $this->handleRefundFailed($refundId, $payload),
                    'transfer.processed' => $this->handleTransferProcessed($payload),
                    'transfer.failed' => $this->handleTransferFailed($payload),
                    'reversal.processed' => $this->handleReversalProcessed($payload),
                    default => null,
                };

                $eventRecord->forceFill([
                    'status' => 'processed',
                    'processed_at' => CarbonImmutable::now(),
                ])->save();
            }, 3);
        } catch (\Throwable $e) {
            Log::error('Error processing Razorpay webhook event: '.$e->getMessage(), [
                'event_id' => $eventId,
                'event_type' => $eventType,
            ]);

            $eventRecord->forceFill([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ])->save();

            throw $e;
        }

        return [
            'status' => 'success',
            'event_id' => $eventId,
            'event_type' => $eventType,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function handlePaymentCaptured(string $orderId, string $paymentId, array $payload): void
    {
        $paymentEntity = $payload['payload']['payment']['entity'] ?? [];
        $orderId = $orderId ?: (string) ($paymentEntity['order_id'] ?? '');
        $paymentId = $paymentId ?: (string) ($paymentEntity['id'] ?? '');

        if ($orderId === '') {
            return;
        }

        /** @var ReservationPayment|null $payment */
        $payment = ReservationPayment::query()
            ->where('gateway_order_id', $orderId)
            ->lockForUpdate()
            ->first();

        if ($payment === null && $paymentId !== '') {
            $payment = ReservationPayment::query()
                ->where('gateway_payment_id', $paymentId)
                ->lockForUpdate()
                ->first();
        }

        if ($payment === null) {
            return;
        }

        $now = CarbonImmutable::now();

        $payment->forceFill([
            'gateway_payment_id' => $paymentId ?: $payment->gateway_payment_id,
            'status' => PaymentStatus::Captured->value,
            'captured_at' => $payment->captured_at ?: $now,
            'metadata' => array_merge((array) $payment->metadata, [
                'webhook_payment_captured' => $paymentEntity,
                'method' => $paymentEntity['method'] ?? null,
            ]),
        ])->save();

        $reservation = $payment->reservation()->lockForUpdate()->first();
        if ($reservation !== null) {
            $this->lifecycle->confirmPaid($reservation, $payment);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function handlePaymentFailed(string $orderId, string $paymentId, array $payload): void
    {
        $paymentEntity = $payload['payload']['payment']['entity'] ?? [];
        $orderId = $orderId ?: (string) ($paymentEntity['order_id'] ?? '');
        $paymentId = $paymentId ?: (string) ($paymentEntity['id'] ?? '');

        if ($orderId === '') {
            return;
        }

        /** @var ReservationPayment|null $payment */
        $payment = ReservationPayment::query()
            ->where('gateway_order_id', $orderId)
            ->lockForUpdate()
            ->first();

        if ($payment === null) {
            return;
        }

        // Do not overwrite an already captured state with a failed notification
        if ($payment->isCaptured()) {
            return;
        }

        $errorCode = (string) ($paymentEntity['error_code'] ?? 'PAYMENT_FAILED');
        $errorDescription = (string) ($paymentEntity['error_description'] ?? 'Payment attempt failed.');

        $payment->forceFill([
            'gateway_payment_id' => $paymentId ?: $payment->gateway_payment_id,
            'status' => PaymentStatus::Failed->value,
            'failure_code' => $errorCode,
            'failure_description' => $errorDescription,
            'metadata' => array_merge((array) $payment->metadata, ['webhook_payment_failed' => $paymentEntity]),
        ])->save();

        $reservation = $payment->reservation()->with(['user', 'property'])->first();
        if ($reservation !== null && $reservation->user !== null) {
            try {
                $dispatcher = $this->notificationDispatcher ?? app(NotificationDispatcher::class);
                $dispatcher->dispatch(
                    eventType: 'payment.failed',
                    recipients: $reservation->user,
                    variables: [
                        'customer_name' => $reservation->user->name,
                        'booking_reference' => $reservation->booking_reference,
                        'property_name' => $reservation->snapshot_property_name ?: $reservation->property->name,
                        'amount' => '₹'.number_format(($payment->amount_minor ?: $reservation->total_amount_minor) / 100, 2),
                        'failure_reason' => Str::limit($errorDescription, 180),
                        'action_url' => url("/reservations/{$reservation->id}"),
                    ],
                    related: $reservation,
                    relatedReference: $reservation->booking_reference,
                    idempotencySeed: 'pay_fail_'.$payment->id.'_'.$payment->updated_at?->timestamp
                );
            } catch (\Throwable $e) {
                Log::warning('Failed to dispatch payment.failed notification: '.$e->getMessage());
            }
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function handleRefundProcessed(string $refundId, array $payload): void
    {
        $refundEntity = $payload['payload']['refund']['entity'] ?? [];
        $refundId = $refundId ?: (string) ($refundEntity['id'] ?? '');

        if ($refundId === '') {
            return;
        }

        /** @var ReservationRefund|null $refund */
        $refund = ReservationRefund::query()
            ->where('gateway_refund_id', $refundId)
            ->lockForUpdate()
            ->first();

        if ($refund === null) {
            return;
        }

        $now = CarbonImmutable::now();

        $refund->forceFill([
            'status' => RefundStatus::Processed->value,
            'gateway_processed_at' => $now,
            'metadata' => array_merge((array) $refund->metadata, ['webhook_refund_processed' => $refundEntity]),
        ])->save();

        $payment = $refund->payment()->lockForUpdate()->first();
        if ($payment !== null) {
            $totalRefunded = (int) $payment->refunds()->where('status', RefundStatus::Processed->value)->sum('amount_minor');
            $newStatus = $totalRefunded >= $payment->amount_minor
                ? PaymentStatus::Refunded
                : PaymentStatus::PartiallyRefunded;

            $payment->forceFill(['status' => $newStatus->value])->save();

            $reservation = $payment->reservation()->with('user')->first();
            if ($reservation !== null && $reservation->user !== null) {
                try {
                    $dispatcher = $this->notificationDispatcher ?? app(NotificationDispatcher::class);
                    $dispatcher->dispatch(
                        eventType: 'refund.completed',
                        recipients: $reservation->user,
                        variables: [
                            'customer_name' => $reservation->user->name,
                            'booking_reference' => $reservation->booking_reference,
                            'amount' => '₹'.number_format($refund->amount_minor / 100, 2),
                            'refund_reference' => $refund->gateway_refund_id ?: ('REF-'.$refund->id),
                            'completed_at' => ($refund->gateway_processed_at ?? now())->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                            'action_url' => url("/reservations/{$reservation->id}"),
                        ],
                        related: $reservation,
                        relatedReference: $reservation->booking_reference,
                        idempotencySeed: 'refund_complete_'.$refund->id
                    );
                } catch (\Throwable $e) {
                    Log::warning('Failed to dispatch refund.completed notification: '.$e->getMessage());
                }
            }
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function handleRefundFailed(string $refundId, array $payload): void
    {
        $refundEntity = $payload['payload']['refund']['entity'] ?? [];
        $refundId = $refundId ?: (string) ($refundEntity['id'] ?? '');

        if ($refundId === '') {
            return;
        }

        /** @var ReservationRefund|null $refund */
        $refund = ReservationRefund::query()
            ->where('gateway_refund_id', $refundId)
            ->lockForUpdate()
            ->first();

        if ($refund === null) {
            return;
        }

        $errorDescription = (string) ($refundEntity['error_description'] ?? 'Gateway refund processing failed.');
        $refund->forceFill([
            'status' => RefundStatus::Failed->value,
            'failure_reason' => $errorDescription,
            'metadata' => array_merge((array) $refund->metadata, ['webhook_refund_failed' => $refundEntity]),
        ])->save();

        try {
            $refund->loadMissing(['payment.reservation']);
            $reservation = $refund->payment->reservation;
            $dispatcher = $this->notificationDispatcher ?? app(NotificationDispatcher::class);
            $dispatcher->dispatchToAdmins(
                eventType: 'admin.refund_exception',
                variables: [
                    'booking_reference' => $reservation->booking_reference,
                    'refund_reference' => $refund->gateway_refund_id ?: ('REF-'.$refund->id),
                    'amount' => '₹'.number_format($refund->amount_minor / 100, 2),
                    'error_description' => Str::limit($errorDescription, 200),
                    'created_at' => now()->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                    'action_url' => url("/admin/reservations/{$reservation->id}"),
                ],
                related: $refund,
                relatedReference: $refund->gateway_refund_id ?: $reservation->booking_reference,
                idempotencySeed: 'refund_failed_'.$refund->id
            );
        } catch (\Throwable $e) {
            Log::warning('Failed to dispatch admin.refund_exception notification: '.$e->getMessage());
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function handleTransferProcessed(array $payload): void
    {
        $transferEntity = $payload['payload']['transfer']['entity'] ?? [];
        $transferId = (string) ($transferEntity['id'] ?? '');
        if ($transferId === '') {
            return;
        }

        /** @var ProviderTransfer|null $transfer */
        $transfer = ProviderTransfer::query()
            ->where('gateway_transfer_id', $transferId)
            ->lockForUpdate()
            ->first();

        if ($transfer === null) {
            return;
        }

        $now = CarbonImmutable::now();
        $transfer->forceFill([
            'status' => ProviderTransferStatus::Processed->value,
            'processed_at' => $now,
            'raw_response' => array_merge((array) $transfer->raw_response, ['webhook' => $transferEntity]),
        ])->save();

        if ($transfer->settlement !== null) {
            $transfer->settlement->forceFill([
                'status' => SettlementStatus::Settled,
                'settled_at' => $now,
                'provider_status' => 'processed',
            ])->save();
        }

        try {
            app(FinancialLedgerService::class)->recordTransferCompleted($transfer);
        } catch (\Throwable) {
        }

        $settlement = $transfer->settlement;
        $owner = $settlement->owner;
        if ($owner !== null) {
            try {
                $dispatcher = $this->notificationDispatcher ?? app(NotificationDispatcher::class);
                $dispatcher->dispatch(
                    eventType: 'partner.transfer_completed',
                    recipients: $owner,
                    variables: [
                        'owner_name' => $owner->name,
                        'amount' => '₹'.number_format($transfer->amount_minor / 100, 2),
                        'settlement_reference' => $settlement->settlement_reference,
                        'transfer_reference' => $transfer->gateway_transfer_id ?: ('TRF-'.$transfer->id),
                        'completed_at' => ($transfer->processed_at ?? now())->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST',
                        'action_url' => url("/owner/settlements/{$settlement->id}"),
                    ],
                    related: $settlement,
                    relatedReference: $settlement->settlement_reference,
                    idempotencySeed: 'transfer_processed_'.$transfer->id
                );
            } catch (\Throwable $e) {
                Log::warning('Failed to dispatch partner.transfer_completed notification: '.$e->getMessage());
            }
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function handleTransferFailed(array $payload): void
    {
        $transferEntity = $payload['payload']['transfer']['entity'] ?? [];
        $transferId = (string) ($transferEntity['id'] ?? '');
        if ($transferId === '') {
            return;
        }

        /** @var ProviderTransfer|null $transfer */
        $transfer = ProviderTransfer::query()
            ->where('gateway_transfer_id', $transferId)
            ->lockForUpdate()
            ->first();

        if ($transfer === null) {
            return;
        }

        $errorCode = (string) ($transferEntity['error']['code'] ?? 'TRANSFER_FAILED');
        $errorDescription = (string) ($transferEntity['error']['description'] ?? 'Provider transfer failed.');

        $transfer->forceFill([
            'status' => ProviderTransferStatus::Failed->value,
            'error_code' => $errorCode,
            'error_description' => $errorDescription,
        ])->save();

        if ($transfer->settlement !== null) {
            $transfer->settlement->forceFill([
                'status' => SettlementStatus::Failed,
                'failure_reason' => $errorDescription,
                'provider_status' => 'failed',
            ])->save();
        }

        $transfer->loadMissing(['settlement.owner']);
        $settlement = $transfer->settlement;
        $owner = $settlement->owner;
        if ($owner !== null) {
            try {
                $dispatcher = $this->notificationDispatcher ?? app(NotificationDispatcher::class);
                $dispatcher->dispatch(
                    eventType: 'partner.transfer_failed',
                    recipients: $owner,
                    variables: [
                        'owner_name' => $owner->name,
                        'amount' => '₹'.number_format($transfer->amount_minor / 100, 2),
                        'settlement_reference' => $settlement->settlement_reference,
                        'failure_reason' => Str::limit($errorDescription, 180),
                        'action_url' => url("/owner/settlements/{$settlement->id}"),
                    ],
                    related: $settlement,
                    relatedReference: $settlement->settlement_reference,
                    idempotencySeed: 'transfer_failed_'.$transfer->id
                );
            } catch (\Throwable $e) {
                Log::warning('Failed to dispatch partner.transfer_failed notification: '.$e->getMessage());
            }
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function handleReversalProcessed(array $payload): void
    {
        $reversalEntity = $payload['payload']['reversal']['entity'] ?? [];
        $reversalId = (string) ($reversalEntity['id'] ?? '');
        $transferId = (string) ($reversalEntity['transfer_id'] ?? '');

        if ($reversalId === '' && $transferId === '') {
            return;
        }

        /** @var ProviderTransferReversal|null $reversal */
        $reversal = ProviderTransferReversal::query()
            ->where('gateway_reversal_id', $reversalId)
            ->lockForUpdate()
            ->first();

        if ($reversal === null && $transferId !== '') {
            $transfer = ProviderTransfer::query()->where('gateway_transfer_id', $transferId)->first();
            if ($transfer !== null) {
                $reversal = ProviderTransferReversal::query()
                    ->where('provider_transfer_id', $transfer->id)
                    ->lockForUpdate()
                    ->first();
            }
        }

        if ($reversal === null) {
            return;
        }

        $now = CarbonImmutable::now();
        $reversal->forceFill([
            'status' => 'processed',
            'processed_at' => $now,
            'gateway_reversal_id' => $reversalId ?: $reversal->gateway_reversal_id,
        ])->save();

        if ($reversal->transfer !== null) {
            $reversal->transfer->forceFill(['status' => ProviderTransferStatus::Reversed->value])->save();
        }
    }
}
