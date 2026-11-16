<?php

declare(strict_types=1);

namespace Tests\Feature\Financial;

use App\Actions\Financial\RecordRelocationSubsidy;
use App\Enums\AdminRole;
use App\Enums\ReservationStatus;
use App\Models\Admin;
use App\Models\PlatformRelocationSubsidy;
use App\Models\Reservation;
use App\Services\Financial\SettlementCalculationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class RelocationFinancialTreatmentTest extends TestCase
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

    public function test_cancelled_origin_reservation_is_excluded_from_settlement(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1);
        $this->submitReservation($user, $payload)->assertRedirect();
        $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        // Mark as cancelled due to relocation
        $res->forceFill([
            'status' => ReservationStatus::Cancelled,
            'cancelled_at' => now(),
            'cancellation_reason' => 'Relocated by platform',
        ])->save();

        $service = app(SettlementCalculationService::class);
        $eligible = $service->getEligibleReservations($owner);

        $this->assertCount(0, $eligible);
    }

    public function test_more_expensive_destination_records_platform_subsidy(): void
    {
        $admin = $this->createFinanceAdmin();
        $owner1 = $this->createActiveOwner(['email' => 'owner1@example.com']);
        $owner2 = $this->createActiveOwner(['email' => 'owner2@example.com']);

        $property1 = $this->createBookableProperty($owner1);
        $roomType1 = $this->createBookableRoomType($property1, dailyRate: 100000); // ₹1,000
        $this->createActiveRoom($property1, $roomType1);

        $property2 = $this->createBookableProperty($owner2);
        $roomType2 = $this->createBookableRoomType($property2, dailyRate: 140000); // ₹1,400
        $this->createActiveRoom($property2, $roomType2);

        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload1 = $this->validReservationPayload($property1, $roomType1, $checkIn, durationQuantity: 1);
        $this->submitReservation($user, $payload1)->assertRedirect();
        $sourceRes = Reservation::query()->where('submission_token', $payload1['submission_token'])->firstOrFail();

        $payload2 = $this->validReservationPayload($property2, $roomType2, $checkIn, durationQuantity: 1);
        $this->submitReservation($user, $payload2)->assertRedirect();
        $destRes = Reservation::query()->where('submission_token', $payload2['submission_token'])->firstOrFail();

        $action = app(RecordRelocationSubsidy::class);
        $subsidy = $action->execute(
            sourceReservation: $sourceRes,
            replacementReservation: $destRes,
            sourceAmountMinor: 100000,
            destinationAmountMinor: 140000,
            admin: $admin,
        );

        $this->assertInstanceOf(PlatformRelocationSubsidy::class, $subsidy);
        $this->assertSame(40000, $subsidy->subsidy_amount_minor); // ₹400 difference in integer paise
        $this->assertSame($sourceRes->id, $subsidy->source_reservation_id);
        $this->assertSame($destRes->id, $subsidy->replacement_reservation_id);
        $this->assertSame('PLATFORM_OPS_SUBSIDY', $subsidy->funding_reference);
    }

    public function test_cheaper_destination_does_not_create_subsidy(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, dailyRate: 100000);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn, durationQuantity: 1);
        $this->submitReservation($user, $payload)->assertRedirect();
        $res = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $action = app(RecordRelocationSubsidy::class);
        $subsidy = $action->execute(
            sourceReservation: $res,
            replacementReservation: $res,
            sourceAmountMinor: 150000, // ₹1,500
            destinationAmountMinor: 120000, // ₹1,200 (cheaper)
        );

        $this->assertNull($subsidy);
    }
}
