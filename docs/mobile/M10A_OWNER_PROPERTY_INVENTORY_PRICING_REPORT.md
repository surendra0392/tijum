# TIJUM Mobile Phase M10A: Owner Property, Inventory & Pricing Report

**Document Reference:** `docs/mobile/M10A_OWNER_PROPERTY_INVENTORY_PRICING_REPORT.md`  
**Application Scope:** `(partner)/properties/*`, `(partner)/properties/[id]/*`, and Inventory Domain Logic  
**Date:** November 20, 2026  
**Status:** **ACTIVE, COMPLIANT & CERTIFIED**

---

## 1. Domain Architecture: Strict Anti-Bed Hierarchy

The TIJUM platform strictly rejects individual bed modeling. Accommodations are organized into a strict three-tier hierarchy:
```
Tier 1: Property (e.g. "Sri Lakshmi Grand PG")
  └── Tier 2: PropertyRoomType (e.g. "Double Sharing AC Room")
        └── Tier 3: PropertyRoom (e.g. "Room 101", "Room 102")
```

### 1.1 Non-Negotiable Rules
1. **No Bed Entities:** No database tables, models, API fields, or UI forms manage "beds".
2. **Sharing Capacity:** Capacity is expressed via `sharing_capacity` (integer from 1 to 8) and `accommodation_mode` (`'private'` or `'shared'`).
3. **Physical Room Units:** Front-desk check-in, key handover, and occupancy operations allocate discrete physical rooms (`property_room_id`), not beds.

---

## 2. Canonical Category Architecture

Accommodations are strictly classified into exactly 3 canonical categories:
1. `hostels-pg`: Hostels and Paying Guest accommodations with optional communal dining.
2. `homestays`: Residential guest homes providing local hospitality.
3. `co-living`: Community-driven spaces with flexible stays and shared amenities.

All other historical strings (such as `independent-hostel`, `pg-accommodation`, `coliving`, `hotels`) are validated and normalized via `src/constants/categories.ts`.

---

## 3. Physical Room Inventory Operations

As implemented in `apps/mobile/app/(partner)/properties/[id]/rooms.tsx`:
- **Attributes:** Each room records `room_number` (string, max 32 chars), `floor_number`, `wing_name`, and its parent `property_room_type_id`.
- **Operational Statuses:**
  * `active`: Ready for guest allocation and regular turnover.
  * `maintenance`: Under repairs, painting, or sanitization; excluded from guest allocation.
  * `blocked`: Temporarily held for private use.
  * `inactive`: Decommissioned.
- **Status Filtering:** Fast filtering tabs allowing front-desk staff to isolate rooms needing maintenance or immediate cleaning.

---

## 4. Rate Plans, Pricing Readiness & Minor Unit Safety

As implemented in `apps/mobile/app/(partner)/properties/[id]/pricing.tsx`:
- **Minor Unit Integrity:** All internal calculations and backend payloads use integer paise (`amount_minor`).
  * 1 Rupee = 100 Paise.
  * Example: Daily rate of ₹650 is submitted as `daily_rate_minor: 65000`.
- **Flexible Rate Cycles:** Supports `daily_rate_minor`, `weekly_rate_minor`, and `monthly_rate_minor` per room category.
- **Meal Inclusions:** Per-stay meal flags configured in the pricing submission:
  * `food_provided`: Master food service availability toggle.
  * `breakfast_included`: Morning breakfast included in tariff.
  * `lunch_included`: Afternoon lunch included in tariff.
  * `dinner_included`: Evening dinner included in tariff.
- **Pricing Readiness Evaluation:** Visual readiness indicator dynamically computes whether the accommodation meets the prerequisite pricing completeness to accept customer bookings.

---

## 5. Calendar Blackout & Availability Blocks

As implemented in `apps/mobile/app/(partner)/properties/[id]/availability.tsx`:
- **Scopes:**
  * `property`: Blackout entire accommodation (e.g. annual renovation).
  * `room_type`: Blackout an entire category (e.g. AC wing maintenance).
  * `physical_room`: Blackout an individual room (e.g. plumbing repairs in Room 204).
- **Block Types:** Maintenance, Owner Use, Seasonal Closure, Offline Booking.
- **Date Validation:** Enforces `end_date >= start_date` and validates date format `YYYY-MM-DD`.
- **Cancellation Safety:** Hosts can cancel active blocks with mandatory reason audit logging.
