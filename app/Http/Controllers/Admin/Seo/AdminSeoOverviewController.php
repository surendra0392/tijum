<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Seo;

use App\Enums\PropertyOperationalStatus;
use App\Http\Controllers\Controller;
use App\Models\BlogArticle;
use App\Models\ContentPage;
use App\Models\Property;
use App\Models\SeoRedirect;
use App\Models\SeoSetting;
use App\Services\Seo\SitemapService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminSeoOverviewController extends Controller
{
    public function __construct(
        private readonly SitemapService $sitemapService,
    ) {}

    public function index(): Response
    {
        $settings = SeoSetting::current();

        $stats = [
            'total_indexed_properties' => Property::query()
                ->where('status', PropertyOperationalStatus::Active)
                ->where('is_verified', true)
                ->where('booking_eligible', true)
                ->count(),
            'total_published_articles' => BlogArticle::query()->published()->count(),
            'total_published_pages' => ContentPage::query()->published()->count(),
            'total_active_redirects' => SeoRedirect::query()->where('is_active', true)->count(),
            'total_redirect_hits' => (int) SeoRedirect::query()->sum('hits_count'),
            'sitemap_url' => route('public.sitemap'),
            'robots_url' => route('public.robots'),
        ];

        return Inertia::render('admin/seo/index', [
            'settings' => $settings,
            'stats' => $stats,
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'site_name' => ['required', 'string', 'max:255'],
            'title_template' => ['required', 'string', 'max:255'],
            'default_meta_description' => ['nullable', 'string', 'max:500'],
            'default_og_image' => ['nullable', 'string', 'max:500'],
            'default_robots' => ['required', 'string', 'max:64'],
            'google_site_verification' => ['nullable', 'string', 'max:255'],
            'bing_site_verification' => ['nullable', 'string', 'max:255'],
        ]);

        $settings = SeoSetting::current();
        $validated['updated_by_admin_id'] = auth('admin')->id();

        $settings->update($validated);

        $this->sitemapService->clearCache();

        return back()->with('success', 'Global SEO configuration updated.');
    }
}
