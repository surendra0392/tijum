<?php

declare(strict_types=1);

namespace Tests\Feature\SeoAndMarketing;

use App\Enums\BannerPlacement;
use App\Enums\BannerStatus;
use App\Enums\CampaignStatus;
use App\Models\Admin;
use App\Models\MarketingBanner;
use App\Models\MarketingCampaign;
use App\Models\MarketingTrackingEvent;
use App\Services\Marketing\MarketingTrackingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MarketingBannersAndCampaignsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_campaign_and_generate_utm_tracking_url(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();

        $response = $this->actingAs($admin, 'admin')->post(route('admin.marketing.campaigns.store'), [
            'name' => 'Guntur College Season Launch',
            'slug' => 'guntur-college-launch-2026',
            'objective' => 'customer_acquisition',
            'utm_source' => 'instagram',
            'utm_medium' => 'paid_social',
            'utm_campaign' => 'guntur_launch',
            'utm_content' => 'student_hero',
            'target_landing_url' => '/hostels-in-guntur',
            'status' => CampaignStatus::Active->value,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('marketing_campaigns', [
            'slug' => 'guntur-college-launch-2026',
            'utm_campaign' => 'guntur_launch',
        ]);

        $campaign = MarketingCampaign::query()->where('slug', 'guntur-college-launch-2026')->first();
        $this->assertNotNull($campaign);

        $trackingUrl = $campaign->generateTrackingUrl();
        $this->assertStringContainsString('utm_source=instagram', $trackingUrl);
        $this->assertStringContainsString('utm_medium=paid_social', $trackingUrl);
        $this->assertStringContainsString('utm_campaign=guntur_launch', $trackingUrl);
    }

    public function test_active_hero_and_strip_banners_render_on_welcome_homepage(): void
    {
        $heroBanner = MarketingBanner::query()->create([
            'name' => 'Homepage Hero Banner',
            'headline' => 'Save ₹500 On First Food-Inclusive Booking',
            'description' => 'Use coupon TIJUMFOOD on checkout',
            'cta_text' => 'Book Now',
            'cta_url' => '/search',
            'placement' => BannerPlacement::HomepageHero,
            'status' => BannerStatus::Active,
            'display_order' => 1,
        ]);

        $stripBanner = MarketingBanner::query()->create([
            'name' => 'Homepage Strip Banner',
            'headline' => 'Now live in Guntur and Vijayawada!',
            'cta_text' => 'Explore Stays',
            'cta_url' => '/hostels-in-guntur',
            'placement' => BannerPlacement::HomepageStrip,
            'status' => BannerStatus::Active,
            'display_order' => 1,
        ]);

        $response = $this->get(route('home'));

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->has('heroBanners', 1)
                ->where('heroBanners.0.id', $heroBanner->id)
                ->has('stripBanners', 1)
                ->where('stripBanners.0.id', $stripBanner->id)
            );
    }

    public function test_first_party_marketing_tracking_event_records_hashed_ip_and_metadata(): void
    {
        $response = $this->postJson(route('api.marketing.track'), [
            'event_type' => 'banner_click',
            'utm_source' => 'newsletter',
            'utm_medium' => 'email',
            'utm_campaign' => 'october_digest',
            'page_url' => 'https://tijum.com/hostels-in-hyderabad',
        ]);

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('marketing_tracking_events', [
            'event_type' => 'banner_click',
            'utm_campaign' => 'october_digest',
        ]);

        $event = MarketingTrackingEvent::query()->where('utm_campaign', 'october_digest')->first();
        $this->assertNotNull($event);
        $this->assertNotEmpty($event->ip_hash);
        $this->assertNotEquals('127.0.0.1', $event->ip_hash); // Hashed, never raw
        // Verify cryptographic keyed HMAC-SHA256 was used
        $this->assertEquals(hash_hmac('sha256', '127.0.0.1', (string) config('app.key')), $event->ip_hash);
    }

    public function test_marketing_tracking_events_can_be_pruned_after_retention_period(): void
    {
        $trackingService = app(MarketingTrackingService::class);

        // Create an event older than 90 days
        $oldEvent = MarketingTrackingEvent::query()->create([
            'event_type' => 'page_view',
            'page_url' => 'https://tijum.com/hostels-in-hyderabad',
            'ip_hash' => hash_hmac('sha256', '10.0.0.1', (string) config('app.key')),
            'created_at' => now()->subDays(95),
        ]);

        // Create a recent event within 90 days
        $recentEvent = MarketingTrackingEvent::query()->create([
            'event_type' => 'page_view',
            'page_url' => 'https://tijum.com/hostels-in-hyderabad',
            'ip_hash' => hash_hmac('sha256', '10.0.0.2', (string) config('app.key')),
            'created_at' => now()->subDays(10),
        ]);

        $deletedCount = $trackingService->pruneOldEvents(90);

        $this->assertEquals(1, $deletedCount);
        $this->assertDatabaseMissing('marketing_tracking_events', ['id' => $oldEvent->id]);
        $this->assertDatabaseHas('marketing_tracking_events', ['id' => $recentEvent->id]);
    }
}
