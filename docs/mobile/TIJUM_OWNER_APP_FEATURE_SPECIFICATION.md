# TIJUM Partner Mobile Application Feature Specification

**Document Reference:** `docs/mobile/TIJUM_OWNER_APP_FEATURE_SPECIFICATION.md`  
**Application Scope:** `apps/mobile/app/(partner)/` and `(auth)/owner-*`  
**Framework:** React Native 0.83.10 / Expo SDK 55 (Expo Router 55, React 19.2.0)  
**Target Audience:** Accommodation hosts, property managers, and front-desk operators  
**Date:** November 20, 2026 (Phase M10A Reconciled & Certified)  
**Status:** **ACTIVE, COMPLETE & VERIFIED**

---

## 1. Feature Overview

The Partner Mobile Application empowers accommodation hosts across Andhra Pradesh & Telangana to run end-to-end property operations directly from native Android and iOS devices. The application supports property onboarding, room type configuration, physical room inventory management, rate plans and pricing, calendar availability blocking, instant reservation front-desk operations (check-in, check-out, room allocation), guest review replies, financial settlements, and profile security.

---

## 2. Core Operational Modules

### 2.1 Partner Authentication & Onboarding
- **Partner Login (`app/(auth)/owner-login.tsx`):**
  - Sign in using host email or phone + password.
  - "Forgot Password?" dialog providing host email password reset via `PublicApi.forgotPassword(email, 'owner')`.
- **Partner Registration (`app/(auth)/owner-register.tsx`):**
  - 10-field host onboarding registration:
    * Legal business entity name & display name.
    * Primary contact person name & phone.
    * Operating city & property locality.
    * Accommodation type selector (Hostels/PG, Homestay, Co-Living).
    * Initial room inventory count.

### 2.2 Operational Dashboard
- **KPI Metrics (`(partner)/dashboard.tsx`):**
  - Total active listings count.
  - Occupancy rate percentage across active rooms.
  - Incoming guest check-ins scheduled for today.
  - Scheduled check-outs requiring room turnover.
  - Unsettled partner payouts in paise.
  - Quick action card navigating directly to Guest Reviews management.

### 2.3 Property Lifecycle & Onboarding Wizard
- **Property Listing (`(partner)/properties/index.tsx`):**
  - Displays all partner properties with verification and operational status badges.
  - Action chips for instant sub-management: Edit Stay, Room Types, Rooms, Rates, Blocks.
  - "+ Add Stay" button launching the property onboarding wizard.
  - Physical room inventory inspection modal via `OwnerApi.getPropertyRooms()`.
- **Property Onboarding Wizard (`(partner)/properties/create.tsx`):**
  - 5-step guided creation flow:
    1. **Category:** Selection among the 3 canonical categories (`hostels-pg`, `homestays`, `co-living`).
    2. **Overview:** Property name, description, gender policy, guest composition.
    3. **Location:** Operating city picker, locality/area, full street address, pincode, optional coordinates.
    4. **Meals:** Food provided toggle, included meal services (breakfast, lunch, dinner), pure vegetarian toggle.
    5. **Declaration:** Host declaration confirmation before submission.
  - Submits to `OwnerApi.createProperty()` and redirects to property management hub.
- **Property Details & Verification Application (`(partner)/properties/[id]/edit.tsx`):**
  - Edit property name, description, category, and address details via `OwnerApi.updateProperty()`.
  - Live verification checklist evaluation via `OwnerApi.getVerificationStatus()`.
  - One-tap verification submission via `OwnerApi.submitVerification()` once prerequisites are satisfied.

### 2.4 Room Type Category Management
- **Room Types Screen (`(partner)/properties/[id]/room-types.tsx`):**
  - Lists all room types belonging to the property with sharing capacity, AC/Non-AC badges, and active state.
  - **Add / Edit Room Type Modal:**
    * Accommodation mode: Private room vs Shared room.
    * Sharing capacity (1 to 8 guests per room).
    * Total rooms in this category.
    * Base occupancy and maximum occupancy limits.
    * Air conditioning (AC) toggle and early check-in support toggle.
    * Specific room-type gender policy and guest composition overrides.
  - Activates/deactivates room types via `OwnerApi.deleteRoomType()` (safe soft delete / deactivation).
  - Strict Anti-Bed Architecture: No bed models or individual bed allocation allowed.

