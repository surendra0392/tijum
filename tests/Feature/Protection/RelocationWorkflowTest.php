<?php

declare(strict_types=1);

namespace Tests\Feature\Protection;

use App\Actions\Protection\CreateRelocationOffer;
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
use App\Services\Protection\RelocationMatchingService;
use App\Services\ReservationAvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class RelocationWorkflowTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_relocation_matching_service_finds_eligible_city_properties(): void
    {
        $owner1 = $this->createActiveOwner(['email' => 'host1@example.com']);
        $owner2 = $this->createActiveOwner(['email' => 'host2@example.com']);

        // Source property in City A
        $propertyA = $this->createBookableProperty($owner1, foodProvided: true);
        $roomTypeA = $this->createBookableRoomType($propertyA, maxGuests: 1, dailyRate: 100000);
        $this->createActiveRoom($propertyA, $roomTypeA);

        // Destination property in same City A
        $propertyB = $this->createBookableProperty($owner2, foodProvided: true);
        $propertyB->forceFill(['city_id' => $propertyA->city_id])->save();
        $roomTypeB = $this->createBookableRoomType($propertyB, maxGuests: 1, dailyRate: 80000);
        $this->createActiveRoom($propertyB, $roomTypeB);

        $customer = $this->createCustomerUser();
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();

        $payload = $this->validReservationPayload($propertyA, $roomTypeA, $checkIn);
        $this->submitReservation($customer, $payload);
        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        $matcher = app(RelocationMatchingService::class);
        $matches = $matcher->findAlternatives($reservation);

        $this->assertNotEmpty($matches);
        $match = collect($matches)->firstWhere('property_id', $propertyB->id);
        $this->assertNotNull($match);
        $this->assertSame($roomTypeB->id, $match['room_type_id']);
        $this->assertSame(0, $match['customer_additional_cost_minor']);
        // Cheaper alternative should yield a refund difference to customer
        $this->assertGreaterThan(0, $match['refund_due_to_customer_minor']);
    }

    public function test_full_relocation_workflow_owner_accept_and_customer_accept_with_replacement(): void
    {
        $owner1 = $this->createActiveOwner(['email' => 'src_host@example.com']);
        $owner2 = $this->createActiveOwner(['email' => 'dest_host@example.com']);

        $propertyA = $this->createBookableProperty($owner1, foodProvided: true);
        $roomTypeA = $this->createBookableRoomType($propertyA, maxGuests: 1, dailyRate: 100000);
        $this->createActiveRoom($propertyA, $roomTypeA);

        $propertyB = $this->createBookableProperty($owner2, foodProvided: true);
        $propertyB->forceFill(['city_id' => $propertyA->city_id])->save();
        $roomTypeB = $this->createBookableRoomType($propertyB, maxGuests: 1, dailyRate: 90000);
        $this->createActiveRoom($propertyB, $roomTypeB);

        $customer = $this->createCustomerUser();
        $lifecycle = app(ReservationLifecycle::class);
        $availability = app(ReservationAvailabilityService::class);

        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(3)->toDateString();
        $checkout = CarbonImmutable::now('Asia/Kolkata')->addDays(4)->toDateString();

        $payload = $this->validReservationPayload($propertyA, $roomTypeA, $checkIn);
        $this->submitReservation($customer, $payload);
        $sourceReservation = Reservation::query()->where('submission_token', $payload['submission_token'])->firstOrFail();

        // Move to awaiting_payment and confirm
        $sourceReservation->forceFill([
            'status' => ReservationStatus::AwaitingPayment->value,
            'payment_deadline_at' => now()->addMinutes(15),
        ])->save();

        $payment = new ReservationPayment;
        $payment->forceFill([
            'reservation_id' => $sourceReservation->id,
            'user_id' => $customer->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_reloc_flow',
            'gateway_payment_id' => 'pay_reloc_flow',
            'idempotency_key' => 'idemp_reloc_flow',
            'amount_minor' => $sourceReservation->total_amount_minor,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
            'captured_at' => CarbonImmutable::now(),
        ])->save();

        $lifecycle->confirmPaid($sourceReservation, $payment);

        // Host cancels -> Creates protection case
        $case = CustomerProtectionCase::create([
            'case_reference' => 'TPC-2026-TESTRELOCATIONCASE01',
            'reservation_id' => $sourceReservation->id,
            'user_id' => $customer->id,
            'property_id' => $propertyA->id,
            'owner_id' => $owner1->id,
            'category' => CaseCategory::OwnerCancelled,
            'status' => CaseStatus::Open,
            'priority' => CasePriority::Urgent,
            'description' => 'Host reported building plumbing failure.',
            'sla_due_at' => now()->addDays(30),
        ]);

        $admin = Admin::factory()->create([
            'role' => AdminRole::SuperAdmin,
            'is_active' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        // 1. Admin creates relocation offer
        $offerAction = app(CreateRelocationOffer::class);
        $relocation = $offerAction->execute(
            sourceReservation: $sourceReservation,
            admin: $admin,
            data: [
                'destination_property_id' => $propertyB->id,
                'destination_room_type_id' => $roomTypeB->id,
                'admin_notes' => 'Host cannot fulfill stay.',
            ],
            case: $case,
        );

        $this->assertSame(RelocationStatus::Draft, $relocation->status);
        $this->assertNull($relocation->destination_owner_accepted_at);

        // 2. Destination owner accepts relocation
        $this->actingAs($owner2, 'owner')
            ->post(route('owner.relocations.respond', $relocation->id), [
                'decision' => 'accept',
                'notes' => 'Room is ready for guest.',
            ])
            ->assertRedirect();

        $relocation->refresh();
        $this->assertSame(RelocationStatus::Offered, $relocation->status);
        $this->assertNotNull($relocation->destination_owner_accepted_at);

        // 3. Customer accepts relocation offer
        $this->actingAs($customer, 'web')
            ->post(route('relocations.decision', $relocation->id), [
                'decision' => 'accepted',
            ])
            ->assertRedirect();

        $relocation->refresh();
        $this->assertSame(RelocationStatus::Accepted, $relocation->status);
        $this->assertSame('accepted', $relocation->customer_decision);
        $this->assertNotNull($relocation->replacement_reservation_id);

        // Check replacement reservation
        $replacement = $relocation->replacementReservation;
        $this->assertNotNull($replacement);
        $this->assertSame(ReservationStatus::Confirmed, $replacement->status);
        $this->assertSame($propertyB->id, $replacement->property_id);
        $this->assertSame($roomTypeB->id, $replacement->property_room_type_id);
        $this->assertTrue((bool) $replacement->is_relocated_replacement);
        $this->assertSame($sourceReservation->id, $replacement->original_reservation_id);

        // Original reservation is cancelled and its capacity released
        $sourceReservation->refresh();
        $this->assertSame(ReservationStatus::Cancelled, $sourceReservation->status);
        $this->assertSame(1, $availability->stayCapacity($roomTypeA, $checkIn, $checkout, 1)['minimum_remaining']);

        // Case status advanced
        $case->refresh();
        $this->assertSame(CaseStatus::Resolved, $case->status);
    }
}
