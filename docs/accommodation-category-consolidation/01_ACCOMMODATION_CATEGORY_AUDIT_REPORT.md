# Platform-Wide Accommodation Category Audit Report

> **Updated after final category consolidation corrections.**

**Document Reference:** `DOC-ACC-CAT-01`  
**Phase:** Accommodation Category Consolidation  
**Author:** Platform Auditor (`@auditor`)  
**Status:** Complete  
**Date:** November 14, 2026  
**Audience:** Platform Architects, Engineering Swarm (`@backend-db`, `@web-ui`, `@mobile-app`, `@coordinator`)

---

## 1. Executive Summary & Problem Statement

### 1.1 Context
TIJUM is a food-inclusive accommodation marketplace purpose-built for South Indian university and commercial hubs (launching across Hyderabad, Guntur, Vijayawada, and Visakhapatnam). The platform's foundational value proposition is straightforward: **Every bookable accommodation package guarantees fresh, wholesome meals (breakfast, lunch, and/or dinner) with transparent daily, weekly, or monthly pricing and zero broker fees.**

As the platform has matured through rapid architectural phases (Phase 00 through Phase 21b, native mobile client development, website redesign, and booking architecture correction), a structural discrepancy in accommodation taxonomy emerged across engineering layers:

1. **Relational Database (`property_categories`):** Contains three historical records:
   - `id: 1` — `Independent Hostel` (`code: hostel`, `slug: independent-hostel`)
   - `id: 2` — `PG Accommodation` (`code: pg`, `slug: pg-accommodation`)
   - `id: 3` — `Homestay` (`code: homestay`, `slug: homestay`)
   *Note: Database lacks any representation of `Co-Living`, while separating Independent Hostels and PGs into distinct operational models.*
2. **Web Client (`resources/js/data/public-content.ts` & UI):** Advertises three categories with pluralized identifiers:
   - `hostels` — "Independent Hostels"
   - `pg` — "PG Accommodation"
   - `homestays` — "Homestays"
3. **Mobile Client (`apps/mobile/src/constants/categories.ts`):** Advanced ahead of the backend, establishing a 3-category canonical schema:
   - `hostels-pg` — "Hostels/PG" (`code: hostel_pg`)
   - `homestays` — "Homestays" (`code: homestay`)
   - `co-living` — "Co-Living" (`code: coliving`)
   *Because the backend lacked `hostels-pg` and `co-living`, the mobile client was forced to implement client-side normalization shims and local memory filtering.*
4. **API Layer (`/api/v1`):** Completely omitted category filtering on `GET /api/v1/public/properties`, lacked a dedicated `GET /api/v1/public/categories` endpoint, and omitted category metadata from `GET /api/v1/public/config`.
5. **Legacy & Ambiguous Terminology:** Scattered references to "hotels", "lodges", and "guest houses" persist in financial tax forms (`registered_hotelier`), customer support grievance tickets ("Lodge a Grievance"), and public FAQ disclaimers.

### 1.2 Purpose of This Audit
This audit establishes an exhaustive inventory of all category definitions, database schemas, foreign keys, historical reservation snapshots, verification workflows, content assets, search services, API contracts, web components, and mobile implementations. It isolates all legacy anomalies, presents an empirical distribution count of properties, and constructs a canonical mapping ledger that unifies the platform under **three unambiguous accommodation categories**.

---

## 2. Platform Category Audit by Architectural Layer

### 2.1 Database & Relational Schema Layer

#### A. Table: `property_categories`
Created in migration `2026_11_11_191258_create_property_categories_table.php`.

