<?php

declare(strict_types=1);

namespace App\Actions\Financial;

use App\Enums\CommissionSnapshotStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\SettlementStatus;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use Carbon\CarbonImmutable;

class UpdatePartnerSettlementTransferStatus
{
    /**
     * Call inside the transaction holding the settlement row lock.
     */
    public function execute(PartnerSettlement $settlement, CarbonImmutable $now, string $mode): void
    {
        if (! in_array($settlement->status, [SettlementStatus::Approved, SettlementStatus::TransferPending, SettlementStatus::Failed, SettlementStatus::Settled], true)) {
            return;
        }

        $items = $settlement->items()->where('net_payable_minor', '>', 0)->get();
        $transfers = $settlement->providerTransfers()->latest('id')->lockForUpdate()->get();
        $latestByPayment = $transfers->unique('reservation_payment_id');
        $failed = $latestByPayment->first(fn (ProviderTransfer $transfer): bool => $transfer->status === ProviderTransferStatus::Failed);
        $uncertain = $latestByPayment->contains(fn (ProviderTransfer $transfer): bool => $transfer->status === ProviderTransferStatus::Uncertain
            || ! $transfer->hasRouteProvenance($mode));
        $processed = $transfers->filter(fn (ProviderTransfer $transfer): bool => $transfer->status === ProviderTransferStatus::Processed
            && $transfer->hasRouteProvenance($mode)
            && ProviderTransfer::isRazorpayTransferId($transfer->gateway_transfer_id));
        $processedByPayment = $processed->keyBy('reservation_payment_id');

        $paidInFull = $processed->count() === $items->count()
            && $processed->sum('amount_minor') === $settlement->net_settlement_amount_minor
            && $items->every(fn (PartnerSettlementItem $item): bool => $processedByPayment->get($item->reservation_payment_id)?->amount_minor === $item->net_payable_minor);

        $previousStatus = $settlement->status;
        $status = match (true) {
            $uncertain => SettlementStatus::TransferPending,
            $failed !== null => SettlementStatus::Failed,
            $paidInFull => SettlementStatus::Settled,
            default => SettlementStatus::TransferPending,
        };

        $settlement->forceFill([
            'status' => $status,
            'transfer_initiated_at' => $settlement->transfer_initiated_at ?? ($transfers->isNotEmpty() ? $now : null),
            'settled_at' => $status === SettlementStatus::Settled ? ($settlement->settled_at ?? $now) : null,
            'provider_status' => match ($status) {
                SettlementStatus::Failed => 'failed',
                SettlementStatus::Settled => $transfers->isEmpty() ? null : 'processed',
                default => $uncertain ? 'uncertain' : 'pending',
            },
            'failure_reason' => $uncertain ? null : $failed?->error_description,
        ])->save();

        if ($status === SettlementStatus::Settled || $previousStatus === SettlementStatus::Settled) {
            $commissionStatus = $status === SettlementStatus::Settled
                ? CommissionSnapshotStatus::Settled
                : CommissionSnapshotStatus::SettlementPending;

            $settlement->items()->with('reservation')->get()->each(function (PartnerSettlementItem $item) use ($commissionStatus): void {
                $item->reservation?->forceFill(['commission_status' => $commissionStatus])->save();
            });
        }
    }
}
