<?php

declare(strict_types=1);

namespace App\Http\Controllers\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use App\Models\WebPushSubscription;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WebPushSubscriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $recipient = $this->resolvePortalRecipient($request);
        abort_unless($recipient !== null, 403);

        $validated = $request->validate([
            'endpoint' => ['required', 'url:http,https', 'max:2048'],
            'keys' => ['required', 'array'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'content_encoding' => ['nullable', 'string', 'in:aes128gcm,aesgcm'],
        ]);

        $endpointHash = hash('sha256', $validated['endpoint']);

        // Rebind or update subscription strictly for the currently authenticated actor
        $subscription = WebPushSubscription::query()->updateOrCreate(
            ['endpoint_hash' => $endpointHash],
            [
                'notifiable_type' => $recipient->getMorphClass(),
                'notifiable_id' => $recipient->getKey(),
                'endpoint' => $validated['endpoint'],
                'public_key' => $validated['keys']['p256dh'],
                'auth_token' => $validated['keys']['auth'],
                'content_encoding' => $validated['content_encoding'] ?? 'aes128gcm',
                'user_agent' => substr((string) ($request->userAgent() ?? ''), 0, 255),
                'is_active' => true,
                'last_used_at' => now(),
                'revoked_at' => null,
            ]
        );

        return response()->json([
            'subscribed' => true,
            'id' => $subscription->id,
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $recipient = $this->resolvePortalRecipient($request);
        abort_unless($recipient !== null, 403);

        $validated = $request->validate([
            'endpoint' => ['required', 'url:http,https', 'max:2048'],
        ]);

        WebPushSubscription::query()
            ->where('endpoint_hash', hash('sha256', $validated['endpoint']))
            ->where('notifiable_type', $recipient->getMorphClass())
            ->where('notifiable_id', $recipient->getKey())
            ->update([
                'is_active' => false,
                'revoked_at' => now(),
            ]);

        return response()->json([
            'subscribed' => false,
        ]);
    }

    private function resolvePortalRecipient(Request $request): ?Model
    {
        if ($request->is('admin/*') || $request->routeIs('admin.*')) {
            $admin = $request->user('admin');

            return $admin instanceof Admin ? $admin : null;
        }

        if ($request->is('owner/*') || $request->routeIs('owner.*')) {
            $owner = $request->user('owner');

            return $owner instanceof Owner ? $owner : null;
        }

        $user = $request->user('web');

        return $user instanceof User ? $user : null;
    }
}
