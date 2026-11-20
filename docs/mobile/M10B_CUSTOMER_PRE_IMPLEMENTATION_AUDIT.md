# TIJUM Mobile Phase M10B — Customer Pre-Implementation Audit Report

**Document Reference:** `docs/mobile/M10B_CUSTOMER_PRE_IMPLEMENTATION_AUDIT.md`  
**Milestone:** Phase M10B (Complete Customer Mobile Application & API Parity)  
**Date:** November 20, 2026  
**Status:** **AUDIT COMPLETED — IMPLEMENTATION DIRECTIVE ACTIVE**  
**Repository Baseline:** `https://github.com/surendra0392/tijum.git` (`main` @ commit `6e3f8e1`)  
**Mobile Workspace:** `apps/mobile/` (React Native • Expo SDK 55 • React 19.2.0 • TypeScript 5.7+)  
**Backend Workspace:** `D:\Herd\tijum` (Laravel 13 • PHP 8.4 • MySQL 8 / InnoDB • REST API V1)

---

## 1. Executive Preflight Summary

Prior to beginning code modifications for **Phase M10B**, a thorough technical inspection of the complete repository was performed. The audit reviewed:
1. **Existing Customer Mobile Application (`apps/mobile/app/(customer)`)**: 14 screens and navigation structures across exploration, bookings, notifications, profile, rewards, and support.
2. **Existing Owner Mobile Application (`apps/mobile/app/(partner)`)**: Verified complete M10A/M10A.1/M10A.1.1 baseline. All partner financial calculations, TDS under Income-tax Act, 2025 Section 393(1) (0.10%), inclusive/exclusive GST, priority-specific SLAs (2h/4h/24h/48h), canonical 4 meal flags, and electronic acceptance SHA-256 hashes are operating cleanly.
3. **Laravel API V1 Backend (`routes/api.php` & `app/Http/Controllers/Api/V1/`)**: 126 registered routes, controllers, request validation classes, and services.
4. **Session Architecture & Security**: Strict single-active-session storage in hardware-backed `SecureStore`, offline revocation queue, and role-based middleware (`auth.customer` vs `auth.owner`).
5. **Inventory & Pricing Architecture**: Strict room-type hierarchy (`Property -> PropertyRoomType -> PropertyRoom`), zero bed models, integer minor units (paise), and independent meal flags.

The audit identified specific architectural contradictions, client-side calculation workarounds, fabricated mock fallbacks in rewards screens, missing Customer API endpoints, and a disabled-channel policy violation that must be resolved.

---

## 2. Feature-by-Feature Pre-Implementation Audit Matrix

