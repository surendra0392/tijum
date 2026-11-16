# TIJUM PLATFORM BUSINESS RULES & DOMAIN INVARIANTS

**Document Reference:** `TIJUM-BR-V1.0-2026`  
**Status:** Authoritative / Fully Implemented  
**Platform Version:** Laravel 13.42.0 | PHP 8.4.27 | MySQL 8.0  
**Scope:** Universal across Web, Mobile API, Partner Portal, and Administrative System  

---

## 1. ACCOMMODATION CATEGORY SYSTEM

TIJUM operates with strictly **three canonical accommodation categories**. Any reference to legacy categories (such as standalone "hostel", "pg", "guest-house", "hotel", or "resort") has been eliminated across all database tables, models, API contracts, and user interfaces.

| Category Name | Canonical Slug | Target Audience | Key Service Profile |
| :--- | :--- | :--- | :--- |
| **Hostels & PG** | `hostels-pg` | Students, entry-level professionals, long/short-stay budget guests | Shared dorms, private rooms, mess food options, strict security |
| **Homestays** | `homestays` | Families, leisure travellers, cultural tourists, relocators | Local host hosting, home-cooked food, private houses/rooms |
| **Co-Living** | `co-living` | Tech professionals, remote workers, digital nomads | High-speed Wi-Fi, community spaces, flexible tenures, furnished rooms |

### Rules & Invariants:
1. **Database Constraint:** Category slugs are constrained to `hostels-pg`, `homestays`, and `co-living`. Foreign keys link `properties.category_id` to `categories.id`.
2. **Search & Filters:** Public search endpoints accept `category` slug or ID. Any query for legacy categories automatically returns HTTP 301 redirect or falls back to `hostels-pg`.
3. **Property Registration:** Partners registering properties must choose exclusively from one of the three active categories.

---

## 2. INVENTORY & ROOM ALLOCATION ARCHITECTURE

TIJUM implements a decoupled, two-tier inventory architecture:
$$\text{Property} \longrightarrow \text{Room Type} \longrightarrow \text{Physical Rooms}$$

1. **Room Types (Sellable Capacity):**
   - Represents the commercial tier (e.g., "Deluxe AC Private Room", "4-Sharing Standard Bed").
   - Governs pricing, occupancy limits, amenities, meal inclusions, and total capacity.
   - Holds the total inventory count (`total_rooms`).
2. **Physical Rooms (Operational Tracking):**
   - Individual physical rooms with room numbers/names (e.g., "Room 101", "Room 204B").
   - Maintains physical maintenance status (`clean`, `inspected`, `maintenance`).
   - Assigned to specific reservations **after** booking confirmation.
3. **No Customer Bed Allocation:**
   - Customers never select or see specific physical room numbers during booking.
   - Availability is calculated dynamically at the Room Type level based on overlapping confirmed reservations and active 15-minute temporary holds:
     $$\text{Available Rooms} = \text{Total Rooms} - (\text{Confirmed Overlaps} + \text{Active Unexpired Holds})$$
4. **Owner Room Allocation:**
   - Property owners assign a physical room from their owner portal at any point after payment confirmation and before check-in.

---

## 3. RESERVATION LIFECYCLE & BOOKING WORKFLOW

TIJUM enforces an **instant booking with automated payment verification** model. Property owners do not pre-approve or gate reservations prior to payment.

```
[Customer Selects Dates] 
       │
       ▼
[Atomic Inventory Hold (15 Min)] ──(No Payment / Timeout)──► [Hold Expired / Released]
       │
       ▼
[Razorpay Order Created]
       │
       ▼
[Customer Completes Payment]
       │
       ▼
[Webhook / Verify API] ──(Signature Valid & Amount Matches)
       │
       ├─────────────────────────────────────────┐
       ▼                                         ▼
[Status: Confirmed]                   [Internal Inventory Committed]
       │                                         │
       ├─────────────────────────────────────────┤
       ▼                                         ▼
[Dispatch Notifications]              [Owner Assigns Physical Room]
(Customer + Partner via WhatsApp/SMS)
```

### Lifecycle States:
- `hold`: 15-minute temporary inventory reservation. Prevents double-booking during checkout.
- `awaiting_payment`: Payment gateway order created, awaiting customer authorization.
- `confirmed`: Payment verified via webhook or callback. Reservation is fully locked.
- `cancelled`: Cancelled by customer or admin according to cancellation policies.
- `completed`: Checkout completed; customer is eligible for loyalty points and review submission.
- `expired`: Hold lapsed after 15 minutes without payment.

---

## 4. CHECK-IN, CHECK-OUT & EARLY ARRIVAL TIMINGS

TIJUM enforces standardized operational hours across all properties:

