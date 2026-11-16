import { Head } from '@inertiajs/react';
import type { SeoMetadata } from '@/types';

type PublicSeoHeadProps = {
    seo?: SeoMetadata;
    fallbackTitle: string;
    fallbackDescription?: string;
};

export function PublicSeoHead({
    seo,
    fallbackTitle,
    fallbackDescription = 'Hostels/PG, Homestays, and Co-Living accommodation with transparent room options and meal information.',
}: PublicSeoHeadProps) {
    const title = seo?.title ?? fallbackTitle;
    const description = seo?.description ?? fallbackDescription;
    const ogType = seo?.ogType ?? 'website';
    const canonical = seo?.canonical;
    const ogImage = seo?.ogImage;

    return (
        <Head title={title}>
            <meta
                head-key="meta-description"
                name="description"
                content={description}
            />
            {seo?.robots && (
                <meta head-key="robots" name="robots" content={seo.robots} />
            )}
            {canonical && (
                <link head-key="canonical" rel="canonical" href={canonical} />
            )}
            <meta
                head-key="og-site-name"
                property="og:site_name"
                content="TIJUM"
            />
            <meta head-key="og-title" property="og:title" content={title} />
            <meta
                head-key="og-description"
                property="og:description"
                content={description}
            />
            <meta head-key="og-type" property="og:type" content={ogType} />
            {canonical && (
                <meta head-key="og-url" property="og:url" content={canonical} />
            )}
            {ogImage && (
                <meta
                    head-key="og-image"
                    property="og:image"
                    content={ogImage}
                />
            )}
            <meta
                head-key="twitter-card"
                name="twitter:card"
                content="summary_large_image"
            />
            <meta
                head-key="twitter-title"
                name="twitter:title"
                content={title}
            />
            <meta
                head-key="twitter-description"
                name="twitter:description"
                content={description}
            />
            {ogImage && (
                <meta
                    head-key="twitter-image"
                    name="twitter:image"
                    content={ogImage}
                />
            )}
            {seo?.structuredData && (
                <script
                    head-key="structured-data"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(seo.structuredData),
                    }}
                />
            )}
        </Head>
    );
}
