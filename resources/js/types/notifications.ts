export interface InAppNotificationData {
    title?: string;
    body?: string;
    event_type?: string;
    related_reference?: string;
    action_url?: string | null;
    [key: string]: unknown;
}

export interface InAppNotification {
    id: string;
    data: InAppNotificationData;
    read_at: string | null;
    created_at: string;
    created_at_human?: string;
}

export interface NotificationPreferences {
    in_app_operational: boolean;
    email_operational: boolean;
    sms_operational: boolean;
    whatsapp_opted_in: boolean;
    channels_available: {
        in_app: boolean;
        email: boolean;
        sms: boolean;
        whatsapp: boolean;
    };
}

export interface NotificationDeliveryItem {
    id: number;
    event_id: string;
    idempotency_key: string;
    notifiable_type: string;
    notifiable_id: number | string;
    recipient_name?: string;
    recipient_destination: string;
    channel: 'in_app' | 'email' | 'sms' | 'whatsapp';
    category: 'essential_transactional' | 'operational_update' | 'marketing';
    template_code: string;
    template_version?: string;
    status:
        | 'queued'
        | 'sending'
        | 'accepted'
        | 'delivered'
        | 'read'
        | 'retrying'
        | 'failed'
        | 'suppressed'
        | 'cancelled';
    provider: string;
    provider_message_id?: string | null;
    attempts: number;
    subject?: string | null;
    payload?: Record<string, unknown> | null;
    error_code?: string | null;
    error_description?: string | null;
    related_type?: string | null;
    related_id?: number | string | null;
    related_reference?: string | null;
    submitted_at?: string | null;
    delivered_at?: string | null;
    read_at?: string | null;
    failed_at?: string | null;
    created_at: string;
    created_at_human?: string;
}

export interface NotificationTemplateItem {
    code: string;
    event_type: string;
    channel: string;
    category: string;
    title: string;
    subject_template?: string | null;
    body_template: string;
    dlt_template_id?: string | null;
    meta_template_name?: string | null;
    meta_category?: string | null;
    approved_variables: string[];
    version: string;
    is_active: boolean;
}

export interface NotificationEventItem {
    event_type: string;
    name: string;
    recipient_role: string;
    category: string;
    channels: string[];
    description: string;
    requires_consent: boolean;
}

export interface NotificationProviderItem {
    name: string;
    channel: string;
    is_enabled: boolean;
    driver: string;
    status: string;
    description: string;
    features: string[];
    from_address?: string;
    from_name?: string;
    host?: string;
    port?: number;
    scheme?: string;
    latency_ms?: number | null;
    last_connection_at?: string | null;
    last_test_email?: {
        success?: boolean;
        recipient?: string;
        sent_at?: string;
        error?: string;
        message?: string;
    } | null;
    checks?: Record<string, { status: string; detail: string; latency_ms?: number }>;
    sanitized_error?: string | null;
    sender_id?: string;
    is_simulation?: boolean;
    has_credentials?: boolean;
    has_dlt_entity?: boolean;
    phone_number_id?: string;
    business_account_id?: string;
    has_access_token?: boolean;
    has_webhook_secret?: boolean;
}

export interface NotificationWebhookEventItem {
    id: number;
    channel: string;
    event_type: string;
    provider_message_id: string;
    status: string;
    error_message?: string | null;
    created_at: string;
    created_at_human?: string;
}
