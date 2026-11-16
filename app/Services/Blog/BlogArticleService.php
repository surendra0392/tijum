<?php

declare(strict_types=1);

namespace App\Services\Blog;

use App\Enums\ContentStatus;
use App\Models\Admin;
use App\Models\BlogArticle;
use App\Models\BlogTag;
use App\Models\SeoRedirect;
use App\Services\Seo\SitemapService;
use Illuminate\Support\Str;

class BlogArticleService
{
    private const ALLOWED_ARTICLE_TAGS = '<p><br><strong><em><b><i><u><h3><h4><h5><ul><ol><li><a><blockquote><code><pre><hr><table><thead><tbody>tr><th><td><img>';

    public function __construct(
        private readonly SitemapService $sitemapService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function createArticle(array $data, Admin $admin): BlogArticle
    {
        $slug = Str::slug((string) ($data['slug'] ?: $data['title']));
        $status = ContentStatus::from((string) ($data['status'] ?? 'draft'));
        $publishedAt = $status === ContentStatus::Published ? now() : null;

        $content = $this->sanitizeContent((string) ($data['content'] ?? ''));
        $readingTime = $this->calculateReadingTime($content);

        /** @var BlogArticle $article */
        $article = BlogArticle::query()->create([
            'title' => (string) $data['title'],
            'slug' => $slug,
            'excerpt' => (string) ($data['excerpt'] ?? Str::limit(strip_tags($content), 180)),
            'content' => $content,
            'featured_image' => isset($data['featured_image']) ? (string) $data['featured_image'] : null,
            'author_id' => isset($data['author_id']) ? (int) $data['author_id'] : null,
            'category_id' => isset($data['category_id']) ? (int) $data['category_id'] : null,
            'reading_time_minutes' => $readingTime,
            'status' => $status,
            'published_at' => $publishedAt,
            'scheduled_for' => isset($data['scheduled_for']) ? (string) $data['scheduled_for'] : null,
            'admin_id' => $admin->id,
            'seo_title' => isset($data['seo_title']) ? (string) $data['seo_title'] : null,
            'seo_description' => isset($data['seo_description']) ? (string) $data['seo_description'] : null,
            'canonical_override' => isset($data['canonical_override']) ? (string) $data['canonical_override'] : null,
            'og_image' => isset($data['og_image']) ? (string) $data['og_image'] : null,
        ]);

        if (isset($data['tags']) && is_array($data['tags'])) {
            $this->syncTags($article, $data['tags']);
        }

        if ($status === ContentStatus::Published) {
            $this->sitemapService->clearCache();
        }

        return $article;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateArticle(BlogArticle $article, array $data, Admin $admin): BlogArticle
    {
        $oldSlug = $article->slug;
        $newSlug = isset($data['slug']) ? Str::slug((string) $data['slug']) : $oldSlug;

        $content = isset($data['content']) ? $this->sanitizeContent((string) $data['content']) : $article->content;
        $readingTime = $this->calculateReadingTime($content);

        $status = isset($data['status'])
            ? ContentStatus::from((string) $data['status'])
            : $article->status;

        $publishedAt = $article->published_at;
        if ($status === ContentStatus::Published && $publishedAt === null) {
            $publishedAt = now();
        }

        if ($oldSlug !== $newSlug && $article->status === ContentStatus::Published) {
            SeoRedirect::query()->firstOrCreate(
                ['source_path' => "/blog/{$oldSlug}"],
                [
                    'destination_url' => "/blog/{$newSlug}",
                    'http_status' => 301,
                    'is_active' => true,
                    'admin_id' => $admin->id,
                ],
            );
        }

        $article->update([
            'title' => (string) ($data['title'] ?? $article->title),
            'slug' => $newSlug,
            'excerpt' => (string) ($data['excerpt'] ?? $article->excerpt),
            'content' => $content,
            'featured_image' => array_key_exists('featured_image', $data) ? $data['featured_image'] : $article->featured_image,
            'author_id' => array_key_exists('author_id', $data) ? $data['author_id'] : $article->author_id,
            'category_id' => array_key_exists('category_id', $data) ? $data['category_id'] : $article->category_id,
            'reading_time_minutes' => $readingTime,
            'status' => $status,
            'published_at' => $publishedAt,
            'scheduled_for' => array_key_exists('scheduled_for', $data) ? $data['scheduled_for'] : $article->scheduled_for,
            'seo_title' => array_key_exists('seo_title', $data) ? $data['seo_title'] : $article->seo_title,
            'seo_description' => array_key_exists('seo_description', $data) ? $data['seo_description'] : $article->seo_description,
            'canonical_override' => array_key_exists('canonical_override', $data) ? $data['canonical_override'] : $article->canonical_override,
            'og_image' => array_key_exists('og_image', $data) ? $data['og_image'] : $article->og_image,
        ]);

        if (isset($data['tags']) && is_array($data['tags'])) {
            $this->syncTags($article, $data['tags']);
        }

        $this->sitemapService->clearCache();

        return $article;
    }

    public function publishScheduledArticles(): int
    {
        $scheduled = BlogArticle::query()
            ->where('status', ContentStatus::Scheduled->value)
            ->whereNotNull('scheduled_for')
            ->where('scheduled_for', '<=', now())
            ->get();

        $count = 0;
        foreach ($scheduled as $article) {
            $article->update([
                'status' => ContentStatus::Published,
                'published_at' => now(),
            ]);
            $count++;
        }

        if ($count > 0) {
            $this->sitemapService->clearCache();
        }

        return $count;
    }

    /**
     * @param  list<string>  $tags
     */
    private function syncTags(BlogArticle $article, array $tags): void
    {
        $tagIds = [];
        foreach ($tags as $tagName) {
            $trimmed = trim((string) $tagName);
            if ($trimmed === '') {
                continue;
            }
            $slug = Str::slug($trimmed);
            $tag = BlogTag::query()->firstOrCreate(['slug' => $slug], ['name' => $trimmed]);
            $tagIds[] = $tag->id;
        }

        $article->tags()->sync($tagIds);
    }

    private function calculateReadingTime(string $content): int
    {
        $words = str_word_count(strip_tags($content));

        return max(1, (int) ceil($words / 200));
    }

    private function sanitizeContent(string $html): string
    {
        $clean = strip_tags($html, self::ALLOWED_ARTICLE_TAGS);

        return (string) preg_replace('/(javascript:|on\w+=)/i', '', $clean);
    }
}
