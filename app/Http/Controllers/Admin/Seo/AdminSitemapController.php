<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Seo;

use App\Http\Controllers\Controller;
use App\Services\Seo\SitemapService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AdminSitemapController extends Controller
{
    public function __construct(
        private readonly SitemapService $sitemapService,
    ) {}

    public function index(): Response
    {
        $urls = $this->sitemapService->collectUrls();

        return Inertia::render('admin/seo/sitemap/index', [
            'urls' => $urls,
            'totalUrls' => count($urls),
            'sitemapUrl' => route('public.sitemap'),
        ]);
    }

    public function clearCache(): RedirectResponse
    {
        $this->sitemapService->clearCache();

        return back()->with('success', 'Sitemap XML cache purged and regenerated.');
    }
}
