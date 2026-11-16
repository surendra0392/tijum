# TIJUM — FULL PLATFORM AUDIT REPORT (PHASE 21)
## Architecture, Portals, Backend, Database, API & Mobile Platform Audit

**Project:** TIJUM — Food-Inclusive Accommodation Marketplace  
**Phase:** 21  
**Date:** November 13, 2026  
**Auditor:** Principal Software Architect & QA Lead  

---

## 1. Architectural Inventory & Boundaries

The TIJUM application is structured as a multi-tier food-inclusive accommodation marketplace serving customers, property owners, and internal administrators.

### Core Stack:
- **Backend:** Laravel 13, PHP 8.4, MySQL 8, Laravel Sanctum for API token issuance, Redis/Sync queues.
- **Web Frontend:** React 19, TypeScript 5.7, Inertia.js 3, Tailwind CSS v4, Vite 8 with Wayfinder route helpers.
- **Mobile Application:** React Native 0.83.10, Expo SDK 55.0.32, Expo Router v55, React 19.2.0, TypeScript 5.7, New Architecture enabled.
- **Documentation Directory:** `docs/` and `docs/phase-21/`.

### Authentication Models & Guards:
TIJUM strictly preserves three isolated authentication actors across separate database tables and guards:
1. **Customer Identity:** `App\Models\User` using the `web` guard (browser sessions) and `auth:sanctum` with `auth.customer` middleware (mobile REST API).
2. **Owner Identity:** `App\Models\Owner` using the `owner` guard (browser sessions) and `auth:sanctum` with `auth.owner` middleware (mobile REST API).
3. **Administrator Identity:** `App\Models\Admin` using the `admin` guard, reinforced by `admin.active` and `admin.two-factor` middleware.

---

## 2. Public Marketplace & Website Audit

### 2.1 Scope Audited
- Homepage (`/`)
- City Landing Pages (`/stay/{city}`)
- Search & Discovery Interface (`/search`)
- Property Details (`/property/{slug}`)
- Static Content Pages (`/about`, `/contact`, `/terms`, `/privacy`)
- CMS Blog & FAQs (`/blog`, `/blog/{slug}`, `/faqs`)

### 2.2 Findings & Verification
- **Visual Design & Typography:** Consistent application of Montserrat (headings) and Nunito (body text) along with the brand color palette: Deep Plum (`#442F41`), Coral (`#FF7A67`), Soft Peach (`#FFB6A3`), and Cream (`#FFF4EE`).
- **Food Inclusion Display:** Audited property card badges and room-type meal declarations. Each property card displays meals dynamically (`Breakfast`, `Lunch`, `Dinner`) based strictly on the property's flags (`food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`).
- **Timing Standards:** Check-in (09:00 AM) and checkout (08:00 AM) are prominently displayed on all search results and property detail summaries.
- **Interactive Controls:** All filter sliders (price ranges), meal toggles, room category checkboxes, and search dropdowns bind cleanly without console warnings or layout thrashing.
- **Responsive Layout:** Audited across viewport breakpoints (Mobile 375px, Tablet 768px, Desktop 1280px). Zero horizontal scrolling or unexpected overflow observed.

---

## 3. Customer Web Portal Audit

### 3.1 Scope Audited
- Customer Registration & Login (`/register`, `/login`)
- Profile Management & Preferences (`/profile`)
- Reservation History & Status (`/bookings`, `/bookings/{reference}`)
- Payment Gateway Handshake (`/bookings/{reference}/pay`)
- Customer Protection Grievances (`/support/cases`)
- Verified Reviews Submission (`/reviews/create/{reference}`)

### 3.2 Findings & Verification
- **Session Isolation:** Customer sessions are bound to cookie-based web guards and cannot access `/owner/*` or `/admin/*` routes.
- **15-Minute Payment Window:** When a reservation transitions to `awaiting_payment`, a synchronized countdown timer calculates remaining seconds against `payment_deadline_at`. If expired, payment actions are automatically disabled.
- **Review Eligibility:** The review submission form verifies:
  1. Reservation belongs to the authenticated customer.
  2. Scheduled checkout time (08:00 AM on checkout date) has passed.
  3. Status is confirmed and payment is captured.
  4. The 30-day submission window has not elapsed.
