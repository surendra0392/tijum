<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Customer;

use App\Enums\NotificationChannel;
use App\Http\Controllers\Api\V1\ApiController;
use App\Http\Resources\Api\V1\NotificationDeliveryResource;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\Notifications\NotificationPreferenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            ->where('channel', NotificationChannel::InApp->value)
            ->first();

        if ($notification === null) {
            return $this->error('Notification not found.', 'NOT_FOUND', 404);
        }

        DB::transaction(static function () use ($notification, $user): void {
            $now = $notification->read_at ?? now();

            NotificationDelivery::query()
                ->whereKey($notification->id)
                ->whereNull('read_at')
                ->update(['read_at' => $now]);

            if (is_string($notification->provider_message_id) && $notification->provider_message_id !== '') {
                $user->notifications()
                    ->where('id', $notification->provider_message_id)
                    ->whereNull('read_at')
                    ->update(['read_at' => $now]);
            }
        }, 3);

        return $this->success(null, 'Notification marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        DB::transaction(static function () use ($user): void {
            $now = now();

            NotificationDelivery::query()
                ->where('notifiable_type', $user->getMorphClass())
                ->where('notifiable_id', $user->id)
                ->where('channel', NotificationChannel::InApp->value)
                ->whereNull('read_at')
                ->update(['read_at' => $now]);

            $user->unreadNotifications()->update(['read_at' => $now]);
        }, 3);

        return $this->success(null, 'All notifications marked as read.');
    }

    public function preferences(
        Request $request,
        NotificationPreferenceService $preferenceService,
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        return $this->success(
            $preferenceService->getPreferences($user),
            'Notification preferences retrieved successfully.'
        );
    }

    public function updatePreferences(
        Request $request,
        NotificationPreferenceService $preferenceService,
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'in_app_operational' => ['nullable', 'boolean'],
            'email_operational' => ['nullable', 'boolean'],
            'sms_operational' => ['nullable', 'boolean'],
            'whatsapp_opted_in' => ['nullable', 'boolean'],
        ]);

        $preferenceService->updatePreferences(
            $user,
            $validated,
            $request->ip(),
            $request->userAgent()
        );

        return $this->success(
            $preferenceService->getPreferences($user),
            'Notification preferences updated successfully.'
        );
    }
}