```sql
CREATE TABLE `property_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pc_slug_unique` (`slug`),
  UNIQUE KEY `pc_code_unique` (`code`),
  KEY `pc_is_active_idx` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Live Records in Active MySQL Database (`tijum` & `tijum_test`):**

| ID | Name | Slug | Code | Description | Is Active | Sort Order |
|:---|:---|:---|:---|:---|:---:|:---:|
| `1` | Independent Hostel | `independent-hostel` | `hostel` | Student and working-professional shared/private accommodation offering regular home-style meals and structured house rules. | `1` | `1` |
| `2` | PG Accommodation | `pg-accommodation` | `pg` | Paying guest stays providing managed shared or single-occupancy rooms with mandatory daily food packages. | `1` | `2` |
| `3` | Homestay | `homestay` | `homestay` | Warm host-managed residential accommodation with authentic regional dining included for short, weekly, and monthly guests. | `1` | `3` |

#### B. Table: `properties`
Created in migration `2026_11_11_191259_create_properties_table.php`.
- **Column:** `property_category_id` (`bigint unsigned NOT NULL`)
- **Foreign Key:** `FOREIGN KEY (property_category_id) REFERENCES property_categories (id) ON DELETE RESTRICT` (index name: `prop_category_id_fk`)
- **Category Reference in Snapshot:** `properties.approved_snapshot` stores `property_category_id` and `category_name` at time of admin verification.
- **Nullability:** Strict `NOT NULL`. No orphan or null category properties can exist in the relational schema.

#### C. Database Property Distribution Audit

Live query executed across development (`tijum`) and testing (`tijum_test`) databases:

```sql
SELECT pc.id, pc.name, pc.slug, pc.code, COUNT(p.id) as property_count
FROM property_categories pc
LEFT JOIN properties p ON p.property_category_id = pc.id
GROUP BY pc.id, pc.name, pc.slug, pc.code
ORDER BY pc.id;
```

**Audit Count Results:**

| Database Environment | Category ID | Category Name | Slug | Code | Assigned Properties | Orphan/NULL Count |
|:---|:---:|:---|:---|:---|:---:|:---:|
| **MySQL `tijum` (Development)** | `1` | Independent Hostel | `independent-hostel` | `hostel` | `0` | `0` |
| | `2` | PG Accommodation | `pg-accommodation` | `pg` | `0` | `0` |
| | `3` | Homestay | `homestay` | `homestay` | `0` | `0` |
| **MySQL `tijum_test` (Test Suite)** | `1` | Independent Hostel | `independent-hostel` | `hostel` | `0` (transient) | `0` |
| | `2` | PG Accommodation | `pg-accommodation` | `pg` | `0` (transient) | `0` |
| | `3` | Homestay | `homestay` | `homestay` | `0` (transient) | `0` |

*Findings:*
- The live baseline database currently contains zero production/demo properties.
- In test environments (`tijum_test`), tests use `Database\Factories\PropertyFactory` which defaults to:
  ```php
  'property_category_id' => static fn (): int => PropertyCategory::query()->where('slug', 'pg-accommodation')->value('id')
      ?? PropertyCategory::factory()->create()->id,
  ```
- Because there are zero production listings currently locked into `independent-hostel` or `pg-accommodation`, this represents an ideal, zero-risk window for executing clean database consolidation into canonical structures without complex historical property table backfills.

---

### 2.2 Seeders & Lifecycle Initializers

1. **`Database\Seeders\PropertyCategorySeeder`:**
   - Runs during `php artisan db:seed`.
   - Uses `DB::table('property_categories')->upsert()` keyed on `['slug']`.
   - Re-seeds the 3 historical records: `independent-hostel`, `pg-accommodation`, and `homestay`.
   - **Gap:** Completely lacks `co-living`. Does not use the consolidated `hostels-pg` slug.

2. **`Database\Seeders\DatabaseSeeder`:**
   - Calls `PropertyCategorySeeder::class`, `CitySeeder::class`, and `AmenityCatalogueSeeder::class`.
   - Execution order is correct (categories must seed before properties can be created).

3. **`Database\Seeders\Phase19ContentSeeder`:**
   - Seeds blog categories (`Food & Nutrition`, `Hostel Living`, `City Relocation`) and marketing banners.
   - Blog category slugs use `hostel-living`, which aligns with student and professional living, but does not interfere with `property_categories`.

---

### 2.3 Reservation Snapshots & Historical Audit Trail

#### A. Schema & Column Audit
In migration `2026_11_12_095822_create_reservations_table.php`, the reservation ledger records point-in-time snapshots:

```sql
`snapshot_property_name` varchar(150) NOT NULL,
`snapshot_property_locality` varchar(100) DEFAULT NULL,
`snapshot_property_city` varchar(100) DEFAULT NULL,
`snapshot_property_state` varchar(100) DEFAULT NULL,
`snapshot_property_country_code` varchar(8) DEFAULT NULL,
`snapshot_category_name` varchar(100) DEFAULT NULL,
`snapshot_room_type_name` varchar(150) NOT NULL,
```

#### B. Creation & Relocation Snapshot Logic
1. **`App\Actions\Reservations\CreateReservation` (Line 234):**
   ```php
   'snapshot_category_name' => $property->category?->name,
   ```
2. **`App\Actions\Protection\ProcessRelocationDecision` (Line 138):**
   ```php
   'snapshot_category_name' => $destinationProperty->category?->name,
   ```
3. **`App\Services\ReservationData` (Line 92):**
   ```php
   'property_category' => $reservation->snapshot_category_name ?? 'Accommodation',
   ```

#### C. Historical Audit Trail Immutability Rule
> **CRITICAL ARCHITECTURAL DIRECTIVE:**
> The `snapshot_category_name` column in `reservations` is an immutable legal record of the customer's contract at check-in. Under no circumstances should existing rows in `reservations` be updated or rewritten during category consolidation migrations. If an old reservation captured `"Independent Hostel"` or `"PG Accommodation"`, it must remain preserved as historical truth.

---

### 2.4 Property Verification & Admin Approval Workflows

1. **`App\Models\Property::toApprovedPropertyFieldsSnapshot()` (Lines 247–249):**
   ```php
   return [
       'property_category_id' => $this->property_category_id,
       'category_name' => $this->category?->name,
       ...
   ];
   ```
2. **`App\Actions\Admin\Properties\ApprovePropertyApplication` (Lines 215–231):**
   Serializes the property snapshot into the verification application's `approved_snapshot` JSON column.
3. **Form Request Validation (`StoreOrUpdatePropertyRequest`):**
   ```php
   'property_category_id' => [
       'required',
       'integer',
       Rule::exists('property_categories', 'id')->where('is_active', true),
   ],
   ```
   *Note:* The request validation enforces active relational foreign keys. When canonical categories are seeded with `is_active: true`, any deprecated category can be marked `is_active: false` without breaking foreign key referential integrity on older properties.

---

### 2.5 Content, Marketing, & Public Editorial Records

| Asset / File | Current Reference | Issue / Observation | Recommended Remediation |
|:---|:---|:---|:---|
| `resources/js/data/public-content.ts` (L205–278) | `id: 'hostels'`, `id: 'pg'`, `id: 'homestays'` | Three categories defined with plural IDs (`hostels`, `pg`), missing Co-Living. | Consolidate to `hostels-pg`, `homestays`, `co-living`. Update title to "Hostels & PGs". Add Co-Living card. |
| `resources/js/data/public-content.ts` (L584–586) | "Are hotels or serviced apartments offered? Not in Phase 1..." | Explicitly mentions hotels/apartments in FAQ to clarify TIJUM's focus. | Retain as policy clarification, but reference canonical categories: Hostels/PG, Homestays, and Co-Living. |
| `resources/js/components/public/accommodation-categories.tsx` | Maps over `ACCOMMODATION_CATEGORIES` | Grid layout designed for 3 categories (1 large 7-col + 2 stacked 5-col). | Perfect fit for the 3 canonical categories (`hostels-pg`, `homestays`, `co-living`). |
| `resources/js/pages/public/about.tsx` (L77–81) | "Conventional booking sites focus largely on room-only hotels..." | Mentions "hotels" strictly to contrast against TIJUM's food-inclusive residential model. | Keep unchanged. Accurately reinforces brand positioning. |
| `resources/js/pages/welcome.tsx` | "Discover affordable hostels, PG accommodation, and homestays..." | SEO meta description references legacy 3 terms. | Update to "Discover affordable hostels, PG accommodation, homestays, and co-living stays with meals included." |
| `Phase19ContentSeeder.php` | About page content blocks, banners | Mentions "food-inclusive hostels, PG accommodations, and homestays". | Add "co-living" to platform description in content blocks and hero banners. |

---

### 2.6 Routes, Controllers, & API Contracts

#### A. Route Audit
- **Web Routes (`routes/web.php`):**
  - `GET /` (`welcome.tsx`)
  - `GET /search` (`Public\SearchController@index`)
  - `GET /properties/{slug}` (`Public\PropertyController@show`)
- **Owner Routes (`routes/owner.php`):**
  - `GET /owner/properties` (`Owner\Properties\PropertyController@index`)
  - `GET /owner/properties/create` (`create.tsx`)
  - `POST /owner/properties` (`PropertyController@store`)
- **Admin Routes (`routes/admin.php`):**
  - `GET /admin/properties` (`Admin\Properties\AdminPropertyController@index`)
  - `GET /admin/dashboard` (`Admin\DashboardController@index`)
- **API V1 Routes (`routes/api.php`):**
  - `GET /api/v1/public/config` (`PublicConfigController`)
  - `GET /api/v1/public/cities` (`PublicCityController@index`)
  - `GET /api/v1/public/properties` (`PublicPropertyController@index`)
  - `GET /api/v1/public/properties/{slug}` (`PublicPropertyController@show`)

#### B. API V1 Gaps Identified
1. **Missing Category Filtering on Public Properties Endpoint:**
   In `App\Http\Controllers\Api\V1\Public\PublicPropertyController::index()`, the controller filters by `city`, `locality`, `breakfast`, `lunch`, `dinner`, `ac`, `gender`, `min_price`, and `max_price`. **It completely fails to inspect or query `$request->query('category')`.**
2. **Missing Category Metadata Endpoint:**
   While `/api/v1/public/cities` exists, there is no `/api/v1/public/categories` route. Mobile clients must either hardcode categories or inspect them indirectly.
3. **Missing Category Payload in `PublicConfigController`:**
   `/api/v1/public/config` returns `launch_cities`, `timing_policy`, and `brand`, but omits `categories`.
4. **Input Type Discrepancy:**
   - Web Search (`PropertySearchRequest`) requires an array of integer IDs: `'category' => ['nullable', 'array']`, `'category.*' => ['integer']`.
   - Mobile Client (`apps/mobile/src/api/public.ts`) sends a string slug: `category: 'hostels-pg'`.
   - The backend must accept both integer IDs and canonical category slug strings.

---

### 2.7 Admin & Owner Portals

1. **Owner Property Form (`resources/js/components/owner/properties/property-form.tsx`):**
   - Renders category selection via `<Select name="property_category_id">`.
   - Receives options dynamically from `$categories = PropertyCategory::query()->active()->ordered()->get()`.
   - If the database is updated to canonical categories, the owner dropdown updates automatically without hardcoded frontend changes.
2. **Owner Financial Registration (`resources/js/pages/owner/financial/index.tsx` L276–280):**
   - Presents legal classification dropdown:
     - `unregistered_hostel` ("Unregistered Hostel / PG Operator")
     - `registered_hotelier` ("GST Registered Accommodation Provider")
     - `homestay_individual` ("Individual Homestay Host")
   - *Audit Finding:* `registered_hotelier` is used here purely as a GST tax categorization for operators registered under hotel/commercial hospitality GST codes. It does **not** signify that TIJUM lists traditional commercial hotels.
3. **Admin Property Verification & Dashboard:**
   - `AdminPropertyController::index()` filters properties by category slug:
     ```php
     if ($categoryFilter !== '') {
         $query->whereHas('category', static fn (Builder $q) => $q->where('slug', $categoryFilter));
     }
     ```
   - `AdminDashboardMetricsService::trend()` filters by `$categoryId`:
     ```php
     if ($categoryId !== null) {
         $pq->where('property_category_id', $categoryId);
     }
     ```
   - Both controllers dynamically query `PropertyCategory::query()`. No hardcoded slug assumptions exist in backend admin logic.

---

### 2.8 Mobile App Implementation (`apps/mobile/`)

The mobile application already pioneered the 3-category architecture in `apps/mobile/src/constants/categories.ts`:

```typescript
export type CanonicalCategorySlug = 'hostels-pg' | 'homestays' | 'co-living';
export type CanonicalCategoryCode = 'hostel_pg' | 'homestay' | 'coliving';
```

#### A. Mobile Constants & Normalization Engine
- `CANONICAL_CATEGORIES`: Defines `hostels-pg`, `homestays`, and `co-living`. (Note: Previous usage of unapproved accent color `#065F46` for Homestays has been remediated; all category badges are unified under the official TIJUM brand palette with Deep Plum `#442F41`, and Food Emerald `#10B981` strictly reserved for positive food-inclusion indicators).
- `LEGACY_CATEGORY_MAP`: Maps historical slugs (`independent-hostel`, `pg-accommodation`, `hostel`, `pg`, `home_stay`, `coliving`) into the 3 canonical slugs.
- `normalizeCategorySlug()`: Type-safe normalizer with fuzzy matching for display names.

