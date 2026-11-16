<?php

declare(strict_types=1);

namespace Tests\Feature\SeoAndMarketing;

use App\Models\Admin;
use App\Models\SeoRedirect;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoRedirectsTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_redirect_returns_301_permanent_redirect_and_increments_hits(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();

        $redirect = SeoRedirect::query()->create([
            'source_path' => '/legacy-hyderabad-hostel',
            'destination_url' => '/hostels-in-hyderabad',
            'http_status' => 301,
            'is_active' => true,
            'hits_count' => 0,
            'admin_id' => $admin->id,
        ]);

        $response = $this->get('/legacy-hyderabad-hostel');

        $response->assertStatus(301);
        $response->assertRedirect('/hostels-in-hyderabad');

        $redirect->refresh();
        $this->assertEquals(1, $redirect->hits_count);
        $this->assertNotNull($redirect->last_hit_at);
    }

    public function test_inactive_redirect_does_not_redirect(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();

        SeoRedirect::query()->create([
            'source_path' => '/inactive-legacy-url',
            'destination_url' => '/how-it-works',
            'http_status' => 301,
            'is_active' => false,
            'admin_id' => $admin->id,
        ]);

        $response = $this->get('/inactive-legacy-url');

        // Should return 404 since it's inactive and doesn't match a route
        $response->assertNotFound();
    }

    public function test_admin_cannot_create_identical_source_and_destination_preventing_loop(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();

        $response = $this->actingAs($admin, 'admin')->post(route('admin.seo.redirects.store'), [
            'source_path' => '/infinite-loop',
            'destination_url' => '/infinite-loop',
            'http_status' => 301,
            'is_active' => true,
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('seo_redirects', [
            'source_path' => '/infinite-loop',
        ]);
    }

    public function test_admin_cannot_create_external_open_redirect_to_arbitrary_domain(): void
    {
        $admin = Admin::factory()->withTwoFactor()->create();

        $response = $this->actingAs($admin, 'admin')->post(route('admin.seo.redirects.store'), [
            'source_path' => '/suspicious-redirect',
            'destination_url' => 'https://malicious-external-site.com/steal-login',
            'http_status' => 301,
            'is_active' => true,
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('seo_redirects', [
            'source_path' => '/suspicious-redirect',
        ]);
    }
}