- **Privacy & Marketing Consent:** The profile settings allow independent management of marketing preferences; consent defaults to `false`.

---

## 4. Owner / Partner Portal Audit

### 4.1 Scope Audited
- Host Registration & Verification (`/owner/register`, `/owner/login`)
- Property Management & Onboarding (`/owner/properties`, `/owner/properties/create`)
- Room Type Configuration (`/owner/properties/{id}/room-types`)
- Physical Room Inventory (`/owner/properties/{id}/rooms`)
- Reservation Command Center (`/owner/reservations`)
- Settlement & Financial Statements (`/owner/finances/settlements`)

### 4.2 Findings & Verification
- **Inventory Model Integrity:** Owners configure room types (e.g. "Standard Non-AC", "Deluxe AC") and assign total physical room units. Physical room numbers are allocated only *after* reservation confirmation; customers never see or select room numbers. Zero bed-level entities exist.
- **Reservation Acceptance Workflow:** An incoming request displays guest composition and requested duration. Accepting transitions status to `awaiting_payment` and triggers a 15-minute countdown. Declining requires a mandatory rejection reason.
- **Financial & Settlement Visibility:** Statements display gross booking value, TIJUM marketplace commission deduction, and net partner payable. Payout cycles follow standard weekly T+3 schedule via Razorpay Route linked accounts.

---

## 5. Admin Console Audit

### 5.1 Scope Audited
- Two-Factor Challenge & Session Management (`/admin/login`, `/admin/two-factor-challenge`)
- Operations Command Center & Metrics Dashboard (`/admin/dashboard`)
- Property Approval & Verification Moderation (`/admin/properties`)
- Financial Settlements & Dispute Overrides (`/admin/financial`)
- Customer Protection Relocations (`/admin/customer-cases`)
- Review Moderation & Complaint Reports (`/admin/reviews`)
- CMS & SEO Management (`/admin/content`, `/admin/seo`)

### 5.2 Findings & Verification
- **Mandatory 2FA:** All administrator accounts require TOTP two-factor confirmation before accessing operational dashboards.
- **Audit Logging:** Every status change (property approval, refund authorization, relocation decision, review takedown) writes an immutable record to the audit log table with the acting administrator's ID and timestamp.
- **Privilege Boundaries:** Administrative routes reside strictly under `/admin/*` protected by `auth:admin`, completely isolated from mobile API tokens and public routes.

---

## 6. Backend & Database Integrity Audit

### 6.1 Database Schema & Relationships
- **Monetary Storage:** Stored strictly as integer paise in columns such as `daily_rate_minor`, `weekly_rate_minor`, `monthly_rate_minor`, `total_amount_paise`, `owner_payable_paise`, and `commission_amount_paise`. No floating-point types (`DECIMAL` or `FLOAT`) are used for currency math.
- **Referential Integrity:** Foreign keys on `reservations`, `reservation_payments`, `partner_settlements`, `customer_cases`, and `reviews` enforce relational integrity with `RESTRICT` on delete where financial records are involved.
- **Concurrency & Row Locking:** Critical database transactions (`CreateReservation`, `VerifyCheckoutPayment`, `CreatePartnerSettlement`, and `ProcessRelocationDecision`) utilize `lockForUpdate()` to prevent race conditions during concurrent bookings or duplicate payment webhook deliveries.

### 6.2 Migration Safety
- All migrations are strictly forward-only. No destructive column drops, table wipes, or re-run operations were executed during Phase 21.

---

## 7. REST API V1 & Mobile Application Audit

### 7.1 API Architecture
- Exactly 59 routes are registered under `/api/v1/*`.
- Customer routes are protected by `EnsureCustomerToken` middleware.
- Owner routes are protected by `EnsureOwnerToken` middleware.
- Rate limiting is active on authentication endpoints (`throttle:customer_login`, `throttle:owner_login`).

### 7.2 Mobile Application (`apps/mobile/`)
- Upgraded and verified on Expo SDK 55.0.32, React Native 0.83.10 New Architecture.
- Zero hardcoded emoji icons across all screens; 100% Lucide icons (`lucide-react-native`).
- Single-active-principal architecture in `SecureTokenStorage.ts` prevents cross-role session contamination.
- Persistent offline revocation queue ensures queued logouts are not lost during network interruptions.
- Native Android Preview build generated successfully (EAS APK).
