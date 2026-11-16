<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Blog\BlogArticleService;
use App\Services\Content\ContentPageService;
use Illuminate\Console\Command;

class PublishScheduledContentCommand extends Command
{
    protected $signature = 'tijum:publish-scheduled-content';

    protected $description = 'Publishes CMS pages and blog articles scheduled for publication';

    public function handle(
        ContentPageService $pageService,
        BlogArticleService $articleService,
    ): int {
        $this->info('Scanning for scheduled CMS pages and blog articles...');

        $pages = $pageService->publishScheduledPages();
        $articles = $articleService->publishScheduledArticles();

        $this->info("Published {$pages} scheduled page(s) and {$articles} scheduled article(s).");

        return self::SUCCESS;
    }
}
