<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Enums\AdminRole;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Jobs\SendNotificationDeliveryJob;
use App\Models\Admin;
use App\Models\NotificationDelivery;
use App\Services\Notifications\Templates\NotificationTemplateRegistry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class NotificationDispatcher
{
    public function __construct(
        private readonly NotificationEventCatalogue $catalogue,
        private readonly NotificationTemplateRegistry $templateRegistry,
        private readonly NotificationPreferenceService $preferenceService
    ) {}

    /**
     * Dispatch an event to one or more recipients across all eligible channels.
     *
     * @param  Model|list<Model>  $recipients
     * @param  array<string, mixed>  $variables
     * @return list<NotificationDelivery>
     */
    public function dispatch(
        string $eventType,
        Model|array $recipients = [],
        array $variables = [],
        ?Model $related = null,
        ?string $relatedReference = null,
        ?string $idempotencySeed = null,
        Model|array|null $notifiable = null,
        ?string $idempotencyKey = null,
    ): array {
        $recipients = $notifiable ?? $recipients;
        $idempotencySeed = $idempotencyKey ?? $idempotencySeed;

        if (! (bool) config('tijum.notifications.enabled', true)) {
            return [];
        }
        try {
            $eventDef = $this->catalogue->get($eventType);
            if ($eventDef === null) {
                Log::warning("NotificationDispatcher: unrecognized event type '{$eventType}'");

                return [];
            }

            $recipientList = is_array($recipients) ? $recipients : [$recipients];
            $deliveries = [];
            $eventId = (string) Str::uuid();

            foreach ($recipientList as $recipient) {
                if (! $recipient instanceof Model) {
                    continue;
                }

                foreach ($eventDef['channels'] as $channel) {
                    $template = $this->templateRegistry->findForEventAndChannel($eventType, $channel);
                    if ($template === null) {
                        continue;
                    }

                    $destination = $this->resolveDestination($recipient, $channel);
                    $seed = $idempotencySeed ?? $relatedReference ?? ($related ? (string) $related->getKey() : $eventId);
                    $idempotencyKey = hash('sha256', "{$eventType}:{$recipient->getMorphClass()}:{$recipient->getKey()}:{$channel->value}:{$seed}");

                    // Check for existing delivery with this idempotency key
                    $existing = NotificationDelivery::query()->where('idempotency_key', $idempotencyKey)->first();
                    if ($existing !== null) {
                        $deliveries[] = $existing;

                        continue;
                    }

                    $isEligible = $this->preferenceService->isChannelEnabledForRecipient(
                        $recipient,
                        $channel,
                        $eventDef['category']
                    );

                    $delivery = NotificationDelivery::query()->create([
                        'event_id' => $eventId,
                        'idempotency_key' => $idempotencyKey,
                        'notifiable_type' => $recipient->getMorphClass(),
                        'notifiable_id' => $recipient->getKey(),
                        'channel' => $channel,
                        'category' => $eventDef['category'],
                        'template_code' => $template->code,
                        'template_version' => $template->version,
                        'recipient_destination' => $destination,
                        'status' => $isEligible ? NotificationDeliveryStatus::Queued : NotificationDeliveryStatus::Suppressed,
                        'provider' => null,
                        'provider_message_id' => null,
                        'attempts' => 0,
                        'subject' => $template->subjectTemplate,
                        'payload' => $variables,
                        'error_code' => $isEligible ? null : 'PREFERENCE_OR_CHANNEL_DISABLED',
                        'error_description' => $isEligible ? null : 'Suppressed by recipient preference or channel configuration.',
                        'related_type' => $related?->getMorphClass(),
                        'related_id' => $related?->getKey(),
                        'related_reference' => $relatedReference,
                    ]);

                    $deliveries[] = $delivery;

                    if ($isEligible) {
                        SendNotificationDeliveryJob::dispatch($delivery)->afterCommit();
                    }
                }
            }

            return $deliveries;
        } catch (Throwable $e) {
            // Absolute transaction safety: notification failures NEVER roll back business transactions
            Log::error('NotificationDispatcher dispatch failed: '.$e->getMessage(), [
                'event' => $eventType,
                'exception' => $e,
            ]);

            return [];
        }
    }

    /**
     * Dispatch an operational event to administrators.
     *
     * @param  array<string, mixed>  $variables
     * @return list<NotificationDelivery>
     */
    public function dispatchToAdmins(
        string $eventType,
        array $variables,
        ?Model $related = null,
        ?string $relatedReference = null,
        ?AdminRole $requiredRole = null,
        ?string $idempotencySeed = null,
    ): array {
        $query = Admin::query()->where('is_active', true);
        if ($requiredRole !== null) {
            $query->where('role', $requiredRole->value);
        }

        $admins = $query->limit(10)->get()->all();

        return $this->dispatch(
            $eventType,
            $admins,
            $variables,
            $related,
            $relatedReference,
            $idempotencySeed,
        );
    }

    private function resolveDestination(Model $recipient, NotificationChannel $channel): ?string
    {
        return match ($channel) {
            NotificationChannel::InApp, NotificationChannel::Push => null,
            NotificationChannel::Email => isset($recipient->email) ? (string) $recipient->email : null,
            NotificationChannel::Sms, NotificationChannel::WhatsApp => isset($recipient->phone) ? (string) $recipient->phone : null,
        };
    }
}
