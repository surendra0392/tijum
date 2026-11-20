# TIJUM — MOBILE PHASE M10B
# CUSTOMER IMPLEMENTATION & ARCHITECTURE RECONCILIATION REPORT

**Platform:** TIJUM Food-Inclusive Accommodation Marketplace  
**Milestone:** Phase M10B — Complete Customer Application & API Parity  
**Backend:** Laravel 13 • PHP 8.4 • MySQL 8 / InnoDB  
**Mobile Client:** React Native 0.83.10 • Expo SDK 55 • TypeScript 5.7+  
**Date:** November 2026

---

## 1. PROJECT OBJECTIVE & SCOPE

The objective of Phase M10B is to bring the TIJUM Customer Native Mobile Application to full functional parity with the approved marketplace business rules and backend capabilities. Prior reviews identified architectural gaps, including missing case message replies, disconnected notification preferences, fabricated mock fallbacks in rewards, client-side quote workarounds, and non-compliant WhatsApp touchpoints. 

Phase M10B resolves every discrepancy, closes all functional gaps, and delivers an evidence-backed customer mobile application.

---

## 2. DETAILED IMPLEMENTATION MODULES

### Module 1: Customer Protection Case Messaging & SLA Tracking
- **Backend Additions:**
  - `CustomerProtectionController@addMessage`: Validates user-submitted message (2–3000 chars), authorizes customer ownership of the grievance, executes the `AddCaseMessage` action, auto-transitions case state from `AwaitingCustomer` to `UnderReview`, and dispatches event notifications.
  - Registered `POST /api/v1/customer/cases/{reference}/messages` route in `routes/api.php`.
  - Updated `CustomerProtectionController@show` to return `property_name`, `booking_reference`, `sla_due_at`, and message timeline sender names.
- **Mobile Client Screen (`apps/mobile/app/(customer)/support/[reference].tsx`):**
  - Dedicated full-screen timeline view displaying case summary, status badges, and property details.
  - Priority-based SLA card displaying explicit response targets:
    * **Urgent Disruption:** 2-Hour Escalation SLA
    * **High Priority:** 4-Hour Response SLA
    * **Medium Priority:** 24-Hour Review SLA
    * **Low / Standard:** 48-Hour Response SLA
  - Prominent display of statutory formal acknowledgement within 48 hours and formal dispute tracking up to 30 days under the TIJUM Grievance Redressal Policy.
  - Chronological message bubbles distinguishing Customer (Guest), Property Host, and TIJUM Support Desk.
  - Safe reply bar with validation and send states, automatically disabled when grievances are resolved or closed.
  - Registered route in `apps/mobile/app/(customer)/_layout.tsx` and linked from `apps/mobile/app/(customer)/support/index.tsx`.

### Module 2: Inactive Channel Policy Enforcement (Rule 3.9)
- **Problem:** `apps/mobile/app/(customer)/support/index.tsx` previously contained an operational button linking to `https://wa.me/918142334033`. This violated Rule 3.9 (*"SMS and WhatsApp are currently disabled. Do not present these channels as operational."*).
- **Remediation:**
  - Removed WhatsApp chat button from touchpoints header.
  - Retained verified operational channels: Direct Phone Helpline (`tel:+918142334033`) and Support Email Desk (`mailto:support@tijum.com`).
  - Purged misleading fallback copy referencing WhatsApp.

### Module 3: Customer Notification Preferences & Deep-Linking
- **Backend Additions:**
  - `CustomerNotificationController@preferences`: Returns current user subscription state for all channels and indicates channel operational statuses.
  - `CustomerNotificationController@updatePreferences`: Persists user subscription updates for in-app and other channels via `NotificationPreferenceService`.
  - Registered `GET /api/v1/customer/notifications/preferences` and `PUT /api/v1/customer/notifications/preferences` routes.
- **Mobile Client Screen (`apps/mobile/app/(customer)/notifications/index.tsx`):**
  - Added a "Channels" preferences modal with toggles for In-App, Email, SMS, and WhatsApp alerts.
  - Truthfully informs customers that platform Email, SMS, and WhatsApp delivery are currently inactive per system configuration, while keeping In-App notifications fully active.
  - Implemented smart deep-linking on notification tap:
    * Support case alerts deep-link directly to `/(customer)/support/[reference]`.
    * Booking updates deep-link directly to `/(customer)/bookings/[reference]`.
    * Rewards notifications deep-link directly to `/(customer)/rewards`.

