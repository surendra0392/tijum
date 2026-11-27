export type SeoMetadata = {
    title: string;
    description: string;
    canonical: string;
    ogType: string;
    ogImage: string;
    ogSiteName?: string;
    robots?: string;
    googleSiteVerification?: string | null;
    bingSiteVerification?: string | null;
    structuredData?: Record<string, unknown>;
};
