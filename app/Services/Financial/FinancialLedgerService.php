<?php

declare(strict_types=1);

namespace App\Services\Financial;

use App\Enums\LedgerEntryCategory;
use App\Models\FinancialLedgerEntry;
use App\Models\Owner;
use App\Models\PartnerSettlement;
use App\Models\PlatformRelocationSubsidy;
use App\Models\ProviderTransfer;
use App\Models\ProviderTransferReversal;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use InvalidArgumentException;

class FinancialLedgerService
{
    /**
     * @param  list<array{
     *     category: LedgerEntryCategory,
     *     debit_minor: int,
     *     credit_minor: int,
     *     notes?: string|null,
     * }>  $entries
     * @return list<FinancialLedgerEntry>
     */
    public function postJournal(
        Model $entity,
        ?Owner $owner,
        array $entries,
        ?CarbonImmutable $postedAt = null,
    ): array {
        $now = $postedAt ?? CarbonImmutable::now();
        $year = $now->format('Y');
        $journalRef = 'JRN-'.$year.'-'.strtoupper(Str::ulid()->toBase32());

        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($entries as $e) {
            $totalDebit += $e['debit_minor'];
            $totalCredit += $e['credit_minor'];
        }

        if ($totalDebit !== $totalCredit) {
            throw new InvalidArgumentException(
                "Unbalanced financial journal: Total Debits ({$totalDebit}) != Total Credits ({$totalCredit}).",
            );
        }

        $created = [];

        foreach ($entries as $e) {
            $entryRef = 'TLE-'.$year.'-'.strtoupper(Str::ulid()->toBase32());

            $record = FinancialLedgerEntry::create([
                'entry_reference' => $entryRef,
                'journal_reference' => $journalRef,
                'entry_category' => $e['category']->value,
                'debit_minor' => $e['debit_minor'],
                'credit_minor' => $e['credit_minor'],
                'currency' => 'INR',
                'entity_type' => $entity::class,
                'entity_id' => (int) $entity->getKey(),
                'owner_id' => $owner?->id,
                'notes' => $e['notes'] ?? null,
                'posted_at' => $now,
            ]);

            $created[] = $record;
        }

        return $created;
    }

    public function recordPaymentCaptured(ReservationPayment $payment): void
    {
        $reservation = $payment->reservation;
        $owner = $reservation?->property?->owner;

        $amount = $payment->amount_minor;

        $this->postJournal($payment, $owner, [
            [
                'category' => LedgerEntryCategory::PaymentCaptured,
                'debit_minor' => $amount,
                'credit_minor' => 0,
                'notes' => "Customer payment captured for booking {$reservation?->booking_reference}",
            ],
            [
                'category' => LedgerEntryCategory::PartnerPayable,
                'debit_minor' => 0,
                'credit_minor' => $amount,
                'notes' => "Unsettled accommodation obligation for {$reservation?->booking_reference}",
            ],
        ]);
    }

    public function recordSettlementApproved(PartnerSettlement $settlement): void
    {
        $owner = $settlement->owner;
        $commission = $settlement->commission_amount_minor;
        $commTax = $settlement->commission_tax_amount_minor;
        $netPayable = $settlement->net_settlement_amount_minor;
        $statutory = $settlement->statutory_deductions_minor;

        // Refunds are journalled separately when they complete, reducing PartnerPayable at that
        // point. The settlement therefore clears only the payable that remains: the commission,
        // tax, TDS and net transfer credits. Using gross here would double-count the refund and
        // leave the journal unbalanced.
        $clearedPayable = $commission + $commTax + $statutory + $netPayable;

        $entries = [
            [
                'category' => LedgerEntryCategory::PartnerPayable,
                'debit_minor' => $clearedPayable,
                'credit_minor' => 0,
                'notes' => "Settlement allocation from net booking value for {$settlement->settlement_reference}",
            ],
            [
                'category' => LedgerEntryCategory::CommissionRevenue,
                'debit_minor' => 0,
                'credit_minor' => $commission,
                'notes' => "TIJUM marketplace commission revenue for {$settlement->settlement_reference}",
            ],
        ];

        if ($commTax > 0) {
            $entries[] = [
                'category' => LedgerEntryCategory::CommissionGst,
                'debit_minor' => 0,
                'credit_minor' => $commTax,
                'notes' => "GST on marketplace commission for {$settlement->settlement_reference}",
            ];
        }

        if ($statutory > 0) {
            $entries[] = [
                'category' => LedgerEntryCategory::TdsWithheld,
                'debit_minor' => 0,
                'credit_minor' => $statutory,
                'notes' => "Statutory tax withholding for {$settlement->settlement_reference}",
            ];
        }

        $entries[] = [
            'category' => LedgerEntryCategory::TransferPending,
            'debit_minor' => 0,
            'credit_minor' => $netPayable,
            'notes' => "Net payable pending provider transfer for {$settlement->settlement_reference}",
        ];

        $this->postJournal($settlement, $owner, $entries);
    }

