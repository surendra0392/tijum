<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Marketing;

use App\Enums\BannerPlacement;
use App\Enums\BannerStatus;
use App\Http\Controllers\Controller;
use App\Models\MarketingBanner;
use App\Models\MarketingCampaign;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminMarketingBannerController extends Controller
{
    public function index(Request $request): Response
    {
        $query = MarketingBanner::query()->with('campaign')->latest();

        if ($request->filled('placement')) {
            $query->where('placement', $request->query('placement'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $banners = $query->paginate(15)->withQueryString();

        return Inertia::render('admin/marketing/banners/index', [
            'banners' => $banners,
            'placements' => array_map(fn (BannerPlacement $p) => [
                'value' => $p->value,
                'label' => $p->label(),
            ], BannerPlacement::cases()),
            'statuses' => array_map(fn (BannerStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], BannerStatus::cases()),
            'filters' => [
                'placement' => $request->query('placement'),
                'status' => $request->query('status'),
            ],
        ]);
    }

    public function create(): Response
    {
        $campaigns = MarketingCampaign::query()->orderBy('name')->get();

        return Inertia::render('admin/marketing/banners/form', [
            'banner' => null,
            'campaigns' => $campaigns,
            'placements' => array_map(fn (BannerPlacement $p) => [
                'value' => $p->value,
                'label' => $p->label(),
            ], BannerPlacement::cases()),
            'statuses' => array_map(fn (BannerStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], BannerStatus::cases()),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'campaign_id' => ['nullable', 'exists:marketing_campaigns,id'],
            'name' => ['required', 'string', 'max:255'],
            'headline' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'cta_text' => ['required', 'string', 'max:64'],
            'cta_url' => ['required', 'string', 'max:500'],
            'placement' => ['required', 'string'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', 'string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
        ]);

        $validated['admin_id'] = auth('admin')->id();

        MarketingBanner::query()->create($validated);

        return redirect()->route('admin.marketing.banners.index')
            ->with('success', 'Promotional banner created successfully.');
    }

    public function edit(MarketingBanner $banner): Response
    {
        $campaigns = MarketingCampaign::query()->orderBy('name')->get();

        return Inertia::render('admin/marketing/banners/form', [
            'banner' => $banner,
            'campaigns' => $campaigns,
            'placements' => array_map(fn (BannerPlacement $p) => [
                'value' => $p->value,
                'label' => $p->label(),
            ], BannerPlacement::cases()),
            'statuses' => array_map(fn (BannerStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ], BannerStatus::cases()),
        ]);
    }

    public function update(Request $request, MarketingBanner $banner): RedirectResponse
    {
        $validated = $request->validate([
            'campaign_id' => ['nullable', 'exists:marketing_campaigns,id'],
            'name' => ['required', 'string', 'max:255'],
            'headline' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'cta_text' => ['required', 'string', 'max:64'],
            'cta_url' => ['required', 'string', 'max:500'],
            'placement' => ['required', 'string'],
            'display_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', 'string'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
        ]);

        $banner->update($validated);

        return back()->with('success', 'Promotional banner updated successfully.');
    }

    public function destroy(MarketingBanner $banner): RedirectResponse
    {
        $banner->delete();

        return back()->with('success', 'Promotional banner deleted.');
    }
}
