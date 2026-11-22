<?php

declare(strict_types=1);

namespace Tests\Feature\Protection;

use App\Enums\CaseCategory;
use App\Enums\CaseStatus;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class CustomerProtectionCaseTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_customer_can_submit_problem_report_and_case_reference_format(): void
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

        // Customer submits a problem report
        $response = $this->actingAs($customer, 'web')
            ->post(route('reservations.report-problem', $reservation->booking_reference), [
                'category' => CaseCategory::RoomMismatch->value,
                'description' => 'The property host assigned a non-AC room instead of the booked AC room.',
                'priority' => 'standard',
            ]);

        $response->assertRedirect();

        $case = CustomerProtectionCase::query()->where('reservation_id', $reservation->id)->firstOrFail();

        // Reference format: TPC-YYYY-<26-char ULID>
        $year = CarbonImmutable::now()->year;
        $this->assertMatchesRegularExpression("/^TPC-{$year}-[0-9A-Z]{26}$/", $case->case_reference);

        $this->assertSame($customer->id, $case->user_id);
        $this->assertSame($owner->id, $case->owner_id);
        $this->assertSame($property->id, $case->property_id);
        $this->assertSame(CaseCategory::RoomMismatch, $case->category);
        $this->assertSame(CaseStatus::Open, $case->status);

        // SLA due date must be set
        $this->assertNotNull($case->sla_due_at);

        // Initial message recorded
        $this->assertDatabaseHas('customer_protection_case_messages', [
            'customer_protection_case_id' => $case->id,
            'sender_type' => 'customer',
            'sender_id' => $customer->id,
            'sender_name' => $customer->name,
        ]);
    }

    public function test_customer_and_owner_can_exchange_messages_on_case(): void
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

        // Create case
        $this->actingAs($customer, 'web')
            ->post(route('reservations.report-problem', $reservation->booking_reference), [
                'category' => CaseCategory::FoodNotProvided->value,
                'description' => 'Dinner was not served as per the daily inclusion agreement.',
            ]);

        $case = CustomerProtectionCase::query()->where('reservation_id', $reservation->id)->firstOrFail();

        // Owner posts a response
        $this->actingAs($owner, 'owner')
            ->post(route('owner.cases.messages.store', $case->case_reference), [
                'message' => 'We apologize. The cook was delayed; hot meals are now prepared.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('customer_protection_case_messages', [
            'customer_protection_case_id' => $case->id,
            'sender_type' => 'owner',
            'message' => 'We apologize. The cook was delayed; hot meals are now prepared.',
        ]);

        // Customer responds
        $this->actingAs($customer, 'web')
            ->post(route('support.cases.messages.store', $case->case_reference), [
                'message' => 'Thank you, meals have been received now.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('customer_protection_case_messages', [
            'customer_protection_case_id' => $case->id,
            'sender_type' => 'customer',
            'message' => 'Thank you, meals have been received now.',
        ]);
    }

    public function test_unauthorized_customer_cannot_view_or_post_to_others_case(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $customer1 = $this->createCustomerUser(['email' => 'guest1@example.com']);
        $customer2 = $this->createCustomerUser(['email' => 'guest2@example.com']);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $payload = $this->validReservationPayload($property, $roomType, $checkIn);
        $this->submitReservation($customer1, $payload);
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $this->actingAs($customer1, 'web')
            ->post(route('reservations.report-problem', $reservation->booking_reference), [
                'category' => CaseCategory::SafetyConcern->value,
                'description' => 'Electrical switchboard has sparking issues.',
            ]);

        $case = CustomerProtectionCase::query()->where('reservation_id', $reservation->id)->firstOrFail();

        // Customer 2 tries to view -> 403
        $this->actingAs($customer2, 'web')
            ->get(route('support.cases.show', $case->case_reference))
            ->assertForbidden();

        // Customer 2 tries to post message -> rejected
        $this->actingAs($customer2, 'web')
            ->post(route('support.cases.messages.store', $case->case_reference), [
                'message' => 'Intruder message',
            ])
            ->assertSessionHasErrors();
    }
}
