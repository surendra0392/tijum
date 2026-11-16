<?php

declare(strict_types=1);

namespace Tests\Feature\Owner;

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockType;
use App\Enums\ReservationStatus;
use App\Models\CustomerProtectionCase;
use App\Models\PropertyAvailabilityBlock;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class OwnerOperationsModulesTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_owner_can_view_availability_hub_and_update_pricing(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $response = $this->actingAs($owner, 'owner')
            ->get(route('owner.availability.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('owner/availability/index')
                ->has('properties', 1)
                ->where('selectedPropertyId', $property->id)
                ->has('roomTypes', 1)
            );

        // Update room rates and meal configuration
        $updateResponse = $this->actingAs($owner, 'owner')
            ->put(route('owner.availability.pricing.update', $property), [
                'food_provided' => true,
                'breakfast_included' => true,
                'lunch_included' => false,
                'dinner_included' => true,
                'room_types' => [
                    [
                        'id' => $roomType->id,
                        'daily_rate_minor' => 125000,
                        'weekly_rate_minor' => 750000,
                        'monthly_rate_minor' => 2800000,
                    ],
                ],
            ]);

        $updateResponse->assertRedirect();
        $this->assertDatabaseHas('property_room_types', [
            'id' => $roomType->id,
            'daily_rate_minor' => 125000,
            'weekly_rate_minor' => 750000,
            'monthly_rate_minor' => 2800000,
        ]);
        $this->assertDatabaseHas('properties', [
            'id' => $property->id,
            'food_provided' => true,
            'breakfast_included' => true,
            'dinner_included' => true,
        ]);
    }

    public function test_owner_can_create_and_cancel_availability_blocks(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $startDate = CarbonImmutable::now()->addDays(2)->toDateString();
        $endDate = CarbonImmutable::now()->addDays(5)->toDateString();

        $createResponse = $this->actingAs($owner, 'owner')
            ->post(route('owner.availability.blocks.store', $property), [
                'scope' => PropertyAvailabilityBlockScope::Property->value,
                'block_type' => PropertyAvailabilityBlockType::Maintenance->value,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'reason' => 'Annual painting & AC servicing',
            ]);

        $createResponse->assertRedirect();

        $block = PropertyAvailabilityBlock::query()->where('property_id', $property->id)->firstOrFail();
        $this->assertSame(PropertyAvailabilityBlockScope::Property, $block->scope);
        $this->assertSame('Annual painting & AC servicing', $block->reason);

        // Cancel the block
        $cancelResponse = $this->actingAs($owner, 'owner')
            ->delete(route('owner.availability.blocks.cancel', [$property, $block]), [
                'reason' => 'Maintenance completed early',
            ]);

        $cancelResponse->assertRedirect();
        $this->assertNotNull($block->fresh()->cancelled_at);
    }

    public function test_owner_can_view_front_desk_and_process_check_in_and_check_out(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $room = $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();

        $today = CarbonImmutable::now('Asia/Kolkata')->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $today);
        $this->submitReservation($customer, $payload);

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();
        $reservation->forceFill([
            'status' => ReservationStatus::Confirmed,
            'confirmed_at' => CarbonImmutable::now(),
        ])->save();

        // 1. Visit Front Desk
        $deskResponse = $this->actingAs($owner, 'owner')
            ->get(route('owner.front-desk.index'));

        $deskResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('owner/front-desk/index')
                ->where('stats.arrivals_count', 1)
                ->where('stats.in_house_count', 0)
            );

        // 2. Check in guest
        $checkInResponse = $this->actingAs($owner, 'owner')
            ->post(route('owner.front-desk.check-in', $reservation->booking_reference), [
                'notes' => 'Aadhaar verified, key issued for Room 101',
            ]);

        $checkInResponse->assertRedirect();
        $this->assertNotNull($reservation->fresh()->checked_in_at);
        $this->assertSame('Aadhaar verified, key issued for Room 101', $reservation->fresh()->check_in_notes);

        // 3. Now Front Desk shows 1 in-house guest
        $deskAfterCheckIn = $this->actingAs($owner, 'owner')
            ->get(route('owner.front-desk.index'));

        $deskAfterCheckIn->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('stats.arrivals_count', 0)
                ->where('stats.in_house_count', 1)
            );

        // 4. Check out guest
        $checkOutResponse = $this->actingAs($owner, 'owner')
            ->post(route('owner.front-desk.check-out', $reservation->booking_reference), [
                'notes' => 'Key returned, room inspected and clear',
            ]);

        $checkOutResponse->assertRedirect();
        $this->assertNotNull($reservation->fresh()->checked_out_at);
    }

    public function test_owner_can_view_complaints_hub_and_reply_to_case(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(1)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($customer, $payload);
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        // Customer files a complaint
        $case = CustomerProtectionCase::query()->create([
            'case_reference' => 'TPC-2026-TESTCASE00000000000001',
            'reservation_id' => $reservation->id,
            'user_id' => $customer->id,
            'property_id' => $property->id,
            'owner_id' => $owner->id,
            'category' => CaseCategory::RoomMismatch,
            'status' => CaseStatus::AwaitingOwner,
            'priority' => CasePriority::Standard,
            'description' => 'Booked an AC room but given non-AC room.',
            'sla_due_at' => CarbonImmutable::now()->addHours(12),
        ]);

        // 1. Visit Complaints Hub
        $complaintsResponse = $this->actingAs($owner, 'owner')
            ->get(route('owner.complaints.index'));

        $complaintsResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('owner/complaints/index')
                ->where('stats.total_complaints', 1)
                ->where('stats.action_required_count', 1)
            );

        // 2. View Complaint Detail
        $detailResponse = $this->actingAs($owner, 'owner')
            ->get(route('owner.complaints.show', $case->case_reference));

        $detailResponse->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('owner/complaints/show')
                ->where('case.case_reference', $case->case_reference)
            );

        // 3. Post Host Reply
        $replyResponse = $this->actingAs($owner, 'owner')
            ->post(route('owner.complaints.messages.store', $case->case_reference), [
                'message' => 'We apologize for the oversight. We have relocated you to Room 204 with full AC immediately.',
            ]);

        $replyResponse->assertRedirect();
        $this->assertDatabaseHas('customer_protection_case_messages', [
            'customer_protection_case_id' => $case->id,
            'sender_type' => 'owner',
            'message' => 'We apologize for the oversight. We have relocated you to Room 204 with full AC immediately.',
        ]);
    }
}
