# Canonical Accommodation Category Architecture Specification

> **Updated after final category consolidation corrections.**

**Document Reference:** `DOC-ACC-CAT-02`  
**Phase:** Accommodation Category Consolidation  
**Author:** Platform Auditor (`@auditor`)  
**Status:** Canonical Architecture Specification (Hardened & Unified)  
**Date:** November 14, 2026  
**Audience:** Platform Architects, Engineering Swarm (`@backend-db`, `@web-ui`, `@mobile-app`, `@coordinator`)

---

## 1. Architectural Vision & Scope

TIJUM is the dedicated food-inclusive accommodation marketplace for South Indian university and metropolitan centers. Every accommodation listed on the platform is required to configure its meal options clearly using independent property-level food flags (`food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`) with transparent daily, weekly, or monthly rates.

To eliminate historical taxonomy fragmentation between relational database records, web marketing components, mobile client constants, and API endpoints, this specification defines the **Three Canonical Accommodation Categories** for the entire TIJUM ecosystem.

```
+-----------------------------------------------------------------------------------+
|                        TIJUM CANONICAL ACCOMMODATION TAXONOMY                      |
+--------------------------+----------------------------+---------------------------+
|       HOSTELS / PG       |         HOMESTAYS          |         CO-LIVING         |
|  Slug: hostels-pg        |  Slug: homestays           |  Slug: co-living          |
|  Code: hostel_pg         |  Code: homestay            |  Code: coliving           |
|  Icon: Building2         |  Icon: Home                |  Icon: Users              |
|  Identity: Deep Plum     |  Identity: Deep Plum       |  Identity: Deep Plum      |
|  Surface: Cream / Neutral|  Surface: Cream / Neutral  |  Surface: Cream / Neutral |
+--------------------------+----------------------------+---------------------------+
| Room options, amenities  | Residential home stays     | Shared-living spaces with |
| and meal arrangements    | with property details and  | room options & amenities  |
| configured per property. | services shown upfront.    | declared per property.    |
+--------------------------+----------------------------+---------------------------+
```

---

## 2. Specification of the Three Canonical Categories

### 2.1 Category 1: Hostels / PG (`hostels-pg`)

- **Canonical Display Name:** `Hostels/PG` (Web/Marketing: `Hostels & PGs`)
- **Canonical Slug:** `hostels-pg`
- **Database Code:** `hostel_pg`
- **Sort Order:** `1`
- **Target Demographic:** Undergraduate and postgraduate students, medical/engineering coaching aspirants (e.g. Guntur Brodipet/Arundalpet hub, Hyderabad coaching corridors), and early-career working professionals.
- **Accommodation Architecture:**
  - Room Configurations: Single private, twin sharing, 3-sharing, and 4-sharing formats.
  - Room Features: Individual study desks, lockable wardrobes, sturdy wooden/metal bunks, power backup for study lamps, and optional air conditioning.
- **Mandatory Food Guarantee:**
  - Guaranteed 3 daily meals (South Indian breakfast, lunch/packed lunch, and dinner) prepared in hygienic, verified on-premises kitchens.
  - Home-style regional menus (rice, dal/sambar, vegetable curries, rotis, curd, and scheduled weekly specials).
  - No separate food surcharges, tiffin delivery fees, or hidden kitchen maintenance fees.
- **House Rules & Operational Criteria:**
  - Structured entry/curfew hours (typically 09:30 PM / 10:00 PM for student safety).
  - Defined visitor policies and dedicated study/dining spaces.
  - On-site warden or resident manager supervision.
- **Design Tokens & Visual Indicators:**
  - Primary Accent Color: `Deep Plum` (`#442F41`)
  - Subtle Background: `#F5EFF3`
  - Border Color: `#E2D5DE`
  - Badge Variant: `primary`
  - Standard Icon: `Building2` (`lucide-react` / `lucide-react-native`)

---

### 2.2 Category 2: Homestays (`homestays`)

