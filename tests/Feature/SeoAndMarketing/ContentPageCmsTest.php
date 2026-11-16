<?php

declare(strict_types=1);

namespace Tests\Feature\SeoAndMarketing;

use App\Enums\ContentStatus;
use App\Models\Admin;
use App\Models\ContentPage;
use App\Services\Content\ContentBlockSanitizer;
use App\Services\Content\ContentPageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentPageCmsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_cms_page_with_modular_blocks_and_initial_revision(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();

        $response = $this->actingAs($admin, 'admin')->post(route('admin.content.pages.store'), [
            'title' => 'Student Living Guidelines',
            'slug' => 'student-living-guidelines',
            'internal_name' => 'Student Guidelines',
            'summary' => 'Comprehensive code of conduct and food timings.',
            'status' => ContentStatus::Published->value,
            'content_blocks' => [
                [
                    'type' => 'hero',
                    'data' => [
                        'headline' => 'Student Living Rules & Food Timings',
                        'subheadline' => 'Everything you need to know about stay timings and included meals.',
                        'badge' => 'Verified Student Living',
                    ],
                ],
                [
                    'type' => 'benefits',
                    'data' => [
                        'title' => 'Key Resident Benefits',
                        'items' => [
                            ['title' => '09:00 AM Check-In', 'description' => 'Arrive early and settle down comfortably.'],
                            ['title' => '08:00 AM Checkout', 'description' => 'Clean handover ensuring daily freshness.'],
                        ],
                    ],
                ],
            ],
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('content_pages', [
            'slug' => 'student-living-guidelines',
            'status' => 'published',
        ]);

        $page = ContentPage::query()->where('slug', 'student-living-guidelines')->first();
        $this->assertNotNull($page);
        $this->assertCount(1, $page->revisions);
        $this->assertEquals(1, $page->revisions->first()->version);
    }

    public function test_updating_cms_page_creates_audit_revision_and_can_be_restored(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();
        $service = app(ContentPageService::class);

        $page = $service->create([
            'title' => 'Version One Title',
            'slug' => 'version-one-slug',
            'internal_name' => 'V1',
            'status' => ContentStatus::Published->value,
            'content_blocks' => [
                ['type' => 'text', 'data' => ['text' => 'Original text paragraph.']],
            ],
        ], $admin);

        $this->assertEquals(1, $page->revisions()->count());

        // Update page to create Version 2
        $service->update($page, [
            'title' => 'Version Two Title',
            'slug' => 'version-one-slug',
            'internal_name' => 'V2',
            'status' => ContentStatus::Published->value,
            'content_blocks' => [
                ['type' => 'text', 'data' => ['text' => 'Updated text paragraph.']],
            ],
            'change_notes' => 'Updated text copy.',
        ], $admin);

        $this->assertEquals(2, $page->revisions()->count());
        $this->assertEquals('Version Two Title', $page->fresh()->title);

        // Restore version 1
        $v1 = $page->revisions()->where('version', 1)->first();
        $this->assertNotNull($v1);
        $service->restoreRevision($page, $v1, $admin);

        $page->refresh();
        $this->assertEquals('Version One Title', $page->title);
        $this->assertEquals(3, $page->revisions()->count()); // New restore revision recorded
    }

    public function test_slug_change_creates_automatic_seo_301_redirect(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();
        $service = app(ContentPageService::class);

        $page = $service->create([
            'title' => 'Old Slug Page',
            'slug' => 'old-slug-path',
            'internal_name' => 'Old Slug Page',
            'status' => ContentStatus::Published->value,
        ], $admin);

        $service->update($page, [
            'title' => 'New Slug Page',
            'slug' => 'new-slug-path',
            'internal_name' => 'New Slug Page',
            'status' => ContentStatus::Published->value,
        ], $admin);

        $this->assertDatabaseHas('seo_redirects', [
            'source_path' => '/p/old-slug-path',
            'destination_url' => '/p/new-slug-path',
            'http_status' => 301,
            'is_active' => true,
        ]);
    }

    public function test_block_sanitizer_strips_malicious_script_tags(): void
    {
        $sanitizer = app(ContentBlockSanitizer::class);

        $blocks = [
            [
                'type' => 'text',
                'data' => [
                    'text' => '<p>Safe paragraph</p><script>alert("hack");</script><iframe src="evil.com"></iframe>',
                ],
            ],
        ];

        $cleaned = $sanitizer->sanitizeBlocks($blocks);
        $html = $cleaned[0]['data']['text'];

        $this->assertStringContainsString('<p>Safe paragraph</p>', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('<iframe>', $html);
    }

    public function test_scheduled_publishing_console_command_publishes_eligible_pages(): void
    {
        $page = ContentPage::query()->create([
            'title' => 'Scheduled Morning Page',
            'slug' => 'scheduled-morning-page',
            'internal_name' => 'Scheduled Morning',
            'status' => ContentStatus::Scheduled->value,
            'scheduled_for' => now()->subMinutes(10), // Passed schedule time
        ]);

        $this->artisan('tijum:publish-scheduled-content')
            ->expectsOutputToContain('Scanning for scheduled CMS pages and blog articles')
            ->assertSuccessful();

        $page->refresh();
        $this->assertEquals(ContentStatus::Published->value, $page->status->value);
        $this->assertNotNull($page->published_at);
    }
}
