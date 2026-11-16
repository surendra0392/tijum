<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Marketing;

use App\Enums\SubscriberStatus;
use App\Http\Controllers\Controller;
use App\Models\MarketingConsentRecord;
use App\Models\MarketingSubscriber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminMarketingSubscriberController extends Controller
{
    public function index(Request $request): Response
    {
        $query = MarketingSubscriber::query()->with('consentRecords')->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('search')) {
            $search = (string) $request->query('search');
            $query->where(function ($q) use ($search): void {
                $q->where('email', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $subscribers = $query->paginate(20)->withQueryString();

        return Inertia::render('admin/marketing/subscribers/index', [
            'subscribers' => $subscribers,
            'statuses' => array_map(fn (SubscriberStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], SubscriberStatus::cases()),
            'filters' => [
                'status' => $request->query('status'),
                'search' => $request->query('search'),
            ],
        ]);
    }

    public function unsubscribe(MarketingSubscriber $subscriber): RedirectResponse
    {
        $subscriber->update([
            'status' => SubscriberStatus::Unsubscribed,
            'unsubscribed_at' => now(),
        ]);

        MarketingConsentRecord::query()->create([
            'marketing_subscriber_id' => $subscriber->id,
            'action' => 'admin_opt_out',
            'channel' => 'email',
            'source' => 'admin_panel',
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 500),
            'created_at' => now(),
        ]);

        return back()->with('success', "Subscriber {$subscriber->email} marked as unsubscribed.");
    }
}
