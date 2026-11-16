<?php

declare(strict_types=1);

namespace Tests\Feature\Admin\System;

use App\Enums\AdminRole;
use App\Models\Admin;
use App\Models\City;
use App\Models\PlatformSetting;
use App\Models\PropertyCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SystemManagementTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): Admin
    {
        return Admin::factory()->role(AdminRole::SuperAdmin)->withTwoFactor()->create();
    }

    private function supportAdmin(): Admin
    {
        return Admin::factory()->role(AdminRole::CustomerSupport)->withTwoFactor()->create();
    }

    public function test_non_super_admins_cannot_access_system_management(): void
    {
        $support = $this->supportAdmin();

        $this->actingAs($support, 'admin')
            ->get(route('admin.system.admins.index'))
            ->assertForbidden();

        $this->actingAs($support, 'admin')
            ->get(route('admin.system.roles.index'))
            ->assertForbidden();

        $this->actingAs($support, 'admin')
            ->get(route('admin.system.cities.index'))
            ->assertForbidden();

        $this->actingAs($support, 'admin')
            ->get(route('admin.system.categories.index'))
            ->assertForbidden();

        $this->actingAs($support, 'admin')
            ->get(route('admin.system.settings.index'))
            ->assertForbidden();
    }

    public function test_super_admin_can_view_admins_and_create_new_account(): void
    {
        $superAdmin = $this->superAdmin();

        $this->actingAs($superAdmin, 'admin')
            ->get(route('admin.system.admins.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/system/admins/index')
                ->has('admins.data')
                ->has('roles')
            );

        $response = $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.admins.store'), [
                'name' => 'Vikram Patel',
                'email' => 'vikram@tijum.com',
                'role' => AdminRole::Operations->value,
                'password' => 'Password123#Secure',
            ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('admins', [
            'email' => 'vikram@tijum.com',
            'role' => AdminRole::Operations->value,
            'is_active' => true,
        ]);
    }

    public function test_super_admin_cannot_deactivate_self_but_can_toggle_others(): void
    {
        $superAdmin = $this->superAdmin();
        $otherAdmin = Admin::factory()->role(AdminRole::Finance)->withTwoFactor()->create(['is_active' => true]);

        // Toggle self -> redirected with error
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.admins.toggle-status', $superAdmin))
            ->assertRedirect()
            ->assertSessionHasErrors('error');

        // Toggle other -> success
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.admins.toggle-status', $otherAdmin))
            ->assertRedirect();

        $this->assertFalse($otherAdmin->fresh()->is_active);
    }

    public function test_super_admin_can_reset_two_factor_for_admin(): void
    {
        $superAdmin = $this->superAdmin();
        $staff = Admin::factory()->role(AdminRole::PropertyVerification)->withTwoFactor()->create();

        $this->assertNotNull($staff->two_factor_secret);

        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.admins.reset-2fa', $staff))
            ->assertRedirect();

        $this->assertNull($staff->fresh()->two_factor_secret);
        $this->assertNull($staff->fresh()->two_factor_confirmed_at);
    }

    public function test_super_admin_can_view_roles_and_permission_matrix(): void
    {
        $superAdmin = $this->superAdmin();

        $this->actingAs($superAdmin, 'admin')
            ->get(route('admin.system.roles.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/system/roles/index')
                ->has('roles', 5)
                ->has('permission_domains')
            );
    }

    public function test_cities_crud_and_deletion_guard(): void
    {
        $superAdmin = $this->superAdmin();

        // Create
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.cities.store'), [
                'name' => 'Secunderabad',
                'slug' => 'secunderabad',
                'state' => 'Telangana',
                'state_code' => 'TS',
                'country_code' => 'IN',
                'sort_order' => 10,
                'is_active' => true,
            ])
            ->assertRedirect();

        $city = City::where('slug', 'secunderabad')->firstOrFail();

        // Update
        $this->actingAs($superAdmin, 'admin')
            ->put(route('admin.system.cities.update', $city), [
                'name' => 'Secunderabad Twin City',
                'slug' => 'secunderabad-twin',
                'state' => 'Telangana',
                'state_code' => 'TS',
                'country_code' => 'IN',
                'sort_order' => 12,
                'is_active' => true,
            ])
            ->assertRedirect();

        $this->assertSame('Secunderabad Twin City', $city->fresh()->name);

        // Toggle status
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.cities.toggle-status', $city))
            ->assertRedirect();

        $this->assertFalse($city->fresh()->is_active);

        // Deletion succeeds when no properties
        $this->actingAs($superAdmin, 'admin')
            ->delete(route('admin.system.cities.destroy', $city))
            ->assertRedirect();

        $this->assertDatabaseMissing('cities', ['id' => $city->id]);
    }

    public function test_categories_crud_and_canonical_guard(): void
    {
        $superAdmin = $this->superAdmin();

        // Create custom category
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.categories.store'), [
                'name' => 'Boutique Villas',
                'slug' => 'boutique-villas',
                'code' => 'BOUTIQUE_VILLAS',
                'description' => 'Luxury boutique stays',
                'sort_order' => 5,
                'is_active' => true,
            ])
            ->assertRedirect();

        $customCat = PropertyCategory::where('slug', 'boutique-villas')->firstOrFail();

        // Canonical category protection:
        $canonical = PropertyCategory::firstOrCreate(
            ['slug' => 'hostels-pg'],
            ['name' => 'Hostels & PG', 'code' => 'HOSTEL_PG', 'sort_order' => 1, 'is_active' => true]
        );

        // Deleting canonical must fail
        $this->actingAs($superAdmin, 'admin')
            ->delete(route('admin.system.categories.destroy', $canonical))
            ->assertRedirect()
            ->assertSessionHasErrors('error');

        // Deleting custom category succeeds
        $this->actingAs($superAdmin, 'admin')
            ->delete(route('admin.system.categories.destroy', $customCat))
            ->assertRedirect();

        $this->assertDatabaseMissing('property_categories', ['id' => $customCat->id]);
    }

    public function test_platform_settings_index_and_update(): void
    {
        $superAdmin = $this->superAdmin();

        $this->actingAs($superAdmin, 'admin')
            ->get(route('admin.system.settings.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/system/settings/index')
                ->has('settings.timings')
                ->has('settings.financial')
                ->has('settings.grievance')
                ->has('settings.notifications')
            );

        // Update Timings
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'timings',
                'check_in_time' => '13:00',
                'check_out_time' => '10:30',
                'earliest_early_check_in_time' => '07:30',
                'checkout_expiry_minutes' => 20,
            ])
            ->assertRedirect();

        $this->assertSame('13:00', PlatformSetting::get('timings.check_in_time'));
        $this->assertSame(20, PlatformSetting::get('timings.checkout_expiry_minutes'));

        // Update Financial
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'financial',
                'platform_legal_name' => 'TIJUM TECHNOLOGIES PVT LTD',
                'platform_gstin' => '36AABCT9999F1ZQ',
                'platform_sac_code' => '996311',
                'default_commission_rate_bps' => 1200,
                'commission_gst_rate_bps' => 1800,
                'default_tds_rate_bps' => 100,
                'hold_interval_hours' => 48,
            ])
            ->assertRedirect();

        $this->assertSame('TIJUM TECHNOLOGIES PVT LTD', PlatformSetting::get('financial.platform_legal_name'));
        $this->assertSame(1200, PlatformSetting::get('financial.default_commission_rate_bps'));

        // Update Grievance
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'grievance',
                'officer_name' => 'Ananya Verma',
                'officer_designation' => 'Nodal Redressal Officer',
                'officer_email' => 'grievance-desk@tijum.com',
                'officer_phone' => '+91-40-99998888',
                'officer_address' => 'TIJUM Hitech Hub, Hyderabad',
                'sla_acknowledgement_hours' => 12,
                'sla_resolution_days' => 10,
            ])
            ->assertRedirect();

        $this->assertSame('Ananya Verma', PlatformSetting::get('grievance.officer_name'));

        // Update Notifications
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'notifications',
                'in_app' => true,
                'email' => true,
                'sms' => true,
                'whatsapp' => true,
                'push' => true,
            ])
            ->assertRedirect();

        $this->assertTrue(PlatformSetting::get('notifications.whatsapp'));
    }

    public function test_platform_settings_all_expanded_sections_can_be_updated_and_persisted(): void
    {
        $superAdmin = $this->superAdmin();

        // 1. General
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'general',
                'platform_name' => 'TIJUM Stays',
                'platform_legal_name' => 'TIJUM Technologies Private Limited',
                'website_url' => 'https://tijum.com',
                'support_email' => 'care@tijum.com',
                'support_phone' => '+91-40-60000000',
                'default_address' => 'HITEC City, Hyderabad',
                'tagline' => 'Verified Hostels & Living',
                'description' => 'India\'s leading student accommodation network.',
            ])
            ->assertRedirect();

        $this->assertSame('TIJUM Stays', PlatformSetting::get('general.platform_name'));
        $this->assertSame('care@tijum.com', PlatformSetting::get('general.support_email'));

        // 2. Brand
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'brand',
                'primary_logo_url' => '/brand/logo.svg',
                'horizontal_logo_url' => '/brand/logo-h.svg',
                'light_logo_url' => '/brand/logo-light.svg',
                'dark_logo_url' => '/brand/logo-dark.svg',
                'mobile_icon_url' => '/brand/icon.png',
                'favicon_url' => '/favicon.png',
                'og_image_url' => '/brand/og.png',
                'email_header_logo_url' => '/brand/email.png',
                'color_primary' => '#5C2D54',
                'color_secondary' => '#FF9580',
                'color_accent' => '#FFF8F0',
            ])
            ->assertRedirect();

        $this->assertSame('#5C2D54', PlatformSetting::get('brand.color_primary'));

        // 3. SEO
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'seo',
                'default_meta_title' => 'TIJUM | Verified Hostels',
                'default_meta_description' => 'Best student accommodation in India.',
                'canonical_url_base' => 'https://tijum.com',
                'og_site_name' => 'TIJUM',
                'twitter_handle' => '@tijum_official',
                'robots_directive' => 'index, follow',
                'google_site_verification' => 'google-token-123',
                'bing_site_verification' => 'bing-token-456',
                'sitemap_enabled' => true,
            ])
            ->assertRedirect();

        $this->assertSame('TIJUM | Verified Hostels', PlatformSetting::get('seo.default_meta_title'));

        // 4. Integrations
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'integrations',
                'razorpay_mode' => 'sandbox',
                'razorpay_key_id' => 'rzp_test_secKeyId',
                'razorpay_key_secret' => 'super_secret_rzp_pass',
                'razorpay_webhook_secret' => 'whsec_secret_pass',
                'whatsapp_phone_number_id' => '1029384756',
                'whatsapp_access_token' => 'meta_access_token_xyz',
                'whatsapp_business_account_id' => 'waba_99999',
                'sms_provider' => 'msg91',
                'sms_auth_key' => 'sms_auth_key_123',
                'sms_sender_id' => 'TIJUMS',
                'google_maps_api_key' => 'AIzaSyGoogleKey123',
                'expo_access_token' => 'expo_token_xyz',
            ])
            ->assertRedirect();

        // The decrypted secret must be retrieved by PlatformSetting::get
        $this->assertSame('super_secret_rzp_pass', PlatformSetting::get('integrations.razorpay_key_secret'));
        $this->assertSame('rzp_test_secKeyId', PlatformSetting::get('integrations.razorpay_key_id'));

        // 5. Localization
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'localization',
                'timezone' => 'Asia/Kolkata',
                'default_country' => 'India',
                'default_currency' => 'INR',
                'currency_symbol' => '₹',
                'date_format' => 'DD/MM/YYYY',
                'time_format' => '12_hour',
                'number_format' => 'indian_lakhs',
                'calling_code' => '+91',
            ])
            ->assertRedirect();

        $this->assertSame('Asia/Kolkata', PlatformSetting::get('localization.timezone'));

        // 6. Security
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'security',
                'session_timeout_minutes' => 60,
                'max_login_attempts' => 5,
                'lockout_duration_minutes' => 20,
                'enforce_admin_2fa' => true,
                'require_customer_email_verification' => false,
                'require_partner_email_verification' => true,
                'api_rate_limit_per_minute' => 120,
            ])
            ->assertRedirect();

        $this->assertSame(60, PlatformSetting::get('security.session_timeout_minutes'));

        // 7. Features
        $this->actingAs($superAdmin, 'admin')
            ->post(route('admin.system.settings.update'), [
                'section' => 'features',
                'maintenance_mode' => false,
                'maintenance_message' => 'Maintenance is ongoing.',
                'allow_customer_registration' => true,
                'allow_partner_registration' => true,
                'instant_booking_enabled' => true,
                'rewards_program_enabled' => true,
                'referral_program_enabled' => true,
            ])
            ->assertRedirect();

        $this->assertFalse(PlatformSetting::get('features.maintenance_mode'));
        $this->assertTrue(PlatformSetting::get('features.instant_booking_enabled'));
    }

    public function test_test_integration_endpoint_evaluates_provider(): void
    {
        $superAdmin = $this->superAdmin();

        $response = $this->actingAs($superAdmin, 'admin')
            ->postJson(route('admin.system.settings.test-integration'), [
                'provider' => 'sms',
            ]);

        $response->assertOk()
            ->assertJsonStructure(['success', 'message']);
    }

    public function test_public_config_endpoint_serves_allowlisted_platform_settings(): void
    {
        PlatformSetting::set('general.platform_name', 'TIJUM Accommodations', 'general', null, null, false, true);
        PlatformSetting::set('localization.currency_symbol', '₹', 'localization', null, null, false, true);

        $response = $this->getJson(route('api.v1.public.config'));

        $response->assertOk()
            ->assertJsonPath('data.app_name', 'TIJUM Accommodations')
            ->assertJsonPath('data.currency.symbol', '₹');
    }

    public function test_admin_can_upload_brand_asset(): void
    {
        Storage::fake('public');

        $superAdmin = $this->superAdmin();

        $file = UploadedFile::fake()->image('brand_logo.png', 400, 200);

        $response = $this->actingAs($superAdmin, 'admin')
            ->postJson(route('admin.system.settings.upload-asset'), [
                'file' => $file,
                'asset_type' => 'primary_logo',
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('asset_type', 'primary_logo')
            ->assertJsonStructure(['success', 'url', 'asset_type', 'message']);

        $url = $response->json('url');
        $this->assertNotEmpty($url);
        $this->assertSame($url, PlatformSetting::get('brand.primary_logo_url'));
    }
}
