<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\ConsentAction;
use App\Enums\ConsentStatus;
use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Models\NotificationPreference;
use App\Services\Notifications\NotificationDispatcher;
use App\Services\Notifications\NotificationPreferenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class NotificationPreferenceAndConsentTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.in_app.enabled', true);
        Config::set('tijum.notifications.channels.email.enabled', true);
        Config::set('tijum.notifications.channels.sms.enabled', true);
        Config::set('tijum.notifications.channels.whatsapp.enabled', true);
    }

    public function test_customer_can_update_preferences_and_record_whatsapp_opt_in(): void
    {
        $customer = $this->createCustomer();

        $response = $this->actingAs($customer, 'web')
            ->put('/settings/notifications', [
                'in_app_operational' => true,
                'email_operational' => false,
                'sms_operational' => true,
                'whatsapp_opted_in' => true,
            ]);

        $response->assertRedirect();

        // Verify mutable preferences
        $this->assertDatabaseHas('notification_preferences', [
            'notifiable_type' => $customer->getMorphClass(),
            'notifiable_id' => $customer->getKey(),
            'channel' => NotificationChannel::Email->value,
            'category' => NotificationCategory::OperationalUpdate->value,
            'enabled' => false,
        ]);

        // Verify immutable consent audit record
        $this->assertDatabaseHas('notification_consent_records', [
            'notifiable_type' => $customer->getMorphClass(),
            'notifiable_id' => $customer->getKey(),
            'channel' => NotificationChannel::WhatsApp->value,
            'consent_status' => ConsentStatus::OptedIn->value,
            'consent_action' => ConsentAction::Granted->value,
        ]);

        $prefService = app(NotificationPreferenceService::class);
        $this->assertTrue($prefService->hasWhatsAppOptIn($customer));
    }

    public function test_operational_event_is_suppressed_when_channel_is_disabled_by_user(): void
    {
        $customer = $this->createCustomer();
        $prefService = app(NotificationPreferenceService::class);

        // Disable operational email
        NotificationPreference::create([
            'notifiable_type' => $customer->getMorphClass(),
            'notifiable_id' => $customer->getKey(),
            'channel' => NotificationChannel::Email->value,
            'category' => NotificationCategory::OperationalUpdate->value,
            'enabled' => false,
        ]);

        $dispatcher = app(NotificationDispatcher::class);

        // Review invitation is an operational update
        $dispatcher->dispatch(
            eventType: 'review.invitation',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-OP-1'],
            idempotencyKey: 'op_email_test'
        );

        // Email delivery should be suppressed
        $this->assertDatabaseHas('notification_deliveries', [
            'template_code' => 'customer.review.invitation.email',
            'channel' => NotificationChannel::Email->value,
            'status' => 'suppressed',
        ]);
    }

    public function test_essential_transactional_notices_cannot_be_suppressed_by_preferences(): void
    {
        $customer = $this->createCustomer();

        // Attempt to disable email for operational
        NotificationPreference::create([
            'notifiable_type' => $customer->getMorphClass(),
            'notifiable_id' => $customer->getKey(),
            'channel' => NotificationChannel::Email->value,
            'category' => NotificationCategory::OperationalUpdate->value,
            'enabled' => false,
        ]);

        $dispatcher = app(NotificationDispatcher::class);

        // Reservation submitted is an essential transactional notice
        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-ESS-1'],
            idempotencyKey: 'ess_email_test'
        );

        // Email delivery MUST NOT be suppressed, delivered/queued regardless of custom toggle
        $this->assertDatabaseHas('notification_deliveries', [
            'channel' => NotificationChannel::Email->value,
            'category' => NotificationCategory::EssentialTransactional->value,
            'template_code' => 'customer.reservation.submitted.email',
        ]);
        $this->assertDatabaseMissing('notification_deliveries', [
            'template_code' => 'customer.reservation.submitted.email',
            'status' => 'suppressed',
        ]);
    }
}
