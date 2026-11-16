<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Models\MobileDevice;
use App\Models\NotificationDelivery;
use App\Services\Notifications\Channels\PushNotificationChannel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\ReservationTestHelpers;
use Tests\TestCase;

class PushNotificationChannelTest extends TestCase
{
    use RefreshDatabase;
    use ReservationTestHelpers;

    public function test_push_channel_suppresses_when_no_active_devices_registered(): void
    {
        $user = $this->createCustomerUser();

        $delivery = NotificationDelivery::query()->create([
            'event_id' => (string) str()->uuid(),
            'idempotency_key' => (string) str()->uuid(),
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'category' => NotificationCategory::EssentialTransactional->value,
            'channel' => NotificationChannel::Push->value,
            'template_code' => 'reservation.confirmed.customer',
            'subject' => 'Reservation Confirmed',
            'status' => NotificationDeliveryStatus::Queued,
        ]);

        $channel = new PushNotificationChannel;
        $channel->send($delivery, [
            'title' => 'Booking Confirmed',
            'body' => 'Your booking #123 is confirmed.',
            'subject' => 'Booking Confirmed',
            'safe_variables' => [],
        ]);

        $delivery->refresh();
        $this->assertEquals(NotificationDeliveryStatus::Suppressed, $delivery->status);
        $this->assertEquals('NO_ACTIVE_MOBILE_DEVICES', $delivery->error_code);
    }

    public function test_push_channel_dispatches_to_expo_and_records_accepted_ticket(): void
    {
        $user = $this->createCustomerUser();

        $device = MobileDevice::query()->create([
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'device_installation_id' => 'device-ios-test-111',
            'push_token' => 'ExponentPushToken[validPushToken111]',
            'platform' => 'ios',
            'app_version' => '1.0.0',
            'is_active' => true,
        ]);

        $delivery = NotificationDelivery::query()->create([
            'event_id' => (string) str()->uuid(),
            'idempotency_key' => (string) str()->uuid(),
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'category' => NotificationCategory::EssentialTransactional->value,
            'channel' => NotificationChannel::Push->value,
            'template_code' => 'reservation.confirmed.customer',
            'subject' => 'Reservation Confirmed',
            'status' => NotificationDeliveryStatus::Queued,
        ]);

        Http::fake([
            'https://exp.host/--/api/v2/push/send' => Http::response([
                'data' => [
                    [
                        'id' => 'ticket-expo-999-aaa',
                        'status' => 'ok',
                    ],
                ],
            ], 200),
        ]);

        $channel = new PushNotificationChannel;
        $channel->send($delivery, [
            'title' => 'Booking Confirmed',
            'body' => 'Your reservation is complete.',
            'subject' => 'Booking Confirmed',
            'safe_variables' => [],
        ]);

        $delivery->refresh();
        $this->assertEquals(NotificationDeliveryStatus::Accepted, $delivery->status);
        $this->assertEquals('ticket-expo-999-aaa', $delivery->provider_message_id);
    }

    public function test_push_channel_handles_device_not_registered_and_revokes_device(): void
    {
        $user = $this->createCustomerUser();

        $device = MobileDevice::query()->create([
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'device_installation_id' => 'device-unregistered-999',
            'push_token' => 'ExponentPushToken[unregisteredToken999]',
            'platform' => 'android',
            'app_version' => '1.0.0',
            'is_active' => true,
        ]);

        $delivery = NotificationDelivery::query()->create([
            'event_id' => (string) str()->uuid(),
            'idempotency_key' => (string) str()->uuid(),
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'category' => NotificationCategory::EssentialTransactional->value,
            'channel' => NotificationChannel::Push->value,
            'template_code' => 'reservation.confirmed.customer',
            'subject' => 'Reservation Confirmed',
            'status' => NotificationDeliveryStatus::Queued,
        ]);

        Http::fake([
            'https://exp.host/--/api/v2/push/send' => Http::response([
                'data' => [
                    [
                        'status' => 'error',
                        'message' => '"ExponentPushToken[unregisteredToken999]" is not a registered push token.',
                        'details' => [
                            'error' => 'DeviceNotRegistered',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $channel = new PushNotificationChannel;
        $channel->send($delivery, [
            'title' => 'Booking Confirmed',
            'body' => 'Your reservation is complete.',
            'subject' => 'Booking Confirmed',
            'safe_variables' => [],
        ]);

        // Assert that the mobile device was revoked
        $device->refresh();
        $this->assertFalse($device->is_active);
        $this->assertNotNull($device->revoked_at);

        // Assert delivery status was updated to Failed with DEVICE_NOT_REGISTERED
        $delivery->refresh();
        $this->assertEquals(NotificationDeliveryStatus::Failed, $delivery->status);
        $this->assertEquals('DEVICE_NOT_REGISTERED', $delivery->error_code);
    }
}
