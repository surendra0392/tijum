<?php

declare(strict_types=1);

namespace Tests\Feature\SeoAndMarketing;

use App\Models\City;
use App\Services\Seo\SeoService;
use App\Services\Seo\SitemapService;
use Database\Seeders\CategoryRedirectSeeder;
use Database\Seeders\CitySeeder;
use Database\Seeders\PropertyCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryConsolidationContentAndRedirectsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CitySeeder::class);
        $this->seed(PropertyCategorySeeder::class);
        $this->seed(CategoryRedirectSeeder::class);
    }

    public function test_legacy_category_routes_redirect_301_to_canonical_routes(): void
    {
        $cases = [
            '/categories/independent-hostel' => '/search?category=hostels-pg',
            '/categories/pg-accommodation' => '/search?category=hostels-pg',
            '/categories/homestay' => '/search?category=homestays',
            '/categories/hostels-pg' => '/search?category=hostels-pg',
            '/categories/co-living' => '/search?category=co-living',
            '/category/independent-hostel' => '/search?category=hostels-pg',
            '/category/pg-accommodation' => '/search?category=hostels-pg',
            '/category/homestay' => '/search?category=homestays',
            '/category/co-living' => '/search?category=co-living',
            '/hostels' => '/search?category=hostels-pg',
            '/pg' => '/search?category=hostels-pg',
            '/pgs' => '/search?category=hostels-pg',
            '/homestays' => '/search?category=homestays',
            '/co-living' => '/search?category=co-living',
            '/coliving' => '/search?category=co-living',
        ];

        foreach ($cases as $legacyUrl => $expectedRedirect) {
            $response = $this->get($legacyUrl);
            $response->assertStatus(301);
            $response->assertRedirect($expectedRedirect);
        }
    }

    public function test_legacy_city_accommodation_routes_redirect_301_to_canonical_city_routes(): void
    {
        $cases = [
            '/pgs-in-hyderabad' => '/hostels-in-hyderabad',
            '/hotels-in-hyderabad' => '/hostels-in-hyderabad',
            '/lodges-in-vijayawada' => '/hostels-in-vijayawada',
            '/homestays-in-guntur' => '/hostels-in-guntur',
            '/coliving-in-visakhapatnam' => '/hostels-in-visakhapatnam',
        ];

        foreach ($cases as $legacyCityUrl => $expectedRedirect) {
            $response = $this->get($legacyCityUrl);
            $response->assertStatus(301);
            $response->assertRedirect($expectedRedirect);
        }
    }

    public function test_seo_service_schemas_reflect_consolidated_categories_and_food_flags(): void
    {
        $seoService = app(SeoService::class);

        $orgSchema = $seoService->organizationSchema();
        $this->assertStringContainsString('Hostels/PG, Homestays, and Co-Living', $orgSchema['description']);
        $this->assertStringContainsString('property-specific food flags', $orgSchema['description']);

        $webSchema = $seoService->websiteSchema();
        $this->assertStringContainsString('Hostels/PG, Homestays, and Co-Living', $webSchema['description']);
        $this->assertStringContainsString('property-specific food flags', $webSchema['description']);

        $payload = $seoService->buildPayload();
        $this->assertStringContainsString('Hostels/PG, Homestays, and Co-Living', $payload['description']);
    }

    public function test_sitemap_service_includes_canonical_category_urls(): void
    {
        $sitemapService = app(SitemapService::class);
        $sitemapService->clearCache();

        $xml = $sitemapService->generateXml();

        $this->assertStringContainsString('/search?category=hostels-pg', $xml);
        $this->assertStringContainsString('/search?category=homestays', $xml);
        $this->assertStringContainsString('/search?category=co-living', $xml);
        $this->assertStringContainsString('/hostels-in-hyderabad', $xml);
        $this->assertStringContainsString('/terms', $xml);
        $this->assertStringContainsString('/privacy', $xml);
    }

    public function test_public_pages_return_updated_seo_metadata_and_structured_data(): void
    {
        $city = City::query()->where('slug', 'hyderabad')->firstOrFail();

        $homeResponse = $this->get(route('home'));
        $homeResponse->assertOk();
        $homeResponse->assertInertia(fn ($page) => $page
            ->has('seo.title')
            ->where('seo.title', 'TIJUM — Stay easy. Eat well. Spend less.')
            ->has('seo.description')
            ->where('seo.description', 'Discover Hostels/PG, Homestays, and Co-Living accommodation across Hyderabad, Guntur, Vijayawada, and Visakhapatnam with property-specific food and room details.')
        );

        $faqsResponse = $this->get(route('public.faqs'));
        $faqsResponse->assertOk();
        $faqsResponse->assertInertia(fn ($page) => $page
            ->has('seo.title')
            ->where('seo.title', 'Frequently Asked Questions — Stays, Food Flags & Check-In | TIJUM')
            ->has('seo.structuredData.@graph')
        );

        $termsResponse = $this->get(route('public.terms'));
        $termsResponse->assertOk();
        $termsResponse->assertInertia(fn ($page) => $page
            ->component('public/terms')
            ->has('seo.title')
            ->where('seo.title', 'Terms of Service & Platform Agreement — TIJUM')
        );

        $privacyResponse = $this->get(route('public.privacy'));
        $privacyResponse->assertOk();
        $privacyResponse->assertInertia(fn ($page) => $page
            ->component('public/privacy')
            ->has('seo.title')
            ->where('seo.title', 'Privacy Policy & Data Protection — TIJUM')
        );

        $cityResponse = $this->get(route('public.cities.show', ['citySlug' => $city->slug]));
        $cityResponse->assertOk();
        $cityResponse->assertInertia(fn ($page) => $page
            ->has('seo.title')
            ->where('seo.title', 'Hostels/PG, Homestays & Co-Living in Hyderabad | TIJUM')
            ->has('editorial.food_inclusions')
        );
    }
}