| Event | Standard Time | Policy & Financial Terms |
| :--- | :--- | :--- |
| **Standard Check-in** | `09:00 AM` | Property access begins. |
| **Standard Check-out** | `08:00 AM` | Guests must vacate rooms for housekeeping. |
| **Early Arrival Request** | `07:00 AM` | **Request-only, subject to availability. NO SURCHARGE / ₹0 FEE.** |

### Rules & Invariants:
1. **Zero Early Arrival Surcharge:** Under no circumstances does TIJUM levy a surcharge, fee, or penalty for 07:00 AM early arrival requests. Any pricing calculator or quote adding early arrival fees is strictly prohibited.
2. **Operational Request Flag:** Early arrival is recorded as an operational preference (`early_arrival_requested: true`) in the reservation metadata so the property host can prepare housekeeping.

---

## 5. FOOD & MEAL PROVISIONING

Meal plans and dining arrangements are configured per Room Type using dedicated boolean flags:

| Flag Name | Description | Category Usage |
| :--- | :--- | :--- |
| `meals_included` | Master flag indicating food service is included in tariff | All categories |
| `breakfast_included`| Morning meal included | All categories |
| `lunch_included` | Afternoon meal included | Hostels/PG, Homestays |
| `dinner_included` | Evening meal included | Hostels/PG, Homestays |
| `kitchen_access` | Shared or private kitchen available for guest cooking | Homestays, Co-Living |

---

## 6. PRICING, CURRENCY & INTEGER ARITHMETIC

All monetary values across TIJUM are denominated in Indian Rupees (INR) and stored internally as **integer paise** ($1\text{ INR} = 100\text{ paise}$).

### Strict Financial Invariants:
1. **No Floating-Point Money Math:** Floating-point operations (`float`, `double`, `round()`) on currency are strictly forbidden. All fee calculations, taxes, discounts, and payouts use integer division (`intdiv` or floor integer math) to prevent 1-paise rounding leaks.
2. **Pricing Structure:**
   $$\text{Gross Amount} = (\text{Base Rate} \times \text{Nights}) + \text{Add-ons}$$
   $$\text{Platform Discount} = \text{Coupon Discount} + \text{Points Redeemed}$$
   $$\text{Payable Amount} = \text{Gross Amount} - \text{Platform Discount} + \text{Taxes} + \text{Convenience Fee}$$
3. **Tax Calculation:** GST rates (5%, 12%, or 18%) apply to the payable room tariff in compliance with Indian Goods and Services Tax regulations.

---

## 7. PARTNER SETTLEMENTS & FINANCIAL PROTECTIONS

TIJUM protects partner earnings against platform-funded growth discounts.

### Invariants:
1. **Platform-Funded Promotions:** Coupons and loyalty point redemptions funded by TIJUM do **not** reduce the partner's agreed gross tariff.
2. **Settlement Formula:**
   $$\text{Partner Base} = \text{Gross Room Tariff} (\text{agreed contracted rate})$$
   $$\text{Platform Commission} = \text{Partner Base} \times \text{Commission Rate (e.g., 10\%)}$$
   $$\text{TDS (1\% Section 194-O)} = \text{Partner Base} \times 1\%$$
   $$\text{Net Partner Payout} = \text{Partner Base} - \text{Platform Commission} - \text{TDS}$$
3. **Settlement Payout:** Automated through Razorpay Route transfers directly to partner linked bank accounts following successful guest check-in.

---

## 8. CUSTOMER PROTECTION & GRIEVANCE REDRESSAL

TIJUM provides a 100% verified stay guarantee:

1. **4-Hour SLA:** Any grievance case raised by a customer regarding room condition, misrepresentation, or unavailability must receive an admin triage within 4 hours.
2. **Relocation Guarantee:** If a property is uninhabitable or fails verification, TIJUM relocates the guest to an equivalent or superior partner property in the same locality at no extra cost to the guest.
3. **Escrow Hold:** Partner settlement is automatically placed on financial hold while an active grievance case is pending.

---

## 9. VERIFIED REVIEWS & REPUTATION ENGINE

1. **Eligibility:** Only customers with a `completed` reservation may submit a review.
2. **14-Day Window:** Reviews must be submitted within 14 calendar days following checkout.
3. **Owner Response:** Property owners may post a single public response to a verified review. Editing of responses is logged for moderation.

---

## 10. REWARDS, COUPONS & LOYALTY POINTS ECOSYSTEM

1. **Points Only (No Cash):** TIJUM points have no cash exchange value and cannot be withdrawn to bank accounts. They are redeemable solely as credits against qualifying bookings.
2. **Point Valuation:** $1\text{ TIJUM Point} = ₹1.00\text{ (100 paise)}$.
3. **Redemption Limits:** Redemptions are capped at a maximum of 50% of the payable room subtotal (configurable via Admin `rewards_settings`).
4. **Referral Reward Qualification:**
   - Referrer receives reward points only **after** the referee's first booking reaches `completed` status.
   - Fraud prevention prevents self-referrals via matched mobile numbers, device IDs, or IP subnets.
