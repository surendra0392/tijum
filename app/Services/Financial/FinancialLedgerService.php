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
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

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
        string $currency = 'INR',
        ?CarbonImmutable $effectiveAt = null,
        ?string $idempotencyKey = null,
        bool $isCorrective = false,
    ): array {
        $normalizedCurrency = strtoupper(trim($currency));
        if (preg_match('/^[A-Z]{3}$/', $normalizedCurrency) !== 1) {
            throw new InvalidArgumentException("Invalid ledger currency [{$currency}].");
        }

        if (count($entries) < 2) {
            throw new InvalidArgumentException('Financial journal must contain at least two balanced legs.');
        }

        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($entries as $index => $e) {
            $debit = (int) $e['debit_minor'];
            $credit = (int) $e['credit_minor'];

            if ($debit < 0 || $credit < 0 || ($debit > 0 && $credit > 0) || ($debit === 0 && $credit === 0)) {
                throw new InvalidArgumentException("Ledger leg {$index} must specify a strictly positive amount on exactly one side.");
            }

            $totalDebit += $debit;
            $totalCredit += $credit;
        }

        if ($totalDebit <= 0 || $totalDebit !== $totalCredit) {
            throw new InvalidArgumentException(
                "Unbalanced financial journal: Total Debits ({$totalDebit}) != Total Credits ({$totalCredit}).",
            );
        }

        $normalizedIdempotency = $idempotencyKey !== null && trim($idempotencyKey) !== ''
            ? trim($idempotencyKey)
            : null;

        if ($normalizedIdempotency !== null) {
            $existing = FinancialLedgerEntry::query()
                ->where('idempotency_key', $normalizedIdempotency)
                ->orderBy('line_number')
                ->orderBy('id')
                ->get();

            if ($existing->isNotEmpty()) {
                return $this->validateExistingIdempotentJournal($existing, count($entries), $totalDebit, $normalizedCurrency, $normalizedIdempotency);
            }
        }

        $now = $postedAt ?? CarbonImmutable::now();
        $effective = $effectiveAt ?? $now;
        $year = $now->format('Y');
        $journalRef = 'JRN-'.$year.'-'.strtoupper(Str::ulid()->toBase32());

        try {
            return DB::transaction(function () use (
                $entity,
                $owner,
                $entries,
                $normalizedCurrency,
                $normalizedIdempotency,
                $now,
                $effective,
                $year,
                $journalRef,
                $isCorrective,
            ): array {
                $created = [];
                $lineNumber = 1;

                foreach ($entries as $e) {
                    $entryRef = 'TLE-'.$year.'-'.strtoupper(Str::ulid()->toBase32());

                    $record = FinancialLedgerEntry::create([
                        'entry_reference' => $entryRef,
                        'journal_reference' => $journalRef,
                        'idempotency_key' => $normalizedIdempotency,
                        'line_number' => $normalizedIdempotency !== null ? $lineNumber++ : null,
                        'entry_category' => $e['category']->value,
                        'debit_minor' => (int) $e['debit_minor'],
                        'credit_minor' => (int) $e['credit_minor'],
                        'currency' => $normalizedCurrency,
                        'entity_type' => $entity::class,
                        'entity_id' => (int) $entity->getKey(),
                        'owner_id' => $owner?->id,
                        'notes' => $e['notes'] ?? null,
                        'posted_at' => $now,
                        'effective_at' => $effective,
                        'is_corrective' => $isCorrective,
                    ]);

                    $created[] = $record;
                }

                return $created;
            });
        } catch (QueryException $e) {
            if ($normalizedIdempotency !== null && $this->isUniqueConstraintViolation($e)) {
                $existing = FinancialLedgerEntry::query()
                    ->where('idempotency_key', $normalizedIdempotency)
                    ->orderBy('line_number')
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();

                if ($existing->isNotEmpty()) {
                    return $this->validateExistingIdempotentJournal($existing, count($entries), $totalDebit, $normalizedCurrency, $normalizedIdempotency);
                }
            }

            throw $e;
        }
    }

    /**
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectPaymentCaptureJournal(ReservationPayment $payment): array
    {
        return $this->inspectEntityJournal(
            $payment,
            [LedgerEntryCategory::PaymentCaptured, LedgerEntryCategory::PartnerPayable],
            $payment->amount_minor,
            $payment->currency,
        );
    }

    /**
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectRefundJournal(ReservationRefund $refund): array
    {
        return $this->inspectEntityJournal(
            $refund,
            [LedgerEntryCategory::PartnerPayable, LedgerEntryCategory::RefundCompleted],
            $refund->amount_minor,
            $refund->currency,
        );
    }

    /**
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectTransferJournal(ProviderTransfer $transfer): array
    {
        return $this->inspectEntityJournal(
            $transfer,
            [LedgerEntryCategory::TransferPending, LedgerEntryCategory::TransferCompleted],
            $transfer->amount_minor,
            $transfer->currency,
        );
    }

    /**
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectTransferReversalJournal(ProviderTransferReversal $reversal): array
    {
        return $this->inspectEntityJournal(
            $reversal,
            [LedgerEntryCategory::TransferCompleted, LedgerEntryCategory::TransferReversal],
            $reversal->amount_minor,
            $reversal->currency,
        );
    }

    /**
     * @param  list<LedgerEntryCategory>  $expectedCategories
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectEntityJournal(
        Model $entity,
        array $expectedCategories,
        int $expectedTotalMinor,
        ?string $expectedCurrency = null,
    ): array {
        $entries = FinancialLedgerEntry::query()
            ->where('entity_type', $entity::class)
            ->where('entity_id', (int) $entity->getKey())
            ->orderBy('line_number')
            ->orderBy('id')
            ->get();

        if ($entries->isEmpty()) {
            return [
                'status' => 'missing',
                'entries' => [],
                'reason' => null,
            ];
        }

        /** @var list<FinancialLedgerEntry> $list */
        $list = $entries->values()->all();

        $distinctJournals = $entries->pluck('journal_reference')->unique()->count();
        if ($distinctJournals > 1 || $entries->count() > count($expectedCategories)) {
            return [
                'status' => 'duplicate',
                'entries' => $list,
                'reason' => 'Multiple or duplicate ledger entries exist for '.$entity::class.'#'.$entity->getKey().'.',
            ];
        }

        $actualCategoryCounts = $entries->countBy(fn (FinancialLedgerEntry $entry): string => $entry->entry_category->value);
        foreach ($actualCategoryCounts as $count) {
            if ($count > 1) {
                return [
                    'status' => 'duplicate',
                    'entries' => $list,
                    'reason' => 'Duplicate category leg recorded for '.$entity::class.'#'.$entity->getKey().'.',
                ];
            }
        }

        $expectedValues = array_map(static fn (LedgerEntryCategory $cat): string => $cat->value, $expectedCategories);
        foreach ($expectedValues as $expectedValue) {
            if (($actualCategoryCounts[$expectedValue] ?? 0) !== 1) {
                return [
                    'status' => 'incomplete',
                    'entries' => $list,
                    'reason' => "Missing expected ledger leg [{$expectedValue}] for ".$entity::class.'#'.$entity->getKey().'.',
                ];
            }
        }

        if ($entries->count() < count($expectedCategories)) {
            return [
                'status' => 'incomplete',
                'entries' => $list,
                'reason' => 'Incomplete ledger journal for '.$entity::class.'#'.$entity->getKey().'.',
            ];
        }

        $totalDebit = (int) $entries->sum('debit_minor');
        $totalCredit = (int) $entries->sum('credit_minor');
        if ($totalDebit !== $totalCredit || $totalDebit !== $expectedTotalMinor) {
            return [
                'status' => 'inconsistent',
                'entries' => $list,
                'reason' => 'Ledger journal total mismatch for '.$entity::class.'#'.$entity->getKey()." (debit={$totalDebit}, credit={$totalCredit}, expected={$expectedTotalMinor}).",
            ];
        }

        if ($expectedCurrency !== null) {
            $normalizedExpectedCurrency = strtoupper(trim($expectedCurrency));
            $hasCurrencyMismatch = $entries->contains(
                fn (FinancialLedgerEntry $entry): bool => strtoupper((string) $entry->currency) !== $normalizedExpectedCurrency,
            );

            if ($hasCurrencyMismatch) {
                return [
                    'status' => 'inconsistent',
                    'entries' => $list,
                    'reason' => 'Ledger journal currency mismatch for '.$entity::class.'#'.$entity->getKey()." (expected {$normalizedExpectedCurrency}).",
                ];
            }
        }

        return [
            'status' => 'complete',
            'entries' => $list,
            'reason' => null,
        ];
    }

    public function recordPaymentCaptured(ReservationPayment $payment): void
    {
        $inspection = $this->inspectPaymentCaptureJournal($payment);
        if ($inspection['status'] === 'complete') {
            return;
        }
        if ($inspection['status'] !== 'missing') {
            throw new RuntimeException($inspection['reason'] ?? 'Existing payment capture journal is inconsistent.');
        }

        $reservation = $payment->reservation;
        $owner = $reservation?->property?->owner;
        $amount = $payment->amount_minor;
        $effectiveAt = $this->toImmutable($payment->captured_at);

        $this->postJournal(
            entity: $payment,
            owner: $owner,
            entries: [
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
            ],
            currency: $payment->currency,
            effectiveAt: $effectiveAt,
            idempotencyKey: 'payment_captured:'.$payment->id,
        );
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
        if ($clearedPayable <= 0) {
            return;
        }

        $entries = [
            [
                'category' => LedgerEntryCategory::PartnerPayable,
                'debit_minor' => $clearedPayable,
                'credit_minor' => 0,
                'notes' => "Settlement allocation from net booking value for {$settlement->settlement_reference}",
            ],
        ];

        if ($commission > 0) {
            $entries[] = [
                'category' => LedgerEntryCategory::CommissionRevenue,
                'debit_minor' => 0,
                'credit_minor' => $commission,
                'notes' => "TIJUM marketplace commission revenue for {$settlement->settlement_reference}",
            ];
        }

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

        if ($netPayable > 0) {
            $entries[] = [
                'category' => LedgerEntryCategory::TransferPending,
                'debit_minor' => 0,
                'credit_minor' => $netPayable,
                'notes' => "Net payable pending provider transfer for {$settlement->settlement_reference}",
            ];
        }

        $expectedCategories = array_map(static fn (array $e): LedgerEntryCategory => $e['category'], $entries);
        $inspection = $this->inspectEntityJournal($settlement, $expectedCategories, $clearedPayable, $settlement->currency);
        if ($inspection['status'] === 'complete') {
            return;
        }
        if ($inspection['status'] !== 'missing') {
            throw new RuntimeException($inspection['reason'] ?? 'Existing settlement approval journal is inconsistent.');
        }

        $this->postJournal(
            entity: $settlement,
            owner: $owner,
            entries: $entries,
            currency: $settlement->currency,
            effectiveAt: $this->toImmutable($settlement->approved_at),
            idempotencyKey: 'settlement_approved:'.$settlement->id,
        );
    }

    public function recordTransferCompleted(ProviderTransfer $transfer): void
    {
        $inspection = $this->inspectTransferJournal($transfer);
        if ($inspection['status'] === 'complete') {
            return;
        }
        if ($inspection['status'] !== 'missing') {
            throw new RuntimeException($inspection['reason'] ?? 'Existing transfer completion journal is inconsistent.');
        }

        $settlement = $transfer->settlement;
        $owner = $settlement?->owner;
        $amount = $transfer->amount_minor;

        $this->postJournal(
            entity: $transfer,
            owner: $owner,
            entries: [
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
            ],
            currency: $transfer->currency,
            effectiveAt: $this->toImmutable($transfer->processed_at),
            idempotencyKey: 'transfer_completed:'.$transfer->id,
        );
    }

    /**
     * @return list<FinancialLedgerEntry>
     */
    public function recordRefundCompleted(
        ReservationRefund $refund,
        ?CarbonImmutable $postedAt = null,
        ?CarbonImmutable $effectiveAt = null,
        bool $isCorrective = false,
    ): array {
        $inspection = $this->inspectRefundJournal($refund);
        if ($inspection['status'] === 'complete') {
            return $inspection['entries'];
        }
        if ($inspection['status'] !== 'missing') {
            throw new RuntimeException($inspection['reason'] ?? 'Existing refund completion journal is inconsistent.');
        }

        $reservation = $refund->reservation;
        $owner = $reservation?->property?->owner;
        $amount = $refund->amount_minor;
        $resolvedEffectiveAt = $effectiveAt ?? $this->toImmutable($refund->gateway_processed_at);

        return $this->postJournal(
            entity: $refund,
            owner: $owner,
            entries: [
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
            ],
            postedAt: $postedAt,
            currency: $refund->currency,
            effectiveAt: $resolvedEffectiveAt,
            idempotencyKey: 'refund_completed:'.$refund->id,
            isCorrective: $isCorrective,
        );
    }

    public function recordRelocationSubsidy(PlatformRelocationSubsidy $subsidy): void
    {
        $inspection = $this->inspectEntityJournal(
            $subsidy,
            [LedgerEntryCategory::RelocationSubsidy, LedgerEntryCategory::PartnerPayable],
            $subsidy->subsidy_amount_minor,
            $subsidy->currency,
        );
        if ($inspection['status'] === 'complete') {
            return;
        }
        if ($inspection['status'] !== 'missing') {
            throw new RuntimeException($inspection['reason'] ?? 'Existing relocation subsidy journal is inconsistent.');
        }

        $amount = $subsidy->subsidy_amount_minor;

        $this->postJournal(
            entity: $subsidy,
            owner: null,
            entries: [
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
            ],
            currency: $subsidy->currency,
            effectiveAt: $this->toImmutable($subsidy->approved_at),
            idempotencyKey: 'relocation_subsidy:'.$subsidy->id,
        );
    }

    public function recordTransferReversal(ProviderTransferReversal $reversal): void
    {
        $inspection = $this->inspectTransferReversalJournal($reversal);
        if ($inspection['status'] === 'complete') {
            return;
        }
        if ($inspection['status'] !== 'missing') {
            throw new RuntimeException($inspection['reason'] ?? 'Existing transfer reversal journal is inconsistent.');
        }

        $transfer = $reversal->transfer;
        $settlement = $transfer?->settlement;
        $owner = $settlement?->owner;
        $amount = $reversal->amount_minor;

        $this->postJournal(
            entity: $reversal,
            owner: $owner,
            entries: [
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
            ],
            currency: $reversal->currency,
            effectiveAt: $this->toImmutable($reversal->processed_at),
            idempotencyKey: 'transfer_reversal:'.$reversal->id,
        );
    }

    /**
     * @param  Collection<int, FinancialLedgerEntry>  $existing
     * @return list<FinancialLedgerEntry>
     */
    private function validateExistingIdempotentJournal(
        Collection $existing,
        int $expectedLines,
        int $expectedTotalMinor,
        string $expectedCurrency,
        string $idempotencyKey,
    ): array {
        $existingDebits = (int) $existing->sum('debit_minor');
        $existingCredits = (int) $existing->sum('credit_minor');
        $currencyMismatch = $existing->contains(
            fn (FinancialLedgerEntry $entry): bool => strtoupper((string) $entry->currency) !== $expectedCurrency,
        );

        if ($existing->count() !== $expectedLines
            || $existingDebits !== $existingCredits
            || $existingDebits !== $expectedTotalMinor
            || $currencyMismatch) {
            throw new RuntimeException("Existing ledger journal for key [{$idempotencyKey}] is incomplete or inconsistent.");
        }

        /** @var list<FinancialLedgerEntry> $list */
        $list = $existing->values()->all();

        return $list;
    }

    private function toImmutable(mixed $value): ?CarbonImmutable
    {
        return $value instanceof CarbonInterface ? CarbonImmutable::instance($value) : null;
    }

    private function isUniqueConstraintViolation(QueryException $e): bool
    {
        $sqlState = (string) ($e->errorInfo[0] ?? $e->getCode());
        $driverCode = (int) ($e->errorInfo[1] ?? 0);

        return $sqlState === '23000' || $sqlState === '23505' || $driverCode === 1062 || $driverCode === 19;
    }
}
