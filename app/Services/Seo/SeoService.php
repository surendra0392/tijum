<?php

declare(strict_types=1);

namespace App\Services\Seo;

use App\Models\BlogArticle;
use App\Models\PlatformSetting;
use App\Models\Property;
use App\Models\SeoSetting;
use Illuminate\Support\Str;

class SeoService
{
    private const DEFAULT_OG_IMAGE = '/images/public/og-tijum-cover.jpg';

    /**
     * @param  array<string, mixed>|null  $structuredData
     * @return array<string, mixed>
     */
    public function buildPayload(
        ?string $title = null,
        ?string $description = null,
        ?string $canonical = null,
        string $robots = 'index, follow',
        string $ogType = 'website',
        ?string $ogImage = null,
        ?array $structuredData = null,
    ): array {
        $settings = SeoSetting::current();

        $resolvedTitle = $this->resolveTitle($title, $settings);
        $resolvedDescription = $description ?: ($settings->default_meta_description ?: 'TIJUM — Stay easy. Eat well. Spend less. Discover Hostels/PG, Homestays, and Co-Living with property-specific food flags.');
        $resolvedCanonical = $this->cleanCanonicalUrl($canonical ?: url()->current());
        $resolvedOgImage = $ogImage ? url($ogImage) : url($settings->default_og_image ?: self::DEFAULT_OG_IMAGE);

        $googleVerification = $settings->google_site_verification
            ?: (string) PlatformSetting::get('seo.google_site_verification', '');
        $bingVerification = $settings->bing_site_verification
            ?: (string) PlatformSetting::get('seo.bing_site_verification', '');

        return [
            'title' => $resolvedTitle,
            'description' => $resolvedDescription,
            'canonical' => $resolvedCanonical,
            'robots' => $robots,
            'ogType' => $ogType,
            'ogImage' => $resolvedOgImage,
            'ogSiteName' => $settings->site_name ?: 'TIJUM',
            'twitterCard' => 'summary_large_image',
            'googleSiteVerification' => $googleVerification !== '' ? $googleVerification : null,
            'bingSiteVerification' => $bingVerification !== '' ? $bingVerification : null,
            'structuredData' => $structuredData,
            'diagnostics' => [
                'title_length' => mb_strlen($resolvedTitle),
                'title_warning' => mb_strlen($resolvedTitle) > 65 ? 'Title may be truncated in search results (>65 chars)' : null,
                'description_length' => mb_strlen($resolvedDescription),
                'description_warning' => mb_strlen($resolvedDescription) > 160 ? 'Description may be truncated (>160 chars)' : null,
            ],
        ];
    }

    public function formatTitle(?string $title): string
    {
        return $this->resolveTitle($title, SeoSetting::current());
    }

    public function resolveTitle(?string $title, ?SeoSetting $settings = null): string
    {
        $settings = $settings ?: SeoSetting::current();

        if (empty($title) || $title === 'TIJUM' || $title === $settings->site_name) {
            return 'TIJUM — Stay easy. Eat well. Spend less.';
        }

        // If title already has brand suffix, do not duplicate
        if (Str::contains($title, 'TIJUM')) {
            return $title;
        }

        return sprintf($settings->title_template ?: '%s | TIJUM', $title);
    }

    /**
     * Normalize and sanitize canonical URLs.
     * Strips tracking, session, and volatile parameters (utm_*, click IDs, page=1)
     * while preserving content-identifying parameters (e.g. page > 1, filters).
     */
    public function cleanCanonicalUrl(string $url): string
    {
        $parsed = parse_url($url);
        if ($parsed === false) {
            return $url;
        }

        $scheme = config('app.url') ? (parse_url(config('app.url'), PHP_URL_SCHEME) ?: 'https') : ($parsed['scheme'] ?? 'https');
        $host = config('app.url') ? (parse_url(config('app.url'), PHP_URL_HOST) ?: ($parsed['host'] ?? '')) : ($parsed['host'] ?? '');
        $port = isset($parsed['port']) && ! in_array($parsed['port'], [80, 443], true) ? ':'.$parsed['port'] : '';
        $path = rtrim($parsed['path'] ?? '/', '/');
        if ($path === '') {
            $path = '/';
        }

        $queryParams = [];
        if (! empty($parsed['query'])) {
            parse_str($parsed['query'], $queryParams);

            $strippedKeys = [
                'gclid', 'fbclid', 'msclkid', 'ttclid', 'twclid', 'igshid', 'srsltid', 'dclid',
                'ref', 'source', 'session_id', 'token', '_gl', '_ga', 'mc_cid', 'mc_eid',
            ];

            foreach ($queryParams as $key => $value) {
                $lowerKey = strtolower((string) $key);
                if (Str::startsWith($lowerKey, 'utm_') || in_array($lowerKey, $strippedKeys, true)) {
                    unset($queryParams[$key]);

                    continue;
                }

                // Strip default page=1 as it is canonical to the base URL
                if ($lowerKey === 'page' && is_scalar($value) && ((string) $value === '1' || (int) $value === 1)) {
                    unset($queryParams[$key]);
                }
            }
        }

        $queryString = '';
        if (! empty($queryParams)) {
            ksort($queryParams);
            $queryString = '?'.http_build_query($queryParams);
        }

        return "{$scheme}://{$host}{$port}{$path}{$queryString}";
    }

