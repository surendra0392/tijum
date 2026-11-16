<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Models\NotificationDelivery;
use App\Services\Notifications\Channels\EmailNotificationChannel;
use App\Services\Notifications\Channels\InAppDatabaseChannel;
use App\Services\Notifications\Channels\PushNotificationChannel;
use App\Services\Notifications\Channels\SmsGatewayManager;
use App\Services\Notifications\Channels\WhatsAppCloudApiChannel;
use App\Services\Notifications\Templates\NotificationTemplateRegistry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SendNotificationDeliveryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @return list<int>
     */
    public function backoff(): array
    {
        return [10, 60, 300];
    }

    public function __construct(
        public readonly NotificationDelivery $delivery
    ) {
        $isHighPriority = $delivery->category === NotificationCategory::EssentialTransactional
            || str_contains($delivery->template_code, 'auth.')
            || str_contains($delivery->template_code, 'security.')
            || str_contains($delivery->template_code, 'payment.')
            || str_contains($delivery->template_code, 'urgent');

        $queueName = $isHighPriority
            ? (string) config('tijum.notifications.high_priority_queue', config('tijum.notifications.queue', 'notifications'))
            : (string) config('tijum.notifications.queue', 'notifications');

        $this->onQueue($queueName);
    }

    public function handle(
        NotificationTemplateRegistry $registry,
        InAppDatabaseChannel $inAppChannel,
        EmailNotificationChannel $emailChannel,
        SmsGatewayManager $smsManager,
        WhatsAppCloudApiChannel $whatsAppChannel,
        PushNotificationChannel $pushChannel
    ): void {
        $delivery = $this->delivery->fresh();
        if ($delivery === null || $delivery->status->isTerminal()) {
            return;
        }

        $delivery->increment('attempts');
        $delivery->update(['status' => NotificationDeliveryStatus::Sending]);

        $template = $registry->get($delivery->template_code);
        if ($template === null) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'TEMPLATE_NOT_FOUND',
                'error_description' => "Template code '{$delivery->template_code}' was not found in registry.",
                'failed_at' => now(),
            ]);

            return;
        }

        $rendered = $template->render($delivery->payload ?? []);

        match ($delivery->channel) {
            NotificationChannel::InApp => $inAppChannel->send($delivery, $rendered),
            NotificationChannel::Email => $emailChannel->send($delivery, $rendered),
            NotificationChannel::Sms => $smsManager->send($delivery, $template, $rendered),
            NotificationChannel::WhatsApp => $whatsAppChannel->send($delivery, $template, $rendered),
            NotificationChannel::Push => $pushChannel->send($delivery, $rendered),
        };
    }

    public function failed(?Throwable $exception): void
    {
        $this->delivery->fresh()?->update([
            'status' => NotificationDeliveryStatus::Failed,
            'error_code' => 'QUEUE_JOB_FAILED',
            'error_description' => substr($exception?->getMessage() ?? 'Max queue retry attempts exhausted', 0, 500),
            'failed_at' => now(),
        ]);
    }
}
