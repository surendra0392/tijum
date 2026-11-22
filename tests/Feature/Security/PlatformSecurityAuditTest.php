<?php

declare(strict_types=1);

namespace Tests\Feature\Security;

use App\Enums\AdminRole;
use App\Models\Admin;
use App\Models\MarketingEmailCampaign;
use App\Models\Owner;
use App\Models\Property;
use App\Services\Blog\BlogArticleService;
use App\Services\Security\HtmlSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Tests\Support\NotificationTestHelpers;
use Tests\TestCase;

class PlatformSecurityAuditTest extends TestCase
{
    use NotificationTestHelpers, RefreshDatabase;

    public function test_security_headers_are_present_on_web_and_api_responses(): void
    {
        $web = $this->get('/');
        $web->assertOk();
        $web->assertHeader('X-Content-Type-Options', 'nosniff');
        $web->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $web->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $web->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');

        $api = $this->getJson('/api/v1/public/config');
        $api->assertOk();
        $api->assertHeader('X-Content-Type-Options', 'nosniff');
        $api->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    public function test_owner_support_ticket_blocks_attaching_another_owners_property(): void
    {
        $ownerA = Owner::factory()->active()->create();
        $ownerB = Owner::factory()->active()->create();

        $foreignProperty = $this->createApprovedPropertyForOwner($ownerB);

        $response = $this->actingAs($ownerA, 'owner')
            ->post('/owner/support', [
                'subject' => 'Cross-tenant property probe',
                'category' => 'general',
                'priority' => 'standard',
                'message' => 'Trying to reference another owner property.',
                'property_id' => $foreignProperty->id,
            ]);

        $response->assertSessionHasErrors('property_id');
    }

    public function test_html_sanitizer_removes_script_breakouts_event_handlers_and_script_uris(): void
    {
        $sanitizer = new HtmlSanitizer;

        $dirty = '<p on click="alert(1)">Hello</p>'
            .'<a href="j&#97;vascript:alert(2)" target="_blank">Link</a>'
            .'<img src="vbscript:msgbox(1)" onerror="alert(3)" alt="bad">'
            .'<table><tbody><tr><td>₹1,200</td></tr></tbody></table>'
            .'<script>alert(4)</script><svg onload="alert(5)"></svg>';

        $clean = $sanitizer->sanitizeRichHtml($dirty, true);

        $this->assertStringNotContainsString('<script', $clean);
        $this->assertStringNotContainsString('<svg', $clean);
        $this->assertStringNotContainsString('onerror', $clean);
        $this->assertStringNotContainsString('on click', $clean);
        $this->assertStringNotContainsString('javascript:', strtolower($clean));
        $this->assertStringNotContainsString('vbscript:', strtolower($clean));
        $this->assertStringContainsString('<tr><td>₹1,200</td></tr>', $clean);
        $this->assertStringContainsString('rel="noopener noreferrer"', $clean);
        $this->assertStringContainsString('href="#"', $clean);

        // BlogArticleService preserves table rows properly too
        $admin = Admin::factory()->withTwoFactor()->create(['role' => AdminRole::Operations, 'is_active' => true]);
        $article = app(BlogArticleService::class)->createArticle([
            'title' => 'Security Verified Stay Guide',
            'content' => '<table><thead><tr><th>Meal</th></tr></thead><tbody><tr><td>Breakfast</td></tr></tbody></table><script>evil()</script>',
            'status' => 'draft',
        ], $admin);

        $this->assertStringContainsString('<tr><td>Breakfast</td></tr>', $article->content);
        $this->assertStringNotContainsString('<script', $article->content);
    }

    public function test_malicious_svg_uploads_are_rejected_in_platform_settings_and_sanitizer(): void
    {
        Storage::fake('public');

        $superAdmin = Admin::factory()->withTwoFactor()->create([
            'role' => AdminRole::SuperAdmin,
            'is_active' => true,
        ]);

        $maliciousSvg = UploadedFile::fake()->createWithContent(
            'evil.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body onload="alert(1)"/></foreignObject></svg>'
        );

        $this->actingAs($superAdmin, 'admin')
            ->postJson('/admin/system/settings/upload-asset', [
                'file' => $maliciousSvg,
                'asset_type' => 'primary_logo',
            ])
            ->assertStatus(422);

        $sanitizer = new HtmlSanitizer;
        $this->expectException(InvalidArgumentException::class);
        $sanitizer->assertSafeSvg('<svg xmlns="http://www.w3.org/2000/svg"><use xlink:href="javascript:alert(1)"/></svg>');
    }

    public function test_marketing_email_campaign_sanitizes_html_and_structured_data_escapes_script_tags(): void
    {
        $opsAdmin = Admin::factory()->withTwoFactor()->create([
            'role' => AdminRole::Operations,
            'is_active' => true,
        ]);

        $this->actingAs($opsAdmin, 'admin')
            ->post('/admin/marketing/emails', [
                'title' => 'Test Promo',
                'subject' => 'Promo Subject',
                'content_html' => '<p>Save ₹500</p><script>alert(1)</script><a href="javascript:alert(2)">Claim</a>',
                'target_segment' => 'all_subscribed',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('marketing_email_campaigns', [
            'title' => 'Test Promo',
        ]);

        $storedHtml = (string) MarketingEmailCampaign::query()
            ->where('title', 'Test Promo')
            ->value('content_html');

        $this->assertStringContainsString('Save ₹500', $storedHtml);
        $this->assertStringNotContainsString('<script', $storedHtml);
        $this->assertStringNotContainsString('javascript:', strtolower($storedHtml));
    }

    public function test_webhooks_reject_unconfigured_secrets_when_not_local_or_testing(): void
    {
        Config::set('tijum.notifications.channels.whatsapp.app_secret', '');
        Config::set('services.whatsapp.webhook_secret', '');
        Config::set('services.sms.webhook_secret', '');
        Config::set('tijum.notifications.channels.sms.webhook_secret', '');

        $originalEnv = $this->app['env'];
        $this->app['env'] = 'staging';

        try {
            $this->postJson('/webhooks/whatsapp', ['entry' => []])->assertStatus(503);
            $this->postJson('/webhooks/sms', ['requestId' => 'req-1'])->assertStatus(503);
        } finally {
            $this->app['env'] = $originalEnv;
        }
    }

    public function test_api_v1_guards_prevent_customer_token_access_to_owner_endpoints(): void
    {
        $customer = $this->createCustomer();
        $customerToken = $customer->createToken('test-customer')->plainTextToken;

        $this->withToken($customerToken)
            ->getJson('/api/v1/owner/dashboard')
            ->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
        $this->getJson('/api/v1/customer/profile')->assertUnauthorized();
        $this->getJson('/api/v1/owner/dashboard')->assertUnauthorized();
    }

    public function test_api_v1_guards_prevent_owner_token_access_to_customer_endpoints(): void
    {
        $owner = $this->createPartner();
        $ownerToken = $owner->createToken('test-owner')->plainTextToken;

        $this->withToken($ownerToken)
            ->getJson('/api/v1/customer/profile')
            ->assertForbidden();
    }

    private function createApprovedPropertyForOwner(Owner $owner): Property
    {
        return Property::factory()->create([
            'owner_id' => $owner->id,
        ]);
    }
}