| Module / Feature | Existing Status | Backend Status | Mobile Status | Gap Identified | Required Action |
|---|---|---|---|---|---|
| **M1: Customer Authentication & Registration** | Functional | Complete (`POST auth/customer/login`, `register`, `logout`) | Complete in `(auth)/customer-login.tsx` & `customer-register.tsx` | Phone & terms validation enforced; needs session expiration verification | Verify token expiry interceptor and session revocation on app boot |
| **M1: Single Active Session & Role Separation** | Functional | Complete (`auth.customer` & `auth.owner` middleware) | Complete in `AuthContext.tsx` & `SecureTokenStorage.ts` | Customer cannot call Owner APIs; switching clears cached principal | Confirm offline revocation queue and role separation in all API calls |
| **M2: Customer Home & Discovery** | Functional | Complete (`GET public/categories`, `properties`, `banners`) | Implemented in `explore/index.tsx` | Needs real backend promotional banners & category cards without hardcoding | Connect categories and cities directly from `PublicApi.getCategories()` and `getCities()` |
| **M3: Property Search & Filtering** | Partial | Complete (`GET public/properties` supporting 12+ filter params) | Implemented in `explore/index.tsx` | Filter chips only covered City, Category, AC, and Gender; missing check-in/out dates, sharing capacity, meal inclusions, price range | Wire check-in/out date selection, sharing capacity, food inclusions, and price range filters to search query |
| **M4: Property Details & Image Gallery** | Functional | Complete (`GET public/properties/{slug}`, reviews, media) | Implemented in `explore/property/[slug].tsx` | Displayed cover image; missing full multi-category photo gallery viewer modal | Add interactive media photo gallery viewer modal with category filter chips |
| **M4: Food Information Architecture** | Discrepant | Complete (`food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`) | Implemented via `MealBadge.tsx` | Earlier documentation referenced `pure_veg`, purged in M10A.1.1 | Enforce strict 4 canonical food flags without extra food packages or client-only attributes |
| **M5: Room Selection & Canonical Inventory** | Functional | Complete (`PropertyRoomType` with daily/weekly/monthly paise) | Implemented in `explore/property/[slug].tsx` & `bookings/create.tsx` | Zero customer-facing bed inventory; customers select room type & capacity | Ensure no bed models or room numbers are exposed to customers |
| **M5 & M17: Weekly & Duration Pricing** | Discrepant | Complete in `ReservationQuoteService` & `PublicPropertyController@quote` | Client calculated quotes locally in `useEffect` with hardcoded rules | Client calculated subtotal and discounts locally instead of fetching authoritative backend quotes | Bind checkout quote calculations strictly to `CustomerApi.quoteReservation()` & `RewardsApi.quotePromotions()` |
| **M6: Booking Creation & 15-Min Hold** | Functional | Complete (`POST customer/reservations` creating 15-min hold) | Implemented in `bookings/create.tsx` | Client created bookings, but relied on client-side price estimates | Revalidate inventory availability and authoritative price before creating reservation |
| **M6: Razorpay Payment Verification** | Functional | Complete (`POST payment/initiate`, `POST payment/verify`) | Implemented in `bookings/[reference].tsx` | Complete native signature verification; needs recovery from app termination during checkout | Ensure payment retry, status check, and order recovery when reopening app during 15-min hold |
| **M7: Customer Bookings & History** | Functional | Complete (`GET customer/reservations`, `show`) | Implemented in `bookings/index.tsx` & `bookings/[reference].tsx` | Filter tabs present (`All`, `Awaiting Action`, `Confirmed`, `Completed`) | Add pagination support and deep-link routing from push notifications |
| **M8: Cancellation & Refund Tracking** | Partial | Complete (`POST customer/reservations/{reference}/cancel`) | Implemented in `bookings/[reference].tsx` | Modal confirms cancellation, but lacks detailed refund calculation breakdown and UTR tracking | Display backend-calculated refund amount, cancellation policy deduction, and refund status tracking |
| **M9: Customer Profile Management** | Functional | Complete (`GET customer/profile`, `PUT customer/profile`) | Implemented in `profile/index.tsx` | Personal details and marketing consent save cleanly | Ensure form validation and contact update conflict handling |
| **M10: Customer Account Security** | Functional | Complete (`PUT customer/password`, `POST auth/customer/revoke-all`) | Implemented in `profile/index.tsx` | Password change modal works; missing explicit "Revoke Other Devices" action | Add "Sign out from all other active devices" action calling `auth/customer/revoke-all` |
| **M11: Coupons & Discount Application** | Discrepant | Complete (`GET customer/coupons`, `POST customer/coupons/validate`) | Implemented in `rewards/coupons.tsx` & `bookings/create.tsx` | **Fabricated mock fallback:** Catch block fell back to hardcoded dummy coupons (`TIJUMWELCOME`, `COLIVING15`) | Remove all hardcoded mock arrays; implement genuine error states, empty states, and backend coupon validation |
| **M12: Referrals & Loyalty Points** | Discrepant | Complete (`GET customer/rewards/overview`, `points`, `referrals`) | Implemented in `rewards/` (`index`, `points`, `referrals`) | **Fabricated mock fallback:** Catch blocks fell back to fake wallet data (`Sri Lakshmi PG`, `TIJUM-VIP88`, `Rahul Sharma`) | Purge all mock data fallbacks; implement real error/empty states; ensure points are credited only on verified completed stays |
| **M13: Customer Wishlist** | Functional | Complete (`GET customer/wishlist`, `POST`, `DELETE`) | Implemented in `wishlist/index.tsx` & `explore/index.tsx` | Add/remove/toggle work idempotently with optimistic UI | Maintain state synchronization between property cards, search, and wishlist |
| **M14: Customer Reviews & Ratings** | Functional | Complete (`GET customer/reviews/eligible`, `POST customer/reviews/{reference}`) | Implemented in `bookings/[reference].tsx` review modal | Modal enforces 4 canonical subcategories and min 10-char content | Restrict review submission strictly to verified completed stays |
| **M15: Customer Support Cases & Messaging** | **CRITICAL GAP** | **Missing message reply endpoint:** `POST customer/cases/{reference}/messages` missing | Incomplete: `support/index.tsx` only lists cases and creates cases; no case detail screen or timeline | Customers cannot view discussion timeline or post reply messages; missing SLA target presentation | 1. Add `POST customer/cases/{reference}/messages` in backend.<br>2. Build `support/[reference].tsx` case timeline screen with SLA card. |
| **M15: Support Helpline Touchpoints** | **CRITICAL DEFECT** | Public contact API functional (`POST public/contact`) | `support/index.tsx` displayed a "WhatsApp Chat" button linking to wa.me | **Direct Policy Violation:** SMS and WhatsApp are currently disabled and must NOT be presented as operational | Remove WhatsApp chat button; retain official Phone Helpline and Email Desk touchpoints |
| **M16: In-App Notifications** | Functional | Complete (`GET customer/notifications`, `mark-all-read`) | Implemented in `notifications/index.tsx` | Tapping notification only marked it read; did not navigate to booking or case | Add intelligent deep-link navigation on notification tap |
| **M16: Notification Preferences** | **CRITICAL GAP** | **Missing API V1 endpoints:** Web controller had preferences, but API V1 controller lacked them | Missing UI in mobile app | Customers cannot configure communication channels (In-App, Email, Push) | 1. Add `GET` and `PUT` notification preferences in `CustomerNotificationController.php`.<br>2. Build Notification Preferences screen. |

