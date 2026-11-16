export type SeoMetadata = {
    title: string;
    description: string;
    canonical: string;
    ogType: string;
    ogImage: string;
    robots?: string;
    structuredData?: Record<string, unknown>;
};
