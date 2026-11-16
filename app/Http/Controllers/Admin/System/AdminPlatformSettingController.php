<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin\System;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Services\Settings\PlatformSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminPlatformSettingController extends Controller
{
    private function resolveAdmin(Request $request): Admin
    {
        $admin = $request->user('admin');
        if (! $admin instanceof Admin) {
            abort(401);
        }
        if (! $admin->isSuperAdmin()) {
            abort(403, 'Unauthorized to manage platform settings.');
        }

        return $admin;
    }

    public function index(Request $request, PlatformSettingsService $service): Response
    {
        $this->resolveAdmin($request);

        return Inertia::render('admin/system/settings/index', [
            'settings' => $service->getAllForAdmin(),
        ]);
    }

    public function update(Request $request, PlatformSettingsService $service): RedirectResponse
    {
        $admin = $this->resolveAdmin($request);
        $section = $request->string('section')->toString();
        $ip = $request->ip();
        $ua = $request->userAgent();

        // Section 1: Timings (Preserved)
        if ($section === 'timings') {
            $validated = $request->validate([
                'check_in_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
                'check_out_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
                'earliest_early_check_in_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
                'checkout_expiry_minutes' => ['required', 'integer', 'min:5', 'max:120'],
            ]);

            $service->set('timings.check_in_time', $validated['check_in_time'], 'timings', 'Standard property check-in time', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('timings.check_out_time', $validated['check_out_time'], 'timings', 'Standard property check-out time', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('timings.earliest_early_check_in_time', $validated['earliest_early_check_in_time'], 'timings', 'Earliest early check-in allowed', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('timings.checkout_expiry_minutes', (int) $validated['checkout_expiry_minutes'], 'timings', 'Booking checkout session expiry in minutes', $admin->id, false, true, 'integer', $ip, $ua);

            return back()->with('status', 'Operational timings updated successfully.');
        }

        // Section 2: Financial (Preserved)
        if ($section === 'financial') {
            $validated = $request->validate([
                'platform_legal_name' => ['required', 'string', 'max:255'],
                'platform_gstin' => ['required', 'string', 'max:20'],
                'platform_sac_code' => ['required', 'string', 'max:10'],
                'default_commission_rate_bps' => ['required', 'integer', 'min:0', 'max:5000'],
                'commission_gst_rate_bps' => ['required', 'integer', 'min:0', 'max:2800'],
                'default_tds_rate_bps' => ['required', 'integer', 'min:0', 'max:1000'],
                'hold_interval_hours' => ['required', 'integer', 'min:0', 'max:168'],
            ]);

            $service->set('financial.platform_legal_name', $validated['platform_legal_name'], 'financial', 'Platform registered legal entity name', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('financial.platform_gstin', strtoupper($validated['platform_gstin']), 'financial', 'TIJUM GSTIN identification number', $admin->id, false, false, 'string', $ip, $ua);
            $service->set('financial.platform_sac_code', $validated['platform_sac_code'], 'financial', 'Service Accounting Code for accommodation services', $admin->id, false, false, 'string', $ip, $ua);
            $service->set('financial.default_commission_rate_bps', (int) $validated['default_commission_rate_bps'], 'financial', 'Default platform commission in basis points', $admin->id, false, false, 'integer', $ip, $ua);
            $service->set('financial.commission_gst_rate_bps', (int) $validated['commission_gst_rate_bps'], 'financial', 'GST rate on commission in basis points', $admin->id, false, false, 'integer', $ip, $ua);
            $service->set('financial.default_tds_rate_bps', (int) $validated['default_tds_rate_bps'], 'financial', 'Income tax TDS rate in basis points', $admin->id, false, false, 'integer', $ip, $ua);
            $service->set('financial.hold_interval_hours', (int) $validated['hold_interval_hours'], 'financial', 'Partner settlement hold delay in hours', $admin->id, false, false, 'integer', $ip, $ua);

            return back()->with('status', 'Financial and tax settings updated successfully.');
        }

        // Section 3: Grievance (Preserved)
        if ($section === 'grievance') {
            $validated = $request->validate([
                'officer_name' => ['required', 'string', 'max:255'],
                'officer_designation' => ['required', 'string', 'max:255'],
                'officer_email' => ['required', 'email', 'max:255'],
                'officer_phone' => ['required', 'string', 'max:30'],
                'officer_address' => ['required', 'string', 'max:500'],
                'sla_acknowledgement_hours' => ['required', 'integer', 'min:1', 'max:168'],
                'sla_resolution_days' => ['required', 'integer', 'min:1', 'max:90'],
            ]);

            $service->set('grievance.officer_name', $validated['officer_name'], 'grievance', 'Grievance officer legal name', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('grievance.officer_designation', $validated['officer_designation'], 'grievance', 'Grievance officer title', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('grievance.officer_email', $validated['officer_email'], 'grievance', 'Grievance contact email', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('grievance.officer_phone', $validated['officer_phone'], 'grievance', 'Grievance hotline phone', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('grievance.officer_address', $validated['officer_address'], 'grievance', 'Physical office address for complaints', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('grievance.sla_acknowledgement_hours', (int) $validated['sla_acknowledgement_hours'], 'grievance', 'Max hours to acknowledge grievance', $admin->id, false, true, 'integer', $ip, $ua);
            $service->set('grievance.sla_resolution_days', (int) $validated['sla_resolution_days'], 'grievance', 'Max days to resolve grievance', $admin->id, false, true, 'integer', $ip, $ua);

            return back()->with('status', 'Grievance and redressal settings updated successfully.');
        }

        // Section 4: Notifications (Preserved)
        if ($section === 'notifications') {
            $validated = $request->validate([
                'in_app' => ['required', 'boolean'],
                'email' => ['required', 'boolean'],
                'sms' => ['required', 'boolean'],
                'whatsapp' => ['required', 'boolean'],
                'push' => ['required', 'boolean'],
            ]);

            $service->set('notifications.in_app', (bool) $validated['in_app'], 'notifications', 'Enable database in-app notifications', $admin->id, false, false, 'boolean', $ip, $ua);
            $service->set('notifications.email', (bool) $validated['email'], 'notifications', 'Enable transactional email notifications', $admin->id, false, false, 'boolean', $ip, $ua);
            $service->set('notifications.sms', (bool) $validated['sms'], 'notifications', 'Enable SMS alerts via MSG91', $admin->id, false, false, 'boolean', $ip, $ua);
            $service->set('notifications.whatsapp', (bool) $validated['whatsapp'], 'notifications', 'Enable WhatsApp notifications via Meta Cloud API', $admin->id, false, false, 'boolean', $ip, $ua);
            $service->set('notifications.push', (bool) $validated['push'], 'notifications', 'Enable mobile push notifications via Expo', $admin->id, false, false, 'boolean', $ip, $ua);

            return back()->with('status', 'Notification channel settings updated successfully.');
        }

        // Section 5: General Platform Info (New)
        if ($section === 'general') {
            $validated = $request->validate([
                'platform_name' => ['required', 'string', 'max:100'],
                'platform_legal_name' => ['required', 'string', 'max:255'],
                'website_url' => ['required', 'url', 'max:255'],
                'support_email' => ['required', 'email', 'max:255'],
                'support_phone' => ['required', 'string', 'max:30'],
                'default_address' => ['required', 'string', 'max:500'],
                'tagline' => ['required', 'string', 'max:255'],
                'description' => ['required', 'string', 'max:1000'],
            ]);

            $service->set('general.platform_name', $validated['platform_name'], 'general', 'Platform Brand Name', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('general.platform_legal_name', $validated['platform_legal_name'], 'general', 'Official Legal Entity Name', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('general.website_url', $validated['website_url'], 'general', 'Platform Website URL', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('general.support_email', $validated['support_email'], 'general', 'Customer Support Email', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('general.support_phone', $validated['support_phone'], 'general', 'Customer Support Phone Hotline', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('general.default_address', $validated['default_address'], 'general', 'Headquarters Address', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('general.tagline', $validated['tagline'], 'general', 'Platform Tagline', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('general.description', $validated['description'], 'general', 'Platform Public Description', $admin->id, false, true, 'string', $ip, $ua);

            return back()->with('status', 'General platform information updated successfully.');
        }

        // Section 6: Brand Identity & Assets (New)
        if ($section === 'brand') {
            $validated = $request->validate([
                'primary_logo_url' => ['required', 'string', 'max:500'],
                'horizontal_logo_url' => ['nullable', 'string', 'max:500'],
                'light_logo_url' => ['nullable', 'string', 'max:500'],
                'dark_logo_url' => ['nullable', 'string', 'max:500'],
                'mobile_icon_url' => ['nullable', 'string', 'max:500'],
                'favicon_url' => ['nullable', 'string', 'max:500'],
                'og_image_url' => ['nullable', 'string', 'max:500'],
                'email_header_logo_url' => ['nullable', 'string', 'max:500'],
                'color_primary' => ['required', 'string', 'regex:/^#[a-fA-F0-9]{6}$/'],
                'color_secondary' => ['required', 'string', 'regex:/^#[a-fA-F0-9]{6}$/'],
                'color_accent' => ['required', 'string', 'regex:/^#[a-fA-F0-9]{6}$/'],
            ]);

            $service->set('brand.primary_logo_url', $validated['primary_logo_url'], 'brand', 'Primary Logo SVG/PNG URL', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.horizontal_logo_url', $validated['horizontal_logo_url'] ?? '', 'brand', 'Horizontal Logo URL', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.light_logo_url', $validated['light_logo_url'] ?? '', 'brand', 'Light Theme Logo URL', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.dark_logo_url', $validated['dark_logo_url'] ?? '', 'brand', 'Dark Theme Logo URL', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.mobile_icon_url', $validated['mobile_icon_url'] ?? '', 'brand', 'Mobile App Icon URL', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.favicon_url', $validated['favicon_url'] ?? '', 'brand', 'Favicon ICO/PNG URL', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.og_image_url', $validated['og_image_url'] ?? '', 'brand', 'Default Social OpenGraph Image URL', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.email_header_logo_url', $validated['email_header_logo_url'] ?? '', 'brand', 'Transactional Email Header Banner URL', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.color_primary', $validated['color_primary'], 'brand', 'Primary Brand Color (Plum)', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.color_secondary', $validated['color_secondary'], 'brand', 'Secondary Brand Color (Peach)', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('brand.color_accent', $validated['color_accent'], 'brand', 'Accent Brand Color (Cream)', $admin->id, false, true, 'string', $ip, $ua);

            return back()->with('status', 'Brand identity and asset configurations updated successfully.');
        }

        // Section 7: SEO & Search Engines (New)
        if ($section === 'seo') {
            $validated = $request->validate([
                'default_meta_title' => ['required', 'string', 'max:150'],
                'default_meta_description' => ['required', 'string', 'max:300'],
                'canonical_url_base' => ['required', 'url', 'max:255'],
                'og_site_name' => ['required', 'string', 'max:100'],
                'twitter_handle' => ['nullable', 'string', 'max:50'],
                'robots_directive' => ['required', 'string', 'max:100'],
                'google_site_verification' => ['nullable', 'string', 'max:150'],
                'bing_site_verification' => ['nullable', 'string', 'max:150'],
                'sitemap_enabled' => ['required', 'boolean'],
            ]);

            $service->set('seo.default_meta_title', $validated['default_meta_title'], 'seo', 'Global Meta Title', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('seo.default_meta_description', $validated['default_meta_description'], 'seo', 'Global Meta Description', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('seo.canonical_url_base', $validated['canonical_url_base'], 'seo', 'Canonical URL Base', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('seo.og_site_name', $validated['og_site_name'], 'seo', 'OpenGraph Site Name', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('seo.twitter_handle', $validated['twitter_handle'] ?? '', 'seo', 'Twitter/X Official Handle', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('seo.robots_directive', $validated['robots_directive'], 'seo', 'Robots.txt Directive Meta', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('seo.google_site_verification', $validated['google_site_verification'] ?? '', 'seo', 'Google Search Console Verification Token', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('seo.bing_site_verification', $validated['bing_site_verification'] ?? '', 'seo', 'Bing Webmaster Tools Verification Token', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('seo.sitemap_enabled', (bool) $validated['sitemap_enabled'], 'seo', 'Dynamic XML Sitemap Generation Enabled', $admin->id, false, true, 'boolean', $ip, $ua);

            return back()->with('status', 'SEO and search engine configurations updated successfully.');
        }

        // Section 8: API & Third-Party Integrations (New)
        if ($section === 'integrations') {
            $validated = $request->validate([
                'razorpay_mode' => ['required', 'in:sandbox,live'],
                'razorpay_key_id' => ['required', 'string', 'max:255'],
                'razorpay_key_secret' => ['nullable', 'string', 'max:255'],
                'razorpay_webhook_secret' => ['nullable', 'string', 'max:255'],
                'whatsapp_phone_number_id' => ['nullable', 'string', 'max:100'],
                'whatsapp_access_token' => ['nullable', 'string', 'max:500'],
                'whatsapp_business_account_id' => ['nullable', 'string', 'max:100'],
                'sms_provider' => ['required', 'string', 'max:50'],
                'sms_auth_key' => ['nullable', 'string', 'max:255'],
                'sms_sender_id' => ['required', 'string', 'max:20'],
                'google_maps_api_key' => ['nullable', 'string', 'max:255'],
                'expo_access_token' => ['nullable', 'string', 'max:255'],
            ]);

            $service->set('integrations.razorpay_mode', $validated['razorpay_mode'], 'integrations', 'Razorpay Environment Mode', $admin->id, false, false, 'string', $ip, $ua);
            $service->set('integrations.razorpay_key_id', $validated['razorpay_key_id'], 'integrations', 'Razorpay Public Key ID', $admin->id, false, false, 'string', $ip, $ua);

            // Only update secrets if a new non-masked value was provided
            if (! empty($validated['razorpay_key_secret']) && ! str_starts_with($validated['razorpay_key_secret'], '•••')) {
                $service->set('integrations.razorpay_key_secret', $validated['razorpay_key_secret'], 'integrations', 'Razorpay API Key Secret', $admin->id, true, false, 'encrypted', $ip, $ua);
            }
            if (! empty($validated['razorpay_webhook_secret']) && ! str_starts_with($validated['razorpay_webhook_secret'], '•••')) {
                $service->set('integrations.razorpay_webhook_secret', $validated['razorpay_webhook_secret'], 'integrations', 'Razorpay Webhook Signing Secret', $admin->id, true, false, 'encrypted', $ip, $ua);
            }

            $service->set('integrations.whatsapp_phone_number_id', $validated['whatsapp_phone_number_id'] ?? '', 'integrations', 'WhatsApp Cloud API Phone Number ID', $admin->id, false, false, 'string', $ip, $ua);
            $service->set('integrations.whatsapp_business_account_id', $validated['whatsapp_business_account_id'] ?? '', 'integrations', 'WhatsApp Business Account ID', $admin->id, false, false, 'string', $ip, $ua);

            if (! empty($validated['whatsapp_access_token']) && ! str_starts_with($validated['whatsapp_access_token'], '•••')) {
                $service->set('integrations.whatsapp_access_token', $validated['whatsapp_access_token'], 'integrations', 'Meta Cloud API Permanent Access Token', $admin->id, true, false, 'encrypted', $ip, $ua);
            }

            $service->set('integrations.sms_provider', $validated['sms_provider'], 'integrations', 'SMS Provider (MSG91/Fast2SMS)', $admin->id, false, false, 'string', $ip, $ua);
            $service->set('integrations.sms_sender_id', strtoupper($validated['sms_sender_id']), 'integrations', 'DLT Approved Header Sender ID', $admin->id, false, false, 'string', $ip, $ua);

            if (! empty($validated['sms_auth_key']) && ! str_starts_with($validated['sms_auth_key'], '•••')) {
                $service->set('integrations.sms_auth_key', $validated['sms_auth_key'], 'integrations', 'SMS Gateway Auth Key', $admin->id, true, false, 'encrypted', $ip, $ua);
            }

            if (! empty($validated['google_maps_api_key']) && ! str_starts_with($validated['google_maps_api_key'], '•••')) {
                $service->set('integrations.google_maps_api_key', $validated['google_maps_api_key'], 'integrations', 'Google Maps API Restricted Key', $admin->id, true, false, 'encrypted', $ip, $ua);
            }

            if (! empty($validated['expo_access_token']) && ! str_starts_with($validated['expo_access_token'], '•••')) {
                $service->set('integrations.expo_access_token', $validated['expo_access_token'], 'integrations', 'Expo Push Notification Bearer Token', $admin->id, true, false, 'encrypted', $ip, $ua);
            }

            return back()->with('status', 'API integration credentials securely updated and encrypted.');
        }

        // Section 9: Localization & Regional (New)
        if ($section === 'localization') {
            $validated = $request->validate([
                'timezone' => ['required', 'string', 'max:50'],
                'default_country' => ['required', 'string', 'max:50'],
                'default_currency' => ['required', 'string', 'size:3'],
                'currency_symbol' => ['required', 'string', 'max:5'],
                'date_format' => ['required', 'string', 'max:20'],
                'time_format' => ['required', 'in:12_hour,24_hour'],
                'number_format' => ['required', 'string', 'max:30'],
                'calling_code' => ['required', 'string', 'max:10'],
            ]);

            $service->set('localization.timezone', $validated['timezone'], 'localization', 'Platform Default Timezone', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('localization.default_country', $validated['default_country'], 'localization', 'Operating Country Name', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('localization.default_currency', strtoupper($validated['default_currency']), 'localization', 'ISO 4217 Currency Code', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('localization.currency_symbol', $validated['currency_symbol'], 'localization', 'Display Currency Symbol', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('localization.date_format', $validated['date_format'], 'localization', 'Standard Date Format', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('localization.time_format', $validated['time_format'], 'localization', 'Standard Time Format', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('localization.number_format', $validated['number_format'], 'localization', 'Numeric Formatting (Indian/International)', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('localization.calling_code', $validated['calling_code'], 'localization', 'Default Country Phone Calling Code', $admin->id, false, true, 'string', $ip, $ua);

            return back()->with('status', 'Regional localization parameters updated successfully.');
        }

        // Section 10: Security & Access (New)
        if ($section === 'security') {
            $validated = $request->validate([
                'session_timeout_minutes' => ['required', 'integer', 'min:15', 'max:1440'],
                'max_login_attempts' => ['required', 'integer', 'min:3', 'max:20'],
                'lockout_duration_minutes' => ['required', 'integer', 'min:5', 'max:120'],
                'enforce_admin_2fa' => ['required', 'boolean'],
                'require_customer_email_verification' => ['required', 'boolean'],
                'require_partner_email_verification' => ['required', 'boolean'],
                'api_rate_limit_per_minute' => ['required', 'integer', 'min:10', 'max:600'],
            ]);

            $service->set('security.session_timeout_minutes', (int) $validated['session_timeout_minutes'], 'security', 'Inactivity session timeout in minutes', $admin->id, false, false, 'integer', $ip, $ua);
            $service->set('security.max_login_attempts', (int) $validated['max_login_attempts'], 'security', 'Max failed login attempts before throttle', $admin->id, false, false, 'integer', $ip, $ua);
            $service->set('security.lockout_duration_minutes', (int) $validated['lockout_duration_minutes'], 'security', 'Account lockout cooldown in minutes', $admin->id, false, false, 'integer', $ip, $ua);
            $service->set('security.enforce_admin_2fa', (bool) $validated['enforce_admin_2fa'], 'security', 'Mandatory 2FA enforcement for all admin staff', $admin->id, false, false, 'boolean', $ip, $ua);
            $service->set('security.require_customer_email_verification', (bool) $validated['require_customer_email_verification'], 'security', 'Require verified email for customer bookings', $admin->id, false, false, 'boolean', $ip, $ua);
            $service->set('security.require_partner_email_verification', (bool) $validated['require_partner_email_verification'], 'security', 'Require verified email for partner onboarding', $admin->id, false, false, 'boolean', $ip, $ua);
            $service->set('security.api_rate_limit_per_minute', (int) $validated['api_rate_limit_per_minute'], 'security', 'Public REST API throttle limit per minute', $admin->id, false, false, 'integer', $ip, $ua);

            return back()->with('status', 'Security and access policies updated successfully.');
        }

        // Section 11: Features & Preferences (New)
        if ($section === 'features') {
            $validated = $request->validate([
                'maintenance_mode' => ['required', 'boolean'],
                'maintenance_message' => ['required', 'string', 'max:500'],
                'allow_customer_registration' => ['required', 'boolean'],
                'allow_partner_registration' => ['required', 'boolean'],
                'instant_booking_enabled' => ['required', 'boolean'],
                'rewards_program_enabled' => ['required', 'boolean'],
                'referral_program_enabled' => ['required', 'boolean'],
            ]);

            $service->set('features.maintenance_mode', (bool) $validated['maintenance_mode'], 'features', 'Platform Maintenance Mode Flag', $admin->id, false, true, 'boolean', $ip, $ua);
            $service->set('features.maintenance_message', $validated['maintenance_message'], 'features', 'Maintenance Banner Message', $admin->id, false, true, 'string', $ip, $ua);
            $service->set('features.allow_customer_registration', (bool) $validated['allow_customer_registration'], 'features', 'Allow New Customer Signups', $admin->id, false, true, 'boolean', $ip, $ua);
            $service->set('features.allow_partner_registration', (bool) $validated['allow_partner_registration'], 'features', 'Allow New Partner Applications', $admin->id, false, true, 'boolean', $ip, $ua);
            $service->set('features.instant_booking_enabled', (bool) $validated['instant_booking_enabled'], 'features', 'Allow Instant Property Reservations', $admin->id, false, true, 'boolean', $ip, $ua);
            $service->set('features.rewards_program_enabled', (bool) $validated['rewards_program_enabled'], 'features', 'Enable Loyalty Points & Rewards System', $admin->id, false, true, 'boolean', $ip, $ua);
            $service->set('features.referral_program_enabled', (bool) $validated['referral_program_enabled'], 'features', 'Enable Referral Incentive System', $admin->id, false, true, 'boolean', $ip, $ua);

            return back()->with('status', 'Platform feature switches and system preferences updated successfully.');
        }

        return back()->withErrors(['error' => 'Invalid settings section.']);
    }

    /**
     * Test connection to a third-party integration provider.
     */
    public function testIntegration(Request $request, PlatformSettingsService $service): JsonResponse
    {
        $this->resolveAdmin($request);

        $provider = $request->string('provider')->toString();

        return match ($provider) {
            'razorpay' => response()->json($service->testRazorpayConnection()),
            'sms' => response()->json($service->testSmsConnection()),
            'whatsapp' => response()->json($service->testWhatsappConnection()),
            default => response()->json(['success' => false, 'message' => "Unknown provider [{$provider}]."], 422),
        };
    }

    /**
     * Upload a brand asset file and update the corresponding platform setting.
     */
    public function uploadAsset(Request $request, PlatformSettingsService $service): JsonResponse
    {
        $admin = $this->resolveAdmin($request);

        $request->validate([
            'file' => ['required', 'file', 'mimes:svg,png,jpg,jpeg,webp,ico', 'max:5120'],
            'asset_type' => ['required', 'string', 'in:primary_logo,horizontal_logo,light_logo,dark_logo,mobile_icon,favicon,og_image,email_header_logo'],
        ]);

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $type = $request->string('asset_type')->toString();
        $ext = strtolower($file->getClientOriginalExtension());

        $filename = "{$type}_".Str::random(10).".{$ext}";
        $path = $file->storeAs('brand', $filename, 'public');
        if (! is_string($path)) {
            return response()->json(['success' => false, 'message' => 'Failed to store brand asset.'], 500);
        }
        $url = Storage::disk('public')->url($path);

        $key = "brand.{$type}_url";
        $service->set($key, $url, 'brand', "Brand Asset: {$type}", $admin->id, false, true, 'string', $request->ip(), $request->userAgent());

        return response()->json([
            'success' => true,
            'url' => $url,
            'asset_type' => $type,
            'message' => ucfirst(str_replace('_', ' ', $type)).' uploaded and applied successfully.',
        ]);
    }
}
