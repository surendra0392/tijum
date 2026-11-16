<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicWebsiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_renders_with_seo_metadata_and_without_cross_guard_leakage(): void
    {
        $owner = Owner::factory()->active()->create();
        $admin = Admin::factory()->withTwoFactor()->create();

        $this->actingAs($owner, 'owner');
        $this->actingAs($admin, 'admin');

        $response = $this->get(route('home'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('auth.user', null)
                ->missing('auth.owner')
                ->missing('auth.admin')
                ->where('seo.title', 'TIJUM — Stay easy. Eat well. Spend less.')
                ->where('seo.canonical', route('home'))
                ->has('seo.description')
                ->has('seo.ogImage')
                ->has('seo.structuredData.@graph', 2)
                ->has('search.locations')
                ->has('featuredProperties')
                ->has('properties'),
            );

        $response->assertSee('data-inertia="meta-description"', false)
            ->assertSee('data-inertia="canonical"', false)
            ->assertSee('property="og:title"', false)
            ->assertSee('name="twitter:card"', false)
            ->assertSee('application/ld+json', false);
    }

    public function test_public_informational_pages_render_expected_inertia_components_and_metadata(): void
    {
        $routes = [
            ['name' => 'public.how-it-works', 'component' => 'public/how-it-works'],
            ['name' => 'public.about', 'component' => 'public/about'],
            ['name' => 'public.become-a-partner', 'component' => 'public/become-a-partner'],
            ['name' => 'public.faqs', 'component' => 'public/faqs'],
        ];

        $owner = Owner::factory()->active()->create();
        $this->actingAs($owner, 'owner');

        foreach ($routes as $item) {
            $this->get(route($item['name']))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component($item['component'])
                    ->where('auth.user', null)
                    ->missing('auth.owner')
                    ->missing('auth.admin')
                    ->where('seo.canonical', route($item['name']))
                    ->has('seo.title')
                    ->has('seo.description')
                    ->has('seo.ogImage')
                    ->has('seo.structuredData.@graph'),
                );
        }
    }

    public function test_public_timing_pages_receive_the_canonical_policy(): void
    {
        foreach (['home', 'public.how-it-works', 'public.faqs'] as $routeName) {
            $timingPath = $routeName === 'home' ? 'search.timing' : 'timing';

            $this->get(route($routeName))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where($timingPath.'.standard_check_in_time', '09:00')
                    ->where($timingPath.'.standard_check_out_time', '08:00')
                    ->where($timingPath.'.earliest_early_check_in_time', '07:00')
                    ->where($timingPath.'.timezone', 'Asia/Kolkata')
                );
        }
    }

    public function test_authenticated_customer_shares_customer_identity_on_public_pages_without_partner_or_admin_props(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->get(route('public.how-it-works'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/how-it-works')
                ->where('auth.user.email', $user->email)
                ->missing('auth.owner')
                ->missing('auth.admin'),
            );
    }

    public function test_public_sitemap_includes_only_indexable_public_pages(): void
    {
        $response = $this->get(route('public.sitemap'));

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee('<loc>'.route('home').'</loc>', false)
            ->assertSee('<loc>'.route('public.how-it-works').'</loc>', false)
            ->assertSee('<loc>'.route('public.about').'</loc>', false)
            ->assertSee('<loc>'.route('public.become-a-partner').'</loc>', false)
            ->assertSee('<loc>'.route('public.faqs').'</loc>', false)
            ->assertDontSee('/login', false)
            ->assertDontSee('/register', false)
            ->assertDontSee('/owner', false)
            ->assertDontSee('/admin', false)
            ->assertDontSee('/_dev', false)
            ->assertDontSee('/dashboard', false)
            ->assertDontSee('/settings', false);
    }

    public function test_robots_txt_blocks_crawling_outside_production_and_protects_private_routes_in_production(): void
    {
        $this->get(route('public.robots'))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
            ->assertSee("User-agent: *\nDisallow: /", false);

        $this->app->detectEnvironment(fn (): string => 'production');

        $this->get(route('public.robots'))
            ->assertOk()
            ->assertSee('Allow: /', false)
            ->assertSee('Disallow: /admin', false)
            ->assertSee('Disallow: /owner', false)
            ->assertSee('Disallow: /_dev', false)
            ->assertSee('Disallow: /dashboard', false)
            ->assertSee('Disallow: /settings', false)
            ->assertSee('Disallow: /login', false)
            ->assertSee('Disallow: /register', false)
            ->assertSee('Sitemap: '.route('public.sitemap'), false);
    }

    public function test_auth_entry_routes_for_all_three_guards_remain_accessible(): void
    {
        $this->get(route('login'))->assertOk();
        $this->get(route('register'))->assertOk();
        $this->get(route('owner.login'))->assertOk();
        $this->get(route('owner.register'))->assertOk();
        $this->get(route('admin.login'))->assertOk();
    }

    public function test_official_brand_assets_and_favicons_are_configured_without_starter_kit_svg(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertSee('href="/favicon.ico"', false)
            ->assertSee('href="/favicon-dark.png"', false)
            ->assertSee('href="/favicon-light.png"', false)
            ->assertSee('href="/apple-touch-icon.png"', false)
            ->assertDontSee('/favicon.svg', false);

        $this->assertFileDoesNotExist(public_path('favicon.svg'));

        foreach ([
            'favicon.ico',
            'favicon-16x16.png',
            'favicon-32x32.png',
            'favicon-dark.png',
            'favicon-light.png',
            'apple-touch-icon.png',
            'brand/logo/tijum-logo-primary.webp',
            'brand/logo/tijum-logo-primary.png',
            'brand/logo/tijum-logo-light.webp',
            'brand/logo/tijum-logo-light.png',
            'brand/icons/tijum-symbol.webp',
            'brand/icons/tijum-symbol-light.webp',
            'brand/app/tijum-app-icon-plum.webp',
            'brand/app/tijum-app-icon-cream.webp',
        ] as $relativeAssetPath) {
            $this->assertFileExists(public_path($relativeAssetPath));
        }
    }
}
