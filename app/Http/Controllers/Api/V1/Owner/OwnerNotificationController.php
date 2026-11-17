<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Owner;

use App\Enums\NotificationChannel;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\NotificationDeliveryResource;
use App\Models\NotificationDelivery;
use App\Models\Owner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OwnerNotificationController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $notifications = NotificationDelivery::query()
            ->where('notifiable_type', $owner->getMorphClass())
            ->where('notifiable_id', $owner->id)
            ->where('channel', 'in_app')
            ->latest('created_at')
            ->paginate(15);

        return $this->success(
            NotificationDeliveryResource::collection($notifications->items()),
            'Partner notifications retrieved',
            200,
            [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'total' => $notifications->total(),
            ]
        );
    }

    public function unreadCount(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $count = NotificationDelivery::query()
            ->where('notifiable_type', $owner->getMorphClass())
            ->where('notifiable_id', $owner->id)
            ->where('channel', 'in_app')
            ->whereNull('read_at')
            ->count();

        return $this->success(['unread_count' => $count]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        $notification = NotificationDelivery::query()
            ->where('id', $id)
            ->where('notifiable_type', $owner->getMorphClass())
            ->where('notifiable_id', $owner->id)
            ->where('channel', NotificationChannel::InApp->value)
            ->first();

        if ($notification === null) {
            return $this->error('Notification not found.', 'NOT_FOUND', 404);
        }

        DB::transaction(static function () use ($notification, $owner): void {
            $now = $notification->read_at ?? now();

            NotificationDelivery::query()
                ->whereKey($notification->id)
                ->whereNull('read_at')
                ->update(['read_at' => $now]);

            if (is_string($notification->provider_message_id) && $notification->provider_message_id !== '') {
                $owner->notifications()
                    ->where('id', $notification->provider_message_id)
                    ->whereNull('read_at')
                    ->update(['read_at' => $now]);
            }
        }, 3);

        return $this->success(null, 'Partner notification marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user();

        DB::transaction(static function () use ($owner): void {
            $now = now();

            NotificationDelivery::query()
                ->where('notifiable_type', $owner->getMorphClass())
                ->where('notifiable_id', $owner->id)
                ->where('channel', NotificationChannel::InApp->value)
                ->whereNull('read_at')
                ->update(['read_at' => $now]);

            $owner->unreadNotifications()->update(['read_at' => $now]);
        }, 3);

        return $this->success(null, 'All partner notifications marked as read.');
    }
}