### Module 4: Purge of Mock/Fabricated Fallback Data
- **Problem:** When backend APIs threw errors or were unreachable, rewards screens previously populated hardcoded fake vouchers (`TIJUM-PREMIUM`, `COLIVING15`, `HOMESTAYPOINTS`) and fake properties (`Sri Lakshmi PG`).
- **Remediation:**
  - `apps/mobile/app/(customer)/rewards/index.tsx`: Replaced hardcoded fallback mock with native error banner and retry button.
  - `apps/mobile/app/(customer)/rewards/coupons.tsx`: Purged mock coupons array; displays truthful empty or error states.
  - `apps/mobile/app/(customer)/rewards/points.tsx`: Purged fake ledger items; binds strictly to `RewardsApi.getPointsLedger()`.
  - `apps/mobile/app/(customer)/rewards/referrals.tsx`: Purged fake referee array; binds strictly to `RewardsApi.getReferralProfile()`.
  - `apps/mobile/app/(customer)/bookings/create.tsx`: Removed mock client-side discount logic for `TIJUMWELCOME` and `COLIVING15`; calls backend `RewardsApi.validateCoupon()` and `RewardsApi.quotePromotions()`.

### Module 5: Advanced Search & Multi-Criteria Filtering
- **Mobile Client Screen (`apps/mobile/app/(customer)/explore/index.tsx`):**
  - Added an Advanced Filters modal displaying:
    * **Stay Dates:** Check-in and Check-out date filters.
    * **Meal Inclusions:** Independent multi-select chips for Breakfast, Lunch, and Dinner.
    * **Room Sharing Capacity:** Single (1), Double (2), Triple (3), and 4+ Sharing (4).
    * **Monthly Budget:** Min price (₹) and Max price (₹).
  - Integrated active filter counter pill in the exploration filter bar (`Filters (N)`).
  - Wired directly to `PublicApi.getProperties()` query parameters without client-side data loss.

### Module 6: Interactive Photo Gallery Modal
- **Mobile Client Screen (`apps/mobile/app/(customer)/explore/property/[slug].tsx`):**
  - Integrated a photo count trigger badge on the property cover image (`N Photos`).
  - Implemented a Photo Gallery Modal featuring:
    * Full-screen centered image viewer with aspect ratio preservation (`resizeMode="contain"`).
    * Previous and Next navigation arrows.
    * Current photo counter (`X / Y`).
    * Photo caption text.
    * Horizontal thumbnail strip for rapid navigation across images.

### Module 7: Cancellation & Refund Tracking
- **Backend Additions:**
  - Updated `CustomerReservationController@show` and `cancel` to eager-load `refunds`.
  - Updated `ReservationResource` to serialize `refunds` collection: `amount_minor`, `currency`, `status`, `status_label`, `reason`, `utr`, `gateway_processed_at`, and `created_at`.
- **Mobile Client Screen (`apps/mobile/app/(customer)/bookings/[reference].tsx`):**
  - Added a dedicated "Cancellation & Refund Tracking" card rendered when reservations are cancelled or have associated refund records.
  - Displays refund amounts in INR, status chips (`Processed`, `Processing`, `Requested`), bank UTR / reference numbers, and processed timestamps.
  - Provides clear disclosure of the 5–7 banking day refund review lifecycle pursuant to marketplace cancellation terms.

---

## 3. VERIFICATION & QUALITY ASSURANCE SUMMARY

1. **Mobile Test Suite:** 138 passing tests across 59 suites in `apps/mobile/__tests__/` (100% pass rate).
2. **TypeScript Compilation:** `npm run types:check --prefix apps/mobile` passed with 0 errors.
3. **Backend Feature Tests:** 72 passing test cases (449 assertions) in `tests/Feature/Api/V1/` (100% pass rate).
4. **Code Quality Formatter:** Laravel Pint passed with 0 formatting discrepancies.
5. **Static Analysis:** PHPStan Level 5 analysis passed with 0 errors across modified controllers and resources.
