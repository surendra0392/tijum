<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\NotificationDeliveryResource;
use App\Models\NotificationDelivery;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerNotificationController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notifications = NotificationDelivery::query()
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->id)
            ->where('channel', 'in_app')
            ->latest('created_at')
            ->paginate(15);

        return $this->success(
            NotificationDeliveryResource::collection($notifications->items()),
            'Notifications retrieved',
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
        /** @var User $user */
        $user = $request->user();

        $count = NotificationDelivery::query()
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->id)
            ->where('channel', 'in_app')
            ->whereNull('read_at')
            ->count();

        return $this->success(['unread_count' => $count]);
    }

    public function markRead(Request $request, int $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notification = NotificationDelivery::query()
            ->where('id', $id)
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->id)
            ->first();

        if ($notification === null) {
            return $this->error('Notification not found.', 'NOT_FOUND', 404);
        }

        $notification->update(['read_at' => now()]);

        return $this->success(null, 'Notification marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        NotificationDelivery::query()
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->id)
            ->where('channel', 'in_app')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->success(null, 'All notifications marked as read.');
    }
}
