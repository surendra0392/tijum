<?php

declare(strict_types=1);

namespace Tests\Feature\SeoAndMarketing;

use App\Enums\ContentStatus;
use App\Enums\OwnerStatus;
use App\Enums\PropertyOperationalStatus;
use App\Models\BlogArticle;
use App\Models\BlogCategory;
use App\Models\ContentPage;
use App\Models\Owner;
use App\Models\Property;
use App\Services\Seo\SitemapService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SitemapAndRobotsTest extends TestCase
{
    use RefreshDatabase;

    public function test_robots_txt_returns_disallow_rules_for_private_guard_routes_and_sitemap_directive(): void
    {
        $this->app->detectEnvironment(fn (): string => 'production');

        $response = $this->get('/robots.txt');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
            ->assertSee('User-agent: *', false)
            ->assertSee('Disallow: /admin', false)
            ->assertSee('Disallow: /owner', false)
            ->assertSee('Disallow: /_dev', false)
            ->assertSee('Sitemap: '.route('public.sitemap'), false);
    }

    public function test_sitemap_xml_generates_valid_xml_structure_with_canonical_urls(): void
    {
        $owner = Owner::factory()->create([
            'status' => OwnerStatus::Active,
        ]);

        $property = Property::factory()->create([
            'owner_id' => $owner->id,
            'status' => PropertyOperationalStatus::Active,
            'is_verified' => true,
            'booking_eligible' => true,
            'approved_at' => now(),
            'slug' => 'sitemap-verified-hostel',
        ]);

        $page = ContentPage::query()->create([
            'title' => 'About TIJUM Life',
            'slug' => 'about-tijum-life',
            'internal_name' => 'About TIJUM Life',
            'status' => ContentStatus::Published,
            'published_at' => now(),
        ]);

        $category = BlogCategory::query()->create([
            'name' => 'Food Inclusions',
            'slug' => 'food-inclusions',
            'is_active' => true,
        ]);

        $article = BlogArticle::query()->create([
            'title' => 'Sitemap Food Guide',
            'slug' => 'sitemap-food-guide',
            'excerpt' => 'Food guide excerpt',
            'content' => '<p>Content</p>',
            'category_id' => $category->id,
            'status' => ContentStatus::Published,
            'published_at' => now(),
        ]);

        $response = $this->get('/sitemap.xml');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee('<?xml version="1.0" encoding="UTF-8"?>', false)
            ->assertSee('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', false)
            ->assertSee(route('home'), false)
            ->assertSee(url('/hostels-in-hyderabad'), false)
            ->assertSee(url('/properties/'.$property->slug), false)
            ->assertSee(url('/p/'.$page->slug), false)
            ->assertSee(url('/blog/'.$article->slug), false);
    }

    public function test_sitemap_service_cache_invalidation(): void
    {
        $service = app(SitemapService::class);
        $initialXml = $service->generateXml();
        $this->assertNotEmpty($initialXml);

        $this->assertTrue(Cache::has('tijum_sitemap_xml'));

        $service->clearCache();
        $this->assertFalse(Cache::has('tijum_sitemap_xml'));
    }
}
