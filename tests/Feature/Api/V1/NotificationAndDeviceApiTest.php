<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Models\NotificationDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class NotificationAndDeviceApiTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_customer_can_register_and_unregister_mobile_device(): void
    {
        $user = $this->createCustomerUser();
        $token = $user->createToken('phone')->plainTextToken;

        // Register push token
        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/customer/devices/register', [
                'device_installation_id' => 'inst-iphone-test-1234',
                'push_token' => 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
                'platform' => 'ios',
                'app_version' => '1.0.0',
                'device_name' => 'iPhone 15',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.device_installation_id', 'inst-iphone-test-1234');

        $this->assertDatabaseHas('mobile_devices', [
            'device_installation_id' => 'inst-iphone-test-1234',
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'platform' => 'ios',
            'is_active' => true,
        ]);

        // Unregister device
        $unregResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/customer/devices/unregister', [
                'device_installation_id' => 'inst-iphone-test-1234',
            ]);

        $unregResponse->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('mobile_devices', [
            'device_installation_id' => 'inst-iphone-test-1234',
            'is_active' => false,
        ]);
    }

    public function test_owner_can_register_mobile_device(): void
    {
        $owner = $this->createActiveOwner();
        $token = $owner->createToken('partner-android')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/owner/devices/register', [
                'device_installation_id' => 'inst-pixel-host-888',
                'push_token' => 'ExponentPushToken[yyyyyyyHostTokenyyyyyyy]',
                'platform' => 'android',
                'app_version' => '1.0.0',
                'device_name' => 'Pixel 9 Host',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('mobile_devices', [
            'device_installation_id' => 'inst-pixel-host-888',
            'notifiable_type' => $owner->getMorphClass(),
            'notifiable_id' => $owner->id,
            'platform' => 'android',
        ]);
    }

    public function test_customer_can_read_and_mark_notifications_as_read(): void
    {
        $user = $this->createCustomerUser();
        $token = $user->createToken('phone')->plainTextToken;

        // Seed an in-app notification
        $delivery = NotificationDelivery::query()->create([
            'event_id' => (string) str()->uuid(),
            'idempotency_key' => (string) str()->uuid(),
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'category' => NotificationCategory::EssentialTransactional->value,
            'channel' => NotificationChannel::InApp->value,
            'template_code' => 'reservation.confirmed.customer',
            'subject' => 'Reservation Confirmed',
            'payload' => [
                'title' => 'Your reservation is confirmed!',
                'body' => 'Host has accepted and payment was verified.',
            ],
            'status' => 'delivered',
            'delivered_at' => now(),
        ]);

        // Fetch notifications
        $listRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/customer/notifications');

        $listRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.id', $delivery->id)
            ->assertJsonPath('data.0.is_read', false);

        // Mark as read
        $readRes = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/customer/notifications/{$delivery->id}/read");

        $readRes->assertOk()
            ->assertJsonPath('success', true);

        $this->assertNotNull($delivery->fresh()->read_at);
    }
}
