# TIJUM — SEO Implementation Guide
**Technical Search Engine Optimization Architecture, Metadata Directives & Structured Data Standards**

---

## 1. Overview & SEO Philosophy

TIJUM is a marketplace for food-inclusive hostels, PG accommodations, and homestays across South India (initial launch: Hyderabad, Guntur, Vijayawada, and Visakhapatnam). Organic search visibility is vital for sustainable student and working professional acquisition without depending solely on paid ads.

Phase 19 establishes a unified, production-grade technical SEO architecture adhering to modern search engine standards (Google Search Central, Bing Webmaster Guidelines, Schema.org, and Open Graph protocol).

### Core Architectural Principles:
1. **Server-Rendered Initial HTML**: All search engine meta tags (`<title>`, `<meta name="description">`, `<link rel="canonical">`, `<meta name="robots">`, Open Graph, Twitter Cards, and Schema.org JSON-LD structured data) are rendered directly into the initial HTML response in `resources/views/app.blade.php`. Search engine bots do not have to execute client-side JavaScript to discover or index content.
2. **Canonical URL Hygiene**: All canonical tags are normalized by `SeoService` to eliminate volatile query parameters (`utm_*`, `gclid`, `fbclid`, `session_id`, redundant pagination) and prevent duplicate content indexation.
3. **Structured Data Completeness**: Automated JSON-LD structured data schemas are injected on every page type (`Organization`, `WebSite`, `BreadcrumbList`, `Article`, `LodgingBusiness`, and `FAQPage`).
4. **Dynamic XML Sitemap**: Sitemaps are dynamically generated at `/sitemap.xml`, cached for 24 hours, and automatically purged when properties, blog articles, or CMS pages are published or updated.
5. **Compliant Robots & Crawl Directives**: Disallow rules strictly protect administrative, owner, and authenticated private routes while granting full indexation access to public inventory.
6. **Robust Redirect Management**: A dedicated 301/302 URL redirect manager handles legacy URLs and slug migrations, with built-in infinite circular loop prevention and open-redirect phishing protection.

---

## 2. Centralized SEO Service (`App\Services\Seo\SeoService`)

All SEO logic is centralized in `App\Services\Seo\SeoService`. Controllers and Inertia middleware interact with this single service rather than hand-crafting meta tags.

### Key Methods:

#### `buildPayload(...)`
Constructs the complete SEO prop dictionary consumed by `resources/views/app.blade.php` and Inertia client components:
```php
$seo = $seoService->buildPayload(
    title: 'Food-Inclusive Hostels in Hyderabad',
    description: 'Find verified hostels and PGs in Hyderabad with daily meals included.',
    canonical: url('/hostels-in-hyderabad'),
    robots: 'index, follow',
    ogType: 'website',
    ogImage: '/images/public/hyderabad-cover.jpg',
    structuredData: [
        '@context' => 'https://schema.org',
        '@graph' => [ ... ],
    ],
);
```

#### `cleanCanonicalUrl(string $url): string`
Normalizes canonical links:
- Extracts scheme and host from `config('app.url')`.
- Strips volatile tracking and session query parameters (`utm_*`, `gclid`, `fbclid`, `msclkid`, `ref`, `source`, `session_id`, `token`, etc.).
- Strips redundant `page=1` pagination parameter (canonicalized to the root path).
- Preserves legitimate content-identifying parameters (e.g. pagination beyond page 1 `?page=2`, or content query filters) and sorts query keys deterministically (`ksort`).
- Eliminates trailing slashes on sub-paths while preserving root `/`.

#### `resolveTitle(?string $title, ?SeoSetting $settings = null): string`
Applies the marketplace title template (configured in database `seo_settings`):
- Format: `%s | TIJUM — Food-Inclusive Hostels & PGs`.
- Avoids duplicate brand suffixes if the input already contains "TIJUM".

---

## 3. Schema.org JSON-LD Structured Data Specifications

TIJUM provides structured data using JSON-LD `@graph` structures:

### 3.1 Organization Schema
Injected across all public pages to establish corporate knowledge graph identity:
```json
{
  "@type": "Organization",
  "name": "TIJUM",
  "url": "https://tijum.com",
  "logo": "https://tijum.com/images/brand/logo.png",
  "description": "Food-inclusive accommodation marketplace for hostels, PG accommodations, and homestays.",
  "sameAs": [
    "https://facebook.com/tijum",
    "https://instagram.com/tijum",
    "https://linkedin.com/company/tijum"
  ]
}
```

