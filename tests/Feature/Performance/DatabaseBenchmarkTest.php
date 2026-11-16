<?php

declare(strict_types=1);

namespace Tests\Feature\Performance;

use App\Actions\Financial\CreatePartnerSettlement;
use App\Actions\Financial\ReleasePartnerSettlement;
use App\Actions\Payments\VerifyCheckoutPayment;
use App\Actions\Protection\ProcessRelocationDecision;
use App\Actions\Reservations\CreateReservation;
use App\Enums\AdminRole;
use App\Enums\FinancialOnboardingStatus;
use App\Enums\LinkedAccountStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReservationStatus;
use App\Enums\SettlementItemType;
use App\Enums\SettlementStatus;
use App\Models\Admin;
use App\Models\OwnerFinancialProfile;
use App\Models\PartnerSettlement;
use App\Models\PartnerSettlementItem;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRelocation;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class DatabaseBenchmarkTest extends TestCase
{
    use ReservationTestHelpers;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'mysql'
            || ! str_ends_with((string) DB::getDatabaseName(), '_test')) {
            $this->markTestSkipped('Requires an isolated MySQL database ending in _test.');
        }
    }

    /**
     * Helper to compute benchmark statistics.
     *
     * @param  list<float>  $durationsMs
     * @return array{min: float, median: float, mean: float, p95: float, max: float, count: int}
     */
    private function computeStats(array $durationsMs): array
    {
        sort($durationsMs);
        $count = count($durationsMs);
        $min = $durationsMs[0];
        $max = $durationsMs[$count - 1];
        $mean = array_sum($durationsMs) / $count;

        $medianIndex = (int) floor($count / 2);
        $median = ($count % 2 === 0)
            ? ($durationsMs[$medianIndex - 1] + $durationsMs[$medianIndex]) / 2
            : $durationsMs[$medianIndex];

        $p95Index = (int) ceil(0.95 * $count) - 1;
        $p95 = $durationsMs[max(0, min($p95Index, $count - 1))];

        return [
            'min' => round($min, 2),
            'median' => round($median, 2),
            'mean' => round($mean, 2),
            'p95' => round($p95, 2),
            'max' => round($max, 2),
            'count' => $count,
        ];
    }

    public function test_benchmark_mysql_innodb_core_transaction_paths(): void
    {
        $iterations = 25; // Reliable sample size for local benchmark
        $results = [];

        // Pre-create shared admin
        $admin = Admin::factory()->create([
            'role' => AdminRole::SuperAdmin,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
            'two_factor_secret' => 'benchmark-secret',
        ]);

        $owner = $this->createActiveOwner(['email' => 'bench_owner_'.uniqid().'@example.com']);
        $profile = OwnerFinancialProfile::create([
            'owner_id' => $owner->id,
            'legal_business_name' => 'Benchmark Stays LLP',
            'business_constitution' => 'llp',
            'pan_number' => 'BENCH1234F',
            'pan_verified_at' => now(),
            'gst_registered' => false,
            'supplier_legal_classification' => 'unregistered',
            'razorpay_account_id' => 'acc_bench_'.uniqid(),
            'linked_account_status' => LinkedAccountStatus::Active,
            'bank_beneficiary_name' => 'Benchmark Stays',
            'bank_account_number_masked' => '•••• •••• 9999',
            'bank_ifsc' => 'HDFC0001234',
            'bank_name' => 'HDFC Bank',
            'onboarding_status' => FinancialOnboardingStatus::Active,
            'verified_at' => now(),
        ]);

        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 50000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser(['email' => 'bench_user_'.uniqid().'@example.com']);

        // -------------------------------------------------------------
        // Path 1: CreateReservation (Transactional write + availability check + quote snapshot)
        // -------------------------------------------------------------
        $createReservationTimes = [];
        for ($i = 0; $i < $iterations; $i++) {
            $uniq = uniqid();
            $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(10 + $i)->toDateString();
            $payload = [
                'submission_token' => (string) Str::uuid(),
                'property_id' => $property->id,
                'property_room_type_id' => $roomType->id,
                'check_in_date' => $checkIn,
                'duration_type' => 'daily',
                'duration_quantity' => 1,
                'quantity' => 1,
                'guest_count' => 1,
                'guest_gender' => 'male',
                'guest_composition' => 'individuals',
                'contact_name' => 'Benchmark Guest',
                'contact_email' => "bench_g_{$uniq}@example.test",
                'contact_phone' => '+919876543210',
                'early_check_in_requested' => false,
            ];

            $start = hrtime(true);
            $res = app(CreateReservation::class)->execute($user, $payload);
            $end = hrtime(true);

            $this->assertNotNull($res->id);
            $createReservationTimes[] = ($end - $start) / 1_000_000;
        }
        $results['CreateReservation'] = $this->computeStats($createReservationTimes);

        // -------------------------------------------------------------
        // Path 2: VerifyCheckoutPayment (Row-locking + signature verification + lifecycle confirm)
        // -------------------------------------------------------------
        $verifyPaymentTimes = [];
        $keySecret = (string) config('tijum.payments.razorpay.key_secret', 'rzp_test_secret');

        for ($i = 0; $i < $iterations; $i++) {
            $uniq = uniqid();
            $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(40 + $i)->toDateString();
            $payload = $this->validReservationPayload($property, $roomType, $checkIn);
            $this->submitReservation($user, $payload);
            $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();
            $res->forceFill([
                'status' => ReservationStatus::AwaitingPayment,
                'payment_deadline_at' => CarbonImmutable::now()->addMinutes(15),
            ])->save();

            $orderId = 'order_bench_'.$uniq;
            $paymentId = 'pay_bench_'.$uniq;
            $signature = hash_hmac('sha256', "{$orderId}|{$paymentId}", $keySecret);

            ReservationPayment::create([
                'reservation_id' => $res->id,
                'user_id' => $user->id,
                'gateway' => 'razorpay',
                'gateway_order_id' => $orderId,
                'idempotency_key' => 'idemp_'.$orderId,
                'amount_minor' => $res->total_amount_minor,
                'currency' => 'INR',
                'status' => PaymentStatus::Created,
            ]);

            Http::fake([
                'https://api.razorpay.com/v1/payments/'.$paymentId => Http::response([
                    'id' => $paymentId,
                    'order_id' => $orderId,
                    'amount' => $res->total_amount_minor,
                    'currency' => 'INR',
                    'status' => 'captured',
                    'method' => 'card',
                ], 200),
            ]);

            $start = hrtime(true);
            $confirmed = app(VerifyCheckoutPayment::class)->execute($res, $user, $orderId, $paymentId, $signature);
            $end = hrtime(true);

            $this->assertSame(ReservationStatus::Confirmed, $confirmed->status);
            $verifyPaymentTimes[] = ($end - $start) / 1_000_000;
        }
        $results['VerifyCheckoutPayment'] = $this->computeStats($verifyPaymentTimes);

        // -------------------------------------------------------------
        // Path 3: ProcessRelocationDecision (Dispute resolution + room reservation update)
        // -------------------------------------------------------------
        $relocationDecisionTimes = [];
        $targetProperty = $this->createBookableProperty($owner);
        $targetRoomType = $this->createBookableRoomType($targetProperty, dailyRate: 50000);
        $this->createActiveRoom($targetProperty, $targetRoomType);

        for ($i = 0; $i < $iterations; $i++) {
            $uniq = uniqid();
            $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(70 + $i)->toDateString();
            $payload = $this->validReservationPayload($property, $roomType, $checkIn);
            $this->submitReservation($user, $payload);
            $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();
            $res->forceFill(['status' => ReservationStatus::Confirmed])->save();

            $relocation = ReservationRelocation::create([
                'source_reservation_id' => $res->id,
                'destination_property_id' => $targetProperty->id,
                'destination_room_type_id' => $targetRoomType->id,
                'destination_owner_id' => $owner->id,
                'created_by_admin_id' => $admin->id,
                'status' => 'offered',
                'offered_quantity' => $res->quantity,
                'offered_check_in_date' => $res->check_in_date,
                'offered_checkout_date' => $res->checkout_date,
                'original_amount_minor' => $res->total_amount_minor,
                'alternative_amount_minor' => $res->total_amount_minor,
                'price_difference_minor' => 0,
                'offer_expires_at' => now()->addHours(24),
            ]);

            $start = hrtime(true);
            $decided = app(ProcessRelocationDecision::class)->execute($relocation, $user, 'declined');
            $end = hrtime(true);

            $this->assertSame('declined', $decided->status->value);
            $relocationDecisionTimes[] = ($end - $start) / 1_000_000;
        }
        $results['ProcessRelocationDecision'] = $this->computeStats($relocationDecisionTimes);

        // -------------------------------------------------------------
        // Path 4: CreatePartnerSettlement (Eligibility calculation + tax snapshot + items write)
        // -------------------------------------------------------------
        $createSettlementTimes = [];
        for ($i = 0; $i < $iterations; $i++) {
            $uniq = uniqid();
            $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
            $payload = $this->validReservationPayload($property, $roomType, $checkIn);
            $this->submitReservation($user, $payload);
            $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();
            $res->forceFill([
                'status' => ReservationStatus::Confirmed,
                'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(10)->toDateString(),
                'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(8)->toDateString(),
            ])->save();

            ReservationPayment::create([
                'reservation_id' => $res->id,
                'user_id' => $user->id,
                'gateway' => 'razorpay',
                'gateway_order_id' => 'order_cs_'.$uniq,
                'gateway_payment_id' => 'pay_cs_'.$uniq,
                'idempotency_key' => 'idemp_cs_'.$uniq,
                'amount_minor' => $res->total_amount_minor,
                'currency' => 'INR',
                'status' => PaymentStatus::Captured,
                'captured_at' => now()->subDays(10),
            ]);

            $start = hrtime(true);
            $settlement = app(CreatePartnerSettlement::class)->execute($owner, $admin, [$res->id]);
            $end = hrtime(true);

            $this->assertSame(SettlementStatus::Draft, $settlement->status);
            $createSettlementTimes[] = ($end - $start) / 1_000_000;
        }
        $results['CreatePartnerSettlement'] = $this->computeStats($createSettlementTimes);

        // -------------------------------------------------------------
        // Path 5: ReleasePartnerSettlement (Row locking + double-transfer check + ledger write)
        // -------------------------------------------------------------
        $releaseSettlementTimes = [];
        for ($i = 0; $i < $iterations; $i++) {
            $uniq = uniqid();
            $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
            $payload = $this->validReservationPayload($property, $roomType, $checkIn);
            $this->submitReservation($user, $payload);
            $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();
            $res->forceFill([
                'status' => ReservationStatus::Confirmed,
                'check_in_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(15)->toDateString(),
                'checkout_date' => CarbonImmutable::now('Asia/Kolkata')->subDays(13)->toDateString(),
            ])->save();

            $payment = ReservationPayment::create([
                'reservation_id' => $res->id,
                'user_id' => $user->id,
                'gateway' => 'razorpay',
                'gateway_order_id' => 'order_rel_'.$uniq,
                'gateway_payment_id' => 'pay_rel_'.$uniq,
                'idempotency_key' => 'idemp_rel_'.$uniq,
                'amount_minor' => 100000,
                'currency' => 'INR',
                'status' => PaymentStatus::Captured,
                'captured_at' => now()->subDays(15),
            ]);

            $settlement = PartnerSettlement::create([
                'settlement_reference' => 'TPS-2026-REL-'.$uniq,
                'owner_id' => $owner->id,
                'owner_financial_profile_id' => $profile->id,
                'period_start' => now()->subDays(15)->toDateString(),
                'period_end' => now()->subDays(13)->toDateString(),
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
                'reservation_id' => $res->id,
                'reservation_payment_id' => $payment->id,
                'item_type' => SettlementItemType::BookingPayable,
                'gross_amount_minor' => 100000,
                'commission_amount_minor' => 10000,
                'commission_tax_amount_minor' => 1800,
                'tax_deduction_minor' => 100,
                'net_payable_minor' => 88100,
                'notes' => 'Bench release item',
            ]);

            $start = hrtime(true);
            $released = app(ReleasePartnerSettlement::class)->execute($settlement, $admin);
            $end = hrtime(true);

            $this->assertSame(SettlementStatus::Settled, $released->status);
            $releaseSettlementTimes[] = ($end - $start) / 1_000_000;
        }
        $results['ReleasePartnerSettlement'] = $this->computeStats($releaseSettlementTimes);

        // Output JSON format for report capture
        file_put_contents(base_path('storage/benchmark_results.json'), json_encode($results, JSON_PRETTY_PRINT));
        echo "\n\n=== BENCHMARK_RESULTS_JSON_START ===\n";
        echo json_encode($results, JSON_PRETTY_PRINT);
        echo "\n=== BENCHMARK_RESULTS_JSON_END ===\n\n";

        $this->assertCount(5, $results);
    }
}
