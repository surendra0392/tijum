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
                return $this->validateExistingIdempotentJournal(
                    $existing,
                    $entity,
                    $owner,
                    $entries,
                    $totalDebit,
                    $normalizedCurrency,
                    $normalizedIdempotency,
                );
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
                    return $this->validateExistingIdempotentJournal(
                        $existing,
                        $entity,
                        $owner,
                        $entries,
                        $totalDebit,
                        $normalizedCurrency,
                        $normalizedIdempotency,
                    );
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
        $amount = $payment->amount_minor;

        return $this->inspectEntityJournal(
            entity: $payment,
            expectedLegs: [
                [
                    'category' => LedgerEntryCategory::PaymentCaptured,
                    'debit_minor' => $amount,
                    'credit_minor' => 0,
                ],
                [
                    'category' => LedgerEntryCategory::PartnerPayable,
                    'debit_minor' => 0,
                    'credit_minor' => $amount,
                ],
            ],
            expectedTotalMinor: $amount,
            expectedCurrency: $payment->currency,
            expectedOwnerIdResolver: function () use ($payment): ?int {
                $payment->loadMissing('reservation.property');

                return $payment->reservation->property?->owner_id;
            },
            expectedIdempotencyKey: 'payment_captured:'.$payment->id,
        );
    }

    /**
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectSettlementApprovedJournal(PartnerSettlement $settlement): array
    {
        [$entries, $clearedPayable] = $this->settlementApprovedLegs($settlement);
        if ($clearedPayable <= 0) {
            return [
                'status' => 'complete',
                'entries' => [],
                'reason' => null,
            ];
        }

        return $this->inspectEntityJournal(
            entity: $settlement,
            expectedLegs: $entries,
            expectedTotalMinor: $clearedPayable,
            expectedCurrency: $settlement->currency,
            expectedOwnerIdResolver: static fn (): int => $settlement->owner_id,
            expectedIdempotencyKey: 'settlement_approved:'.$settlement->id,
        );
    }

    /**
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectRefundJournal(ReservationRefund $refund): array
    {
        $amount = $refund->amount_minor;

        return $this->inspectEntityJournal(
            entity: $refund,
            expectedLegs: [
                [
                    'category' => LedgerEntryCategory::PartnerPayable,
                    'debit_minor' => $amount,
                    'credit_minor' => 0,
                ],
                [
                    'category' => LedgerEntryCategory::RefundCompleted,
                    'debit_minor' => 0,
                    'credit_minor' => $amount,
                ],
            ],
            expectedTotalMinor: $amount,
            expectedCurrency: $refund->currency,
            expectedOwnerIdResolver: function () use ($refund): ?int {
                $refund->loadMissing('reservation.property');

                return $refund->reservation->property?->owner_id;
            },
            expectedIdempotencyKey: 'refund_completed:'.$refund->id,
        );
    }

    /**
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectTransferJournal(ProviderTransfer $transfer): array
    {
        $amount = $transfer->amount_minor;

        return $this->inspectEntityJournal(
            entity: $transfer,
            expectedLegs: [
                [
                    'category' => LedgerEntryCategory::TransferPending,
                    'debit_minor' => $amount,
                    'credit_minor' => 0,
                ],
                [
                    'category' => LedgerEntryCategory::TransferCompleted,
                    'debit_minor' => 0,
                    'credit_minor' => $amount,
                ],
            ],
            expectedTotalMinor: $amount,
            expectedCurrency: $transfer->currency,
            expectedOwnerIdResolver: function () use ($transfer): ?int {
                $transfer->loadMissing('settlement');

                return $transfer->settlement?->owner_id;
            },
            expectedIdempotencyKey: 'transfer_completed:'.$transfer->id,
        );
    }

    /**
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectTransferReversalJournal(ProviderTransferReversal $reversal): array
    {
        $amount = $reversal->amount_minor;

        return $this->inspectEntityJournal(
            entity: $reversal,
            expectedLegs: [
                [
                    'category' => LedgerEntryCategory::TransferCompleted,
                    'debit_minor' => $amount,
                    'credit_minor' => 0,
                ],
                [
                    'category' => LedgerEntryCategory::TransferReversal,
                    'debit_minor' => 0,
                    'credit_minor' => $amount,
                ],
            ],
            expectedTotalMinor: $amount,
            expectedCurrency: $reversal->currency,
            expectedOwnerIdResolver: function () use ($reversal): ?int {
                $reversal->loadMissing('transfer.settlement');

                return $reversal->transfer?->settlement?->owner_id;
            },
            expectedIdempotencyKey: 'transfer_reversal:'.$reversal->id,
        );
    }

    /**
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectRelocationSubsidyJournal(PlatformRelocationSubsidy $subsidy): array
    {
        $amount = $subsidy->subsidy_amount_minor;

        return $this->inspectEntityJournal(
            entity: $subsidy,
            expectedLegs: [
                [
                    'category' => LedgerEntryCategory::RelocationSubsidy,
                    'debit_minor' => $amount,
                    'credit_minor' => 0,
                ],
                [
                    'category' => LedgerEntryCategory::PartnerPayable,
                    'debit_minor' => 0,
                    'credit_minor' => $amount,
                ],
            ],
            expectedTotalMinor: $amount,
            expectedCurrency: $subsidy->currency,
            expectedOwnerIdResolver: static fn (): ?int => null,
            expectedIdempotencyKey: 'relocation_subsidy:'.$subsidy->id,
        );
    }

    /**
     * @param  list<array{category: LedgerEntryCategory, debit_minor: int, credit_minor: int, notes?: string|null}>  $expectedLegs
     * @param  (\Closure(): ?int)|null  $expectedOwnerIdResolver
     * @return array{status: 'missing'|'complete'|'incomplete'|'duplicate'|'inconsistent', entries: list<FinancialLedgerEntry>, reason: ?string}
     */
    public function inspectEntityJournal(
        Model $entity,
        array $expectedLegs,
        int $expectedTotalMinor,
        ?string $expectedCurrency = null,
        ?\Closure $expectedOwnerIdResolver = null,
        ?string $expectedIdempotencyKey = null,
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
        if ($distinctJournals > 1 || $entries->count() > count($expectedLegs)) {
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

        foreach ($expectedLegs as $expectedLeg) {
            $expectedValue = $expectedLeg['category']->value;
            if (($actualCategoryCounts[$expectedValue] ?? 0) !== 1) {
                return [
                    'status' => 'incomplete',
                    'entries' => $list,
                    'reason' => "Missing expected ledger leg [{$expectedValue}] for ".$entity::class.'#'.$entity->getKey().'.',
                ];
            }
        }

        if ($entries->count() < count($expectedLegs)) {
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

        foreach ($expectedLegs as $expectedLeg) {
            $category = $expectedLeg['category'];
            /** @var FinancialLedgerEntry|null $actualEntry */
            $actualEntry = $entries->first(
                fn (FinancialLedgerEntry $entry): bool => $entry->entry_category === $category,
            );

            if ($actualEntry === null) {
                return [
                    'status' => 'incomplete',
                    'entries' => $list,
                    'reason' => "Missing expected ledger leg [{$category->value}] for ".$entity::class.'#'.$entity->getKey().'.',
                ];
            }

            $actualDebit = (int) $actualEntry->debit_minor;
            $actualCredit = (int) $actualEntry->credit_minor;
            if (($actualDebit > 0 && $actualCredit > 0) || ($actualDebit === 0 && $actualCredit === 0)) {
                return [
                    'status' => 'inconsistent',
                    'entries' => $list,
                    'reason' => "Invalid single-sided amount on leg [{$category->value}] for ".$entity::class.'#'.$entity->getKey().'.',
                ];
            }

            if ($actualDebit !== (int) $expectedLeg['debit_minor'] || $actualCredit !== (int) $expectedLeg['credit_minor']) {
                return [
                    'status' => 'inconsistent',
                    'entries' => $list,
                    'reason' => "Ledger leg [{$category->value}] amount or direction mismatch for ".$entity::class.'#'.$entity->getKey()." (actual debit={$actualDebit}/credit={$actualCredit}, expected debit={$expectedLeg['debit_minor']}/credit={$expectedLeg['credit_minor']}).",
                ];
            }
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

        if ($expectedOwnerIdResolver !== null) {
            $expectedOwnerId = $expectedOwnerIdResolver();
            $hasOwnerMismatch = $entries->contains(
                fn (FinancialLedgerEntry $entry): bool => $entry->owner_id !== $expectedOwnerId,
            );

            if ($hasOwnerMismatch) {
                return [
                    'status' => 'inconsistent',
                    'entries' => $list,
                    'reason' => 'Ledger journal owner mismatch for '.$entity::class.'#'.$entity->getKey().'.',
                ];
            }
        }

        $nonNullKeys = $entries
            ->pluck('idempotency_key')
            ->filter(static fn (mixed $key): bool => $key !== null && $key !== '');

        if ($nonNullKeys->isNotEmpty()) {
            if ($nonNullKeys->count() !== $entries->count()
                || ($expectedIdempotencyKey !== null && $nonNullKeys->contains(static fn (mixed $key): bool => $key !== $expectedIdempotencyKey))) {
                return [
                    'status' => 'inconsistent',
                    'entries' => $list,
                    'reason' => 'Ledger journal idempotency key mismatch for '.$entity::class.'#'.$entity->getKey().'.',
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

        $payment->loadMissing('reservation.property.owner');
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
        [$entries, $clearedPayable] = $this->settlementApprovedLegs($settlement);
        if ($clearedPayable <= 0) {
            return;
        }

        $inspection = $this->inspectSettlementApprovedJournal($settlement);
        if ($inspection['status'] === 'complete') {
            return;
        }
        if ($inspection['status'] !== 'missing') {
            throw new RuntimeException($inspection['reason'] ?? 'Existing settlement approval journal is inconsistent.');
        }

        $settlement->loadMissing('owner');

        $this->postJournal(
            entity: $settlement,
            owner: $settlement->owner,
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

        $transfer->loadMissing('settlement.owner');
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

        $refund->loadMissing('reservation.property.owner');
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
        $inspection = $this->inspectRelocationSubsidyJournal($subsidy);
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

        $reversal->loadMissing('transfer.settlement.owner');
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
     * @return array{0: list<array{category: LedgerEntryCategory, debit_minor: int, credit_minor: int, notes: string}>, 1: int}
     */
    private function settlementApprovedLegs(PartnerSettlement $settlement): array
    {
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
            return [[], 0];
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

        return [$entries, $clearedPayable];
    }

    /**
     * @param  Collection<int, FinancialLedgerEntry>  $existing
     * @param  list<array{
     *     category: LedgerEntryCategory,
     *     debit_minor: int,
     *     credit_minor: int,
     *     notes?: string|null,
     * }>  $expectedEntries
     * @return list<FinancialLedgerEntry>
     */
    private function validateExistingIdempotentJournal(
        Collection $existing,
        Model $entity,
        ?Owner $owner,
        array $expectedEntries,
        int $expectedTotalMinor,
        string $expectedCurrency,
        string $idempotencyKey,
    ): array {
        $existingDebits = (int) $existing->sum('debit_minor');
        $existingCredits = (int) $existing->sum('credit_minor');
        $distinctJournals = $existing->pluck('journal_reference')->unique()->count();

        if ($existing->count() !== count($expectedEntries)
            || $distinctJournals !== 1
            || $existingDebits !== $existingCredits
            || $existingDebits !== $expectedTotalMinor) {
            throw new RuntimeException("Existing ledger journal for key [{$idempotencyKey}] is incomplete or inconsistent.");
        }

        $expectedEntityType = $entity::class;
        $expectedEntityId = (int) $entity->getKey();
        $expectedOwnerId = $owner?->id;
        $orderedExisting = $existing->values();

        foreach ($expectedEntries as $index => $expectedLeg) {
            /** @var FinancialLedgerEntry|null $actual */
            $actual = $orderedExisting->get($index);

            if ($actual === null
                || $actual->entity_type !== $expectedEntityType
                || (int) $actual->entity_id !== $expectedEntityId
                || $actual->owner_id !== $expectedOwnerId
                || strtoupper((string) $actual->currency) !== $expectedCurrency
                || $actual->entry_category !== $expectedLeg['category']
                || (int) $actual->debit_minor !== (int) $expectedLeg['debit_minor']
                || (int) $actual->credit_minor !== (int) $expectedLeg['credit_minor']
                || ($actual->line_number !== null && (int) $actual->line_number !== $index + 1)) {
                throw new RuntimeException("Existing ledger journal for key [{$idempotencyKey}] is incomplete or inconsistent.");
            }
        }

        /** @var list<FinancialLedgerEntry> $list */
        $list = $orderedExisting->all();

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
