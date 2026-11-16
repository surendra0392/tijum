<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class SessionSeparationAndRevocationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_customer_logout_revokes_token_and_rejects_subsequent_calls(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('mobile_customer_session')->plainTextToken;

        // Verify authorized access prior to logout
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/profile')
            ->assertOk();

        // Perform logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/customer/logout');

        $logoutResponse->assertOk()
            ->assertJsonPath('success', true);

        // Reset auth guard in memory to force token re-validation
        $this->app['auth']->forgetGuards();

        // Subsequent access with revoked token must fail with 401
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/profile')
            ->assertUnauthorized();
    }

    public function test_owner_logout_revokes_token_and_rejects_subsequent_calls(): void
    {
        $owner = $this->createActiveOwner();
        $token = $owner->createToken('mobile_owner_session')->plainTextToken;

        // Verify authorized access prior to logout
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/dashboard')
            ->assertOk();

        // Perform logout
        $logoutResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/owner/logout');

        $logoutResponse->assertOk()
            ->assertJsonPath('success', true);

        // Reset auth guard in memory to force token re-validation
        $this->app['auth']->forgetGuards();

        // Subsequent access with revoked token must fail with 401
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/owner/dashboard')
            ->assertUnauthorized();
    }

    public function test_customer_revoke_all_invalidates_all_active_tokens(): void
    {
        $user = User::factory()->create();
        $token1 = $user->createToken('phone')->plainTextToken;
        $token2 = $user->createToken('tablet')->plainTextToken;

        $this->assertCount(2, $user->tokens);

        // Revoke all tokens
        $response = $this->withHeader('Authorization', 'Bearer '.$token1)
            ->postJson('/api/v1/auth/customer/revoke-all');

        $response->assertOk()
            ->assertJsonPath('success', true);

        // All tokens must be removed
        $this->assertCount(0, $user->fresh()->tokens);

        // Reset auth guard in memory
        $this->app['auth']->forgetGuards();

        // Neither token should work
        $this->withHeader('Authorization', 'Bearer '.$token1)
            ->getJson('/api/v1/customer/profile')
            ->assertUnauthorized();

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token2)
            ->getJson('/api/v1/customer/profile')
            ->assertUnauthorized();
    }

    public function test_owner_revoke_all_invalidates_all_active_tokens(): void
    {
        $owner = $this->createActiveOwner();
        $token1 = $owner->createToken('partner_phone')->plainTextToken;
        $token2 = $owner->createToken('partner_laptop')->plainTextToken;

        $this->assertCount(2, $owner->tokens);

        // Revoke all tokens
        $response = $this->withHeader('Authorization', 'Bearer '.$token1)
            ->postJson('/api/v1/auth/owner/revoke-all');

        $response->assertOk()
            ->assertJsonPath('success', true);

        // All tokens must be removed
        $this->assertCount(0, $owner->fresh()->tokens);

        // Reset auth guard in memory
        $this->app['auth']->forgetGuards();

        // Neither token should work
        $this->withHeader('Authorization', 'Bearer '.$token1)
            ->getJson('/api/v1/owner/dashboard')
            ->assertUnauthorized();

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token2)
            ->getJson('/api/v1/owner/dashboard')
            ->assertUnauthorized();
    }

    public function test_customer_can_list_and_delete_specific_device_token(): void
    {
        $user = User::factory()->create();
        $token1 = $user->createToken('primary_device')->plainTextToken;
        $token2 = $user->createToken('secondary_device')->plainTextToken;

        $tokenId2 = (int) explode('|', $token2)[0];

        // List active tokens
        $listResponse = $this->withHeader('Authorization', 'Bearer '.$token1)
            ->getJson('/api/v1/auth/customer/tokens');

        $listResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data');

        // Delete secondary token
        $deleteResponse = $this->withHeader('Authorization', 'Bearer '.$token1)
            ->deleteJson('/api/v1/auth/customer/tokens/'.$tokenId2);

        $deleteResponse->assertOk()
            ->assertJsonPath('success', true);

        // Reset auth guard in memory
        $this->app['auth']->forgetGuards();

        // Token 2 should now be unauthorized
        $this->withHeader('Authorization', 'Bearer '.$token2)
            ->getJson('/api/v1/customer/profile')
            ->assertUnauthorized();

        $this->app['auth']->forgetGuards();

        // Token 1 remains active
        $this->withHeader('Authorization', 'Bearer '.$token1)
            ->getJson('/api/v1/customer/profile')
            ->assertOk();
    }
}
