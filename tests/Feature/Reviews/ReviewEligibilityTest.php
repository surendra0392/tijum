<?php

declare(strict_types=1);

namespace Tests\Feature\Reviews;

use App\Enums\PaymentStatus;
use App\Enums\RelocationStatus;
use App\Enums\ReservationStatus;
use App\Models\CustomerProtectionCase;
use App\Models\Reservation;
use App\Models\ReservationPayment;
use App\Models\ReservationRelocation;
use App\Services\Reviews\ReviewEligibilityService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\ReviewTestHelpers;
use Tests\TestCase;

class ReviewEligibilityTest extends TestCase
{
    use RefreshDatabase;
    use ReviewTestHelpers;

    private ReviewEligibilityService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(ReviewEligibilityService::class);
    }

    public function test_paid_reservation_with_passed_checkout_is_eligible(): void
    {
        $user = $this->createCustomerUser();
        $reservation = $this->createPaidCompletedReservation(user: $user, daysAgoCheckedOut: 2);

        $result = $this->service->checkEligibility($reservation, $user);

        $this->assertTrue($result->isEligible);
        $this->assertStringContainsString('eligible', $result->reason ?? '');
        $this->assertNotNull($result->windowDeadline);
        $this->assertGreaterThan(0, $result->daysRemaining);
    }

    public function test_reservation_before_scheduled_checkout_is_ineligible(): void
    {
        $user = $this->createCustomerUser();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);

        // Checkout is tomorrow
        $now = CarbonImmutable::now('Asia/Kolkata');
        $reservation = new Reservation;
        $reservation->forceFill([
            'booking_reference' => 'TIJUM-'.strtoupper(Str::random(8)),
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => $now->subDays(1)->toDateString(),
            'checkout_date' => $now->addDays(2)->toDateString(),
            'duration_type' => 'daily',
            'duration_quantity' => 3,
            'total_stay_days' => 3,
            'quantity' => 1,
            'guest_count' => 1,
            'quantity_basis' => 'guest_places',
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => $user->name,
            'contact_email' => $user->email,
            'contact_phone' => '+919999999999',
            'snapshot_property_name' => $property->name,
            'snapshot_room_type_name' => $roomType->name,
            'unit_rate_minor' => 100000,
            'rate_unit' => 'per_guest',
            'total_amount_minor' => 300000,
            'status' => ReservationStatus::Confirmed,
            'submitted_at' => $now->subDays(1),
            'confirmed_at' => $now->subDays(1),
            'submission_token' => Str::uuid()->toString(),
        ]);
        $reservation->save();

        ReservationPayment::query()->create([
            'reservation_id' => $reservation->id,
            'user_id' => $user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_test_'.Str::random(10),
            'idempotency_key' => Str::uuid()->toString(),
            'amount_minor' => 300000,
            'currency' => 'INR',
            'status' => PaymentStatus::Captured,
        ]);

        $result = $this->service->checkEligibility($reservation, $user);

        $this->assertFalse($result->isEligible);
        $this->assertStringContainsString('Review is available after scheduled checkout', $result->reason ?? '');
    }

    public function test_unpaid_reservation_is_ineligible(): void
    {
        $user = $this->createCustomerUser();
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);

        $now = CarbonImmutable::now('Asia/Kolkata');
        $reservation = new Reservation;
        $reservation->forceFill([
            'booking_reference' => 'TIJUM-'.strtoupper(Str::random(8)),
            'user_id' => $user->id,
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'check_in_date' => $now->subDays(5)->toDateString(),
            'checkout_date' => $now->subDays(2)->toDateString(),
            'duration_type' => 'daily',
            'duration_quantity' => 3,
            'total_stay_days' => 3,
            'quantity' => 1,
            'guest_count' => 1,
            'quantity_basis' => 'guest_places',
            'guest_gender' => 'male',
            'guest_composition' => 'individuals',
            'contact_name' => $user->name,
            'contact_email' => $user->email,
            'contact_phone' => '+919999999999',
            'snapshot_property_name' => $property->name,
            'snapshot_room_type_name' => $roomType->name,
            'unit_rate_minor' => 100000,
            'rate_unit' => 'per_guest',
            'total_amount_minor' => 300000,
            'status' => ReservationStatus::AwaitingPayment,
            'submitted_at' => $now->subDays(5),
            'submission_token' => Str::uuid()->toString(),
        ]);
        $reservation->save();

        $result = $this->service->checkEligibility($reservation, $user);

        $this->assertFalse($result->isEligible);
        $this->assertStringContainsString('verified captured payment', $result->reason ?? '');
    }

    public function test_cancelled_or_declined_reservation_is_ineligible(): void
    {
        $user = $this->createCustomerUser();
        $reservation = $this->createPaidCompletedReservation(user: $user, daysAgoCheckedOut: 2);
        $reservation->update(['status' => ReservationStatus::Cancelled]);

        $result = $this->service->checkEligibility($reservation, $user);

        $this->assertFalse($result->isEligible);
        $this->assertStringContainsString('Cancelled', $result->reason ?? '');
    }

    public function test_relocation_source_reservation_is_ineligible_while_replacement_is_eligible(): void
    {
        $user = $this->createCustomerUser();
        $owner = $this->createActiveOwner();
        $sourceProperty = $this->createBookableProperty($owner);
        $destProperty = $this->createBookableProperty($owner);
        $sourceRoomType = $this->createBookableRoomType($sourceProperty);
        $destRoomType = $this->createBookableRoomType($destProperty);

        $sourceRes = $this->createPaidCompletedReservation(
            user: $user,
            property: $sourceProperty,
            roomType: $sourceRoomType,
            daysAgoCheckedOut: 2,
        );

        $destRes = $this->createPaidCompletedReservation(
            user: $user,
            property: $destProperty,
            roomType: $destRoomType,
            daysAgoCheckedOut: 1,
        );

        $case = CustomerProtectionCase::query()->create([
            'case_reference' => 'CASE-'.strtoupper(Str::random(8)),
            'reservation_id' => $sourceRes->id,
            'user_id' => $user->id,
            'property_id' => $sourceProperty->id,
            'owner_id' => $owner->id,
            'category' => 'owner_cancelled',
            'status' => 'open',
            'priority' => 'standard',
            'description' => 'Owner cancelled stay.',
        ]);

        $admin = $this->createAdminWithPermissions();

        // Record relocation acceptance
        ReservationRelocation::query()->create([
            'customer_protection_case_id' => $case->id,
            'source_reservation_id' => $sourceRes->id,
            'replacement_reservation_id' => $destRes->id,
            'destination_property_id' => $destProperty->id,
            'destination_room_type_id' => $destRoomType->id,
            'destination_owner_id' => $owner->id,
            'status' => RelocationStatus::Accepted,
            'offered_quantity' => 1,
            'offered_check_in_date' => $destRes->check_in_date,
            'offered_checkout_date' => $destRes->checkout_date,
            'original_amount_minor' => 300000,
            'alternative_amount_minor' => 300000,
            'price_difference_minor' => 0,
            'offer_expires_at' => CarbonImmutable::now()->addHours(2),
            'created_by_admin_id' => $admin->id,
        ]);

        // Source reservation must be barred from accommodation review
        $sourceResult = $this->service->checkEligibility($sourceRes, $user);
        $this->assertFalse($sourceResult->isEligible);
        $this->assertStringContainsString('relocation', $sourceResult->reason ?? '');

        // Destination replacement reservation must be eligible
        $destResult = $this->service->checkEligibility($destRes, $user);
        $this->assertTrue($destResult->isEligible);
    }

    public function test_reservation_outside_30_day_window_is_ineligible(): void
    {
        $user = $this->createCustomerUser();
        // Checked out 35 days ago (window is 30 days)
        $reservation = $this->createPaidCompletedReservation(user: $user, daysAgoCheckedOut: 35);

        $result = $this->service->checkEligibility($reservation, $user);

        $this->assertFalse($result->isEligible);
        $this->assertStringContainsString('review submission window has expired', $result->reason ?? '');
    }

    public function test_different_user_cannot_review_reservation(): void
    {
        $userA = $this->createCustomerUser();
        $userB = $this->createCustomerUser();
        $reservation = $this->createPaidCompletedReservation(user: $userA, daysAgoCheckedOut: 2);

        $result = $this->service->checkEligibility($reservation, $userB);

        $this->assertFalse($result->isEligible);
        $this->assertStringContainsString('does not belong to the authenticated customer', $result->reason ?? '');
    }
}
