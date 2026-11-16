<?php

declare(strict_types=1);

namespace App\Http\Controllers\Owner;

use App\Http\Controllers\Controller;
use App\Models\Owner;
use App\Services\Notifications\NotificationPreferenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class OwnerNotificationController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 403);

        $filter = (string) $request->query('filter', 'all');

        $query = $owner->notifications()->latest();

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

        return Inertia::render('owner/notifications/index', [
            'notifications' => $notifications,
            'unreadCount' => $owner->unreadNotifications()->count(),
            'filter' => $filter,
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 403);

        return response()->json([
            'unread_count' => $owner->unreadNotifications()->count(),
        ]);
    }

    public function markAsRead(Request $request, string $id): RedirectResponse|JsonResponse
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 403);

        /** @var DatabaseNotification|null $notification */
        $notification = $owner->notifications()->where('id', $id)->first();
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
        /** @var Owner $owner */
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 403);

        $owner->unreadNotifications->markAsRead();

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', 'All notifications marked as read.');
    }

    public function preferences(Request $request, NotificationPreferenceService $preferenceService): Response
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 403);

        return Inertia::render('owner/settings/notifications', [
            'preferences' => $preferenceService->getPreferences($owner),
            'owner' => [
                'name' => $owner->name,
                'email' => $owner->email,
                'phone' => $owner->phone,
            ],
        ]);
    }

    public function updatePreferences(Request $request, NotificationPreferenceService $preferenceService): RedirectResponse
    {
        /** @var Owner $owner */
        $owner = $request->user('owner');
        abort_unless($owner instanceof Owner, 403);

        $validated = $request->validate([
            'in_app_operational' => 'nullable|boolean',
            'email_operational' => 'nullable|boolean',
            'sms_operational' => 'nullable|boolean',
            'whatsapp_opted_in' => 'nullable|boolean',
        ]);

        $preferenceService->updatePreferences(
            $owner,
            $validated,
            $request->ip(),
            $request->userAgent()
        );

        return back()->with('success', 'Partner notification preferences updated successfully.');
    }
}
