# TIJUM Phase 09 Completion Report

## Phase
- **Phase:** 09 — Pricing & Availability Management
- **Status:** Completed (implementation, tests, and QA executed)
- **Date:** 2026-11-12
- **Scope boundary:** Phase 09 only. No booking, checkout, payment, reservation, search/listing booking flow, or fake availability/search behavior introduced.

## Objective Delivered
Implemented Phase 09 pricing and availability management across schema, config, domain, admin permissions, owner/admin portals, routes/controllers/requests/policies/frontend/navigation/Wayfinder, amenity additional-charge pricing integration, automated tests, and full QA, while preserving TIJUM architecture and reusing Phase 07/08 source-of-truth patterns.

## Locked Constraints Respected
- **Accommodation hierarchy preserved:** `Property → Room Type → Physical Rooms`. No beds, no `property_beds`, no bed UI, no physical-room-level amenities.
- **Food source of truth preserved:** Rates are food-inclusive and must be linked to an approved, active, TIJUM-verified food package (`FoodPackage::isApprovedActiveOffer()`). Phase 07 readiness/customer data reused; no meal/menu/cuisine/dietary/timing duplication in pricing.
- **AC/Non-AC separation preserved:** AC/Non-AC remains `PropertyRoomType.is_air_conditioned` only.
- **No out-of-scope booking logic:** No booking/checkout/payment/reservation tables or flows and no fabricated availability/search results. Availability blocks/capacity handling expose customer-safe restriction data only.
- **Pricing rules enforced:** Shared room types = `per_guest`; single/private room types = `per_room`; no room-only rates. Integer minor-unit money (`amount_minor`, INR). Daily/weekly/monthly durations with default period required; seasonal/future periods supported.
- **Security/guards reused:** Existing `owner`/`admin` guards and middleware (`auth:owner`, `owner.active`, `auth:admin`, `admin.active`, `admin.two-factor`, `admin.role`).
- **No destructive migrations:** Only additive migrations (`2026_11_12_120001`–`2026_11_12_120009`) applied.

## Configuration
- `config/tijum.php` → `pricing`:
  - `currency_code` (`TIJUM_PRICING_CURRENCY`, default `INR`), `currency_minor_unit` 2, `timezone` `Asia/Kolkata`
  - `durations`: `daily` (1), `weekly` (7), `monthly` (30)
  - `check_in_time` `09:00`, `check_out_time` `08:00`, `earliest_early_check_in_time` `07:00`
  - nullable `min_rate_amount_minor` / `max_rate_amount_minor`, `max_rate_plans_per_property` 100
  - `amenity_charge_units`: `per_use`, `per_day`, `per_stay`, `per_guest_per_stay`

## Database (Additive, Migrated)
- `2026_11_12_120001_create_property_rate_plans_table.php` — `property_rate_plans` (property/room-type/food-package linkage, rate reference, pricing basis, currency/status, revision/current flags, parent/superseded linkage, composite room-type/property FK, uniqueness constraints).
- `2026_11_12_120002_create_property_rate_periods_table.php` — `property_rate_periods` (default/seasonal, validity window, priority, active flag).
- `2026_11_12_120003_create_property_rate_prices_table.php` — `property_rate_prices` (duration + `amount_minor`, unique per period/duration).
- `2026_11_12_120004_create_property_rate_events_table.php` — append-only `property_rate_events` (plan/period refs, event type, actor, previous/new JSON snapshots, notes/metadata).
- `2026_11_12_120005_create_property_availability_blocks_table.php` — `property_availability_blocks` (property/room-type/room scope, block type/status, dates, reason, owner/admin actor refs, admin-restriction flag).
- `2026_11_12_120006_create_property_availability_block_events_table.php` — append-only availability block events.
- `2026_11_12_120007_create_property_amenity_charges_table.php` — `property_amenity_charges` (additional-charge pricing for property amenity assignments).
- `2026_11_12_120008_create_property_room_type_amenity_charges_table.php` — `property_room_type_amenity_charges` (room-type amenity assignment charges).
- `2026_11_12_120009_create_property_amenity_charge_events_table.php` — append-only amenity charge audit events.

**Migration status:** all above Ran (batch [2]); no destructive migrations.

