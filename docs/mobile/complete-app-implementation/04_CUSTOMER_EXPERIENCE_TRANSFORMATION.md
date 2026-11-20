# TIJUM Mobile — Customer Experience Transformation & Architecture
**Milestone:** Complete Mobile Application UI/UX Transformation & Implementation  
**Document ID:** `docs/mobile/complete-app-implementation/04_CUSTOMER_EXPERIENCE_TRANSFORMATION.md`  
**Generated At:** 2026-11-20  
**Target Codebase:** `apps/mobile/app/(customer)` & `apps/mobile/src`  
**API Parity:** Full Integration with `/api/v1` Customer and Public Endpoints

---

## 1. Customer Persona Journey Overview

The TIJUM Customer application experience is engineered for students, working professionals, and relocators across South India who require verified accommodations with crystal-clear food and meal arrangements.

The end-to-end customer journey comprises six core phases:
1. **Discovery & Search:** Locality filtering, canonical accommodation category selection, and meal inclusion verification.
2. **Stay Inspection:** Photographic inspection, house rules, timing policy verification, and room category selection.
3. **Transparent Booking & Pricing:** Minor paise rate calculation, coupon discount precedence, loyalty points redemption, and 15-minute inventory hold.
4. **Secure Gateway Payment:** Razorpay payment execution and server-side HMAC-SHA256 signature verification.
5. **Active Stay Management & Check-In:** Front-desk booking reference code, meal schedule tracking, and stay status progression.
6. **Customer Protection & Grievance Redressal:** Transparent SLA guarantees, helpline access, and structured grievance resolution.

---

## 2. Discovery, Search & Filtering Architecture (`explore/index.tsx`)

### 2.1 Canonical Category Architecture
TIJUM strictly consolidates all property listings into three approved canonical categories:
- **`hostels-pg` (Hostel & Paying Guest):** Tailored for single students and workers, offering shared or private rooms with structured meal options.
- **`homestays` (Homestay):** Tailored for families and cultural travelers staying with verified local families.
- **`co-living` (Co-Living Spaces):** Modern community-driven shared living spaces with co-working and amenities.

Category selection is executed via `CategoryCard.tsx` and horizontal pill selector tabs in `explore/index.tsx`. Client-side normalization via `normalizeCategorySlug()` ensures that any legacy category strings from older database seeds resolve cleanly into one of the three canonical categories.

### 2.2 Strict Date Validation & Capacity Filtering
The search engine enforces public search validation:
- Check-in and check-out dates are validated against current date boundaries (rejecting inverted dates where checkout is before check-in, or past dates).
- Capacity queries enforce `ReservationAvailabilityService::stayCapacity` so customers only see properties with sufficient available room capacity.

### 2.3 Transparent Food Inclusions Filtering
Customers can filter properties by meal inclusions:
- `Breakfast Included` (`filters.breakfast = true`)
- `Lunch Included` (`filters.lunch = true`)
- `Dinner Included` (`filters.dinner = true`)
- `AC Only` (`filters.ac = true`)
- `Gender Preference` (`filters.gender = 'male' | 'female' | 'all'`)

---

## 3. Property Details & Inclusions (`explore/property/[slug].tsx`)

### 3.1 Transparent Food & Meals Disclosure
The property details screen renders the authoritative food inclusions card:
- Master flag `food_provided`: If false, the card explicitly declares *"Room Only / No Food Provided"*.
- If `food_provided` is true, the card displays individual badges for **Breakfast**, **Lunch**, and **Dinner**, indicating whether each is included in the base rate or available on-demand, along with daily meal serving hours.
- If food is provided but no specific meals are bundled in the base tariff, a clear amber notice states: *"Food and kitchen facilities are available on-premise, but meals are not included in the base room rate."*

