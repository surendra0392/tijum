<?php

declare(strict_types=1);

namespace App\Services\Notifications\Channels;

use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use App\Models\MobileDevice;
use App\Models\NotificationDelivery;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ExpoReceiptService
{
    /**
     * Poll Expo Push Receipts for recently accepted deliveries and update delivery records.
     *
     * @return int Number of receipts updated
     */
    public function pollReceipts(int $limit = 100): int
    {
        $deliveries = NotificationDelivery::query()
            ->where('channel', NotificationChannel::Push)
            ->where('provider', 'expo')
            ->where('status', NotificationDeliveryStatus::Accepted)
            ->whereNotNull('provider_message_id')
            ->where('created_at', '>=', now()->subHours(24))
            ->limit($limit)
            ->get();

        if ($deliveries->isEmpty()) {
            return 0;
        }

        $ticketMap = [];
        foreach ($deliveries as $delivery) {
            if ($delivery->provider_message_id) {
                $ticketMap[$delivery->provider_message_id] = $delivery;
            }
        }

        $ticketIds = array_keys($ticketMap);
        if (empty($ticketIds)) {
            return 0;
        }

        $endpoint = (string) config('tijum.notifications.channels.push.receipts_endpoint', 'https://exp.host/--/api/v2/push/getReceipts');
        $updatedCount = 0;

        try {
            $response = Http::timeout(10)->post($endpoint, [
                'ids' => $ticketIds,
            ]);

            if (! $response->successful()) {
                Log::warning('Failed to fetch Expo push receipts', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 500),
                ]);

                return 0;
            }

            $data = $response->json('data') ?? [];

            foreach ($data as $ticketId => $receipt) {
                $delivery = $ticketMap[$ticketId] ?? null;
                if (! $delivery) {
                    continue;
                }

                $receiptStatus = $receipt['status'] ?? null;

                if ($receiptStatus === 'ok') {
                    $delivery->update([
                        'status' => NotificationDeliveryStatus::Delivered,
                        'delivered_at' => now(),
                    ]);
                    $updatedCount++;
                } elseif ($receiptStatus === 'error') {
                    $errorCode = $receipt['details']['error'] ?? 'PUSH_RECEIPT_ERROR';
                    $errorDescription = $receipt['message'] ?? 'Push notification delivery failed at device gateway.';

                    $delivery->update([
                        'status' => NotificationDeliveryStatus::Failed,
                        'error_code' => $errorCode,
                        'error_description' => substr((string) $errorDescription, 0, 500),
                        'failed_at' => now(),
                    ]);

                    if ($errorCode === 'DeviceNotRegistered') {
                        MobileDevice::query()
                            ->where('notifiable_type', $delivery->notifiable_type)
                            ->where('notifiable_id', $delivery->notifiable_id)
                            ->active()
                            ->update([
                                'is_active' => false,
                                'revoked_at' => now(),
                            ]);
                    }

                    $updatedCount++;
                }
            }
        } catch (Throwable $e) {
            Log::error('Exception polling Expo push receipts', [
                'message' => $e->getMessage(),
            ]);
        }

        return $updatedCount;
    }
}
