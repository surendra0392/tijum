<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\ContentPage;
use App\Services\Seo\SeoService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class CmsPageController extends Controller
{
    public function __construct(
        private readonly SeoService $seoService,
    ) {}

    public function show(Request $request, string $slug): Response
    {
        $preview = $request->boolean('preview');
        $isAdmin = auth('admin')->check();

        $query = ContentPage::query()->where('slug', $slug);

        if ($preview && $isAdmin) {
            /** @var ContentPage|null $page */
            $page = $query->first();
        } else {
            /** @var ContentPage|null $page */
            $page = $query->published()->first();
        }

        if ($page === null) {
            throw new NotFoundHttpException('The requested page does not exist or is not published.');
        }

        if (! $preview) {
            $page->increment('view_count');
        }

        $canonical = $page->canonical_override ?: url("/p/{$page->slug}");
        $title = $page->seo_title ?: $page->title;
        $description = $page->seo_description ?: ($page->summary ?: "Read about {$page->title} on TIJUM.");
        $robots = ($preview || ! $page->status->isPubliclyViewable()) ? 'noindex, nofollow' : $page->robots_directive;

        $crumbs = [
            ['name' => $page->title, 'url' => $canonical],
        ];

        $seo = $this->seoService->buildPayload(
            title: $title,
            description: $description,
            canonical: $canonical,
            robots: $robots,
            ogImage: $page->og_image ?: $page->featured_image,
            structuredData: [
                '@context' => 'https://schema.org',
                '@graph' => [
                    $this->seoService->organizationSchema(),
                    $this->seoService->breadcrumbSchema($crumbs),
                ],
            ],
        );

        return Inertia::render('public/content/show', [
            'page' => [
                'id' => $page->id,
                'slug' => $page->slug,
                'title' => $page->title,
                'summary' => $page->summary,
                'content_blocks' => $page->content_blocks ?? [],
                'featured_image' => $page->featured_image,
                'published_at' => $page->published_at?->toDateString(),
            ],
            'isPreview' => $preview && $isAdmin,
            'seo' => $seo,
        ]);
    }
}
