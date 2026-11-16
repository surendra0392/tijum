<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Actions\Financial\ApprovePartnerSettlement;
use App\Actions\Financial\CreatePartnerSettlement;
use App\Enums\AdminRole;
use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\CommissionAgreementStatus;
use App\Enums\CommissionBaseType;
use App\Enums\CommissionGstType;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\FinancialLedgerEntry;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerCommissionAgreement;
use App\Models\PartnerSettlement;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\SettlementCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class SettlementCalculationTest extends TestCase
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

    private function setupEligibleOwnerAndProfile(): array
    {
        $owner = $this->createActiveOwner();

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Deccan Stays Pvt Ltd',
            'business_constitution' => 'private_limited',
            'pan_number' => 'DECST1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => 'acc_test_route_123',
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => 'Deccan Stays Private Limited',
            'bank_account_number_masked' => '•••• •••• 9999',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        return [$owner, $profile];
    }

    public function test_completed_booking_becomes_eligible_after_hold_period(): void
    {
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // Booking 1: Created with valid check-in, then backdated to simulate checkout 3 days ago
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payloadPast = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payloadPast)->assertRedirect();
        $resPast = Reservation::query()->where('submission_token', $payloadPast['submission_token'])->firstOrFail();

        $resPast->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(3)->toDateString(),
        ])->save();

        ReservationPayment::create([
            'reservation_id' => $resPast->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_past_001',
            'gateway_payment_id' => 'pay_past_001',
            'idempotency_key' => 'idemp_past_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        // Booking 2: Future checkout -> not eligible yet
        $checkInFuture = CarbonImmutable::now('Asia/Kolkata')->addDays(2)->toDateString();
        $payloadFuture = $this->validReservationPayload($property, $roomType, $checkInFuture, durationQuantity: 2);
        $this->submitReservation($user, $payloadFuture)->assertRedirect();
        $resFuture = Reservation::query()->where('submission_token', $payloadFuture['submission_token'])->firstOrFail();

        $resFuture->forceFill([
            'status' => ReservationStatus::Confirmed,
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->addDays(4)->toDateString(),
        ])->save();

        ReservationPayment::create([
            'reservation_id' => $resFuture->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_future_002',
            'gateway_payment_id' => 'pay_future_002',
            'idempotency_key' => 'idemp_future_002',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now(),
        ]);

        $service = app(SettlementCalculationService::class);
        $eligible = $service->getEligibleReservations($owner);

        $this->assertCount(1, $eligible);
        $this->assertSame($resPast->id, $eligible->first()->id);
    }

    public function test_reservation_with_open_customer_case_is_excluded_from_settlement(): void
    {
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $res->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(3)->toDateString(),
        ])->save();

        ReservationPayment::create([
            'reservation_id' => $res->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_dispute_001',
            'gateway_payment_id' => 'pay_dispute_001',
            'idempotency_key' => 'idemp_dispute_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        CustomerProtectionCase::create([
            'case_reference' => 'TPC-2026-DISPUTETEST01',
            'reservation_id' => $res->id,
            'user_id' => $user->id,
            'property_id' => $property->id,
            'owner_id' => $owner->id,
            'category' => CaseCategory::SafetyConcern,
            'status' => CaseStatus::Open,
            'priority' => CasePriority::Standard,
            'description' => 'Guest reported dirty linen.',
            'sla_due_at' => now()->addDays(5),
        ]);

        $service = app(SettlementCalculationService::class);
        $eligible = $service->getEligibleReservations($owner);

        $this->assertCount(0, $eligible);
    }

    public function test_settlement_batch_generation_creates_itemized_settlement(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        // Commission agreement: 1000 bps (10%)
        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-SETTLE01',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $res->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        ReservationPayment::create([
            'reservation_id' => $res->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_settle_001',
            'gateway_payment_id' => 'pay_settle_001',
            'idempotency_key' => 'idemp_settle_001',
            'amount_minor' => 200000, // ₹2,000
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        $action = app(CreatePartnerSettlement::class);
        $settlement = $action->execute($owner, $admin);

        $this->assertInstanceOf(PartnerSettlement::class, $settlement);
        $this->assertSame(SettlementStatus::Draft, $settlement->status);
        $this->assertSame(200000, $settlement->gross_booking_value_minor);
        $this->assertSame(20000, $settlement->commission_amount_minor); // 10% = ₹200
        $this->assertSame(3600, $settlement->commission_tax_amount_minor); // 18% GST on ₹200 = ₹36
        $this->assertTrue($settlement->net_settlement_amount_minor > 0);
        $this->assertSame(1, $settlement->items()->count());
    }

    public function test_partially_refunded_payment_is_eligible_and_refund_is_deducted_from_settlement(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-REFUND01',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_settle_001',
            'gateway_payment_id' => 'pay_refund_settle_001',
            'idempotency_key' => 'idemp_refund_settle_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::PartiallyRefunded,
            'captured_at' => now()->subDays(5),
        ]);

        ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'idempotency_key' => 'refund_settle_001',
            'amount_minor' => 50000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Partial goodwill refund',
            'gateway_processed_at' => now()->subDay(),
        ]);

        $settlement = app(CreatePartnerSettlement::class)->execute($owner, $admin);

        $this->assertSame(50000, $settlement->refund_adjustments_minor);
        $this->assertSame(
            max(0, 200000 - $settlement->commission_amount_minor - $settlement->commission_tax_amount_minor - $settlement->statutory_deductions_minor - 50000),
            $settlement->net_settlement_amount_minor,
        );

        $item = $settlement->items()->firstOrFail();
        $this->assertSame($payment->id, $item->reservation_payment_id);
        $this->assertSame(50000, $item->refund_deduction_minor);
    }

    public function test_fully_refunded_reservation_is_not_eligible_for_settlement(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_full_001',
            'gateway_payment_id' => 'pay_refund_full_001',
            'idempotency_key' => 'idemp_refund_full_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::PartiallyRefunded,
            'captured_at' => now()->subDays(5),
        ]);

        ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'idempotency_key' => 'refund_full_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Full refund upon cancellation',
            'gateway_processed_at' => now()->subDay(),
        ]);

        $service = app(SettlementCalculationService::class);
        $eligible = $service->getEligibleReservations($owner);

        $this->assertTrue($eligible->isEmpty());
    }

    public function test_settlement_approval_posts_balanced_journal_with_refund_adjustment(): void
    {
        $admin = $this->createFinanceAdmin();
        [$owner, $profile] = $this->setupEligibleOwnerAndProfile();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        PartnerCommissionAgreement::create([
            'agreement_reference' => 'TCA-2026-REFUND02',
            'owner_id' => $owner->id,
            'property_id' => null,
            'commission_rate_bps' => 1000,
            'commission_base_type' => CommissionBaseType::GrossBooking,
            'commission_gst_type' => CommissionGstType::Exclusive,
            'terms_version' => '1.0',
            'status' => CommissionAgreementStatus::Active,
            'effective_from' => CarbonImmutable::now()->subDays(10),
            'accepted_at' => CarbonImmutable::now()->subDays(10),
            'accepted_by_owner_id' => $owner->id,
            'created_by_admin_id' => $admin->id,
        ]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 2);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_ledger_001',
            'gateway_payment_id' => 'pay_refund_ledger_001',
            'idempotency_key' => 'idemp_refund_ledger_001',
            'amount_minor' => 200000,
            'currency' => 'INR',
            'status' => PaymentStatus::PartiallyRefunded,
            'captured_at' => now()->subDays(5),
        ]);

        ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'idempotency_key' => 'refund_ledger_001',
            'amount_minor' => 50000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Partial goodwill refund',
            'gateway_processed_at' => now()->subDay(),
        ]);

        $settlement = app(CreatePartnerSettlement::class)->execute($owner, $admin);
        app(ApprovePartnerSettlement::class)->execute($settlement, $admin);

        $entries = FinancialLedgerEntry::query()
            ->where('entity_type', PartnerSettlement::class)
            ->where('entity_id', $settlement->id)
            ->get();

        $this->assertGreaterThan(0, $entries->count());
        $this->assertSame(
            (int) $entries->sum('debit_minor'),
            (int) $entries->sum('credit_minor'),
        );
    }

    public function test_partner_without_verified_profile_is_rejected_for_settlement_generation(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner = $this->createActiveOwner(); // No financial profile

        $this->expectException(ValidationException::class);

        $action = app(CreatePartnerSettlement::class);
        $action->execute($owner, $admin);
    }
}