## Domain, Services, and Authorization
- **Enums:** `PropertyPricingBasis`, `PropertyRateDuration`, `PropertyRatePeriodType`, `PropertyRatePlanStatus`, `PropertyRateEventType`, `PropertyAvailabilityBlockScope`, `PropertyAvailabilityBlockType`, `PropertyAvailabilityBlockStatus`, `AmenityChargeUnit`.
- **Models:** `PropertyRatePlan`, `PropertyRatePeriod`, `PropertyRatePrice`, `PropertyRateEvent` (append-only), `PropertyAvailabilityBlock`, `PropertyAvailabilityBlockEvent` (append-only), `PropertyAmenityCharge`, `PropertyRoomTypeAmenityCharge`, `PropertyAmenityChargeEvent` (append-only) with casts/relations/helpers/portal/timeline serialization as applicable.
- **Integration:** pricing/availability relations on `Property`, `PropertyRoomType`, `PropertyRoom`; `additionalCharge()` on `PropertyAmenity` and `PropertyRoomTypeAmenity`.
- **Services:**
  - `PropertyPricingReadiness` — evaluates owner/property baseline, active room types, approved active food packages (Phase 07 readiness), rate-plan validity/coverage per room-type×food-package combination, pricing-basis correctness, default/seasonal price validity, amenity additional-charge configuration/readiness (Phase 08 readiness context), and admin/customer-safe readiness notes without fabricated status.
  - `PropertyPricingCustomerData` — customer-safe exposure only for approved/verified/booking-eligible/active property context: approved active food-linked rate plans with valid default pricing, applicable seasonal resolution helper, non-cancelled/active restriction blocks, and approved/current/active additional-charge amenity pricing; excludes drafts/rejected/internal data and fabricates no availability/search.
  - `PropertyAmenityCustomerData` updated to include configured additional-charge details for eligible approved/current assignments.
- **Policies/permissions:** `PropertyRatePlanPolicy`, `PropertyAvailabilityBlockPolicy` registered in `AppServiceProvider`; `AdminRole` extended with `pricing.view`, `pricing.review`, `pricing.manage_restrictions`, `availability.view`, `availability.manage_restrictions` for appropriate roles (with Super Admin wildcard behavior preserved).

## Actions & Workflows (Transactional, Auditable)
- **Owner pricing:** `SavePropertyRatePlan` — validates ownership/property approval/active room type/approved active food package, enforces pricing basis by room-type mode, enforces configured limits, upserts current plan + default/seasonal periods/prices (minor units), records append-only rate events (created/updated/default/seasonal/activation/changes).
- **Owner amenity pricing:** `SaveAmenityAdditionalCharge` — configures additional-charge amount/unit/active state for current, additional-charge-eligible amenity assignments (property/room-type scope) with revisioning and append-only charge events.
- **Owner availability:** `CreatePropertyAvailabilityBlock`, `CancelPropertyAvailabilityBlock` — manage property/room-type/room blocks with validation/audit events; owners cannot cancel admin-applied restrictions.
- **Admin availability/restrictions:** `CreateAdminAvailabilityRestriction`, `CancelAdminAvailabilityRestriction` — audited admin restriction management (permission-gated).

## Controllers, Requests, Routes, Wayfinder
- **Owner:** `Owner\Properties\PropertyPricingController` (index, store/update rate plan, save amenity charge, store/cancel availability block) with `SavePropertyRatePlanRequest`, `SaveAmenityAdditionalChargeRequest`, `CreatePropertyAvailabilityBlockRequest`, `CancelPropertyAvailabilityBlockRequest`.
- **Admin:** `Admin\Pricing\AdminPricingController` (index/show oversight, store/cancel restrictions) with `CreateAdminAvailabilityRestrictionRequest`, `CancelAdminAvailabilityRestrictionRequest`.
- **Routes (10 pricing/availability routes):**
  - Owner: `GET owner/properties/{property}/pricing` (`owner.properties.pricing.index`), `POST .../rate-plans`, `PATCH .../rate-plans/{ratePlan}`, `POST .../amenity-charges`, `POST .../availability-blocks`, `POST .../availability-blocks/{block}/cancel`.
  - Admin: `GET admin/pricing`, `GET admin/pricing/{property}`, `POST admin/pricing/{property}/restrictions`, `POST admin/pricing/{property}/restrictions/{block}/cancel` (role/permission middleware applied).
