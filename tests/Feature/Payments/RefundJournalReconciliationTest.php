<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Actions\Payments\AuditAndRepairRefundJournals;
use App\Actions\Payments\ProcessWebhookEvent;
use App\Actions\Payments\ReconcilePaymentRefund;
use App\Contracts\PaymentGateway;
use App\Enums\CommissionSnapshotStatus;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LedgerEntryCategory;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\FinancialLedgerEntry;
use App\Models\NotificationDelivery;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class RefundJournalReconciliationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->assertSame('sqlite', DB::getDriverName());
        $this->assertSame(':memory:', DB::getDatabaseName());

        config([
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_refund_journal',
            'tijum.payments.razorpay.key_secret' => 'test-refund-journal-secret',
            'tijum.payments.razorpay.webhook_secret' => 'test-refund-journal-webhook',
        ]);

        $this->app->forgetInstance(PaymentGateway::class);
    }

    public function test_processed_historical_refund_with_missing_journal_is_repaired_once_after_authoritative_provider_confirmation(): void
    {
        $processedAt = CarbonImmutable::parse('2026-11-10 14:30:00');
        [$owner, $payment, $refund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_hist_1',
            gatewayPaymentId: 'pay_hist_1',
            gatewayRefundId: 'rfnd_hist_1',
            amountMinor: 25000,
            processedAt: $processedAt,
        );

        $repairStartedAt = CarbonImmutable::now()->startOfSecond();

        $this->assertDatabaseCount('financial_ledger_entries', 2); // PaymentCaptured + PartnerPayable
        $deliveriesBefore = NotificationDelivery::query()->count();

        Http::fake([
            'https://api.razorpay.com/v1/refunds/rfnd_hist_1' => Http::response([
                'id' => 'rfnd_hist_1',
                'entity' => 'refund',
                'payment_id' => 'pay_hist_1',
                'amount' => 25000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
        ]);

        $reconciled = app(ReconcilePaymentRefund::class)->byProviderId('rfnd_hist_1');

        $this->assertInstanceOf(ReservationRefund::class, $reconciled);
        $this->assertSame(RefundStatus::Processed, $reconciled->status);
        $reloadedRefund = $refund->fresh();
        $this->assertNotNull($reloadedRefund);
        $this->assertNotNull($reloadedRefund->gateway_processed_at);
        $this->assertSame(
            $processedAt->toIso8601String(),
            $reloadedRefund->gateway_processed_at->toIso8601String(),
        );
        $this->assertSame($deliveriesBefore, NotificationDelivery::query()->count());

        $entries = FinancialLedgerEntry::query()
            ->where('entity_type', ReservationRefund::class)
            ->where('entity_id', $refund->id)
            ->orderBy('id')
            ->get();

        $this->assertCount(2, $entries);
        $this->assertDatabaseCount('financial_ledger_entries', 4);

        $partnerPayable = $entries->firstWhere('entry_category', LedgerEntryCategory::PartnerPayable);
        $refundCompleted = $entries->firstWhere('entry_category', LedgerEntryCategory::RefundCompleted);

        $this->assertNotNull($partnerPayable);
        $this->assertNotNull($refundCompleted);
        $this->assertSame($owner->id, $partnerPayable->owner_id);
        $this->assertSame($owner->id, $refundCompleted->owner_id);
        $this->assertSame($partnerPayable->journal_reference, $refundCompleted->journal_reference);
        $this->assertSame($processedAt->toIso8601String(), $partnerPayable->effective_at?->toIso8601String());
        $this->assertTrue($partnerPayable->is_corrective);
        $this->assertTrue($partnerPayable->posted_at->greaterThanOrEqualTo($repairStartedAt));
        $firstPostedAt = $partnerPayable->posted_at->toIso8601String();
        $this->assertSame(25000, $partnerPayable->debit_minor);
        $this->assertSame(0, $partnerPayable->credit_minor);
        $this->assertSame(0, $refundCompleted->debit_minor);
        $this->assertSame(25000, $refundCompleted->credit_minor);
        $this->assertSame(25000, (int) $entries->sum('debit_minor'));
        $this->assertSame(25000, (int) $entries->sum('credit_minor'));
        $this->assertSame(PaymentStatus::Captured, $payment->fresh()->status);

        $reconciledAgain = app(ReconcilePaymentRefund::class)->byProviderId('rfnd_hist_1');

        $this->assertInstanceOf(ReservationRefund::class, $reconciledAgain);
        $this->assertDatabaseCount('financial_ledger_entries', 4);
        $this->assertSame($firstPostedAt, $partnerPayable->fresh()->posted_at->toIso8601String());
        $reloadedRefund = $refund->fresh();
        $this->assertNotNull($reloadedRefund);
        $this->assertNotNull($reloadedRefund->gateway_processed_at);
        $this->assertSame(
            $processedAt->toIso8601String(),
            $reloadedRefund->gateway_processed_at->toIso8601String(),
        );
        $this->assertSame($deliveriesBefore, NotificationDelivery::query()->count());
        Http::assertSentCount(2);
    }

    public function test_processed_historical_refund_without_provider_confirmation_or_with_contradictory_status_does_not_post_journal(): void
    {
        $processedAt = CarbonImmutable::parse('2026-11-10 14:30:00');

        [, , $contradictoryRefund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_hist_failed',
            gatewayPaymentId: 'pay_hist_failed',
            gatewayRefundId: 'rfnd_hist_failed',
            amountMinor: 20000,
            processedAt: $processedAt,
        );
        [, , $mismatchedPaymentRefund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_hist_bad_pay',
            gatewayPaymentId: 'pay_hist_bad_pay',
            gatewayRefundId: 'rfnd_hist_bad_pay',
            amountMinor: 20000,
            processedAt: $processedAt,
        );
        [, , $mismatchedAmountRefund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_hist_bad_amt',
            gatewayPaymentId: 'pay_hist_bad_amt',
            gatewayRefundId: 'rfnd_hist_bad_amt',
            amountMinor: 20000,
            processedAt: $processedAt,
        );
        [, , $unconfirmedRefund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_hist_processing',
            gatewayPaymentId: 'pay_hist_processing',
            gatewayRefundId: 'rfnd_hist_processing',
            amountMinor: 20000,
            processedAt: $processedAt,
        );

        Http::fake([
            'https://api.razorpay.com/v1/refunds/rfnd_hist_failed' => Http::response([
                'id' => 'rfnd_hist_failed',
                'entity' => 'refund',
                'payment_id' => 'pay_hist_failed',
                'amount' => 20000,
                'currency' => 'INR',
                'status' => 'failed',
            ]),
            'https://api.razorpay.com/v1/refunds/rfnd_hist_bad_pay' => Http::response([
                'id' => 'rfnd_hist_bad_pay',
                'entity' => 'refund',
                'payment_id' => 'pay_other_mismatch',
                'amount' => 20000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
            'https://api.razorpay.com/v1/refunds/rfnd_hist_bad_amt' => Http::response([
                'id' => 'rfnd_hist_bad_amt',
                'entity' => 'refund',
                'payment_id' => 'pay_hist_bad_amt',
                'amount' => 15000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
            'https://api.razorpay.com/v1/refunds/rfnd_hist_processing' => Http::response([
                'id' => 'rfnd_hist_processing',
                'entity' => 'refund',
                'payment_id' => 'pay_hist_processing',
                'amount' => 20000,
                'currency' => 'INR',
                'status' => 'processing',
            ]),
        ]);

        $reconciler = app(ReconcilePaymentRefund::class);

        $failedThrew = false;
        try {
            $reconciler->byProviderId('rfnd_hist_failed');
        } catch (RuntimeException) {
            $failedThrew = true;
        }

        $this->assertTrue($failedThrew, 'Expected contradictory failed status on a processed refund to throw RuntimeException.');
        $this->assertSame(RefundStatus::Processed, $contradictoryRefund->fresh()->status);

        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());

        $paymentMismatchThrew = false;
        try {
            $reconciler->byProviderId('rfnd_hist_bad_pay');
        } catch (RuntimeException) {
            $paymentMismatchThrew = true;
        }

        $this->assertTrue($paymentMismatchThrew, 'Expected payment_id mismatch on a processed refund to throw RuntimeException.');
        $this->assertSame(RefundStatus::Processed, $mismatchedPaymentRefund->fresh()->status);
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());

        $amountMismatchThrew = false;
        try {
            $reconciler->byProviderId('rfnd_hist_bad_amt');
        } catch (RuntimeException) {
            $amountMismatchThrew = true;
        }

        $this->assertTrue($amountMismatchThrew, 'Expected amount mismatch on a processed refund to throw RuntimeException.');
        $this->assertSame(RefundStatus::Processed, $mismatchedAmountRefund->fresh()->status);
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());

        $stillProcessing = $reconciler->byProviderId('rfnd_hist_processing');

        $this->assertInstanceOf(ReservationRefund::class, $stillProcessing);
        $this->assertSame(RefundStatus::Processed, $unconfirmedRefund->fresh()->status);
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        Http::assertSentCount(4);
    }

    public function test_historical_refund_repair_quarantines_missing_or_inconsistent_capture_journal(): void
    {
        $processedAt = CarbonImmutable::parse('2026-11-10 14:30:00');
        [, , $missingCaptureRefund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_no_cap_jrn',
            gatewayPaymentId: 'pay_no_cap_jrn',
            gatewayRefundId: 'rfnd_no_cap_jrn',
            amountMinor: 20000,
            processedAt: $processedAt,
            seedCaptureJournal: false,
        );

        [$owner2, $halfPayment, $halfCaptureRefund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_half_cap_jrn',
            gatewayPaymentId: 'pay_half_cap_jrn',
            gatewayRefundId: 'rfnd_half_cap_jrn',
            amountMinor: 20000,
            processedAt: $processedAt,
            seedCaptureJournal: false,
        );
        // Half-posted PaymentCaptured journal (missing PartnerPayable credit leg)
        FinancialLedgerEntry::create([
            'entry_reference' => 'TLE-HALF-CAP-1',
            'journal_reference' => 'JRN-HALF-CAP-1',
            'entry_category' => LedgerEntryCategory::PaymentCaptured,
            'debit_minor' => $halfPayment->amount_minor,
            'credit_minor' => 0,
            'currency' => 'INR',
            'entity_type' => ReservationPayment::class,
            'entity_id' => $halfPayment->id,
            'owner_id' => $owner2->id,
            'posted_at' => $processedAt->subHours(2),
        ]);

        Http::fake([
            'https://api.razorpay.com/v1/refunds/rfnd_no_cap_jrn' => Http::response([
                'id' => 'rfnd_no_cap_jrn',
                'entity' => 'refund',
                'payment_id' => 'pay_no_cap_jrn',
                'amount' => 20000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
            'https://api.razorpay.com/v1/refunds/rfnd_half_cap_jrn' => Http::response([
                'id' => 'rfnd_half_cap_jrn',
                'entity' => 'refund',
                'payment_id' => 'pay_half_cap_jrn',
                'amount' => 20000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
        ]);

        $reconciler = app(ReconcilePaymentRefund::class);
        $reconciler->byProviderId('rfnd_no_cap_jrn');
        $reconciler->byProviderId('rfnd_half_cap_jrn');

        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        $this->assertNotNull($missingCaptureRefund->fresh()->metadata['accounting_quarantine'] ?? null);
        $this->assertNotNull($halfCaptureRefund->fresh()->metadata['accounting_quarantine'] ?? null);
    }

    public function test_historical_refund_repair_detects_half_posted_and_duplicate_refund_journals(): void
    {
        $processedAt = CarbonImmutable::parse('2026-11-10 14:30:00');
        [$owner1, , $halfRefund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_half_ref_jrn',
            gatewayPaymentId: 'pay_half_ref_jrn',
            gatewayRefundId: 'rfnd_half_ref_jrn',
            amountMinor: 20000,
            processedAt: $processedAt,
        );
        // Only PartnerPayable debit posted; RefundCompleted leg missing!
        FinancialLedgerEntry::create([
            'entry_reference' => 'TLE-HALF-REF-1',
            'journal_reference' => 'JRN-HALF-REF-1',
            'entry_category' => LedgerEntryCategory::PartnerPayable,
            'debit_minor' => 20000,
            'credit_minor' => 0,
            'currency' => 'INR',
            'entity_type' => ReservationRefund::class,
            'entity_id' => $halfRefund->id,
            'owner_id' => $owner1->id,
            'posted_at' => $processedAt,
        ]);

        [$owner2, , $dupRefund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_dup_ref_jrn',
            gatewayPaymentId: 'pay_dup_ref_jrn',
            gatewayRefundId: 'rfnd_dup_ref_jrn',
            amountMinor: 20000,
            processedAt: $processedAt,
        );
        foreach (['1', '2'] as $n) {
            FinancialLedgerEntry::create([
                'entry_reference' => 'TLE-DUP-REF-A'.$n,
                'journal_reference' => 'JRN-DUP-REF-'.$n,
                'entry_category' => LedgerEntryCategory::PartnerPayable,
                'debit_minor' => 20000,
                'credit_minor' => 0,
                'currency' => 'INR',
                'entity_type' => ReservationRefund::class,
                'entity_id' => $dupRefund->id,
                'owner_id' => $owner2->id,
                'posted_at' => $processedAt,
            ]);
            FinancialLedgerEntry::create([
                'entry_reference' => 'TLE-DUP-REF-B'.$n,
                'journal_reference' => 'JRN-DUP-REF-'.$n,
                'entry_category' => LedgerEntryCategory::RefundCompleted,
                'debit_minor' => 0,
                'credit_minor' => 20000,
                'currency' => 'INR',
                'entity_type' => ReservationRefund::class,
                'entity_id' => $dupRefund->id,
                'owner_id' => $owner2->id,
                'posted_at' => $processedAt,
            ]);
        }

        Http::fake([
            'https://api.razorpay.com/v1/refunds/rfnd_half_ref_jrn' => Http::response([
                'id' => 'rfnd_half_ref_jrn',
                'entity' => 'refund',
                'payment_id' => 'pay_half_ref_jrn',
                'amount' => 20000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
            'https://api.razorpay.com/v1/refunds/rfnd_dup_ref_jrn' => Http::response([
                'id' => 'rfnd_dup_ref_jrn',
                'entity' => 'refund',
                'payment_id' => 'pay_dup_ref_jrn',
                'amount' => 20000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
        ]);

        $reconciler = app(ReconcilePaymentRefund::class);
        $reconciler->byProviderId('rfnd_half_ref_jrn');
        $reconciler->byProviderId('rfnd_dup_ref_jrn');

        $this->assertSame(1, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $halfRefund->id)->count());
        $this->assertSame(4, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $dupRefund->id)->count());
        $this->assertSame('incomplete_refund_journal', $halfRefund->fresh()->metadata['accounting_quarantine']['reason'] ?? null);
        $this->assertSame('duplicate_refund_journal', $dupRefund->fresh()->metadata['accounting_quarantine']['reason'] ?? null);
    }

    public function test_already_settled_reservation_receiving_refund_does_not_silently_debit_closed_settlement(): void
    {
        $processedAt = CarbonImmutable::parse('2026-11-10 14:30:00');
        [$owner, $payment, $refund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_settled_late_ref',
            gatewayPaymentId: 'pay_settled_late_ref',
            gatewayRefundId: 'rfnd_settled_late_ref',
            amountMinor: 20000,
            processedAt: $processedAt,
        );

        $reservation = $payment->reservation->fresh();
        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'commission_status' => CommissionSnapshotStatus::Settled,
        ])->save();

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Settled Owner LLP',
            'business_constitution' => 'llp',
            'pan_number' => 'SETLD1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => 'acc_settled_late_ref',
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => 'Settled Owner',
            'bank_account_number_masked' => '•••• •••• 9999',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        $settlement = PartnerSettlement::create([
            'settlement_reference' => 'TPS-2026-CLOSED-01',
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $profile->id,
            'period_start' => now()->subDays(10)->toDateString(),
            'period_end' => now()->subDays(5)->toDateString(),
            'currency' => 'INR',
            'gross_booking_value_minor' => 50000,
            'commission_amount_minor' => 5000,
            'commission_tax_amount_minor' => 900,
            'statutory_deductions_minor' => 50,
            'refund_adjustments_minor' => 0,
            'relocation_adjustments_minor' => 0,
            'other_adjustments_minor' => 0,
            'net_settlement_amount_minor' => 44050,
            'status' => SettlementStatus::Settled,
            'settled_at' => now()->subDays(3),
        ]);

        PartnerSettlementItem::create([
            'partner_settlement_id' => $settlement->id,
            'reservation_id' => $reservation->id,
            'reservation_payment_id' => $payment->id,
            'item_type' => SettlementItemType::BookingPayable,
            'gross_amount_minor' => 50000,
            'commission_amount_minor' => 5000,
            'commission_tax_amount_minor' => 900,
            'tax_deduction_minor' => 50,
            'refund_deduction_minor' => 0,
            'net_payable_minor' => 44050,
        ]);

        Http::fake([
            'https://api.razorpay.com/v1/refunds/rfnd_settled_late_ref' => Http::response([
                'id' => 'rfnd_settled_late_ref',
                'entity' => 'refund',
                'payment_id' => 'pay_settled_late_ref',
                'amount' => 20000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
        ]);

        // Test historical repair case AND live post-settlement refund case
        app(ReconcilePaymentRefund::class)->byProviderId('rfnd_settled_late_ref');

        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $refund->id)->count());
        $this->assertSame('post_settlement_refund', $refund->fresh()->metadata['accounting_quarantine']['reason'] ?? null);
        $this->assertTrue($reservation->fresh()->requires_refund_review);
        $this->assertSame(44050, $settlement->fresh()->net_settlement_amount_minor);

        // Live transition to Processed on a settled reservation must save provider status while quarantining PartnerPayable debit
        $liveRefund = ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $refund->initiated_by_admin_id,
            'gateway_refund_id' => null,
            'idempotency_key' => 'idemp_live_after_settle',
            'amount_minor' => 10000,
            'currency' => 'INR',
            'status' => RefundStatus::Uncertain,
            'reason' => 'Live goodwill refund after settlement closed',
            'metadata' => [
                'request_receipt' => ReservationRefund::receiptFor('idemp_live_after_settle'),
                'request_payment_id' => 'pay_settled_late_ref',
                'request_mode' => 'test',
            ],
        ]);
        app(ReconcilePaymentRefund::class)->apply($liveRefund, [
            'id' => 'rfnd_live_settled_2',
            'entity' => 'refund',
            'payment_id' => 'pay_settled_late_ref',
            'amount' => 10000,
            'currency' => 'INR',
            'receipt' => ReservationRefund::receiptFor('idemp_live_after_settle'),
            'status' => 'processed',
        ]);

        $this->assertSame(RefundStatus::Processed, $liveRefund->fresh()->status);
        $this->assertSame('post_settlement_refund', $liveRefund->fresh()->metadata['accounting_quarantine']['reason'] ?? null);
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $liveRefund->id)->count());
    }

    public function test_audit_refund_journals_command_supports_dry_run_before_apply_and_is_idempotent(): void
    {
        $processedAt = CarbonImmutable::parse('2026-11-10 14:30:00');
        [, , $repairable] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_cmd_ok',
            gatewayPaymentId: 'pay_cmd_ok',
            gatewayRefundId: 'rfnd_cmd_ok',
            amountMinor: 20000,
            processedAt: $processedAt,
            seedCaptureJournal: true,
        );
        [, , $quarantined] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_cmd_bad',
            gatewayPaymentId: 'pay_cmd_bad',
            gatewayRefundId: 'rfnd_cmd_bad',
            amountMinor: 15000,
            processedAt: $processedAt,
            seedCaptureJournal: false,
        );

        Http::fake([
            'https://api.razorpay.com/v1/refunds/rfnd_cmd_ok' => Http::response([
                'id' => 'rfnd_cmd_ok',
                'entity' => 'refund',
                'payment_id' => 'pay_cmd_ok',
                'amount' => 20000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
            'https://api.razorpay.com/v1/refunds/rfnd_cmd_bad' => Http::response([
                'id' => 'rfnd_cmd_bad',
                'entity' => 'refund',
                'payment_id' => 'pay_cmd_bad',
                'amount' => 15000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
        ]);

        // 1. Dry-run makes zero ledger writes
        $dryReport = app(AuditAndRepairRefundJournals::class)->execute(apply: false);
        $this->assertSame(1, $dryReport['repairable']);
        $this->assertGreaterThanOrEqual(1, $dryReport['quarantined']);
        $this->assertSame(0, $dryReport['repaired']);
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());

        $this->artisan('tijum:audit-refund-journals')->assertSuccessful();
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());

        // 2. Apply repairs only the prerequisite-clean refund and quarantines the missing-capture refund
        $this->artisan('tijum:audit-refund-journals --apply')->assertSuccessful();
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $repairable->id)->count());
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $quarantined->id)->count());
        $this->assertSame('missing_capture_journal', $quarantined->fresh()->metadata['accounting_quarantine']['reason'] ?? null);

        // 3. Re-running --apply creates zero duplicates
        $secondReport = app(AuditAndRepairRefundJournals::class)->execute(apply: true);
        $this->assertSame(0, $secondReport['repaired']);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $repairable->id)->count());
    }

    public function test_two_concurrent_refund_completion_callbacks_post_exactly_one_journal(): void
    {
        $processedAt = CarbonImmutable::parse('2026-11-10 14:30:00');
        [, $payment, $refund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_cb_race',
            gatewayPaymentId: 'pay_cb_race',
            gatewayRefundId: null,
            amountMinor: 20000,
            processedAt: $processedAt,
            seedCaptureJournal: true,
        );

        $receipt = ReservationRefund::receiptFor('idemp_cb_race');
        $refund->forceFill([
            'idempotency_key' => 'idemp_cb_race',
            'status' => RefundStatus::Processing,
            'gateway_processed_at' => null,
            'metadata' => [
                'request_receipt' => $receipt,
                'request_payment_id' => 'pay_cb_race',
                'request_mode' => 'test',
            ],
        ])->save();

        Http::fake([
            'https://api.razorpay.com/v1/refunds/rfnd_cb_race_1' => Http::response([
                'id' => 'rfnd_cb_race_1',
                'entity' => 'refund',
                'payment_id' => 'pay_cb_race',
                'amount' => 20000,
                'currency' => 'INR',
                'receipt' => $receipt,
                'status' => 'processed',
            ]),
        ]);

        $raw = json_encode([
            'event' => 'refund.processed',
            'payload' => ['refund' => ['entity' => ['id' => 'rfnd_cb_race_1']]],
        ], JSON_THROW_ON_ERROR);
        $sig = hash_hmac('sha256', $raw, 'test-refund-journal-webhook');
        $webhook = app(ProcessWebhookEvent::class);

        $this->assertSame('success', $webhook->execute($raw, $sig, eventId: 'evt_cb_race_1')['status']);
        $this->assertSame('success', $webhook->execute($raw, $sig, eventId: 'evt_cb_race_2')['status']);

        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $refund->id)->count());
        $this->assertSame(PaymentStatus::PartiallyRefunded, $payment->fresh()->status);
    }

    public function test_newly_processed_refund_quarantines_when_parent_capture_journal_is_missing(): void
    {
        $processedAt = CarbonImmutable::parse('2026-11-10 14:30:00');
        [, $payment, $refund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_new_ref_no_cap',
            gatewayPaymentId: 'pay_new_ref_no_cap',
            gatewayRefundId: null,
            amountMinor: 20000,
            processedAt: $processedAt,
            seedCaptureJournal: false,
        );

        $receipt = ReservationRefund::receiptFor('idemp_new_ref_no_cap');
        $refund->forceFill([
            'idempotency_key' => 'idemp_new_ref_no_cap',
            'status' => RefundStatus::Processing,
            'gateway_processed_at' => null,
            'metadata' => [
                'request_receipt' => $receipt,
                'request_payment_id' => 'pay_new_ref_no_cap',
                'request_mode' => 'test',
            ],
        ])->save();

        $reconciled = app(ReconcilePaymentRefund::class)->apply($refund, [
            'id' => 'rfnd_new_no_cap_1',
            'entity' => 'refund',
            'payment_id' => 'pay_new_ref_no_cap',
            'amount' => 20000,
            'currency' => 'INR',
            'receipt' => $receipt,
            'status' => 'processed',
        ]);

        $this->assertSame(RefundStatus::Processed, $reconciled->status);
        $this->assertSame(
            0,
            FinancialLedgerEntry::query()
                ->where('entity_type', ReservationRefund::class)
                ->where('entity_id', $refund->id)
                ->count(),
        );
        $this->assertDatabaseCount('financial_ledger_entries', 0);
        $this->assertSame(
            'missing_capture_journal',
            $refund->fresh()->metadata['accounting_quarantine']['reason'] ?? null,
        );
        $this->assertTrue($payment->reservation->fresh()->requires_refund_review);
    }

    public function test_audit_quarantines_complete_refund_journal_when_parent_capture_journal_is_missing_or_corrupt(): void
    {
        $processedAt = CarbonImmutable::parse('2026-11-10 14:30:00');
        [, $payment, $refund] = $this->seedHistoricalProcessedRefund(
            gatewayOrderId: 'order_comp_ref_no_cap',
            gatewayPaymentId: 'pay_comp_ref_no_cap',
            gatewayRefundId: 'rfnd_comp_ref_no_cap',
            amountMinor: 20000,
            processedAt: $processedAt,
            seedCaptureJournal: false,
        );

        // Post a complete 2-leg refund journal directly while parent capture journal is missing
        app(FinancialLedgerService::class)->recordRefundCompleted($refund);
        $this->assertSame(
            'complete',
            app(FinancialLedgerService::class)->inspectRefundJournal($refund)['status'],
        );
        $this->assertSame(
            'missing',
            app(FinancialLedgerService::class)->inspectPaymentCaptureJournal($payment)['status'],
        );

        $report = app(AuditAndRepairRefundJournals::class)->execute(apply: false);

        $this->assertSame(0, $report['complete']);
        $this->assertSame(1, $report['quarantined']);
        $this->assertSame($refund->id, $report['items'][0]['refund_id']);
        $this->assertSame('missing_capture_journal', $report['items'][0]['reason']);
    }

    /**
     * @return array{0: Owner, 1: ReservationPayment, 2: ReservationRefund}
     */
    private function seedHistoricalProcessedRefund(
        string $gatewayOrderId,
        string $gatewayPaymentId,
        ?string $gatewayRefundId,
        int $amountMinor,
        CarbonImmutable $processedAt,
        bool $seedCaptureJournal = true,
    ): array {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();
        $admin = Admin::factory()->superAdmin()->create();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => $gatewayOrderId,
            'gateway_payment_id' => $gatewayPaymentId,
            'amount_minor' => 50000,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_'.$gatewayPaymentId,
            'status' => PaymentStatus::Captured,
            'captured_at' => $processedAt->subHours(2),
        ]);

        if ($seedCaptureJournal) {
            app(FinancialLedgerService::class)->recordPaymentCaptured($payment);
        }

        $refund = ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => $gatewayRefundId,
            'idempotency_key' => 'idemp_'.($gatewayRefundId ?? $gatewayPaymentId),
            'amount_minor' => $amountMinor,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Historical processed refund without ledger journal',
            'gateway_processed_at' => $processedAt,
        ]);

        return [$owner, $payment, $refund];
    }
}
