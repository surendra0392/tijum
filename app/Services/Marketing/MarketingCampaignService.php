<?php

declare(strict_types=1);

namespace App\Services\Marketing;

use App\Enums\EmailCampaignStatus;
use App\Enums\SubscriberStatus;
use App\Mail\TijumMarketingMail;
use App\Models\MarketingCampaignDelivery;
use App\Models\MarketingEmailCampaign;
use App\Models\MarketingSubscriber;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class MarketingCampaignService
{
    public function estimateEligibleCount(MarketingEmailCampaign $campaign): int
    {
        return MarketingSubscriber::query()
            ->where('status', SubscriberStatus::Subscribed->value)
            ->count();
    }

    public function sendTestEmail(MarketingEmailCampaign $campaign, string $testEmail): void
    {
        $dummyUnsubscribeUrl = route('public.newsletter.unsubscribe', ['token' => 'test-preview-token']);

        Mail::to($testEmail)->send(new TijumMarketingMail(
            mailSubject: "[TEST PREVIEW] {$campaign->subject}",
            htmlBody: $campaign->content_html,
            plainTextBody: $campaign->content_text,
            unsubscribeUrl: $dummyUnsubscribeUrl,
            recipientName: 'Test Recipient',
        ));
    }

    public function dispatchCampaign(MarketingEmailCampaign $campaign): int
    {
        if (in_array($campaign->status, [EmailCampaignStatus::Sending, EmailCampaignStatus::Sent], true)) {
            throw new RuntimeException("Campaign is already in status {$campaign->status->value}.");
        }

        $campaign->update([
            'status' => EmailCampaignStatus::Sending,
        ]);

        $delivered = 0;
        $failed = 0;

        MarketingSubscriber::query()
            ->where('status', SubscriberStatus::Subscribed->value)
            ->chunk(100, function ($subscribers) use ($campaign, &$delivered, &$failed): void {
                /** @var MarketingSubscriber $subscriber */
                foreach ($subscribers as $subscriber) {
                    // Prevent duplicate send to same subscriber
                    $existing = MarketingCampaignDelivery::query()
                        ->where('email_campaign_id', $campaign->id)
                        ->where('subscriber_id', $subscriber->id)
                        ->first();

                    if ($existing && $existing->status === 'sent') {
                        continue;
                    }

                    $unsubscribeUrl = route('public.newsletter.unsubscribe', [
                        'token' => $subscriber->unsubscribe_token,
                    ]);

                    try {
                        Mail::to($subscriber->email)->send(new TijumMarketingMail(
                            mailSubject: $campaign->subject,
                            htmlBody: $campaign->content_html,
                            plainTextBody: $campaign->content_text,
                            unsubscribeUrl: $unsubscribeUrl,
                            recipientName: $subscriber->name,
                        ));

                        MarketingCampaignDelivery::query()->updateOrCreate(
                            [
                                'email_campaign_id' => $campaign->id,
                                'subscriber_id' => $subscriber->id,
                            ],
                            [
                                'email' => $subscriber->email,
                                'status' => 'sent',
                                'sent_at' => now(),
                                'error_message' => null,
                            ],
                        );

                        $delivered++;
                    } catch (\Throwable $e) {
                        Log::warning("Failed to send marketing email campaign #{$campaign->id} to {$subscriber->email}: {$e->getMessage()}");

                        MarketingCampaignDelivery::query()->updateOrCreate(
                            [
                                'email_campaign_id' => $campaign->id,
                                'subscriber_id' => $subscriber->id,
                            ],
                            [
                                'email' => $subscriber->email,
                                'status' => 'failed',
                                'error_message' => $e->getMessage(),
                            ],
                        );

                        $failed++;
                    }
                }
            });

        $campaign->update([
            'status' => EmailCampaignStatus::Sent,
            'sent_at' => now(),
            'total_recipients' => $delivered + $failed,
            'delivered_count' => $delivered,
            'failed_count' => $failed,
        ]);

        return $delivered;
    }
}
