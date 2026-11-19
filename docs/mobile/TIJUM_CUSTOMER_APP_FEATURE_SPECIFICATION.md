# TIJUM Customer Mobile Application Feature Specification

**Document Reference:** `docs/mobile/TIJUM_CUSTOMER_APP_FEATURE_SPECIFICATION.md`  
**Application Scope:** `apps/mobile/app/(customer)/` and `(auth)/customer-*`  
**Framework:** React Native 0.83.10 / Expo SDK 55 (Expo Router 55, React 19.2.0)  
**Target Audience:** Students, working professionals, and long-term accommodation seekers  
**Date:** November 20, 2026 (Phase M9 Reconciled)  
**Status:** **ACTIVE, RECONCILED & CERTIFIED**

---

## 1. Feature Overview

The Customer Mobile Application delivers an intuitive, transparent accommodation booking experience across Andhra Pradesh & Telangana (Hyderabad, Vijayawada, Visakhapatnam, Guntur, Tirupati). The platform eliminates broker friction and provides property-specific food clarity across Hostels/PG, Homestays, and Co-Living spaces.

---

## 2. Core Functional Modules

### 2.1 Customer Authentication & Registration
- **Login (`app/(auth)/customer-login.tsx`):**
  - Sign in via email or 10-digit mobile phone + password.
  - Automatic push notification token registration with backend.
  - "Forgot Password?" dialog providing email password reset with input validation via `PublicApi.forgotPassword()`.
  - Compliant branding: *\"Stay easy. Eat well. Spend less.\"* with transparent meal disclosures copy.
- **Registration (`app/(auth)/customer-register.tsx`):**
  - 10-digit phone normalization (strips non-digits and leading `91`).
  - Automatic referral code capture via deep link or local storage.
  - Dynamically configured bonus points incentive on completed first stay.

### 2.2 Marketplace Discovery & Search
- **Category Consolidation (`(customer)/explore/index.tsx`):**
  - 3 canonical category tabs: `Hostels/PG` (`hostels-pg`), `Homestays` (`homestays`), `Co-Living` (`co-living`).
  - City filtering across 5 key metropolitan hubs.
  - Gender preference filtering: Boys, Girls, Co-Ed / All Genders.
  - AC / Non-AC selection.
  - Real-time search by property title, locality, or landmark.
- **Property Details (`(customer)/explore/property/[slug].tsx`):**
  - Optimized gallery cover image and photo slider.
  - Transparent Food Obligations card (Breakfast, Lunch, Dinner with operating timings).
  - Check-in (09:00 AM) and Checkout (08:00 AM) policy summary.
  - Verified host details and amenity badge grid.
  - Room category selector with daily, weekly, and monthly rates.

### 2.3 Dedicated Wishlist & Saved Stays
- **Wishlist Hub (`(customer)/wishlist/index.tsx`):**
  - Dedicated full-screen wishlist querying `CustomerApi.getWishlist()`.
  - Rendered property cards with primary image, canonical category badge, pricing, and location.
  - Heart toggle action calling `CustomerApi.toggleWishlist(propertyId)` for instant unfavorite removal.
  - Pull-to-refresh, animated loading skeleton states, and empty state CTA redirecting to Explore.
  - Direct entry point accessible from Customer Profile navigation.

### 2.4 Booking Checkout & Inventory Holds
- **Checkout Engine (`(customer)/bookings/create.tsx`):**
  - 15-minute transactional inventory hold preventing double-booking.
  - Real-time stay duration calculator (daily/monthly).
  - Guest composition: Male / Female / Mixed, Individuals / Families.
  - Promotional coupon code validation and application.
  - Loyalty points redemption (FEFO engine) capped against net payable amount.
  - Native Razorpay checkout with auto-filled customer contact details.

### 2.5 Booking Management & Verified Reviews
- **Booking Hub (`(customer)/bookings/index.tsx`):**
  - Filter tabs: *All*, *Awaiting Payment*, *Confirmed*, *Completed*, *Cancelled*.
  - Direct checkout retry for active holds within the 15-minute window.
- **Stay Details & Reviews (`(customer)/bookings/[reference].tsx`):**
  - Live stay status and physical room allocation details.
  - Prominent "Rate & Review Your Stay" action for finalized stays (`completed` / `checked_out`).
  - **Review Submission Modal:**
    * 5-star ratings for Cleanliness, Food & Dining, Host Communication, and Value for Money.
    * Overall stay experience rating.
    * Written review text input with $\ge 10$ character validation.
    * Real-time submission via `CustomerApi.submitReview()` with instantaneous in-place view refresh.

### 2.6 Rewards & Loyalty Points Hub
- **Points Ledger (`(customer)/rewards/points.tsx`):**
  - Total active points balance and FEFO expiry lot schedule.
- **Referrals (`(customer)/rewards/referrals.tsx`):**
  - Unique shareable referral code and link.
  - Native share dialog for WhatsApp and social apps.
  - Referral status tracking: Pending qualification vs. Credited stays.
  - **Dynamic Reward Copy:** Dynamically references `profile?.referee_reward_points` and `profile?.referrer_reward_points` from `RewardsApi.getReferralProfile()`, eliminating hardcoded point assumptions.
- **Coupons (`(customer)/rewards/coupons.tsx`):**
  - Available promotional discount campaigns and copyable coupon codes.

### 2.7 Customer Protection & Support
- **Support Hub (`(customer)/support/index.tsx`):**
  - Direct touchpoints: WhatsApp chat, phone call (`tel:+918142334033`), email (`support@tijum.com`).
  - Contact Inquiry submission tab with validation.
  - Formal Customer Protection grievance lodgement:
    * Food not provided / meal quality discrepancy.
    * Room / amenity discrepancy.
    * Emergency relocation request.
  - **Statutory Grievance Redressal SLA:** Complies strictly with Consumer Protection (E-Commerce) Rules 2020:
    * *\"Our Customer Protection desk will acknowledge your grievance within 48 hours and resolve it within 30 days pursuant to the TIJUM Grievance Redressal Policy.\"*
