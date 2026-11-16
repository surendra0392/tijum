<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Actions\Financial\ReleasePartnerSettlement;
use App\Enums\AdminRole;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class RazorpayRouteTransferTest extends TestCase
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

    private function setupApprovedSettlement(int $refundMinor = 0): array
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner();

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Vizag Coastal Homestay',
            'business_constitution' => 'individual',
            'pan_number' => 'VIZAG1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => 'acc_route_vizag_001',
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => 'K. Rama Rao',
            'bank_account_number_masked' => '•••• •••• 4321',
            'bank_ifsc' => 'SBIN0000888',
            'bank_name' => 'State Bank of India',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(4)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_vizag_001',
            'gateway_payment_id' => 'pay_vizag_001',
            'idempotency_key' => 'idemp_vizag_001',
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => $refundMinor > 0 ? PaymentStatus::PartiallyRefunded : PaymentStatus::Captured,
            'captured_at' => now()->subDays(4),
        ]);

        $netPayable = 88100 - $refundMinor;

        $settlement = PartnerSettlement::create([
            'settlement_reference' => 'TPS-2026-VIZAG001',
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $profile->id,
            'period_start' => now()->subDays(4)->toDateString(),
            'period_end' => now()->subDays(2)->toDateString(),
            'currency' => 'INR',
            'gross_booking_value_minor' => 100000,
            'commission_amount_minor' => 10000,
            'commission_tax_amount_minor' => 1800,
            'statutory_deductions_minor' => 100,
            'refund_adjustments_minor' => $refundMinor,
            'relocation_adjustments_minor' => 0,
            'other_adjustments_minor' => 0,
            'net_settlement_amount_minor' => $netPayable,
            'status' => SettlementStatus::Approved,
            'approved_by_admin_id' => $admin->id,
            'approved_at' => now(),
        ]);

        $item = PartnerSettlementItem::create([
            'partner_settlement_id' => $settlement->id,
            'reservation_id' => $reservation->id,
            'reservation_payment_id' => $payment->id,
            'item_type' => SettlementItemType::BookingPayable,
            'gross_amount_minor' => 100000,
            'commission_amount_minor' => 10000,
            'commission_tax_amount_minor' => 1800,
            'tax_deduction_minor' => 100,
            'refund_deduction_minor' => $refundMinor,
            'net_payable_minor' => $netPayable,
        ]);

        if ($refundMinor > 0) {
            ReservationRefund::create([
                'reservation_payment_id' => $payment->id,
                'reservation_id' => $reservation->id,
                'initiated_by_admin_id' => $admin->id,
                'gateway_refund_id' => 'rfnd_vizag_001',
                'idempotency_key' => 'refund_idemp_vizag_001',
                'amount_minor' => $refundMinor,
                'currency' => 'INR',
                'status' => RefundStatus::Processed,
                'reason' => 'Partial cancellation adjustment',
                'gateway_processed_at' => now()->subDay(),
            ]);
        }

        return [$admin, $settlement, $payment, $item];
    }

    public function test_transfer_to_linked_account_succeeds_and_transitions_settlement(): void
    {
        [$admin, $settlement, $payment, $item] = $this->setupApprovedSettlement();

        $action = app(ReleasePartnerSettlement::class);
        $result = $action->execute($settlement, $admin);

        $this->assertSame(SettlementStatus::Settled, $result->status);

        $this->assertDatabaseHas('provider_transfers', [
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'destination_account_id' => 'acc_route_vizag_001',
            'amount_minor' => 88100,
            'status' => ProviderTransferStatus::Processed->value,
        ]);
    }

    public function test_partially_refunded_payment_releases_net_of_refund(): void
    {
        [$admin, $settlement, $payment, $item] = $this->setupApprovedSettlement(refundMinor: 50000);

        $result = app(ReleasePartnerSettlement::class)->execute($settlement, $admin);

        $this->assertSame(SettlementStatus::Settled, $result->status);
        $this->assertDatabaseHas('provider_transfers', [
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'amount_minor' => 38100,
            'status' => ProviderTransferStatus::Processed->value,
        ]);
    }

    public function test_unapproved_settlement_cannot_be_released(): void
    {
        [$admin, $settlement, $payment, $item] = $this->setupApprovedSettlement();

        $settlement->forceFill(['status' => SettlementStatus::Draft])->save();

        $this->expectException(ValidationException::class);

        $action = app(ReleasePartnerSettlement::class);
        $action->execute($settlement, $admin);
    }

    public function test_double_transfer_is_prevented_when_balance_insufficient(): void
    {
        [$admin, $settlement, $payment, $item] = $this->setupApprovedSettlement();

        // Simulate that payment of ₹1,000 has already had ₹900 transferred
        ProviderTransfer::create([
            'transfer_reference' => 'TRN-PRIOR-001',
            'partner_settlement_id' => null,
            'reservation_payment_id' => $payment->id,
            'gateway' => 'razorpay',
            'destination_account_id' => 'acc_route_vizag_001',
            'amount_minor' => 90000,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_prior_001',
            'status' => ProviderTransferStatus::Processed->value,
        ]);

        // Item asks for 88100 (₹881), but only ₹100 is left on the payment!
        $this->expectException(ValidationException::class);

        $action = app(ReleasePartnerSettlement::class);
        $action->execute($settlement, $admin);
    }
}
