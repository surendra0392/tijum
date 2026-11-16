<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Services\Notifications\Channels\SmsGatewayManager;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Notifications\Templates\NotificationTemplateRegistry;
use App\Services\Notifications\Templates\TemplateDefinition;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class SmsNotificationTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.sms.enabled', true);
        Config::set('tijum.notifications.channels.sms.mode', 'test');
    }

    public function test_sms_delivery_succeeds_in_simulation_mode_with_valid_indian_number(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        $dispatcher = app(NotificationDispatcher::class);

        $deliveries = $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-SMS-1'],
            idempotencyKey: 'sms_sim_1'
        );

        $delivery = collect($deliveries)->firstWhere('channel', NotificationChannel::Sms);
        $this->assertNotNull($delivery);

        $template = app(NotificationTemplateRegistry::class)->get($delivery->template_code);
        $this->assertNotNull($template);

        app(SmsGatewayManager::class)->send($delivery, $template, [
            'title' => 'Reservation Submitted',
            'body' => 'Your reservation TIJ-SMS-1 is received.',
            'subject' => null,
            'safe_variables' => [],
        ]);

        $this->assertSame(NotificationDeliveryStatus::Accepted, $delivery->fresh()->status);
        $this->assertStringStartsWith('msg91_req_', (string) $delivery->fresh()->provider_message_id);
    }

    public function test_sms_fails_when_destination_phone_is_invalid(): void
    {
        $customer = $this->createCustomer(phone: '+14155552671'); // Non-Indian number
        $dispatcher = app(NotificationDispatcher::class);

        $deliveries = $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-SMS-BAD'],
            idempotencyKey: 'sms_bad_1'
        );

        $delivery = collect($deliveries)->firstWhere('channel', NotificationChannel::Sms);
        $this->assertNotNull($delivery);

        $template = app(NotificationTemplateRegistry::class)->get($delivery->template_code);
        $this->assertNotNull($template);

        app(SmsGatewayManager::class)->send($delivery, $template, [
            'title' => 'Test',
            'body' => 'Test Body',
            'subject' => null,
            'safe_variables' => [],
        ]);

        $this->assertSame(NotificationDeliveryStatus::Failed, $delivery->fresh()->status);
        $this->assertSame('INVALID_PHONE_DESTINATION', $delivery->fresh()->error_code);
    }

    public function test_sms_fails_when_dlt_template_id_is_missing(): void
    {
        $customer = $this->createCustomer(phone: '+919876543210');
        $dispatcher = app(NotificationDispatcher::class);

        $deliveries = $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-SMS-NODLT'],
            idempotencyKey: 'sms_nodlt_1'
        );

        $delivery = collect($deliveries)->firstWhere('channel', NotificationChannel::Sms);
        $this->assertNotNull($delivery);

        // Template definition with missing DLT template ID
        $templateWithoutDlt = new TemplateDefinition(
            code: 'test.no.dlt',
            eventType: 'test.event',
            channel: NotificationChannel::Sms,
            category: NotificationCategory::EssentialTransactional,
            title: 'Test',
            bodyTemplate: 'Test Body',
            dltTemplateId: null
        );

        app(SmsGatewayManager::class)->send($delivery, $templateWithoutDlt, [
            'title' => 'Test',
            'body' => 'Test Body',
            'subject' => null,
            'safe_variables' => [],
        ]);

        $this->assertSame(NotificationDeliveryStatus::Failed, $delivery->fresh()->status);
        $this->assertSame('DLT_TEMPLATE_MISSING', $delivery->fresh()->error_code);
    }
}