- **Canonical Display Name:** `Homestays`
- **Canonical Slug:** `homestays`
- **Database Code:** `homestay`
- **Sort Order:** `2`
- **Target Demographic:** Families visiting students or patients, academic and medical researchers, relocating working professionals, and medium/long-stay visitors desiring personal hospitality.
- **Accommodation Architecture:**
  - Room Configurations: Private bedrooms, en-suite guest rooms, or independent residential annexes within an owner-occupied or host-managed residential dwelling.
  - Room Features: Fully furnished residential comfort, en-suite bathrooms, serene residential neighborhood positioning, and garden/balcony access.
- **Property-Specific Food Configuration:**
  - Meal availability and inclusions vary per property.
  - Property flags declare whether breakfast, lunch, or dinner are provided.
  - No category-level guarantee of included meals; customers inspect property-level food flags upfront.
- **House Rules & Operational Criteria:**
  - Residential etiquette respecting host family privacy and residential neighborhood noise ordinances.
  - Flexible check-in coordinated directly with the host family (standard 09:00 AM check-in, 08:00 AM checkout).
  - Personalized local guidance provided by resident hosts.
- **Design Tokens & Unified Visual Indicators:**
  - Primary Identity Token: `Deep Plum` (`#442F41`)
  - Warm Background Surface: `Cream` (`#FFF4EE`) / `Neutral Surface` (`#E6E0DB`)
  - Border Color: `Neutral Surface` (`#E6E0DB`)
  - Standard Icon: `Home` (`lucide-react` / `lucide-react-native`)
  - Food Status Color: `Food Emerald` (`#10B981`, strictly reserved for positive food-inclusion status indicators)

---

### 2.3 Category 3: Co-Living (`co-living`)

- **Canonical Display Name:** `Co-Living`
- **Canonical Slug:** `co-living`
- **Database Code:** `coliving`
- **Sort Order:** `3`
- **Target Demographic:** Tech professionals, digital nomads, corporate transferees, startup founders, and modern urban residents looking for premium shared community living.
- **Accommodation Architecture:**
  - Room Configurations: Private studio suites, premium twin sharing, and modular executive suites.
  - Property Amenities: Dedicated high-speed coworking spaces with ergonomic chairs, community lounges, recreational zones (table tennis, fitness rooms), and professional housekeeping.
- **Mandatory Food Guarantee:**
  - Chef-managed dining operations providing wholesome, balanced weekday and weekend meal schedules.
  - Access to community pantries, micro-kitchens with refrigeration and induction facilities, and scheduled buffet dinners.
  - Transparent weekly dining calendars published in advance.
- **House Rules & Operational Criteria:**
  - Professional community living guidelines emphasizing mutual respect and quiet work hours.
  - 24/7 keycard or biometric access with professional security monitoring.
  - Regular community networking events and shared utility management.
- **Design Tokens & Visual Indicators:**
  - Primary Accent Color: `Coral / Terracotta` (`#FF7A67` / `#C2410C`)
  - Subtle Background: `#FFF1EE`
  - Border Color: `#FFD3C9`
  - Badge Variant: `accent`
  - Standard Icon: `Users` (`lucide-react` / `lucide-react-native`)

---

## 3. Platform Architecture & Layer Alignment

### 3.1 Relational Database Layer (`@backend-db`)

#### A. Database Migration: `property_categories`
A dedicated migration will reconcile the `property_categories` table to canonical values.