#### B. Mobile UI Components
- `CategoryBadge.tsx`: Displays high-contrast pills with dedicated Lucide icons (`Building2` for Hostels/PG, `Home` for Homestays, `Users` for Co-Living).
- `PropertyCard.tsx`: Integrates `CategoryBadge` in every listing card.
- `explore/index.tsx`: Horizontal category selector bar (`All`, `Hostels/PG`, `Homestays`, `Co-Living`).
- `explore/property/[slug].tsx`: Displays a "Verified Standard" card explaining food guarantee terms based on category.

#### C. Mobile Workaround in Place
Because `/api/v1/public/properties` does not filter by category on the server, `apps/mobile/app/(customer)/explore/index.tsx` (Lines 112–118) executes a client-side filter:

```typescript
if (selectedCategory !== 'all') {
  list = list.filter((p) => {
    const rawCat = p.category?.slug || p.category?.name;
    const normalized = normalizeCategorySlug(rawCat);
    return normalized === selectedCategory;
  });
}
```
*Audit Finding:* Once `@backend-db` updates the API to filter by canonical category slug on the server, this client-side workaround can be converted into standard server-side pagination.

---

## 3. Ambiguous Legacy Records & Local Hospitality Terminology

In South Indian tier-1 and tier-2 markets (Andhra Pradesh & Telangana), property operators frequently register or market their accommodations using blended, colloquial, or legacy commercial terms. The table below audits these ambiguous terms against TIJUM's operational criteria:

