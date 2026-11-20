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

### 2.6 Direct Room-Type Pricing & Meal Settings
- **Pricing & Meal Settings Screen (`(partner)/properties/[id]/pricing.tsx`):**
  - Canonical Screen Title: **"Pricing & Meal Settings"**.
  - Direct room-type pricing hierarchy: Direct integer paise values on `property_room_types` (`daily_rate_minor`, `weekly_rate_minor`, `monthly_rate_minor`).
  - Anti-Pattern Ban: Zero references to retired Food Packages, Rate Plans, Seasonal Pricing, or Amenity Additional-Charge Pricing.
  - Meal configuration flags: Independent boolean toggles directly on `properties` table (`food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`).
  - Pricing readiness evaluation: Dynamic validation that all active room types have positive rates.
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
  - Settlement payout batches list with status chips (Processing, Settled, Failed).
  - Tapping any settlement card navigates directly to the itemized statement breakdown.
- **Settlement Statement Breakdown (`(partner)/settlements/[reference].tsx`):**
  - Period dates, gross booking value, commission amount, GST on commission (inclusive/exclusive), statutory TDS withholding (Income-tax Act, 2025 Section 393(1) at 0.10% / ₹5L FY threshold exemption), and net payout.
  - Provider transfer ID / UTR tracking number.
  - Itemized reservation line items with stay dates, guest names, gross values, commission deductions, and net payable.

### 2.10 Partner Review Management
- **Reviews Hub (`(partner)/reviews/index.tsx`):**
  - Lists guest reviews across all owned accommodations querying `OwnerApi.getReviews()`.
  - Displays overall rating and 4 subcategory breakdowns (Cleanliness, Food & Dining, Communication, Value).
  - Review Response Modal with 2,500-character counter submitting via `OwnerApi.replyToReview()`.

### 2.11 Account Profile & Security Settings
- **Partner Account (`(partner)/account.tsx`):**
  - Update host full name and contact phone number.
  - Password change modal with validation (min 8 chars).
  - Direct navigation entry points to Financial Profile & KYC, Commission Agreements, and Support & Grievances.
  - Secure sign-out clearing stored tokens.

### 2.12 Property Media & Photograph Management
- **Media Gallery & Upload Screen (`(partner)/properties/[id]/media.tsx`):**
  - Full photo gallery with category filter chips (Exterior, Entrance, Reception, Common Area, Dining, Room Interior, Bathroom, Other).
  - Native file upload supporting camera and gallery images via multipart `FormData`.
  - Primary cover photo indicator and "Set as Cover" action.
  - Edit photo category and accessibility alt text.
  - Delete photograph with confirmation via `OwnerApi.deleteMedia()`.
  - Drag-and-drop / ordered gallery sequence reordering via `OwnerApi.reorderMedia()`.

### 2.13 Property Amenities Management
- **Amenities Management Screen (`(partner)/properties/[id]/amenities.tsx`):**
  - Total assigned amenities metric cards (Total, Approved, In Review).
  - Assigned amenities list with verification status badges (`Approved`, `Draft`, `Under Review`, `Rejected`).
  - Search and category filtering across catalogue sections (Safety, Facilities, Dining, Services).
  - Inclusion badge: All listed amenities are included in direct room-type pricing with zero additional charge.
  - Add Amenity Modal: Search approved catalogue, select amenity, add operational notes, and save via `OwnerApi.assignAmenity()`.
  - Remove / deactivate amenity assignment via `OwnerApi.deleteAmenity()`.

### 2.14 Financial Profile & Commission Agreements (Phase 15)
- **Financial Profile & Tax KYC Screen (`(partner)/financial-profile/index.tsx`):**
  - Legal business entity name and constitution selector (Individual, Partnership, LLP, Pvt Ltd, Public Ltd, Trust/Society).
  - Income Tax PAN validation (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`) and GSTIN recording.
  - Masked bank account display (`•••• •••• 1234`), bank name, and IFSC code.
  - Verification status badges and rejection reasons display if KYC action is required.
  - Settlement eligibility indicator (Active automatic weekly transfers vs Action required).
  - Modal form for updating legal business and banking information via `OwnerApi.updateFinancialProfile()`.
- **Commission Agreements Screen (`(partner)/financial-profile/agreements.tsx`):**
  - Lists contractual agreements querying `OwnerApi.getCommissionAgreements()`.
  - Displays commission percentage, base type (Gross Booking Value), GST treatment, terms version, and effective dates.
  - Electronic agreement acceptance: One-tap electronic signature calling `OwnerApi.acceptCommissionAgreement()`.

### 2.15 Customer Protection & Dispute Support Cases (Phase 14)
- **Support & Grievances Hub (`(partner)/cases/index.tsx`):**
  - Status tabs: *All Cases*, *Action Required*, *Under Review*, *Resolved*.
  - Search by case reference, guest name, or booking reference.
  - Action-required warning banner alerting hosts to 24-hour response SLA.
  - Case cards with priority badges (`Urgent`, `High`, `Medium`, `Low`) and status chips.
- **Case Detail & Timeline Screen (`(partner)/cases/[reference].tsx`):**
  - Case header with associated reservation snapshot, stay dates, guest details, and property name.
  - Chronological message timeline with distinct sender bubble styles (Host, Guest, TIJUM Support Desk).
  - Host response input bar allowing host to submit explanations, evidence, or resolution notes via `OwnerApi.addCaseMessage()`.