```php
<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        // 1. Ensure canonical Co-Living record exists
        $colivingExists = DB::table('property_categories')->where('slug', 'co-living')->exists();
        if (! $colivingExists) {
            DB::table('property_categories')->insert([
                'name' => 'Co-Living',
                'slug' => 'co-living',
                'code' => 'coliving',
                'description' => 'Modern community living spaces with premium amenities, flexible stays, and scheduled dining.',
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // 2. Harmonize Homestay slug to canonical plural 'homestays'
        DB::table('property_categories')
            ->where('slug', 'homestay')
            ->update([
                'name' => 'Homestays',
                'slug' => 'homestays',
                'code' => 'homestay',
                'sort_order' => 2,
                'updated_at' => $now,
            ]);

        // 3. Consolidate or align Hostels/PG
        // If independent-hostel exists, update to canonical Hostels/PG
        DB::table('property_categories')
            ->where('slug', 'independent-hostel')
            ->update([
                'name' => 'Hostels/PG',
                'slug' => 'hostels-pg',
                'code' => 'hostel_pg',
                'description' => 'Student and working-professional shared/private accommodation offering regular home-style meals and structured house rules.',
                'sort_order' => 1,
                'updated_at' => $now,
            ]);

        // If pg-accommodation exists and has properties, migrate foreign keys to hostels-pg
        $hostelPgId = DB::table('property_categories')->where('slug', 'hostels-pg')->value('id');
        $pgAccId = DB::table('property_categories')->where('slug', 'pg-accommodation')->value('id');

        if ($hostelPgId && $pgAccId) {
            DB::table('properties')
                ->where('property_category_id', $pgAccId)
                ->update(['property_category_id' => $hostelPgId]);

            // Deactivate or soft-retire duplicate legacy row
            DB::table('property_categories')
                ->where('id', $pgAccId)
                ->update([
                    'is_active' => false,
                    'sort_order' => 99,
                    'updated_at' => $now,
                ]);
        }
    }

    public function down(): void
    {
        // Reversal logic restoring initial test seeds if necessary
    }
};
```

#### B. Updated Seeder: `Database\Seeders\PropertyCategorySeeder`
The seeder will idempotently seed the exact three canonical records:

```php
public static function categories(): array
{
    return [
        [
            'name' => 'Hostels/PG',
            'slug' => 'hostels-pg',
            'code' => 'hostel_pg',
            'description' => 'Student and working-professional shared/private accommodation offering regular home-style meals and structured house rules.',
            'is_active' => true,
            'sort_order' => 1,
        ],
        [
            'name' => 'Homestays',
            'slug' => 'homestays',
            'code' => 'homestay',
            'description' => 'Warm host-managed residential accommodation with authentic regional dining included for short, weekly, and monthly guests.',
            'is_active' => true,
            'sort_order' => 2,
        ],
        [
            'name' => 'Co-Living',
            'slug' => 'co-living',
            'code' => 'coliving',
            'description' => 'Modern community living spaces with premium amenities, flexible stays, and scheduled dining.',
            'is_active' => true,
            'sort_order' => 3,
        ],
    ];
}
```

---

### 3.2 Backend Models, Enums, & Services (`@backend-db`)

#### A. Creation of Canonical Enum: `App\Enums\AccommodationCategory`

```php
<?php

declare(strict_types=1);

namespace App\Enums;

enum AccommodationCategory: string
{
    case HostelsPg = 'hostels-pg';
    case Homestays = 'homestays';
    case CoLiving = 'co-living';

    public function label(): string
    {
        return match ($this) {
            self::HostelsPg => 'Hostels/PG',
            self::Homestays => 'Homestays',
            self::CoLiving => 'Co-Living',
        };
    }

    public function code(): string
    {
        return match ($this) {
            self::HostelsPg => 'hostel_pg',
            self::Homestays => 'homestay',
            self::CoLiving => 'coliving',
        };
    }

    public function iconName(): string
    {
        return match ($this) {
            self::HostelsPg => 'Building2',
            self::Homestays => 'Home',
            self::CoLiving => 'Users',
        };
    }

    public static function tryFromLegacy(string $identifier): ?self
    {
        $normalized = strtolower(trim($identifier));
        $normalized = str_replace(['_', ' '], '-', $normalized);

        return match ($normalized) {
            'hostels-pg', 'hostel-pg', 'independent-hostel', 'pg-accommodation', 'hostel', 'hostels', 'pg' => self::HostelsPg,
            'homestays', 'homestay', 'home-stay' => self::Homestays,
            'co-living', 'coliving', 'co-live', 'shared-living' => self::CoLiving,
            default => null,
        };
    }
}
```

#### B. API V1 Route & Controller Updates

1. **Add Dedicated Categories Route in `routes/api.php`:**
   ```php
   Route::get('categories', [PublicCategoryController::class, 'index'])->name('api.v1.public.categories.index');
   ```
