<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Enums\AdminRole;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\ReconciliationStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Services\Financial\FinancialReconciliationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Guntur Homestays LLP',
            'business_constitution' => 'llp',
            'pan_number' => 'GUNTU1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => 'acc_guntur_rec_001',
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
        [$owner, $profile, $settlement, $reservation, $payment] = $this->createSettlementWithProfile(100000);

        ProviderTransfer::create([
            'transfer_reference' => 'TRN-REC-001',
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'gateway' => 'razorpay',
            'gateway_transfer_id' => 'trf_rec_001',
            'destination_account_id' => 'acc_guntur_rec_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_rec_001',
            'status' => ProviderTransferStatus::Processed->value,
            'processed_at' => now(),
        ]);

        $service = app(FinancialReconciliationService::class);
        $result = $service->reconcileSettlement($settlement);

        $this->assertTrue($result['is_matched']);
        $this->assertSame(ReconciliationStatus::Matched, $result['status']);
        $this->assertSame(0, $result['discrepancy_minor']);
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
}
