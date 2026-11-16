<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Enums\SubscriberStatus;
use App\Http\Controllers\Controller;
use App\Models\MarketingConsentRecord;
use App\Models\MarketingSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NewsletterSubscriptionController extends Controller
{
    public function subscribe(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'marketing_consent' => ['required', 'accepted'],
            'name' => ['nullable', 'string', 'max:100'],
            'source' => ['nullable', 'string', 'max:64'],
        ]);

        $email = strtolower(trim($validated['email']));
        $source = (string) ($validated['source'] ?? 'footer_newsletter');

        /** @var MarketingSubscriber|null $existing */
        $existing = MarketingSubscriber::query()->where('email', $email)->first();

        if ($existing !== null && $existing->status === SubscriberStatus::Subscribed) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'You are already subscribed to TIJUM newsletters and accommodation guides.',
                ]);
            }

            return back()->with('success', 'You are already subscribed to TIJUM newsletters.');
        }

        if ($existing !== null) {
            $existing->update([
                'status' => SubscriberStatus::Subscribed,
                'name' => $validated['name'] ?? $existing->name,
                'unsubscribed_at' => null,
            ]);
            $subscriber = $existing;
            $action = 'resubscribed';
        } else {
            /** @var MarketingSubscriber $subscriber */
            $subscriber = MarketingSubscriber::query()->create([
                'email' => $email,
                'name' => $validated['name'] ?? null,
                'status' => SubscriberStatus::Subscribed,
                'confirmed_at' => now(),
                'source' => $source,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
            ]);
            $action = 'opt_in';
        }

        // Record immutable consent audit trail
        MarketingConsentRecord::query()->create([
            'marketing_subscriber_id' => $subscriber->id,
            'action' => $action,
            'channel' => 'email',
            'source' => $source,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
            'created_at' => now(),
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Thank you for subscribing! You will receive our latest accommodation guides and tips.',
            ]);
        }

        return back()->with('success', 'Thank you for subscribing to TIJUM updates!');
    }

    public function unsubscribe(Request $request, string $token): Response|JsonResponse
    {
        /** @var MarketingSubscriber $subscriber */
        $subscriber = MarketingSubscriber::query()->where('unsubscribe_token', $token)->firstOrFail();

        if ($subscriber->status !== SubscriberStatus::Unsubscribed) {
            $subscriber->update([
                'status' => SubscriberStatus::Unsubscribed,
                'unsubscribed_at' => now(),
            ]);

            MarketingConsentRecord::query()->create([
                'marketing_subscriber_id' => $subscriber->id,
                'action' => 'opt_out',
                'channel' => 'email',
                'source' => 'unsubscribe_link',
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
                'created_at' => now(),
            ]);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'You have been successfully unsubscribed from TIJUM marketing emails.',
            ]);
        }

        return Inertia::render('public/newsletter/unsubscribed', [
            'email' => $subscriber->email,
        ]);
    }
}
