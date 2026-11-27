<?php

declare(strict_types=1);

namespace App\Services\Seo;

use App\Enums\OwnerStatus;
use App\Enums\PropertyOperationalStatus;
use App\Models\BlogArticle;
use App\Models\BlogCategory;
use App\Models\City;
use App\Models\ContentPage;
use App\Models\Property;
use Illuminate\Support\Facades\Cache;

class SitemapService
{
    private const CACHE_KEY = 'tijum_sitemap_xml';

    public function generateXml(): string
    {
        return Cache::remember(self::CACHE_KEY, 3600, function (): string {
            $urls = $this->collectUrls();

            $entries = array_map(static function (array $entry): string {
                $loc = htmlspecialchars($entry['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
                $lastmod = htmlspecialchars($entry['lastmod'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
                $changefreq = htmlspecialchars($entry['changefreq'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
                $priority = htmlspecialchars($entry['priority'], ENT_XML1 | ENT_QUOTES, 'UTF-8');

                return "    <url>\n"
                    ."        <loc>{$loc}</loc>\n"
                    ."        <lastmod>{$lastmod}</lastmod>\n"
                    ."        <changefreq>{$changefreq}</changefreq>\n"
                    ."        <priority>{$priority}</priority>\n"
                    .'    </url>';
            }, $urls);

            return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
                ."<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
                .implode("\n", $entries)."\n"
                ."</urlset>\n";
        });
    }

    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return list<array{loc: string, lastmod: string, changefreq: string, priority: string}>
     */
    public function collectUrls(): array
    {
        $urls = [];
        $now = now()->toIso8601String();

        // 1. Core static pages
        $static = [
            ['loc' => route('home'), 'changefreq' => 'daily', 'priority' => '1.0'],
            ['loc' => route('public.search'), 'changefreq' => 'daily', 'priority' => '0.9'],
            ['loc' => route('public.how-it-works'), 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => route('public.about'), 'changefreq' => 'monthly', 'priority' => '0.7'],
            ['loc' => route('public.contact'), 'changefreq' => 'monthly', 'priority' => '0.7'],
            ['loc' => route('public.become-a-partner'), 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => route('public.faqs'), 'changefreq' => 'weekly', 'priority' => '0.8'],
            ['loc' => route('public.terms'), 'changefreq' => 'monthly', 'priority' => '0.5'],
            ['loc' => route('public.privacy'), 'changefreq' => 'monthly', 'priority' => '0.5'],
            ['loc' => route('public.grievance-redressal'), 'changefreq' => 'monthly', 'priority' => '0.6'],
            ['loc' => route('review-policy'), 'changefreq' => 'monthly', 'priority' => '0.6'],
            ['loc' => route('public.blog.index'), 'changefreq' => 'daily', 'priority' => '0.9'],
        ];

        foreach ($static as $s) {
            $urls[] = [
                'loc' => $s['loc'],
                'lastmod' => $now,
                'changefreq' => $s['changefreq'],
                'priority' => $s['priority'],
            ];
        }

        // 2. Canonical accommodation category pages
        $canonicalCategories = ['hostels-pg', 'homestays', 'co-living'];
        foreach ($canonicalCategories as $catSlug) {
            $urls[] = [
                'loc' => url("/search?category={$catSlug}"),
                'lastmod' => $now,
                'changefreq' => 'daily',
                'priority' => '0.9',
            ];
        }

        // 3. City landing pages (canonical /stays-in-{slug})
        $activeCities = City::query()->where('is_active', true)->get();
        foreach ($activeCities as $city) {
            $urls[] = [
                'loc' => route('public.cities.stays', ['citySlug' => $city->slug]),
                'lastmod' => $city->updated_at?->toIso8601String() ?: $now,
                'changefreq' => 'daily',
                'priority' => '0.9',
            ];
        }

        // 4. Published CMS Pages (excluding noindex pages and slugs that duplicate core static routes)
        $reservedStaticSlugs = [
            'about', 'contact', 'terms', 'privacy', 'faqs', 'how-it-works',
            'become-a-partner', 'grievance-redressal', 'review-policy',
        ];
        $cmsPages = ContentPage::query()->published()->get();
        foreach ($cmsPages as $page) {
            if (in_array(strtolower((string) $page->slug), $reservedStaticSlugs, true)) {
                continue;
            }
            if (str_contains(strtolower($page->robots_directive), 'noindex')) {
                continue;
            }

            $pageUrl = url("/p/{$page->slug}");
            $urls[] = [
                'loc' => $pageUrl,
                'lastmod' => ($page->published_at ?: $page->updated_at)?->toIso8601String() ?: $now,
                'changefreq' => 'weekly',
                'priority' => '0.7',
            ];
        }

        // 5. Published Blog Articles
        $articles = BlogArticle::query()->published()->latest('published_at')->get();
        foreach ($articles as $article) {
            $urls[] = [
                'loc' => route('public.blog.show', ['article' => $article->slug]),
                'lastmod' => ($article->published_at ?: $article->updated_at)?->toIso8601String() ?: $now,
                'changefreq' => 'monthly',
                'priority' => '0.8',
            ];
        }

        // 6. Active Blog Categories with published articles
        $categories = BlogCategory::query()->active()->whereHas('articles', static function ($q): void {
            $q->published();
        })->get();
        foreach ($categories as $cat) {
            $urls[] = [
                'loc' => route('public.blog.category', ['category' => $cat->slug]),
                'lastmod' => $cat->updated_at?->toIso8601String() ?: $now,
                'changefreq' => 'weekly',
                'priority' => '0.7',
            ];
        }

        // 7. Eligible Public Property Details (canonical /stays/{citySlug}/{slug})
        $properties = Property::query()
            ->with('city')
            ->where('status', PropertyOperationalStatus::Active->value)
            ->where('is_verified', true)
            ->where('booking_eligible', true)
            ->whereNotNull('approved_at')
            ->where('food_provided', true)
            ->where(static function ($q): void {
                $q->where('breakfast_included', true)
                    ->orWhere('lunch_included', true)
                    ->orWhere('dinner_included', true);
            })
            ->whereHas('city', static function ($q): void {
                $q->where('is_active', true);
            })
            ->whereHas('category', static function ($q): void {
                $q->where('is_active', true);
            })
            ->whereHas('owner', static function ($q): void {
                $q->where('status', OwnerStatus::Active->value);
            })
            ->get();

        foreach ($properties as $prop) {
            $loc = $prop->city !== null
                ? route('public.properties.seo', ['citySlug' => $prop->city->slug, 'property' => $prop->slug])
                : route('public.properties.show', ['property' => $prop->slug]);

            $urls[] = [
                'loc' => $loc,
                'lastmod' => $prop->updated_at?->toIso8601String() ?: $now,
                'changefreq' => 'daily',
                'priority' => '0.8',
            ];
        }

        return $urls;
    }
}