### 3.1 Terminology Breakdown & Operational Reality

| Ambiguous Term | Local Usage Context (Hyderabad, Guntur, Vijayawada, Vizag) | Why It Causes Ambiguity on TIJUM | Operational Reality on TIJUM | Canonical Destination |
|:---|:---|:---|:---|:---|
| **"Hotel" / "Hotels"** | Used by legacy commercial lodges or roadside establishments (e.g., "Sri Krishna Hotel & Boarding"). Also used in GST tax profiles (`registered_hotelier`). | Traditional hotels sell room-only bookings without meals. Guests might expect 24/7 bell service, room service, or hourly bookings, which violates TIJUM's food-inclusive monthly/weekly model. | TIJUM does **not** allow pure room-only commercial hotels. If a property with "Hotel" in its trade name is actually a long-term student/work hostel with mandatory meal plans, it must be verified under its real operational model. | **`hostels-pg`** (if student/professional hostel) or **Rejection** (if room-only commercial hotel) |
| **"Lodge" / "Lodges"** | Widely used across Andhra Pradesh (e.g., Brodipet/Arundalpet in Guntur, Railway Station Rd in Vijayawada) for budget multi-bed accommodations. | "Lodge" often implies transient daily travellers without structured home-cooked meal schedules. | Properties operating as lodges with daily/weekly food packages for coaching students or working professionals operate identically to Hostels/PGs. | **`hostels-pg`** |
| **"Guest House" / "Guesthouse"** | Common in residential quarters (e.g., Banjara Hills, Jubilee Hills in Hyderabad; MVP Colony in Vizag). | Can refer to either an owner-occupied family residence or a fully leased commercial building with independent units. | If hosted by an individual homeowner in a private residence, it is a Homestay. If operated with dedicated kitchen staff and multiple guest suites, it is Co-Living or Hostel/PG. | **`homestays`** (host-managed) or **`co-living`** (shared community) |
| **"Serviced Apartment"** | Multi-bedroom apartment leased on short/medium terms, often with a kitchenette. | May offer self-catering rather than prepared dining, conflicting with TIJUM's core food guarantee. | If offering scheduled community dining, housekeeping, and premium amenities, it matches the Co-Living standard. | **`co-living`** |
| **"Resort" / "Tourist Home"** | Leisure-oriented destinations outside city centers. | Incompatible with student, coaching aspirant, and young professional residential focus. | Not supported on TIJUM. | **Reject / Out of Scope** |

