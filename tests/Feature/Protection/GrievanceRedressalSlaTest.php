<?php

declare(strict_types=1);

namespace Tests\Feature\Protection;

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class GrievanceRedressalSlaTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_statutory_slas_and_overdue_computation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($customer, $payload);
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        // 1. Submit Case
        $this->actingAs($customer, 'web')
            ->post(route('reservations.report-problem', $reservation->booking_reference), [
                'category' => CaseCategory::BookingProblem->value,
                'description' => 'Check-in entry was delayed due to lockbox error.',
            ]);

        $case = CustomerProtectionCase::query()->where('reservation_id', $reservation->id)->firstOrFail();

        // Standard case is not overdue initially
        $this->assertFalse($case->isOverdue());

        // Fast-forward past SLA deadline
        $case->forceFill(['sla_due_at' => CarbonImmutable::now()->subHour()])->save();
        $this->assertTrue($case->fresh()->isOverdue());

        // Once resolved, isOverdue() becomes false
        $case->forceFill(['status' => CaseStatus::Resolved])->save();
        $this->assertFalse($case->fresh()->isOverdue());
    }

    public function test_customer_can_view_statutory_printable_complaint_record_copy(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($customer, $payload);
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $case = CustomerProtectionCase::create([
            'case_reference' => 'TPC-2026-PRINTTEST001',
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'owner_id' => $owner->id,
            'category' => CaseCategory::RoomMismatch,
            'status' => CaseStatus::Acknowledged,
            'priority' => CasePriority::Standard,
            'description' => 'Room size was smaller than advertised.',
            'acknowledged_at' => now(),
            'sla_due_at' => now()->addDays(30),
        ]);

        $response = $this->actingAs($customer, 'web')
            ->get(route('support.cases.acknowledgement', $case->case_reference));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('support/acknowledgement')
            ->has('case.case_reference')
            ->has('grievanceOfficer')
        );
    }

    public function test_public_statutory_grievance_redressal_page_renders_officer_details(): void
    {
        $response = $this->get(route('public.grievance-redressal'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('public/grievance-redressal')
            ->has('grievanceOfficer.name')
            ->has('grievanceOfficer.email')
            ->has('slas.acknowledgement_hours')
            ->has('slas.resolution_days')
        );
    }
}
