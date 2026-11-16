<?php

declare(strict_types=1);

namespace Tests\Feature\SeoAndMarketing;

use App\Enums\EmailCampaignStatus;
use App\Enums\SubscriberStatus;
use App\Mail\TijumMarketingMail;
use App\Models\Admin;
use App\Models\MarketingEmailCampaign;
use App\Models\MarketingSubscriber;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class NewsletterAndEmailMarketingTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_user_can_subscribe_with_explicit_consent_creating_audit_record(): void
    {
        $response = $this->post(route('public.newsletter.subscribe'), [
            'email' => 'guest@example.com',
            'marketing_consent' => true,
            'source' => 'footer_form',
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('marketing_subscribers', [
            'email' => 'guest@example.com',
            'status' => 'subscribed',
        ]);

        $subscriber = MarketingSubscriber::query()->where('email', 'guest@example.com')->first();
        $this->assertNotNull($subscriber);
        $this->assertNotNull($subscriber->unsubscribe_token);

        $this->assertDatabaseHas('marketing_consent_records', [
            'marketing_subscriber_id' => $subscriber->id,
            'action' => 'opt_in',
            'channel' => 'email',
            'source' => 'footer_form',
        ]);
    }

    public function test_subscription_requires_explicit_marketing_consent(): void
    {
        $response = $this->post(route('public.newsletter.subscribe'), [
            'email' => 'noconsent@example.com',
            'marketing_consent' => false,
        ]);

        $response->assertSessionHasErrors(['marketing_consent']);
        $this->assertDatabaseMissing('marketing_subscribers', [
            'email' => 'noconsent@example.com',
        ]);
    }

    public function test_subscriber_can_unsubscribe_via_token_with_rfc_8058_support(): void
    {
        $subscriber = MarketingSubscriber::query()->create([
            'email' => 'leave@example.com',
            'status' => SubscriberStatus::Subscribed,
            'unsubscribe_token' => 'test-unsub-token-12345',
            'confirmed_at' => now(),
            'source' => 'web',
        ]);

        $response = $this->get('/unsubscribe/test-unsub-token-12345');

        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/newsletter/unsubscribed')
                ->where('email', 'leave@example.com')
            );

        $subscriber->refresh();
        $this->assertEquals(SubscriberStatus::Unsubscribed, $subscriber->status);
        $this->assertNotNull($subscriber->unsubscribed_at);

        // Immutable audit record created
        $this->assertDatabaseHas('marketing_consent_records', [
            'marketing_subscriber_id' => $subscriber->id,
            'action' => 'opt_out',
        ]);
    }

    public function test_marketing_email_includes_list_unsubscribe_headers(): void
    {
        $campaign = MarketingEmailCampaign::query()->create([
            'title' => 'Test Header Campaign',
            'subject' => 'Test Subject',
            'content_html' => '<p>Hello world</p>',
            'content_text' => 'Hello world',
            'target_segment' => 'all_subscribers',
            'status' => EmailCampaignStatus::Draft,
        ]);

        $subscriber = MarketingSubscriber::query()->create([
            'email' => 'header@example.com',
            'status' => SubscriberStatus::Subscribed,
            'unsubscribe_token' => 'header-token-xyz',
            'source' => 'test',
        ]);

        $mailable = new TijumMarketingMail(
            $campaign->subject,
            $campaign->content_html,
            $campaign->content_text,
            route('public.newsletter.unsubscribe', $subscriber->unsubscribe_token)
        );
        $headers = $mailable->headers()->text;

        $this->assertArrayHasKey('List-Unsubscribe', $headers);
        $this->assertArrayHasKey('List-Unsubscribe-Post', $headers);
        $this->assertEquals('List-Unsubscribe=One-Click', $headers['List-Unsubscribe-Post']);
    }

    public function test_admin_can_send_test_email_and_dispatch_campaign_to_subscribers(): void
    {
        Mail::fake();

        $admin = Admin::factory()->withTwoFactor()->create();

        $campaign = MarketingEmailCampaign::query()->create([
            'title' => 'Launch Broadcast',
            'subject' => 'Discover TIJUM Stays',
            'content_html' => '<p>Launch content</p>',
            'target_segment' => 'all_subscribers',
            'status' => EmailCampaignStatus::Draft,
            'admin_id' => $admin->id,
        ]);

        MarketingSubscriber::query()->create([
            'email' => 'sub1@example.com',
            'status' => SubscriberStatus::Subscribed,
            'unsubscribe_token' => 'sub1-token',
            'source' => 'launch',
        ]);

        MarketingSubscriber::query()->create([
            'email' => 'sub2@example.com',
            'status' => SubscriberStatus::Subscribed,
            'unsubscribe_token' => 'sub2-token',
            'source' => 'launch',
        ]);

        MarketingSubscriber::query()->create([
            'email' => 'unsub@example.com',
            'status' => SubscriberStatus::Unsubscribed, // should NOT receive
            'unsubscribe_token' => 'unsub-token',
            'source' => 'launch',
        ]);

        // Send test email
        $responseTest = $this->actingAs($admin, 'admin')->post(
            route('admin.marketing.emails.test', $campaign),
            ['test_email' => 'admin-test@example.com']
        );
        $responseTest->assertRedirect();
        Mail::assertSent(TijumMarketingMail::class, 1);

        // Dispatch campaign to verified audience
        $responseDispatch = $this->actingAs($admin, 'admin')->post(
            route('admin.marketing.emails.send', $campaign)
        );
        $responseDispatch->assertRedirect();

        $campaign->refresh();
        $this->assertEquals(EmailCampaignStatus::Sent, $campaign->status);
        $this->assertEquals(2, $campaign->delivered_count);

        // Mail should have been sent to 2 subscribers + 1 test earlier = 3 total
        Mail::assertSent(TijumMarketingMail::class, 3);
    }
}