### 3.2 WebSite Schema with SearchAction
Injected on the homepage (`/`):
```json
{
  "@type": "WebSite",
  "name": "TIJUM",
  "url": "https://tijum.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://tijum.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

> [!NOTE]
> **Google Search Policy Update — Deprecation of Sitelinks Searchbox (November 2024)**:
> In November 2024, Google officially discontinued the Sitelinks Searchbox rich result globally across all languages and regions. TIJUM retains Schema.org `WebSite` markup with `potentialAction: SearchAction` for open web graph standards and semantic discovery; however, it must not be represented as an active Google SERP visual enhancement or search box in Google search results.

### 3.3 BreadcrumbList Schema
Injected on all hierarchical pages (Blog, City Guides, Static CMS Pages, Property Details):
```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://tijum.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "https://tijum.com/blog"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Hyderabad Living Guide",
      "item": "https://tijum.com/blog/hyderabad-living-guide"
    }
  ]
}
```

### 3.4 Article Schema
Injected on all blog article reader pages (`/blog/{slug}`):
```json
{
  "@type": "Article",
  "headline": "Top Food-Inclusive Stays in Hyderabad for Students",
  "description": "Comprehensive guide to student accommodations with homestyle meals included.",
  "datePublished": "2026-10-15T09:00:00+05:30",
  "dateModified": "2026-11-01T14:30:00+05:30",
  "author": {
    "@type": "Person",
    "name": "Aditya Varma",
    "jobTitle": "Student Living Editor"
  },
  "publisher": {
    "@type": "Organization",
    "name": "TIJUM",
    "logo": "https://tijum.com/images/brand/logo.png"
  }
}
```

### 3.5 LodgingBusiness Schema
Injected on verified property detail pages (`/properties/{slug}`):
```json
{
  "@type": "LodgingBusiness",
  "name": "Sri Sai Food-Inclusive Executive PG",
  "description": "Verified PG with 3 homestyle South Indian meals included daily.",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Plot 42, Silicon Valley",
    "addressLocality": "Madhapur",
    "addressRegion": "Telangana",
    "postalCode": "500081",
    "addressCountry": "IN"
  },
  "checkinTime": "09:00",
  "checkoutTime": "08:00",
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Daily Homestyle Meals Included (Property-Declared Schedule)", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "High-Speed Wi-Fi", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Air Conditioning", "value": true }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": 24,
    "bestRating": "5",
    "worstRating": "1"
  }
}
```

### 3.6 FAQPage Schema
Injected on city landing pages (`/hostels-in-hyderabad`) and public FAQ pages:
```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is food included in Hyderabad hostel bookings on TIJUM?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Every bookable property on TIJUM includes food. The exact meal inclusions (Breakfast, Lunch, Dinner) are clearly highlighted on the property profile before booking."
      }
    }
  ]
}
```

> [!IMPORTANT]
> **Google Search Policy Update — FAQ Rich Result Restriction (August 2023)**:
> In August 2023, Google updated its search result policies to restrict FAQ rich results (collapsible accordion Q&As in SERPs) exclusively to authoritative government and healthcare websites. For commercial marketplaces like TIJUM, `FAQPage` schema is valid Schema.org vocabulary that aids search engine document comprehension and generative AI answer extraction, but operations and marketing teams should not expect FAQ rich-result snippet displays in Google search results.

---

## 4. Dynamic XML Sitemap Engine (`App\Services\Seo\SitemapService`)

### URL Collection Architecture
The XML Sitemap generator dynamically pulls eligible indexed URLs across the marketplace:
1. **Static Core Pages**: Homepage (`1.0`), How It Works (`0.8`), About (`0.7`), Become a Partner (`0.8`), FAQs (`0.8`), Grievance Redressal (`0.6`), Review Policy (`0.6`).
2. **City Landing Pages**: `/hostels-in-hyderabad`, `/hostels-in-guntur`, `/hostels-in-vijayawada`, `/hostels-in-visakhapatnam` (`0.9`, daily change frequency).
3. **Live Eligible Properties**: Only active, approved, verified properties with active owners (`0.8`, daily).
4. **Blog Articles**: Published articles (`0.8`, monthly).
5. **Blog Categories**: Active categories (`0.7`, weekly).
6. **Published CMS Pages**: Active custom landing pages (`0.7`, weekly).

### Caching & Invalidation
- Sitemap XML is cached in Redis / File cache under key `tijum_sitemap_xml` for 24 hours.
- When an article is published or edited, or a page updated, or property verified:
  ```php
  $this->sitemapService->clearCache();
  ```
- Administrators can also purge and regenerate the sitemap with 1 click in Admin under **SEO > Dynamic XML Sitemap**.

---

## 5. Robots.txt Crawl Control

Served at `/robots.txt` via `PublicPageController::robots()`:

### Production Environment Output:
```txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /owner
Disallow: /_dev
Disallow: /settings
Disallow: /dashboard
Disallow: /reservations
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /two-factor-challenge
Disallow: /verify-email
Disallow: /passkeys
Disallow: /search?
Disallow: /api/
Sitemap: https://tijum.com/sitemap.xml
```

### Staging & Local Environments:
```txt
User-agent: *
Disallow: /
```
Prevents accidental staging or local indexation by search engines.

---

## 6. URL Redirect Management (`App\Http\Middleware\HandleSeoRedirects`)

Legacy links, inbound backlinks, and renamed slugs are handled by global HTTP middleware `HandleSeoRedirects`.

### Security Protections:
- **Loop Prevention**: Blocks rules where `source_path === destination_url` or where redirection cycles back to the original request path.
- **Open-Redirect Phishing Defense**: Destination URLs must be relative internal paths (`/hostels-in-hyderabad`) or match the configured application host (`config('app.url')`). Arbitrary external domains are blocked.
- **Telemetry**: Increments `hits_count` and updates `last_hit_at` timestamp on each redirection.