2. **Add Categories List to `PublicConfigController`:**
   ```php
   'categories' => PropertyCategory::query()
       ->active()
       ->ordered()
       ->get(['id', 'name', 'slug', 'code', 'description']),
   ```
3. **Update `PublicPropertyController::index()` to Filter by Category:**
   ```php
   if ($request->filled('category')) {
       $catParam = (string) $request->query('category');
       $canonicalEnum = AccommodationCategory::tryFromLegacy($catParam);
       $targetSlug = $canonicalEnum ? $canonicalEnum->value : $catParam;

       $query->whereHas('category', function (Builder $q) use ($targetSlug, $catParam): void {
           $q->where('slug', $targetSlug)
               ->orWhere('code', $catParam)
               ->orWhere('id', is_numeric($catParam) ? (int) $catParam : 0);
       });
   }
   ```
4. **Update `PropertySearchRequest` to Accept Slugs as Well as IDs:**
   ```php
   'category' => ['nullable'], // Support both array of IDs and single/array of slugs
   ```

---

### 3.3 Web Client & UI Components (`@web-ui`)

#### A. Harmonizing `resources/js/data/public-content.ts`

```typescript
export type AccommodationCategoryId = 'hostels-pg' | 'homestays' | 'co-living';

export const ACCOMMODATION_CATEGORIES: AccommodationCategoryItem[] = [
    {
        id: 'hostels-pg',
        title: 'Hostels & PGs',
        subtitle: 'Structured Living with 3 Daily Meals',
        description: 'Affordable shared and private rooms for students, coaching aspirants, and working professionals with full daily meal packages included.',
        highlights: [
            'Fresh daily breakfast, lunch, and dinner included',
            'Bunk & single room layouts with study desks',
            'Secure premises with structured house rules',
        ],
        icon: 'bed', // maps to Building2 / BedDouble
        image: { ...PUBLIC_IMAGES.categoryHostel },
    },
    {
        id: 'homestays',
        title: 'Homestays',
        subtitle: 'Host-Managed Authentic Living',
        description: 'Comfortable private rooms in welcoming residential family homes with authentic regional breakfast and optional home dining.',
        highlights: [
            'Hosted by verified local families',
            'Authentic home-cooked Andhra & South Indian dining',
            'Quiet, peaceful residential neighborhoods',
        ],
        icon: 'home',
        image: { ...PUBLIC_IMAGES.categoryHomestay },
    },
    {
        id: 'co-living',
        title: 'Co-Living Spaces',
        subtitle: 'Community Living for Professionals',
        description: 'Modern urban spaces featuring ergonomic coworking setups, high-speed fiber internet, housekeeping, and chef-prepared meal schedules.',
        highlights: [
            'Dedicated coworking spaces & high-speed Wi-Fi',
            'Community dining & shared recreational lounges',
            'Flexible monthly terms for modern professionals',
        ],
        icon: 'building', // maps to Users / Building2
        image: { ...PUBLIC_IMAGES.categoryPg },
    },
];
```

#### B. Component Alignment: `resources/js/components/public/accommodation-categories.tsx`
The layout uses a 3-tile responsive grid (1 primary 7-column card + 2 stacked 5-column cards). The 3 canonical categories fit this layout seamlessly without layout breaks across breakpoints (320px to 1920px).

#### C. Search Filters: `resources/js/pages/public/search/index.tsx`
Ensure the category filter checkboxes query `categories` from backend props and pass either selected category IDs or slugs without hardcoded assumptions.

---

### 3.4 Mobile Client (`@mobile-app`)

The mobile client is already architected around the 3 canonical categories (`apps/mobile/src/constants/categories.ts`).

**Required Mobile Adjustments:**
1. Once `@backend-db` implements category filtering in `GET /api/v1/public/properties`, remove the client-side memory filter in `apps/mobile/app/(customer)/explore/index.tsx` (Lines 112–118) and rely on backend pagination.
2. Update `PublicApi.getProperties` to pass canonical slug: `category: selectedCategory`.
3. In `apps/mobile/app/(customer)/bookings/create.tsx`, update user-facing text from *"1. Select Room Category"* to *"1. Select Room Type"* to avoid conflating property accommodation categories with room type layouts.