---

## 3. High-Priority Architectural Resolutions for M10B

### 3.1 Purge of Fabricated Mock Data in Rewards Ecosystem
- **Finding:** In `apps/mobile/app/(customer)/rewards/index.tsx`, `coupons.tsx`, `points.tsx`, `referrals.tsx`, and `bookings/create.tsx`, `try/catch` blocks were catching failed API calls and assigning fictitious demonstration records (`Sri Lakshmi PG`, `TIJUM-PREMIUM`, `TIJUMWELCOME`, `Rahul Sharma`, etc.).
- **Resolution:** All fabricated mock arrays must be purged. Screens must display genuine loading states, real API data, robust empty states with informative instructions, and retry action buttons on API failure.

### 3.2 Authoritative Backend Price Quotation in Checkout
- **Finding:** In `apps/mobile/app/(customer)/bookings/create.tsx`, room rates, daily/weekly/monthly calculations, coupon discounts, and points deductions were being calculated locally on the mobile client using a client-side formula.
- **Resolution:** Client must query `CustomerApi.quoteReservation()` and `RewardsApi.quotePromotions()`. Authoritative calculations (base amount, duration multiplier, coupon discount, points deduction, tax, security deposit, and final payable amount) must be derived directly from the backend response.

### 3.3 Customer Support Case Detail & Messaging Gap
- **Finding:** The backend provided `GET /api/v1/customer/cases`, `POST /api/v1/customer/cases`, and `GET /api/v1/customer/cases/{reference}`, but lacked `POST /api/v1/customer/cases/{reference}/messages`. The mobile app had `support/index.tsx`, but lacked a dedicated case detail screen (`support/[reference].tsx`) where customers could view host/desk messages and post replies.
- **Resolution:**
  1. Add `POST api/v1/customer/cases/{reference}/messages` route and controller action.
  2. Implement `apps/mobile/app/(customer)/support/[reference].tsx` with chronological chat timeline, sender roles (`CUSTOMER`, `HOST`, `TIJUM DESK`), priority-specific SLA targets (Urgent: 2h, High: 4h, Medium: 24h, Low: 48h), and statutory 48h acknowledgement / 30-day tracking.

### 3.4 Disabled-Channel Policy Compliance (Removal of WhatsApp Button)
- **Finding:** `support/index.tsx` featured a prominent "WhatsApp Chat" button linking to `https://wa.me/918142334033`. The project policy explicitly mandates: *"SMS and WhatsApp are currently disabled. Do not present these channels as operational."*
- **Resolution:** Remove the WhatsApp button immediately. Focus official touchpoints on the verified Phone Helpline (`tel:+918142334033`), Email Desk (`mailto:support@tijum.com`), and in-app Customer Protection grievance tickets.

### 3.5 Customer Notification Preferences API & UI
- **Finding:** While `NotificationPreferenceService` was fully implemented in the backend, `CustomerNotificationController.php` in API V1 only implemented `index`, `unreadCount`, `markRead`, and `markAllRead`. It lacked `preferences` and `updatePreferences` endpoints.
- **Resolution:**
  1. Expose `GET /api/v1/customer/notifications/preferences` and `PUT /api/v1/customer/notifications/preferences` in `CustomerNotificationController.php`.
  2. Implement notification preferences management in mobile profile/settings.

---

## 4. Execution Plan for M10B

The implementation will proceed systematically through the phased modules:
- **M10B.1 — Foundation & Authentication:** Session verification, SecureStore, and clean error handling.
- **M10B.2 — Marketplace Discovery & Search:** Expanded filters (dates, meals, price, sharing capacity), property details, and interactive media gallery modal.
- **M10B.3 — Booking & Authoritative Payments:** Backend-verified quote calculation, coupon/points promotions, 15-minute inventory hold, native Razorpay checkout, and backend payment verification.
- **M10B.4 — Booking Lifecycle & Refund Tracking:** Booking history pagination, cancellation workflow with backend refund computation, and status tracking.
- **M10B.5 — Customer Account, Security & Real Rewards:** Real rewards/points/referrals/coupons without mock data, profile editing, and device revocation.
- **M10B.6 — Customer Support, SLAs & Notifications:** Customer case messaging route (`POST customer/cases/{reference}/messages`), case detail screen with priority SLA (2h/4h/24h/48h) and statutory 48h/30d tracking, WhatsApp removal, notification preferences API & UI, and notification deep-linking.
- **M10B.7 — Quality & Release Verification:** Mobile test suite updates, backend feature tests, API parity matrix, security audit, TypeScript compilation, Pint, and PHPStan.
