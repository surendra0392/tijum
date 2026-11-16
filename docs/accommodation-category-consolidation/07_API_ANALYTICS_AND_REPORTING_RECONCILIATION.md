# TIJUM Platform Accommodation Category Consolidation
## 07. API, Mobile Architecture, Analytics, and Reporting Reconciliation

> **Updated after final category consolidation corrections.**

**Document Version:** 1.1.0  
**Status:** Approved, Reconciled & Hardened ✅  
**Date:** November 14, 2026  
**Author:** Mobile Application Engineering Team (`@mobile-app`)  
**Domain Scope:** React Native / Expo Mobile App (`apps/mobile/`), API V1 Authoritative 58-Route Inventory, Telemetry & Analytics Schemas, BI Reporting Reconciliation  

---

### Table of Contents
1. [Executive Summary & Strategic Objective](#1-executive-summary--strategic-objective)
2. [Canonical Three-Category Architecture](#2-canonical-three-category-architecture)
3. [API V1 Contract Reconciliation](#3-api-v1-contract-reconciliation)
4. [Mobile Application (React Native / Expo) Implementation](#4-mobile-application-react-native--expo-implementation)
5. [Analytics, Telemetry & Event Schema Reconciliation](#5-analytics-telemetry--event-schema-reconciliation)
6. [Business Intelligence (BI) & Financial Reporting Queries](#6-business-intelligence-bi--financial-reporting-queries)
7. [Deep Linking, Push Notifications & Backward Compatibility](#7-deep-linking-push-notifications--backward-compatibility)
8. [Automated Verification, Test Suite & Quality Gates](#8-automated-verification-test-suite--quality-gates)
9. [Release Rollout & Phased Deployment Strategy](#9-release-rollout--phased-deployment-strategy)

---

### 1. Executive Summary & Strategic Objective

TIJUM is South India's premier managed accommodation platform, serving college students, early-career working professionals, families, and remote workers across Hyderabad, Vijayawada, Guntur, and Visakhapatnam. Historically, accommodation categorizations evolved organically across the platform, resulting in ambiguous and fragmented labels including *Independent Hostel*, *PG Accommodation*, *Homestay*, *Coliving*, *Guest Houses*, and *Private Lodges*. This fragmentation degraded customer search precision, introduced confusion regarding food inclusion guarantees, and convoluted financial settlement reporting for property partners.

Under the Platform-Wide Accommodation Category Consolidation Initiative, all properties, search queries, partner listings, analytics events, and reporting pipelines are strictly unified into **exactly three canonical categories**:

1. **Hostels/PG (`hostels-pg`)**: Explore hostel and paying guest accommodation with room options, amenities, and meal arrangements shown for each property.
2. **Homestays (`homestays`)**: Explore accommodation in residential homes, with property details, room options, and available services shown for each property.
3. **Co-Living (`co-living`)**: Explore shared-living accommodation with room options, property details, and available amenities shown for each space.

> **Food & Category Architectural Independence:** In accordance with platform governance, food provision (`food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`) is strictly configured and declared independently at the property and room-tier level. Category classification defines physical accommodation architecture and operating model, but never acts as a blanket or mandatory meal guarantee.

---

### 2. Canonical Three-Category Architecture

#### 2.1 Canonical Category Definition Matrix

| Category Display Name | Canonical Slug | Internal Code | Target Demographic | Core Value Proposition | Food Inclusion Standard | Mobile Icon |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hostels/PG** | `hostels-pg` | `hostel_pg` | Students & young working professionals | Structured rules, shared/private rooms, managed facilities | Property-declared meal schedules and dining packages | `Building2` |
| **Homestays** | `homestays` | `homestay` | Vacationers, families, visiting scholars, remote workers | Host-managed residential property, quiet locales | Property-declared host meals and regional dining options | `Home` |
| **Co-Living** | `co-living` | `coliving` | Tech professionals, digital nomads, modern community seekers | Community spaces, flexible durations, shared amenities | Property-declared community dining and kitchen facilities | `Users` |

#### 2.2 Comprehensive Legacy Normalization Ledger

To guarantee 100% backward compatibility with cached mobile app states, legacy bookmarks, external partner referral links, and historical push notification payloads, the mobile application and API gateways implement an idempotent normalization ledger:

```typescript
export const LEGACY_CATEGORY_MAP: Record<string, CanonicalCategorySlug> = {
  // Hostels & PG legacy variants
  'independent-hostel': 'hostels-pg',
  'pg-accommodation': 'hostels-pg',
  'hostel': 'hostels-pg',
  'hostels': 'hostels-pg',
  'pg': 'hostels-pg',
  'independent_hostel': 'hostels-pg',
  'pg_accommodation': 'hostels-pg',
  'hostels-pg': 'hostels-pg',
  'hostel-pg': 'hostels-pg',
  'paying guest': 'hostels-pg',

  // Homestays legacy variants
  'homestay': 'homestays',
  'homestays': 'homestays',
  'home_stay': 'homestays',
  'home-stay': 'homestays',

  // Co-Living legacy variants
  'co-living': 'co-living',
  'coliving': 'co-living',
  'co_living': 'co-living',
  'shared-living': 'co-living',
  'co-live': 'co-living',
};
```

Any legacy category slug encountered in API responses, query params, or deep links is transparently mapped to its canonical counterpart without interrupting the user journey or failing client rendering.

---

### 3. API V1 Contract Reconciliation

#### 3.1 Public Discovery Endpoints (`/api/v1/public/*`)

##### 3.1.1 Property Search & Filter (`GET /api/v1/public/properties`)

- **Query Parameter Addition:**
  - `category` (optional, string): Accepts canonical slugs (`hostels-pg`, `homestays`, `co-living`) as well as legacy alias slugs.
- **Backend Filter Logic:**
  ```php
  if ($request->filled('category')) {
      $categoryParam = (string) $request->query('category');
      $canonicalSlug = PropertyCategory::normalizeSlug($categoryParam);
      $query->whereHas('category', function ($q) use ($canonicalSlug): void {
          $q->where('slug', $canonicalSlug);
      });
  }
  ```
- **Response Contract (`PropertyCardResource`):**
  Each property card payload explicitly returns the category relationship in standardized JSON:
  ```json
  {
    "id": 104,
    "name": "Srinivasa Executive PG for Men",
    "slug": "srinivasa-executive-pg-men-hyderabad",
    "category": {
      "id": 1,
      "name": "Hostels/PG",
      "slug": "hostels-pg",
      "code": "hostel_pg"
    },
    "city": {
      "id": 1,
      "name": "Hyderabad",
      "slug": "hyderabad"
    },
    "locality": "Madhapur",
    "address_line": "Plot 42, Silicon Valley, Madhapur",
    "starting_price_monthly_paise": 850000,
    "rating_average": 4.8,
    "reviews_count": 34,
    "cover_image_url": "https://images.tijum.com/properties/srinivasa-cover.jpg",
    "food_provided": true,
    "breakfast_included": true,
    "lunch_included": true,
    "dinner_included": true,
    "food_inclusions": {
      "provided": true,
      "breakfast": true,
      "lunch": true,
      "dinner": true
    },
    "included_meals": ["Breakfast", "Lunch", "Dinner"],
    "included_meals_label": "Breakfast • Lunch • Dinner",
    "is_verified": true,
    "booking_eligible": true
  }
  ```

##### 3.1.2 Property Details (`GET /api/v1/public/properties/{slug}`)

- **Response Contract (`PropertyDetailResource`):**
  Includes the full `category` object, the verified `food_inclusions` breakdown, timing policies, and room types configured under the accommodation's canonical category model.

#### 3.2 Customer Reservation Endpoints (`/api/v1/customer/*`)

- `GET /api/v1/customer/reservations`: Returns reservation snapshots. In addition to property name and location, the snapshot preserves the accommodation category at the time of reservation.
- `POST /api/v1/customer/reservations`: Validates booking creation against room type categories without requiring bed allocations (room-based booking model).

#### 3.3 Partner Property Management Endpoints (`/api/v1/owner/*`)

- `GET /api/v1/owner/properties`: Retrieves partner-owned properties with canonical category labels and counts.
- `POST /api/v1/owner/properties` & `PUT /api/v1/owner/properties/{id}`:
  Validates `property_category_id` strictly against active canonical category records:
  ```php
  'property_category_id' => [
      'required',
      'integer',
      Rule::exists('property_categories', 'id')->where('is_active', true)
  ]
  ```

---

### 4. Mobile Application (React Native / Expo) Implementation

The React Native / Expo application located in `apps/mobile/` has been systematically updated to provide a touch-first, high-performance customer and partner experience aligned with the 3 canonical categories.

#### 4.1 Architecture & Modular Files

```
apps/mobile/
├── src/
│   ├── constants/
│   │   └── categories.ts              # Canonical category constants, metadata & normalization
│   ├── api/
│   │   ├── types.ts                   # Strongly typed interfaces & re-exports
│   │   └── public.ts                  # PublicApi.getProperties with category filter
│   ├── components/
│   │   ├── CategoryBadge.tsx          # Reusable high-contrast category badge
│   │   └── PropertyCard.tsx           # Listing card with category-locality header
└── app/
    ├── (customer)/
    │   └── explore/
    │       ├── index.tsx              # Search screen with 4-tab category selector & guarantee banner
    │       └── property/[slug].tsx    # Detail screen with category standard card & meal guarantee
    └── (partner)/
        └── properties/
            └── index.tsx              # Partner properties screen with category filter tabs & counts
```

#### 4.2 Canonical Category Module (`apps/mobile/src/constants/categories.ts`)

- Exposes typed union `CanonicalCategorySlug = 'hostels-pg' | 'homestays' | 'co-living'`.
- Exports immutable `CANONICAL_CATEGORIES` configuration array with visual tokens, descriptions, and meal guarantee labels.
- Provides robust helper functions:
  - `normalizeCategorySlug(slugOrName)`: Returns canonical slug with fuzzy matching for display names.
  - `getCanonicalCategory(slugOrName)`: Returns full metadata object.
  - `getCategoryDisplayName(slugOrName, fallback)`: Returns formatted title ("Hostels/PG", "Homestays", "Co-Living").
  - `isValidCanonicalCategory(slug)`: TypeScript type guard.
  - `getCategoryFoodGuarantee(slugOrName)`: Tailored marketing food guarantee copy.

#### 4.3 Visual Design & Category Badge (`CategoryBadge.tsx`)

A purpose-built mobile component displaying canonical category identity unified under the official TIJUM brand palette:
- **Unified Visual Treatment (All 3 Categories)**: Warm Cream background (`#FFF4EE`), Neutral Surface border (`#E6E0DB`), Deep Plum text and icons (`#442F41`).
- **Semantic Distinction**: Category distinction is conveyed via semantic icons (`Building2` for Hostels/PG, `Home` for Homestays, `Users` for Co-Living), rather than diverging color systems.
- **Strict Color Governance**: Food Emerald (`#10B981`) is restricted exclusively to positive food-inclusion status indicators (`food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`). The unapproved `#065F46` token has been completely removed.
- Supports `size="sm"` for compact card placement and `size="md"` for detail page headers.

#### 4.4 Customer Discovery & Search Screen (`ExploreScreen`)

- **4-Segment Horizontal Category Selector:**
  - *All Stays* (`all`, `Sparkles` icon)
  - *Hostels/PG* (`hostels-pg`, `Building2` icon)
  - *Homestays* (`homestays`, `Home` icon)
  - *Co-Living* (`co-living`, `Users` icon)
- **Active Visual Treatment:**
  Selected category tabs transition to brand-accent filled pills with white text and high-contrast icons.
- **Category Information Banner:**
  Banner renders category narrative and highlights property-level meal transparency:
  - *Hostels/PG*: Explore hostel and paying guest accommodation with room options, amenities, and meal arrangements shown for each property.
  - *Homestays*: Explore accommodation in residential homes, with property details, room options, and available services shown for each property.
  - *Co-Living*: Explore shared-living accommodation with room options, property details, and available amenities shown for each space.
- **Defensive Multi-Tier Filtering:**
  Passes `category: selectedCategory` to `PublicApi.getProperties` while maintaining client-side normalization verification to guarantee no legacy or misclassified items appear.

#### 4.5 Property Detail Screen (`PropertyDetailScreen`)

- Replaces raw uppercase strings with the typed `CategoryBadge`.
- Integrates a **Verified Category Standard Card** beneath the property title explaining the specific accommodation standards and verified meal schedules.
- Connects directly to the booking funnel with room category selection.

#### 4.6 Partner Property Management (`PartnerPropertiesScreen`)

- Implements **Category Filter Tabs** displaying real-time inventory counts:
  - `All (N)`
  - `Hostels/PG (N)`
  - `Homestays (N)`
  - `Co-Living (N)`
- Displays `CategoryBadge` on every partner listing card.
- Provides context-aware empty states when a partner has no properties registered in a specific category.

---

### 5. Analytics, Telemetry & Event Schema Reconciliation

#### 5.1 Telemetry Event Dictionary

To ensure seamless analytics across Segment, Mixpanel, and Google Analytics 4 (GA4), all client and server telemetry events have been consolidated to use the 3 canonical category slugs:

| Event Name | Trigger Location | Payload Parameters | Purpose & BI Utility |
| :--- | :--- | :--- | :--- |
| `explore_category_selected` | Mobile / Web Explore Tab | `category_slug`, `source`, `previous_category`, `device_platform` | Measures top-of-funnel customer category affinity and category switching behavior |
| `search_query_executed` | Search bar submit | `query`, `category_slug`, `city`, `has_ac_filter`, `result_count` | Identifies search intent patterns and unmet demand by category and locality |
| `property_card_clicked` | Explore / Search listing | `property_id`, `property_slug`, `category_slug`, `position_index`, `starting_price` | Tracks CTR from discovery list to property details broken down by category |
| `property_detail_viewed` | Property Screen mount | `property_id`, `category_slug`, `food_provided`, `has_breakfast`, `has_dinner` | Measures detail engagement and food inclusion impact on conversion |
| `booking_flow_initiated` | "Book Stay" button tap | `property_id`, `category_slug`, `room_type_id`, `duration_type` | Measures intent-to-book conversion rate per accommodation category |
| `booking_completed` | Payment confirmed | `booking_reference`, `property_id`, `category_slug`, `total_amount_paise`, `duration_type` | Primary GMV and booking conversion metric categorized by canonical slug |
| `partner_category_filtered` | Partner properties tab | `partner_id`, `selected_category`, `filtered_count`, `total_properties` | Analyzes partner portfolio composition and administrative workflows |

#### 5.2 Legacy Event Telemetry Normalization

During the transition window, incoming events bearing legacy category strings are mapped before ingestion into BigQuery / Snowflake data warehouses:

```sql
-- BigQuery Ingestion Transformer / dbt model: stg_analytics_events.sql
SELECT
  event_id,
  event_name,
  timestamp,
  user_id,
  device_id,
  CASE
    WHEN LOWER(category_param) IN ('independent-hostel', 'pg-accommodation', 'hostel', 'pg', 'independent_hostel', 'pg_accommodation', 'hostels-pg')
      THEN 'hostels-pg'
    WHEN LOWER(category_param) IN ('homestay', 'homestays', 'home_stay', 'home-stay')
      THEN 'homestays'
    WHEN LOWER(category_param) IN ('co-living', 'coliving', 'co_living', 'shared-living')
      THEN 'co-living'
    ELSE 'unknown'
  END AS canonical_category,
  category_param AS raw_category_param,
  properties_payload
FROM `tijum_raw_events.mobile_telemetry_stream`;
```

---

### 6. Business Intelligence (BI) & Financial Reporting Queries

Consolidating accommodation categories enables crystal-clear financial reconciliation and operational reporting. The following canonical queries power TIJUM's executive dashboard.

#### 6.1 Revenue & GMV Distribution by Canonical Category

```sql
-- Monthly GMV, Bookings Count, and Average Booking Value by Canonical Category
SELECT
  pc.slug AS canonical_category,
  pc.name AS category_name,
  COUNT(r.id) AS total_reservations,
  COUNT(DISTINCT r.property_id) AS active_properties,
  ROUND(SUM(r.total_amount_paise) / 100, 2) AS gmv_inr,
  ROUND(AVG(r.total_amount_paise) / 100, 2) AS aov_inr,
  ROUND(SUM(r.commission_amount_paise) / 100, 2) AS platform_revenue_inr
FROM reservations r
JOIN properties p ON r.property_id = p.id
JOIN property_categories pc ON p.property_category_id = pc.id
WHERE r.status IN ('confirmed', 'completed')
  AND r.created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY pc.slug, pc.name
ORDER BY gmv_inr DESC;
```

#### 6.2 Property Occupancy & Average Length of Stay (ALOS)

```sql
-- ALOS and Duration Distribution across Canonical Categories
SELECT
  pc.name AS category_name,
  r.duration_type,
  COUNT(r.id) AS booking_count,
  ROUND(AVG(r.duration_quantity), 1) AS avg_duration_quantity,
  ROUND(AVG(
    DATE_DIFF(DATE(r.check_out_date), DATE(r.check_in_date), DAY)
  ), 1) AS avg_stay_duration_days
FROM reservations r
JOIN properties p ON r.property_id = p.id
JOIN property_categories pc ON p.property_category_id = pc.id
WHERE r.status IN ('confirmed', 'completed')
GROUP BY pc.name, r.duration_type
ORDER BY pc.name, booking_count DESC;
```

#### 6.3 Food Inclusion Satisfaction & Reviews by Category

```sql
-- Food Inclusions vs Rating Distribution by Category
SELECT
  pc.name AS category_name,
  p.food_provided,
  COUNT(DISTINCT p.id) AS property_count,
  ROUND(AVG(rs.average_rating), 2) AS average_guest_rating,
  SUM(rs.published_review_count) AS total_reviews_recorded
FROM properties p
JOIN property_categories pc ON p.property_category_id = pc.id
LEFT JOIN property_rating_summaries rs ON p.id = rs.property_id
WHERE p.status = 'active'
GROUP BY pc.name, p.food_provided
ORDER BY pc.name, p.food_provided DESC;
```

---

### 7. Deep Linking, Push Notifications & Backward Compatibility

#### 7.1 Deep Link Routing & ReDoS-Protected Sanitization

The mobile application utilizes `apps/mobile/src/utils/deepLinkSanitizer.ts` to inspect all incoming universal links (`https://tijum.com/*`) and custom scheme intents (`tijum://*`).

Category query parameters embedded in deep links are automatically routed through `normalizeCategorySlug`:

- `tijum://explore?category=hostels-pg` → Navigates to Explore screen with `Hostels/PG` pre-selected.
- `tijum://explore?category=independent-hostel` → Transparently normalizes to `hostels-pg`.
- `https://tijum.com/categories/coliving` → Deep links into Explore screen with `Co-Living` active.
- `tijum://properties/{slug}` → Navigates directly to Property Detail screen, rendering the canonical category badge.

#### 7.2 Push Notification Payload Schema

Push notifications generated via Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNs) utilize canonical category attributes in notification data dictionaries:

```json
{
  "to": "device_fcm_token_xyz",
  "notification": {
    "title": "New Verified Homestay in Visakhapatnam",
    "body": "Sea-view authentic homestay with coastal breakfast included is now live."
  },
  "data": {
    "action": "view_property",
    "property_slug": "vizag-beachfront-heritage-homestay",
    "category": "homestays",
    "click_action": "FLUTTER_NOTIFICATION_CLICK"
  }
}
```

The notification handler parses `data.category`, passing it through `normalizeCategorySlug` to ensure deep link integrity.

---

### 8. Automated Verification, Test Suite & Quality Gates

The mobile application codebase enforces automated verification through unit test suites, TypeScript type checks, and dependency audit checks.

#### 8.1 Automated Test Execution Summary

The dedicated test suite `apps/mobile/__tests__/categoryConsolidation.test.ts` validates category consolidation across six testing groups:

1. **Canonical Categories Definition & Integrity:**
   - Validates that `CANONICAL_CATEGORIES` contains strictly 3 records.
   - Enforces exact slugs (`hostels-pg`, `homestays`, `co-living`), names, and internal codes (`hostel_pg`, `homestay`, `coliving`).
   - Asserts non-empty neutral descriptions, accent colors, and icons (`Building2`, `Home`, `Users`).
2. **Type Guard Validation (`isValidCanonicalCategory`):**
   - Asserts `true` strictly for canonical slugs and `false` for legacy slugs, invalid strings, numbers, and null values.
3. **Legacy Category Normalization:**
   - Validates multi-variant normalization for Hostels/PG (`independent-hostel`, `pg-accommodation`, `hostels`, `paying guest`).
   - Validates Homestays normalization (`homestay`, `home_stay`, `Home Stay`).
   - Validates Co-Living normalization (`co-living`, `coliving`, `shared-living`).
   - Confirms graceful rejection (`null`) for unsupported accommodation types (`hotel`, `lodge`, `resort`, `motel`).
4. **Category Record & Display Name Helpers:**
   - Tests `getCanonicalCategory` retrieval for both canonical and legacy inputs.
   - Tests `getCategoryDisplayName` with fallback support.
   - Verifies neutral meal arrangement copy per category.
5. **Property Category Filtering & Inventory Aggregation:**
   - Tests multi-category property filtering.
   - Verifies partner property count aggregation.
6. **Food & Category Independence Scenarios:**
   - Verifies that any canonical category can host properties with or without food provision (`food_provided: true/false`).
   - Confirms independent filtering by meal inclusion flags (`breakfast`, `lunch`, `dinner`) without mutating category classification.

#### 8.2 Execution Results

```text
> tijum-mobile@1.0.0 test
> node --experimental-strip-types --test __tests__/*.test.ts

▶ Accommodation Category Consolidation - Mobile Application
  ▶ Canonical Categories Definition & Integrity
    ✔ defines strictly 3 canonical categories (1.58ms)
    ✔ enforces exact canonical slugs and names (2.12ms)
    ✔ defines distinct icons, accent colors, and food guarantees for each category (0.62ms)
  ✔ Canonical Categories Definition & Integrity (6.14ms)
  ▶ Type Guard: isValidCanonicalCategory
    ✔ returns true strictly for the 3 canonical slugs (0.51ms)
    ✔ returns false for legacy or invalid category slugs (0.28ms)
  ✔ Type Guard: isValidCanonicalCategory (1.27ms)
  ▶ Legacy Category Normalization
    ✔ normalizes legacy Hostel & PG slugs to hostels-pg (0.73ms)
    ✔ normalizes legacy Homestay slugs to homestays (0.38ms)
    ✔ normalizes legacy Co-Living slugs to co-living (0.35ms)
    ✔ safely rejects unknown or invalid inputs (0.29ms)
  ✔ Legacy Category Normalization (2.45ms)
  ▶ Category Record & Display Name Helpers
    ✔ resolves canonical category records for both canonical and legacy slugs (0.98ms)
    ✔ formats correct user-facing display names with fallback (0.50ms)
    ✔ returns neutral food arrangement copy by category (0.74ms)
  ✔ Category Record & Display Name Helpers (2.93ms)
  ▶ Property Category Filtering & Aggregation
    ✔ filters properties accurately into the 3 canonical categories (0.49ms)
    ✔ correctly aggregates property counts by category for partner tabs (0.23ms)
  ✔ Property Category Filtering & Aggregation (1.01ms)
  ▶ Food & Category Independence Scenarios
    ✔ verifies that any canonical category can exist with or without food inclusions (0.34ms)
    ✔ filters independently by meal flags without altering category classification (0.23ms)
  ✔ Food & Category Independence Scenarios (1.21ms)
✔ Accommodation Category Consolidation - Mobile Application (16.97ms)

▶ Deep Link Sanitizer & ReDoS Protection (8.78ms)
▶ Phase 21B Closure Item 04: Mobile Session Revocation Security & Failure Recovery (23.84ms)

ℹ tests 39
ℹ suites 9
ℹ pass 39
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 350.58ms
```

#### 8.3 TypeScript Strict Typecheck Gate

```bash
$ npm run types:check --prefix apps/mobile
> tijum-mobile@1.0.0 types:check
> tsc --noEmit
# Exit code: 0 (Zero type errors)
```

---

### 9. Release Rollout & Phased Deployment Strategy

#### 9.1 Phased Timeline

| Phase | Milestone | Execution Scope | Rollback Mechanism |
| :--- | :--- | :--- | :--- |
| **Phase 1: DB & API Migration** | Forward-only database migration + legacy alias resolution | Backend database seeder, migration, and API V1 resource normalization | Revert to previous seeder via rollback script |
| **Phase 2: Mobile OTA Update** | Expo Updates (OTA) deployment to active app installations | Shipping updated `categories.ts`, `CategoryBadge`, and filter logic | Rollback to previous OTA runtime channel |
| **Phase 3: Telemetry Stream Alignment** | BigQuery dbt model execution and dashboard metric switch | Updating warehouse ETL scripts to group by canonical categories | Dual-run reporting with raw category fallback |
| **Phase 4: Store App Submissions** | Google Play Store & Apple App Store binary releases (v1.1.0) | Full native bundle with compiled assets and updated metadata | Phased rollout (10% -> 25% -> 50% -> 100%) |

#### 9.2 Verification Sign-Off Checklist

- [x] Canonical category constants configured strictly for 3 categories (`hostels-pg`, `homestays`, `co-living`).
- [x] Legacy category slug normalization ledger implemented and covered with unit tests.
- [x] Customer Explore search bar with 4-tab category selector bar (`All`, `Hostels/PG`, `Homestays`, `Co-Living`).
- [x] Property listing cards featuring prominent `CategoryBadge` in header locality row.
- [x] Property detail screen featuring category standard card and verified food guarantee.
- [x] Partner property management screen with multi-category inventory filter and property counts.
- [x] API V1 Public and Owner endpoint contracts synchronized with canonical category schema.
- [x] Analytics and telemetry event schemas documented and mapped for BI reporting.
- [x] All 39 automated tests passing in `apps/mobile/`.
- [x] TypeScript verification passing with zero errors (`tsc --noEmit`).

---
*End of Document 07 — API, Mobile Architecture, Analytics, and Reporting Reconciliation.*
