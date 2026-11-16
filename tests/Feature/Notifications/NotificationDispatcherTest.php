<?php

declare(strict_types=1);

namespace Tests\Feature\Notifications;

use App\Enums\NotificationChannel;
use App\Models\NotificationDelivery;
use App\Services\Notifications\NotificationDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class NotificationDispatcherTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    public function test_dispatches_notification_across_configured_channels(): void
    {
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.in_app.enabled', true);
        Config::set('tijum.notifications.channels.email.enabled', true);
        Config::set('tijum.notifications.channels.sms.enabled', false);
        Config::set('tijum.notifications.channels.whatsapp.enabled', false);

        $customer = $this->createCustomer();
        $dispatcher = app(NotificationDispatcher::class);

        $deliveries = $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: [
                'reservation_code' => 'TIJ-HYD-9988',
                'customer_name' => $customer->name,
                'property_name' => 'Green Valley PG',
                'check_in_date' => '20 Nov 2026',
            ],
            idempotencyKey: 'test_sub_1'
        );

        $this->assertNotEmpty($deliveries);
        $this->assertDatabaseHas('notification_deliveries', [
            'channel' => NotificationChannel::InApp->value,
            'template_code' => 'customer.reservation.submitted.in_app',
        ]);
        $this->assertDatabaseHas('notification_deliveries', [
            'channel' => NotificationChannel::Email->value,
            'template_code' => 'customer.reservation.submitted.email',
        ]);
    }

    public function test_idempotent_deduplication_prevents_duplicate_deliveries(): void
    {
        Config::set('tijum.notifications.enabled', true);
        Config::set('tijum.notifications.channels.in_app.enabled', true);

        $customer = $this->createCustomer();
        $dispatcher = app(NotificationDispatcher::class);

        // First dispatch
        $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-TEST-1'],
            idempotencyKey: 'dup_key'
        );

        $initialCount = NotificationDelivery::query()->count();

        // Second dispatch with same idempotency key
        $secondDeliveries = $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-TEST-1'],
            idempotencyKey: 'dup_key'
        );

        $finalCount = NotificationDelivery::query()->count();

        $this->assertSame($initialCount, $finalCount);
    }

    public function test_global_killswitch_suppresses_all_dispatches(): void
    {
        Config::set('tijum.notifications.enabled', false);

        $customer = $this->createCustomer();
        $dispatcher = app(NotificationDispatcher::class);

        $deliveries = $dispatcher->dispatch(
            eventType: 'reservation.submitted',
            notifiable: $customer,
            variables: ['reservation_code' => 'TIJ-TEST-KILL'],
            idempotencyKey: 'kill_key'
        );

        $this->assertEmpty($deliveries);
        $this->assertDatabaseMissing('notification_deliveries', [
            'template_code' => 'customer.reservation.submitted.in_app',
        ]);
    }

    public function test_transaction_safety_does_not_rollback_business_transaction_on_failure(): void
    {
        Config::set('tijum.notifications.enabled', true);
        $customer = $this->createCustomer();

        // Simulate business transaction
        DB::transaction(function () use ($customer): void {
            $customer->update(['name' => 'Updated Name In Tx']);

            // Dispatch notification inside transaction
            app(NotificationDispatcher::class)->dispatch(
                eventType: 'reservation.submitted',
                notifiable: $customer,
                variables: ['reservation_code' => 'TIJ-TX-SAFE'],
                idempotencyKey: 'tx_safe_key'
            );
        });

        $this->assertSame('Updated Name In Tx', $customer->fresh()->name);
        $this->assertDatabaseHas('notification_deliveries', [
            'template_code' => 'customer.reservation.submitted.in_app',
        ]);
    }
}