### 3.2 Platform Verification Intake Rule
> **POLICY RECOMMENDATION FOR PARTNER ONBOARDING:**  
> During partner property onboarding:
> 1. Properties whose trade name contains "Hotel" or "Lodge" must complete a mandatory operational questionnaire confirming they provide daily home-style meals and cater to student/working-professional/residential guests.
> 2. Property listings with room-only rates or zero meal plans must be strictly rejected during admin verification.
> 3. Display category labels will strictly present only the canonical names (`Hostels/PG`, `Homestays`, or `Co-Living`), never "Hotel" or "Lodge".

---

## 4. Master Legacy-to-Canonical Mapping Ledger

The ledger below defines the authoritative mapping rules from every existing legacy identifier, code, and UI variant to the canonical architecture:

| Legacy Identifier / Variant | Source Architectural Layer | Canonical Category Name | Canonical Slug | Canonical Code | Visual Badge Variant | Action Required |
|:---|:---|:---|:---|:---|:---:|:---|
| `independent-hostel` | Database (`property_categories.slug`) | Hostels/PG | `hostels-pg` | `hostel_pg` | `primary` | Migrate DB slug & code. Keep alias in resolver. |
| `pg-accommodation` | Database (`property_categories.slug`) | Hostels/PG | `hostels-pg` | `hostel_pg` | `primary` | Consolidate into `hostels-pg`. Keep alias in resolver. |
| `hostel` | Database code / Web param | Hostels/PG | `hostels-pg` | `hostel_pg` | `primary` | Map to `hostels-pg`. |
| `pg` | Database code / Web ID | Hostels/PG | `hostels-pg` | `hostel_pg` | `primary` | Map to `hostels-pg`. |
| `hostels` | Web UI (`public-content.ts`) | Hostels/PG | `hostels-pg` | `hostel_pg` | `primary` | Update frontend constant to `hostels-pg`. |
| `homestay` | Database (`property_categories.slug`) | Homestays | `homestays` | `homestay` | `emerald` | Harmonize singular `homestay` slug to plural `homestays`. |
| `homestays` | Web UI & Mobile | Homestays | `homestays` | `homestay` | `emerald` | Already canonical in UI; align DB slug. |
| `home_stay` / `home-stay` | Legacy input variations | Homestays | `homestays` | `homestay` | `emerald` | Handled by normalization resolver. |
| *(None in DB)* | Database (`property_categories`) | Co-Living | `co-living` | `coliving` | `accent` | **Insert new row** into `property_categories`. |
| `co-living` | Mobile app | Co-Living | `co-living` | `coliving` | `accent` | Preserve as canonical across all layers. |
| `coliving` / `co_living` | Search query variation | Co-Living | `co-living` | `coliving` | `accent` | Map to `co-living`. |
| `registered_hotelier` | Owner Financial Profile | *(Tax entity type only)* | `hostels-pg` | `hostel_pg` | `primary` | Keep as GST classification; map property to `hostels-pg`. |
| `unregistered_hostel` | Owner Financial Profile | *(Tax entity type only)* | `hostels-pg` | `hostel_pg` | `primary` | Keep as GST classification; map property to `hostels-pg`. |
| `homestay_individual` | Owner Financial Profile | *(Tax entity type only)* | `homestays` | `homestay` | `emerald` | Keep as GST classification; map property to `homestays`. |

