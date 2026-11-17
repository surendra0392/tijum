<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Models\MobileDevice;
use App\Models\NotificationDelivery;
use App\Models\WebPushSubscription;
use App\Services\Notifications\Channels\EmailNotificationChannel;
use App\Services\Notifications\Channels\InAppDatabaseChannel;
use App\Services\Notifications\Channels\PushNotificationChannel;
use App\Services\Notifications\Channels\SmsGatewayManager;
use App\Services\Notifications\Channels\WebPushChannel;
use App\Services\Notifications\Channels\WhatsAppCloudApiChannel;
use App\Services\Notifications\Templates\NotificationTemplateRegistry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
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
            || str_contains($delivery->template_code, 'security')
            || str_contains($delivery->template_code, 'payment')
            || str_contains($delivery->template_code, 'refund')
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
        PushNotificationChannel $pushChannel,
        WebPushChannel $webPushChannel
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

        if (! $rendered['is_valid']) {
            $sanitizedSummary = Str::limit(implode(' ', $rendered['validation_errors']), 500);

            Log::error('Notification template validation failed before dispatch.', [
                'delivery_id' => $delivery->id,
                'template_code' => $delivery->template_code,
                'missing_variables' => $rendered['missing_variables'],
            ]);

            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => 'TEMPLATE_VARIABLE_MISSING',
                'error_description' => $sanitizedSummary,
                'failed_at' => now(),
            ]);

            return;
        }

        match ($delivery->channel) {
            NotificationChannel::InApp => $inAppChannel->send($delivery, $rendered),
            NotificationChannel::Email => $emailChannel->send($delivery, $rendered),
            NotificationChannel::Sms => $smsManager->send($delivery, $template, $rendered),
            NotificationChannel::WhatsApp => $whatsAppChannel->send($delivery, $template, $rendered),
            NotificationChannel::Push => $this->dispatchPushChannels($delivery, $rendered, $pushChannel, $webPushChannel),
        };
    }

    /**
     * Dispatch native Expo mobile push and browser Web Push notifications while keeping stores isolated.
     *
     * @param  array{title: string, body: string, subject: ?string, safe_variables: array<string, string>}  $rendered
     */
    private function dispatchPushChannels(
        NotificationDelivery $delivery,
        array $rendered,
        PushNotificationChannel $pushChannel,
        WebPushChannel $webPushChannel
    ): void {
        $hasExpoDevices = MobileDevice::query()
            ->where('notifiable_type', $delivery->notifiable_type)
            ->where('notifiable_id', $delivery->notifiable_id)
            ->active()
            ->whereNotNull('push_token')
            ->exists();

        if ($hasExpoDevices) {
            $pushChannel->send($delivery, $rendered);
        }

        $hasWebPush = WebPushSubscription::query()
            ->where('notifiable_type', $delivery->notifiable_type)
            ->where('notifiable_id', $delivery->notifiable_id)
            ->active()
            ->exists();

        if ($hasWebPush) {
            $webPushChannel->send($delivery, $rendered, updateDeliveryStatus: ! $hasExpoDevices);
        }

        if (! $hasExpoDevices && ! $hasWebPush) {
            $pushChannel->send($delivery, $rendered);
        }
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
