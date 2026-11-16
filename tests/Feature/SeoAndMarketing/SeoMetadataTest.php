<?php

declare(strict_types=1);

namespace Tests\Feature\SeoAndMarketing;

use App\Models\BlogArticle;
use App\Models\BlogCategory;
use App\Models\ContentAuthor;
use App\Models\SeoSetting;
use App\Services\Seo\SeoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SeoMetadataTest extends TestCase
{
    use RefreshDatabase;

    public function test_seo_service_generates_compliant_titles_and_schemas(): void
    {
        $service = app(SeoService::class);

        $title = $service->formatTitle('Hyderabad Hostels');
        $this->assertStringContainsString('Hyderabad Hostels', $title);
        $this->assertStringContainsString('TIJUM', $title);

        $canonical = $service->cleanCanonicalUrl(url('/search').'?utm_source=fb&gclid=123');
        $this->assertEquals(url('/search'), $canonical);

        // Strips page=1 since page 1 is redundant on root canonical
        $canonicalPage1 = $service->cleanCanonicalUrl(url('/blog').'?page=1&utm_medium=email');
        $this->assertEquals(url('/blog'), $canonicalPage1);

        // Preserves distinct content pagination (page >= 2) while stripping tracking parameters
        $canonicalPage2 = $service->cleanCanonicalUrl(url('/blog').'?page=2&utm_medium=email&fbclid=abc');
        $this->assertEquals(url('/blog').'?page=2', $canonicalPage2);

        // Preserves content query filters while removing tracking parameters
        $canonicalFilter = $service->cleanCanonicalUrl(url('/search').'?category=hostels&utm_campaign=winter');
        $this->assertEquals(url('/search').'?category=hostels', $canonicalFilter);

        $orgSchema = $service->organizationSchema();
        $this->assertEquals('Organization', $orgSchema['@type']);
        $this->assertEquals('TIJUM', $orgSchema['name']);

        $websiteSchema = $service->websiteSchema();
        $this->assertEquals('WebSite', $websiteSchema['@type']);

        $crumbsSchema = $service->breadcrumbSchema([
            ['name' => 'Blog', 'url' => 'https://tijum.com/blog'],
        ]);
        $this->assertEquals('BreadcrumbList', $crumbsSchema['@type']);
        $this->assertCount(2, $crumbsSchema['itemListElement']); // Home + Blog
    }

    public function test_seo_settings_model_persists_global_defaults(): void
    {
        $setting = SeoSetting::current();
        $this->assertNotNull($setting);
        $this->assertEquals('TIJUM', $setting->site_name);
        $this->assertStringContainsString('%s', $setting->title_template);
        $this->assertEquals('index, follow', $setting->default_robots);
    }

    public function test_blog_article_renders_article_json_ld_schema(): void
    {
        $author = ContentAuthor::query()->create([
            'name' => 'Aditya Varma',
            'slug' => 'aditya-varma',
            'is_active' => true,
        ]);

        $category = BlogCategory::query()->create([
            'name' => 'Hostel Guides',
            'slug' => 'hostel-guides',
            'is_active' => true,
        ]);

        $article = BlogArticle::query()->create([
            'title' => 'Top Food-Inclusive Stays in Hyderabad',
            'slug' => 'top-food-inclusive-stays-hyderabad',
            'excerpt' => 'A complete overview of meals included in student living.',
            'content' => '<p>Detailed article content with homestyle food details.</p>',
            'author_id' => $author->id,
            'category_id' => $category->id,
            'reading_time_minutes' => 4,
            'status' => 'published',
            'published_at' => now(),
        ]);

        $response = $this->get(route('public.blog.show', $article->slug));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/blog/show')
                ->where('article.id', $article->id)
                ->where('seo.ogType', 'article')
                ->has('seo.structuredData.@graph')
            );

        // Verify HTML tags rendered on initial server HTML
        $response->assertSee('data-inertia="meta-description"', false)
            ->assertSee('data-inertia="canonical"', false)
            ->assertSee('data-inertia="robots"', false)
            ->assertSee('application/ld+json', false);
    }
}
