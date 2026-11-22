<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Enums\AdminRole;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LedgerEntryCategory;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\ReconciliationStatus;
use App\Enums\RefundStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\FinancialLedgerEntry;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use App\Models\ProviderTransferReversal;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Financial\FinancialReconciliationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class FinancialReconciliationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    private function createFinanceAdmin(): Admin
    {
        return Admin::factory()->create([
            'role' => AdminRole::Finance,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_secret' => 'test-secret',
        ]);
    }

    private function createSettlementWithProfile(int $amountMinor = 100000): array
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: $amountMinor);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_rec_'.bin2hex(random_bytes(3)),
            'gateway_payment_id' => 'pay_rec_'.bin2hex(random_bytes(3)),
            'idempotency_key' => 'idemp_rec_'.bin2hex(random_bytes(3)),
            'amount_minor' => $amountMinor,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        $accountId = OwnerFinancialProfile::query()->where('razorpay_account_id', 'acc_guntur_rec_001')->exists()
            ? 'acc_guntur_rec_'.bin2hex(random_bytes(3))
            : 'acc_guntur_rec_001';

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Guntur Homestays LLP',
            'business_constitution' => 'llp',
            'pan_number' => 'GUNTU1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => $accountId,
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => 'Guntur Homestays',
            'bank_account_number_masked' => '•••• •••• 7777',
            'bank_ifsc' => 'SBIN0001234',
            'bank_name' => 'State Bank of India',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        $settlement = PartnerSettlement::create([
            'settlement_reference' => 'TPS-2026-REC-'.bin2hex(random_bytes(3)),
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $profile->id,
            'period_start' => now()->subDays(5)->toDateString(),
            'period_end' => now()->subDays(2)->toDateString(),
            'currency' => 'INR',
            'gross_booking_value_minor' => $amountMinor,
            'commission_amount_minor' => 10000,
            'commission_tax_amount_minor' => 1800,
            'statutory_deductions_minor' => 100,
            'refund_adjustments_minor' => 0,
            'relocation_adjustments_minor' => 0,
            'other_adjustments_minor' => 0,
            'net_settlement_amount_minor' => 88100,
            'status' => SettlementStatus::Settled,
            'approved_at' => now(),
            'settled_at' => now(),
        ]);

        PartnerSettlementItem::create([
            'partner_settlement_id' => $settlement->id,
            'reservation_id' => $reservation->id,
            'reservation_payment_id' => $payment->id,
            'item_type' => SettlementItemType::BookingPayable,
            'gross_amount_minor' => $amountMinor,
            'commission_amount_minor' => 10000,
            'commission_tax_amount_minor' => 1800,
            'tax_deduction_minor' => 100,
            'refund_deduction_minor' => 0,
            'net_payable_minor' => 88100,
        ]);

        return [$owner, $profile, $settlement, $reservation, $payment];
    }

    public function test_matched_settlement_reconciles_successfully(): void
    {
        Http::fake();
        [$owner, $profile, $settlement, $reservation, $payment] = $this->createSettlementWithProfile(100000);

        $transfer = ProviderTransfer::create([
            'transfer_reference' => 'TRN-REC-001',
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $payment->gateway_payment_id,
            'gateway_transfer_id' => 'trf_rec_001',
            'destination_account_id' => 'acc_guntur_rec_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_rec_001',
            'status' => ProviderTransferStatus::Processed->value,
            'processed_at' => now(),
        ]);

        app(FinancialLedgerService::class)->recordTransferCompleted($transfer);

        $service = app(FinancialReconciliationService::class);
        $result = $service->reconcileSettlement($settlement);

        $this->assertTrue($result['is_matched']);
        $this->assertSame(ReconciliationStatus::Matched, $result['status']);
        $this->assertSame(0, $result['discrepancy_minor']);
        Http::assertNothingSent();
    }

    public function test_reconciliation_detects_amount_mismatch(): void
    {
        [$owner, $profile, $settlement, $reservation, $payment] = $this->createSettlementWithProfile(100000);

        // Transfer processed only ₹80,000 instead of ₹88,100
        ProviderTransfer::create([
            'transfer_reference' => 'TRN-REC-MISMATCH',
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'gateway' => 'razorpay',
            'gateway_transfer_id' => 'trf_rec_mismatch',
            'destination_account_id' => 'acc_guntur_rec_001',
            'amount_minor' => 80000,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_rec_mismatch',
            'status' => ProviderTransferStatus::Processed->value,
            'processed_at' => now(),
        ]);

        $service = app(FinancialReconciliationService::class);
        $result = $service->reconcileSettlement($settlement);

        $this->assertFalse($result['is_matched']);
        $this->assertSame(ReconciliationStatus::AmountMismatch, $result['status']);
        $this->assertSame(8100, $result['discrepancy_minor']); // ₹81 difference
    }

    public function test_finance_admin_can_manually_resolve_exception(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile, $settlement, $reservation, $payment] = $this->createSettlementWithProfile(100000);

        $settlement->forceFill(['status' => SettlementStatus::OnHold])->save();

        $response = $this->actingAs($admin, 'admin')
            ->post(route('admin.financial-reconciliation.resolve', $settlement), [
                'notes' => 'Verified KYC offline with partner bank manager.',
            ]);

        $response->assertRedirect();
        $settlement->refresh();

        $this->assertNotNull($settlement->reconciled_at);
        $this->assertStringContainsString('Verified KYC offline', (string) $settlement->admin_notes);
    }

    public function test_reconciliation_csv_export_returns_streamed_csv(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile, $settlement, $reservation, $payment] = $this->createSettlementWithProfile(100000);

        $response = $this->actingAs($admin, 'admin')
            ->get(route('admin.financial-reconciliation.export'));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
    }

    public function test_reconciliation_detects_settled_batch_anomalies_without_initiating_provider_calls(): void
    {
        Http::fake();
        $service = app(FinancialReconciliationService::class);
        $admin = $this->createFinanceAdmin();

        // 1. Settled settlement missing any ProviderTransfer -> MissingProviderRecord
        [, , $missingTransferSettlement] = $this->createSettlementWithProfile(100000);
        $missingRes = $service->reconcileSettlement($missingTransferSettlement);
        $this->assertFalse($missingRes['is_matched']);
        $this->assertSame(ReconciliationStatus::MissingProviderRecord, $missingRes['status']);

        // 2. Partial settlement (2 payable items, only 1 transfer even if totals differed -> AmountMismatch)
        [, , $partialSettlement, $partialRes, $partialPay] = $this->createSettlementWithProfile(100000);
        $secondPayload = $this->validReservationPayload($partialRes->property, $partialRes->roomType);
        $this->submitReservation($partialRes->user, $secondPayload)->assertRedirect();
        $res2 = Reservation::query()->where('submission_token', $secondPayload['submission_token'])->firstOrFail();
        $pay2 = ReservationPayment::create([
            'reservation_id' => $res2->id,
            'user_id' => $res2->user_id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_partial_2',
            'gateway_payment_id' => 'pay_partial_2',
            'idempotency_key' => 'idemp_partial_2',
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);
        PartnerSettlementItem::create([
            'partner_settlement_id' => $partialSettlement->id,
            'reservation_id' => $res2->id,
            'reservation_payment_id' => $pay2->id,
            'item_type' => SettlementItemType::BookingPayable,
            'gross_amount_minor' => 100000,
            'commission_amount_minor' => 10000,
            'commission_tax_amount_minor' => 1800,
            'tax_deduction_minor' => 100,
            'refund_deduction_minor' => 0,
            'net_payable_minor' => 88100,
        ]);
        $partialSettlement->update(['net_settlement_amount_minor' => 176200]);
        $tPartial = ProviderTransfer::create([
            'transfer_reference' => 'TRN-PART-1',
            'partner_settlement_id' => $partialSettlement->id,
            'reservation_payment_id' => $partialPay->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $partialPay->gateway_payment_id,
            'gateway_transfer_id' => 'trf_partial_1',
            'destination_account_id' => 'acc_guntur_rec_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_partial_t1',
            'status' => ProviderTransferStatus::Processed->value,
            'processed_at' => now(),
        ]);
        app(FinancialLedgerService::class)->recordTransferCompleted($tPartial);
        $partialRec = $service->reconcileSettlement($partialSettlement);
        $this->assertSame(ReconciliationStatus::AmountMismatch, $partialRec['status']);
        $this->assertSame(88100, $partialRec['discrepancy_minor']);

        // 3. Completed transfer without ledger journal -> MissingLocalRecord
        [, , $noJournalSettlement, , $noJournalPay] = $this->createSettlementWithProfile(100000);
        ProviderTransfer::create([
            'transfer_reference' => 'TRN-NO-JRN-1',
            'partner_settlement_id' => $noJournalSettlement->id,
            'reservation_payment_id' => $noJournalPay->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $noJournalPay->gateway_payment_id,
            'gateway_transfer_id' => 'trf_no_jrn_1',
            'destination_account_id' => 'acc_guntur_rec_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_no_jrn_1',
            'status' => ProviderTransferStatus::Processed->value,
            'processed_at' => now(),
        ]);
        $noJournalRec = $service->reconcileSettlement($noJournalSettlement);
        $this->assertSame(ReconciliationStatus::MissingLocalRecord, $noJournalRec['status']);

        // 4. Historical provenance issue (null gateway_mode) -> ManualReviewRequired
        [, , $provSettlement, , $provPay] = $this->createSettlementWithProfile(100000);
        $tProv = ProviderTransfer::create([
            'transfer_reference' => 'TRN-PROV-1',
            'partner_settlement_id' => $provSettlement->id,
            'reservation_payment_id' => $provPay->id,
            'gateway' => 'razorpay',
            'gateway_mode' => null,
            'gateway_payment_id' => null,
            'gateway_transfer_id' => 'trf_prov_1',
            'destination_account_id' => 'acc_guntur_rec_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_prov_1',
            'status' => ProviderTransferStatus::Processed->value,
            'processed_at' => now(),
        ]);
        app(FinancialLedgerService::class)->recordTransferCompleted($tProv);
        $provRec = $service->reconcileSettlement($provSettlement);
        $this->assertSame(ReconciliationStatus::ManualReviewRequired, $provRec['status']);

        // 5. Late post-settlement refund exceeding settled refund_deduction_minor -> RefundMismatch
        [, , $lateRefundSettlement, $lateRefundRes, $lateRefundPay] = $this->createSettlementWithProfile(100000);
        $tLateRef = ProviderTransfer::create([
            'transfer_reference' => 'TRN-LATE-REF-1',
            'partner_settlement_id' => $lateRefundSettlement->id,
            'reservation_payment_id' => $lateRefundPay->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $lateRefundPay->gateway_payment_id,
            'gateway_transfer_id' => 'trf_late_ref_1',
            'destination_account_id' => 'acc_guntur_rec_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_late_ref_1',
            'status' => ProviderTransferStatus::Processed->value,
            'processed_at' => now(),
        ]);
        app(FinancialLedgerService::class)->recordTransferCompleted($tLateRef);
        ReservationRefund::create([
            'reservation_payment_id' => $lateRefundPay->id,
            'reservation_id' => $lateRefundRes->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_late_rec_1',
            'idempotency_key' => 'idemp_rfnd_late_rec_1',
            'amount_minor' => 30000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Post-settlement refund',
            'gateway_processed_at' => now(),
        ]);
        $lateRefundRec = $service->reconcileSettlement($lateRefundSettlement);
        $this->assertSame(ReconciliationStatus::RefundMismatch, $lateRefundRec['status']);
        $this->assertSame(30000, $lateRefundRec['discrepancy_minor']);

        // 6. Transfer reversal missing journal on settled batch -> ReversalMismatch
        [, , $revSettlement, , $revPay] = $this->createSettlementWithProfile(100000);
        $tRev = ProviderTransfer::create([
            'transfer_reference' => 'TRN-REV-REC-1',
            'partner_settlement_id' => $revSettlement->id,
            'reservation_payment_id' => $revPay->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $revPay->gateway_payment_id,
            'gateway_transfer_id' => 'trf_rev_rec_1',
            'destination_account_id' => 'acc_guntur_rec_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_rev_rec_1',
            'status' => ProviderTransferStatus::Reversed->value,
            'processed_at' => now(),
        ]);
        ProviderTransferReversal::create([
            'reversal_reference' => 'RVS-REC-1',
            'provider_transfer_id' => $tRev->id,
            'gateway_reversal_id' => 'rvsl_rec_1',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'status' => 'processed',
            'processed_at' => now(),
        ]);
        $revRec = $service->reconcileSettlement($revSettlement);
        $this->assertSame(ReconciliationStatus::ReversalMismatch, $revRec['status']);

        // 7. Duplicate ledger entries -> DuplicateTransaction
        [, , $dupSettlement, , $dupPay] = $this->createSettlementWithProfile(100000);
        $tDup = ProviderTransfer::create([
            'transfer_reference' => 'TRN-DUP-REC-1',
            'partner_settlement_id' => $dupSettlement->id,
            'reservation_payment_id' => $dupPay->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $dupPay->gateway_payment_id,
            'gateway_transfer_id' => 'trf_dup_rec_1',
            'destination_account_id' => 'acc_guntur_rec_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_dup_rec_1',
            'status' => ProviderTransferStatus::Processed->value,
            'processed_at' => now(),
        ]);
        app(FinancialLedgerService::class)->recordTransferCompleted($tDup);
        FinancialLedgerEntry::create([
            'entry_reference' => 'TLE-DUP-EXTRA-1',
            'journal_reference' => 'JRN-DUP-EXTRA-1',
            'entry_category' => LedgerEntryCategory::TransferCompleted,
            'debit_minor' => 0,
            'credit_minor' => 88100,
            'currency' => 'INR',
            'entity_type' => ProviderTransfer::class,
            'entity_id' => $tDup->id,
            'owner_id' => $dupSettlement->owner_id,
            'posted_at' => now(),
        ]);
        $dupRec = $service->reconcileSettlement($dupSettlement);
        $this->assertSame(ReconciliationStatus::DuplicateTransaction, $dupRec['status']);

        // 8. Admin reconciliation page surfaces exceptions & ledger audit without making provider calls
        $exceptions = $service->getUnreconciledExceptions();
        $this->assertGreaterThanOrEqual(7, $exceptions->count());

        $audit = $service->getLedgerAuditSummary();
        $this->assertGreaterThanOrEqual(1, $audit['unbalanced_journals_count']);
        $this->assertGreaterThanOrEqual(1, $audit['duplicate_entity_journals_count']);

        $this->actingAs($admin, 'admin')
            ->get(route('admin.financial-reconciliation.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->has('exceptions.0.expected_net_minor')
                ->has('exceptions.0.discrepancy_reason')
                ->has('exceptions.0.owner_email')
                ->has('exceptions.0.transfers_count')
                ->has('exceptions.0.reversals_count')
                ->has('ledger_audit.unbalanced_journals_count')
            );

        Http::assertNothingSent();
    }
}
