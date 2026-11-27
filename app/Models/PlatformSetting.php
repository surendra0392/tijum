<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Throwable;

/**
 * @property int $id
 * @property string $key
 * @property mixed $value
 * @property string $group
 * @property bool $is_secret
 * @property bool $is_public
 * @property string $data_type
 * @property string|null $description
 * @property int|null $updated_by_admin_id
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Admin|null $updatedByAdmin
 */
class PlatformSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'group',
        'is_secret',
        'is_public',
        'data_type',
        'description',
        'updated_by_admin_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'array',
            'is_secret' => 'boolean',
            'is_public' => 'boolean',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function updatedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'updated_by_admin_id');
    }

    /**
     * Get a setting value by key with fallback default.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $all = static::allCached();

        if (array_key_exists($key, $all)) {
            $record = $all[$key];
            $val = $record['value'] ?? null;
            $isSecret = (bool) ($record['is_secret'] ?? false);

            $resolved = null;
            if (is_array($val) && array_key_exists('v', $val)) {
                $resolved = $val['v'];
            } else {
                $resolved = $val;
            }

            if ($isSecret && is_string($resolved) && $resolved !== '') {
                try {
                    return Crypt::decryptString($resolved);
                } catch (Throwable) {
                    return $resolved;
                }
            }

            return $resolved;
        }

        return $default;
    }

    /**
     * Get raw setting record for metadata inspection.
     *
     * @return array{value: mixed, group: string, is_secret: bool, is_public: bool, data_type: string}|null
     */
    public static function getMeta(string $key): ?array
    {
        $all = static::allCached();

        return $all[$key] ?? null;
    }

    /**
     * Persist or update a setting with audit logging and cache flush.
     */
    public static function set(
        string $key,
        mixed $value,
        string $group = 'general',
        ?string $description = null,
        ?int $adminId = null,
        bool $isSecret = false,
        bool $isPublic = false,
        string $dataType = 'string',
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): self {
        Cache::forget('tijum_platform_settings');

        $existing = static::query()->where('key', $key)->first();
        $oldValue = $existing ? $existing->value : null;

        // If secret and string, encrypt before saving
        $storedValue = $value;
        if ($isSecret && is_string($value) && $value !== '') {
            $storedValue = Crypt::encryptString($value);
        }

        $payload = is_array($storedValue) ? $storedValue : ['v' => $storedValue];

        /** @var self $setting */
        $setting = static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $payload,
                'group' => $group,
                'is_secret' => $isSecret,
                'is_public' => $isPublic,
                'data_type' => $dataType,
                'description' => $description ?? ($existing ? $existing->description : null),
                'updated_by_admin_id' => $adminId,
            ]
        );

        // Record audit log
        PlatformSettingAuditLog::create([
            'key' => $key,
            'group' => $group,
            'old_value' => $isSecret ? ['masked' => true] : $oldValue,
            'new_value' => $isSecret ? ['masked' => true] : $payload,
            'admin_id' => $adminId,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);

        return $setting;
    }

    /**
     * Cache all platform settings in memory.
     *
     * @return array<string, array{value: mixed, group: string, is_secret: bool, is_public: bool, data_type: string}>
     */
    public static function allCached(): array
    {
        return Cache::remember('tijum_platform_settings', 3600, function (): array {
            $rows = static::query()->get();
            $result = [];
            foreach ($rows as $row) {
                $result[$row->key] = [
                    'value' => $row->value,
                    'group' => $row->group,
                    'is_secret' => (bool) $row->is_secret,
                    'is_public' => (bool) $row->is_public,
                    'data_type' => (string) $row->data_type,
                ];
            }

            return $result;
        });
    }

    /**
     * Return public settings safe for public web and mobile applications (Strict Allowlist).
     *
     * @return array<string, mixed>
     */
    public static function getPublicConfig(): array
    {
        return [
            'app_name' => (string) static::get('general.platform_name', 'TIJUM'),
            'legal_name' => (string) static::get('general.platform_legal_name', 'TIJUM Marketplace Private Limited'),
            'tagline' => (string) static::get('general.tagline', 'Stay easy. Eat well. Spend less.'),
            'website_url' => (string) static::get('general.website_url', 'https://tijum.com'),
            'support_email' => (string) static::get('general.support_email', 'support@tijum.com'),
            'support_phone' => (string) static::get('general.support_phone', '+91 40 6828 0000'),
            'office_address' => (string) static::get('general.default_address', 'Level 4, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India'),
            'currency' => (string) static::get('localization.default_currency', 'INR'),
            'currency_symbol' => (string) static::get('localization.currency_symbol', '₹'),
            'timezone' => (string) static::get('localization.timezone', 'Asia/Kolkata'),
            'timings' => [
                'check_in' => (string) static::get('timings.check_in_time', '09:00'),
                'check_out' => (string) static::get('timings.check_out_time', '08:00'),
                'earliest_early_check_in' => (string) static::get('timings.earliest_early_check_in_time', '07:00'),
                'checkout_expiry_minutes' => (int) static::get('timings.checkout_expiry_minutes', 15),
            ],
            'brand' => [
                'primary_color' => (string) static::get('brand.color_primary', '#5C2D54'),
                'secondary_color' => (string) static::get('brand.color_secondary', '#FF9580'),
                'accent_color' => (string) static::get('brand.color_accent', '#FFF8F0'),
                'logo_url' => (string) static::get('brand.primary_logo_url', '/brand/logo/tijum-logo-dark.png'),
                'mobile_icon_url' => (string) static::get('brand.mobile_icon_url', '/brand/app/tijum-app-icon.png'),
                'favicon_url' => (string) static::get('brand.favicon_url', '/brand/icons/tijum-favicon-dark.png'),
                'og_image_url' => (string) static::get('brand.og_image_url', '/images/public/og-tijum-cover.jpg'),
            ],
            'features' => [
                'maintenance_mode' => (bool) static::get('features.maintenance_mode', false),
                'maintenance_message' => (string) static::get('features.maintenance_message', 'Scheduled maintenance in progress.'),
                'customer_registration' => (bool) static::get('features.allow_customer_registration', true),
                'partner_registration' => (bool) static::get('features.allow_partner_registration', true),
                'instant_booking' => (bool) static::get('features.instant_booking_enabled', true),
                'rewards_program' => (bool) static::get('features.rewards_program_enabled', true),
                'referral_program' => (bool) static::get('features.referral_program_enabled', true),
            ],
            'grievance' => [
                'officer_name' => (string) static::get('grievance.officer_name', 'TIJUM Grievance Redressal Cell'),
                'officer_designation' => (string) static::get('grievance.officer_designation', 'Grievance Officer'),
                'officer_email' => (string) static::get('grievance.officer_email', 'grievance@tijum.com'),
                'officer_phone' => (string) static::get('grievance.officer_phone', '+91 40 6828 0000'),
                'sla_acknowledgement_hours' => (int) static::get('grievance.sla_acknowledgement_hours', 48),
                'sla_resolution_days' => (int) static::get('grievance.sla_resolution_days', 30),
            ],
        ];
    }

    /**
     * Resolve grievance officer details by merging admin-managed PlatformSetting values with config defaults.
     *
     * @return array{name: string, designation: string, email: string, phone: string, address: string, sla_acknowledgement_hours: int, sla_resolution_days: int}
     */
    public static function getGrievanceOfficer(): array
    {
        return [
            'name' => (string) static::get('grievance.officer_name', config('tijum.customer_protection.grievance_officer.name', 'TIJUM Grievance Redressal Cell')),
            'designation' => (string) static::get('grievance.officer_designation', config('tijum.customer_protection.grievance_officer.designation', 'Grievance Officer')),
            'email' => (string) static::get('grievance.officer_email', config('tijum.customer_protection.grievance_officer.email', 'grievance@tijum.com')),
            'phone' => (string) static::get('grievance.officer_phone', config('tijum.customer_protection.grievance_officer.phone', '+91 40 6828 0000')),
            'address' => (string) static::get('grievance.officer_address', config('tijum.customer_protection.grievance_officer.address', 'TIJUM Marketplace Pvt. Ltd., Level 4, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India')),
            'sla_acknowledgement_hours' => (int) static::get('grievance.sla_acknowledgement_hours', config('tijum.customer_protection.sla.acknowledgement_hours', 48)),
            'sla_resolution_days' => (int) static::get('grievance.sla_resolution_days', config('tijum.customer_protection.sla.resolution_days', 30)),
        ];
    }

    /**
     * Mask a secret string for safe Admin UI display.
     */
    public static function maskSecret(?string $value): string
    {
        if (! $value || $value === '') {
            return '';
        }

        $len = strlen($value);
        if ($len <= 4) {
            return '••••••••';
        }

        $lastFour = substr($value, -4);

        return '••••••••••••'.$lastFour;
    }

    /**
     * Returns structured default settings merged with DB values for the Admin Console.
     * All secret credentials are automatically masked for front-end safety.
     *
     * @return array<string, mixed>
     */
    public static function getStructuredSettings(): array
    {
        $rawRazorpaySecret = (string) static::get('integrations.razorpay_key_secret', config('tijum.payments.razorpay.key_secret', ''));
        $rawRazorpayWebhook = (string) static::get('integrations.razorpay_webhook_secret', config('tijum.payments.razorpay.webhook_secret', ''));
        $rawWhatsappToken = (string) static::get('integrations.whatsapp_access_token', config('tijum.notifications.channels.whatsapp.access_token', ''));
        $rawSmsAuth = (string) static::get('integrations.sms_auth_key', config('tijum.notifications.channels.sms.auth_key', ''));
        $rawMapsKey = (string) static::get('integrations.google_maps_api_key', config('services.google.maps_api_key', ''));
        $rawExpoToken = (string) static::get('integrations.expo_access_token', config('tijum.notifications.channels.push.expo_token', ''));

        return [
            // 1. General & Platform Identity
            'general' => [
                'platform_name' => (string) static::get('general.platform_name', config('app.name', 'TIJUM')),
                'platform_legal_name' => (string) static::get('general.platform_legal_name', config('tijum.settlements.platform_legal_name', 'TIJUM Marketplace Private Limited')),
                'website_url' => (string) static::get('general.website_url', config('app.url', 'https://tijum.com')),
                'support_email' => (string) static::get('general.support_email', 'support@tijum.com'),
                'support_phone' => (string) static::get('general.support_phone', '+91 40 6828 0000'),
                'default_address' => (string) static::get('general.default_address', 'Level 4, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India'),
                'tagline' => (string) static::get('general.tagline', 'Stay easy. Eat well. Spend less.'),
                'description' => (string) static::get('general.description', 'TIJUM is India\'s premier verified student and professional accommodation network with transparent living and zero brokerage.'),
            ],

            // 2. Brand Identity & Assets
            'brand' => [
                'primary_logo_url' => (string) static::get('brand.primary_logo_url', '/brand/logo/tijum-logo-dark.png'),
                'horizontal_logo_url' => (string) static::get('brand.horizontal_logo_url', '/brand/logo/tijum-logo-horizontal.png'),
                'light_logo_url' => (string) static::get('brand.light_logo_url', '/brand/logo/tijum-logo-light.png'),
                'dark_logo_url' => (string) static::get('brand.dark_logo_url', '/brand/logo/tijum-logo-dark.png'),
                'mobile_icon_url' => (string) static::get('brand.mobile_icon_url', '/brand/app/tijum-app-icon.png'),
                'favicon_url' => (string) static::get('brand.favicon_url', '/brand/icons/tijum-favicon-dark.png'),
                'og_image_url' => (string) static::get('brand.og_image_url', '/images/public/og-tijum-cover.jpg'),
                'email_header_logo_url' => (string) static::get('brand.email_header_logo_url', '/brand/logo/tijum-logo-light.png'),
                'color_primary' => (string) static::get('brand.color_primary', '#5C2D54'),
                'color_secondary' => (string) static::get('brand.color_secondary', '#FF9580'),
                'color_accent' => (string) static::get('brand.color_accent', '#FFF8F0'),
            ],

            // 3. SEO & Search Engine Settings
            'seo' => [
                'default_meta_title' => (string) static::get('seo.default_meta_title', 'TIJUM | Verified Stays, Hostels & Student Accommodations in India'),
                'default_meta_description' => (string) static::get('seo.default_meta_description', 'Discover verified hostels, PGs, and apartments across India with zero hidden charges, transparent pricing, and guaranteed safety.'),
                'canonical_url_base' => (string) static::get('seo.canonical_url_base', 'https://tijum.com'),
                'og_site_name' => (string) static::get('seo.og_site_name', 'TIJUM Accommodations'),
                'twitter_handle' => (string) static::get('seo.twitter_handle', '@tijum_stays'),
                'robots_directive' => (string) static::get('seo.robots_directive', 'index, follow, max-image-preview:large'),
                'google_site_verification' => (string) static::get('seo.google_site_verification', ''),
                'bing_site_verification' => (string) static::get('seo.bing_site_verification', ''),
                'sitemap_enabled' => (bool) static::get('seo.sitemap_enabled', true),
            ],

            // 4. API & Third-Party Integrations
            'integrations' => [
                'razorpay_mode' => (string) static::get('integrations.razorpay_mode', config('tijum.payments.razorpay.mode', 'sandbox')),
                'razorpay_key_id' => (string) static::get('integrations.razorpay_key_id', config('tijum.payments.razorpay.key_id', 'rzp_test_tijum_default')),
                'razorpay_key_secret_masked' => static::maskSecret($rawRazorpaySecret),
                'razorpay_webhook_secret_masked' => static::maskSecret($rawRazorpayWebhook),
                'whatsapp_phone_number_id' => (string) static::get('integrations.whatsapp_phone_number_id', config('tijum.notifications.channels.whatsapp.phone_number_id', '')),
                'whatsapp_access_token_masked' => static::maskSecret($rawWhatsappToken),
                'whatsapp_business_account_id' => (string) static::get('integrations.whatsapp_business_account_id', config('tijum.notifications.channels.whatsapp.waba_id', '')),
                'sms_provider' => (string) static::get('integrations.sms_provider', config('tijum.notifications.channels.sms.provider', 'msg91')),
                'sms_auth_key_masked' => static::maskSecret($rawSmsAuth),
                'sms_sender_id' => (string) static::get('integrations.sms_sender_id', config('tijum.notifications.channels.sms.sender_id', 'TIJUMS')),
                'google_maps_api_key_masked' => static::maskSecret($rawMapsKey),
                'expo_access_token_masked' => static::maskSecret($rawExpoToken),
                'has_razorpay_secret' => $rawRazorpaySecret !== '',
                'has_whatsapp_token' => $rawWhatsappToken !== '',
                'has_sms_key' => $rawSmsAuth !== '',
            ],

            // 5. Operational Timings (Preserved)
            'timings' => [
                'check_in_time' => (string) static::get('timings.check_in_time', config('tijum.pricing.check_in_time', '09:00')),
                'check_out_time' => (string) static::get('timings.check_out_time', config('tijum.pricing.check_out_time', '08:00')),
                'earliest_early_check_in_time' => (string) static::get('timings.earliest_early_check_in_time', config('tijum.pricing.earliest_early_check_in_time', '07:00')),
                'checkout_expiry_minutes' => (int) static::get('timings.checkout_expiry_minutes', config('tijum.payments.checkout_expiry_minutes', 15)),
            ],

            // 6. Financial & Tax Parameters (Preserved)
            'financial' => [
                'platform_legal_name' => (string) static::get('financial.platform_legal_name', config('tijum.settlements.platform_legal_name', 'TIJUM Marketplace Private Limited')),
                'platform_gstin' => (string) static::get('financial.platform_gstin', config('tijum.settlements.platform_gstin', '36AAAAA0000A1Z5')),
                'platform_sac_code' => (string) static::get('financial.platform_sac_code', config('tijum.settlements.platform_sac_code', '998552')),
                'default_commission_rate_bps' => (int) static::get('financial.default_commission_rate_bps', config('tijum.settlements.default_commission_rate_bps', 1200)),
                'commission_gst_rate_bps' => (int) static::get('financial.commission_gst_rate_bps', config('tijum.settlements.commission_gst_rate_bps', 1800)),
                'default_tds_rate_bps' => (int) static::get('financial.default_tds_rate_bps', config('tijum.settlements.default_tds_rate_bps', 10)),
                'hold_interval_hours' => (int) static::get('financial.hold_interval_hours', config('tijum.settlements.hold_interval_hours', 24)),
            ],

            // 7. Grievance & SLA (Preserved)
            'grievance' => [
                'officer_name' => (string) static::get('grievance.officer_name', config('tijum.customer_protection.grievance_officer.name', 'TIJUM Grievance Redressal Cell')),
                'officer_designation' => (string) static::get('grievance.officer_designation', config('tijum.customer_protection.grievance_officer.designation', 'Grievance Officer')),
                'officer_email' => (string) static::get('grievance.officer_email', config('tijum.customer_protection.grievance_officer.email', 'grievance@tijum.com')),
                'officer_phone' => (string) static::get('grievance.officer_phone', config('tijum.customer_protection.grievance_officer.phone', '+91 40 6828 0000')),
                'officer_address' => (string) static::get('grievance.officer_address', config('tijum.customer_protection.grievance_officer.address', 'TIJUM Marketplace Pvt. Ltd., Level 4, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India')),
                'sla_acknowledgement_hours' => (int) static::get('grievance.sla_acknowledgement_hours', config('tijum.customer_protection.sla.acknowledgement_hours', 48)),
                'sla_resolution_days' => (int) static::get('grievance.sla_resolution_days', config('tijum.customer_protection.sla.resolution_days', 30)),
            ],

            // 8. Notification Channels (Preserved)
            'notifications' => [
                'in_app' => (bool) static::get('notifications.in_app', config('tijum.notifications.channels.in_app.enabled', true)),
                'email' => (bool) static::get('notifications.email', config('tijum.notifications.channels.email.enabled', true)),
                'sms' => (bool) static::get('notifications.sms', config('tijum.notifications.channels.sms.enabled', false)),
                'whatsapp' => (bool) static::get('notifications.whatsapp', config('tijum.notifications.channels.whatsapp.enabled', false)),
                'push' => (bool) static::get('notifications.push', config('tijum.notifications.channels.push.enabled', true)),
            ],

            // 9. Localization & Regional Settings
            'localization' => [
                'timezone' => (string) static::get('localization.timezone', 'Asia/Kolkata'),
                'default_country' => (string) static::get('localization.default_country', 'India'),
                'default_currency' => (string) static::get('localization.default_currency', 'INR'),
                'currency_symbol' => (string) static::get('localization.currency_symbol', '₹'),
                'date_format' => (string) static::get('localization.date_format', 'DD/MM/YYYY'),
                'time_format' => (string) static::get('localization.time_format', '12_hour'),
                'number_format' => (string) static::get('localization.number_format', 'indian_lakhs'),
                'calling_code' => (string) static::get('localization.calling_code', '+91'),
            ],

            // 10. Security & Access Settings
            'security' => [
                'session_timeout_minutes' => (int) static::get('security.session_timeout_minutes', 120),
                'max_login_attempts' => (int) static::get('security.max_login_attempts', 5),
                'lockout_duration_minutes' => (int) static::get('security.lockout_duration_minutes', 15),
                'enforce_admin_2fa' => (bool) static::get('security.enforce_admin_2fa', true),
                'require_customer_email_verification' => (bool) static::get('security.require_customer_email_verification', false),
                'require_partner_email_verification' => (bool) static::get('security.require_partner_email_verification', true),
                'api_rate_limit_per_minute' => (int) static::get('security.api_rate_limit_per_minute', 60),
            ],

            // 11. Platform Features & System Preferences
            'features' => [
                'maintenance_mode' => (bool) static::get('features.maintenance_mode', false),
                'maintenance_message' => (string) static::get('features.maintenance_message', 'TIJUM is currently performing scheduled maintenance. We\'ll be back shortly.'),
                'allow_customer_registration' => (bool) static::get('features.allow_customer_registration', true),
                'allow_partner_registration' => (bool) static::get('features.allow_partner_registration', true),
                'instant_booking_enabled' => (bool) static::get('features.instant_booking_enabled', true),
                'rewards_program_enabled' => (bool) static::get('features.rewards_program_enabled', true),
                'referral_program_enabled' => (bool) static::get('features.referral_program_enabled', true),
            ],
        ];
    }
}
