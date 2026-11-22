<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Actions\Financial\CreatePartnerSettlement;
use App\Actions\Financial\ReleasePartnerSettlement;
use App\Actions\Protection\CreateProtectionCase;
use App\Enums\AdminRole;
use App\Enums\CaseCategory;
use App\Enums\CommissionSnapshotStatus;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\PointsTransactionType;
use App\Enums\ReservationStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Http\Controllers\Admin\Financial\AdminSettlementController;
use App\Models\Admin;
use App\Models\CustomerPointsLedger;
use App\Models\Owner;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\ProviderTransfer;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\User;
use App\Services\Rewards\ReferralService;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Http\Client\Request;
use Illuminate\Http\Request as HttpRequest;
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

        $releaseTimedOut = false;
        $holdTimedOut = false;
        $holdRequest = HttpRequest::create('/', 'POST', ['reason' => 'Finance review']);
        $holdRequest->setUserResolver(fn (): Admin => $admin);

        try {
            try {
                app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
            } catch (QueryException $e) {
                $releaseTimedOut = (int) ($e->errorInfo[1] ?? 0) === 1205;
            }

            try {
                app(AdminSettlementController::class)->hold($settlement, $holdRequest);
            } catch (QueryException $e) {
                $holdTimedOut = (int) ($e->errorInfo[1] ?? 0) === 1205
                    && str_contains(strtolower($e->getSql()), 'for update');
            }
        } finally {
            $lockConnection->rollBack();
            DB::purge($lockConnName);
            DB::statement('SET SESSION innodb_lock_wait_timeout = 50');
        }

        $this->assertTrue($releaseTimedOut, 'Expected release to wait on the InnoDB settlement row lock.');
        $this->assertTrue($holdTimedOut, 'Expected hold to acquire the same InnoDB settlement row lock before validation.');
        $this->assertSame(SettlementStatus::Approved, $settlement->fresh()->status);
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
                $this->actingAs($admin, 'admin')
                    ->post(route('admin.settlements.hold', $settlement), ['reason' => 'Concurrent finance request'])
                    ->assertSessionHasErrors('settlement');
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

    public function test_mysql_concurrent_grievance_creation_and_payout_claim_serialize_on_reservation_lock(): void
    {
        $this->fakeRouteTransfers();
        $uniq = uniqid();
        $admin = $this->createSettlementAdmin();
        [$owner, $profile, $reservation, $payment] = $this->setupEligibleOwnerAndReservation($uniq.'_griev', 100000);

        $settlement = PartnerSettlement::create([
            'settlement_reference' => "TPS-2026-GRIEV-{$uniq}",
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
            'notes' => 'Grievance race test item',
        ]);

        // Connection A holds an active transaction during CreateProtectionCase (which locks the Reservation row)
        $defaultConnection = DB::getDefaultConnection();
        $secondConnection = 'mysql_grievance_race_'.$uniq;
        $secondConfig = Config::get('database.connections.'.$defaultConnection);
        $secondConfig['options'] = ($secondConfig['options'] ?? []) + [
            \PDO::ATTR_TIMEOUT => 2,
        ];
        Config::set('database.connections.'.$secondConnection, $secondConfig);
        DB::connection($secondConnection)->statement('SET innodb_lock_wait_timeout = 1');

        DB::beginTransaction();

        try {
            app(CreateProtectionCase::class)->execute(
                $reservation,
                $reservation->user,
                [
                    'category' => CaseCategory::OwnerCancelled->value,
                    'description' => 'Host refused check-in concurrently with payout attempt.',
                ],
            );

            // While Connection A holds the Reservation row lock, Connection B attempts to claim payout.
            // Because ReleasePartnerSettlement::claimNextTransfer() MUST acquire lockForUpdate() on the Reservation row
            // in the same transaction as the payout claim, Connection B MUST block on InnoDB row lock!
            DB::setDefaultConnection($secondConnection);
            $blockedByRowLock = false;

            try {
                app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
            } catch (QueryException $e) {
                $blockedByRowLock = str_contains($e->getMessage(), '1205')
                    || str_contains(strtolower($e->getMessage()), 'lock wait timeout');
            } finally {
                DB::setDefaultConnection($defaultConnection);
            }

            $this->assertTrue(
                $blockedByRowLock,
                'ReleasePartnerSettlement::claimNextTransfer must lock the Reservation row with lockForUpdate() to serialize against concurrent grievance creation.',
            );

            DB::commit();
        } catch (\Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            DB::purge($secondConnection);

            throw $e;
        }

        DB::purge($secondConnection);

        // Once the grievance transaction commits, any subsequent payout release attempt MUST be rejected
        // with zero external transfers dispatched!
        try {
            app(ReleasePartnerSettlement::class)->execute($settlement->fresh(), $admin);
            $this->fail('Payout release must fail once the qualifying grievance has committed.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('settlement', $e->errors());
        }

        $this->assertSame(0, ProviderTransfer::query()->where('partner_settlement_id', $settlement->id)->count());
        Http::assertNothingSent();
    }

    public function test_mysql_concurrent_referral_qualifications_enforce_max_successful_referrals_cap_under_row_lock(): void
    {
        $uniq = uniqid();
        $referrer = User::factory()->create(['email' => "referrer_{$uniq}@example.com"]);
        $referralService = app(ReferralService::class);
        $profile = $referralService->getOrCreateProfile($referrer);

        // Referrer already has 4 successful referrals out of max 5
        $profile->update([
            'total_referrals_count' => 4,
            'successful_referrals_count' => 4,
            'total_points_earned' => 2000,
        ]);

        // Two referred friends both complete stays concurrently
        [, , $reservationA] = $this->setupEligibleOwnerAndReservation($uniq.'_refA', 200000);
        [, , $reservationB] = $this->setupEligibleOwnerAndReservation($uniq.'_refB', 200000);

        $reservationA->forceFill([
            'checked_in_at' => now()->subDays(5),
            'checked_out_at' => now()->subDays(2),
        ])->save();
        $reservationB->forceFill([
            'checked_in_at' => now()->subDays(5),
            'checked_out_at' => now()->subDays(2),
        ])->save();

        $referralA = $referralService->attributeReferral($reservationA->user, $profile->referral_code);
        $referralB = $referralService->attributeReferral($reservationB->user, $profile->referral_code);
        $this->assertNotNull($referralA);
        $this->assertNotNull($referralB);

        $defaultConnection = DB::getDefaultConnection();
        $secondConnection = 'mysql_referral_cap_'.$uniq;
        Config::set('database.connections.'.$secondConnection, Config::get('database.connections.'.$defaultConnection));
        DB::connection($secondConnection)->statement('SET innodb_lock_wait_timeout = 1');

        // Connection A starts a transaction and qualifies referral A (holding lock on referrer's CustomerReferralProfile)
        DB::beginTransaction();
        try {
            $referralService->qualifyReferralOnCompletedStay($reservationA);

            // While Connection A holds the referrer profile lock, Connection B attempts to qualify referral B
            DB::setDefaultConnection($secondConnection);
            $blockedOnProfileLock = false;
            try {
                $referralService->qualifyReferralOnCompletedStay($reservationB);
            } catch (QueryException $e) {
                $blockedOnProfileLock = str_contains($e->getMessage(), '1205')
                    || str_contains(strtolower($e->getMessage()), 'lock wait timeout');
            } finally {
                DB::setDefaultConnection($defaultConnection);
            }

            $this->assertTrue(
                $blockedOnProfileLock,
                'qualifyReferralOnCompletedStay must lock CustomerReferralProfile with lockForUpdate() to prevent concurrent cap overflow.',
            );

            DB::commit();
        } catch (\Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            DB::purge($secondConnection);
            throw $e;
        }

        DB::purge($secondConnection);

        // Now qualify referral B after referral A committed (reaching cap of 5)
        $referralService->qualifyReferralOnCompletedStay($reservationB);

        // Referrer must only receive points for the 5th referral (500 points), NOT the 6th!
        $referrerBonusEntries = CustomerPointsLedger::query()
            ->where('user_id', $referrer->id)
            ->where('transaction_type', PointsTransactionType::ReferralBonusReferrer)
            ->get();
        $this->assertCount(1, $referrerBonusEntries);
        $this->assertSame(500, (int) $referrerBonusEntries->sum('points'));
        $this->assertSame(2500, (int) $profile->fresh()->total_points_earned);
    }
}
