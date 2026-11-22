<?php

declare(strict_types=1);

namespace App\Services\Financial;

use App\Enums\ProviderTransferStatus;
use App\Enums\ReconciliationStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementStatus;
use App\Models\FinancialLedgerEntry;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use App\Models\ProviderTransferReversal;
use App\Models\Reservation;
use App\Models\ReservationRefund;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FinancialReconciliationService
{
    public function __construct(
        private readonly FinancialLedgerService $ledgerService,
    ) {}

    /**
     * Perform a read-only reconciliation check of a settlement batch against local subledgers
     * and persisted provider records without initiating any external provider requests.
     *
     * @return array{
     *     status: ReconciliationStatus,
     *     is_matched: bool,
     *     discrepancy_minor: int,
     *     notes: string,
     * }
     */
    public function reconcileSettlement(PartnerSettlement $settlement): array
    {
        $settlement->loadMissing([
            'items.reservation.refunds',
            'items.payment',
            'providerTransfers.reversals',
        ]);

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

        $hasNegativeItems = $settlement->items->contains(
            fn (PartnerSettlementItem $item): bool => $item->net_payable_minor < 0,
        );
        if ($hasNegativeItems) {
            $deficit = abs((int) $settlement->items->where('net_payable_minor', '<', 0)->sum('net_payable_minor'));

            return [
                'status' => ReconciliationStatus::AmountMismatch,
                'is_matched' => false,
                'discrepancy_minor' => $deficit,
                'notes' => "Settlement contains negative line balance(s) totaling {$deficit} minor requiring Finance adjustment.",
            ];
        }

        $itemsNetSum = (int) $settlement->items->sum('net_payable_minor');
        if ($itemsNetSum !== $settlement->net_settlement_amount_minor) {
            return [
                'status' => ReconciliationStatus::AmountMismatch,
                'is_matched' => false,
                'discrepancy_minor' => abs($itemsNetSum - $settlement->net_settlement_amount_minor),
                'notes' => "Item net sum ({$itemsNetSum}) differs from settlement net ({$settlement->net_settlement_amount_minor}).",
            ];
        }

        /** @var Collection<int, ProviderTransferReversal> $reversals */
        $reversals = $settlement->providerTransfers->flatMap(
            fn (ProviderTransfer $transfer): Collection => $transfer->reversals,
        );
        $hasReversedTransfers = $settlement->providerTransfers->contains(
            fn (ProviderTransfer $transfer): bool => $transfer->status === ProviderTransferStatus::Reversed,
        );

        if ($settlement->status === SettlementStatus::Settled && ($hasReversedTransfers || $reversals->isNotEmpty())) {
            $reversedTotal = (int) $reversals->sum('amount_minor');
            if ($reversedTotal === 0) {
                $reversedTotal = (int) $settlement->providerTransfers
                    ->where('status', ProviderTransferStatus::Reversed)
                    ->sum('amount_minor');
            }

            foreach ($reversals as $reversal) {
                $reversalInspection = $this->ledgerService->inspectTransferReversalJournal($reversal);
                if ($reversalInspection['status'] !== 'complete') {
                    return [
                        'status' => ReconciliationStatus::ReversalMismatch,
                        'is_matched' => false,
                        'discrepancy_minor' => $reversedTotal,
                        'notes' => "Transfer reversal {$reversal->reversal_reference} on settled batch is missing a complete reversal ledger journal.",
                    ];
                }
            }

            return [
                'status' => ReconciliationStatus::ReversalMismatch,
                'is_matched' => false,
                'discrepancy_minor' => $reversedTotal,
                'notes' => 'Settled batch contains reversed provider transfer(s) requiring settlement status reconciliation.',
            ];
        }

        if ($settlement->status === SettlementStatus::Settled) {
            $lateRefundTotal = 0;

            foreach ($settlement->items as $item) {
                $reservation = $item->reservation;
                if ($reservation === null) {
                    continue;
                }

                $processedRefunds = (int) $reservation->refunds
                    ->where('status', RefundStatus::Processed)
                    ->sum('amount_minor');

                if ($processedRefunds > $item->refund_deduction_minor) {
                    $lateRefundTotal += ($processedRefunds - $item->refund_deduction_minor);
                }
            }

            if ($lateRefundTotal > 0) {
                return [
                    'status' => ReconciliationStatus::RefundMismatch,
                    'is_matched' => false,
                    'discrepancy_minor' => $lateRefundTotal,
                    'notes' => "Post-settlement customer refund(s) of {$lateRefundTotal} minor exceed settled refund deductions.",
                ];
            }

            if ($settlement->net_settlement_amount_minor === 0
                && $settlement->providerTransfers->isEmpty()
                && $settlement->items->isNotEmpty()) {
                return [
                    'status' => ReconciliationStatus::Matched,
                    'is_matched' => true,
                    'discrepancy_minor' => 0,
                    'notes' => 'Zero-payable settlement reconciled without provider transfer.',
                ];
            }

            if ($settlement->net_settlement_amount_minor > 0 && $settlement->providerTransfers->isEmpty()) {
                return [
                    'status' => ReconciliationStatus::MissingProviderRecord,
                    'is_matched' => false,
                    'discrepancy_minor' => $settlement->net_settlement_amount_minor,
                    'notes' => 'Settlement is marked settled but has no associated provider transfer record.',
                ];
            }

            $processedTransfers = $settlement->providerTransfers
                ->where('status', ProviderTransferStatus::Processed)
                ->values();
            $transfersSum = (int) $processedTransfers->sum('amount_minor');

            if ($transfersSum !== $settlement->net_settlement_amount_minor) {
                return [
                    'status' => ReconciliationStatus::AmountMismatch,
                    'is_matched' => false,
                    'discrepancy_minor' => abs($transfersSum - $settlement->net_settlement_amount_minor),
                    'notes' => "Provider transfer processed amount ({$transfersSum}) differs from settlement amount ({$settlement->net_settlement_amount_minor}).",
                ];
            }

            $payableItemsCount = $settlement->items->where('net_payable_minor', '>', 0)->count();
            if ($processedTransfers->count() !== $payableItemsCount) {
                return [
                    'status' => ReconciliationStatus::AmountMismatch,
                    'is_matched' => false,
                    'discrepancy_minor' => 0,
                    'notes' => "Processed provider transfer count ({$processedTransfers->count()}) differs from payable item count ({$payableItemsCount}).",
                ];
            }

            foreach ($processedTransfers as $transfer) {
                $journalInspection = $this->ledgerService->inspectTransferJournal($transfer);

                if ($journalInspection['status'] === 'duplicate') {
                    return [
                        'status' => ReconciliationStatus::DuplicateTransaction,
                        'is_matched' => false,
                        'discrepancy_minor' => 0,
                        'notes' => $journalInspection['reason'] ?? "Duplicate ledger journal entries detected for transfer {$transfer->transfer_reference}.",
                    ];
                }

                if ($journalInspection['status'] !== 'complete') {
                    return [
                        'status' => ReconciliationStatus::MissingLocalRecord,
                        'is_matched' => false,
                        'discrepancy_minor' => $transfer->amount_minor,
                        'notes' => $journalInspection['reason'] ?? "Completed transfer {$transfer->transfer_reference} is missing a complete financial ledger journal.",
                    ];
                }
            }

            foreach ($processedTransfers as $transfer) {
                if (! in_array($transfer->gateway_mode, ['test', 'live'], true)
                    || blank($transfer->gateway_payment_id)
                    || ! ProviderTransfer::isRazorpayTransferId($transfer->gateway_transfer_id)) {
                    return [
                        'status' => ReconciliationStatus::ManualReviewRequired,
                        'is_matched' => false,
                        'discrepancy_minor' => 0,
                        'notes' => "Transfer {$transfer->transfer_reference} lacks verified Razorpay Route provenance metadata.",
                    ];
                }
            }

            return [
                'status' => ReconciliationStatus::Matched,
                'is_matched' => true,
                'discrepancy_minor' => 0,
                'notes' => 'Settlement and provider transfers fully reconciled.',
            ];
        }

        if ($settlement->status === SettlementStatus::Reversed) {
            foreach ($reversals as $reversal) {
                if ($this->ledgerService->inspectTransferReversalJournal($reversal)['status'] !== 'complete') {
                    return [
                        'status' => ReconciliationStatus::ReversalMismatch,
                        'is_matched' => false,
                        'discrepancy_minor' => $reversal->amount_minor,
                        'notes' => "Reversal {$reversal->reversal_reference} is missing a complete ledger journal.",
                    ];
                }
            }
        }

        return [
            'status' => ReconciliationStatus::PendingProviderUpdate,
            'is_matched' => false,
            'discrepancy_minor' => 0,
            'notes' => 'Settlement in status '.$settlement->status->label(),
        ];
    }

    /**
     * @return Collection<int, array{
     *     settlement_id: int,
     *     settlement_reference: string,
     *     owner_name: string,
     *     owner_email: string,
     *     amount_minor: int,
     *     expected_net_minor: int,
     *     status: string,
     *     status_label: string,
     *     provider_status: ?string,
     *     reconciliation_status: string,
     *     reconciliation_label: string,
     *     discrepancy_minor: int,
     *     discrepancy_reason: string,
     *     notes: string,
     *     transfers_count: int,
     *     reversals_count: int,
     *     created_at: ?string,
     * }>
     */
    public function getUnreconciledExceptions(): Collection
    {
        /** @var Collection<int, PartnerSettlement> $settlements */
        $settlements = PartnerSettlement::query()
            ->whereNotIn('status', [
                SettlementStatus::Draft,
                SettlementStatus::Cancelled,
            ])
            ->with([
                'owner',
                'financialProfile',
                'items.reservation.refunds',
                'items.payment',
                'providerTransfers.reversals',
            ])
            ->latest('id')
            ->get();

        $results = [];

        foreach ($settlements as $settlement) {
            $rec = $this->reconcileSettlement($settlement);

            if ($rec['is_matched']) {
                continue;
            }

            $reversalsCount = (int) $settlement->providerTransfers->sum(
                fn (ProviderTransfer $transfer): int => $transfer->reversals->count(),
            );

            $results[] = [
                'settlement_id' => $settlement->id,
                'settlement_reference' => $settlement->settlement_reference,
                'owner_name' => $settlement->owner->name ?? 'Unknown Partner',
                'owner_email' => $settlement->owner->email ?? '',
                'amount_minor' => $settlement->net_settlement_amount_minor,
                'expected_net_minor' => $settlement->net_settlement_amount_minor,
                'status' => $settlement->status->value,
                'status_label' => $settlement->status->label(),
                'provider_status' => $settlement->provider_status,
                'reconciliation_status' => $rec['status']->value,
                'reconciliation_label' => $rec['status']->label(),
                'discrepancy_minor' => $rec['discrepancy_minor'],
                'discrepancy_reason' => $rec['notes'],
                'notes' => $rec['notes'],
                'transfers_count' => $settlement->providerTransfers->count(),
                'reversals_count' => $reversalsCount,
                'created_at' => $settlement->created_at?->toIso8601String(),
            ];
        }

        return collect($results);
    }

    /**
     * Compute read-only global ledger and subledger integrity metrics.
     *
     * @return array{
     *     unbalanced_journals_count: int,
     *     duplicate_entity_journals_count: int,
     *     processed_refunds_missing_journal_count: int,
     *     quarantined_refunds_count: int,
     *     completed_transfers_missing_journal_count: int,
     *     processed_reversals_missing_journal_count: int,
     *     transfers_with_provenance_issues_count: int,
     *     zero_payable_platform_discount_bookings_count: int,
     * }
     */
    public function getLedgerAuditSummary(): array
    {
        $unbalancedSubquery = FinancialLedgerEntry::query()
            ->select('journal_reference')
            ->groupBy('journal_reference')
            ->havingRaw('SUM(debit_minor) != SUM(credit_minor) OR COUNT(*) < 2');
        $unbalancedJournalsCount = DB::query()
            ->fromSub($unbalancedSubquery, 'unbalanced_journals')
            ->count();

        $duplicateSubquery = FinancialLedgerEntry::query()
            ->select(['entity_type', 'entity_id', 'entry_category'])
            ->groupBy(['entity_type', 'entity_id', 'entry_category'])
            ->havingRaw('COUNT(*) > 1');
        $duplicateEntityJournalsCount = DB::query()
            ->fromSub($duplicateSubquery, 'duplicate_entity_journals')
            ->count();

        $processedRefundsMissingJournalCount = 0;
        $quarantinedRefundsCount = 0;

        foreach (ReservationRefund::query()->where('status', RefundStatus::Processed)->lazyById() as $refund) {
            if ($this->ledgerService->inspectRefundJournal($refund)['status'] !== 'complete') {
                $processedRefundsMissingJournalCount++;
            }

            if (is_array($refund->metadata) && array_key_exists('accounting_quarantine', $refund->metadata)) {
                $quarantinedRefundsCount++;
            }
        }

        $completedTransfersMissingJournalCount = 0;
        $transfersWithProvenanceIssuesCount = 0;

        foreach (ProviderTransfer::query()->where('status', ProviderTransferStatus::Processed)->lazyById() as $transfer) {
            if ($this->ledgerService->inspectTransferJournal($transfer)['status'] !== 'complete') {
                $completedTransfersMissingJournalCount++;
            }

            if (! in_array($transfer->gateway_mode, ['test', 'live'], true)
                || blank($transfer->gateway_payment_id)
                || ! ProviderTransfer::isRazorpayTransferId($transfer->gateway_transfer_id)) {
                $transfersWithProvenanceIssuesCount++;
            }
        }

        $processedReversalsMissingJournalCount = 0;
        foreach (ProviderTransferReversal::query()->where('status', 'processed')->lazyById() as $reversal) {
            if ($this->ledgerService->inspectTransferReversalJournal($reversal)['status'] !== 'complete') {
                $processedReversalsMissingJournalCount++;
            }
        }

        $zeroPayablePlatformDiscountBookingsCount = Reservation::query()
            ->where('status', ReservationStatus::Confirmed)
            ->where('total_amount_minor', 0)
            ->whereNotNull('original_amount_minor')
            ->whereRaw('original_amount_minor > COALESCE(coupon_property_share_minor, 0)')
            ->count();

        return [
            'unbalanced_journals_count' => $unbalancedJournalsCount,
            'duplicate_entity_journals_count' => $duplicateEntityJournalsCount,
            'processed_refunds_missing_journal_count' => $processedRefundsMissingJournalCount,
            'quarantined_refunds_count' => $quarantinedRefundsCount,
            'completed_transfers_missing_journal_count' => $completedTransfersMissingJournalCount,
            'processed_reversals_missing_journal_count' => $processedReversalsMissingJournalCount,
            'transfers_with_provenance_issues_count' => $transfersWithProvenanceIssuesCount,
            'zero_payable_platform_discount_bookings_count' => $zeroPayablePlatformDiscountBookingsCount,
        ];
    }
}