---

## 4. Policy on Ambiguous Terminology (Hotels, Lodges, Guest Houses)

To maintain brand integrity and prevent guest disputes over meal expectations:

1. **Pure Room-Only Commercial Hotels Are Prohibited:**
   - TIJUM does **not** list conventional room-only hotels or transit motels that sell rooms without included meals.
   - Any property application lacking verified daily meal provisions must be rejected by admin reviewers during verification.
2. **Handling Legacy Property Names ("Lodge", "Guest House"):**
   - In South India, many genuine student hostels and PG accommodations bear historical municipal trade names such as *"Sri Balaji Luxury Lodge"* or *"Sai Krishna Executive Guest House"*.
   - **Intake Rule:** If the property operates as a long-term residential accommodation with included meals, it is approved, but categorized strictly under **`Hostels/PG`** (or `Homestays` if owner-occupied).
   - The platform will display a canonical category badge (`Hostels/PG`) on the property card, preventing customer confusion.
3. **Owner Portal Guidance:**
   - In `resources/js/components/owner/properties/property-form.tsx`, add helper copy under category selection:
     > *"TIJUM lists food-inclusive residential accommodations only. Select Hostels/PG for student and working PGs, Homestays for host-occupied family homes, or Co-Living for professional community living. Traditional room-only commercial hotel listings are not supported."*

---

## 5. Reservation Snapshot & Legal Integrity

1. **Snapshot Column Integrity (`reservations.snapshot_category_name`):**
   - Point-in-time snapshots in existing reservations are immutable legal audit records.
   - Migrations will **never** alter existing reservation rows.
2. **Forward-Compatible Snapshotting:**
   - When a booking is created in `CreateReservation`, it will snapshot the canonical category name (`$property->category->name`).
   - If desired, a new column `snapshot_category_slug` (`varchar(64) NULL`) can be added to store the canonical slug (`hostels-pg`, `homestays`, `co-living`) for unambiguous API rendering.

---

## 6. Swarm Implementation & Handoff Roadmap

### Phase 1: Database & Backend Foundation (`@backend-db`)
- [ ] Create and execute migration `2026_11_14_000001_consolidate_canonical_property_categories.php`.
- [ ] Update `Database\Seeders\PropertyCategorySeeder` to seed the 3 canonical categories.
- [ ] Implement `App\Enums\AccommodationCategory` enum with `tryFromLegacy()` helper.
- [ ] Update `PublicPropertyController::index()` to support `?category=` filter.
- [ ] Expose `GET /api/v1/public/categories` and enrich `PublicConfigController` response.
- [ ] Update `PropertyCategoryTest` to assert canonical slugs `['hostels-pg', 'homestays', 'co-living']`.

### Phase 2: Web Client & CMS Content Harmonization (`@web-ui`)
- [ ] Update `resources/js/data/public-content.ts` with canonical IDs (`hostels-pg`, `homestays`, `co-living`).
- [ ] Update `accommodation-categories.tsx` category cards and imagery.
- [ ] Review `resources/js/pages/public/search/index.tsx` to verify category filter bindings.
- [ ] Add category classification helper text in `resources/js/components/owner/properties/property-form.tsx`.
- [ ] Update SEO meta descriptions in `welcome.tsx` and CMS pages.

### Phase 3: Mobile Client Server-Side Alignment (`@mobile-app`)
- [ ] Verify `PublicApi.getCategories()` or consume categories from `PublicConfig`.
- [ ] Remove client-side memory filtering in `apps/mobile/app/(customer)/explore/index.tsx` once API filtering is confirmed.
- [ ] Refine copy in `bookings/create.tsx` ("Select Room Type" instead of "Select Room Category").
- [ ] Run full Android emulator test verifying category pill switching and property cards.

### Phase 4: Swarm Verification & Closure (`@coordinator`)
- [ ] Execute full backend test suite (`vendor/bin/phpunit`).
- [ ] Run end-to-end browser check on public search and category cards.
- [ ] Confirm clean audit closure in documentation repository.
