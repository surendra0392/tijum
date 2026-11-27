<?php

declare(strict_types=1);

namespace App\Services\Content;

use App\Enums\ContentStatus;
use App\Models\Admin;
use App\Models\ContentPage;
use App\Models\ContentPageRevision;
use App\Models\SeoRedirect;
use App\Services\Seo\SitemapService;
use Illuminate\Support\Str;

class ContentPageService
{
    public function __construct(
        private readonly ContentBlockSanitizer $sanitizer,
        private readonly SitemapService $sitemapService,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function createPage(array $data, Admin $admin): ContentPage
    {
        $blocks = is_array($data['content_blocks'] ?? null)
            ? $this->sanitizer->sanitizeBlocks($data['content_blocks'])
            : [];

        $baseSlug = Str::slug((string) ($data['slug'] ?: $data['title'])) ?: 'page';
        $slug = $baseSlug;
        $suffix = 2;
        while (ContentPage::query()->where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$suffix}";
            $suffix++;
        }
        $status = ContentStatus::from((string) ($data['status'] ?? 'draft'));
        $publishedAt = $status === ContentStatus::Published ? now() : null;

        /** @var ContentPage $page */
        $page = ContentPage::query()->create([
            'slug' => $slug,
            'title' => (string) $data['title'],
            'internal_name' => (string) ($data['internal_name'] ?: $data['title']),
            'summary' => isset($data['summary']) ? (string) $data['summary'] : null,
            'content_blocks' => $blocks,
            'featured_image' => isset($data['featured_image']) ? (string) $data['featured_image'] : null,
            'status' => $status,
            'published_at' => $publishedAt,
            'scheduled_for' => isset($data['scheduled_for']) ? (string) $data['scheduled_for'] : null,
            'author_admin_id' => $admin->id,
            'seo_title' => isset($data['seo_title']) ? (string) $data['seo_title'] : null,
            'seo_description' => isset($data['seo_description']) ? (string) $data['seo_description'] : null,
            'canonical_override' => isset($data['canonical_override']) ? (string) $data['canonical_override'] : null,
            'robots_directive' => (string) ($data['robots_directive'] ?? 'index, follow'),
            'og_image' => isset($data['og_image']) ? (string) $data['og_image'] : null,
        ]);

        $this->createRevision($page, $admin, 'Initial page creation');

        if ($status === ContentStatus::Published) {
            $this->sitemapService->clearCache();
        }

        return $page;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, Admin $admin): ContentPage
    {
        return $this->createPage($data, $admin);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(
        ContentPage $page,
        array $data,
        Admin $admin,
        ?string $changeNotes = null,
    ): ContentPage {
        return $this->updatePage($page, $data, $admin, $changeNotes);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updatePage(
        ContentPage $page,
        array $data,
        Admin $admin,
        ?string $changeNotes = null,
    ): ContentPage {
        $oldSlug = $page->slug;
        $newSlug = isset($data['slug']) ? Str::slug((string) $data['slug']) : $oldSlug;

        $blocks = is_array($data['content_blocks'] ?? null)
            ? $this->sanitizer->sanitizeBlocks($data['content_blocks'])
            : $page->content_blocks;

        $status = isset($data['status'])
            ? ContentStatus::from((string) $data['status'])
            : $page->status;

        $publishedAt = $page->published_at;
        if ($status === ContentStatus::Published && $publishedAt === null) {
            $publishedAt = now();
        }

        // Automatic redirect handling if slug changes on published page
        if ($oldSlug !== $newSlug && $page->status === ContentStatus::Published) {
            SeoRedirect::query()->firstOrCreate(
                ['source_path' => "/p/{$oldSlug}"],
                [
                    'destination_url' => "/p/{$newSlug}",
                    'http_status' => 301,
                    'is_active' => true,
                    'admin_id' => $admin->id,
                ],
            );
        }

        $page->update([
            'slug' => $newSlug,
            'title' => (string) ($data['title'] ?? $page->title),
            'internal_name' => (string) ($data['internal_name'] ?? $page->internal_name),
            'summary' => array_key_exists('summary', $data) ? $data['summary'] : $page->summary,
            'content_blocks' => $blocks,
            'featured_image' => array_key_exists('featured_image', $data) ? $data['featured_image'] : $page->featured_image,
            'status' => $status,
            'published_at' => $publishedAt,
            'scheduled_for' => array_key_exists('scheduled_for', $data) ? $data['scheduled_for'] : $page->scheduled_for,
            'seo_title' => array_key_exists('seo_title', $data) ? $data['seo_title'] : $page->seo_title,
            'seo_description' => array_key_exists('seo_description', $data) ? $data['seo_description'] : $page->seo_description,
            'canonical_override' => array_key_exists('canonical_override', $data) ? $data['canonical_override'] : $page->canonical_override,
            'robots_directive' => (string) ($data['robots_directive'] ?? $page->robots_directive),
            'og_image' => array_key_exists('og_image', $data) ? $data['og_image'] : $page->og_image,
        ]);

        $this->createRevision($page, $admin, $changeNotes ?? 'Page content updated');

        $this->sitemapService->clearCache();

        return $page;
    }

    public function restoreRevision(
        ContentPage $page,
        ContentPageRevision $revision,
        Admin $admin,
    ): ContentPage {
        abort_unless($revision->content_page_id === $page->id, 404);

        $page->update([
            'title' => $revision->title,
            'content_blocks' => $revision->content_blocks,
            'seo_title' => $revision->seo_payload['seo_title'] ?? $page->seo_title,
            'seo_description' => $revision->seo_payload['seo_description'] ?? $page->seo_description,
        ]);

        $this->createRevision($page, $admin, "Restored to version {$revision->version}");

        $this->sitemapService->clearCache();

        return $page;
    }

    public function publishScheduledPages(): int
    {
        $scheduledPages = ContentPage::query()
            ->where('status', ContentStatus::Scheduled->value)
            ->whereNotNull('scheduled_for')
            ->where('scheduled_for', '<=', now())
            ->get();

        $count = 0;
        foreach ($scheduledPages as $page) {
            $page->update([
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

    private function createRevision(ContentPage $page, Admin $admin, string $notes): void
    {
        $lastVersion = (int) $page->revisions()->max('version');
        $nextVersion = $lastVersion + 1;

        ContentPageRevision::query()->create([
            'content_page_id' => $page->id,
            'admin_id' => $admin->id,
            'version' => $nextVersion,
            'title' => $page->title,
            'content_blocks' => $page->content_blocks,
            'seo_payload' => [
                'seo_title' => $page->seo_title,
                'seo_description' => $page->seo_description,
                'canonical_override' => $page->canonical_override,
                'robots_directive' => $page->robots_directive,
            ],
            'change_notes' => $notes,
            'created_at' => now(),
        ]);
    }
}
