<?php

declare(strict_types=1);

namespace Tests\Feature\Reservations;

use App\Enums\PropertyGenderPolicy;
use App\Enums\PropertyGuestComposition;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyVerificationStatus;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ReservationCreationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_valid_authenticated_submission_creates_awaiting_payment_reservation_with_snapshots(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, quantity: 2);
        $payload['contact_name'] = 'Anya Rao';
        $payload['contact_email'] = 'anya@example.test';
        $payload['contact_phone'] = '+919876543210';

        $response = $this->submitReservation($user, $payload);

        $response->assertRedirect(route('reservations.show', Reservation::query()->first()->booking_reference));

        $reservation = Reservation::query()->where('submission_token', $payload['submission_token'])->first();

        $this->assertPendingReservation($user, $payload['submission_token'], $property, $roomType);
        $this->assertSame('Anya Rao', $reservation->contact_name);
        $this->assertSame('anya@example.test', $reservation->contact_email);
        $this->assertSame('+919876543210', $reservation->contact_phone);
        $this->assertTrue($reservation->snapshot_food_provided);
        $this->assertTrue($reservation->snapshot_breakfast_included);
        $this->assertTrue($reservation->snapshot_lunch_included);
        $this->assertTrue($reservation->snapshot_dinner_included);
        $this->assertTrue($reservation->unit_rate_minor > 0);
        $this->assertTrue($reservation->total_amount_minor > 0);
    }

    public function test_guest_cannot_create_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);

        $this->post(route('reservations.store'), $this->validReservationPayload($property, $roomType))
            ->assertRedirect(route('login'));
    }

    public function test_unverified_customer_cannot_create_reservation(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = User::factory()->unverified()->create();

        $this->actingAs($user, 'web')
            ->post(route('reservations.store'), $this->validReservationPayload($property, $roomType))
            ->assertRedirect(route('verification.notice'));
    }

    public function test_duplicate_submission_token_is_idempotent(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $token = (string) Str::uuid();
        $checkIn = CarbonImmutable::now('Asia/Kolkata')->addDays(5)->startOfDay()->toDateString();

        $payload1 = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 2);
        $payload1['submission_token'] = $token;

        $payload2 = $this->validReservationPayload($property, $roomType, $checkIn, quantity: 5);
        $payload2['submission_token'] = $token;

        $this->submitReservation($user, $payload1)->assertRedirect();
        $this->submitReservation($user, $payload2)->assertRedirect();

        $this->assertCount(1, Reservation::query()->where('user_id', $user->id)->where('submission_token', $token)->get());
        $reservation = Reservation::query()->where('user_id', $user->id)->where('submission_token', $token)->first();
        $this->assertSame(2, $reservation->quantity);
    }

    public function test_ineligible_gender_is_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, gender: PropertyGenderPolicy::FemaleOnly->value);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, overrides: ['guest_gender' => 'male']);

        $this->submitReservation($user, $payload)
            ->assertSessionHasErrors('guest_gender');
    }

    public function test_ineligible_composition_is_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property, composition: [PropertyGuestComposition::Families->value]);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, overrides: ['guest_composition' => 'individuals']);

        $this->submitReservation($user, $payload)
            ->assertSessionHasErrors('guest_composition');
    }

    public function test_past_check_in_date_is_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, CarbonImmutable::now('Asia/Kolkata')->subDays(2)->toDateString());

        $this->submitReservation($user, $payload)
            ->assertSessionHasErrors('check_in_date');
    }

    public function test_non_bookable_property_is_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createProperty($owner, approved: true, appStatus: PropertyVerificationStatus::Approved, opStatus: PropertyOperationalStatus::Draft);
        $roomType = $this->createBookableRoomType($property);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType);

        $this->submitReservation($user, $payload)
            ->assertSessionHasErrors('reservation');
    }

    public function test_inactive_property_and_room_type_are_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $property->forceFill(['status' => PropertyOperationalStatus::TemporarilyClosed->value])->save();
        $this->submitReservation($user, $this->validReservationPayload($property, $roomType))
            ->assertSessionHasErrors('reservation');

        $property->forceFill(['status' => PropertyOperationalStatus::Active->value])->save();
        $roomType->forceFill(['is_active' => false])->save();
        $payload = $this->validReservationPayload($property, $roomType);
        $payload['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user, $payload)
            ->assertSessionHasErrors('reservation');
    }

    public function test_property_without_food_and_unconfigured_selected_rate_are_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner, foodProvided: false);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $user = $this->createCustomerUser();

        $this->submitReservation($user, $this->validReservationPayload($property, $roomType))
            ->assertSessionHasErrors('reservation');

        $property->forceFill(['food_provided' => true])->save();
        $roomType->forceFill(['weekly_rate_minor' => null])->save();
        $payload = $this->validReservationPayload($property, $roomType, durationType: 'weekly');
        $payload['submission_token'] = (string) Str::uuid();
        $this->submitReservation($user, $payload)
            ->assertSessionHasErrors('reservation');
    }

    public function test_invalid_quantity_guest_count_and_duration_are_rejected(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $user = $this->createCustomerUser();

        $payload = $this->validReservationPayload($property, $roomType, quantity: 0);
        $payload['guest_count'] = 2;
        $payload['duration_quantity'] = 31;

        $this->submitReservation($user, $payload)
            ->assertSessionHasErrors(['quantity', 'guest_count', 'duration_quantity']);
    }

    public function test_phase_twelve_introduces_no_bed_inventory_table(): void
    {
        $this->assertFalse(Schema::hasTable('property_beds'));
    }
}
