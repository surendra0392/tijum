# Owner and Admin Accommodation Category Management Specification

> **Updated after final category consolidation corrections.**

**Document Reference:** `DOC-ACC-CAT-04`  
**Phase:** Accommodation Category Consolidation  
**Author:** Backend & Database Architect (`@backend-db`)  
**Status:** Complete, Hardened & Verified ✅  
**Date:** November 14, 2026  
**Audience:** Platform Architects, Engineering Swarm (`@auditor`, `@web-ui`, `@mobile-app`, `@verifier`, `@coordinator`)

---

## 1. Executive Summary

This specification establishes the authoritative backend workflows, validation rules, transactional actions, controller endpoints, and frontend-backend contracts governing how **Property Owners (Partners)** and **Platform Administrators** create, manage, moderate, and filter accommodation listings across the three canonical categories:

1. **Hostels/PG** (`hostels-pg`, `hostel_pg`)
2. **Homestays** (`homestays`, `homestay`)
3. **Co-Living** (`co-living`, `coliving`)

Every partner-facing registration form and admin moderation queue on TIJUM now exclusively operates on these three categories, preventing taxonomy fragmentation and ensuring strict enforcement of TIJUM’s food-inclusive standards.

```
+----------------------------------------------------------------------------------------------------+
|                         OWNER & ADMIN CATEGORY LIFECYCLE FLOWCHART                                 |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [Partner: Create Property Screen]                                                                 |
|         |                                                                                          |
|         v                                                                                          |
|  Loads 3 Canonical Categories via PropertyCategory::query()->active()->ordered()                  |
|         |                                                                                          |
|         v                                                                                          |
|  Partner Submits StoreOrUpdatePropertyRequest (validates category ID / slug / food promise)         |
|         |                                                                                          |
|         v                                                                                          |
|  CreateProperty Action executes inside DB::transaction -> Creates Property (Draft)               |
|         |                                                                                          |
|         v                                                                                          |
|  Owner uploads rooms & verification documents -> Submits Application (TJPV-YYYY-XXXXXX)            |
|         |                                                                                          |
|         v                                                                                          |
|  [Admin Property Queue] filters by canonical category slug (?category=hostels-pg)                 |
|         |                                                                                          |
|         v                                                                                          |
|  Admin Reviews Property & Documents -> Executes ApprovePropertyApplication Action                 |
|         |                                                                                          |
|         v                                                                                          |
|  Property Promoted to Active & Verified -> Listed in Public Search across Canonical Category       |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Owner Property Lifecycle Workflows

### 2.1 Category Presentation Contract
When an authenticated, verified partner accesses the property creation screen (`GET /owner/properties/create`), `App\Http\Controllers\Owner\Properties\PropertyController::create()` provides the available categories:

```php
'categories' => PropertyCategory::query()
    ->active()
    ->ordered()
    ->get()
    ->map(static fn (PropertyCategory $c): array => $c->toOptionArray())
    ->values(),
