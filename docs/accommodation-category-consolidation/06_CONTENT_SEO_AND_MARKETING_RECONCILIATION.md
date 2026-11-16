# Platform-Wide Content, Marketing Copy, FAQ, and SEO Reconciliation Report

> **Updated after final category consolidation corrections.**

**Document Reference:** `DOC-ACC-CAT-06`  
**Phase:** Accommodation Category Consolidation  
**Author:** Platform Content & SEO Specialist (`@content-seo`)  
**Status:** Complete & Corrected ✅  
**Date:** November 14, 2026  
**Audience:** Platform Verifier (`@verifier`), Swarm Coordinator (`@coordinator`), Engineering Swarm (`@backend-db`, `@web-ui`, `@mobile-app`, `@auditor`)

---

## 1. Executive Summary

### 1.1 Objective & Mandate
As part of the platform-wide consolidation of TIJUM's accommodation taxonomy, `@content-seo` was assigned end-to-end ownership over all platform marketing copy, customer-facing content, CMS editorial pages, FAQ knowledge bases, SEO metadata, JSON-LD structured data schemas, XML sitemaps, and legacy category URL redirections.

The core objectives achieved in this track are:
1. **Canonical Category Alignment:** Unify all public copy, descriptions, titles, and definitions around exactly **three canonical accommodation categories**:
   - **Hostels/PG** (`slug: hostels-pg`, `code: hostel_pg`)
   - **Homestays** (`slug: homestays`, `code: homestay`)
   - **Co-Living** (`slug: co-living`, `code: coliving`)
2. **Property-Specific Food Flags:** Eliminate vague or ambiguous blanket meal statements. Every customer-facing touchpoint (homepage, search results, property profiles, city landing pages, FAQs, and structured data) now highlights **property-specific food flags**:
   - `food_provided` (Overall food availability)
   - `breakfast_included` (Morning meal coverage)
   - `lunch_included` (Daytime meal coverage)
   - `dinner_included` (Evening home-style meal coverage)
3. **Comprehensive Legacy Category Redirection Engine:** Implement an automated, high-performance HTTP 301 permanent redirection engine across two synchronized tiers:
   - **Database Tier:** Managed through `SeoRedirect` records evaluated by `HandleSeoRedirects` middleware with automatic hit counting.
   - **Route Fallback Tier:** Managed through `CategoryRedirectController` and explicit route definitions in `routes/web.php`.
   - **Query Parameter Normalization:** Automatic resolution of legacy slugs (`independent-hostel`, `pg-accommodation`, `hotels`, `lodges`) to consolidated category IDs within `PropertySearchRequest`.
4. **Rich Schema.org JSON-LD Structured Data:** Update Organization, WebSite, BreadcrumbList, FAQPage, and LodgingBusiness schemas—including `LocationFeatureSpecification` nodes representing property-specific food inclusions for enhanced Google search snippets.
5. **XML Sitemap Expansion:** Include canonical category discovery URLs alongside core static and city landing pages with appropriate priorities and change frequencies.

---

## 2. Canonical Category Taxonomy Alignment

All customer-facing portals, marketing collateral, CMS records, and metadata have been synchronized to eliminate fragmented legacy nomenclature.

| Canonical Category Name | Slug | Code | Customer-Facing Definition | Target Audience | Key Highlight Inclusions |
|:---|:---:|:---:|:---|:---|:---|
| **Hostels/PG** | `hostels-pg` | `hostel_pg` | Budget-conscious shared and private rooms providing structured house rules and property-specific meal arrangements. | Students, competitive exam aspirants, software trainees, and junior professionals. | Single & shared occupancy, daily/weekly/monthly stay packages, declared meal schedules. |
| **Homestays** | `homestays` | `homestay` | Warm residential stays hosted directly by independent homeowners featuring authentic home-cooked regional dining. | Families, relocating professionals, academic visitors, and travellers. | Direct host hospitality, peaceful residential locales, transparent home-cooked meal flags. |
| **Co-Living** | `co-living` | `coliving` | Fully furnished community living spaces designed for young professionals, featuring modern shared workspaces and dining. | Remote workers, IT professionals, startup teams, and creative professionals. | Ergonomic workstations, high-speed Wi-Fi, community lounges, declared food packages. |

---

## 3. Customer-Facing Marketing Copy & Content Reconciliation

