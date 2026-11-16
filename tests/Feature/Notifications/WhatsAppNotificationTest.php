<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Services\Notifications\Channels\WhatsAppCloudApiChannel;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Notifications\Templates\NotificationTemplateRegistry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class WhatsAppNotificationTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.whatsapp.enabled', true);
        Config::set('tijum.notifications.channels.whatsapp.simulation', true);
    }

    public function test_whatsapp_dispatch_is_suppressed_without_prior_explicit_opt_in(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        // Do NOT grant opt-in

        $dispatcher = app(NotificationDispatcher::class);

        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-WA-NOOPT'],
            idempotencyKey: 'wa_noopt_1'
        );

        $this->assertDatabaseMissing('notification_deliveries', [
            'idempotency_key' => 'wa_noopt_1_whatsapp',
            'status' => 'queued',
        ]);
    }

    public function test_whatsapp_dispatch_succeeds_with_explicit_opt_in(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        $this->optInWhatsApp($customer);

        $dispatcher = app(NotificationDispatcher::class);

        $deliveries = $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: [
                'reservation_code' => 'TIJ-WA-OPT',
                'customer_name' => $customer->name,
                'property_name' => 'Hilltop Homestay',
                'check_in_date' => '25 Nov 2026',
            ],
            idempotencyKey: 'wa_opt_1'
        );

        $delivery = collect($deliveries)->firstWhere('channel', NotificationChannel::WhatsApp);
        $this->assertNotNull($delivery);

        $template = app(NotificationTemplateRegistry::class)->get($delivery->template_code);
        $this->assertNotNull($template);

        app(WhatsAppCloudApiChannel::class)->send($delivery, $template, [
            'title' => 'Reservation Submitted',
            'body' => 'Your reservation TIJ-WA-OPT is submitted.',
            'subject' => null,
            'safe_variables' => [],
        ]);

        $this->assertSame(NotificationDeliveryStatus::Accepted, $delivery->fresh()->status);
        $this->assertStringStartsWith('wamid.', (string) $delivery->fresh()->provider_message_id);
    }
}
