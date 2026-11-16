<?php

declare(strict_types=1);

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Notifications\NotificationPreferenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user('web');
        abort_unless($user instanceof User, 403);

        $filter = (string) $request->query('filter', 'all');

        $query = $user->notifications()->latest();

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($filter === 'read') {
            $query->whereNotNull('read_at');
        }

        $notifications = $query->paginate(15)->through(fn (DatabaseNotification $n): array => [
            'id' => $n->id,
            'data' => $n->data,
            'read_at' => $n->read_at?->toISOString(),
            'created_at' => $n->created_at?->toISOString(),
            'created_at_human' => $n->created_at?->diffForHumans(),
        ]);

        return Inertia::render('customer/notifications/index', [
            'notifications' => $notifications,
            'unreadCount' => $user->unreadNotifications()->count(),
            'filter' => $filter,
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user('web');
        abort_unless($user instanceof User, 403);

        return response()->json([
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    public function markAsRead(Request $request, string $id): RedirectResponse|JsonResponse
    {
        /** @var User $user */
        $user = $request->user('web');
        abort_unless($user instanceof User, 403);

        /** @var DatabaseNotification|null $notification */
        $notification = $user->notifications()->where('id', $id)->first();
        if ($notification !== null) {
            $notification->markAsRead();
        }

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'Notification marked as read.');
    }

    public function markAllAsRead(Request $request): RedirectResponse|JsonResponse
    {
        /** @var User $user */
        $user = $request->user('web');
        abort_unless($user instanceof User, 403);

        $user->unreadNotifications->markAsRead();

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'All notifications marked as read.');
    }

    public function preferences(Request $request, NotificationPreferenceService $preferenceService): Response
    {
        /** @var User $user */
        $user = $request->user('web');
        abort_unless($user instanceof User, 403);

        return Inertia::render('settings/notifications', [
            'preferences' => $preferenceService->getPreferences($user),
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
            ],
        ]);
    }

    public function updatePreferences(Request $request, NotificationPreferenceService $preferenceService): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user('web');
        abort_unless($user instanceof User, 403);

        $validated = $request->validate([
            'in_app_operational' => 'nullable|boolean',
            'email_operational' => 'nullable|boolean',
            'sms_operational' => 'nullable|boolean',
            'whatsapp_opted_in' => 'nullable|boolean',
        ]);

        $preferenceService->updatePreferences(
            $user,
            $validated,
            $request->ip(),
            $request->userAgent()
        );

        return back()->with('success', 'Notification preferences updated successfully.');
    }
}
