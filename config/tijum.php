<?php

declare(strict_types=1);

return [
    'owner_verification' => [
        'disk' => env('TIJUM_OWNER_VERIFICATION_DISK', 'owner_verification'),
        'max_document_kb' => (int) env('TIJUM_OWNER_MAX_DOCUMENT_KB', 10240),
        'declaration_version' => '2026.1',
        'allowed_mime_types' => [
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
        ],
    ],

    'property_management' => [
        'max_properties_per_owner' => (int) env('TIJUM_MAX_PROPERTIES_PER_OWNER', 0),
    ],

    'property_media' => [
        'private_disk' => env('TIJUM_PROPERTY_MEDIA_PRIVATE_DISK', 'property_media_private'),
        'public_disk' => env('TIJUM_PROPERTY_MEDIA_PUBLIC_DISK', 'property_media_public'),
        'max_image_kb' => (int) env('TIJUM_PROPERTY_MAX_IMAGE_KB', 8192),
        'max_images_per_property' => (int) env('TIJUM_PROPERTY_MAX_IMAGES', 50),
        'min_width' => (int) env('TIJUM_PROPERTY_MIN_IMAGE_WIDTH', 100),
        'min_height' => (int) env('TIJUM_PROPERTY_MIN_IMAGE_HEIGHT', 100),
        'max_width' => (int) env('TIJUM_PROPERTY_MAX_IMAGE_WIDTH', 8000),
        'max_height' => (int) env('TIJUM_PROPERTY_MAX_IMAGE_HEIGHT', 8000),
        'optimized_max_width' => 1600,
        'thumbnail_width' => 480,
        'webp_quality' => 82,
        'jpeg_quality' => 84,
        'min_property_photos' => (int) env('TIJUM_PROPERTY_MIN_PHOTOS', 3),
        'min_room_photos_per_type' => (int) env('TIJUM_PROPERTY_MIN_ROOM_PHOTOS_PER_TYPE', 1),
        'allowed_mime_types' => [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ],
    ],

    'property_verification' => [
        'disk' => env('TIJUM_PROPERTY_VERIFICATION_DISK', 'property_verification'),
        'max_document_kb' => (int) env('TIJUM_PROPERTY_MAX_DOCUMENT_KB', 10240),
        'declaration_version' => '2026.1',
        'allowed_mime_types' => [
            'application/pdf' => 'pdf',
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
        ],
    ],

    'amenity_management' => [
        'declaration_version' => '2026.1',
    ],

    'pricing' => [
        'currency_code' => env('TIJUM_PRICING_CURRENCY', 'INR'),
        'currency_minor_unit' => (int) env('TIJUM_PRICING_CURRENCY_MINOR_UNIT', 2),
        'timezone' => env('TIJUM_PRICING_TIMEZONE', 'Asia/Kolkata'),
        'durations' => [
            'daily' => [
                'days' => (int) env('TIJUM_PRICING_DAILY_DAYS', 1),
                'label' => 'Daily',
            ],
            'weekly' => [
                'days' => (int) env('TIJUM_PRICING_WEEKLY_DAYS', 7),
                'label' => 'Weekly',
            ],
            'monthly' => [
                'days' => (int) env('TIJUM_PRICING_MONTHLY_DAYS', 30),
                'label' => 'Monthly',
            ],
        ],
        'check_in_time' => env('TIJUM_STANDARD_CHECK_IN_TIME', '09:00'),
        'check_out_time' => env('TIJUM_STANDARD_CHECK_OUT_TIME', '08:00'),
        'earliest_early_check_in_time' => env('TIJUM_EARLIEST_EARLY_CHECK_IN_TIME', '07:00'),
        'min_rate_amount_minor' => env('TIJUM_MIN_RATE_AMOUNT_MINOR') !== null
            ? (int) env('TIJUM_MIN_RATE_AMOUNT_MINOR')
            : null,
        'max_rate_amount_minor' => env('TIJUM_MAX_RATE_AMOUNT_MINOR') !== null
            ? (int) env('TIJUM_MAX_RATE_AMOUNT_MINOR')
            : null,
    ],

    'payments' => [
        'gateway' => env('TIJUM_PAYMENT_GATEWAY', 'razorpay'),
        'live_enabled' => (bool) env('TIJUM_PAYMENTS_LIVE_ENABLED', false),
        'checkout_expiry_minutes' => (int) env('TIJUM_CHECKOUT_EXPIRY_MINUTES', 15),
        'currency_code' => 'INR',
        'razorpay' => [
            'key_id' => env('RAZORPAY_KEY_ID', ''),
            'key_secret' => env('RAZORPAY_KEY_SECRET', ''),
            'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET', ''),
            'mode' => env('RAZORPAY_MODE', 'test'),
        ],
    ],

    'customer_protection' => [
        'grievance_officer' => [
            'name' => env('TIJUM_GRIEVANCE_OFFICER_NAME', 'TIJUM Grievance Redressal Cell'),
            'designation' => env('TIJUM_GRIEVANCE_OFFICER_DESIGNATION', 'Grievance Officer'),
            'email' => env('TIJUM_GRIEVANCE_OFFICER_EMAIL', 'grievance@tijum.com'),
            'phone' => env('TIJUM_GRIEVANCE_OFFICER_PHONE', '+91 40 6828 0000'),
            'address' => env('TIJUM_GRIEVANCE_OFFICER_ADDRESS', 'TIJUM Marketplace Pvt. Ltd., Level 4, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India'),
        ],
        'sla' => [
            'acknowledgement_hours' => 48,
            'resolution_days' => 30,
        ],
        'relocation' => [
            'default_offer_validity_hours' => 24,
        ],
        'attachments' => [
            'disk' => 'local',
            'max_kb' => 5120,
            'allowed_mime_types' => [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                'application/pdf' => 'pdf',
            ],
        ],
    ],

    'settlements' => [
        'enabled' => (bool) env('TIJUM_PARTNER_SETTLEMENTS_ENABLED', false),
        'route_enabled' => (bool) env('TIJUM_RAZORPAY_ROUTE_ENABLED', false),
        'hold_interval_hours' => (int) env('TIJUM_SETTLEMENT_HOLD_HOURS', 24),
        'default_commission_rate_bps' => env('TIJUM_DEFAULT_COMMISSION_BPS') !== null
            ? (int) env('TIJUM_DEFAULT_COMMISSION_BPS')
            : null,
        'platform_gstin' => env('TIJUM_PLATFORM_GSTIN', '36AAAAA0000A1Z5'),
        'platform_legal_name' => env('TIJUM_PLATFORM_LEGAL_NAME', 'TIJUM Marketplace Private Limited'),
        'platform_sac_code' => '998552',
        'commission_gst_rate_bps' => 1800, // 18.00% GST on marketplace commission
        'default_tds_rate_bps' => 10, // 0.10% withholding under Income-tax Act, 2025 Section 393(1) Table Sl. No. 8(v) (formerly 194-O)
        'tds_individual_huf_threshold_minor' => 50000000, // INR 5,00,000 threshold in paise
    ],

    'reviews' => [
        'submission_window_days' => (int) env('TIJUM_REVIEW_SUBMISSION_WINDOW_DAYS', 30),
        'edit_window_days' => (int) env('TIJUM_REVIEW_EDIT_WINDOW_DAYS', 7),
        'max_content_length' => (int) env('TIJUM_REVIEW_MAX_CONTENT_LENGTH', 3000),
        'category_ratings_enabled' => (bool) env('TIJUM_REVIEW_CATEGORY_RATINGS_ENABLED', true),
        'moderation_required' => (bool) env('TIJUM_REVIEW_MODERATION_REQUIRED', true),
    ],

    'notifications' => [
        'enabled' => (bool) env('TIJUM_NOTIFICATIONS_ENABLED', true),
        'channels' => [
            'in_app' => [
                'enabled' => (bool) env('TIJUM_DATABASE_NOTIFICATIONS_ENABLED', true),
            ],
            'email' => [
                'enabled' => (bool) env('TIJUM_EMAIL_ENABLED', true),
                'from_address' => env('MAIL_FROM_ADDRESS', 'no-reply@tijum.com'),
                'from_name' => env('MAIL_FROM_NAME', 'TIJUM'),
                'support_email' => env('TIJUM_SUPPORT_EMAIL', 'support@tijum.com'),
                'mailboxes' => [
                    'default' => env('MAIL_FROM_ADDRESS', 'no-reply@tijum.com'),
                    'bookings' => env('TIJUM_BOOKINGS_EMAIL', 'bookings@tijum.com'),
                    'support' => env('TIJUM_SUPPORT_EMAIL', 'support@tijum.com'),
                    'grievance' => env('TIJUM_GRIEVANCE_EMAIL', 'grievance@tijum.com'),
                    'admin' => env('TIJUM_ADMIN_EMAIL', 'admin@tijum.com'),
                    'notifications' => env('TIJUM_NOTIFICATIONS_EMAIL', 'notifications@tijum.com'),
                    'sales' => env('TIJUM_SALES_EMAIL', 'sales@tijum.com'),
                    'info' => env('TIJUM_INFO_EMAIL', 'info@tijum.com'),
                ],
            ],
            'sms' => [
                'enabled' => (bool) env('TIJUM_SMS_ENABLED', false),
                'provider' => env('TIJUM_SMS_PROVIDER', 'msg91'),
                'auth_key' => env('TIJUM_SMS_AUTH_KEY', ''),
                'sender_id' => env('TIJUM_SMS_SENDER_ID', 'TIJUMS'),
                'dlt_pe_id' => env('TIJUM_SMS_DLT_PE_ID', ''),
                'webhook_secret' => env('TIJUM_SMS_WEBHOOK_SECRET', ''),
                'mode' => env('TIJUM_SMS_MODE', 'test'),
            ],
            'whatsapp' => [
                'enabled' => (bool) env('TIJUM_WHATSAPP_ENABLED', false),
                'provider' => 'meta_cloud_api',
                'phone_number_id' => env('TIJUM_WHATSAPP_PHONE_NUMBER_ID', ''),
                'waba_id' => env('TIJUM_WHATSAPP_WABA_ID', ''),
                'access_token' => env('TIJUM_WHATSAPP_ACCESS_TOKEN', ''),
                'webhook_verify_token' => env('TIJUM_WHATSAPP_WEBHOOK_VERIFY_TOKEN', ''),
                'app_secret' => env('TIJUM_WHATSAPP_APP_SECRET', ''),
                'graph_version' => env('TIJUM_WHATSAPP_GRAPH_VERSION', 'v21.0'),
                'mode' => env('TIJUM_WHATSAPP_MODE', 'test'),
            ],
            'push' => [
                'enabled' => (bool) env('TIJUM_PUSH_NOTIFICATIONS_ENABLED', true),
                'provider' => 'expo',
                'endpoint' => env('EXPO_PUSH_ENDPOINT', 'https://exp.host/--/api/v2/push/send'),
            ],
        ],
        'retention_days' => (int) env('TIJUM_NOTIFICATION_RETENTION_DAYS', 90),
        'max_retry_attempts' => (int) env('TIJUM_NOTIFICATION_MAX_RETRIES', 3),
        'queue' => env('TIJUM_NOTIFICATION_QUEUE', 'notifications'),
        'high_priority_queue' => env('TIJUM_NOTIFICATION_HIGH_PRIORITY_QUEUE', 'notifications_high'),
    ],
];
