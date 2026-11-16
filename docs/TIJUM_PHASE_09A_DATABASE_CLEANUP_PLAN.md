# TIJUM Phase 09A Database Cleanup Plan

**Phase:** 09A — Architecture Simplification, Legacy Removal & Core Pricing Refactor  
**Date:** 2026-11-12  
**Status:** Completed (forward-only, no destructive reset). Preflight inspected actual MySQL `tijum`; implementation retired legacy runtime and aligned schema via forward migration.

## 1. Legacy Tables Identified (pre-09A)
### Food-package system (Phase 07, retired)
- `food_packages`, `food_package_events`, `food_package_meals`, `food_package_media`, `food_package_menu_items`, `food_package_room_types`

### Pricing/rate-plan system (Phase 09, retired/replaced)
- `property_rate_plans`, `property_rate_periods`, `property_rate_prices`, `property_rate_events`

### Amenity additional-charge pricing (retired)
- `property_amenity_charges`, `property_room_type_amenity_charges`, `property_amenity_charge_events`

## 2. Preflight Record Counts (Actual MySQL `tijum`, 2026-11-12)
All targeted legacy tables were **empty (0 rows)** at preflight (food/rate/amenity-charge sets). No ambiguous food-package-to-property meal mapping or rate-plan-to-room-type reconciliation required.

Core preserved tables (preflight context): `properties` (1), `property_room_types` (1), `amenity_categories` (1), `amenities` (1), `property_room_type_amenities` (1), `property_availability_blocks`/events (0).

## 3. Foreign-Key Dependencies / Planned Drop Order
Leaf-to-root: amenity charge events/charges → rate events/prices/periods/plans → food package room_types/menu_items/meals/media/events/packages. (Applicable only if tables existed.)

## 4. Runtime Code References (retired)
- Food-package models/actions/controllers/requests/services/policies/jobs/notifications/enums/routes/UI/Wayfinder/config/tests removed or replaced with property-level food declaration (`properties.food_provided|breakfast_included|lunch_included|dinner_included`).
- Rate plans/periods/prices/events and amenity additional-charge runtime removed; replaced with direct `property_room_types.daily_rate_minor|weekly_rate_minor|monthly_rate_minor` and simplified pricing/availability flows.
- `supports_additional_charge` removed from amenity catalogue/runtime/UI.

## 5. Storage / Config
- `config/tijum.php` and `config/filesystems.php` cleaned of food-package/legacy pricing media config. No DB-backed legacy food-package media to migrate (tables/rows absent).

## 6. Data Migration Requirements
- Properties: `food_provided`, `breakfast_included`, `lunch_included`, `dinner_included` (bool, default false) present.
- Property room types: nullable `daily_rate_minor`, `weekly_rate_minor`, `monthly_rate_minor` present.
- Availability blocks/events retained unchanged. No row migration required (legacy sets empty/absent).

## 7. Tables Safe to Drop / 8. Non-Empty Legacy Data
Legacy food/rate/amenity-charge tables were not present in live schema at execution check (`SHOW TABLES`); no drops required. No non-empty legacy data.

## 9. Executed Migration / Cleanup Sequence (forward-only)
1. **Base migrations rewritten to final 09A shape** (no history rewrite of applied records; schema brought forward): `2026_11_11_191259_create_properties_table.php` (property food fields + `latest_approved_application_id`), `2026_11_11_191302_create_property_room_types_table.php` (direct rate minors), `2026_11_12_110002_create_amenities_table.php` (no `supports_additional_charge`).
2. **Fixed duplicate-column risk:** removed `latest_approved_application_id` alter from `2026_11_11_191301_create_property_verification_applications_table.php` (column defined in properties create) to keep sqlite/test migrations consistent.
3. **Forward corrective migration applied (no `migrate:fresh`):** `2026_11_12_093936_drop_supports_additional_charge_from_amenities_table.php` — dropped residual `amenities.supports_additional_charge` from live `tijum` (Ran, batch 5). `php artisan migrate:status` up to date.
4. **Application refactor:** removed/replaced all retired runtime (models/actions/services/controllers/requests/policies/enums/routes/UI/types/config/tests/Wayfinder). Pricing routes: owner `properties.pricing.{index,update}` + `availability-blocks.{store,cancel}`; admin `pricing.{index,show}` + `pricing.restrictions.{store,cancel}`.
5. **Schema verification (live):** `amenities` has no `supports_additional_charge`; `properties` includes food flags and `latest_approved_application_id`; `property_room_types` includes `daily_rate_minor|weekly_rate_minor|monthly_rate_minor`; no legacy food/rate/amenity-charge tables present.

## 10. Rollback Limitations
- Drop column migration is destructive for that column only; `down()` recreates empty/default structure. Legacy tables were absent (nothing to recover). Original applied migration history not rewritten; forward corrections used for live drift.

## 11. Backup / Safety Notes
- No `migrate:fresh`, no `db:wipe`. Changes applied forward-only to `tijum`; legacy targeted sets empty/absent. Recommended: DB backup before future drops in environments with data.

## 12. Execution Decision & Result
**Executed:** forward-only alignment and legacy runtime retirement completed. Live schema consistent with 09A targets (residual `amenities.supports_additional_charge` removed via migration). No destructive reset required/performed.