- **Wayfinder:** regenerated (`php artisan wayfinder:generate --with-form --no-interaction`) for pricing actions/routes.

## Frontend & UX
- **Owner portal:** `resources/js/pages/owner/properties/pricing/index.tsx` — pricing workspace with readiness/coverage, room-type×approved-food-package combinations, rate plan create/update (daily/weekly/monthly minor-unit defaults, basis/status), amenity additional-charge configuration, and availability block management/cancellation; integrated into property setup flow.
- **Admin console:** `resources/js/pages/admin/pricing/index.tsx`, `resources/js/pages/admin/pricing/show.tsx` — pricing/availability oversight, coverage/readiness, rate-plan and block visibility, and permission-gated restriction management.
- **Navigation/types:** `resources/js/components/owner/properties/property-step-navigation.tsx` includes **Pricing & Availability** step; `resources/js/layouts/admin-layout.tsx` includes pricing navigation for permitted roles; `resources/js/types/pricing.ts` (+ exports) added.
- **Baseline compatibility:** repo-wide TS `.form()` usage normalized to callable route/action helpers where required to restore `npm run types:check` without weakening TypeScript.

## Automated Tests Added
- `tests/Feature/Owner/Pricing/PropertyPricingManagementTest.php`
  - Pricing workspace access with approved food packages/room types and readiness context.
  - Rejects rate creation without approved active food package; enforces food-linked pricing.
  - Creates/updates food-linked rate plan with default daily/weekly/monthly minor-unit prices, correct pricing basis (per room/per guest), references, and append-only audit events.
  - Saves amenity additional charge for approved/current additional-charge assignment.
  - Ownership/authorization isolation.
- `tests/Feature/Owner/Availability/PropertyAvailabilityManagementTest.php`
  - Owner create/cancel availability blocks with audited events; prevents owner cancellation of admin restrictions.
- `tests/Feature/Admin/Pricing/AdminPricingOversightTest.php`
  - Admin pricing console enforces guard/TOTP/role permissions (view vs manage restrictions).
  - Operations admin can apply/cancel audited availability restrictions.

## QA & Verification (Actual Results)
| Check | Result |
|---|---|
| `php artisan test tests/Feature/Owner/Pricing/PropertyPricingManagementTest.php tests/Feature/Owner/Availability/PropertyAvailabilityManagementTest.php tests/Feature/Admin/Pricing/AdminPricingOversightTest.php` | **PASS** — 10 passed, 78 assertions |
| `php artisan test` | **PASS** — 209 passed, 2514 assertions (0 failed) |
| `vendor/bin/pint --test` / `composer lint:check` | **PASS** |
| `composer types:check` (PHPStan) | **PASS** — 0 errors |
| `npm run types:check` | **PASS** |
| `npm run check` (`vp check`) | **PASS** — formatting/lint clean for checked frontend files |
| `npm run build` | **PASS** (production build completed; Wayfinder/Vite build output generated) |
| `php artisan wayfinder:generate --with-form --no-interaction` | **PASS** |
| `php artisan route:list --name=pricing --except-vendor` | **PASS** — 10 pricing/availability routes registered |
| `php artisan migrate:status` | **PASS** — Phase 09 migrations `2026_11_12_120001`–`120009` Ran (batch [2]), no destructive migrations |
| `composer audit --no-interaction` | **PASS** — no security vulnerability advisories found |

## Notes / Decisions
- Pricing remains strictly tied to approved room type + approved/active/verified food package; customer-safe exposure excludes non-eligible context and never fabricates availability/search/booking state.
- Append-only event tables and transactional actions used for rate, availability, and amenity-charge auditability consistent with existing TIJUM patterns.
- Amenity additional-charge pricing integrated at assignment level (property/room-type), surfaced in owner pricing workflow and customer-safe serialization for eligible approved/current charges only.
- Test environment: `tests/TestCase.php` uses `$this->withoutVite()` to keep HTTP/Inertia feature tests deterministic in CI/local test runs independent of dev/build asset resolution.

## Completion Statement
Phase 09 (Pricing & Availability Management) is implemented and verified within the stated scope and constraints. No booking/checkout/payment/reservation or search flow was introduced.
