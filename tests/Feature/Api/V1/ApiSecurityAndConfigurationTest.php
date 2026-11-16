<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\PropertyOperationalStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class ApiSecurityAndConfigurationTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_public_config_endpoint_does_not_expose_sensitive_secrets(): void
    {
        $response = $this->getJson('/api/v1/public/config');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.currency.code', 'INR')
            ->assertJsonPath('data.stay_timing_policy.check_in_time', '09:00:00')
            ->assertJsonPath('data.stay_timing_policy.check_out_time', '08:00:00');

        $content = $response->getContent();
        $this->assertIsString($content);

        // Security check: verify zero sensitive backend secrets are leaked
        $forbiddenKeys = [
            'key_secret',
            'webhook_secret',
            'msg91_auth_key',
            'whatsapp_access_token',
            'meta_app_secret',
            'db_password',
            'app_key',
            'jwt_secret',
        ];

        foreach ($forbiddenKeys as $forbiddenKey) {
            $this->assertStringNotContainsStringIgnoringCase(
                $forbiddenKey,
                $content,
                "Public config must never expose sensitive key: {$forbiddenKey}"
            );
        }
    }

    public function test_customer_registration_defaults_marketing_consent_to_false_when_omitted(): void
    {
        $payload = [
            'name' => 'Privacy Conscious User',
            'email' => 'privacy@example.test',
            'password' => 'SafePass12345!',
            'password_confirmation' => 'SafePass12345!',
            'phone' => '+919811122233',
            // marketing_consent omitted deliberately
        ];

        $response = $this->postJson('/api/v1/auth/customer/register', $payload);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $user = User::query()->where('email', 'privacy@example.test')->first();
        $this->assertNotNull($user);
        $this->assertSame(false, $response->json('data.user.marketing_consent'));
    }

    public function test_customer_token_is_rejected_on_owner_endpoints(): void
    {
        $customer = $this->createCustomerUser();
        $customerToken = $customer->createToken('customer_mobile')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson('/api/v1/owner/dashboard')
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson('/api/v1/owner/properties')
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson('/api/v1/owner/reservations')
            ->assertForbidden();
    }

    public function test_owner_token_is_rejected_on_customer_endpoints(): void
    {
        $owner = $this->createActiveOwner();
        $ownerToken = $owner->createToken('owner_mobile')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->getJson('/api/v1/customer/profile')
            ->assertForbidden();

        $this->withHeader('Authorization', 'Bearer '.$ownerToken)
            ->getJson('/api/v1/customer/reservations')
            ->assertForbidden();
    }

    public function test_malformed_or_forged_bearer_token_is_rejected_with_401(): void
    {
        $this->withHeader('Authorization', 'Bearer invalid_forged_token_value_xyz')
            ->getJson('/api/v1/customer/profile')
            ->assertUnauthorized();

        $this->withHeader('Authorization', 'Bearer 999999|malformedtokenhash')
            ->getJson('/api/v1/owner/dashboard')
            ->assertUnauthorized();
    }

    public function test_public_properties_endpoint_only_lists_approved_active_properties(): void
    {
        $owner = $this->createActiveOwner();

        // Approved active property with room
        $approvedProperty = $this->createBookableProperty($owner);
        $roomType = $this->createBookableRoomType($approvedProperty);
        $this->createActiveRoom($approvedProperty, $roomType);

        // Draft/unapproved property
        $draftProperty = $this->createBookableProperty($owner);
        $draftProperty->forceFill([
            'status' => PropertyOperationalStatus::Draft->value,
            'is_verified' => false,
            'booking_eligible' => false,
        ])->save();

        $response = $this->getJson('/api/v1/public/properties');

        $response->assertOk()
            ->assertJsonPath('success', true);

        $propertyIds = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($approvedProperty->id, $propertyIds);
        $this->assertNotContains($draftProperty->id, $propertyIds);
    }
}
