<?php

declare(strict_types=1);

namespace App\Services\Financial;

use App\Enums\ProviderTransferStatus;
use App\Enums\ReconciliationStatus;
use App\Enums\SettlementStatus;
use App\Models\PartnerSettlement;
use Illuminate\Support\Collection;

class FinancialReconciliationService
{
    /**
     * @return array{
     *     status: ReconciliationStatus,
     *     is_matched: bool,
     *     discrepancy_minor: int,
     *     notes: string,
     * }
     */
    public function reconcileSettlement(PartnerSettlement $settlement): array
    {
        $settlement->loadMissing(['items', 'providerTransfers']);

        if ($settlement->status === SettlementStatus::Failed) {
            return [
                'status' => ReconciliationStatus::FailedTransfer,
                'is_matched' => false,
                'discrepancy_minor' => $settlement->net_settlement_amount_minor,
                'notes' => 'Settlement transfer failed: '.($settlement->failure_reason ?? 'Provider error'),
            ];
        }

        if ($settlement->status === SettlementStatus::OnHold) {
            return [
                'status' => ReconciliationStatus::ManualReviewRequired,
                'is_matched' => false,
                'discrepancy_minor' => 0,
                'notes' => 'Settlement placed on administrative or protection hold.',
            ];
        }

        $itemsNetSum = $settlement->items->sum('net_payable_minor');
        if ($itemsNetSum !== $settlement->net_settlement_amount_minor) {
            return [
                'status' => ReconciliationStatus::AmountMismatch,
                'is_matched' => false,
                'discrepancy_minor' => abs($itemsNetSum - $settlement->net_settlement_amount_minor),
                'notes' => "Item net sum ({$itemsNetSum}) differs from settlement net ({$settlement->net_settlement_amount_minor}).",
            ];
        }

        if ($settlement->status === SettlementStatus::Settled) {
            $transfersSum = $settlement->providerTransfers
                ->where('status', ProviderTransferStatus::Processed)
                ->sum('amount_minor');

            if ($transfersSum !== $settlement->net_settlement_amount_minor) {
                return [
                    'status' => ReconciliationStatus::AmountMismatch,
                    'is_matched' => false,
                    'discrepancy_minor' => abs($transfersSum - $settlement->net_settlement_amount_minor),
                    'notes' => "Provider transfer processed amount ({$transfersSum}) differs from settlement amount ({$settlement->net_settlement_amount_minor}).",
                ];
            }

            return [
                'status' => ReconciliationStatus::Matched,
                'is_matched' => true,
                'discrepancy_minor' => 0,
                'notes' => 'Settlement and provider transfers fully reconciled.',
            ];
        }

        return [
            'status' => ReconciliationStatus::PendingProviderUpdate,
            'is_matched' => false,
            'discrepancy_minor' => 0,
            'notes' => 'Settlement in status '.$settlement->status->label(),
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function getUnreconciledExceptions(): Collection
    {
        /** @var Collection<int, PartnerSettlement> $settlements */
        $settlements = PartnerSettlement::query()
            ->whereIn('status', [
                SettlementStatus::Failed,
                SettlementStatus::OnHold,
                SettlementStatus::TransferPending,
            ])
            ->with(['owner', 'financialProfile'])
            ->latest('id')
            ->get();

        return $settlements->map(function (PartnerSettlement $settlement): array {
            $rec = $this->reconcileSettlement($settlement);

            return [
                'settlement_id' => $settlement->id,
                'settlement_reference' => $settlement->settlement_reference,
                'owner_name' => $settlement->owner?->name,
                'amount_minor' => $settlement->net_settlement_amount_minor,
                'status' => $settlement->status->value,
                'status_label' => $settlement->status->label(),
                'reconciliation_status' => $rec['status']->value,
                'reconciliation_label' => $rec['status']->label(),
                'notes' => $rec['notes'],
                'created_at' => $settlement->created_at?->toIso8601String(),
            ];
        });
    }
}
