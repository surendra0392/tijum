<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Actions\Payments\ReconcilePaymentRefund;
use App\Contracts\PaymentGateway;
use App\Enums\LedgerEntryCategory;
use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use App\Models\Admin;
use App\Models\FinancialLedgerEntry;
use App\Models\NotificationDelivery;
use App\Models\Owner;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
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

        $this->assertDatabaseCount('financial_ledger_entries', 0);
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
        $this->assertDatabaseCount('financial_ledger_entries', 2);

        $partnerPayable = $entries->firstWhere('entry_category', LedgerEntryCategory::PartnerPayable);
        $refundCompleted = $entries->firstWhere('entry_category', LedgerEntryCategory::RefundCompleted);

        $this->assertNotNull($partnerPayable);
        $this->assertNotNull($refundCompleted);
        $this->assertSame($owner->id, $partnerPayable->owner_id);
        $this->assertSame($owner->id, $refundCompleted->owner_id);
        $this->assertSame($partnerPayable->journal_reference, $refundCompleted->journal_reference);
        $this->assertSame(25000, $partnerPayable->debit_minor);
        $this->assertSame(0, $partnerPayable->credit_minor);
        $this->assertSame(0, $refundCompleted->debit_minor);
        $this->assertSame(25000, $refundCompleted->credit_minor);
        $this->assertSame(25000, (int) $entries->sum('debit_minor'));
        $this->assertSame(25000, (int) $entries->sum('credit_minor'));
        $this->assertSame(PaymentStatus::Captured, $payment->fresh()->status);

        $reconciledAgain = app(ReconcilePaymentRefund::class)->byProviderId('rfnd_hist_1');

        $this->assertInstanceOf(ReservationRefund::class, $reconciledAgain);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
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
        $this->assertDatabaseCount('financial_ledger_entries', 0);

        $paymentMismatchThrew = false;
        try {
            $reconciler->byProviderId('rfnd_hist_bad_pay');
        } catch (RuntimeException) {
            $paymentMismatchThrew = true;
        }

        $this->assertTrue($paymentMismatchThrew, 'Expected payment_id mismatch on a processed refund to throw RuntimeException.');
        $this->assertSame(RefundStatus::Processed, $mismatchedPaymentRefund->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 0);

        $amountMismatchThrew = false;
        try {
            $reconciler->byProviderId('rfnd_hist_bad_amt');
        } catch (RuntimeException) {
            $amountMismatchThrew = true;
        }

        $this->assertTrue($amountMismatchThrew, 'Expected amount mismatch on a processed refund to throw RuntimeException.');
        $this->assertSame(RefundStatus::Processed, $mismatchedAmountRefund->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 0);

        $stillProcessing = $reconciler->byProviderId('rfnd_hist_processing');

        $this->assertInstanceOf(ReservationRefund::class, $stillProcessing);
        $this->assertSame(RefundStatus::Processed, $unconfirmedRefund->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
        Http::assertSentCount(4);
    }

    /**
     * @return array{0: Owner, 1: ReservationPayment, 2: ReservationRefund}
     */
    private function seedHistoricalProcessedRefund(
        string $gatewayOrderId,
        string $gatewayPaymentId,
        string $gatewayRefundId,
        int $amountMinor,
        CarbonImmutable $processedAt,
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

        $refund = ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => $gatewayRefundId,
            'idempotency_key' => 'idemp_'.$gatewayRefundId,
            'amount_minor' => $amountMinor,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'Historical processed refund without ledger journal',
            'gateway_processed_at' => $processedAt,
        ]);

        return [$owner, $payment, $refund];
    }
}
