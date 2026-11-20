# TIJUM Mobile Phase M10C — Customer & Owner Operational Acceptance

**Milestone:** M10C — Native Mobile Release Readiness & Production Acceptance  
**Status:** COMPLETE & VERIFIED  
**Auditor:** Lead Mobile Architect & Antigravity Swarm  
**Customer Operational Screens:** 15 screens  
**Partner Operational Screens:** 22 screens  

---

## 1. Customer Operational Workflows

### 1.1 Discovery, Search & Category Consolidation
- **Canonical Categories:** Consolidated strictly into 3 marketplace categories:
  1. `hostels-pg` (Hostels & PG)
  2. `homestays` (Homestays & Villas)
  3. `co-living` (Co-living Spaces)
- **Search Filters:**
  - Gender preference: `all`, `male`, `female`, `unisex` (properly mapped to backend query parameter `gender`).
  - Price bounds: min and max nightly rate filters.
  - City selector & autocomplete: Geocoded city listing with real property counts.
- **Wishlist Heart State:** Optimistic toggling synchronized with `/api/v1/customer/wishlist`.

### 1.2 Room Selection & Transparent Food Disclosures
- **Canonical Food Model (Phase 09A Compliance):**
  - Evaluated on four independent booleans: `food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`.
  - Truth-in-advertising copy: Explicitly details exactly which meals are included rather than asserting generic "All Meals Free" marketing claims.
- **Direct Room-Type Pricing Display:**
  - Clearly renders rates based on booking duration: daily rate, weekly rate (where applicable), and monthly rate (where applicable).

### 1.3 Promotions, Loyalty & Rewards Ecosystem
- **Coupon & Points Precedence:**
  1. Fixed amount or capped percentage coupons applied first.
  2. Points redeemed against post-coupon discounted subtotal (preventing sub-zero subtotals).
- **FEFO (First-Expiring, First-Out) Engine:** Ledger displays expiring points with early warning banners.
- **Referral Mechanics:** Native share sheet integration; reward release explicitly conditioned on guest stay completion.

### 1.4 Post-Booking, Front-Desk & Dispute Lifecycle
- **Self-Service Cancellation:** Transparent breakdown of cancellation fee vs refund estimate in accordance with property policy.
- **Review Submission:** 4 canonical subcategory ratings (`cleanliness`, `food_quality`, `staff_hospitality`, `amenities`) with 1–5 star boundaries and 10-character minimum content validation.
- **Customer Protection SLAs:** Priority-driven resolution targets (High: 4 hours, Medium: 12 hours, Low: 24 hours) displayed on dispute case cards and message threads.

---

## 2. Property Owner / Partner Operational Workflows

### 2.1 Partner Onboarding & Property Creation Wizard
- **10-Field Partner Registration:** Name, email, mobile, password, business name, registration type, address, city, state, pincode.
- **5-Step Property Creation Wizard:**
  1. Basic details & description
  2. Geocoded address & coordinates
  3. Canonical food flags & meal rules
  4. House rules, check-in/out policies
  5. Verification document uploads & submission

### 2.2 Direct Room-Type Pricing & Physical Inventory
- **Room-Type Direct Pricing:** Eliminates global property rate overrides; rates are managed directly at the room type level (`daily_rate_minor`, `weekly_rate_minor`, `monthly_rate_minor`).
- **Physical Room Inventory:**
  - Discrete tracking of physical room numbers (e.g., `Room 101`, `Room 102`).
  - Operational status management: `active`, `maintenance`, `cleaning`.
- **Availability Blocking:** Custom date-range blackouts for scheduled maintenance or offline reservations.

### 2.3 Front-Desk Operations
- **Physical Room Allocation Modal:** Scoped strictly to active, available rooms of the booked room type; prevents double-allocation or allocation of occupied units.
- **Check-In Execution:** Records guest arrival timestamp, identity verification confirmation, and front-desk notes.
- **Check-Out Execution:** Clears room assignment, marks unit for housekeeping turnover, and closes the active stay.

### 2.4 Partner Financial Operations & Agreements
- **Financial Profile:** Bank account number, IFSC code validation, PAN, and GSTIN details.
- **One-Tap Commission Agreement Acceptance:**
  - Electronically presents agreement terms and commission rate tier.
  - Captures authenticated Partner ID, SHA-256 hash of agreement terms, timestamp, server IP, and User-Agent.
- **Settlement Statements:**
  - Line-item transparency: Gross rental receipts, platform commission deduction, GST on commission (18%), TDS withholding (Section 194-O, 1%), and net payable amount.
  - Banking UTR and payout batch tracking.

### 2.5 Partner Reviews & Support Cases
- **Review Response Modal:** Allows partner to submit an official response (with 2,500 character counter) to verified guest reviews.
- **Case Management:** Responsive messaging interface for guest disputes and platform support tickets.

---

## 3. Operational Verification Conclusion

**GATE VERDICT: PASS**  
Every Customer and Owner operational workflow operates against production backend contracts without stubs, dead ends, or simulated state.
