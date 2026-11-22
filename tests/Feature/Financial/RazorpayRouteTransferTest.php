<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Actions\Financial\ApprovePartnerSettlement;
use App\Actions\Financial\ReleasePartnerSettlement;
use App\Actions\Payments\ProcessWebhookEvent;
use App\Actions\Protection\CreateProtectionCase;
use App\Enums\AdminRole;
use App\Enums\CaseCategory;
use App\Enums\CommissionSnapshotStatus;
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
use App\Services\Financial\FinancialLedgerService;
use App\Services\Payments\RazorpayRouteService;
use Carbon\CarbonImmutable;
use GuzzleHttp\Promise\PromiseInterface;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class RazorpayRouteTransferTest extends TestCase
{
    use ReservationTestHelpers;

    /** @var array<string, array<string, mixed>> */
    private array $providerTransfers = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->assertSame('sqlite', DB::getDriverName());
        $this->assertSame(':memory:', DB::getDatabaseName());
        $this->artisan('migrate', ['--force' => true])->assertSuccessful();

        config([
            'tijum.settlements.enabled' => true,
            'tijum.settlements.route_enabled' => true,
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_settlements',
            'tijum.payments.razorpay.key_secret' => 'test-secret',
            'tijum.payments.razorpay.webhook_secret' => 'test-webhook-secret',
        ]);

        Http::fake([
            'https://api.razorpay.com/v1/transfers/*' => function (Request $request) {
                $transfer = $this->providerTransfers[basename($request->url())] ?? null;

                return $transfer === null ? null : Http::response($transfer);
            },
        ]);
    }

    private function createFinanceAdmin(): Admin
    {
        return Admin::factory()->create([
            'role' => AdminRole::Finance,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_secret' => 'test-secret',
        ]);
    }

    /** @return array{Admin, PartnerSettlement, ReservationPayment, PartnerSettlementItem} */
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
            'commission_status' => CommissionSnapshotStatus::SettlementPending,
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
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_vizag_001');

        $this->actingAs($admin, 'admin')
            ->from(route('admin.settlements.show', $settlement))
            ->post(route('admin.settlements.release', $settlement))
            ->assertRedirect(route('admin.settlements.show', $settlement))
            ->assertSessionHasNoErrors();

        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
        Http::assertSentCount(1);
        $this->assertDatabaseHas('provider_transfers', [
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'gateway_transfer_id' => 'trf_vizag_001',
            'destination_account_id' => 'acc_route_vizag_001',
            'amount_minor' => 88100,
            'status' => ProviderTransferStatus::Processed->value,
        ]);
    }

    public function test_partially_refunded_payment_releases_net_of_refund(): void
    {
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement(refundMinor: 50000);
        $this->fakeTransfer('trf_vizag_partial');

        $result = app(ReleasePartnerSettlement::class)->execute($settlement, $admin);

        $this->assertSame(SettlementStatus::Settled, $result->status);
        $this->assertDatabaseHas('provider_transfers', [
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'amount_minor' => 38100,
            'status' => ProviderTransferStatus::Processed->value,
        ]);
    }

    public function test_pending_transfer_retains_the_payable_and_is_not_resent(): void
    {
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_vizag_001', status: 'pending');

        $release = app(ReleasePartnerSettlement::class);
        $release->execute($settlement, $admin);
        $result = $release->execute($settlement->fresh(), $admin);

        $this->assertSame(SettlementStatus::TransferPending, $result->status);
        $this->assertSame('pending', $result->provider_status);
        $this->assertNotNull($result->transfer_initiated_at);
        $this->assertNull($result->settled_at);
        $this->assertSame(CommissionSnapshotStatus::SettlementPending, $payment->reservation->commission_status);
        $this->assertDatabaseHas('provider_transfers', ['status' => ProviderTransferStatus::Pending->value, 'processed_at' => null]);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
        Http::assertSentCount(1);
    }

    public function test_batch_settles_only_after_every_transfer_is_processed(): void
    {
        [$admin, $settlement, $payment, $item] = $this->setupApprovedSettlement();
        $this->addSecondPayableItem($settlement, $payment, $item);
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_vizag_001/transfers' => fn (Request $request) => $this->routeResponse($request, 'trf_vizag_001', 'pending'),
            'https://api.razorpay.com/v1/payments/pay_vizag_002/transfers' => fn (Request $request) => $this->routeResponse($request, 'trf_vizag_002', 'created'),
        ]);
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);

        $this->sendTransferWebhook('transfer.processed', 'trf_vizag_001', 'evt_first');
        $this->assertSame(SettlementStatus::TransferPending, $settlement->fresh()->status);
        $this->assertNull($settlement->fresh()->settled_at);
        $this->assertDatabaseCount('financial_ledger_entries', 2);

        config(['tijum.settlements.route_enabled' => false]);
        $this->sendTransferWebhook('transfer.processed', 'trf_vizag_002', 'evt_second');
        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
        $this->assertNotNull($settlement->fresh()->settled_at);
        $this->assertSame([CommissionSnapshotStatus::Settled, CommissionSnapshotStatus::Settled], $settlement->items()->with('reservation')->get()->map(fn (PartnerSettlementItem $item) => $item->reservation->commission_status)->all());
        $this->assertDatabaseCount('financial_ledger_entries', 4);
    }

    public function test_provider_events_cannot_repost_or_regress_a_completed_transfer(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_vizag_001');
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);

        $this->sendTransferWebhook('transfer.processed', 'trf_vizag_001', 'evt_repeat');
        $this->sendTransferWebhook('transfer.failed', 'trf_vizag_001', 'evt_late_failure');

        $this->assertDatabaseCount('financial_ledger_entries', 2);
        $this->assertDatabaseHas('provider_transfers', ['gateway_transfer_id' => 'trf_vizag_001', 'status' => ProviderTransferStatus::Processed->value]);
        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
    }

    public function test_provider_failure_is_recorded_and_a_confirmed_failed_attempt_can_be_retried(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $posts = 0;
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_vizag_001/transfers' => function (Request $request) use (&$posts): PromiseInterface {
                return ++$posts === 1
                    ? $this->routeResponse($request, 'trf_failed_001', 'failed')
                    : $this->routeResponse($request, 'trf_retry_001');
            },
        ]);

        $this->actingAs($admin, 'admin')->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        $this->assertSame(SettlementStatus::Failed, $settlement->fresh()->status);
        $this->assertNull($settlement->fresh()->settled_at);
        $this->assertDatabaseHas('provider_transfers', [
            'gateway_transfer_id' => 'trf_failed_001',
            'status' => ProviderTransferStatus::Failed->value,
            'error_description' => 'Rejected by provider',
        ]);
        $this->assertDatabaseCount('financial_ledger_entries', 0);

        $this->post(route('admin.settlements.release', $settlement))->assertSessionHasNoErrors();

        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
        $this->assertDatabaseCount('provider_transfers', 2);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
        Http::assertSentCount(2);
    }

    public function test_a_pending_transfer_can_fail_without_posting_a_completion_journal(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_vizag_001', status: 'pending');
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);

        $this->sendTransferWebhook('transfer.failed', 'trf_vizag_001', 'evt_failure');

        $this->assertDatabaseHas('provider_transfers', ['gateway_transfer_id' => 'trf_vizag_001', 'status' => ProviderTransferStatus::Failed->value]);
        $this->assertSame(SettlementStatus::Failed, $settlement->fresh()->status);
        $this->assertNull($settlement->fresh()->settled_at);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
    }

    public function test_a_simulated_transfer_cannot_be_completed_by_the_webhook(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_vizag_001', status: 'pending');
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        $settlement->update(['status' => SettlementStatus::TransferPending, 'settled_at' => null]);
        $settlement->providerTransfers()->update(['gateway_transfer_id' => 'trf_mock_vizag']);

        $this->sendTransferWebhook('transfer.processed', 'trf_mock_vizag', 'evt_simulated');

        $this->assertSame(SettlementStatus::TransferPending, $settlement->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
    }

    public function test_unapproved_settlement_cannot_be_released(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();

        $settlement->forceFill(['status' => SettlementStatus::Draft])->save();

        $this->expectException(ValidationException::class);

        $action = app(ReleasePartnerSettlement::class);
        $action->execute($settlement, $admin);
    }

    public function test_double_transfer_is_prevented_when_balance_insufficient(): void
    {
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement();

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

    #[DataProvider('unavailablePayoutConfigurations')]
    public function test_finance_cannot_release_when_payouts_are_unavailable(string $setting, bool|string $value): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        config([$setting => $value]);
        $this->fakeTransfer('trf_vizag_001');

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        Http::assertNothingSent();
        $this->assertNoPayoutRecorded($settlement);
    }

    /** @return array<string, array{string, bool|string}> */
    public static function unavailablePayoutConfigurations(): array
    {
        return [
            'settlements disabled' => ['tijum.settlements.enabled', false],
            'Route disabled' => ['tijum.settlements.route_enabled', false],
            'missing key' => ['tijum.payments.razorpay.key_id', ''],
            'placeholder key' => ['tijum.payments.razorpay.key_id', 'rzp_test_placeholder'],
            'missing secret' => ['tijum.payments.razorpay.key_secret', ''],
            'live key in test mode' => ['tijum.payments.razorpay.key_id', 'rzp_live_settlements'],
            'live mode without a live key' => ['tijum.payments.live_enabled', true],
        ];
    }

    public function test_operations_cannot_release_settlements(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $admin->update(['role' => AdminRole::Operations]);
        $this->fakeTransfer('trf_vizag_001');

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.release', $settlement))
            ->assertForbidden();

        Http::assertNothingSent();
        $this->assertNoPayoutRecorded($settlement);
    }

    public function test_production_cannot_record_a_sandbox_payout_as_paid(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        app()->detectEnvironment(fn (): string => 'production');
        $this->fakeTransfer('trf_vizag_001');

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        Http::assertNothingSent();
        $this->assertNoPayoutRecorded($settlement);
    }

    public function test_production_can_release_with_live_mode_and_live_credentials(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        app()->detectEnvironment(fn (): string => 'production');
        config([
            'tijum.payments.live_enabled' => true,
            'tijum.payments.razorpay.key_id' => 'rzp_live_TEST_ONLY',
        ]);
        $this->fakeTransfer('trf_vizag_001');

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasNoErrors();

        Http::assertSentCount(1);
        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
    }

    public function test_super_admin_retains_settlement_release_permission(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $admin->update(['role' => AdminRole::SuperAdmin]);
        $this->fakeTransfer('trf_vizag_001');

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.release', $settlement))
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        Http::assertSentCount(1);
        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
    }

    #[DataProvider('invalidTransferIdentifiers')]
    public function test_release_rejects_simulated_or_missing_provider_transfer_identifiers(?string $transferId): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $this->fakeTransfer($transferId);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        $this->assertSame(SettlementStatus::TransferPending, $settlement->fresh()->status);
        $this->assertDatabaseHas('provider_transfers', ['status' => 'uncertain', 'gateway_transfer_id' => null]);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
    }

    /** @return array<string, array{?string}> */
    public static function invalidTransferIdentifiers(): array
    {
        return [
            'simulated' => ['trf_mock_vizag'],
            'missing' => [null],
        ];
    }

    public function test_release_rejects_a_simulated_linked_account(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $settlement->financialProfile->update(['razorpay_account_id' => 'acc_mock_vizag']);
        $this->fakeTransfer('trf_vizag_001');

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        Http::assertNothingSent();
        $this->assertNoPayoutRecorded($settlement);
    }

    public function test_release_does_not_count_an_existing_simulated_transfer(): void
    {
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement();
        $settlement->providerTransfers()->create([
            'transfer_reference' => 'TRN-SIMULATED-001',
            'reservation_payment_id' => $payment->id,
            'gateway' => 'razorpay',
            'gateway_transfer_id' => 'trf_mock_vizag',
            'destination_account_id' => 'acc_route_vizag_001',
            'amount_minor' => 88100,
            'currency' => 'INR',
            'idempotency_key' => 'idemp_simulated_001',
            'status' => ProviderTransferStatus::Processed,
        ]);
        $this->fakeTransfer('trf_vizag_001');

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        Http::assertNothingSent();
        $this->assertSame(SettlementStatus::Approved, $settlement->fresh()->status);
        $this->assertDatabaseCount('provider_transfers', 1);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
    }

    public function test_release_requires_a_provider_payment_identifier(): void
    {
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement();
        $payment->update(['gateway_payment_id' => null]);
        $this->fakeTransfer('trf_vizag_001', (string) $payment->id);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        Http::assertNothingSent();
        $this->assertNoPayoutRecorded($settlement);
    }

    public function test_accepted_transfer_with_lost_response_is_claimed_durably_and_never_resent(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $posts = 0;
        $claimedBeforeSend = false;
        $providerVisible = false;
        Http::fake(function (Request $request) use (&$posts, &$claimedBeforeSend, &$providerVisible) {
            if ($request->method() === 'GET') {
                return Http::response(['items' => $providerVisible ? array_values($this->providerTransfers) : []]);
            }

            $posts++;
            $claimedBeforeSend = DB::transactionLevel() === 0
                && ProviderTransfer::query()->where('status', 'uncertain')->exists();
            $this->routeResponse($request, 'trf_lost_response');

            throw new ConnectionException('Provider accepted the transfer but the response was lost.');
        });

        $this->actingAs($admin, 'admin');
        $this->post(route('admin.settlements.release', $settlement))->assertSessionHasErrors('settlement');
        $this->post(route('admin.settlements.release', $settlement))->assertSessionHasErrors('settlement');

        $this->assertTrue($claimedBeforeSend);
        $this->assertSame(1, $posts);
        $this->assertDatabaseHas('provider_transfers', ['status' => 'uncertain', 'gateway_transfer_id' => null]);
        $this->assertDatabaseCount('financial_ledger_entries', 0);

        $this->artisan('tijum:reconcile-route-transfers')->assertFailed();
        $this->post(route('admin.settlements.release', $settlement))->assertSessionHasErrors('settlement');
        $this->assertDatabaseHas('provider_transfers', ['status' => 'uncertain']);
        $this->assertSame(1, $posts);

        $providerVisible = true;
        $this->artisan('tijum:reconcile-route-transfers')->assertSuccessful();

        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
        $this->assertDatabaseHas('provider_transfers', ['status' => 'processed', 'gateway_transfer_id' => 'trf_lost_response']);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
        $this->assertSame(1, $posts);
    }

    public function test_release_cannot_send_a_claim_that_an_outer_transaction_could_roll_back(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_vizag_001');

        DB::beginTransaction();
        try {
            app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
            $this->fail('Release must refuse to dispatch from another database transaction.');
        } catch (\LogicException $exception) {
            $this->assertStringContainsString('durable transfer claim', $exception->getMessage());
        } finally {
            DB::rollBack();
        }

        Http::assertNothingSent();
        $this->assertNoPayoutRecorded($settlement);
    }

    public function test_later_transfer_failure_preserves_the_first_transfer_and_its_journal(): void
    {
        [$admin, $settlement, $payment, $item] = $this->setupApprovedSettlement();
        $this->addSecondPayableItem($settlement, $payment, $item);
        Http::fake(fn (Request $request) => str_contains($request->url(), 'pay_vizag_002')
            ? Http::response([], 503)
            : $this->routeResponse($request, 'trf_vizag_001'));

        $this->actingAs($admin, 'admin')->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        $this->assertDatabaseHas('provider_transfers', ['gateway_transfer_id' => 'trf_vizag_001', 'status' => 'processed']);
        $this->assertDatabaseHas('provider_transfers', ['status' => 'uncertain']);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
        $this->assertSame(SettlementStatus::TransferPending, $settlement->fresh()->status);
        Http::assertSentCount(2);
    }

    public function test_database_failure_after_acceptance_preserves_the_claim(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        Http::fake(fn (Request $request) => $request->method() === 'GET'
            ? Http::response(['items' => array_values($this->providerTransfers)])
            : $this->routeResponse($request, 'trf_vizag_001'));
        $ledger = app(FinancialLedgerService::class);
        $this->mock(FinancialLedgerService::class)->shouldReceive('recordTransferCompleted')
            ->once()->andThrow(new \RuntimeException('Database unavailable.'));
        $this->actingAs($admin, 'admin')->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        $this->assertDatabaseHas('provider_transfers', ['status' => 'uncertain']);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
        Http::assertSentCount(1);
        $this->post(route('admin.settlements.release', $settlement))->assertSessionHasErrors('settlement');
        Http::assertSentCount(1);

        $this->instance(FinancialLedgerService::class, $ledger);
        $this->artisan('tijum:reconcile-route-transfers')->assertSuccessful();

        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_second_release_cannot_dispatch_during_the_first_provider_call(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $posts = 0;
        Http::fake(function (Request $request) use ($admin, $settlement, &$posts) {
            if (++$posts === 1) {
                try {
                    app(ReleasePartnerSettlement::class)->execute($settlement->fresh(), $admin);
                } catch (ValidationException) {
                    // The in-flight claim blocks the second release.
                }
            }

            return $this->routeResponse($request, 'trf_vizag_001');
        });

        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);

        $this->assertSame(1, $posts);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_approved_total_mismatch_blocks_every_provider_call(): void
    {
        [$admin, $settlement, $payment, $item] = $this->setupApprovedSettlement();
        $this->addSecondPayableItem($settlement, $payment, $item);
        $settlement->update(['net_settlement_amount_minor' => 81200]);
        $item->update(['net_payable_minor' => 0, 'refund_deduction_minor' => 95000]);
        Http::fake(fn (Request $request) => $this->routeResponse($request, 'trf_vizag_002'));

        $this->actingAs($admin, 'admin')->post(route('admin.settlements.release', $settlement))
            ->assertSessionHasErrors('settlement');

        Http::assertNothingSent();
        $this->assertNoPayoutRecorded($settlement);
    }

    public function test_unmatched_delivery_stays_recoverable(): void
    {
        Http::fake(['https://api.razorpay.com/v1/transfers/trf_early' => Http::response(['id' => 'trf_early'])]);
        $this->sendTransferWebhook('transfer.processed', 'trf_early', 'evt_early');

        $this->assertDatabaseHas('payment_webhook_events', [
            'event_id' => 'evt_early', 'status' => 'unresolved', 'processed_at' => null,
        ]);
    }

    public function test_early_webhook_replays_after_provider_state_is_visible_without_double_posting(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_vizag_001/transfers' => function (Request $request): PromiseInterface {
                $response = $this->routeResponse($request, 'trf_early', 'pending');
                $this->assertDatabaseHas('provider_transfers', ['status' => 'uncertain', 'gateway_transfer_id' => null]);
                $this->sendTransferWebhook('transfer.processed', 'trf_early', 'evt_early', updateProviderState: false);
                $this->assertDatabaseHas('payment_webhook_events', ['event_id' => 'evt_early', 'status' => 'unresolved', 'processed_at' => null]);
                $this->assertDatabaseHas('provider_transfers', ['status' => 'pending', 'gateway_transfer_id' => 'trf_early']);

                return $response;
            },
        ]);

        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        $this->assertDatabaseCount('financial_ledger_entries', 0);

        $this->sendTransferWebhook('transfer.processed', 'trf_early', 'evt_early');
        $this->sendTransferWebhook('transfer.processed', 'trf_early', 'evt_early');
        $this->sendTransferWebhook('transfer.failed', 'trf_early', 'evt_older_failure');

        $this->assertDatabaseHas('payment_webhook_events', ['event_id' => 'evt_early', 'status' => 'processed']);
        $this->assertDatabaseCount('payment_webhook_events', 2);
        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_failed_transfer_webhook_can_be_delivered_again(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_vizag_001', status: 'pending');
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        $this->providerTransfers['trf_vizag_001']['transfer_status'] = 'processed';
        $payload = json_encode([
            'event' => 'transfer.processed',
            'payload' => ['transfer' => ['entity' => ['id' => 'trf_vizag_001']]],
        ], JSON_THROW_ON_ERROR);
        $signature = hash_hmac('sha256', $payload, 'test-webhook-secret');
        $action = app(ProcessWebhookEvent::class);
        $ledger = app(FinancialLedgerService::class);
        $this->mock(FinancialLedgerService::class)->shouldReceive('recordTransferCompleted')
            ->once()->andThrow(new \RuntimeException('Database temporarily unavailable.'));
        try {
            $action->execute($payload, $signature, eventId: 'evt_replay');
            $this->fail('Expected the webhook to fail before retry.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Database temporarily unavailable.', $exception->getMessage());
        }
        $this->instance(FinancialLedgerService::class, $ledger);

        $action->execute($payload, $signature, eventId: 'evt_replay');

        $this->assertDatabaseHas('payment_webhook_events', ['event_id' => 'evt_replay', 'status' => 'processed']);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_production_callback_cannot_promote_a_historical_sandbox_transfer(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_historical_sandbox', status: 'pending');
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        $settlement->providerTransfers()->update(['gateway_mode' => null, 'gateway_payment_id' => null]);
        app()->instance('env', 'production');
        config([
            'tijum.payments.live_enabled' => true,
            'tijum.payments.razorpay.key_id' => 'rzp_live_settlements',
        ]);
        app()->forgetInstance(RazorpayRouteService::class);

        $this->sendTransferWebhook('transfer.processed', 'trf_historical_sandbox', 'evt_sandbox');

        $this->assertSame(SettlementStatus::TransferPending, $settlement->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
        $this->assertDatabaseHas('payment_webhook_events', ['event_id' => 'evt_sandbox', 'status' => 'unresolved']);
        Http::assertSentCount(1);
    }

    #[DataProvider('eligibleSettlementHolds')]
    public function test_financial_admin_can_hold_a_pre_dispatch_settlement(AdminRole $role, SettlementStatus $status): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $admin->update(['role' => $role]);
        $settlement->update(['status' => $status]);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.hold', $settlement), ['reason' => 'Finance review'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(SettlementStatus::OnHold, $settlement->fresh()->status);
        $this->assertStringContainsString('Finance review', $settlement->fresh()->admin_notes);
        $this->post(route('admin.settlements.release', $settlement))->assertSessionHasErrors('settlement');
        Http::assertNothingSent();
    }

    /** @return array<string, array{AdminRole, SettlementStatus}> */
    public static function eligibleSettlementHolds(): array
    {
        return [
            'Finance draft' => [AdminRole::Finance, SettlementStatus::Draft],
            'Finance pending approval' => [AdminRole::Finance, SettlementStatus::PendingApproval],
            'Finance approved' => [AdminRole::Finance, SettlementStatus::Approved],
            'Super Admin approved' => [AdminRole::SuperAdmin, SettlementStatus::Approved],
        ];
    }

    public function test_operations_cannot_hold_a_settlement(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $admin->update(['role' => AdminRole::Operations]);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.hold', $settlement), ['reason' => 'Operations request'])
            ->assertForbidden();

        $this->assertSame(SettlementStatus::Approved, $settlement->fresh()->status);
        Http::assertNothingSent();
    }

    public function test_approval_cannot_overwrite_a_hold_using_stale_settlement_state(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $settlement->update(['status' => SettlementStatus::Draft]);
        $staleDraft = $settlement->fresh();

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.hold', $settlement), ['reason' => 'Finance review'])
            ->assertSessionHasNoErrors();

        $this->expectException(ValidationException::class);

        try {
            app(ApprovePartnerSettlement::class)->execute($staleDraft, $admin);
        } finally {
            $this->assertSame(SettlementStatus::OnHold, $settlement->fresh()->status);
            $this->assertDatabaseCount('financial_ledger_entries', 0);
        }
    }

    #[DataProvider('invalidSettlementHolds')]
    public function test_finance_cannot_hold_terminal_settlements(SettlementStatus $status): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $settlement->update(['status' => $status]);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.hold', $settlement), ['reason' => 'Finance review'])
            ->assertSessionHasErrors('settlement');

        $this->assertSame($status, $settlement->fresh()->status);
        Http::assertNothingSent();
    }

    /** @return array<string, array{SettlementStatus}> */
    public static function invalidSettlementHolds(): array
    {
        return [
            'settled' => [SettlementStatus::Settled],
            'cancelled' => [SettlementStatus::Cancelled],
            'reversed' => [SettlementStatus::Reversed],
            'failed' => [SettlementStatus::Failed],
        ];
    }

    public function test_pending_transfer_and_its_attempt_cannot_be_put_on_hold(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_vizag_hold', status: 'pending');
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);

        $this->actingAs($admin, 'admin')
            ->post(route('admin.settlements.hold', $settlement), ['reason' => 'Finance review'])
            ->assertSessionHasErrors('settlement');
        $this->assertSame(SettlementStatus::TransferPending, $settlement->fresh()->status);

        $settlement->update(['status' => SettlementStatus::Approved, 'transfer_initiated_at' => null]);
        $this->post(route('admin.settlements.hold', $settlement), ['reason' => 'Finance review'])
            ->assertSessionHasErrors('settlement');
        $this->assertSame(SettlementStatus::Approved, $settlement->fresh()->status);
        $this->assertDatabaseHas('provider_transfers', ['gateway_transfer_id' => 'trf_vizag_hold', 'status' => 'pending']);
        Http::assertSentCount(1);
    }

    public function test_callback_can_complete_a_historically_held_batch_without_duplicate_journals(): void
    {
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_vizag_held', status: 'pending');
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        $settlement->update(['status' => SettlementStatus::OnHold]);

        $this->sendTransferWebhook('transfer.processed', 'trf_vizag_held', 'evt_held');
        $this->sendTransferWebhook('transfer.processed', 'trf_vizag_held', 'evt_held_again');

        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
        $this->assertNotNull($settlement->fresh()->settled_at);
        $this->assertSame(CommissionSnapshotStatus::Settled, $payment->reservation->fresh()->commission_status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_hold_requested_during_completion_callback_is_rejected(): void
    {
        [$admin, $settlement] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_completing', status: 'pending');
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        $providerTransfer = $this->providerTransfers['trf_completing'];
        unset($this->providerTransfers['trf_completing']);

        Http::fake([
            'https://api.razorpay.com/v1/transfers/trf_completing' => function () use ($admin, $settlement, $providerTransfer): PromiseInterface {
                $this->actingAs($admin, 'admin')
                    ->post(route('admin.settlements.hold', $settlement), ['reason' => 'Concurrent finance request'])
                    ->assertSessionHasErrors('settlement');

                return Http::response(array_replace($providerTransfer, ['transfer_status' => 'processed']));
            },
        ]);

        $this->sendTransferWebhook('transfer.processed', 'trf_completing', 'evt_concurrent_hold', updateProviderState: false);

        $this->assertSame(SettlementStatus::Settled, $settlement->fresh()->status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
    }

    public function test_partially_paid_historical_hold_keeps_the_remaining_batch_on_hold(): void
    {
        [$admin, $settlement, $payment, $item] = $this->setupApprovedSettlement();
        $this->addSecondPayableItem($settlement, $payment, $item);
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_vizag_001/transfers' => fn (Request $request) => $this->routeResponse($request, 'trf_held_first', 'pending'),
            'https://api.razorpay.com/v1/payments/pay_vizag_002/transfers' => fn (Request $request) => $this->routeResponse($request, 'trf_held_second', 'pending'),
        ]);
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        $settlement->update(['status' => SettlementStatus::OnHold]);

        $this->sendTransferWebhook('transfer.processed', 'trf_held_first', 'evt_held_partial');
        $this->sendTransferWebhook('transfer.processed', 'trf_held_first', 'evt_held_partial_again');

        $settlement->refresh();
        $this->assertSame(SettlementStatus::OnHold, $settlement->status);
        $this->assertSame('partially_processed', $settlement->provider_status);
        $this->assertNull($settlement->settled_at);
        $this->assertSame(CommissionSnapshotStatus::SettlementPending, $payment->reservation->fresh()->commission_status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
        $this->assertDatabaseHas('provider_transfers', ['gateway_transfer_id' => 'trf_held_second', 'status' => 'pending']);
        Http::assertSentCount(4);
    }

    public function test_reconciliation_repairs_a_paid_historical_hold_without_redispatching_or_reposting(): void
    {
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_already_paid', status: 'pending');
        app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        $this->sendTransferWebhook('transfer.processed', 'trf_already_paid', 'evt_already_paid');
        $processedAt = $settlement->providerTransfers()->sole()->processed_at;
        $settlement->update(['status' => SettlementStatus::OnHold, 'settled_at' => null]);
        $payment->reservation->update(['commission_status' => CommissionSnapshotStatus::SettlementPending]);

        $this->artisan('tijum:reconcile-route-transfers')->assertSuccessful();
        $this->artisan('tijum:reconcile-route-transfers')->assertSuccessful();

        $settlement->refresh();
        $this->assertSame(SettlementStatus::Settled, $settlement->status);
        $this->assertEquals($processedAt, $settlement->settled_at);
        $this->assertSame(CommissionSnapshotStatus::Settled, $payment->reservation->fresh()->commission_status);
        $this->assertDatabaseCount('financial_ledger_entries', 2);
        Http::assertSentCount(3);
    }

    public function test_unresolved_grievance_blocks_settlement_approval(): void
    {
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement();
        $settlement->update([
            'status' => SettlementStatus::Draft,
            'approved_by_admin_id' => null,
            'approved_at' => null,
        ]);

        app(CreateProtectionCase::class)->execute(
            $payment->reservation,
            $payment->reservation->user,
            [
                'category' => CaseCategory::PropertyUnavailable->value,
                'description' => 'Host denied entry at arrival; requesting emergency relocation or refund.',
            ],
        );

        try {
            app(ApprovePartnerSettlement::class)->execute($settlement->fresh(), $admin);
            $this->fail('Expected ValidationException when approving settlement with an unresolved protection case.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('settlement', $e->errors());
        }

        $this->assertSame(SettlementStatus::Draft, $settlement->fresh()->status);
    }

    public function test_unresolved_grievance_raised_after_approval_blocks_payout_release(): void
    {
        [$admin, $settlement, $payment] = $this->setupApprovedSettlement();
        $this->fakeTransfer('trf_should_not_send');

        // Customer submits a qualifying grievance AFTER the settlement was approved
        app(CreateProtectionCase::class)->execute(
            $payment->reservation,
            $payment->reservation->user,
            [
                'category' => CaseCategory::FoodNotProvided->value,
                'description' => 'Disclosed meals were not provided during stay.',
            ],
        );

        try {
            app(ReleasePartnerSettlement::class)->execute($settlement->fresh(), $admin);
            $this->fail('Expected ValidationException when releasing payout for reservation with unresolved grievance.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('settlement', $e->errors());
        }

        $this->assertNoPayoutRecorded($settlement);
        Http::assertNothingSent();
    }

    public function test_grievance_on_second_item_blocks_remaining_payout_while_preserving_already_dispatched_first_transfer(): void
    {
        [$admin, $settlement, $payment, $item] = $this->setupApprovedSettlement();
        $this->addSecondPayableItem($settlement, $payment, $item);

        $secondItem = $settlement->items()->where('id', '!=', $item->id)->firstOrFail();
        $secondReservation = $secondItem->reservation;

        // When first transfer is dispatched, customer concurrently files a grievance on the second reservation
        Http::fake([
            'https://api.razorpay.com/v1/payments/pay_vizag_001/transfers' => function (Request $request) use ($secondReservation): PromiseInterface {
                app(CreateProtectionCase::class)->execute(
                    $secondReservation,
                    $secondReservation->user,
                    [
                        'category' => CaseCategory::SafetyConcern->value,
                        'description' => 'Urgent safety issue raised before second item payout claim.',
                    ],
                );

                return $this->routeResponse($request, 'trf_vizag_item1_ok', 'processed');
            },
            'https://api.razorpay.com/v1/payments/pay_vizag_002/transfers' => fn (Request $request) => $this->routeResponse($request, 'trf_vizag_item2_blocked', 'processed'),
        ]);

        try {
            app(ReleasePartnerSettlement::class)->execute($settlement->fresh(), $admin);
            $this->fail('Expected ValidationException when second reservation has an unresolved grievance before its payout claim.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('settlement', $e->errors());
        }

        // First transfer MUST remain preserved as Processed (never marked unpaid or deleted)
        $this->assertDatabaseHas('provider_transfers', [
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $payment->id,
            'gateway_transfer_id' => 'trf_vizag_item1_ok',
            'status' => ProviderTransferStatus::Processed->value,
        ]);
        // Second transfer MUST NOT have been created or dispatched
        $this->assertDatabaseMissing('provider_transfers', [
            'partner_settlement_id' => $settlement->id,
            'reservation_payment_id' => $secondItem->reservation_payment_id,
        ]);
        $this->assertSame(1, ProviderTransfer::query()->where('partner_settlement_id', $settlement->id)->count());
        Http::assertSentCount(1);
    }

    private function routeResponse(Request $request, ?string $transferId, string $status = 'processed'): PromiseInterface
    {
        $transfer = $request['transfers'][0];
        $paymentId = basename(dirname($request->url()));

        $entity = [
            'id' => $transferId,
            'source' => $paymentId,
            'recipient' => $transfer['account'],
            'amount' => $transfer['amount'],
            'currency' => $transfer['currency'],
            'notes' => $transfer['notes'],
            'transfer_status' => $status,
            'error' => $status === 'failed' ? ['description' => 'Rejected by provider'] : null,
        ];
        if ($transferId !== null) {
            $this->providerTransfers[$transferId] = $entity;
        }

        return Http::response(['items' => [$entity]]);
    }

    private function fakeTransfer(?string $transferId, string $paymentId = 'pay_vizag_001', string $status = 'processed'): void
    {
        Http::fake([
            "https://api.razorpay.com/v1/payments/{$paymentId}/transfers" => fn (Request $request) => $this->routeResponse($request, $transferId, $status),
        ]);
    }

    private function addSecondPayableItem(PartnerSettlement $settlement, ReservationPayment $payment, PartnerSettlementItem $item): void
    {
        $reservation = $payment->reservation->replicate();
        $reservation->forceFill(['booking_reference' => 'RES-VIZAG-SECOND', 'submission_token' => (string) Str::uuid()])->save();

        $secondPayment = $payment->replicate();
        $secondPayment->forceFill([
            'reservation_id' => $reservation->id,
            'gateway_order_id' => 'order_vizag_002',
            'gateway_payment_id' => 'pay_vizag_002',
            'idempotency_key' => 'idemp_vizag_002',
        ])->save();

        $item->replicate()->forceFill([
            'reservation_id' => $reservation->id,
            'reservation_payment_id' => $secondPayment->id,
        ])->save();
        $settlement->update(['net_settlement_amount_minor' => $item->net_payable_minor * 2]);
    }

    private function sendTransferWebhook(string $type, string $transferId, string $eventId, bool $updateProviderState = true): void
    {
        if ($updateProviderState && in_array($this->providerTransfers[$transferId]['transfer_status'] ?? null, ['created', 'pending'], true)) {
            $this->providerTransfers[$transferId]['transfer_status'] = $type === 'transfer.failed' ? 'failed' : 'processed';
        }

        $payload = json_encode([
            'event' => $type,
            'payload' => ['transfer' => ['entity' => ['id' => $transferId]]],
        ], JSON_THROW_ON_ERROR);

        $this->call('POST', route('webhooks.razorpay'), server: [
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $payload, 'test-webhook-secret'),
            'HTTP_X_RAZORPAY_EVENT_ID' => $eventId,
            'CONTENT_TYPE' => 'application/json',
        ], content: $payload)->assertOk();
    }

    private function assertNoPayoutRecorded(PartnerSettlement $settlement): void
    {
        $settlement->refresh();

        $this->assertSame(SettlementStatus::Approved, $settlement->status);
        $this->assertNull($settlement->settled_at);
        $this->assertDatabaseCount('provider_transfers', 0);
        $this->assertDatabaseCount('financial_ledger_entries', 0);
    }
}
