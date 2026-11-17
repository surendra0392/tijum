<?php

declare(strict_types=1);

namespace App\Services\Notifications\Channels;

use App\Enums\NotificationDeliveryStatus;
use App\Models\MobileDevice;
use App\Models\NotificationDelivery;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Http;
use Throwable;

class PushNotificationChannel
{
    /**
     * Dispatch mobile push notification via Expo Push API with ticket handling and invalid token deactivation.
     *
     * @param  array{title: string, body: string, subject: ?string, safe_variables: array<string, string>}  $rendered
     */
    public function send(NotificationDelivery $delivery, array $rendered): void
    {
        /** @var Collection<int, MobileDevice> $devices */
        $devices = MobileDevice::query()
            ->where('notifiable_type', $delivery->notifiable_type)
            ->where('notifiable_id', $delivery->notifiable_id)
            ->active()
            ->whereNotNull('push_token')
            ->get();

        if ($devices->isEmpty()) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Suppressed,
                'error_code' => 'NO_ACTIVE_MOBILE_DEVICES',
                'error_description' => 'Recipient has no active registered mobile devices with push tokens.',
            ]);

            return;
        }

        $endpoint = (string) config('tijum.notifications.channels.push.endpoint', 'https://exp.host/--/api/v2/push/send');
        $messages = [];
        $deviceMap = [];

        foreach ($devices as $index => $device) {
            $safeData = $delivery->payload ?? [];
            unset($safeData['otp_code'], $safeData['password'], $safeData['token'], $safeData['secret']);

            $messages[] = [
                'to' => $device->push_token,
                'title' => $rendered['title'],
                'body' => $rendered['body'],
                'data' => array_merge($safeData, [
                    'delivery_id' => $delivery->id,
                    'event_id' => $delivery->event_id,
                    'action_url' => $delivery->payload['action_url'] ?? null,
                ]),
                'sound' => 'default',
            ];
            $deviceMap[$index] = $device;
            $device->touchLastUsed();
        }

        try {
            $response = Http::timeout(5)->post($endpoint, $messages);

            if ($response->successful()) {
                $responseData = $response->json();
                $tickets = $responseData['data'] ?? [];
                $hasValidTicket = false;
                $allTokensInvalid = true;

                foreach ($tickets as $idx => $ticket) {
                    $status = $ticket['status'] ?? 'ok';
                    $device = $deviceMap[$idx] ?? null;

                    if ($status === 'ok') {
                        $hasValidTicket = true;
                        $allTokensInvalid = false;
                    } elseif ($status === 'error') {
                        $errorDetail = $ticket['details']['error'] ?? $ticket['message'] ?? 'UNKNOWN_ERROR';
                        // Handle invalid/unregistered devices
                        if ($errorDetail === 'DeviceNotRegistered' && $device) {
                            $device->revoke();
                        } else {
                            $allTokensInvalid = false;
                        }
                    }
                }

                if ($allTokensInvalid && ! empty($tickets)) {
                    $delivery->update([
                        'status' => NotificationDeliveryStatus::Failed,
                        'provider' => 'expo',
                        'error_code' => 'DEVICE_NOT_REGISTERED',
                        'error_description' => 'All targeted devices have revoked or unregistered push tokens.',
                        'failed_at' => now(),
                    ]);
                } else {
                    $firstTicketId = $tickets[0]['id'] ?? ('ticket_'.substr(md5($delivery->idempotency_key), 0, 16));
                    $delivery->update([
                        'status' => NotificationDeliveryStatus::Accepted,
                        'provider' => 'expo',
                        'provider_message_id' => (string) $firstTicketId,
                        'submitted_at' => now(),
                    ]);
                }
            } else {
                $delivery->update([
                    'status' => NotificationDeliveryStatus::Failed,
                    'provider' => 'expo',
                    'error_code' => 'EXPO_PUSH_API_ERROR',
                    'error_description' => substr($response->body(), 0, 500),
                    'failed_at' => now(),
                ]);
            }
        } catch (Throwable $e) {
            $delivery->update([
                'status' => NotificationDeliveryStatus::Failed,
                'provider' => 'expo',
                'error_code' => 'PUSH_TRANSPORT_EXCEPTION',
                'error_description' => substr($e->getMessage(), 0, 500),
                'failed_at' => now(),
            ]);
        }
    }
}