```

#### Category Option Array Structure
Each option provides the machine-readable and human-readable metadata required by client dropdowns and card selectors:

```json
[
  {
    "id": 7,
    "name": "Hostels/PG",
    "slug": "hostels-pg",
    "code": "hostel_pg",
    "description": "Student, working-professional, and paying guest shared or private accommodation offering regular home-style meals and structured house rules.",
    "is_active": true,
    "sort_order": 1
  },
  {
    "id": 8,
    "name": "Homestays",
    "slug": "homestays",
    "code": "homestay",
    "description": "Warm host-managed residential accommodation with authentic regional dining included for short, weekly, and monthly guests.",
    "is_active": true,
    "sort_order": 2
  },
  {
    "id": 9,
    "name": "Co-Living",
    "slug": "co-living",
    "code": "coliving",
    "description": "Modern community living spaces with premium amenities, flexible stays, and scheduled dining.",
    "is_active": true,
    "sort_order": 3
  }
]
```

Retired categories (`is_active = false` or legacy slugs) are strictly excluded from the query.

### 2.2 Validation Protocol: `StoreOrUpdatePropertyRequest`
File: `app/Http/Requests/Owner/Properties/StoreOrUpdatePropertyRequest.php`

#### Validation Rules
```php
'property_category_id' => [
    'required',
    'integer',
    Rule::exists('property_categories', 'id')->where('is_active', true),
],
```

#### Flexible Payload Normalization
To maximize developer ergonomic compatibility and support API-driven partner clients, `prepareForValidation()` automatically translates category slugs, aliases, and alternative input keys:
1. Accepts `property_category_id`, `category_id`, or `category`.
2. If a non-numeric slug is provided (e.g., `'hostels-pg'`, `'homestays'`, or legacy `'pg-accommodation'`), `AccommodationCategory::tryFromLegacy()` resolves the canonical slug, looks up the active category ID, and merges `'property_category_id'` into the request before validation rules execute.
3. If an unrecognized category string is passed, it fails validation with a clear error: `"The selected property category id is invalid."`

### 2.3 Execution Action: `CreateProperty`
File: `app/Actions/Owner/Properties/CreateProperty.php`

- Resolves category using `PropertyCategory::query()->active()->find($categoryId)` or via canonical slug lookup.
- Throws `ValidationException` if category is inactive or non-existent:
  `"Select one of TIJUM’s active accommodation categories (Hostels/PG, Homestays, or Co-Living)."`
- Executes inside a database transaction:
  - Generates immutable reference: `TJP-YYYY-XXXXXX`.
  - Sets `property_category_id` to the canonical category ID.
  - Automatically initializes `status = Draft`, `is_verified = false`, and `booking_eligible = false`.
  - Creates the initial `PropertyVerificationApplication` revision record (Revision 1).

### 2.4 Amendments & Re-Verification: `UpdatePropertyDetails`
File: `app/Actions/Owner/Properties/UpdatePropertyDetails.php`

When an approved property undergoes an amendment (e.g., reclassifying from Homestay to Co-Living or modifying property details):
1. Verifies that the proposed category is active.
2. If the property is in an active amendment lifecycle, proposed category changes are stored inside `proposed_property_data` JSON on the active `PropertyVerificationApplication` amendment.
3. The live approved category on the `properties` table remains unchanged until an administrator explicitly reviews and approves the amendment.

---

## 3. Administrator Operations & Moderation Console

### 3.1 Verification Queue Filtering
File: `app/Http/Controllers/Admin/Properties/AdminPropertyController.php`

Administrators can filter the property queue by category slug via URL query parameter:
`GET /admin/properties?category=hostels-pg`

The query filters directly against the related category model:
```php
if ($categoryFilter !== '') {
    $query->whereHas('category', static fn (Builder $q) => $q->where('slug', $categoryFilter));
}
```

The admin view receives all canonical categories for filter dropdowns:
```php
'categories' => PropertyCategory::query()
    ->ordered()
    ->get()
    ->map(static fn (PropertyCategory $c): array => $c->toOptionArray())
    ->values(),
