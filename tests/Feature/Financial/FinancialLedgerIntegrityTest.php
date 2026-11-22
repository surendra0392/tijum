<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Actions\Payments\ProcessWebhookEvent;
use App\Contracts\PaymentGateway;
use App\Enums\AdminRole;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LedgerEntryCategory;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Enums\RelocationSubsidyStatus;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\FinancialLedgerEntry;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PlatformRelocationSubsidy;
use App\Models\ProviderTransfer;
use App\Models\ProviderTransferReversal;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use RuntimeException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class FinancialLedgerIntegrityTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_ledger_enforces_balance_complete_legs_and_idempotency_across_all_event_writers(): void
    {
        [$admin, $owner, $profile, $reservation, $payment] = $this->seedBookingAndPayment();
        $ledger = app(FinancialLedgerService::class);

        $invalidCases = [
            'empty' => [],
            'single_leg' => [[
                'category' => LedgerEntryCategory::PaymentCaptured,
                'debit_minor' => 10000,
                'credit_minor' => 0,
            ]],
            'zero_amount' => [
                ['category' => LedgerEntryCategory::PaymentCaptured, 'debit_minor' => 0, 'credit_minor' => 0],
                ['category' => LedgerEntryCategory::PartnerPayable, 'debit_minor' => 0, 'credit_minor' => 0],
            ],
            'negative_amount' => [
                ['category' => LedgerEntryCategory::PaymentCaptured, 'debit_minor' => -100, 'credit_minor' => 0],
                ['category' => LedgerEntryCategory::PartnerPayable, 'debit_minor' => 0, 'credit_minor' => -100],
            ],
            'dual_sided_row' => [
                ['category' => LedgerEntryCategory::PaymentCaptured, 'debit_minor' => 10000, 'credit_minor' => 5000],
                ['category' => LedgerEntryCategory::PartnerPayable, 'debit_minor' => 0, 'credit_minor' => 5000],
            ],
            'unbalanced' => [
                ['category' => LedgerEntryCategory::PaymentCaptured, 'debit_minor' => 10000, 'credit_minor' => 0],
                ['category' => LedgerEntryCategory::PartnerPayable, 'debit_minor' => 0, 'credit_minor' => 9000],
            ],
        ];

        foreach ($invalidCases as $label => $entries) {
            $rejected = false;
            try {
                $ledger->postJournal($payment, $owner, $entries, idempotencyKey: 'invalid_'.$label);
            } catch (InvalidArgumentException) {
                $rejected = true;
            }
            $this->assertTrue($rejected, "Expected invalid journal [{$label}] to be rejected.");
        }
        $this->assertDatabaseCount('financial_ledger_entries', 0);

        // 1. Payment captured writer (repeat twice)
        $ledger->recordPaymentCaptured($payment);
        $ledger->recordPaymentCaptured($payment);
        $this->assertSame('complete', $ledger->inspectPaymentCaptureJournal($payment)['status']);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationPayment::class)->where('entity_id', $payment->id)->count());

        // 2. Settlement approved writer (zero-net payable omits 0-amount TransferPending leg + repeats idempotently)
        $settlement = PartnerSettlement::create([
            'settlement_reference' => 'TPS-2026-ZERO-NET-01',
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $profile->id,
            'period_start' => now()->subDays(5)->toDateString(),
            'period_end' => now()->subDays(2)->toDateString(),
            'currency' => 'INR',
            'gross_booking_value_minor' => 100000,
            'commission_amount_minor' => 10000,
            'commission_tax_amount_minor' => 1800,
            'statutory_deductions_minor' => 100,
            'refund_adjustments_minor' => 88100,
            'relocation_adjustments_minor' => 0,
            'other_adjustments_minor' => 0,
            'net_settlement_amount_minor' => 0,
            'status' => SettlementStatus::Approved,
            'approved_by_admin_id' => $admin->id,
            'approved_at' => now(),
        ]);
        $ledger->recordSettlementApproved($settlement);
        $ledger->recordSettlementApproved($settlement);

        $settlementEntries = FinancialLedgerEntry::query()
            ->where('entity_type', PartnerSettlement::class)
            ->where('entity_id', $settlement->id)
            ->orderBy('line_number')
            ->get();
        $this->assertCount(4, $settlementEntries);
        $this->assertFalse($settlementEntries->contains('entry_category', LedgerEntryCategory::TransferPending));
        $this->assertSame([1, 2, 3, 4], $settlementEntries->pluck('line_number')->all());
        $this->assertSame($settlementEntries->sum('debit_minor'), $settlementEntries->sum('credit_minor'));

        // 3. Transfer completed writer (repeat twice)
        $transfer = ProviderTransfer::create([
            'transfer_reference' => 'TRN-2026-INT-01',
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $payment->gateway_payment_id,
            'gateway_transfer_id' => 'trf_int_001',
            'destination_account_id' => 'acc_int_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_trf_int_01',
            'status' => ProviderTransferStatus::Processed,
            'processed_at' => now(),
        ]);
        $ledger->recordTransferCompleted($transfer);
        $ledger->recordTransferCompleted($transfer);
        $this->assertSame('complete', $ledger->inspectTransferJournal($transfer)['status']);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ProviderTransfer::class)->where('entity_id', $transfer->id)->count());

        // 4. Refund completed writer (repeat twice)
        $refund = ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_int_001',
            'idempotency_key' => 'idemp_rfnd_int_001',
            'amount_minor' => 20000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Partial adjustment',
            'gateway_processed_at' => now(),
        ]);
        $ledger->recordRefundCompleted($refund);
        $ledger->recordRefundCompleted($refund);
        $this->assertSame('complete', $ledger->inspectRefundJournal($refund)['status']);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $refund->id)->count());

        // 5. Relocation subsidy writer (repeat twice)
        $subsidy = PlatformRelocationSubsidy::create([
            'subsidy_reference' => 'PRS-2026-INT-01',
            'source_reservation_id' => $reservation->id,
            'replacement_reservation_id' => $reservation->id,
            'source_amount_minor' => 100000,
            'destination_amount_minor' => 125000,
            'subsidy_amount_minor' => 25000,
            'currency' => 'INR',
            'status' => RelocationSubsidyStatus::Approved,
            'approved_by_admin_id' => $admin->id,
            'approved_at' => now(),
            'funding_reference' => 'PLATFORM_OPS_SUBSIDY',
        ]);
        $ledger->recordRelocationSubsidy($subsidy);
        $ledger->recordRelocationSubsidy($subsidy);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', PlatformRelocationSubsidy::class)->where('entity_id', $subsidy->id)->count());

        // 6. Transfer reversal writer (repeat twice)
        $reversal = ProviderTransferReversal::create([
            'reversal_reference' => 'RVS-2026-INT-01',
            'provider_transfer_id' => $transfer->id,
            'gateway_reversal_id' => 'rvsl_int_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'status' => 'processed',
            'reason' => 'Refund clawback',
            'processed_at' => now(),
        ]);
        $ledger->recordTransferReversal($reversal);
        $ledger->recordTransferReversal($reversal);
        $this->assertSame('complete', $ledger->inspectTransferReversalJournal($reversal)['status']);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ProviderTransferReversal::class)->where('entity_id', $reversal->id)->count());

        // Global debit == credit invariant
        $totalDebits = (int) FinancialLedgerEntry::query()->sum('debit_minor');
        $totalCredits = (int) FinancialLedgerEntry::query()->sum('credit_minor');
        $this->assertSame($totalDebits, $totalCredits);
    }

    public function test_ledger_detects_half_posted_and_duplicate_legacy_journals_without_double_posting(): void
    {
        [$admin, $owner, , $reservation, $payment] = $this->seedBookingAndPayment();
        $ledger = app(FinancialLedgerService::class);

        // Seed half-posted legacy payment capture (only debit PaymentCaptured leg, idempotency_key null)
        FinancialLedgerEntry::create([
            'entry_reference' => 'TLE-LEGACY-CAP-1',
            'journal_reference' => 'JRN-LEGACY-CAP-1',
            'entry_category' => LedgerEntryCategory::PaymentCaptured,
            'debit_minor' => $payment->amount_minor,
            'credit_minor' => 0,
            'currency' => 'INR',
            'entity_type' => ReservationPayment::class,
            'entity_id' => $payment->id,
            'owner_id' => $owner->id,
            'posted_at' => now()->subDays(2),
        ]);

        $this->assertSame('incomplete', $ledger->inspectPaymentCaptureJournal($payment)['status']);

        $captureFailed = false;
        try {
            $ledger->recordPaymentCaptured($payment);
        } catch (RuntimeException) {
            $captureFailed = true;
        }
        $this->assertTrue($captureFailed, 'Half-posted capture journal must halt instead of adding duplicate legs.');
        $this->assertSame(1, FinancialLedgerEntry::query()->where('entity_type', ReservationPayment::class)->where('entity_id', $payment->id)->count());

        // Seed duplicate legacy payment rows on a second payment
        $paymentDup = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $reservation->user_id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_dup_leg',
            'gateway_payment_id' => 'pay_dup_leg',
            'idempotency_key' => 'idemp_dup_leg',
            'amount_minor' => 50000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDay(),
        ]);

        foreach (['A', 'B'] as $suffix) {
            FinancialLedgerEntry::create([
                'entry_reference' => 'TLE-DUP-'.$suffix,
                'journal_reference' => 'JRN-DUP-'.$suffix,
                'entry_category' => LedgerEntryCategory::PaymentCaptured,
                'debit_minor' => 50000,
                'credit_minor' => 0,
                'currency' => 'INR',
                'entity_type' => ReservationPayment::class,
                'entity_id' => $paymentDup->id,
                'owner_id' => $owner->id,
                'posted_at' => now()->subDay(),
            ]);
            FinancialLedgerEntry::create([
                'entry_reference' => 'TLE-DUP-PP-'.$suffix,
                'journal_reference' => 'JRN-DUP-'.$suffix,
                'entry_category' => LedgerEntryCategory::PartnerPayable,
                'debit_minor' => 0,
                'credit_minor' => 50000,
                'currency' => 'INR',
                'entity_type' => ReservationPayment::class,
                'entity_id' => $paymentDup->id,
                'owner_id' => $owner->id,
                'posted_at' => now()->subDay(),
            ]);
        }

        $this->assertSame('duplicate', $ledger->inspectPaymentCaptureJournal($paymentDup)['status']);

        // Seed half-posted refund (missing PartnerPayable leg)
        $refund = ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_half_leg',
            'idempotency_key' => 'idemp_half_leg',
            'amount_minor' => 15000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Half posted refund fixture',
            'gateway_processed_at' => now()->subDay(),
        ]);
        FinancialLedgerEntry::create([
            'entry_reference' => 'TLE-LEGACY-REF-1',
            'journal_reference' => 'JRN-LEGACY-REF-1',
            'entry_category' => LedgerEntryCategory::RefundCompleted,
            'debit_minor' => 0,
            'credit_minor' => 15000,
            'currency' => 'INR',
            'entity_type' => ReservationRefund::class,
            'entity_id' => $refund->id,
            'owner_id' => $owner->id,
            'posted_at' => now()->subDay(),
        ]);

        $this->assertSame('incomplete', $ledger->inspectRefundJournal($refund)['status']);
        $refundFailed = false;
        try {
            $ledger->recordRefundCompleted($refund);
        } catch (RuntimeException) {
            $refundFailed = true;
        }
        $this->assertTrue($refundFailed, 'Half-posted refund journal must halt instead of adding duplicate legs.');
    }

    public function test_currency_and_effective_vs_posted_dates_are_preserved_without_rewriting_history(): void
    {
        [$admin, $owner, , $reservation, $payment] = $this->seedBookingAndPayment();
        $ledger = app(FinancialLedgerService::class);

        $badCurrencyRejected = false;
        try {
            $ledger->postJournal(
                $payment,
                $owner,
                [
                    ['category' => LedgerEntryCategory::PaymentCaptured, 'debit_minor' => 1000, 'credit_minor' => 0],
                    ['category' => LedgerEntryCategory::PartnerPayable, 'debit_minor' => 0, 'credit_minor' => 1000],
                ],
                currency: 'invalid',
                idempotencyKey: 'bad_currency_test',
            );
        } catch (InvalidArgumentException) {
            $badCurrencyRejected = true;
        }
        $this->assertTrue($badCurrencyRejected);

        $effectiveAt = CarbonImmutable::parse('2026-10-15 09:00:00');
        $postingTime1 = CarbonImmutable::parse('2026-11-22 07:00:00');
        CarbonImmutable::setTestNow($postingTime1);

        try {
            $refund = ReservationRefund::create([
                'reservation_payment_id' => $payment->id,
                'reservation_id' => $reservation->id,
                'initiated_by_admin_id' => $admin->id,
                'gateway_refund_id' => 'rfnd_curr_usd',
                'idempotency_key' => 'idemp_curr_usd',
                'amount_minor' => 12000,
                'currency' => 'usd',
                'status' => RefundStatus::Processed,
                'reason' => 'USD corrective refund test',
                'gateway_processed_at' => $effectiveAt,
            ]);

            $created = $ledger->recordRefundCompleted(
                $refund,
                effectiveAt: $effectiveAt,
                isCorrective: true,
            );

            $this->assertCount(2, $created);
            foreach ($created as $entry) {
                $this->assertSame('USD', $entry->currency);
                $this->assertSame($effectiveAt->toIso8601String(), $entry->effective_at?->toIso8601String());
                $this->assertSame($postingTime1->toIso8601String(), $entry->posted_at->toIso8601String());
                $this->assertTrue($entry->is_corrective);
            }

            // Re-running later must never rewrite historical posted_at or journal_reference
            CarbonImmutable::setTestNow($postingTime1->addHours(4));
            $repeated = $ledger->recordRefundCompleted($refund, effectiveAt: $effectiveAt, isCorrective: true);

            $this->assertCount(2, $repeated);
            $this->assertSame($created[0]->journal_reference, $repeated[0]->journal_reference);
            $this->assertSame($postingTime1->toIso8601String(), $repeated[0]->posted_at->toIso8601String());
            $this->assertDatabaseCount('financial_ledger_entries', 2);
        } finally {
            CarbonImmutable::setTestNow();
        }
    }

    public function test_reversal_processed_webhook_posts_transfer_reversal_journal_once(): void
    {
        config(['tijum.payments.razorpay.webhook_secret' => 'test-reversal-webhook']);
        $this->app->forgetInstance(PaymentGateway::class);

        [$admin, $owner, $profile, , $payment] = $this->seedBookingAndPayment();
        $settlement = PartnerSettlement::create([
            'settlement_reference' => 'TPS-2026-REV-01',
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $profile->id,
            'period_start' => now()->subDays(5)->toDateString(),
            'period_end' => now()->subDays(2)->toDateString(),
            'currency' => 'INR',
            'gross_booking_value_minor' => 100000,
            'commission_amount_minor' => 10000,
            'commission_tax_amount_minor' => 1800,
            'statutory_deductions_minor' => 100,
            'refund_adjustments_minor' => 0,
            'relocation_adjustments_minor' => 0,
            'other_adjustments_minor' => 0,
            'net_settlement_amount_minor' => 88100,
            'status' => SettlementStatus::Settled,
            'approved_by_admin_id' => $admin->id,
            'approved_at' => now()->subDay(),
            'settled_at' => now()->subDay(),
        ]);

        $transfer = ProviderTransfer::create([
            'transfer_reference' => 'TRN-2026-REV-01',
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $payment->gateway_payment_id,
            'gateway_transfer_id' => 'trf_rev_001',
            'destination_account_id' => 'acc_rev_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_trf_rev_01',
            'status' => ProviderTransferStatus::Processed,
            'processed_at' => now()->subDay(),
        ]);

        $reversal = ProviderTransferReversal::create([
            'reversal_reference' => 'RVS-2026-WH-01',
            'provider_transfer_id' => $transfer->id,
            'gateway_reversal_id' => 'rvsl_wh_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'status' => 'pending',
            'reason' => 'Refund clawback webhook test',
        ]);

        $raw = json_encode([
            'event' => 'reversal.processed',
            'payload' => ['reversal' => ['entity' => [
                'id' => 'rvsl_wh_001',
                'transfer_id' => 'trf_rev_001',
                'amount' => 88100,
                'currency' => 'INR',
            ]]],
        ], JSON_THROW_ON_ERROR);
        $sig = hash_hmac('sha256', $raw, 'test-reversal-webhook');
        $webhook = app(ProcessWebhookEvent::class);

        $this->assertSame('success', $webhook->execute($raw, $sig, eventId: 'evt_rvsl_1')['status']);
        $this->assertSame('success', $webhook->execute($raw, $sig, eventId: 'evt_rvsl_2')['status']);

        $this->assertSame('processed', $reversal->fresh()->status);
        $this->assertSame(ProviderTransferStatus::Reversed, $transfer->fresh()->status);
        $this->assertSame(
            2,
            FinancialLedgerEntry::query()
                ->where('entity_type', ProviderTransferReversal::class)
                ->where('entity_id', $reversal->id)
                ->count(),
        );
    }

    /**
     * @return array{0: Admin, 1: Owner, 2: OwnerFinancialProfile, 3: Reservation, 4: ReservationPayment}
     */
    private function seedBookingAndPayment(): array
    {
        $admin = Admin::factory()->create([
            'role' => AdminRole::Finance,
            'is_active' => true,
            'two_factor_secret' => 'test-secret',
            'two_factor_confirmed_at' => now(),
        ]);
        $owner = $this->createActiveOwner();
        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Ledger Integrity LLP',
            'business_constitution' => 'llp',
            'pan_number' => 'LEDGR1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => 'acc_ledger_001',
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => 'Ledger Integrity',
            'bank_account_number_masked' => '•••• •••• 1234',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_ledger_'.bin2hex(random_bytes(3)),
            'gateway_payment_id' => 'pay_ledger_'.bin2hex(random_bytes(3)),
            'idempotency_key' => 'idemp_ledger_'.bin2hex(random_bytes(3)),
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        return [$admin, $owner, $profile, $reservation, $payment];
    }
}
