<?php

declare(strict_types=1);

namespace App\Actions\Payments;

use App\Actions\Financial\ReconcilePartnerTransfer;
use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Models\PaymentWebhookEvent;
use App\Models\ProviderTransfer;
use App\Models\ProviderTransferReversal;
use App\Models\ReservationPayment;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ProcessWebhookEvent
{
    public const ROUTE_TRANSFER_EVENTS = ['transfer.created', 'transfer.processed', 'transfer.failed'];

    public const REFUND_EVENTS = ['refund.created', 'refund.processed', 'refund.failed'];

    public const PAYMENT_EVENTS = ['payment.captured', 'order.paid', 'payment.failed'];

    public function __construct(
        private readonly PaymentGateway $gateway,
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

        $rawEventId = $eventId ?: (string) ($payload['event_id'] ?? $payload['id'] ?? '');
        $eventType = (string) ($payload['event'] ?? '');

        $eventId = ($rawEventId !== '' && strlen($rawEventId) <= 120)
            ? $rawEventId
            : 'evt_'.hash('sha256', $rawPayload);

        if (in_array($eventType, [...self::ROUTE_TRANSFER_EVENTS, ...self::REFUND_EVENTS, ...self::PAYMENT_EVENTS], true)) {
            $event = $this->storeRecoverableEvent($payload, $eventId, $eventType);
            $status = match (true) {
                in_array($eventType, self::REFUND_EVENTS, true) => $this->replayRefund($event),
                in_array($eventType, self::PAYMENT_EVENTS, true) => $this->replayPayment($event),
                default => $this->replayTransfer($event),
            };

            return [
                'status' => $status,
                ...($status === 'ignored' ? ['message' => 'Event already processed.'] : []),
                'event_id' => $eventId,
                'event_type' => $eventType,
            ];
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
            DB::transaction(function () use ($eventType, $payload, $eventRecord): void {
                match ($eventType) {
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

    public function replayTransfer(PaymentWebhookEvent $event): string
    {
        return $this->replayProviderEvent($event, self::ROUTE_TRANSFER_EVENTS, function () use ($event): bool {
            $transferId = data_get($event->payload, 'payload.transfer.entity.id');
            $transfer = is_string($transferId) ? app(ReconcilePartnerTransfer::class)->byProviderId($transferId) : null;

            return $transfer !== null && ($event->event_type === 'transfer.created'
                || in_array($transfer->status, [ProviderTransferStatus::Processed, ProviderTransferStatus::Failed, ProviderTransferStatus::Reversed], true));
        });
    }

    public function replayRefund(PaymentWebhookEvent $event): string
    {
        return $this->replayProviderEvent($event, self::REFUND_EVENTS, function () use ($event): bool {
            $refundId = $event->gateway_refund_id ?? data_get($event->payload, 'payload.refund.entity.id');
            $refund = is_string($refundId) ? app(ReconcilePaymentRefund::class)->byProviderId($refundId) : null;

            return $refund !== null && ($event->event_type === 'refund.created'
                || in_array($refund->status, [RefundStatus::Processed, RefundStatus::Failed], true));
        });
    }

    public function replayPayment(PaymentWebhookEvent $event): string
    {
        return $this->replayProviderEvent($event, self::PAYMENT_EVENTS, function () use ($event): bool {
            $orderId = $event->gateway_order_id ?? '';
            $paymentId = $event->gateway_payment_id ?? '';

            if ($event->event_type === 'payment.failed') {
                return DB::transaction(fn (): bool => $this->handlePaymentFailed($orderId, $paymentId, $event->payload), 3);
            }

            $entity = data_get($event->payload, 'payload.payment.entity', []);

            if ($event->event_type === 'order.paid') {
                $orderEntity = data_get($event->payload, 'payload.order.entity');
                if (! is_array($orderEntity)
                    || ! is_string($orderEntity['id'] ?? null)
                    || preg_match('/^order_[A-Za-z0-9_]+$/D', $orderEntity['id']) !== 1
                    || ($orderId !== '' && $orderEntity['id'] !== $orderId)) {
                    throw ValidationException::withMessages(['order_id' => 'Invalid order payload in webhook.']);
                }

                $orderId = $orderEntity['id'];
                if (($orderEntity['status'] ?? null) !== 'paid') {
                    throw ValidationException::withMessages(['status' => 'Order paid webhook does not report paid status.']);
                }

                $localPayment = ReservationPayment::query()
                    ->where('gateway', 'razorpay')
                    ->where('gateway_order_id', $orderId)
                    ->first();
                if ($localPayment instanceof ReservationPayment) {
                    if (($orderEntity['amount'] ?? null) !== $localPayment->amount_minor
                        || ! is_string($orderEntity['currency'] ?? null)
                        || strtoupper($orderEntity['currency']) !== strtoupper($localPayment->currency)) {
                        throw ValidationException::withMessages(['amount' => 'Order webhook amount or currency mismatch.']);
                    }
                }

                if (! is_array($entity) || $entity === []) {
                    $capturedPayments = array_values(array_filter(
                        $this->gateway->fetchOrderPayments($orderId),
                        fn (array $item): bool => ($item['status'] ?? null) === 'captured',
                    ));
                    if (count($capturedPayments) !== 1) {
                        return false;
                    }

                    $entity = $capturedPayments[0];
                    $paymentId = is_string($entity['id'] ?? null) ? $entity['id'] : '';
                } elseif (($entity['order_id'] ?? null) !== $orderId
                    || ($entity['amount'] ?? null) !== ($orderEntity['amount'] ?? null)
                    || ! is_string($entity['currency'] ?? null)
                    || ! is_string($orderEntity['currency'] ?? null)
                    || strtoupper($entity['currency']) !== strtoupper($orderEntity['currency'])) {
                    throw ValidationException::withMessages(['order_id' => 'Order webhook payment entity mismatch.']);
                }
            }

            return is_array($entity)
                && app(RecordCapturedPayment::class)->fromWebhook($orderId, $paymentId, $entity) !== null;
        });
    }

    /** @param array<string, mixed> $payload */
    private function storeRecoverableEvent(array $payload, string $eventId, string $eventType): PaymentWebhookEvent
    {
        try {
            return PaymentWebhookEvent::query()->firstOrCreate(
                ['event_id' => $eventId],
                [
                    'gateway' => 'razorpay',
                    'event_type' => $eventType,
                    'gateway_order_id' => data_get($payload, 'payload.payment.entity.order_id') ?? data_get($payload, 'payload.order.entity.id'),
                    'gateway_payment_id' => data_get($payload, 'payload.payment.entity.id') ?? data_get($payload, 'payload.refund.entity.payment_id'),
                    'gateway_refund_id' => data_get($payload, 'payload.refund.entity.id'),
                    'payload' => $payload,
                    'status' => 'received',
                ],
            );
        } catch (QueryException $e) {
            $existing = PaymentWebhookEvent::query()->where('event_id', $eventId)->first();
            if ($existing instanceof PaymentWebhookEvent) {
                return $existing;
            }

            throw $e;
        }
    }

    /**
     * @param  list<string>  $supportedTypes
     * @param  Closure(): bool  $reconcile
     */
    private function replayProviderEvent(PaymentWebhookEvent $event, array $supportedTypes, Closure $reconcile): string
    {
        if ($event->gateway !== 'razorpay' || ! in_array($event->event_type, $supportedTypes, true) || $event->status === 'processed') {
            return 'ignored';
        }

        // Persist the signed event first. The provider read never holds a database lock.
        $unprocessed = PaymentWebhookEvent::query()->whereKey($event->id)->where('status', '!=', 'processed');

        try {
            $completed = $reconcile();

            $unprocessed->update([
                'status' => $completed ? 'processed' : 'unresolved',
                'processed_at' => $completed ? CarbonImmutable::now() : null,
                'error_message' => $completed ? null : 'Waiting for a matching, authoritative Razorpay state.',
            ]);

            return $completed ? 'success' : 'unresolved';
        } catch (\Throwable $exception) {
            $unprocessed->update(['status' => 'failed', 'processed_at' => null, 'error_message' => $exception->getMessage()]);

            throw $exception;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function handlePaymentFailed(string $orderId, string $paymentId, array $payload): bool
    {
        $paymentEntity = $payload['payload']['payment']['entity'] ?? [];
        $orderId = $orderId ?: (string) ($paymentEntity['order_id'] ?? '');
        $paymentId = $paymentId ?: (string) ($paymentEntity['id'] ?? '');

        if ($orderId === '') {
            return false;
        }

        /** @var ReservationPayment|null $payment */
        $payment = ReservationPayment::query()
            ->where('gateway_order_id', $orderId)
            ->where('gateway', 'razorpay')
            ->lockForUpdate()
            ->first();

        if ($payment === null) {
            return false;
        }

        // Do not overwrite an already captured state with a failed notification
        if ($payment->isCaptured() || in_array($payment->status, [PaymentStatus::Failed, PaymentStatus::Cancelled], true)) {
            return true;
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

        $updatedTimestamp = $payment->updated_at->timestamp;
        $reservation = $payment->reservation()->with(['user', 'property'])->first();
        if ($reservation !== null && $reservation->user !== null && $reservation->property !== null) {
            $user = $reservation->user;
            $property = $reservation->property;
            DB::afterCommit(function () use ($payment, $reservation, $user, $property, $errorDescription, $updatedTimestamp): void {
                try {
                    $dispatcher = $this->notificationDispatcher ?? app(NotificationDispatcher::class);
                    $dispatcher->dispatch(
                        eventType: 'payment.failed',
                        recipients: $user,
                        variables: [
                            'customer_name' => $user->name,
                            'booking_reference' => $reservation->booking_reference,
                            'property_name' => $reservation->snapshot_property_name ?: $property->name,
                            'amount' => '₹'.number_format(($payment->amount_minor ?: $reservation->total_amount_minor) / 100, 2),
                            'failure_reason' => Str::limit($errorDescription, 180),
                            'action_url' => route('reservations.show', $reservation),
                        ],
                        related: $reservation,
                        relatedReference: $reservation->booking_reference,
                        idempotencySeed: 'pay_fail_'.$payment->id.'_'.$updatedTimestamp
                    );
                } catch (\Throwable $e) {
                    Log::warning('Failed to dispatch payment.failed notification: '.$e->getMessage());
                }
            });
        }

        return true;
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
        if ($reversal->status !== 'processed') {
            $reversal->forceFill([
                'status' => 'processed',
                'processed_at' => $reversal->processed_at ?? $now,
                'gateway_reversal_id' => $reversalId ?: $reversal->gateway_reversal_id,
            ])->save();
        }

        if ($reversal->transfer !== null && $reversal->transfer->status !== ProviderTransferStatus::Reversed) {
            $reversal->transfer->forceFill(['status' => ProviderTransferStatus::Reversed->value])->save();
        }

        app(FinancialLedgerService::class)->recordTransferReversal($reversal);
    }
}
