<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\ConsentStatus;
use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Notifications\NotificationPreferenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class NotificationWebhookTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.whatsapp.enabled', true);
        Config::set('tijum.notifications.channels.whatsapp.webhook_verify_token', 'test_verify_token_123');
        Config::set('tijum.notifications.channels.whatsapp.app_secret', 'test_secret_456');
        Config::set('tijum.notifications.channels.sms.webhook_secret', 'test_sms_secret_789');
    }

    public function test_whatsapp_webhook_verification_responds_to_valid_challenge(): void
    {
        $response = $this->get('/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=test_verify_token_123&hub_challenge=challenge_token_xyz');

        $response->assertOk()
            ->assertSee('challenge_token_xyz');
    }

    public function test_whatsapp_webhook_verification_rejects_invalid_token(): void
    {
        $response = $this->get('/webhooks/whatsapp?hub_mode=subscribe&hub_verify_token=wrong_token&hub_challenge=xyz');

        $response->assertForbidden();
    }

    public function test_whatsapp_webhook_updates_delivery_status_to_delivered_and_read(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        $this->optInWhatsApp($customer);

        $dispatcher = app(NotificationDispatcher::class);
        $deliveries = $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-WH-1'],
            idempotencyKey: 'wh_test_1'
        );

        /** @var NotificationDelivery $delivery */
        $delivery = collect($deliveries)->firstWhere('channel', NotificationChannel::WhatsApp);
        $this->assertNotNull($delivery);
        $delivery->update([
            'provider_message_id' => 'wamid.HBgLMTIzNDU2Nzg5MA==',
            'status' => NotificationDeliveryStatus::Accepted,
        ]);

        $payload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'statuses' => [
                                    [
                                        'id' => 'wamid.HBgLMTIzNDU2Nzg5MA==',
                                        'status' => 'delivered',
                                        'timestamp' => '1700000000',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $rawJson = json_encode($payload);
        $signature = 'sha256='.hash_hmac('sha256', $rawJson, 'test_secret_456');

        $response = $this->call(
            method: 'POST',
            uri: '/webhooks/whatsapp',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => $signature,
            ],
            content: $rawJson
        );

        $response->assertOk();
        $this->assertSame(NotificationDeliveryStatus::Delivered, $delivery->fresh()->status);
        $this->assertNotNull($delivery->fresh()->delivered_at);
    }

    public function test_whatsapp_webhook_rejects_missing_signature_when_secret_is_configured(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        $delivery = $this->createDelivery($customer, 'wamid.MISSING_SIGNATURE', NotificationChannel::WhatsApp);

        $response = $this->postJson('/webhooks/whatsapp', [
            'entry' => [[
                'changes' => [[
                    'value' => ['statuses' => [[
                        'id' => 'wamid.MISSING_SIGNATURE',
                        'status' => 'delivered',
                        'timestamp' => '1700000000',
                    ]]],
                ]],
            ]],
        ]);

        $response->assertStatus(401);
        $this->assertNotSame(NotificationDeliveryStatus::Delivered, $delivery->fresh()->status);
    }

    public function test_whatsapp_webhook_rejects_invalid_signature(): void
    {
        $response = $this->call(
            method: 'POST',
            uri: '/webhooks/whatsapp',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => 'sha256=invalid',
            ],
            content: json_encode(['entry' => []]),
        );

        $response->assertStatus(401);
    }

    public function test_sms_webhook_rejects_missing_secret(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        $delivery = $this->createDelivery($customer, 'MSG91-MISSING-SECRET');

        $response = $this->postJson('/webhooks/sms', [
            'requestId' => 'MSG91-MISSING-SECRET',
            'status' => 'delivered',
        ]);

        $response->assertStatus(401);
        $this->assertNotSame(NotificationDeliveryStatus::Delivered, $delivery->fresh()->status);
    }

    public function test_sms_webhook_accepts_configured_secret_and_updates_delivery(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        $delivery = $this->createDelivery($customer, 'MSG91-VALID-SECRET');

        $response = $this->postJson('/webhooks/sms', [
            'requestId' => 'MSG91-VALID-SECRET',
            'status' => 'delivered',
        ], [
            'X-Webhook-Secret' => 'test_sms_secret_789',
        ]);

        $response->assertOk();
        $this->assertSame(NotificationDeliveryStatus::Delivered, $delivery->fresh()->status);
        $this->assertNotNull($delivery->fresh()->delivered_at);
    }

    public function test_sms_webhook_accepts_valid_hmac_signature(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        $delivery = $this->createDelivery($customer, 'MSG91-VALID-SIGNATURE');

        $payload = [
            'requestId' => 'MSG91-VALID-SIGNATURE',
            'status' => 'delivered',
        ];
        $rawJson = json_encode($payload);
        $signature = hash_hmac('sha256', $rawJson, 'test_sms_secret_789');

        $response = $this->call(
            method: 'POST',
            uri: '/webhooks/sms',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_WEBHOOK_SIGNATURE' => $signature,
            ],
            content: $rawJson,
        );

        $response->assertOk();
        $this->assertSame(NotificationDeliveryStatus::Delivered, $delivery->fresh()->status);
    }

    public function test_whatsapp_inbound_stop_message_revokes_consent(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        $this->optInWhatsApp($customer);

        $prefService = app(NotificationPreferenceService::class);
        $this->assertTrue($prefService->hasWhatsAppOptIn($customer));

        $payload = [
            'entry' => [
                [
                    'changes' => [
                        [
                            'field' => 'messages',
                            'value' => [
                                'messages' => [
                                    [
                                        'from' => '919876543210',
                                        'id' => 'wamid.INBOUND_STOP_01',
                                        'type' => 'text',
                                        'text' => ['body' => 'STOP'],
                                        'timestamp' => '1700000010',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $rawJson = json_encode($payload);
        $signature = 'sha256='.hash_hmac('sha256', $rawJson, 'test_secret_456');

        $this->call(
            method: 'POST',
            uri: '/webhooks/whatsapp',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_HUB_SIGNATURE_256' => $signature,
            ],
            content: $rawJson
        )->assertOk();

        // Consent must be revoked
        $this->assertFalse($prefService->hasWhatsAppOptIn($customer));
        $this->assertDatabaseHas('notification_consent_records', [
            'notifiable_id' => $customer->id,
            'channel' => NotificationChannel::WhatsApp->value,
            'consent_status' => ConsentStatus::OptedOut->value,
            'source' => 'whatsapp_inbound_stop',
        ]);
    }

    private function createDelivery(
        User $customer,
        string $providerMessageId,
        NotificationChannel $channel = NotificationChannel::Sms,
    ): NotificationDelivery {
        return NotificationDelivery::query()->create([
            'event_id' => 'evt_'.strtolower($providerMessageId),
            'idempotency_key' => 'test_'.strtolower($providerMessageId),
            'notifiable_type' => $customer::class,
            'notifiable_id' => $customer->id,
            'channel' => $channel,
            'category' => NotificationCategory::EssentialTransactional,
            'template_code' => 'reservation_submitted',
            'status' => NotificationDeliveryStatus::Accepted,
            'provider' => $channel === NotificationChannel::Sms ? 'msg91' : 'meta_whatsapp',
            'provider_message_id' => $providerMessageId,
        ]);
    }
}
