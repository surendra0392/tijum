<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
