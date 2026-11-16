<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Models\NotificationDelivery;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Queue;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class AdminNotificationOperationsTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.in_app.enabled', true);
        Config::set('tijum.notifications.channels.email.enabled', true);
    }

    public function test_admin_can_access_deliveries_monitoring_index(): void
    {
        $admin = $this->createAdminUser();
        $customer = $this->createCustomer();

        $dispatcher = app(NotificationDispatcher::class);
        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-ADM-1'],
            idempotencyKey: 'adm_1'
        );

        $response = $this->actingAs($admin, 'admin')
            ->get('/admin/notifications');

        $response->assertOk();
    }

    public function test_admin_can_view_single_delivery_audit_details(): void
    {
        $admin = $this->createAdminUser();
        $customer = $this->createCustomer();

        $dispatcher = app(NotificationDispatcher::class);
        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-ADM-SHOW'],
            idempotencyKey: 'adm_show_1'
        );

        $delivery = NotificationDelivery::first();

        $response = $this->actingAs($admin, 'admin')
            ->get("/admin/notifications/{$delivery->id}");

        $response->assertOk();
    }

    public function test_admin_can_manually_retry_failed_delivery(): void
    {
        Queue::fake();

        $admin = $this->createAdminUser();
        $customer = $this->createCustomer();

        $delivery = NotificationDelivery::create([
            'event_id' => 'evt_retry_1',
            'idempotency_key' => 'retry_test_key',
            'notifiable_type' => $customer->getMorphClass(),
            'notifiable_id' => $customer->getKey(),
            'channel' => NotificationChannel::Email,
            'category' => NotificationCategory::EssentialTransactional,
            'template_code' => 'reservation.submitted',
            'recipient_destination' => $customer->email,
            'status' => NotificationDeliveryStatus::Failed,
            'error_code' => 'SMTP_TIMEOUT',
            'error_description' => 'Connection timed out',
        ]);

        $response = $this->actingAs($admin, 'admin')
            ->post("/admin/notifications/{$delivery->id}/retry");

        $response->assertRedirect();
        $this->assertSame(NotificationDeliveryStatus::Queued, $delivery->fresh()->status);
        $this->assertNull($delivery->fresh()->error_code);
    }

    public function test_admin_can_view_templates_registry_and_preview_sample(): void
    {
        $admin = $this->createAdminUser();

        $indexRes = $this->actingAs($admin, 'admin')
            ->get('/admin/notifications/templates');
        $indexRes->assertOk();

        $previewRes = $this->actingAs($admin, 'admin')
            ->postJson('/admin/notifications/templates/preview', [
                'code' => 'customer.reservation.submitted.email',
            ]);

        $previewRes->assertOk()
            ->assertJsonStructure(['code', 'channel', 'title', 'body', 'variables']);
    }

    public function test_admin_can_view_provider_gateways_readiness(): void
    {
        $admin = $this->createAdminUser();

        $response = $this->actingAs($admin, 'admin')
            ->get('/admin/notifications/providers');

        $response->assertOk();
    }
}
