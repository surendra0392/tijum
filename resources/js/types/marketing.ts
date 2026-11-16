export type BannerPlacement =
    | 'homepage_hero'
    | 'homepage_strip'
    | 'city_page'
    | 'blog_page';

export type BannerStatus =
    | 'draft'
    | 'scheduled'
    | 'active'
    | 'paused'
    | 'expired';

export type CampaignStatus =
    | 'draft'
    | 'scheduled'
    | 'active'
    | 'paused'
    | 'completed'
    | 'archived';

export type SubscriberStatus =
    | 'pending_confirmation'
    | 'subscribed'
    | 'unsubscribed'
    | 'bounced';

export type EmailCampaignStatus =
    | 'draft'
    | 'scheduled'
    | 'sending'
    | 'sent'
    | 'cancelled';

export interface MarketingBanner {
    id: number;
    campaign_id?: number | null;
    campaign?: { id: number; name: string } | null;
    name: string;
    headline: string;
    description?: string | null;
    image_url?: string | null;
    cta_text: string;
    cta_url: string;
    placement: BannerPlacement;
    display_order: number;
    status: BannerStatus;
    starts_at?: string | null;
    ends_at?: string | null;
    impression_count: number;
    click_count: number;
    created_at?: string;
    updated_at?: string;
}

export interface MarketingCampaign {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    objective: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content?: string | null;
    target_landing_url: string;
    status: CampaignStatus;
    starts_at?: string | null;
    ends_at?: string | null;
    banners_count?: number;
    email_campaigns_count?: number;
    tracking_events_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface MarketingSubscriber {
    id: number;
    email: string;
    name?: string | null;
    status: SubscriberStatus;
    confirmed_at?: string | null;
    unsubscribed_at?: string | null;
    source: string;
    ip_address?: string | null;
    created_at?: string;
    consent_records?: Array<{
        id: number;
        action: string;
        channel: string;
        source: string;
        created_at: string;
    }>;
}

export interface MarketingEmailCampaign {
    id: number;
    campaign_id?: number | null;
    marketing_campaign?: { id: number; name: string } | null;
    title: string;
    subject: string;
    preview_text?: string | null;
    content_html: string;
    content_text?: string | null;
    target_segment: string;
    status: EmailCampaignStatus;
    scheduled_for?: string | null;
    sent_at?: string | null;
    total_recipients: number;
    delivered_count: number;
    failed_count: number;
    created_at?: string;
    updated_at?: string;
}
