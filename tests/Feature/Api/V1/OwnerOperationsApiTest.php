<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class OwnerOperationsApiTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_owner_can_view_dashboard_metrics(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/dashboard');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'pending_reservations_count',
                    'confirmed_reservations_count',
                    'properties_count',
                    'monthly_earnings_paise',
                    'statistics' => [
                        'today_arrivals',
                        'today_departures',
                        'in_house_guests',
                        'active_reservations',
                        'pending_reviews',
                        'open_complaints',
                        'unsettled_payout_paise',
                    ],
                    'property_summary' => [
                        'properties_total',
                        'verified_properties',
                        'room_types_total',
                        'rooms_total',
                    ],
                    'onboarding' => [
                        'email_verified',
                        'account_status',
                        'account_status_label',
                        'can_publish_properties',
                    ],
                ],
            ]);
    }

    public function test_owner_can_list_properties(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $token = $owner->createToken('partner_tab')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/properties');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'food_provided',
                    ],
                ],
            ]);
    }

    public function test_owner_can_view_reservation_details_without_approval_actions(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $user = $this->createCustomerUser();
        $payload = $this->validReservationPayload($property, $roomType);
        $customerToken = $user->createToken('cust')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->postJson('/api/v1/customer/reservations', $payload);

        $reference = $createRes->json('data.reference');
        $this->assertNotEmpty($reference);

        // Owner views reservation
        $this->app['auth']->forgetGuards();
        $ownerToken = $owner->createToken('host')->plainTextToken;

        $showRes = $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->getJson("/api/v1/owner/reservations/{$reference}");

        $showRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', ReservationStatus::AwaitingPayment->value);

        // Accept and decline endpoints no longer exist (return 404/405)
        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson("/api/v1/owner/reservations/{$reference}/accept")
            ->assertNotFound();

        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson("/api/v1/owner/reservations/{$reference}/decline")
            ->assertNotFound();
    }

    public function test_owner_can_check_in_and_check_out_guest_via_api(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);

        $user = $this->createCustomerUser();
        $reservation = Reservation::factory()->create([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'user_id' => $user->id,
            'status' => ReservationStatus::Confirmed,
            'check_in_date' => now()->toDateString(),
            'checkout_date' => now()->addDays(5)->toDateString(),
        ]);

        $ownerToken = $owner->createToken('host')->plainTextToken;

        // 1. Check in
        $checkInRes = $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/check-in", [
                'notes' => 'Guest arrived with valid Aadhaar ID',
            ]);

        $checkInRes->assertOk()
            ->assertJsonPath('success', true);

        $reservation->refresh();
        $this->assertNotNull($reservation->checked_in_at);

        // 2. Check out
        $checkOutRes = $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->postJson("/api/v1/owner/reservations/{$reservation->booking_reference}/check-out", [
                'notes' => 'Room inspection clear, key returned',
            ]);

        $checkOutRes->assertOk()
            ->assertJsonPath('success', true);

        $reservation->refresh();
        $this->assertNotNull($reservation->checked_out_at);
    }

    public function test_customer_and_owner_reservation_stage_filters_return_only_matching_stays(): void
    {
        $owner = $this->createActiveOwner();
        $property = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($property);
        $this->createActiveRoom($property, $roomType);
        $customer = $this->createCustomerUser();

        $upcoming = Reservation::factory()->confirmed()->create([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'user_id' => $customer->id,
            'check_in_date' => now()->addDay()->toDateString(),
            'checkout_date' => now()->addDays(8)->toDateString(),
        ]);

        $past = Reservation::factory()->confirmed()->create([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'user_id' => $customer->id,
            'check_in_date' => now()->subDays(8)->toDateString(),
            'checkout_date' => now()->subDay()->toDateString(),
        ]);

        $cancelled = Reservation::factory()->create([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'user_id' => $customer->id,
            'status' => ReservationStatus::Cancelled,
            'check_in_date' => now()->addDay()->toDateString(),
            'checkout_date' => now()->addDays(8)->toDateString(),
        ]);

        $awaitingPayment = Reservation::factory()->create([
            'property_id' => $property->id,
            'property_room_type_id' => $roomType->id,
            'user_id' => $customer->id,
            'status' => ReservationStatus::AwaitingPayment,
            'check_in_date' => now()->addDay()->toDateString(),
            'checkout_date' => now()->addDays(8)->toDateString(),
        ]);

        $customerToken = $customer->createToken('customer_stages')->plainTextToken;
        $ownerToken = $owner->createToken('owner_stages')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson('/api/v1/customer/reservations?stage=upcoming')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $upcoming->id);

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson('/api/v1/customer/reservations?stage=awaiting_action')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $awaitingPayment->id);

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->getJson('/api/v1/owner/reservations?stage=past')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $past->id);

        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->getJson('/api/v1/owner/reservations?stage=cancelled')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $cancelled->id);
    }

    public function test_owner_can_view_financial_summary(): void
    {
        $owner = $this->createActiveOwner();
        $token = $owner->createToken('host')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/financial/summary');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'total_settled_paise',
                    'pending_payout_paise',
                ],
            ]);
    }

    public function test_owner_can_view_and_update_profile_via_api(): void
    {
        $owner = $this->createActiveOwner([
            'name' => 'Original Host',
            'phone' => '+91 9988776655',
        ]);
        $token = $owner->createToken('host')->plainTextToken;

        // 1. View profile
        $viewRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/profile');

        $viewRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Original Host')
            ->assertJsonPath('data.email', $owner->email)
            ->assertJsonPath('data.phone', '+91 9988776655')
            ->assertJsonPath('data.account_type', 'partner');

        // 2. Update profile
        $updateRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/owner/profile', [
                'name' => 'Updated Host Name',
                'email' => $owner->email,
                'phone' => '+91 9123456789',
            ]);

        $updateRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Updated Host Name')
            ->assertJsonPath('data.phone', '+91 9123456789');

        $this->assertDatabaseHas('owners', [
            'id' => $owner->id,
            'name' => 'Updated Host Name',
            'phone' => '+91 9123456789',
        ]);
    }

    public function test_owner_can_update_password_via_api(): void
    {
        $owner = $this->createActiveOwner([
            'password' => 'OldPassword123!',
        ]);
        $token = $owner->createToken('host')->plainTextToken;

        // 1. Wrong current password
        $failRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/owner/password', [
                'current_password' => 'WrongPassword!',
                'password' => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ]);

        $failRes->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'INVALID_PASSWORD');

        // 2. Successful password update
        $successRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->putJson('/api/v1/owner/password', [
                'current_password' => 'OldPassword123!',
                'password' => 'NewSecurePassword123!',
                'password_confirmation' => 'NewSecurePassword123!',
            ]);

        $successRes->assertOk()
            ->assertJsonPath('success', true);

        $owner->refresh();
        $this->assertTrue(Hash::check('NewSecurePassword123!', $owner->password));
    }
}