### 3.1 Homepage Hero & Strip Banners
- **Hero Title:** `TIJUM — Stay easy. Eat well. Spend less.`
- **Hero Subtitle:** `Discover affordable Hostels/PG, Homestays, and Co-Living spaces across Hyderabad, Guntur, Vijayawada, and Visakhapatnam with property-specific food flags and verified stays.`
- **Marketing Campaign (`launch-2026`):**
  - **Hero Banner:** `Verified Hostels/PG, Homestays, and Co-Living spaces in Hyderabad, Guntur, Vijayawada, and Vizag with property-specific food flags.`
  - **Strip Banner Headline:** `🍲 Property-Specific Food Flags on Every Stay — No Hidden Meal Surprises`
  - **Strip Banner Description:** `Hostels/PG, Homestays, and Co-Living spaces with verified breakfast, lunch, and dinner inclusions.`

### 3.2 Value Propositions & Food Story
- **Value Proposition Item:** `Compare Hostels/PG, Homestays, and Co-Living spaces using real room-type rates and property-specific food flags.`
- **Food Story Narrative:** Explicitly communicates that meal arrangements vary by property, highlighting the four distinct flags so a general food offering is never misinterpreted as an all-meals guarantee.

### 3.3 Core Public Pages (`About`, `How It Works`, `Become a Partner`)
1. **About Us (`/about`):**
   - **Mission Statement:** Replaced legacy "hostels, PG accommodations, and homestays" with "Hostels/PG, Homestays, and Co-Living spaces with property-specific food flags."
   - **Asset-Light Operational Model:** Clarifies that TIJUM aggregates verified independent Hostels/PG, Homestay hosts, and Co-Living operators without owning buildings or operating centralized kitchens.
2. **How It Works (`/how-it-works`):**
   - **Platform Scope:** Guides customers through discovering eligible room types across Hostels/PG, Homestays, and Co-Living.
   - **Food Transparency Step:** Highlights that quote calculations and property cards set out individual meal flags (Breakfast, Lunch, Dinner) upfront before reservation requests are placed.
3. **Become a Partner (`/become-a-partner`):**
   - **Category Showcase:** Renders a 3-column card grid displaying Hostels/PG, Homestays, and Co-Living with respective operational badges and requirements.
   - **Operator Pitch:** Invites independent operators of Hostels/PG, Homestays, and modern Co-Living facilities across launch markets to gain verified digital visibility.

---

## 4. Property-Specific Food Flags Reconciliation

### 4.1 Transition from Blanket Claims to Property-Specific Flags
Historical marketing copy occasionally utilized ambiguous phrasing like "Food included in every stay." In real-world hospitality, properties offer diverse meal combinations (e.g. breakfast-only in co-living spaces, three daily meals in student PGs, or breakfast and dinner in homestays). 

To ensure absolute regulatory compliance with the **Consumer Protection (E-Commerce) Rules 2020** and **ASCI Hospitality Advertising Guidelines**, copy was reconciled to emphasize **property-specific food flags**:

```
[Legacy Copy] ❌ "Every stay includes all meals."
[Canonical Copy] ✅ "Search-eligible stays provide food according to property-specific food flags (Breakfast, Lunch, Dinner) clearly displayed before booking."
```

### 4.2 Four-Tier Flag Representation in Metadata & Schema
In `app/Services/Seo/SeoService.php`, the `lodgingBusinessSchema()` method now dynamically generates Schema.org `LocationFeatureSpecification` nodes:

```json
{
  "@type": "LodgingBusiness",
  "name": "Sri Balaji Executive Co-Living",
  "amenityFeature": [
    {
      "@type": "LocationFeatureSpecification",
      "name": "Food Provided",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Breakfast Included",
      "value": true
    },
    {
      "@type": "LocationFeatureSpecification",
      "name": "Dinner Included",
      "value": true
    }
  ]
}
```

### 4.3 Customer UI Disclosures & 9-Case Food Orthogonality Matrix
To ensure 100% honesty across all 9 possible combinations of category and meal packages, customer-facing interfaces strictly render factual, nuanced disclosures:
1. **Food Bundled with Specific Meals (`food_provided: true`, $\ge 1$ meal true):**
   - **Web UI:** Renders `Food available · Breakfast, Dinner` (or whichever specific meals are configured).
   - **Mobile UI:** Renders `MealBadge` with Food Emerald icon highlighting bundled meal types.
2. **Food Facility Available with Zero Meals Bundled (`food_provided: true`, all meals false):**
   - **Web UI:** Explicitly states `Food available · No meals included in base rate` in compact mode, preventing false assumptions of free meals while confirming on-premise kitchen/canteen facilities.
   - **Mobile UI:** Renders `Food Available (No Meals Included)` badge and detailed notice: *"Food and kitchen facilities are available on-premise, but meals are not included in the base room rate."*