    public function recordTransferCompleted(ProviderTransfer $transfer): void
    {
        $settlement = $transfer->settlement;
        $owner = $settlement?->owner;
        $amount = $transfer->amount_minor;

        $this->postJournal($transfer, $owner, [
            [
                'category' => LedgerEntryCategory::TransferPending,
                'debit_minor' => $amount,
                'credit_minor' => 0,
                'notes' => "Discharged transfer pending for {$transfer->transfer_reference}",
            ],
            [
                'category' => LedgerEntryCategory::TransferCompleted,
                'debit_minor' => 0,
                'credit_minor' => $amount,
                'notes' => "Settlement transferred to linked account {$transfer->destination_account_id}",
            ],
        ]);
    }

    public function recordRefundCompleted(ReservationRefund $refund): void
    {
        $reservation = $refund->reservation;
        $owner = $reservation?->property?->owner;
        $amount = $refund->amount_minor;

        $this->postJournal($refund, $owner, [
            [
                'category' => LedgerEntryCategory::PartnerPayable,
                'debit_minor' => $amount,
                'credit_minor' => 0,
                'notes' => "Customer refund reduction on payable for {$reservation?->booking_reference}",
            ],
            [
                'category' => LedgerEntryCategory::RefundCompleted,
                'debit_minor' => 0,
                'credit_minor' => $amount,
                'notes' => "Completed Razorpay customer refund for {$reservation?->booking_reference}",
            ],
        ]);
    }

    public function recordRelocationSubsidy(PlatformRelocationSubsidy $subsidy): void
    {
        $amount = $subsidy->subsidy_amount_minor;

        $this->postJournal($subsidy, null, [
            [
                'category' => LedgerEntryCategory::RelocationSubsidy,
                'debit_minor' => $amount,
                'credit_minor' => 0,
                'notes' => "Platform relocation difference subsidy for {$subsidy->subsidy_reference}",
            ],
            [
                'category' => LedgerEntryCategory::PartnerPayable,
                'debit_minor' => 0,
                'credit_minor' => $amount,
                'notes' => "Payable credit to destination partner for {$subsidy->subsidy_reference}",
            ],
        ]);
    }

    public function recordTransferReversal(ProviderTransferReversal $reversal): void
    {
        $transfer = $reversal->transfer;
        $settlement = $transfer?->settlement;
        $owner = $settlement?->owner;
        $amount = $reversal->amount_minor;

        $this->postJournal($reversal, $owner, [
            [
                'category' => LedgerEntryCategory::TransferCompleted,
                'debit_minor' => $amount,
                'credit_minor' => 0,
                'notes' => "Reversed provider transfer for {$reversal->reversal_reference}",
            ],
            [
                'category' => LedgerEntryCategory::TransferReversal,
                'debit_minor' => 0,
                'credit_minor' => $amount,
                'notes' => "Transfer reversal credit for {$reversal->reversal_reference}",
            ],
        ]);
    }
}
