<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\Marketing;

use App\Enums\BannerStatus;
use App\Enums\CampaignStatus;
use App\Enums\SubscriberStatus;
use App\Http\Controllers\Controller;
use App\Models\BlogArticle;
use App\Models\ContentPage;
use App\Models\MarketingBanner;
use App\Models\MarketingCampaign;
use App\Models\MarketingEmailCampaign;
use App\Models\MarketingSubscriber;
use App\Models\MarketingTrackingEvent;
use Inertia\Inertia;
use Inertia\Response;

class AdminMarketingDashboardController extends Controller
{
    public function index(): Response
    {
        $activeCampaigns = MarketingCampaign::query()->where('status', CampaignStatus::Active->value)->count();
        $liveBanners = MarketingBanner::query()->where('status', BannerStatus::Active->value)->count();
        $totalSubscribers = MarketingSubscriber::query()->where('status', SubscriberStatus::Subscribed->value)->count();
        $unsubscribedCount = MarketingSubscriber::query()->where('status', SubscriberStatus::Unsubscribed->value)->count();
        $publishedArticles = BlogArticle::query()->published()->count();
        $publishedPages = ContentPage::query()->published()->count();

        $emailCampaigns = MarketingEmailCampaign::query()
            ->with('admin')
            ->latest()
            ->take(5)
            ->get();

        $recentSubscribers = MarketingSubscriber::query()
            ->latest()
            ->take(5)
            ->get();

        $trackingStats = [
            'total_page_views' => MarketingTrackingEvent::query()->where('event_type', 'page_view')->count(),
            'total_blog_views' => MarketingTrackingEvent::query()->where('event_type', 'blog_view')->count(),
            'total_banner_clicks' => MarketingTrackingEvent::query()->where('event_type', 'banner_click')->count(),
            'total_cta_clicks' => MarketingTrackingEvent::query()->where('event_type', 'cta_click')->count(),
            'total_newsletter_signups' => MarketingTrackingEvent::query()->where('event_type', 'newsletter_signup')->count(),
        ];

        $utmBreakdown = MarketingTrackingEvent::query()
            ->whereNotNull('utm_campaign')
            ->selectRaw('utm_campaign, count(*) as count')
            ->groupBy('utm_campaign')
            ->orderByDesc('count')
            ->take(5)
            ->get();

        return Inertia::render('admin/marketing/index', [
            'metrics' => [
                'active_campaigns' => $activeCampaigns,
                'live_banners' => $liveBanners,
                'total_subscribers' => $totalSubscribers,
                'unsubscribed_count' => $unsubscribedCount,
                'published_articles' => $publishedArticles,
                'published_pages' => $publishedPages,
            ],
            'trackingStats' => $trackingStats,
            'utmBreakdown' => $utmBreakdown,
            'recentEmailCampaigns' => $emailCampaigns,
            'recentSubscribers' => $recentSubscribers,
        ]);
    }
}
