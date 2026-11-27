<?php

declare(strict_types=1);

namespace App\Actions\Financial;

use App\Enums\ProviderTransferStatus;
use App\Enums\SettlementStatus;
use App\Models\PartnerSettlement;
use App\Models\ProviderTransfer;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Payments\RazorpayRouteService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ReconcilePartnerTransfer
{
    public function __construct(
        private readonly RazorpayRouteService $routeService,
        private readonly FinancialLedgerService $ledgerService,
        private readonly UpdatePartnerSettlementTransferStatus $updateTransferStatus,
    ) {}

    public function byProviderId(string $providerId): ?ProviderTransfer
    {
        $mode = $this->routeService->credentialMode();

        if ($mode === null || ! ProviderTransfer::isRazorpayTransferId($providerId)) {
            return null;
        }

        $attempt = ProviderTransfer::query()->where('gateway_transfer_id', $providerId)->first();
        if ($attempt !== null && ! $attempt->hasRouteProvenance($mode)) {
            return null;
        }

        $response = $this->routeService->fetchTransfer($providerId);
        if (($response['id'] ?? null) !== $providerId) {
            throw new RuntimeException('Razorpay returned a different transfer identifier.');
        }

        if ($attempt === null) {
            $reference = data_get($response, 'notes.tijum_transfer_reference');
            if (! is_string($reference)) {
                return null;
            }

            $attempt = ProviderTransfer::query()->where('transfer_reference', $reference)->first();
        }

        return $attempt?->hasRouteProvenance($mode) ? $this->apply($attempt, $response) : null;
    }

    public function lookup(ProviderTransfer $attempt): ?ProviderTransfer
    {
        if (! $attempt->hasRouteProvenance($this->routeService->credentialMode())) {
            return null;
        }

        if (ProviderTransfer::isRazorpayTransferId($attempt->gateway_transfer_id)) {
            return $this->byProviderId($attempt->gateway_transfer_id);
        }

        $matches = array_filter(
            $this->routeService->fetchPaymentTransfers((string) $attempt->gateway_payment_id),
            fn (array $transfer): bool => data_get($transfer, 'notes.tijum_transfer_reference') === $attempt->transfer_reference,
        );

        // An empty collection can mean the provider has not exposed the transfer yet.
        return count($matches) === 1 ? $this->apply($attempt, reset($matches)) : null;
    }

    /**
     * The response must come from the authenticated Razorpay API, never the webhook body.
     *
     * @param  array<string, mixed>  $response
     */
    public function apply(ProviderTransfer $attempt, array $response): ProviderTransfer
    {
        $mode = $this->routeService->credentialMode();
        $providerId = $response['id'] ?? null;
        $status = match ($response['transfer_status'] ?? $response['status'] ?? null) {
            'created', 'pending' => ProviderTransferStatus::Pending,
            'processed' => ProviderTransferStatus::Processed,
            'failed' => ProviderTransferStatus::Failed,
            'reversed', 'partially_reversed' => ProviderTransferStatus::Reversed,
            default => throw new RuntimeException('Razorpay returned an unknown transfer status.'),
        };

        return DB::transaction(function () use ($attempt, $mode, $providerId, $status, $response): ProviderTransfer {
            $settlement = $attempt->settlement()->lockForUpdate()->firstOrFail();
            $transfer = ProviderTransfer::query()->lockForUpdate()->findOrFail($attempt->id);

            if (! $transfer->hasRouteProvenance($mode)
                || ! ProviderTransfer::isRazorpayTransferId($providerId)
                || ($transfer->gateway_transfer_id !== null && $providerId !== $transfer->gateway_transfer_id)
                || ($response['source'] ?? null) !== $transfer->gateway_payment_id
                || ($response['recipient'] ?? null) !== $transfer->destination_account_id
                || ($response['amount'] ?? null) !== $transfer->amount_minor
                || ($response['currency'] ?? null) !== $transfer->currency
                || data_get($response, 'notes.tijum_transfer_reference') !== $transfer->transfer_reference) {
                throw new RuntimeException('Razorpay transfer does not match the stored transfer attempt.');
            }

            if ($transfer->status === ProviderTransferStatus::Failed && $status === ProviderTransferStatus::Processed) {
                throw new RuntimeException('Razorpay reported completion of a previously failed transfer.');
            }

            if (! in_array($transfer->status, [ProviderTransferStatus::Uncertain, ProviderTransferStatus::Pending], true)) {
                if ($transfer->status === ProviderTransferStatus::Processed && $settlement->status === SettlementStatus::OnHold) {
                    if ($status !== ProviderTransferStatus::Processed) {
                        throw new RuntimeException('Razorpay no longer reports this held transfer as processed. Finance review is required.');
                    }

                    $this->updateTransferStatus->execute($settlement, CarbonImmutable::now(), $mode);
                }

                return $transfer;
            }

            if ($status === ProviderTransferStatus::Reversed) {
                throw new RuntimeException('Razorpay reported a reversal before local transfer completion. Finance review is required.');
            }

            $previousStatus = $transfer->status;
            $now = CarbonImmutable::now();
            $transfer->forceFill([
                'gateway_transfer_id' => $providerId,
                'status' => $status,
                'processed_at' => $status === ProviderTransferStatus::Processed ? $now : null,
                'error_code' => $status === ProviderTransferStatus::Failed ? Str::limit((string) data_get($response, 'error.code', 'TRANSFER_FAILED'), 64, '') : null,
                'error_description' => $status === ProviderTransferStatus::Failed ? data_get($response, 'error.description', 'Provider transfer failed.') : null,
                'raw_response' => $response,
            ])->save();

            if ($status === ProviderTransferStatus::Processed) {
                $this->ledgerService->recordTransferCompleted($transfer->setRelation('settlement', $settlement));
            }

            $this->updateTransferStatus->execute($settlement, $now, $mode);

            if ($status !== $previousStatus && $status !== ProviderTransferStatus::Pending) {
                DB::afterCommit(fn () => $this->notify($transfer, $settlement));
            }

            return $transfer;
        }, 3);
    }

    private function notify(ProviderTransfer $transfer, PartnerSettlement $settlement): void
    {
        try {
            $owner = $settlement->owner;
            if ($owner === null) {
                return;
            }

            $processed = $transfer->status === ProviderTransferStatus::Processed;
            $variables = [
                'owner_name' => $owner->name,
                'amount' => '₹'.number_format($transfer->amount_minor / 100, 2),
                'settlement_reference' => $settlement->settlement_reference,
                'transfer_reference' => $transfer->gateway_transfer_id ?: $transfer->transfer_reference,
                'action_url' => route('owner.settlements.show', $settlement),
            ];

            if ($processed) {
                $variables['completed_at'] = ($transfer->processed_at ?? now())->setTimezone('Asia/Kolkata')->format('d M Y, H:i').' IST';
            } else {
                $variables['failure_reason'] = Str::limit($transfer->error_description ?? 'Provider transfer failed.', 180);
            }

            app(NotificationDispatcher::class)->dispatch(
                eventType: $processed ? 'partner.transfer_completed' : 'partner.transfer_failed',
                recipients: $owner,
                variables: $variables,
                related: $settlement,
                relatedReference: $settlement->settlement_reference,
                idempotencySeed: "transfer_{$transfer->status->value}_{$transfer->id}",
            );
        } catch (Throwable $exception) {
            Log::warning('Failed to dispatch partner transfer notification: '.$exception->getMessage());
        }
    }
}
