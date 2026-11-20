# TIJUM Mobile Phase M10A.1 — Direct Pricing & Availability Blocks Report

**Document Reference:** `docs/mobile/M10A1_OWNER_DIRECT_PRICING_AND_AVAILABILITY_REPORT.md`  
**Milestone:** M10A.1 (Financial Integrity & Calendar Control)  
**Target Screens:** `(partner)/properties/[id]/pricing.tsx` & `(partner)/properties/[id]/availability.tsx`  
**Date:** November 20, 2026  
**Status:** **COMPLETE & VERIFIED**

---

## 1. Direct Pricing Architecture & Implementation

Milestone M10A.1 finalized the implementation of Phase 09A Direct Room-Type Pricing within the mobile client.

### 1.1 Canonical Screen Naming & Route Anchoring
- **Screen File:** `apps/mobile/app/(partner)/properties/[id]/pricing.tsx`
- **Canonical Header Title:** **"Pricing & Meal Settings"**
- **Property Management Navigation:** Card action chip labeled **"Pricing"** (replacing "Rates")

### 1.2 Integer Paise Currency Standard
To eliminate currency precision bugs and rounding drift, all financial computations and storage use integer paise (1 INR = 100 paise):
- `daily_rate_minor`: Daily stay rate in paise (e.g., ₹1,200 = `120000`).
- `weekly_rate_minor`: Weekly stay rate in paise (e.g., ₹7,500 = `750000`).
- `monthly_rate_minor`: Monthly stay rate in paise (e.g., ₹26,000 = `2600000`).

Mobile text inputs present rates in standard Rupees (₹) to hosts, and convert transparently to integer minor units on submit:
```typescript
const payload = {
    room_types: roomTypes.map((rt) => ({
        room_type_id: rt.id,
        daily_rate_minor: Math.round(Number(rt.dailyRate) * 100),
        weekly_rate_minor: Math.round(Number(rt.weeklyRate) * 100),
        monthly_rate_minor: Math.round(Number(rt.monthlyRate) * 100),
    })),
    food_provided: isFoodProvided,
    breakfast_included: breakfastIncluded,
    lunch_included: lunchIncluded,
    dinner_included: dinnerIncluded,
};
```

### 1.3 Independent Meal Configuration
Meal flags are managed directly on the property level as canonical independent booleans conforming to the database schema. They represent inclusions, not extra billable add-ons:
- `food_provided`: Master switch for meal service.
- `breakfast_included`, `lunch_included`, `dinner_included`: Specific meal inclusions.

Zero surcharge is added to guest quotes for meals when flags are enabled.

---

## 2. Calendar Blackout & Availability Blocks

The availability management screen (`apps/mobile/app/(partner)/properties/[id]/availability.tsx`) allows hosts to place temporary holds and blackout ranges on inventory.

### 2.1 Block Scope Hierarchy
Partners can restrict availability across three granular tiers:
1. **Entire Property (`property`):** Completely shuts down the property for all dates in the range (e.g., full facility renovation or off-season closure).
2. **Specific Room Type (`room_type`):** Shuts down a specific category while leaving other room types open.
3. **Discrete Physical Room (`physical_room`):** Blocks a single room (e.g., Room 102 repainting) while all other rooms in the category remain bookable.

### 2.2 Operational Block Types
- `maintenance`: Physical repair, painting, pest control, or infrastructure maintenance.
- `owner_use`: Host personal occupancy or family stay.
- `seasonal_closure`: Off-season operational pause.
- `offline_booking`: Room booked walk-in or through partner's offline channel.

### 2.3 Date-Range Conflict Prevention
When a block is created via `OwnerApi.createAvailabilityBlock()`, the backend executes inside an InnoDB transaction with `lockForUpdate()`:
1. Validates that `start_date <= end_date`.
2. Checks for conflicting confirmed or checked-in reservations within the date range. If overlapping guest stays exist, the block is rejected with HTTP 422: *"Cannot block dates containing confirmed guest reservations."*
3. Checks for overlapping existing availability blocks for the same scope.

### 2.4 Cancellation of Blocks
Partners can cancel active blocks with one tap via `OwnerApi.cancelAvailabilityBlock(propertyId, blockId)`, calling `DELETE /api/v1/owner/properties/{id}/availability-blocks/{blockId}`, immediately returning the inventory to the public marketplace.
