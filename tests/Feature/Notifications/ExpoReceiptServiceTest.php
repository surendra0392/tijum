<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Models\MobileDevice;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\Notifications\Channels\ExpoReceiptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ExpoReceiptServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_poll_receipts_updates_delivery_to_delivered_on_ok_status(): void
    {
        $user = User::factory()->create();

        $delivery = NotificationDelivery::create([
            'event_id' => 'evt_test_1',
            'idempotency_key' => 'idemp_test_1',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'template_code' => 'reservation_confirmed',
            'channel' => NotificationChannel::Push,
            'category' => NotificationCategory::EssentialTransactional,
            'status' => NotificationDeliveryStatus::Accepted,
            'provider' => 'expo',
            'provider_message_id' => 'ticket_12345',
            'submitted_at' => now()->subMinutes(10),
        ]);

        Http::fake([
            'https://exp.host/--/api/v2/push/getReceipts' => Http::response([
                'data' => [
                    'ticket_12345' => [
                        'status' => 'ok',
                    ],
                ],
            ], 200),
        ]);

        $service = new ExpoReceiptService;
        $updated = $service->pollReceipts();

        $this->assertSame(1, $updated);

        $delivery->refresh();
        $this->assertSame(NotificationDeliveryStatus::Delivered, $delivery->status);
        $this->assertNotNull($delivery->delivered_at);
    }

    public function test_poll_receipts_revokes_device_on_device_not_registered(): void
    {
        $user = User::factory()->create();

        $device = MobileDevice::create([
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'device_installation_id' => 'dev_uuid_123',
            'platform' => 'android',
            'push_token' => 'ExponentPushToken[abc123xyz]',
            'is_active' => true,
            'registered_at' => now(),
        ]);

        $delivery = NotificationDelivery::create([
            'event_id' => 'evt_test_2',
            'idempotency_key' => 'idemp_test_2',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'template_code' => 'reservation_confirmed',
            'channel' => NotificationChannel::Push,
            'category' => NotificationCategory::EssentialTransactional,
            'status' => NotificationDeliveryStatus::Accepted,
            'provider' => 'expo',
            'provider_message_id' => 'ticket_invalid_token',
            'submitted_at' => now()->subMinutes(10),
        ]);

        Http::fake([
            'https://exp.host/--/api/v2/push/getReceipts' => Http::response([
                'data' => [
                    'ticket_invalid_token' => [
                        'status' => 'error',
                        'message' => 'The device has been unregistered.',
                        'details' => [
                            'error' => 'DeviceNotRegistered',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $service = new ExpoReceiptService;
        $updated = $service->pollReceipts();

        $this->assertSame(1, $updated);

        $delivery->refresh();
        $this->assertSame(NotificationDeliveryStatus::Failed, $delivery->status);
        $this->assertSame('DeviceNotRegistered', $delivery->error_code);
        $this->assertNotNull($delivery->failed_at);

        $device->refresh();
        $this->assertFalse($device->is_active);
        $this->assertNotNull($device->revoked_at);
    }
}
