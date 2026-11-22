<?php

declare(strict_types=1);

namespace Tests\Feature\Payments;

use App\Actions\Payments\InitiateAdminRefund;
use App\Actions\Payments\ProcessWebhookEvent;
use App\Actions\Payments\ReconcilePaymentRefund;
use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProviderTransferStatus;
use App\Enums\RefundStatus;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\FinancialLedgerEntry;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRefund;
use App\Services\Financial\FinancialLedgerService;
use App\Services\Financial\SettlementCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use RuntimeException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class AdminRefundTest extends TestCase
{
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->assertSame('sqlite', DB::getDriverName());
        $this->assertSame(':memory:', DB::getDatabaseName());
        $this->artisan('migrate', ['--force' => true])->assertSuccessful();

        config([
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_refunds',
            'tijum.payments.razorpay.key_secret' => 'test-refund-key',
            'tijum.payments.razorpay.webhook_secret' => 'test-refund-webhook',
        ]);
    }

    protected function createSuperAdmin(): Admin
    {
        $admin = new Admin;
        $admin->forceFill([
            'name' => 'Operations Admin',
            'email' => 'admin_test@tijum.test',
            'password' => bcrypt('AdminSecret123!'),
            'role' => 'super_admin',
            'is_active' => true,
            'two_factor_secret' => 'test-2fa-secret',
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $admin;
    }

    public function test_admin_can_process_partial_and_full_refund(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();
        $admin = $this->createSuperAdmin();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_101',
            'gateway_payment_id' => 'pay_refund_101',
            'amount_minor' => 100000, // ₹1,000
            'currency' => 'INR',
            'idempotency_key' => 'idemp_refund_101',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ])->save();

        app(FinancialLedgerService::class)->recordPaymentCaptured($payment);

        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_101/refund' => fn (Request $request) => Http::response([
                'id' => $request['amount'] === 40000 ? 'rfnd_part_001' : 'rfnd_full_002',
                'entity' => 'refund',
                'amount' => $request['amount'],
                'currency' => 'INR',
                'payment_id' => 'pay_refund_101',
                'receipt' => $request['receipt'],
                'status' => 'processed',
            ]),
        ]);

        // 1. Partial refund of ₹400 (40,000 paise).
        $response1 = $this->actingAs($admin, 'admin')
            ->post(route('admin.payments.refund', $payment->id), [
                'amount_minor' => 40000,
                'reason' => 'Customer requested partial cancellation allowance',
                'idempotency_key' => 'refund-partial-101',
            ]);

        $response1->assertRedirect();

        $payment->refresh();
        $this->assertSame(40000, $payment->refunded_amount_minor);
        $this->assertSame(PaymentStatus::PartiallyRefunded, $payment->status);
        $this->assertSame(60000, $payment->refundableBalanceMinor());

        $this->assertDatabaseHas('reservation_refunds', [
            'reservation_payment_id' => $payment->id,
            'gateway_refund_id' => 'rfnd_part_001',
            'amount_minor' => 40000,
            'status' => RefundStatus::Processed->value,
            'initiated_by_admin_id' => $admin->id,
        ]);

        // 2. Full remaining refund of ₹600 (60,000 paise).
        $response2 = $this->actingAs($admin, 'admin')
            ->post(route('admin.payments.refund', $payment->id), [
                'amount_minor' => 60000,
                'reason' => 'Remaining balance refund',
                'idempotency_key' => 'refund-full-102',
            ]);

        $response2->assertRedirect();

        $payment->refresh();
        $this->assertSame(100000, $payment->refunded_amount_minor);
        $this->assertSame(PaymentStatus::Refunded, $payment->status);
        $this->assertSame(0, $payment->refundableBalanceMinor());
    }

    public function test_prevents_refunding_more_than_available_balance(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();
        $admin = $this->createSuperAdmin();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_exceed',
            'gateway_payment_id' => 'pay_refund_exceed',
            'amount_minor' => 50000,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_refund_exceed',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ])->save();

        $this->actingAs($admin, 'admin')
            ->post(route('admin.payments.refund', $payment->id), [
                'amount_minor' => 999999, // Exceeds 50000
                'reason' => 'Excess refund attempt',
                'idempotency_key' => 'refund-exceed-001',
            ])
            ->assertSessionHasErrors('amount');
    }

    public function test_repeated_admin_submission_only_creates_one_refund(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refund' => fn (Request $request) => Http::response($this->refundEntity($request['receipt'], 'processed')),
        ]);

        $requestData = [
            'amount_minor' => 20000,
            'reason' => 'Verified partial cancellation',
            'idempotency_key' => 'refund-repeat-001',
        ];
        $this->actingAs($admin, 'admin')
            ->post(route('admin.payments.refund', $payment), $requestData)
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->post(route('admin.payments.refund', $payment), $requestData)
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        Http::assertSentCount(1);
        Http::assertSent(fn (Request $request): bool => $request->hasHeader('X-Refund-Idempotency'));
        $this->assertDatabaseCount('reservation_refunds', 1);
        $this->assertSame(20000, $payment->fresh()->totalRefundedAmount());
    }

    public function test_timeout_preserves_reserved_refund_and_reconciliation_completes_it_once(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        $providerRefund = [];
        $dispatches = 0;

        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refund' => function (Request $request) use (&$providerRefund, &$dispatches) {
                $dispatches++;
                $providerRefund = $this->refundEntity($request['receipt'], 'processed');

                return Http::failedConnection('Refund accepted before connection was lost.');
            },
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refunds*' => function () use (&$providerRefund) {
                return Http::response(['items' => [$providerRefund]]);
            },
        ]);

        $action = app(InitiateAdminRefund::class);
        $attempt = $action->execute($payment, $admin, 20000, 'Verified partial cancellation', 'refund-timeout-fixture');
        $this->assertSame('uncertain', $attempt->status->value);
        $this->assertSame(30000, $payment->fresh()->remainingRefundableAmount());
        $this->assertSame(1, $dispatches);
        $this->assertSame($attempt->id, $action->execute($payment, $admin, 20000, 'Verified partial cancellation', 'refund-timeout-fixture')->id);

        try {
            $action->execute($payment, $admin, 20000, 'Another request for the same payment', 'refund-fresh-key');
            $this->fail('An unresolved refund must block a new intent.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('amount', $exception->errors());
        }

        $this->artisan('tijum:reconcile-refunds')->assertSuccessful();
        $this->assertSame(RefundStatus::Processed, $attempt->fresh()->status);
        $this->assertSame(1, $dispatches);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        $this->assertDatabaseCount('financial_ledger_entries', 4);
    }

    public function test_refund_webhook_replays_unmatched_event_and_does_not_double_post(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        $providerRefund = $this->refundEntity(null, 'pending');
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refund' => function (Request $request) use (&$providerRefund) {
                $providerRefund['receipt'] = $request['receipt'];

                return Http::response($providerRefund);
            },
            'https://api.razorpay.com/v1/refunds/rfnd_live_fixture' => function () use (&$providerRefund) {
                return Http::response($providerRefund);
            },
        ]);

        $raw = json_encode(['event' => 'refund.processed', 'payload' => ['refund' => ['entity' => ['id' => 'rfnd_live_fixture']]]], JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $raw, 'test-refund-webhook');
        $webhook = app(ProcessWebhookEvent::class);

        $this->assertSame('unresolved', $webhook->execute($raw, $signature, eventId: 'evt_refund_late')['status']);
        app(InitiateAdminRefund::class)->execute($payment, $admin, 20000, 'Verified partial cancellation', 'refund-webhook-fixture');
        $providerRefund['status'] = 'processed';
        $this->assertSame('success', $webhook->execute($raw, $signature, eventId: 'evt_refund_late')['status']);
        $webhook->execute($raw, $signature, eventId: 'evt_refund_second');
        $this->assertSame(PaymentStatus::PartiallyRefunded, $payment->fresh()->status);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        $this->assertDatabaseCount('financial_ledger_entries', 4);
    }

    public function test_refund_called_in_a_transaction_dispatches_only_after_commit(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refund' => fn (Request $request) => Http::response($this->refundEntity($request['receipt'], 'processed')),
        ]);
        $action = app(InitiateAdminRefund::class);

        DB::beginTransaction();
        $discarded = $action->execute($payment, $admin, 20000, 'Refund with rolled back booking change', 'refund-rolled-back-key');
        Http::assertNothingSent();
        DB::rollBack();

        $this->assertNull(ReservationRefund::query()->find($discarded->id));
        Http::assertNothingSent();

        DB::beginTransaction();
        $saved = $action->execute($payment, $admin, 20000, 'Refund with committed booking change', 'refund-committed-key');
        $this->assertSame(RefundStatus::Uncertain, $saved->status);
        Http::assertNothingSent();
        DB::commit();

        Http::assertSentCount(1);
        $this->assertSame(RefundStatus::Processed, $saved->fresh()->status);
    }

    public function test_mismatched_refund_response_is_not_recorded_as_processed(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refund' => function (Request $request) {
                $response = $this->refundEntity($request['receipt'], 'processed');
                $response['payment_id'] = 'pay_wrong_refund';

                return Http::response($response);
            },
        ]);

        $refund = app(InitiateAdminRefund::class)->execute(
            $payment,
            $admin,
            20000,
            'Verified partial cancellation',
            'refund-mismatched-001',
        );

        $this->assertSame(RefundStatus::Uncertain, $refund->status);
        $this->assertNull($refund->gateway_refund_id);
        $this->assertSame(30000, $payment->fresh()->remainingRefundableAmount());
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_definitive_provider_failure_releases_balance_for_an_explicit_new_intent(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        $dispatches = 0;
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refund' => function (Request $request) use (&$dispatches) {
                $dispatches++;
                $response = $this->refundEntity($request['receipt'], $dispatches === 1 ? 'failed' : 'processed');
                $response['id'] = 'rfnd_fixture_'.$dispatches;

                return Http::response($response);
            },
        ]);
        $action = app(InitiateAdminRefund::class);

        $failed = $action->execute($payment, $admin, 20000, 'Verified partial cancellation', 'refund-first-fixture');
        $this->assertSame(RefundStatus::Failed, $failed->status);
        $this->assertSame(50000, $payment->fresh()->remainingRefundableAmount());
        $this->assertSame(PaymentStatus::Captured, $payment->fresh()->status);
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        $this->assertDatabaseCount('financial_ledger_entries', 2);

        $this->assertSame($failed->id, $action->execute($payment, $admin, 20000, 'Verified partial cancellation', 'refund-first-fixture')->id);
        $this->assertSame(1, $dispatches);

        $second = $action->execute($payment, $admin, 20000, 'Verified partial cancellation', 'refund-second-fixture');
        $this->assertSame(RefundStatus::Processed, $second->status);
        $this->assertSame(2, $dispatches);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        $this->assertDatabaseCount('financial_ledger_entries', 4);
    }

    public function test_legacy_failed_refund_without_gateway_id_reconciles_through_processing_to_processed(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        $idempotencyKey = 'legacy-failed-no-gateway-id';
        $receipt = ReservationRefund::receiptFor($idempotencyKey);

        $refund = $payment->refunds()->create([
            'reservation_id' => $payment->reservation_id,
            'initiated_by_admin_id' => $admin->id,
            'idempotency_key' => $idempotencyKey,
            'amount_minor' => 20000,
            'currency' => 'INR',
            'status' => RefundStatus::Failed,
            'reason' => 'Previous network timeout after provider acceptance',
            'failure_reason' => 'Connection timed out',
            'metadata' => [
                'request_receipt' => $receipt,
                'request_payment_id' => 'pay_refund_fixture',
                'request_mode' => 'test',
            ],
        ]);

        $providerStatus = 'pending';
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refunds*' => function () use ($receipt, &$providerStatus) {
                return Http::response(['items' => [$this->refundEntity($receipt, $providerStatus)]]);
            },
            'https://api.razorpay.com/v1/refunds/rfnd_live_fixture' => function () use ($receipt, &$providerStatus) {
                return Http::response($this->refundEntity($receipt, $providerStatus));
            },
        ]);

        $this->artisan('tijum:reconcile-refunds')->assertExitCode(1);

        $refund->refresh();
        $this->assertSame(RefundStatus::Processing, $refund->status);
        $this->assertSame('rfnd_live_fixture', $refund->gateway_refund_id);
        $this->assertNull($refund->failure_reason);
        $this->assertSame(PaymentStatus::RefundPending, $payment->fresh()->status);

        $providerStatus = 'processed';
        $this->artisan('tijum:reconcile-refunds')->assertSuccessful();

        $this->assertSame(RefundStatus::Processed, $refund->fresh()->status);
        $this->assertSame(PaymentStatus::PartiallyRefunded, $payment->fresh()->status);
        $this->assertSame(2, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        $this->assertDatabaseCount('financial_ledger_entries', 4);
    }

    public function test_definitive_failed_refund_rejects_contradictory_processed_response(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        $refund = $payment->refunds()->create([
            'reservation_id' => $payment->reservation_id,
            'initiated_by_admin_id' => $admin->id,
            'gateway_refund_id' => 'rfnd_live_fixture',
            'idempotency_key' => 'definitive-failed-refund',
            'amount_minor' => 20000,
            'currency' => 'INR',
            'status' => RefundStatus::Failed,
            'reason' => 'Cancelled booking',
            'failure_reason' => 'Razorpay reported that the refund failed.',
        ]);

        $rejected = false;
        try {
            app(ReconcilePaymentRefund::class)->apply($refund, $this->refundEntity(null, 'processed'));
        } catch (RuntimeException) {
            $rejected = true;
        }

        $this->assertTrue($rejected, 'Expected definitively failed refund to reject processed transition.');
        $this->assertSame(RefundStatus::Failed, $refund->fresh()->status);
        $this->assertSame(PaymentStatus::Captured, $payment->fresh()->status);
        $this->assertSame(0, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_uncertain_refund_excludes_reservation_from_settlement_and_disables_admin_refund_form(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        $reservation = $payment->reservation->fresh();
        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(5)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(3)->toDateString(),
        ])->save();

        $owner = $reservation->property->owner;
        $settlements = app(SettlementCalculationService::class);
        $this->assertContains($reservation->id, $settlements->getEligibleReservations($owner)->pluck('id')->all());

        $attempt = 0;
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refund' => function (Request $request) use (&$attempt) {
                $attempt++;
                if ($attempt === 1) {
                    $entity = $this->refundEntity($request['receipt'], 'processed');
                    $entity['amount'] = 10000;
                    $entity['id'] = 'rfnd_partial_ok';

                    return Http::response($entity);
                }

                return Http::failedConnection('Timeout after Razorpay accepted second partial refund.');
            },
        ]);

        $action = app(InitiateAdminRefund::class);
        $first = $action->execute($payment, $admin, 10000, 'First verified partial refund', 'refund-partial-first');
        $this->assertSame(RefundStatus::Processed, $first->status);

        $uncertain = $action->execute($payment->fresh(), $admin, 10000, 'Second partial refund timed out', 'refund-partial-second');
        $this->assertSame(RefundStatus::Uncertain, $uncertain->status);
        $this->assertSame(PaymentStatus::PartiallyRefunded, $payment->fresh()->status);

        $this->assertNotContains($reservation->id, $settlements->getEligibleReservations($owner)->pluck('id')->all());

        $this->actingAs($admin, 'admin')
            ->get(route('admin.payments.show', $payment))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page): AssertableInertia => $page
                ->where('payment.has_unresolved_refund', true)
                ->where('payment.can_refund', false)
            );
    }

    public function test_remaining_refundable_amount_subtracts_active_provider_transfers(): void
    {
        $payment = $this->createCapturedPayment();

        ProviderTransfer::create([
            'transfer_reference' => 'PTR-REFUND-CHECK-1',
            'reservation_payment_id' => $payment->id,
            'gateway' => 'razorpay',
            'gateway_mode' => 'test',
            'gateway_payment_id' => $payment->gateway_payment_id,
            'gateway_transfer_id' => 'trf_refund_check_1',
            'destination_account_id' => 'acc_test_owner',
            'amount_minor' => 35000,
            'currency' => 'INR',
            'idempotency_key' => 'trf-idemp-refund-check-1',
            'status' => ProviderTransferStatus::Processed,
        ]);

        $freshPayment = $payment->fresh();
        $this->assertSame(15000, $freshPayment->remainingRefundableAmount());
        $this->assertSame(15000, $freshPayment->refundableBalanceMinor());
    }

    public function test_refund_requires_a_non_blank_explicit_idempotency_key(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();

        Http::preventStrayRequests();
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refund' => fn (Request $request) => Http::response($this->refundEntity($request['receipt'], 'processed')),
        ]);

        $invalidHttpPayloads = [
            ['amount_minor' => 20000, 'reason' => 'Verified partial cancellation'],
            ['amount_minor' => 20000, 'reason' => 'Verified partial cancellation', 'idempotency_key' => ''],
            ['amount_minor' => 20000, 'reason' => 'Verified partial cancellation', 'idempotency_key' => '   '],
        ];

        foreach ($invalidHttpPayloads as $payload) {
            $this->actingAs($admin, 'admin')
                ->post(route('admin.payments.refund', $payment), $payload)
                ->assertSessionHasErrors('idempotency_key');
        }

        $this->actingAs($admin, 'admin')
            ->post(
                route('admin.payments.refund', $payment),
                ['amount_minor' => 20000, 'reason' => 'Verified partial cancellation'],
                ['Idempotency-Key' => '   '],
            )
            ->assertSessionHasErrors('idempotency_key');

        $action = app(InitiateAdminRefund::class);
        foreach ([null, '', '   ', str_repeat('a', 65)] as $invalidKey) {
            $rejected = false;

            try {
                $action->execute($payment, $admin, 20000, 'Verified partial cancellation', $invalidKey);
            } catch (ValidationException $exception) {
                $rejected = array_key_exists('idempotency_key', $exception->errors());
            }

            $this->assertTrue($rejected, 'Expected direct refund execution to reject invalid idempotency_key.');
        }

        Http::assertNothingSent();
        $this->assertDatabaseCount('reservation_refunds', 0);

        $this->actingAs($admin, 'admin')
            ->post(
                route('admin.payments.refund', $payment),
                ['amount_minor' => 20000, 'reason' => 'Refund using Idempotency-Key header'],
                ['Idempotency-Key' => 'refund-header-fallback-001'],
            )
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->actingAs($admin, 'admin')
            ->post(
                route('admin.payments.refund', $payment),
                ['amount_minor' => 20000, 'reason' => 'Refund using Idempotency-Key header'],
                ['Idempotency-Key' => 'refund-header-fallback-001'],
            )
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        Http::assertSentCount(1);
        $this->assertDatabaseCount('reservation_refunds', 1);
        $this->assertSame(20000, $payment->fresh()->totalRefundedAmount());
    }

    public function test_two_independent_refunds_with_same_amount_and_reason_succeed_with_distinct_keys(): void
    {
        $payment = $this->createCapturedPayment();
        $admin = $this->createSuperAdmin();
        $reservation = $payment->reservation->fresh();
        $case = CustomerProtectionCase::create([
            'case_reference' => 'TPC-2026-REFUNDCASE01',
            'reservation_id' => $reservation->id,
            'user_id' => $reservation->user_id,
            'property_id' => $reservation->property_id,
            'owner_id' => $reservation->property->owner_id,
            'category' => CaseCategory::RefundRequest,
            'status' => CaseStatus::RefundReview,
            'priority' => CasePriority::Standard,
            'description' => 'Two separate partial refunds approved on the same case.',
            'sla_due_at' => now()->addDays(2),
        ]);

        $dispatches = 0;
        Http::preventStrayRequests();
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_refund_fixture/refund' => function (Request $request) use (&$dispatches) {
                $dispatches++;
                $entity = $this->refundEntity($request['receipt'], 'processed');
                $entity['id'] = 'rfnd_case_'.$dispatches;

                return Http::response($entity);
            },
        ]);

        $action = app(InitiateAdminRefund::class);
        $reason = 'Partial goodwill refund for same protection case';

        $first = $action->execute($payment, $admin, 20000, $reason, 'refund-case-first-001', $case->id);
        $second = $action->execute($payment->fresh(), $admin, 20000, $reason, 'refund-case-second-001', $case->id);
        $replayed = $action->execute($payment->fresh(), $admin, 20000, $reason, 'refund-case-second-001', $case->id);

        $this->assertSame(RefundStatus::Processed, $first->status);
        $this->assertSame(RefundStatus::Processed, $second->status);
        $this->assertNotSame($first->id, $second->id);
        $this->assertSame($case->id, $first->customer_protection_case_id);
        $this->assertSame($case->id, $second->customer_protection_case_id);
        $this->assertSame($second->id, $replayed->id);

        Http::assertSentCount(2);
        $this->assertSame(2, $dispatches);
        $this->assertDatabaseCount('reservation_refunds', 2);
        $this->assertSame(4, FinancialLedgerEntry::query()->where('entity_type', ReservationRefund::class)->count());
        $this->assertDatabaseCount('financial_ledger_entries', 6);

        $freshPayment = $payment->fresh();
        $this->assertSame(40000, $freshPayment->totalRefundedAmount());
        $this->assertSame(10000, $freshPayment->remainingRefundableAmount());
        $this->assertSame(PaymentStatus::PartiallyRefunded, $freshPayment->status);
    }

    private function createCapturedPayment(): ReservationPayment
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);
        $this->submitReservation($user, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_refund_fixture',
            'gateway_payment_id' => 'pay_refund_fixture',
            'amount_minor' => 50000,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_refund_fixture',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ]);

        app(FinancialLedgerService::class)->recordPaymentCaptured($payment);

        return $payment;
    }

    /** @return array<string, int|string|null> */
    private function refundEntity(?string $receipt, string $status): array
    {
        return [
            'id' => 'rfnd_live_fixture',
            'payment_id' => 'pay_refund_fixture',
            'currency' => 'INR',
            'amount' => 20000,
            'receipt' => $receipt,
            'status' => $status,
        ];
    }
}
