<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class AuthenticationApiTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_customer_can_register_via_api(): void
    {
        $payload = [
            'name' => 'Sita Raman',
            'email' => 'sita@example.test',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
            'phone' => '+919876543210',
            'marketing_consent' => true,
            'device_name' => 'iPhone 15 Pro',
        ];

        $response = $this->postJson('/api/v1/auth/customer/register', $payload);

        $response->assertCreated()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'token',
                    'token_type',
                    'expires_at',
                    'user' => [
                        'id',
                        'name',
                        'email',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'sita@example.test',
            'name' => 'Sita Raman',
        ]);
    }

    public function test_customer_can_login_via_api(): void
    {
        $user = User::factory()->create([
            'email' => 'customer.api@example.test',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/customer/login', [
            'email' => 'customer.api@example.test',
            'password' => 'password123',
            'device_name' => 'Pixel 9',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'customer.api@example.test');

        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_owner_can_login_via_api(): void
    {
        $owner = $this->createActiveOwner();
        $owner->forceFill([
            'email' => 'host.api@example.test',
            'password' => Hash::make('partnerSecure123!'),
        ])->save();

        $response = $this->postJson('/api/v1/auth/owner/login', [
            'email' => 'host.api@example.test',
            'password' => 'partnerSecure123!',
            'device_name' => 'Host iPad Air',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.owner.email', 'host.api@example.test');

        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_customer_token_is_rejected_on_owner_routes(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test_customer_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/dashboard');

        $response->assertForbidden();
    }

    public function test_owner_token_is_rejected_on_customer_routes(): void
    {
        $owner = $this->createActiveOwner();
        $token = $owner->createToken('test_owner_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/profile');

        $response->assertForbidden();
    }

    public function test_unauthenticated_request_is_rejected_with_401(): void
    {
        $response = $this->getJson('/api/v1/customer/profile');
        $response->assertUnauthorized();

        $ownerResponse = $this->getJson('/api/v1/owner/dashboard');
        $ownerResponse->assertUnauthorized();
    }

    public function test_customer_can_logout_and_revoke_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('mobile_app_session')->plainTextToken;

        $tokenId = (int) explode('|', $token)[0];
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $tokenId]);

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/customer/logout');

        $response->assertOk()
            ->assertJsonPath('success', true);

        // Token must be deleted from database
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
    }
}
