<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Public;

use App\Enums\BannerStatus;
use App\Http\Controllers\Api\V1\ApiController;
use App\Models\BlogArticle;
use App\Models\ContentFaq;
use App\Models\ContentPage;
use App\Models\MarketingBanner;
use Illuminate\Http\JsonResponse;

class PublicContentController extends ApiController
{
    public function page(string $slug): JsonResponse
    {
        $page = ContentPage::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first();

        if ($page === null) {
            return $this->error("Page '{$slug}' not found.", 'PAGE_NOT_FOUND', 404);
        }

        return $this->success([
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'excerpt' => $page->summary,
            'featured_image_url' => $page->featured_image,
            'content_blocks' => $page->content_blocks,
            'published_at' => $page->published_at?->toIso8601String(),
        ]);
    }

    public function blogIndex(): JsonResponse
    {
        $articles = BlogArticle::query()
            ->where('status', 'published')
            ->where('published_at', '<=', now())
            ->with(['author', 'category'])
            ->latest('published_at')
            ->paginate(10);

        return $this->success(
            $articles->items(),
            'Blog articles retrieved',
            200,
            [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'total' => $articles->total(),
            ]
        );
    }

    public function blogShow(string $slug): JsonResponse
    {
        $article = BlogArticle::query()
            ->where('slug', $slug)
            ->where('status', 'published')
            ->with(['author', 'category'])
            ->first();

        if ($article === null) {
            return $this->error("Article '{$slug}' not found.", 'ARTICLE_NOT_FOUND', 404);
        }

        return $this->success([
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'excerpt' => $article->excerpt,
            'content' => $article->content,
            'cover_image_url' => $article->featured_image,
            'reading_time_minutes' => (int) $article->reading_time_minutes,
            'author' => $article->author ? ['name' => $article->author->name] : null,
            'category' => $article->category ? ['name' => $article->category->name] : null,
            'published_at' => $article->published_at?->toIso8601String(),
        ]);
    }

    public function faqs(): JsonResponse
    {
        $faqs = ContentFaq::query()
            ->where('is_published', true)
            ->orderBy('display_order')
            ->get(['id', 'question', 'answer', 'category', 'display_order']);

        return $this->success($faqs);
    }

    public function banners(): JsonResponse
    {
        $banners = MarketingBanner::query()
            ->where('status', BannerStatus::Active)
            ->orderBy('display_order')
            ->get();

        return $this->success($banners);
    }
}