    /**
     * @return array<string, mixed>
     */
    public function organizationSchema(): array
    {
        return [
            '@type' => 'Organization',
            'name' => 'TIJUM',
            'url' => route('home'),
            'slogan' => 'Stay easy. Eat well. Spend less.',
            'logo' => url('/pwa/icon-192x192.png'),
            'description' => 'Accommodation aggregation and booking marketplace connecting customers with verified Hostels/PG, Homestays, and Co-Living spaces with property-specific food flags.',
            'areaServed' => [
                ['@type' => 'City', 'name' => 'Hyderabad'],
                ['@type' => 'City', 'name' => 'Guntur'],
                ['@type' => 'City', 'name' => 'Vijayawada'],
                ['@type' => 'City', 'name' => 'Visakhapatnam'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function websiteSchema(): array
    {
        return [
            '@type' => 'WebSite',
            'name' => 'TIJUM',
            'url' => route('home'),
            'description' => 'Affordable, food-inclusive accommodation booking marketplace for Hostels/PG, Homestays, and Co-Living with property-specific food flags.',
            'potentialAction' => [
                '@type' => 'SearchAction',
                'target' => route('public.search').'?locality={search_term_string}',
                'query-input' => 'required name=search_term_string',
            ],
        ];
    }

    /**
     * @param  list<array{name: string, url: string}>  $crumbs
     * @return array<string, mixed>
     */
    public function breadcrumbSchema(array $crumbs): array
    {
        $elements = [
            [
                '@type' => 'ListItem',
                'position' => 1,
                'name' => 'Home',
                'item' => route('home'),
            ],
        ];

        $pos = 2;
        foreach ($crumbs as $crumb) {
            $elements[] = [
                '@type' => 'ListItem',
                'position' => $pos++,
                'name' => $crumb['name'],
                'item' => $crumb['url'],
            ];
        }

        return [
            '@type' => 'BreadcrumbList',
            'itemListElement' => $elements,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function articleSchema(BlogArticle $article): array
    {
        $schema = [
            '@type' => 'Article',
            'headline' => $article->title,
            'description' => $article->excerpt,
            'url' => route('public.blog.show', ['article' => $article->slug]),
            'datePublished' => $article->published_at?->toIso8601String(),
            'dateModified' => $article->updated_at?->toIso8601String(),
            'mainEntityOfPage' => [
                '@type' => 'WebPage',
                '@id' => route('public.blog.show', ['article' => $article->slug]),
            ],
        ];

        if ($article->featured_image) {
            $schema['image'] = url($article->featured_image);
        }

        if ($article->author) {
            $schema['author'] = [
                '@type' => 'Person',
                'name' => $article->author->name,
                'jobTitle' => $article->author->designation ?: 'Staff Writer',
            ];
        } else {
            $schema['author'] = [
                '@type' => 'Organization',
                'name' => 'TIJUM Editorial Team',
            ];
        }

        $schema['publisher'] = [
            '@type' => 'Organization',
            'name' => 'TIJUM',
            'logo' => [
                '@type' => 'ImageObject',
                'url' => url('/pwa/icon-192x192.png'),
            ],
        ];

        return $schema;
    }

    /**
     * @return array<string, mixed>
     */
    public function lodgingBusinessSchema(
        Property $property,
        string $canonical,
        string $description,
        string $ogImage,
    ): array {
        $amenityFeatures = [];

        if ($property->food_provided) {
            $amenityFeatures[] = [
                '@type' => 'LocationFeatureSpecification',
                'name' => 'Food Provided',
                'value' => true,
            ];
        }
        if ($property->breakfast_included) {
            $amenityFeatures[] = [
                '@type' => 'LocationFeatureSpecification',
                'name' => 'Breakfast Included',
                'value' => true,
            ];
        }
        if ($property->lunch_included) {
            $amenityFeatures[] = [
                '@type' => 'LocationFeatureSpecification',
                'name' => 'Lunch Included',
                'value' => true,
            ];
        }
        if ($property->dinner_included) {
            $amenityFeatures[] = [
                '@type' => 'LocationFeatureSpecification',
                'name' => 'Dinner Included',
                'value' => true,
            ];
        }

        $schema = [
            '@type' => 'LodgingBusiness',
            'name' => $property->name,
            'description' => $description,
            'url' => $canonical,
            'image' => $ogImage,
            'address' => [
                '@type' => 'PostalAddress',
                'addressLocality' => $property->locality,
                'addressRegion' => $property->city !== null ? $property->city->state : $property->state,
                'addressCountry' => 'IN',
            ],
        ];

        if (! empty($amenityFeatures)) {
            $schema['amenityFeature'] = $amenityFeatures;
        }

        // Include genuine rating summary if property has published reviews (BIS IS 19000 & Google Schema compliant)
        if ($property->ratingSummary && $property->ratingSummary->published_review_count > 0) {
            $schema['aggregateRating'] = [
                '@type' => 'AggregateRating',
                'ratingValue' => number_format((float) $property->ratingSummary->average_rating, 1),
                'reviewCount' => $property->ratingSummary->published_review_count,
                'bestRating' => '5',
                'worstRating' => '1',
            ];
        }

        return $schema;
    }

    /**
     * @return array<string, mixed>
     */
    public function propertySchema(
        Property $property,
        string $description,
        string $canonical,
        string $ogImage,
    ): array {
        $property->loadMissing('city');
        $schema = $this->lodgingBusinessSchema($property, $canonical, $description, $ogImage);
        $schema['address']['addressRegion'] = $property->city?->name ?? $schema['address']['addressRegion'];

        return $schema;
    }

    /**
     * @param  list<array{question: string, answer: string}>  $faqs
     * @return array<string, mixed>
     */
    public function faqSchema(array $faqs): array
    {
        $entities = [];
        foreach ($faqs as $faq) {
            $entities[] = [
                '@type' => 'Question',
                'name' => $faq['question'],
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text' => $faq['answer'],
                ],
            ];
        }

        return [
            '@type' => 'FAQPage',
            'mainEntity' => $entities,
        ];
    }
}