### 3.2 House Rules & Timing Policy Badge
Every property explicitly renders the TIJUM Standard Timing Policy via `StayTimingBadge.tsx`:
- **Standard Check-In:** `09:00 AM`
- **Standard Checkout:** `08:00 AM`
- Clear declaration prevents check-in disputes and aligns with hostel turnover schedules.

### 3.3 Interactive Photo Gallery Modal
The screen provides an interactive photo gallery modal (`galleryModalOverlay`) accessible via the cover photo badge (`galleryTriggerBadge`). The gallery features a full-screen image viewer, thumbnail strip navigation (`galleryThumbsScroll`), and category filters (All, Rooms, Dining, Exterior).

---

## 4. Booking Lifecycle & Financial Integrity (`bookings/create.tsx`)

### 4.1 Minor Paise Pricing Engine
All monetary rates are quoted and calculated in integer paise:
$$\text{Total Payable (paise)} = \text{Base Amount} - \text{Coupon Discount} - \text{Points Discount} + \text{Taxes (paise)} + \text{Deposit (paise)}$$

### 4.2 Promotion & Precedence Mechanics
Promotions are evaluated in strict priority order:
1. **Coupon Discount:** Applied first to the base accommodation tariff (percentage or fixed amount, capped at `max_discount_paise`).
2. **Points Redemption:** Applied second to the remaining balance. Points cannot exceed the discounted subtotal.
3. **First-Expiring, First-Out (FEFO):** Points are redeemed from the earliest expiring promotional lots first.

### 4.3 15-Minute Inventory Hold & Server-Side Payment
Upon initiating a booking, a 15-minute temporary reservation hold is established on the selected room category. The screen renders an active countdown timer. Payment is executed via Razorpay and verified by the backend using HMAC-SHA256 signature validation before advancing to `confirmed`.

---

## 5. Active Stay, Review & Refund Tracking (`bookings/[reference].tsx`)

### 5.1 Front-Desk Check-In Reference Code
Confirmed bookings display the unique Booking Reference ID (e.g., `TIJ-202611-ABCD`), guest profile summary, and check-in instructions.

### 5.2 Four-Subcategory Guest Review Submission
Upon stay completion (`completed` or `checked_out`), customers can submit reviews via the integrated review modal with 1–5 star ratings across four canonical subcategories:
1. **Food Quality & Timeliness**
2. **Cleanliness & Hygiene**
3. **Amenities & Room Comfort**
4. **Value for Money**

### 5.3 Cancellation & Refund Stepper
For cancelled bookings, the screen displays a dedicated *Cancellation & Refund Tracking* card:
- Displays cancellation timestamp and recorded reason.
- Renders itemized refund amounts in INR (`refundAmountText`).
- Displays gateway processing status (`processed`, `pending`) and the official **Bank UTR / Ref** identifier (`Bank UTR / Ref: refItem.utr`).

---

## 6. Customer Protection SLA & Grievance Desk (`support/index.tsx`)

### 6.1 Multi-Tier SLA Framework
The customer protection desk displays the authoritative SLA targets:
- **Urgent Priority:** 2 hours first action target (Safety, harassment, complete lockout).
- **High Priority:** 4 hours first action target (Meal denial, room unhygienic, major amenity failure).
- **Medium Priority:** 24 hours first action target (Billing inquiry, general maintenance).
- **Low Priority:** 48 hours first action target (General feedback, profile inquiries).
- **Statutory Acknowledgement:** 48 hours formal written acknowledgement.
- **Statutory Resolution:** 30 days statutory resolution window pursuant to Consumer Protection rules.

### 6.2 Dual Support Desk Channels
- **Contact Inquiry Tab:** Direct messaging for pre-booking questions with 4-hour operational response targets.
- **Booking Grievance Tab:** Formal ticket submission with booking reference link and real-time case timeline tracking.
- **Direct Official Channels:** One-tap calling to `+91 81423 34033` and email to `support@tijum.com` operating 9:00 AM – 9:00 PM IST (Mon–Sat).
