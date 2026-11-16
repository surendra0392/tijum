<?php

declare(strict_types=1);

namespace App\Services\Marketing;

use App\Models\MarketingBanner;
use App\Models\MarketingCampaign;
use App\Models\MarketingTrackingEvent;
use Illuminate\Http\Request;

class MarketingTrackingService
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function recordEvent(Request $request, array $payload): ?MarketingTrackingEvent
    {
        $eventType = (string) ($payload['event_type'] ?? 'page_view');
        $eventKey = isset($payload['event_key']) ? (string) $payload['event_key'] : null;
        $pageUrl = (string) ($payload['page_url'] ?? $request->fullUrl());

        $utmSource = $payload['utm_source'] ?? $request->query('utm_source');
        $utmMedium = $payload['utm_medium'] ?? $request->query('utm_medium');
        $utmCampaign = $payload['utm_campaign'] ?? $request->query('utm_campaign');
        $utmContent = $payload['utm_content'] ?? $request->query('utm_content');

        $campaignId = null;
        if (is_string($utmCampaign) && $utmCampaign !== '') {
            $campaign = MarketingCampaign::query()->where('utm_campaign', $utmCampaign)->first();
            $campaignId = $campaign?->id;
        }

        $ip = $request->ip() ?: '127.0.0.1';
        $ipHash = hash_hmac('sha256', $ip, (string) config('app.key'));

        // Handle Banner Click / Impression increment
        if ($eventType === 'banner_click' && $eventKey) {
            $banner = MarketingBanner::query()->find($eventKey);
            $banner?->increment('click_count');
        } elseif ($eventType === 'banner_impression' && $eventKey) {
            $banner = MarketingBanner::query()->find($eventKey);
            $banner?->increment('impression_count');
        }

        /** @var MarketingTrackingEvent $event */
        $event = MarketingTrackingEvent::query()->create([
            'event_type' => $eventType,
            'event_key' => $eventKey,
            'page_url' => $pageUrl,
            'utm_source' => is_string($utmSource) ? substr($utmSource, 0, 64) : null,
            'utm_medium' => is_string($utmMedium) ? substr($utmMedium, 0, 64) : null,
            'utm_campaign' => is_string($utmCampaign) ? substr($utmCampaign, 0, 64) : null,
            'utm_content' => is_string($utmContent) ? substr($utmContent, 0, 64) : null,
            'campaign_id' => $campaignId,
            'ip_hash' => $ipHash,
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
            'created_at' => now(),
        ]);

        return $event;
    }

    /**
     * Prune marketing telemetry events older than the retention threshold.
     * In compliance with GDPR (Art. 4(5)) and the Indian DPDP Act 2023,
     * pseudonymous telemetry records are retained for a standard 90-day lifecycle.
     */
    public function pruneOldEvents(int $retentionDays = 90): int
    {
        return MarketingTrackingEvent::query()
            ->where('created_at', '<', now()->subDays($retentionDays))
            ->delete();
    }
}
