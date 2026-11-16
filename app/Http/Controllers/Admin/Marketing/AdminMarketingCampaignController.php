<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Marketing;

use App\Enums\CampaignStatus;
use App\Http\Controllers\Controller;
use App\Models\MarketingCampaign;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminMarketingCampaignController extends Controller
{
    public function index(Request $request): Response
    {
        $query = MarketingCampaign::query()
            ->withCount(['banners', 'emailCampaigns', 'trackingEvents'])
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $campaigns = $query->paginate(15)->withQueryString();

        return Inertia::render('admin/marketing/campaigns/index', [
            'campaigns' => $campaigns,
            'statuses' => array_map(fn (CampaignStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], CampaignStatus::cases()),
            'filters' => [
                'status' => $request->query('status'),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/marketing/campaigns/form', [
            'campaign' => null,
            'statuses' => array_map(fn (CampaignStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], CampaignStatus::cases()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:marketing_campaigns,slug'],
            'description' => ['nullable', 'string', 'max:1000'],
            'objective' => ['required', 'string', 'max:64'],
            'utm_source' => ['required', 'string', 'max:64'],
            'utm_medium' => ['required', 'string', 'max:64'],
            'utm_campaign' => ['required', 'string', 'max:64'],
            'utm_content' => ['nullable', 'string', 'max:64'],
            'target_landing_url' => ['required', 'string', 'max:500'],
            'status' => ['required', 'string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
        ]);

        $validated['slug'] = Str::slug($validated['slug'] ?: $validated['name']);
        $validated['admin_id'] = auth('admin')->id();

        $campaign = MarketingCampaign::query()->create($validated);

        return redirect()->route('admin.marketing.campaigns.edit', $campaign)
            ->with('success', 'Marketing campaign created successfully.');
    }

    public function edit(MarketingCampaign $campaign): Response
    {
        $campaign->load(['banners', 'emailCampaigns']);

        return Inertia::render('admin/marketing/campaigns/form', [
            'campaign' => $campaign,
            'generatedTrackingUrl' => $campaign->generateTrackingUrl(),
            'statuses' => array_map(fn (CampaignStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], CampaignStatus::cases()),
        ]);
    }

    public function update(Request $request, MarketingCampaign $campaign): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:marketing_campaigns,slug,'.$campaign->id],
            'description' => ['nullable', 'string', 'max:1000'],
            'objective' => ['required', 'string', 'max:64'],
            'utm_source' => ['required', 'string', 'max:64'],
            'utm_medium' => ['required', 'string', 'max:64'],
            'utm_campaign' => ['required', 'string', 'max:64'],
            'utm_content' => ['nullable', 'string', 'max:64'],
            'target_landing_url' => ['required', 'string', 'max:500'],
            'status' => ['required', 'string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
        ]);

        $validated['slug'] = Str::slug($validated['slug'] ?: $validated['name']);
        $campaign->update($validated);

        return back()->with('success', 'Marketing campaign updated successfully.');
    }

    public function destroy(MarketingCampaign $campaign): RedirectResponse
    {
        $campaign->update(['status' => CampaignStatus::Archived]);

        return redirect()->route('admin.marketing.campaigns.index')
            ->with('success', 'Marketing campaign archived.');
    }
}