3. **Room-Only Stays (`food_provided: false`, all meals false):**
   - **Web UI:** Explicitly states `Food not provided`.
   - **Mobile UI:** Displays `Room Only / No Food` badge.

This granular copy architecture prevents any customer misinterpretation and guarantees full compliance with ASCI truth-in-advertising principles.

---

## 5. FAQ & Knowledge Base Reconciliation

The FAQ repository (`resources/js/data/public-content.ts`, `database/seeders/Phase19ContentSeeder.php`, and `PublicPageController::faqs()`) was restructured to address category consolidation and meal transparency directly.

### 5.1 Reconciled FAQ Ledger

| Topic | Question | Canonical Answer |
|:---|:---|:---|
| **Platform Scope** | What is TIJUM? | TIJUM is an accommodation aggregation and booking marketplace connecting customers with verified Hostels/PG, Homestays, and Co-Living spaces, featuring transparent property-specific food flags on every listing. |
| **Categories** | What accommodation categories are available on TIJUM? | TIJUM consolidates accommodation into three canonical categories: **Hostels/PG** (student and professional shared/private stays), **Homestays** (warm host-managed residential stays), and **Co-Living** (modern community-focused shared living spaces with premium amenities). |
| **Excluded Models** | Are commercial hotels or lodges offered on TIJUM? | No. TIJUM is purposefully specialized in Hostels/PG, Homestays, and Co-Living spaces with property-specific food flags where everyday living value and community hospitality are strongest. Pure room-only hotels without food arrangements are excluded. |
| **Food Policy** | Is food included in every bookable stay? | Search-eligible TIJUM stays provide food and display property-specific food flags for breakfast, lunch, and dinner. Exact meal inclusions are declared by each property and clearly highlighted before booking. |
| **Food Flags** | What are property-specific food flags? | Property-specific food flags indicate whether food is provided and distinguish individual meal offerings (Breakfast, Lunch, Dinner). Each property specifies its meal schedules, so guests know exactly what to expect before booking. |
| **Meal Variety** | Do all properties offer the exact same meals? | No. Each independent Hostel/PG, Homestay, or Co-Living property defines its own covered meals, serving times, and dietary availability, which display transparently on each listing. |
| **Partner Eligibility** | What kind of property partners can join now? | Operators and homeowners managing existing independent Hostels/PG, Homestays, or Co-Living accommodations in or around Hyderabad, Guntur, Vijayawada, and Visakhapatnam who offer food-inclusive stay packages. |

---

## 6. City Landing Pages & Local SEO

The four launch cities (`/hostels-in-{citySlug}`) have been enhanced with localized editorial copy reflecting all three canonical categories and neighborhood dining contexts:

### 6.1 City Editorial Matrix

| City | Target Route | Canonical Title Tag | Meta Description | Highlighted Neighborhoods |
|:---|:---:|:---|:---|:---|
| **Hyderabad** | `/hostels-in-hyderabad` | `Hostels/PG, Homestays & Co-Living in Hyderabad \| TIJUM` | Find verified Hostels/PG, Homestays, and Co-Living spaces in Hyderabad with property-specific food flags and homestyle meals included. Transparent pricing, no broker fees. | Madhapur & Gachibowli, Ameerpet & SR Nagar, Kondapur & Kukatpally, Dilsukhnagar & LB Nagar |
| **Vijayawada** | `/hostels-in-vijayawada` | `Hostels/PG, Homestays & Co-Living in Vijayawada \| TIJUM` | Find verified Hostels/PG, Homestays, and Co-Living spaces in Vijayawada with property-specific food flags and homestyle meals included. Transparent pricing, zero broker fees. | Benz Circle & MG Road, Moghalrajpuram & Labbipet, Governorpet & Besant Road, Patamata & Auto Nagar |
| **Guntur** | `/hostels-in-guntur` | `Hostels/PG, Homestays & Co-Living in Guntur \| TIJUM` | Find verified Hostels/PG, Homestays, and Co-Living spaces in Guntur with property-specific food flags and homestyle meals included. Transparent pricing, zero broker fees. | Arundalpet & Brodipet, Lakshmipuram, Koretipadu, Vidyanagar |
| **Visakhapatnam** | `/hostels-in-visakhapatnam` | `Hostels/PG, Homestays & Co-Living in Visakhapatnam \| TIJUM` | Find verified Hostels/PG, Homestays, and Co-Living spaces in Visakhapatnam with property-specific food flags and homestyle meals included. Transparent pricing, zero broker fees. | MVP Colony, Dwaraka Nagar & Complex, Siripuram & AU Campus, Rushikonda & Madhurawada |

