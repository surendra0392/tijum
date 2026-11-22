<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Actions\Payments\AuditAndRepairRefundJournals;
use App\Actions\Payments\ProcessWebhookEvent;
use App\Actions\Payments\ReconcilePaymentRefund;
use App\Contracts\PaymentGateway;
use App\Enums\AdminRole;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LedgerEntryCategory;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\FinancialLedgerEntry;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class MySqlFinancialLedgerConcurrencyTest extends TestCase
{
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'mysql'
            || ! str_ends_with((string) DB::getDatabaseName(), '_test')) {
            $this->markTestSkipped('Requires an isolated MySQL database ending in _test.');
        }

        config([
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_ledger',
            'tijum.payments.razorpay.key_secret' => 'test-ledger-secret',
            'tijum.payments.razorpay.webhook_secret' => 'test-ledger-webhook',
        ]);

        $this->app->forgetInstance(PaymentGateway::class);
    }

    public function test_concurrent_refund_completion_callbacks_cannot_create_duplicate_ledger_entries_under_mysql(): void
    {
        $uniq = bin2hex(random_bytes(5));
        [$admin, $owner, , $reservation, $payment] = $this->seedMysqlFixture($uniq);
        app(FinancialLedgerService::class)->recordPaymentCaptured($payment);

        $idempKey = 'idemp_mysql_cb_'.$uniq;
        $receipt = ReservationRefund::receiptFor($idempKey);
        $refundId = 'rfnd_mysql_cb_'.$uniq;

        $refund = ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => null,
            'idempotency_key' => $idempKey,
            'amount_minor' => 25000,
            'currency' => 'INR',
            'status' => RefundStatus::Processing,
            'reason' => 'MySQL concurrent refund callback test',
            'metadata' => [
                'request_receipt' => $receipt,
                'request_payment_id' => $payment->gateway_payment_id,
                'request_mode' => 'test',
            ],
        ]);

        Http::fake([
            'https://api.razorpay.com/v1/refunds/'.$refundId => Http::response([
                'id' => $refundId,
                'entity' => 'refund',
                'payment_id' => $payment->gateway_payment_id,
                'amount' => 25000,
                'currency' => 'INR',
                'receipt' => $receipt,
                'status' => 'processed',
            ]),
        ]);

        // Hold row lock via second MySQL connection to prove serialization + single ledger posting
        $defaultConnection = DB::getDefaultConnection();
        $lockConnName = 'mysql_refund_cb_lock_'.$uniq;
        Config::set('database.connections.'.$lockConnName, Config::get('database.connections.'.$defaultConnection));
        $lockConnection = DB::connection($lockConnName);
        $lockConnection->beginTransaction();
        $lockConnection->table('reservation_refunds')->where('id', $refund->id)->lockForUpdate()->first();

        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');
        $timedOut = false;
        try {
            app(ReconcilePaymentRefund::class)->byProviderId($refundId);
        } catch (QueryException $e) {
            $timedOut = (int) ($e->errorInfo[1] ?? 0) === 1205;
        } finally {
            $lockConnection->rollBack();
            DB::purge($lockConnName);
            DB::statement('SET SESSION innodb_lock_wait_timeout = 50');
        }
        $this->assertTrue($timedOut, 'Expected concurrent refund reconciliation to serialize on InnoDB lock.');

        $raw = json_encode([
            'event' => 'refund.processed',
            'payload' => ['refund' => ['entity' => ['id' => $refundId]]],
        ], JSON_THROW_ON_ERROR);
        $sig = hash_hmac('sha256', $raw, 'test-ledger-webhook');
        $webhook = app(ProcessWebhookEvent::class);

        $this->assertSame('success', $webhook->execute($raw, $sig, eventId: 'evt_mysql_cb1_'.$uniq)['status']);
        $this->assertSame('success', $webhook->execute($raw, $sig, eventId: 'evt_mysql_cb2_'.$uniq)['status']);

        $entries = FinancialLedgerEntry::query()
            ->where('entity_type', ReservationRefund::class)
            ->where('entity_id', $refund->id)
            ->get();
        $this->assertCount(2, $entries);
        $this->assertSame(25000, (int) $entries->sum('debit_minor'));
        $this->assertSame(25000, (int) $entries->sum('credit_minor'));
    }

    public function test_concurrent_payment_capture_and_transfer_completion_journals_are_idempotent_under_mysql(): void
    {
        $uniq = bin2hex(random_bytes(5));
        [$admin, $owner, $profile, $reservation, $payment] = $this->seedMysqlFixture($uniq);
        $ledger = app(FinancialLedgerService::class);

        $settlement = PartnerSettlement::create([
            'settlement_reference' => 'TPS-MYSQL-'.$uniq,
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
            'status' => SettlementStatus::Approved,
            'approved_by_admin_id' => $admin->id,
            'approved_at' => now(),
        ]);
        PartnerSettlementItem::create([
            'partner_settlement_id' => $settlement->id,
            'reservation_id' => $reservation->id,
            'reservation_payment_id' => $payment->id,
            'item_type' => SettlementItemType::BookingPayable,
            'gross_amount_minor' => 100000,
            'commission_amount_minor' => 10000,
            'commission_tax_amount_minor' => 1800,
            'tax_deduction_minor' => 100,
            'refund_deduction_minor' => 0,
            'net_payable_minor' => 88100,
        ]);

        $transfer = ProviderTransfer::create([
            'transfer_reference' => 'TRN-MYSQL-'.$uniq,
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $payment->gateway_payment_id,
            'gateway_transfer_id' => 'trf_mysql_'.$uniq,
            'destination_account_id' => $profile->razorpay_account_id,
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_trf_mysql_'.$uniq,
            'status' => ProviderTransferStatus::Processed,
            'processed_at' => now(),
        ]);

        // Inside an outer transaction, first post via a separate connection so unique constraint collides and recovers via savepoint
        $defaultConnection = DB::getDefaultConnection();
        $workerConnName = 'mysql_ledger_worker_'.$uniq;
        Config::set('database.connections.'.$workerConnName, Config::get('database.connections.'.$defaultConnection));

        DB::beginTransaction();
        try {
            DB::setDefaultConnection($workerConnName);
            $ledger->recordPaymentCaptured($payment);
            $ledger->recordTransferCompleted($transfer);
            DB::setDefaultConnection($defaultConnection);

            // Direct postJournal using identical idempotency key inside active outer transaction triggers MySQL 23000 + savepoint recovery
            $recoveredCapture = $ledger->postJournal(
                $payment,
                $owner,
                [
                    ['category' => LedgerEntryCategory::PaymentCaptured, 'debit_minor' => $payment->amount_minor, 'credit_minor' => 0],
                    ['category' => LedgerEntryCategory::PartnerPayable, 'debit_minor' => 0, 'credit_minor' => $payment->amount_minor],
                ],
                idempotencyKey: 'payment_captured:'.$payment->id,
            );
            $this->assertCount(2, $recoveredCapture);

            $ledger->recordTransferCompleted($transfer);
            DB::commit();
        } catch (\Throwable $e) {
            DB::setDefaultConnection($defaultConnection);
            DB::rollBack();
            throw $e;
        } finally {
            DB::setDefaultConnection($defaultConnection);
            DB::purge($workerConnName);
        }

        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationPayment::class)->where('entity_id', $payment->id)->count());
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ProviderTransfer::class)->where('entity_id', $transfer->id)->count());
    }

    public function test_concurrent_historical_refund_repair_is_idempotent_under_mysql(): void
    {
        $uniq = bin2hex(random_bytes(5));
        [$admin, , , $reservation, $payment] = $this->seedMysqlFixture($uniq);
        app(FinancialLedgerService::class)->recordPaymentCaptured($payment);

        $processedAt = CarbonImmutable::parse('2026-11-10 12:00:00');
        $refundId = 'rfnd_mysql_hist_'.$uniq;
        $refund = ReservationRefund::create([
            'reservation_payment_id' => $payment->id,
            'reservation_id' => $reservation->id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => $refundId,
            'idempotency_key' => 'idemp_hist_'.$uniq,
            'amount_minor' => 30000,
            'currency' => 'INR',
            'status' => RefundStatus::Processed,
            'reason' => 'MySQL historical refund audit',
            'gateway_processed_at' => $processedAt,
        ]);

        Http::fake([
            'https://api.razorpay.com/v1/refunds/'.$refundId => Http::response([
                'id' => $refundId,
                'entity' => 'refund',
                'payment_id' => $payment->gateway_payment_id,
                'amount' => 30000,
                'currency' => 'INR',
                'status' => 'processed',
            ]),
        ]);

        $first = app(AuditAndRepairRefundJournals::class)->execute(apply: true, refundId: $refund->id);
        $this->assertSame(1, $first['repaired']);

        $firstEntry = FinancialLedgerEntry::query()
            ->where('entity_type', ReservationRefund::class)
            ->where('entity_id', $refund->id)
            ->firstOrFail();
        $firstPostedAt = $firstEntry->posted_at->toIso8601String();

        $second = app(AuditAndRepairRefundJournals::class)->execute(apply: true, refundId: $refund->id);
        $this->assertSame(0, $second['repaired']);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->where('entity_id', $refund->id)->count());
        $this->assertSame($firstPostedAt, $firstEntry->fresh()->posted_at->toIso8601String());
    }

    /**
     * @return array{0: Admin, 1: Owner, 2: OwnerFinancialProfile, 3: Reservation, 4: ReservationPayment}
     */
    private function seedMysqlFixture(string $uniq): array
    {
        $admin = Admin::factory()->create([
            'email' => "ledger_admin_{$uniq}@tijum.test",
            'role' => AdminRole::Finance,
            'is_active' => true,
            'two_factor_secret' => 'test-secret',
            'two_factor_confirmed_at' => now(),
        ]);
        $owner = $this->createActiveOwner(['email' => "ledger_owner_{$uniq}@example.com"]);
        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => "MySQL Ledger {$uniq} LLP",
            'business_constitution' => 'llp',
            'pan_number' => 'MYSQ1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => 'acc_mysql_'.$uniq,
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => 'MySQL Ledger',
            'bank_account_number_masked' => '•••• •••• 5678',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser(['email' => "ledger_user_{$uniq}@example.com"]);

        $payload = $this->validReservationPayload($property, $roomType);
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
            'gateway_order_id' => 'order_mysql_'.$uniq,
            'gateway_payment_id' => 'pay_mysql_'.$uniq,
            'idempotency_key' => 'idemp_mysql_'.$uniq,
            'amount_minor' => 100000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(5),
        ]);

        return [$admin, $owner, $profile, $reservation, $payment];
    }
}