---

## 5. Architectural Defect Register & Gaps

| ID | Component | Severity | Defect Description | Remediation Target |
|:---:|:---|:---:|:---|:---|
| **GAP-01** | Database (`property_categories`) | **High** | Missing `co-living` category record in database; separate rows for `independent-hostel` and `pg-accommodation`. | `@backend-db`: Migration & seeder updating to 3 canonical records: `hostels-pg`, `homestays`, `co-living`. |
| **GAP-02** | API (`PublicPropertyController`) | **High** | `GET /api/v1/public/properties` ignores `?category=` filter query parameter. | `@backend-db`: Add category filtering supporting canonical slug or ID. |
| **GAP-03** | API (`PublicConfigController` & Routes) | **Medium** | Missing `GET /api/v1/public/categories` endpoint; `/api/v1/public/config` omits category list. | `@backend-db`: Expose dedicated categories route and enrich config payload. |
| **GAP-04** | Web UI (`public-content.ts`) | **Medium** | Category identifiers use `hostels`, `pg`, `homestays`, missing `co-living`. | `@web-ui`: Update dataset to `hostels-pg`, `homestays`, `co-living` with matching cards. |
| **GAP-05** | Web Search (`PropertySearchRequest`) | **Medium** | Requires array of integer IDs only; rejects slug strings. | `@backend-db` / `@web-ui`: Accept either integer IDs or canonical slug strings. |
| **GAP-06** | Test Suite (`PropertyCategoryTest`) | **Low** | Test asserts exact legacy slugs `['independent-hostel', 'pg-accommodation', 'homestay']`. | `@backend-db`: Update test assertions to match canonical slugs. |

---

## 6. Audit Conclusion & Next Steps

The platform is in an exceptional position to complete category consolidation cleanly:
1. Zero production properties are locked into obsolete category IDs.
2. The mobile client has already field-tested and validated the 3-category taxonomy.
3. The database migration can be executed idempotently with backward-compatible slug resolution.

The complete architectural blueprint, specifications, and execution plans are established in `docs/accommodation-category-consolidation/02_CANONICAL_ACCOMMODATION_CATEGORY_ARCHITECTURE.md`.
