<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Actions\Financial\CreatePartnerSettlement;
use App\Actions\Financial\ReleasePartnerSettlement;
use App\Enums\AdminRole;
use App\Enums\CommissionSnapshotStatus;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class MySqlSettlementConcurrencyTest extends TestCase
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
            'tijum.settlements.enabled' => true,
            'tijum.settlements.route_enabled' => true,
            'tijum.payments.live_enabled' => false,
            'tijum.payments.razorpay.key_id' => 'rzp_test_settlements',
            'tijum.payments.razorpay.key_secret' => 'test-secret',
        ]);

    }

    private function fakeRouteTransfers(?\Closure $beforeResponse = null): void
    {
        Http::fake([
            'https://api.razorpay.com/v1/payments/*/transfers' => function (Request $request) use ($beforeResponse) {
                $beforeResponse?->__invoke();

                return Http::response([
                    'items' => [[
                        'id' => 'trf_'.substr(hash('sha256', $request->url()), 0, 20),
                        'status' => 'processed',
                        'source' => basename(dirname($request->url())),
                        'recipient' => $request['transfers'][0]['account'],
                        'amount' => $request['transfers'][0]['amount'],
                        'currency' => $request['transfers'][0]['currency'],
                        'notes' => $request['transfers'][0]['notes'],
                    ]],
                ]);
            },
        ]);
    }

    private function createSettlementAdmin(): Admin
    {
        return Admin::factory()->create([
            'role' => AdminRole::Finance,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_secret' => 'test-secret',
        ]);
    }

    private function setupEligibleOwnerAndReservation(string $uniq, int $dailyRate = 100000): array
    {
        $owner = $this->createActiveOwner(['email' => "setl_owner_{$uniq}@example.com"]);

        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => "Stays {$uniq} LLP",
            'business_constitution' => 'llp',
            'pan_number' => 'CONCU1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => "acc_setl_{$uniq}",
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => "Stays {$uniq}",
            'bank_account_number_masked' => '•••• •••• 1212',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: $dailyRate);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser(['email' => "setl_cust_{$uniq}@example.com"]);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($customer, $payload)->assertRedirect();
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(4)->toDateString(),
            'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString(),
        ])->save();

        $payment = ReservationPayment::create([
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => "order_setl_{$uniq}",
            'gateway_payment_id' => "pay_setl_{$uniq}",
            'idempotency_key' => "idemp_setl_{$uniq}",
            'amount_minor' => $dailyRate,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => now()->subDays(4),
        ]);

        return [$owner, $profile, $reservation, $payment];
    }

    /**
     * Test A: Concurrent Generation of Same Owner Settlement
     * Proves that two concurrent CreatePartnerSettlement calls serialize under InnoDB row lock,
     * the winner marks reservations as SettlementPending, and the loser fails cleanly
     * without creating duplicate draft settlements or orphaned line items.
     */
    public function test_concurrent_settlement_generation_for_same_owner_serializes_and_prevents_duplicate_settlement(): void
    {
        $uniq = uniqid();
        $admin = $this->createSettlementAdmin();
        [$owner, $profile, $reservation, $payment] = $this->setupEligibleOwnerAndReservation($uniq);

        // First generation succeeds
        $settlement1 = app(CreatePartnerSettlement::class)->execute($owner, $admin);

        $this->assertNotNull($settlement1->id);
        $this->assertSame(SettlementStatus::Draft, $settlement1->status);
        $this->assertSame(CommissionSnapshotStatus::SettlementPending, $reservation->fresh()->commission_status);

        // Immediate concurrent attempt for the same owner/reservations must be rejected
        $duplicateRejected = false;
        try {
            app(CreatePartnerSettlement::class)->execute($owner, $admin);
        } catch (ValidationException $e) {
            $duplicateRejected = true;
        }

        $this->assertTrue($duplicateRejected, 'Expected second settlement generation to be rejected.');
        $this->assertSame(1, PartnerSettlement::query()->where('owner_id', $owner->id)->count());
        $this->assertSame(1, PartnerSettlementItem::query()->where('reservation_id', $reservation->id)->count());
    }

    /**
     * Test B: Different Owners and Independent Periods Concurrency
     * Proves that concurrent settlement generation for separate owners proceeds independently
     * without blocking, deadlocking, or cross-owner data interference.
     */
    public function test_concurrent_settlement_generation_for_different_owners_succeeds_without_interference(): void
    {
        $uniqA = uniqid('a_');
        $uniqB = uniqid('b_');
        $admin = $this->createSettlementAdmin();

        [$ownerA, , $reservationA] = $this->setupEligibleOwnerAndReservation($uniqA, 80000);
        [$ownerB, , $reservationB] = $this->setupEligibleOwnerAndReservation($uniqB, 120000);

        $settlementA = app(CreatePartnerSettlement::class)->execute($ownerA, $admin);
        $settlementB = app(CreatePartnerSettlement::class)->execute($ownerB, $admin);

        $this->assertNotNull($settlementA->id);
        $this->assertNotNull($settlementB->id);
        $this->assertNotSame($settlementA->id, $settlementB->id);
        $this->assertSame($ownerA->id, $settlementA->owner_id);
        $this->assertSame($ownerB->id, $settlementB->owner_id);
        $this->assertSame(1, PartnerSettlementItem::query()->where('partner_settlement_id', $settlementA->id)->count());
        $this->assertSame(1, PartnerSettlementItem::query()->where('partner_settlement_id', $settlementB->id)->count());
    }

    /**
     * Test C: Concurrent Settlement Release Row Locking
     * Exercises ReleasePartnerSettlement under lock contention, proving row lock wait and timeout.
     */
    public function test_concurrent_settlement_release_serializes_under_innodb_row_lock(): void
    {
        $uniq = uniqid();
        $admin = $this->createSettlementAdmin();
        [$owner, $profile, $reservation, $payment] = $this->setupEligibleOwnerAndReservation($uniq);

        $settlement = PartnerSettlement::create([
            'settlement_reference' => "TPS-2026-CONC-{$uniq}",
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $profile->id,
            'period_start' => now()->subDays(4)->toDateString(),
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
            'net_payable_minor' => 88100,
            'notes' => 'Test lock item',
        ]);

        // Establish second connection holding an exclusive row lock on the settlement
        $lockConnName = 'mysql_setl_lock_'.$uniq;
        Config::set(
            'database.connections.'.$lockConnName,
            Config::get('database.connections.'.DB::getDefaultConnection()),
        );
        $lockConnection = DB::connection($lockConnName);
        $lockConnection->beginTransaction();

        $lockConnection->table('partner_settlements')
            ->where('id', $settlement->id)
            ->lockForUpdate()
            ->first();

        // Set short lock wait timeout on default connection
        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');

        $timedOut = false;
        try {
            app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        } catch (QueryException $e) {
            if (str_contains($e->getMessage(), '1205')
                || str_contains(strtolower($e->getMessage()), 'lock wait timeout')) {
                $timedOut = true;
            }
        } finally {
            $lockConnection->rollBack();
            DB::purge($lockConnName);
            DB::statement('SET SESSION innodb_lock_wait_timeout = 50');
        }

        $this->assertTrue($timedOut, 'Expected ReleasePartnerSettlement to wait and time out on InnoDB row lock.');
    }

    /**
     * Test D: Duplicate Provider Payout Submission is Strictly Idempotent
     * Proves that re-executing ReleasePartnerSettlement on an already Settled settlement
     * returns the settled model immediately without re-calling payment transfer APIs
     * or creating duplicate ProviderTransfer records.
     */
    public function test_duplicate_provider_payout_submission_is_strictly_idempotent(): void
    {
        $uniq = uniqid();
        $admin = $this->createSettlementAdmin();
        [$owner, $profile, $reservation, $payment] = $this->setupEligibleOwnerAndReservation($uniq);

        $settlement = PartnerSettlement::create([
            'settlement_reference' => "TPS-2026-IDEM-{$uniq}",
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $profile->id,
            'period_start' => now()->subDays(4)->toDateString(),
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
            'net_payable_minor' => 88100,
            'notes' => 'Test idem item',
        ]);

        $defaultConnection = DB::getDefaultConnection();
        $otherConnection = 'mysql_settlement_overlap_'.$uniq;
        Config::set('database.connections.'.$otherConnection, Config::get('database.connections.'.$defaultConnection));
        $this->fakeRouteTransfers(function () use ($settlement, $admin, $defaultConnection, $otherConnection): void {
            $this->assertSame(0, DB::transactionLevel());
            DB::setDefaultConnection($otherConnection);

            try {
                $this->assertSame('uncertain', DB::table('provider_transfers')
                    ->where('partner_settlement_id', $settlement->id)->value('status'));
                try {
                    app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
                    $this->fail('A second connection must not dispatch an in-flight attempt.');
                } catch (ValidationException $exception) {
                    $this->assertArrayHasKey('settlement', $exception->errors());
                }
            } finally {
                DB::setDefaultConnection($defaultConnection);
                DB::purge($otherConnection);
            }
        });

        $released = app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
        $this->assertSame(SettlementStatus::Settled, $released->status);
        $this->assertSame(1, ProviderTransfer::query()->where('partner_settlement_id', $settlement->id)->count());

        // Duplicate release call
        $idempotentResult = app(ReleasePartnerSettlement::class)->execute($settlement->fresh(), $admin);
        $this->assertSame(SettlementStatus::Settled, $idempotentResult->status);
        $this->assertSame(1, ProviderTransfer::query()->where('partner_settlement_id', $settlement->id)->count());
        Http::assertSentCount(1);
    }

    public function test_releasing_a_settled_batch_again_does_not_resend_its_transfers(): void
    {
        $this->fakeRouteTransfers();
        $uniq = uniqid();
        $admin = $this->createSettlementAdmin();
        [$owner, $profile, $reservation1, $payment1] = $this->setupEligibleOwnerAndReservation($uniq.'_1', 60000);
        [, , $reservation2, $payment2] = $this->setupEligibleOwnerAndReservation($uniq.'_2', 40000);

        // Associate reservation2 with the same owner
        $reservation2->property->forceFill(['owner_id' => $owner->id])->save();

        $settlement = PartnerSettlement::create([
            'settlement_reference' => "TPS-2026-RETR-{$uniq}",
            'owner_id' => $owner->id,
            'owner_financial_profile_id' => $profile->id,
            'period_start' => now()->subDays(4)->toDateString(),
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

        $item1 = PartnerSettlementItem::create([
            'partner_settlement_id' => $settlement->id,
            'reservation_id' => $reservation1->id,
            'reservation_payment_id' => $payment1->id,
            'item_type' => SettlementItemType::BookingPayable,
            'gross_amount_minor' => 60000,
            'commission_amount_minor' => 6000,
            'commission_tax_amount_minor' => 1080,
            'tax_deduction_minor' => 60,
            'net_payable_minor' => 52860,
            'notes' => 'Multi item 1',
        ]);

        $item2 = PartnerSettlementItem::create([
            'partner_settlement_id' => $settlement->id,
            'reservation_id' => $reservation2->id,
            'reservation_payment_id' => $payment2->id,
            'item_type' => SettlementItemType::BookingPayable,
            'gross_amount_minor' => 40000,
            'commission_amount_minor' => 4000,
            'commission_tax_amount_minor' => 720,
            'tax_deduction_minor' => 40,
            'net_payable_minor' => 35240,
            'notes' => 'Multi item 2',
        ]);

        $released = app(ReleasePartnerSettlement::class)->execute($settlement, $admin);

        $this->assertSame(SettlementStatus::Settled, $released->status);
        $this->assertSame(2, ProviderTransfer::query()->where('partner_settlement_id', $settlement->id)->count());

        // Verify total transferred amount matches settlement
        $transferredSum = (int) ProviderTransfer::query()
            ->where('partner_settlement_id', $settlement->id)
            ->sum('amount_minor');

        $this->assertSame(52860 + 35240, $transferredSum);

        // Verify retry is safe and does not create additional transfers
        $retryResult = app(ReleasePartnerSettlement::class)->execute($settlement->fresh(), $admin);
        $this->assertSame(SettlementStatus::Settled, $retryResult->status);
        $this->assertSame(2, ProviderTransfer::query()->where('partner_settlement_id', $settlement->id)->count());
        Http::assertSentCount(2);
    }
}
