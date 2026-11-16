<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Models\Owner;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class InAppNotificationTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.in_app.enabled', true);
    }

    public function test_in_app_notification_stored_in_database_and_marked_delivered(): void
    {
        $customer = $this->createCustomer();
        $dispatcher = app(NotificationDispatcher::class);

        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-APP-1'],
            idempotencyKey: 'in_app_test_1'
        );

        $this->assertDatabaseHas('notifications', [
            'notifiable_type' => $customer->getMorphClass(),
            'notifiable_id' => $customer->getKey(),
        ]);

        $this->assertDatabaseHas('notification_deliveries', [
            'channel' => 'in_app',
            'status' => 'delivered',
            'provider' => 'database',
        ]);
    }

    public function test_customer_can_retrieve_unread_count(): void
    {
        $customer = $this->createCustomer();
        $dispatcher = app(NotificationDispatcher::class);

        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-CNT-1'],
            idempotencyKey: 'cnt_1'
        );
        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-CNT-2'],
            idempotencyKey: 'cnt_2'
        );

        $response = $this->actingAs($customer, 'web')
            ->getJson('/notifications/unread-count');

        $response->assertOk()
            ->assertJson(['unread_count' => 2]);
    }

    public function test_customer_can_mark_single_notification_as_read(): void
    {
        $customer = $this->createCustomer();
        $dispatcher = app(NotificationDispatcher::class);

        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-RD-1'],
            idempotencyKey: 'rd_1'
        );

        $notification = DB::table('notifications')->where('notifiable_id', $customer->id)->first();
        $this->assertNotNull($notification);
        $this->assertNull($notification->read_at);

        $this->actingAs($customer, 'web')
            ->postJson("/notifications/{$notification->id}/read")
            ->assertOk();

        $updated = DB::table('notifications')->where('id', $notification->id)->first();
        $this->assertNotNull($updated->read_at);
    }

    public function test_customer_can_mark_all_notifications_as_read(): void
    {
        $customer = $this->createCustomer();
        $dispatcher = app(NotificationDispatcher::class);

        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-ALL-1'],
            idempotencyKey: 'all_1'
        );
        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-ALL-2'],
            idempotencyKey: 'all_2'
        );

        $this->actingAs($customer, 'web')
            ->postJson('/notifications/mark-all-read')
            ->assertOk();

        $unreadCount = DB::table('notifications')
            ->where('notifiable_id', $customer->id)
            ->whereNull('read_at')
            ->count();

        $this->assertSame(0, $unreadCount);
    }

    public function test_cross_guard_isolation_owner_cannot_access_customer_notifications(): void
    {
        $customer = $this->createCustomer();
        $partner = $this->createPartner();
        $dispatcher = app(NotificationDispatcher::class);

        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-ISO-1'],
            idempotencyKey: 'iso_1'
        );

        $notification = DB::table('notifications')->where('notifiable_id', $customer->id)->first();

        // Partner attempts to mark customer notification read via owner route
        $this->actingAs($partner, 'owner')
            ->post("/owner/notifications/{$notification->id}/read");

        // Should not mark read because notification belongs to Customer, not Partner
        $updated = DB::table('notifications')->where('id', $notification->id)->first();
        $this->assertNull($updated->read_at);
    }
}