### 2.5 Physical Room Inventory Management
- **Physical Rooms Screen (`(partner)/properties/[id]/rooms.tsx`):**
  - Lists all discrete physical rooms categorized by floor number, wing name, and room number.
  - Operational status filtering: *All*, *Active*, *Maintenance*, *Blocked*, *Inactive*.
  - **Add / Edit Room Modal:**
    * Discrete room number (e.g., "101", "A-204").
    * Room type association.
    * Floor number and building/wing name.
  - **Quick Operational Status Change Modal:**
    * Instantly mark rooms as Active, Maintenance, Blocked, or Inactive via `OwnerApi.updateRoomStatus()`.

### 2.6 Pricing, Rate Plans & Meal Inclusions
- **Rate Plans Screen (`(partner)/properties/[id]/pricing.tsx`):**
  - Real-time pricing readiness indicator (Not Ready, Incomplete, Ready for Booking).
  - Configures daily, weekly, and monthly rates per room type.
  - Currency safety: Inputs handled in Rupees (₹) and transmitted as integer paise (`*_rate_minor`).
  - Meal configuration switches: Food provided toggle, breakfast included, lunch included, dinner included.
  - Submits to `OwnerApi.updatePricing()` transactionally.

### 2.7 Availability Blocks & Blackout Dates
- **Availability Screen (`(partner)/properties/[id]/availability.tsx`):**
  - Displays active and upcoming blackout blocks on the property calendar.
  - **Create Availability Block Modal:**
    * Block Scope: Entire Property, Specific Room Type, or Discrete Physical Room.
    * Block Type: Maintenance, Owner Use, Seasonal Closure, or Offline Booking.
    * Start date and end date picker (YYYY-MM-DD).
    * Reason description.
  - **Cancel Block Action:**
    * Cancels existing blocks safely with confirmation via `OwnerApi.cancelAvailabilityBlock()`.

### 2.8 Front-Desk Operations & Reservation Management
- **Reservations List (`(partner)/reservations/index.tsx`):**
  - Filter by lifecycle status: *All*, *Confirmed*, *Checked In*, *Checked Out*, *Cancelled*.
  - Search by guest name, phone, or booking reference.
- **Stay Details & Front-Desk Actions (`(partner)/reservations/[reference].tsx`):**
  - **Room Allocation:** For confirmed stays without assigned rooms, opens physical room selector and calls `OwnerApi.allocateRoom()`.
  - **Guest Arrival & Check-In Action:** Hand over keys, optional notes, calls `OwnerApi.checkInReservation()` to transition to `checked_in`.
  - **Guest Departure & Check-Out Action:** Inspect room, optional notes, calls `OwnerApi.checkOutReservation()` to transition to `checked_out`.
  - **Timestamps & Audit Trail:** Displays `checked_in_at` and `checked_out_at` timestamps.

### 2.9 Partner Settlements & Financials
- **Settlements Hub (`(partner)/settlements/index.tsx`):**
  - Financial summary card: Total earnings, processed payouts, pending payouts in INR.
  - Settlement payout batches list with status chips (Processing, Paid, Failed).
  - Payout reference ID, bank account mask, processing dates, and net payout amounts.

### 2.10 Partner Review Management
- **Reviews Hub (`(partner)/reviews/index.tsx`):**
  - Lists guest reviews across all owned accommodations querying `OwnerApi.getReviews()`.
  - Displays overall rating and 4 subcategory breakdowns (Cleanliness, Food & Dining, Communication, Value).
  - Review Response Modal with 2,500-character counter submitting via `OwnerApi.replyToReview()`.

### 2.11 Account Profile & Security Settings
- **Partner Account (`(partner)/account.tsx`):**
  - Update host full name and contact phone number.
  - Password change modal with validation (min 8 chars).
  - Secure sign-out clearing stored tokens.
