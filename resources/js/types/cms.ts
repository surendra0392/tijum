export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type ContentBlockType =
    | 'hero'
    | 'text'
    | 'image_text'
    | 'feature_grid'
    | 'benefits'
    | 'faq_accordion'
    | 'cta'
    | 'testimonial_review'
    | 'property_collection'
    | 'city_discovery';

export interface ContentBlock {
    type: ContentBlockType;
    data: Record<string, any>;
}

export interface ContentPage {
    id: number;
    slug: string;
    title: string;
    internal_name: string;
    summary?: string | null;
    content_blocks?: ContentBlock[] | null;
    featured_image?: string | null;
    status: ContentStatus;
    published_at?: string | null;
    scheduled_for?: string | null;
    author_admin_id?: number | null;
    author_admin?: { id: number; name: string } | null;
    seo_title?: string | null;
    seo_description?: string | null;
    canonical_override?: string | null;
    robots_directive?: string;
    og_image?: string | null;
    view_count: number;
    created_at?: string;
    updated_at?: string;
    revisions?: ContentPageRevision[];
}

export interface ContentPageRevision {
    id: number;
    content_page_id: number;
    admin_id?: number | null;
    admin?: { id: number; name: string } | null;
    version: number;
    title: string;
    content_blocks?: ContentBlock[] | null;
    seo_payload?: Record<string, any> | null;
    change_notes?: string | null;
    created_at: string;
}

export interface ContentAuthor {
    id: number;
    name: string;
    slug: string;
    designation?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    is_active: boolean;
    articles_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface BlogCategory {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
    display_order: number;
    is_active: boolean;
    articles_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface BlogTag {
    id: number;
    name: string;
    slug: string;
}

export interface BlogArticle {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    featured_image?: string | null;
    author_id?: number | null;
    author?: ContentAuthor | null;
    category_id?: number | null;
    category?: BlogCategory | null;
    reading_time_minutes: number;
    status: ContentStatus;
    published_at?: string | null;
    scheduled_for?: string | null;
    admin_id?: number | null;
    seo_title?: string | null;
    seo_description?: string | null;
    canonical_override?: string | null;
    og_image?: string | null;
    view_count: number;
    tags?: BlogTag[];
    created_at?: string;
    updated_at?: string;
}

export interface ContentFaq {
    id: number;
    question: string;
    answer: string;
    category: string;
    display_order: number;
    is_published: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface MediaAsset {
    id: number;
    filename: string;
    original_name: string;
    disk: string;
    path: string;
    url: string;
    mime_type: string;
    file_size_bytes: number;
    width?: number | null;
    height?: number | null;
    title?: string | null;
    alt_text?: string | null;
    caption?: string | null;
    admin_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface SeoSetting {
    id: number;
    site_name: string;
    title_template: string;
    default_meta_description?: string | null;
    default_og_image?: string | null;
    default_robots: string;
    google_site_verification?: string | null;
    bing_site_verification?: string | null;
}

export interface SeoRedirect {
    id: number;
    source_path: string;
    destination_url: string;
    http_status: number;
    is_active: boolean;
    hits_count: number;
    last_hit_at?: string | null;
    created_at?: string;
    admin?: { id: number; name: string } | null;
}
