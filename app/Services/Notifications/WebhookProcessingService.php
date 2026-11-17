<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Enums\ConsentAction;
use App\Enums\ConsentStatus;
use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Models\NotificationDelivery;
use App\Models\NotificationWebhookEvent;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class WebhookProcessingService
{
    public function __construct(
        private readonly NotificationPreferenceService $preferenceService
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array{success: bool, message: string}
     */
    public function processWhatsAppWebhook(array $payload, string $rawContent, ?string $signature): array
    {
        // 1. Signature verification. A configured secret makes the signature mandatory.
        $appSecret = (string) (config('tijum.notifications.channels.whatsapp.app_secret') ?: config('services.whatsapp.webhook_secret', ''));
        if ($appSecret !== '') {
            if ($signature === null || $signature === '') {
                Log::warning('WhatsApp Webhook rejected because the signature header is missing.');

                return ['success' => false, 'message' => 'Missing webhook signature.'];
            }

            $expected = 'sha256='.hash_hmac('sha256', $rawContent, $appSecret);
            if (! hash_equals($expected, $signature)) {
                Log::warning('WhatsApp Webhook signature mismatch.');

                return ['success' => false, 'message' => 'Invalid webhook signature.'];
            }
        } elseif (! app()->environment(['local', 'testing'])) {
            Log::error('WhatsApp Webhook rejected because the app secret is not configured.');

            return ['success' => false, 'message' => 'Webhook verification is not configured.'];
        }

        // 2. Persist Webhook Event
        $entries = $payload['entry'] ?? [];
        foreach ($entries as $entry) {
            $changes = $entry['changes'] ?? [];
            foreach ($changes as $change) {
                $val = $change['value'] ?? [];

                // Status updates (sent, delivered, read, failed)
                $statuses = $val['statuses'] ?? [];
                foreach ($statuses as $st) {
                    $wamid = $st['id'] ?? null;
                    $statusStr = $st['status'] ?? null;
                    $timestamp = isset($st['timestamp']) ? Carbon::createFromTimestamp((int) $st['timestamp']) : now();

                    if (! is_string($wamid) || ! is_string($statusStr)) {
                        continue;
                    }

                    NotificationWebhookEvent::query()->create([
                        'provider' => 'meta_whatsapp',
                        'provider_event_id' => $wamid.'_'.$statusStr,
                        'provider_message_id' => $wamid,
                        'event_type' => $statusStr,
                        'payload' => $st,
                        'processed' => true,
                        'processed_at' => now(),
                    ]);

                    $this->updateDeliveryFromWhatsAppStatus($wamid, $statusStr, $timestamp, $st);
                }

                // Inbound messages (Opt-out e.g. "STOP", "UNSUBSCRIBE")
                $messages = $val['messages'] ?? [];
                foreach ($messages as $msg) {
                    $fromPhone = $msg['from'] ?? null;
                    $textBody = strtoupper(trim((string) ($msg['text']['body'] ?? '')));

                    if (is_string($fromPhone) && in_array($textBody, ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'OPT OUT'], true)) {
                        $this->handleInboundOptOut($fromPhone);
                    }
                }
            }
        }

        return ['success' => true, 'message' => 'Webhook processed successfully.'];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{success: bool, message: string}
     */
    public function processSmsWebhook(
        array $payload,
        string $rawContent,
        ?string $signature,
        ?string $secretHeader,
    ): array {
        $webhookSecret = (string) (config('services.sms.webhook_secret') ?: config('tijum.notifications.channels.sms.webhook_secret', ''));

        if ($webhookSecret !== '') {
            $isValidSecret = $secretHeader !== null && hash_equals($webhookSecret, $secretHeader);
            $isValidSignature = false;

            if (! $isValidSecret && $signature !== null && $signature !== '') {
                $providedSignature = str_starts_with($signature, 'sha256=')
                    ? substr($signature, 7)
                    : $signature;
                $expectedSignature = hash_hmac('sha256', $rawContent, $webhookSecret);
                $isValidSignature = hash_equals($expectedSignature, strtolower($providedSignature));
            }

            if (! $isValidSecret && ! $isValidSignature) {
                Log::warning('SMS Webhook signature mismatch.');

                return ['success' => false, 'message' => 'Invalid webhook signature.'];
            }
        } elseif (! app()->environment(['local', 'testing'])) {
            Log::error('SMS Webhook rejected because the webhook secret is not configured.');

            return ['success' => false, 'message' => 'Webhook verification is not configured.'];
        }

        $requestId = $payload['requestId'] ?? $payload['request_id'] ?? null;
        $statusStr = strtolower((string) ($payload['status'] ?? ''));

        if (! is_string($requestId) || $requestId === '') {
            return ['success' => false, 'message' => 'Missing request ID.'];
        }

        NotificationWebhookEvent::query()->create([
            'provider' => 'msg91',
            'provider_event_id' => $requestId.'_'.$statusStr,
            'provider_message_id' => $requestId,
            'event_type' => $statusStr,
            'payload' => $payload,
            'processed' => true,
            'processed_at' => now(),
        ]);

        /** @var NotificationDelivery|null $delivery */
        $delivery = NotificationDelivery::query()->where('provider_message_id', $requestId)->first();
        if ($delivery !== null) {
            if (in_array($statusStr, ['delivrd', 'delivered', 'success'], true)) {
                $delivery->update([
                    'status' => NotificationDeliveryStatus::Delivered,
                    'delivered_at' => now(),
                ]);
            } elseif (in_array($statusStr, ['failed', 'undeliv', 'rejected'], true)) {
                $delivery->update([
                    'status' => NotificationDeliveryStatus::Failed,
                    'error_code' => 'SMS_DELIVERY_REJECTED',
                    'error_description' => (string) ($payload['description'] ?? 'SMS undeliverable by carrier'),
                    'failed_at' => now(),
                ]);
            }
        }

        return ['success' => true, 'message' => 'SMS webhook processed successfully.'];
    }

    private function updateDeliveryFromWhatsAppStatus(string $wamid, string $statusStr, Carbon $timestamp, array $raw): void
    {
        /** @var NotificationDelivery|null $delivery */
        $delivery = NotificationDelivery::query()->where('provider_message_id', $wamid)->first();
        if ($delivery === null) {
            return;
        }

        // Monotonic state progression: Delivered/Read cannot be regressed
        if ($delivery->status === NotificationDeliveryStatus::Read) {
            return;
        }

        if ($delivery->status === NotificationDeliveryStatus::Delivered && $statusStr === 'sent') {
            return;
        }

        match ($statusStr) {
            'sent' => $delivery->update(['submitted_at' => $timestamp]),
            'delivered' => $delivery->update([
                'status' => NotificationDeliveryStatus::Delivered,
                'delivered_at' => $timestamp,
            ]),
            'read' => $delivery->update([
                'status' => NotificationDeliveryStatus::Read,
                'read_at' => $timestamp,
                'delivered_at' => $delivery->delivered_at ?? $timestamp,
            ]),
            'failed' => $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'error_code' => (string) ($raw['errors'][0]['code'] ?? 'WHATSAPP_DELIVERY_FAILED'),
                'error_description' => (string) ($raw['errors'][0]['title'] ?? 'Message undelivered'),
                'failed_at' => $timestamp,
            ]),
            default => null,
        };
    }

    private function handleInboundOptOut(string $phone): void
    {
        $cleanPhone = preg_replace('/[^\d]/', '', $phone) ?? '';
        $raw10 = substr($cleanPhone, -10);

        // Find matching User or Owner
        $recipients = collect([
            User::query()->where('phone', 'like', "%{$raw10}%")->first(),
            Owner::query()->where('phone', 'like', "%{$raw10}%")->first(),
        ])->filter();

        foreach ($recipients as $recipient) {
            $this->preferenceService->recordConsent(
                $recipient,
                NotificationChannel::WhatsApp,
                NotificationCategory::EssentialTransactional,
                ConsentStatus::OptedOut,
                ConsentAction::Withdrawn,
                'whatsapp_inbound_stop',
                null,
                null,
                'Customer replied STOP to WhatsApp business number'
            );
        }
    }
}
