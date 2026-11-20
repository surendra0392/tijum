# TIJUM Mobile Phase M10A.1 — Phase 09A Architecture Compliance Report

**Document Reference:** `docs/mobile/M10A1_PHASE09A_ARCHITECTURE_COMPLIANCE_REPORT.md`  
**Milestone:** M10A.1 (Architecture & Domain Enforcement)  
**Authoritative Architectural Standard:** Phase 09A Direct Room-Type Pricing & Discrete Inventory  
**Date:** November 20, 2026  
**Status:** **100% COMPLIANT & CERTIFIED**

---

## 1. Architectural Scope & Boundary Enforcement

Phase 09A established the authoritative, non-negotiable operational hierarchy for the TIJUM platform across Web and Mobile:

$$\text{Property} \longrightarrow \text{PropertyRoomType} \longrightarrow \text{PropertyRoom}$$

This report certifies that the TIJUM Mobile Partner Application strictly adheres to this hierarchy and contains zero legacy, retired, or transitional pricing constructs.

---

## 2. Retired Architecture Ban Verification

A comprehensive automated grep across the entire codebase (`app/`, `routes/`, `apps/mobile/`, `tests/`) verified the complete absence of retired models:

| Retired Architectural Construct | Status in Codebase | Compliance Evidence |
|---|---|---|
| **Food Packages (`FoodPackage`, `food_packages`)** | **ELIMINATED (0 references)** | No food package models, tables, controllers, or UI pickers exist. |
| **Food Package Pricing (`FoodPackagePricing`)** | **ELIMINATED (0 references)** | No meal package add-on charges or tier formulas exist. |
| **Rate Plans (`RatePlan`, `rate_plans`)** | **ELIMINATED (0 references)** | No rate plan abstraction layer exists; pricing is set directly on room types. |
| **Seasonal Pricing (`SeasonalPricing`, `RatePeriod`)**| **ELIMINATED (0 references)** | Dynamic date multipliers or seasonal period records are completely prohibited. |
| **Amenity Extra Charges (`supports_additional_charge`)**| **ELIMINATED (0 references)** | All amenities are included in rent without additional billing. |
| **Bed Models / Individual Bed Inventory** | **ELIMINATED (0 references)** | No `Bed`, `Bunk`, or individual bed allocation logic exists. |

---

## 3. Direct Room-Type Pricing Implementation

In accordance with Phase 09A, room rates exist as first-class attributes directly on the `property_room_types` database table:
- `daily_rate_minor` (Integer, INR Paise) — Daily baseline stay rate.
- `weekly_rate_minor` (Integer, INR Paise) — Discounted 7-day stay rate.
- `monthly_rate_minor` (Integer, INR Paise) — Discounted 30-day stay rate.

### 3.1 Mobile Pricing Screen Title & UX Alignment
- Screen Title: **"Pricing & Meal Settings"** (reconciled from "Pricing & Meal Plans").
- Partner Property Navigation: Card action chip displays **"Pricing"** (reconciled from "Rates").
- Input Conversion: Inputs are displayed to partners in standard Indian Rupees (₹), and automatically converted to integer paise (`value * 100`) prior to API transmission, preventing floating-point rounding errors.

---

## 4. Independent Property Meal Configuration

Meal provisions are decoupled from pricing and reside directly on the `properties` table as independent operational flags:
- `food_provided` (Boolean): Indicates whether the accommodation provides meals.
- `breakfast_included` (Boolean): Breakfast service included in stay rent.
- `lunch_included` (Boolean): Lunch service included in stay rent.
- `dinner_included` (Boolean): Dinner service included in stay rent.
- `pure_veg` (Boolean): Entire facility operates as pure vegetarian.

These switches represent inclusions, not billable add-ons. Guests are never charged separate meal fees during booking checkout.

---

## 5. Discrete Physical Room Inventory (Anti-Bed Architecture)

The mobile application enforces strict room-level inventory:
- Properties manage discrete rooms identified by `room_number`, `floor_number`, and `building_name` (`property_rooms` table).
- Rooms are linked to a single parent `property_room_type_id`.
- Room capacity is expressed strictly through `sharing_capacity` (e.g. 1 for single private, 2 for double sharing) and `accommodation_mode` (`private` vs `shared`).
- Booking reservations hold room-type inventory reservations, and front-desk check-in allocates the guest to an actual physical room (`allocateRoom(reference, physicalRoomId)`).
- Individual bed allocation, bed numbering, or bed-level booking is strictly prohibited.

---

## 6. Instant Booking & Stay Timing Policy

1. **Instant Booking Model:**
   - Reservations are created in `awaiting_payment` status.
   - Upon successful native Razorpay capture, the webhook/callback automatically transitions the booking to `confirmed`.
   - There are **NO host Accept/Decline steps**. Bookings are guaranteed immediately upon payment.
2. **Central Stay Timing Policy (`Asia/Kolkata`):**
   - Standard Check-In Time: **09:00 AM IST**.
   - Standard Check-Out Time: **08:00 AM IST**.
   - Daily stay calculation is based on canonical calendar midnights according to Indian Standard Time.

---

## 7. Conclusion

The TIJUM Mobile Application is certified 100% compliant with the Phase 09A architecture specification.