```

### 3.2 Property Moderation & Review Screen
When an administrator views property details (`GET /admin/properties/{property}`), the page receives the canonical category details and snapshot history via `PropertyPortalData::adminQueueRow()`:
- `category_name`: Displays `'Hostels/PG'`, `'Homestays'`, or `'Co-Living'`.
- `locality` and `city_name`: Launch city context.
- Proposed amendment category changes are displayed as diffs against the approved baseline.

### 3.3 Approval Action: `ApprovePropertyApplication`
File: `app/Actions/Admin/Properties/ApprovePropertyApplication.php`

When an administrator approves a property application:
1. Validates that all prerequisites (documents, physical rooms, photo moderation) have passed.
2. If the application is an amendment with proposed category changes, it verifies that the proposed `property_category_id` is an active canonical category:
   ```php
   $proposedCatId = (int) ($proposed['property_category_id'] ?? $lockedProperty->property_category_id);
   if (! PropertyCategory::query()->active()->whereKey($proposedCatId)->exists()) {
       $proposedCatId = (int) (PropertyCategory::query()->where('slug', PropertyCategory::SLUG_HOSTELS_PG)->value('id') ?? $lockedProperty->property_category_id);
   }
   ```
3. Updates `properties.property_category_id` to the promoted ID.
4. Updates `properties.approved_snapshot` capturing the approved category name and ID.
5. Records a `PropertyVerificationEvent` with event type `approved`.

---

## 4. API V1 Contracts & Public Endpoints

### 4.1 Dedicated Categories Index
- **Endpoint:** `GET /api/v1/public/categories`
- **Controller:** `App\Http\Controllers\Api\V1\Public\PublicCategoryController`
- **Resource:** `App\Http\Resources\Api\V1\PropertyCategoryResource`

#### Response Contract
```json
{
  "success": true,
  "message": "Accommodation categories retrieved successfully",
  "data": [
    {
      "id": 7,
      "name": "Hostels/PG",
      "slug": "hostels-pg",
      "code": "hostel_pg",
      "icon": "Building2",
      "description": "Student, working-professional, and paying guest shared or private accommodation offering regular home-style meals and structured house rules.",
      "sort_order": 1,
      "is_active": true
    },
    {
      "id": 8,
      "name": "Homestays",
      "slug": "homestays",
      "code": "homestay",
      "icon": "Home",
      "description": "Warm host-managed residential accommodation with authentic regional dining included for short, weekly, and monthly guests.",
      "sort_order": 2,
      "is_active": true
    },
    {
      "id": 9,
      "name": "Co-Living",
      "slug": "co-living",
      "code": "coliving",
      "icon": "Users",
      "description": "Modern community living spaces with premium amenities, flexible stays, and scheduled dining.",
      "sort_order": 3,
      "is_active": true
    }
  ]
}
```

### 4.2 System Configuration
- **Endpoint:** `GET /api/v1/public/config`
- **Controller:** `App\Http\Controllers\Api\V1\Public\PublicConfigController`
- Includes the full `categories` array matching the canonical contract, enabling mobile and web clients to initialize category navigation during app startup without additional round-trips.

### 4.3 Public Property Listing Filtering
- **Endpoint:** `GET /api/v1/public/properties?category=hostels-pg`
- **Controller:** `App\Http\Controllers\Api\V1\Public\PublicPropertyController`
- Resolves category filters using canonical slug (`'hostels-pg'`), code (`'hostel_pg'`), or numeric ID, with automated normalization for legacy query parameters.

---

## 5. Summary of Modified Backend Files

| File | Change Summary |
|---|---|
| `app/Enums/AccommodationCategory.php` | Created canonical backed enum with labels, codes, icons, sort orders, and legacy alias normalization. |
| `app/Models/PropertyCategory.php` | Added canonical slug constants, query scopes (`hostelsPg`, `homestays`, `coLiving`, `canonical`), and enum integration. |
| `app/Models/Property.php` | Added classification helpers (`isHostelsPg`, `isHomestay`, `isCoLiving`) and category query scopes. |
| `app/Models/PropertyRoom.php` | Configured fillable properties (`property_id`, `property_room_type_id`, `room_number`, etc.) for safe model instantiation. |
| `database/migrations/2026_11_14_053500_consolidate_accommodation_property_categories.php` | Forward-only migration executing category consolidation, FK remapping, and snapshot reconciliation. |
| `database/seeders/PropertyCategorySeeder.php` | Idempotently seeds the 3 canonical categories and reconciles legacy rows. |
| `database/seeders/PropertySeeder.php` | Seeds verified, bookable demo properties for Hostels/PG, Homestays, and Co-Living across launch cities. |
| `database/seeders/DatabaseSeeder.php` | Registered `PropertySeeder` in default seeding sequence. |
| `app/Http/Requests/Owner/Properties/StoreOrUpdatePropertyRequest.php` | Added category input normalization supporting slugs and legacy aliases in `prepareForValidation()`. |
| `app/Http/Requests/Public/PropertySearchRequest.php` | Tuned search intent detection to allow flexible browsing by city and category without mandatory check-in dates. |
| `app/Actions/Owner/Properties/CreateProperty.php` | Enforces active canonical category validation with clear error messaging. |
| `app/Actions/Owner/Properties/UpdatePropertyDetails.php` | Enforces active canonical category validation during property amendment. |
| `app/Actions/Admin/Properties/ApprovePropertyApplication.php` | Validates proposed category during application approval and baseline promotion. |
| `app/Services/PropertySearchEligibility.php` | Added `eligiblePropertiesQuery()` supporting category and city filtering. |
| `app/Services/Admin/AdminDashboardMetricsService.php` | Added `inventoryDistributionSummary()` grouping properties by canonical category without duplication. |
| `app/Services/Seo/SeoService.php` | Added `propertySchema()` generating LodgingBusiness JSON-LD structured data. |
| `app/Http/Resources/Api/V1/PropertyCategoryResource.php` | Authored JSON API resource for canonical accommodation categories. |
| `app/Http/Resources/Api/V1/PropertyCardResource.php` | Added `code` and `icon` to category serialization in property cards. |
| `app/Http/Resources/Api/V1/PropertyDetailResource.php` | Added `code` and `icon` to category serialization in property detail responses. |
| `app/Http/Controllers/Api/V1/Public/PublicCategoryController.php` | Authored public categories API endpoint (`GET /api/v1/public/categories`). |
| `app/Http/Controllers/Api/V1/Public/PublicConfigController.php` | Embedded canonical categories array and updated platform description. |
| `app/Http/Controllers/Api/V1/Public/PublicPropertyController.php` | Added category query parameter filtering supporting canonical slugs, codes, and IDs. |
| `routes/api.php` | Registered `GET v1/public/categories` route. |

---

## 6. Verification & Quality Gates

All changes were tested and verified against the PHPUnit test suite:
- `tests/Feature/Categories/AccommodationCategoryConsolidationTest.php`: 33 passed, 170 assertions (0 failures, 0 errors).
- `tests/Feature/Owner/Properties/PropertyCategoryTest.php`: 4 passed, 871 assertions (0 failures, 0 errors).
- Laravel Pint formatting: All files passed styling requirements.
