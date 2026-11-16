<?php

declare(strict_types=1);

namespace App\Services\Notifications\Channels;

use App\Enums\NotificationDeliveryStatus;
use App\Models\NotificationDelivery;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InAppDatabaseChannel
{
    public function send(NotificationDelivery $delivery, array $rendered): void
    {
        $recipient = $delivery->notifiable;
        if ($recipient === null) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_description' => 'Notifiable recipient model not found.',
                'failed_at' => now(),
            ]);

            return;
        }

        $notificationId = (string) Str::uuid();
        $payload = array_merge($delivery->payload ?? [], [
            'title' => $rendered['title'],
            'body' => $rendered['body'],
            'event_type' => $delivery->template_code,
            'related_reference' => $delivery->related_reference,
            'action_url' => $delivery->payload['action_url'] ?? null,
        ]);

        DB::table('notifications')->insert([
            'id' => $notificationId,
            'type' => 'App\\Notifications\\TijumDatabaseNotification',
            'notifiable_type' => $recipient->getMorphClass(),
            'notifiable_id' => $recipient->getKey(),
            'data' => json_encode($payload, JSON_THROW_ON_ERROR),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $delivery->update([
            'status' => NotificationDeliveryStatus::Delivered,
            'provider' => 'database',
            'provider_message_id' => $notificationId,
            'delivered_at' => now(),
        ]);
    }
}
