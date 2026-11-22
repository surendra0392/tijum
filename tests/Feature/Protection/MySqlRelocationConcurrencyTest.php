<?php

declare(strict_types=1);

namespace Tests\Feature\Protection;

use App\Actions\Protection\CreateRelocationOffer;
use App\Actions\Protection\ProcessRelocationDecision;
use App\Actions\Reservations\ReservationLifecycle;
use App\Enums\AdminRole;
use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\PaymentStatus;
use App\Enums\RelocationStatus;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class MySqlRelocationConcurrencyTest extends TestCase
{
    use ReservationTestHelpers;

    public function test_concurrent_relocation_decision_serializes_under_innodb_row_lock(): void
    {
        if (DB::getDriverName() !== 'mysql'
            || ! str_ends_with((string) DB::getDatabaseName(), '_test')) {
            $this->markTestSkipped('Requires an isolated MySQL database ending in _test.');
        }

        $uniq = uniqid();
        $owner1 = $this->createActiveOwner(['email' => "concur_host1_{$uniq}@example.com"]);
        $owner2 = $this->createActiveOwner(['email' => "concur_host2_{$uniq}@example.com"]);

        $propertyA = $this->createBookableProperty($owner1, foodProvided: true);
        $roomTypeA = $this->createBookableRoomType($propertyA, maxGuests: 1, dailyRate: 100000);
        $this->createActiveRoom($propertyA, $roomTypeA);

        $propertyB = $this->createBookableProperty($owner2, foodProvided: true);
        $propertyB->forceFill(['city_id' => $propertyA->city_id])->save();
        $roomTypeB = $this->createBookableRoomType($propertyB, maxGuests: 1, dailyRate: 90000);
        $this->createActiveRoom($propertyB, $roomTypeB);

        $customer = $this->createCustomerUser();
        $lifecycle = app(ReservationLifecycle::class);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(4)->toDateString();
        $payload = $this->validReservationPayload($propertyA, $roomTypeA, $checkIn);
        $this->submitReservation($customer, $payload);
        $sourceReservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $sourceReservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment->value,
            'payment_deadline_at' => now()->addMinutes(15),
        ])->save();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $sourceReservation->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => "order_concur_{$uniq}",
            'gateway_payment_id' => "pay_concur_{$uniq}",
            'idempotency_key' => "idemp_concur_{$uniq}",
            'amount_minor' => $sourceReservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ])->save();

        $lifecycle->confirmPaid($sourceReservation, $payment);

        $case = CustomerProtectionCase::create([
            'case_reference' => "TPC-2026-{$uniq}",
            'reservation_id' => $sourceReservation->id,
            'user_id' => $customer->id,
            'property_id' => $propertyA->id,
            'owner_id' => $owner1->id,
            'category' => CaseCategory::OwnerCancelled,
            'status' => CaseStatus::Open,
            'priority' => CasePriority::Urgent,
            'description' => 'Plumbing breakdown.',
            'sla_due_at' => now()->addDays(30),
        ]);

        $admin = Admin::factory()->create([
            'role' => AdminRole::SuperAdmin,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $offerAction = app(CreateRelocationOffer::class);
        $relocation = $offerAction->execute(
            sourceReservation: $sourceReservation,
            admin: $admin,
            data: [
                'destination_property_id' => $propertyB->id,
                'destination_room_type_id' => $roomTypeB->id,
                'admin_notes' => 'Urgent relocation.',
            ],
            case: $case,
        );

        // Destination host accepts
        $relocation->forceFill([
            'destination_owner_accepted_at' => now(),
            'status' => RelocationStatus::Offered,
        ])->save();

        // Establish second connection holding an exclusive row lock on the relocation offer
        $lockConnName = 'mysql_phase14_lock';
        Config::set(
            'database.connections.'.$lockConnName,
            Config::get('database.connections.'.DB::getDefaultConnection()),
        );
        $lockConnection = DB::connection($lockConnName);
        $lockConnection->beginTransaction();

        $lockConnection->table('reservation_relocations')
            ->where('id', $relocation->id)
            ->lockForUpdate()
            ->first();

        // Set short lock wait timeout on default connection
        DB::statement('SET SESSION innodb_lock_wait_timeout = 1');

        $timedOut = false;
        try {
            app(ProcessRelocationDecision::class)->execute($relocation, $customer, 'accepted');
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

        $this->assertTrue($timedOut, 'Expected ProcessRelocationDecision to wait and time out on InnoDB row lock.');
    }
}