---

## 7. Legacy Category Redirection Architecture & Ledger

### 7.1 Two-Tier Redirection Engine
To protect SEO authority, eliminate 404 errors, and maintain seamless backward compatibility for search engine crawlers and external bookmarks:

1. **Database-Driven Redirections (`seo_redirects`):**
   - Seeded by `CategoryRedirectSeeder.php` into the `seo_redirects` table.
   - Evaluated by `HandleSeoRedirects` middleware before controllers are invoked.
   - Automatically tracks `hits_count` and updates `last_hit_at`.
2. **Route-Level Controller Fallbacks (`CategoryRedirectController`):**
   - Explicit routes in `routes/web.php` for `/categories/{slug}`, `/category/{slug}`, `/{category}-in-{citySlug}`, and top-level shortcuts (`/hostels`, `/pg`, `/homestays`, `/co-living`).
   - Issues clean HTTP 301 Permanent Redirects with preserved query parameters.
3. **Query Parameter Slug Normalization:**
   - In `app/Http/Requests/Public/PropertySearchRequest.php`, any incoming `category` query parameter containing legacy strings (`independent-hostel`, `pg-accommodation`, `hotels`, `lodges`) is mapped to the canonical slug (`hostels-pg`, `homestays`, `co-living`) and resolved into valid integer IDs.

### 7.2 Complete Legacy-to-Canonical Redirection Ledger

| Legacy Source URL Pattern | HTTP Status | Canonical Destination URL | Resolution Mechanism | Notes / Target |
|:---|:---:|:---|:---:|:---|
| `/categories/independent-hostel` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Historical DB Category 1 |
| `/categories/independent-hostels` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Plural variant |
| `/categories/pg-accommodation` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Historical DB Category 2 |
| `/categories/pg-accommodations` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Plural variant |
| `/categories/hostel` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Short code variant |
| `/categories/hostels` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Legacy web UI identifier |
| `/categories/pg` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Short code variant |
| `/categories/pgs` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Plural variant |
| `/categories/homestay` | `301` | `/search?category=homestays` | Middleware + Controller | Singular DB slug |
| `/categories/homestays` | `301` | `/search?category=homestays` | Middleware + Controller | Canonical category search |
| `/categories/coliving` | `301` | `/search?category=co-living` | Middleware + Controller | Alternative slug spelling |
| `/categories/co-living` | `301` | `/search?category=co-living` | Middleware + Controller | Canonical category search |
| `/categories/hotels` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Ambiguous legacy term |
| `/categories/lodges` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Ambiguous legacy term |
| `/categories/guest-houses` | `301` | `/search?category=hostels-pg` | Middleware + Controller | Ambiguous legacy term |
| `/category/{any-legacy-slug}` | `301` | `/search?category={canonical-slug}` | Middleware + Controller | Singular route prefix |
| `/hostels` | `301` | `/search?category=hostels-pg` | Middleware + Route | Root shortcut |
| `/pg` | `301` | `/search?category=hostels-pg` | Middleware + Route | Root shortcut |
| `/pgs` | `301` | `/search?category=hostels-pg` | Middleware + Route | Root shortcut |
| `/homestays` | `301` | `/search?category=homestays` | Middleware + Route | Root shortcut |
| `/co-living` | `301` | `/search?category=co-living` | Middleware + Route | Root shortcut |
| `/coliving` | `301` | `/search?category=co-living` | Middleware + Route | Root shortcut |
| `/hotels-in-{citySlug}` | `301` | `/hostels-in-{citySlug}` | Middleware + Controller | Ambiguous term in city |
| `/lodges-in-{citySlug}` | `301` | `/hostels-in-{citySlug}` | Middleware + Controller | Ambiguous term in city |
| `/guest-houses-in-{citySlug}` | `301` | `/hostels-in-{citySlug}` | Middleware + Controller | Ambiguous term in city |
| `/pgs-in-{citySlug}` | `301` | `/hostels-in-{citySlug}` | Middleware + Controller | Legacy city path |
| `/homestays-in-{citySlug}` | `301` | `/hostels-in-{citySlug}` | Middleware + Controller | Legacy city path |
| `/coliving-in-{citySlug}` | `301` | `/hostels-in-{citySlug}` | Middleware + Controller | Legacy city path |

---

## 8. Schema.org JSON-LD Structured Data Audit

All structured data payloads generated across the platform conform strictly to Schema.org standards:

### 8.1 Schema Implementation Checklist

| Schema Type | Generator Location | Key Properties Reconciled |
|:---|:---|:---|
| **Organization** | `SeoService::organizationSchema()` | `name: TIJUM`, `slogan: Stay easy. Eat well. Spend less.`, `description: Accommodation aggregation and booking marketplace connecting customers with verified Hostels/PG, Homestays, and Co-Living spaces with property-specific food flags.`, `areaServed: [Hyderabad, Guntur, Vijayawada, Visakhapatnam]`. |
| **WebSite** | `SeoService::websiteSchema()` | `url: https://tijum.com/`, `description: Affordable, food-inclusive accommodation booking marketplace for Hostels/PG, Homestays, and Co-Living with property-specific food flags.`, `SearchAction: target /search?locality={search_term_string}`. |
| **BreadcrumbList** | `SeoService::breadcrumbSchema()` | Generates standardized 2-tier and 3-tier position hierarchies for Home, Category Searches, City Landing Pages, and Property Details. |
| **LodgingBusiness** | `SeoService::lodgingBusinessSchema()` | Includes `address`, `aggregateRating` (IS 19000 compliant), and `LocationFeatureSpecification` nodes for property-specific food flags (`Food Provided`, `Breakfast Included`, `Lunch Included`, `Dinner Included`). |
| **FAQPage** | `SeoService::faqSchema()` | Generates `Question` and `acceptedAnswer` nodes for all reconciled category and meal flag queries. |

---

## 9. XML Sitemap & Robots.txt Architecture

### 9.1 XML Sitemap (`/sitemap.xml`)
`App\Services\Seo\SitemapService` generates a valid XML sitemap cached for 3,600 seconds with automated invalidation. The sitemap was updated to include:
- Core static pages (`priority: 1.0` - `0.6`)
- **Canonical category search URLs:**
  - `https://tijum.com/search?category=hostels-pg` (`changefreq: daily`, `priority: 0.9`)
  - `https://tijum.com/search?category=homestays` (`changefreq: daily`, `priority: 0.9`)
  - `https://tijum.com/search?category=co-living` (`changefreq: daily`, `priority: 0.9`)
- City landing pages (`https://tijum.com/hostels-in-{citySlug}`) (`changefreq: daily`, `priority: 0.9`)
- Published CMS pages, blog articles, and verified active property detail pages.

### 9.2 Robots.txt (`/robots.txt`)
Directs search crawlers to index all public categories, cities, blog articles, and properties while disallowing private admin, owner, session, and search pagination crawl waste:
```txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /owner
Disallow: /_dev
Disallow: /settings
Disallow: /dashboard
Disallow: /reservations
Disallow: /search?
Disallow: /api/
Sitemap: https://tijum.com/sitemap.xml
```

---

## 10. Verification Matrix & Quality Sign-Off

### 10.1 Test Coverage
A dedicated test suite was implemented in `tests/Feature/SeoAndMarketing/CategoryConsolidationContentAndRedirectsTest.php` covering:
1. `test_legacy_category_routes_redirect_301_to_canonical_routes`: 15 assertion cases validating 301 status codes and canonical destinations.
2. `test_legacy_city_accommodation_routes_redirect_301_to_canonical_city_routes`: 5 assertion cases across all 4 launch cities.
3. `test_seo_service_schemas_reflect_consolidated_categories_and_food_flags`: Validates Organization, WebSite, and default SEO payload descriptions.
4. `test_sitemap_service_includes_canonical_category_urls`: Validates XML output structure and inclusion of canonical category URLs.
5. `test_public_pages_return_updated_seo_metadata_and_structured_data`: Validates Inertia page props for Home, FAQs, and City landing pages.

### 10.2 Sign-Off Status
- **Marketing Copy & CMS:** Reconciled & Verified ✅
- **Property-Specific Food Flags:** Reconciled & Verified ✅
- **FAQ Knowledge Base:** Reconciled & Verified ✅
- **SEO Metadata & JSON-LD Schemas:** Reconciled & Verified ✅
- **Legacy URL 301 Redirect Engine:** Implemented & Verified ✅
- **XML Sitemap:** Updated & Verified ✅
