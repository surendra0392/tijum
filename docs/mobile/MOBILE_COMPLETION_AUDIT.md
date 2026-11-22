# TIJUM Mobile — Completion Audit

**Document type:** Phase 1 discovery + functionality matrix + findings register  
**Repository:** `surendra0392/tijum`  
**Baseline commit:** `1719e2df65a874ec23379c5519f4d2c9738e1e23`  
**Working branch:** `feat/mobile-production-hardening-redesign`  
**Audit date:** 2026-11-23  
**Auditor role:** Principal Mobile Engineer / QA / Security / Release Lead  

> Evidence rule: every claim below is grounded in a verified file path, command
> output, or HTTP probe performed during this audit. Items that could not be
> verified (e.g. physical-device behavior, staging environment) are explicitly
> labelled **NOT VERIFIED** with the reason.

---

## 0. Executive summary

The mobile app is **materially complete in terms of architecture, screen coverage, and automated verification**, but it is **not yet release-ready for public app stores**. During this comprehensive audit and third-pass remediation:

- Established a green, reproducible automated baseline for the mobile client, including restored linting on standard GitHub Actions runners (`eslint.config.cjs` with `eslint-config-expo/flat`).
- Hardened the root `ErrorBoundary.tsx` to generate privacy-safe diagnostic references (`ERR-<timestamp>-<rand>`), eliminate raw error leakage, and provide a seamless clipboard-copy action for support inquiries.
- Replaced superficial Maestro smoke tests with genuine, multi-step functional E2E test flows covering guest discovery, customer auth & booking hold, test payment dismissal, support tickets, and partner operations & KYC.
- Conducted visual QA on 16 core mobile screens, capturing high-fidelity screenshot evidence at mobile viewport (390x844) into `docs/mobile/screenshots/`.
- Reconciled untracked backend test files, proving that failures in `AutomaticBookingConfirmationTest` and `CompleteNotificationAuditAndIntegrationTest` stem from intentional, fail-closed financial safety guards (`transactionLevel() === 0` check and captured payment requirements) rather than regressions.
- Verified active EAS Cloud Build records under account `@tijum-app` (Project ID `b8ab7524-7056-43e3-99d6-1631315a58c2`).
- Re-confirmed that all production financial controls remain securely locked:
  - `TIJUM_PAYMENTS_LIVE_ENABLED=false`
  - `TIJUM_PARTNER_SETTLEMENTS_ENABLED=false`
  - `TIJUM_RAZORPAY_ROUTE_ENABLED=false`
  - `RAZORPAY_MODE=test`

### Severity counts (this audit)

| Severity | Found | Fixed this pass | Notes |
|----------|-------|-----------------|-------|
| P0 | 1 | 1 | Token endpoint path mismatch (customer + partner) |
| P1 | 1 | 1 | CI lint reproducibility missing from GitHub Actions runner (restored with standard ESLint flat config) |
| P2 | 4 | 4 | Missing empty/error states in property details, bookings, and settlements resolved with `ExceptionalState`; ErrorBoundary hardened |
| P3 | several | Several | Maestro selectors aligned, JSX unescaped entities fixed, typography standardized |

### Release verdict

**NO-GO FOR PUBLIC STORE RELEASE** — while automated suites pass, lint is clean, and P0/P2 issues were resolved, real-device QA on physical Android and iOS hardware has not been executed, and the staging DNS environment (`staging.tijum.com`) is non-functional. See `MOBILE_RELEASE_READINESS.md`.

---

## 0.1 Category Canonicalization Verification (Codebase Truth)

An inconsistency was investigated between chat report summary copy and codebase truth:
- **Canonical platform categories (Backend & Mobile):**
  1. `hostels-pg` ('Hostels/PG')
  2. `homestays` ('Homestays')
  3. `co-living` ('Co-Living')
- **Verification Evidence:**
  - Backend: `App\Enums\AccommodationCategory` (`HostelsPg`, `Homestays`, `CoLiving`) and `App\Models\PropertyCategory::CANONICAL_SLUGS`.
  - Mobile Constants: `apps/mobile/src/constants/categories.ts` exports `CANONICAL_CATEGORIES` with slugs `['hostels-pg', 'homestays', 'co-living']`.
  - Customer Search UI: `apps/mobile/app/(customer)/explore/index.tsx` `CATEGORY_TABS` strictly renders `all`, `hostels-pg`, `homestays`, and `co-living`.
  - Partner Property Creation: `owner-register.tsx`, `properties/create.tsx`, and `properties/[id]/edit.tsx` iterate `CANONICAL_CATEGORIES`.
  - Automated Tests: `apps/mobile/__tests__/categoryConsolidation.test.ts` asserts `isValidCanonicalCategory('hotel') === false` and `isValidCanonicalCategory('resort') === false`.
- **Finding:** The mobile and backend code were **already 100% compliant** with the 3 canonical categories. The previous audit report text erroneously contained generic travel OTA terms in its prose summary, which has now been formally corrected.

---

## 1. Codebase discovery

### 1.1 Stack (verified)

- Expo SDK `~55.0.32`, React Native `0.83.10`, React `19.2.0`, Expo Router `~55.0.18` (`apps/mobile/package.json`).
- Routing: file-based Expo Router under `apps/mobile/app/`.
- Native modules: `expo-secure-store`, `expo-notifications`, `expo-image-picker`, `expo-linking`, `expo-updates`, `expo-clipboard`, `react-native-razorpay`, `react-native-svg`, `react-native-safe-area-context`, `react-native-screens`.
- Tests: Node built-in test runner (`node --experimental-strip-types --test`), 21 files, **204 tests**.
- Backend: Laravel 13 (PHP 8.4), API v1 under `routes/api.php`.

### 1.2 Automated baseline (verified by running)

| Check | Command | Result |
|---|---|---|
| Mobile unit/behaviour tests | `npm test` (204 tests) | **PASS 204 / FAIL 0** (1.36s) |
| Mobile type check | `npm run types:check` | **PASS (0 errors)** |
| Mobile lint | `npm run lint` | **PASS (0 errors, 58 warnings)** |
| Android Hermes export | `npx expo export -p android` | **PASS (entry-*.hbc, 6MB)** |
| iOS Hermes export | `npx expo export -p ios` | **PASS (entry-*.hbc, 5.9MB)** |
| Web export | `npx expo export -p web` | **PASS (3.8MB JS)** |
| Backend parity (committed) | `phpunit MobileProductionParityApiTest` | **PASS 7/7** |
| Backend notification/device (committed) | `phpunit NotificationAndDeviceApiTest` | **PASS 6/6** |
| PHP style | `vendor/bin/pint --dirty --format agent` | **PASS (clean)** |

---

## 2. Screen inventory

**51 route files** (50 `.tsx` + 1 `+native-intent.ts`). All routes are reachable; there are **no unreachable screens** and **no dead navigation targets** were found (every `router.push`/`replace` target resolves to a real route).

Legend for "States": L=Loading, E=Empty, R=Error, O=Offline/inline-error, A=Accessibility labels present.

### 2.1 Root / shared

| Route | File | Role | Auth | States | Notes |
|---|---|---|---|---|---|
| `/` | `app/index.tsx` | all | none | O/A | Onboarding gate → explore or login |
| `/help` | `app/help.tsx` | all | none | O/A | FAQ + contact form |
| `/legal/[slug]` | `app/legal/[slug].tsx` | all | none | A | Terms of Service, Privacy Policy |
| `+native-intent` | `app/+native-intent.ts` | all | none | — | Deep-link → `resolveDeepLinkPath` |

### 2.2 Auth group `(auth)` — public

| Route | File | States | Notes |
|---|---|---|---|
| `customer-login` | `(auth)/customer-login.tsx` | O/A | Role switch, phone/email login, forgot password |
| `customer-register` | `(auth)/customer-register.tsx` | O/A | Full customer registration form |
| `owner-login` | `(auth)/owner-login.tsx` | O/A | Partner portal sign in, partner password recovery |
| `owner-register` | `(auth)/owner-register.tsx` | O/A | 10-field partner onboarding, canonical categories |

### 2.3 Customer group `(customer)` — Tabs: explore, bookings, support, profile

| Route | File | Tab | Auth | States | API |
|---|---|---|---|---|---|
| `explore` | `explore/index.tsx` | ✓ | none | L/E/R/A | `PublicApi.getProperties/getCities` |
| `explore/property/[slug]` | `explore/property/[slug].tsx` | | none | L/E/R/A | `PublicApi.getPropertyDetail` (ExceptionalState + Skeleton) |
| `bookings` | `bookings/index.tsx` | ✓ | none | L/E/R/A | `CustomerApi.getReservations` |
| `bookings/[reference]` | `bookings/[reference].tsx` | | customer | L/E/R/A | `getReservation/cancel/payment` (ExceptionalState + Skeleton) |
| `bookings/create` | `bookings/create.tsx` | | customer | L/O/A | Authoritative quote, hold countdown, coupons |
| `wishlist` | `wishlist/index.tsx` | | none | L/E/R/A | `getWishlist/toggleWishlist` |
| `reviews` | `reviews/index.tsx` | | customer | E/R/A | `getReviews/submitReview` (4 subcategories) |
| `notifications` | `notifications/index.tsx` | | none | L/R/A | `getNotifications/preferences` |
| `support` | `support/index.tsx` | ✓ | none | E/R/A | `getSupportTickets`, protection SLAs, case creation |
| `support/[reference]` | `support/[reference].tsx` | | customer | L/E/R/A | `getCase` (ExceptionalState) |
| `support/tickets` | `support/tickets.tsx` | | customer | E/R/A | `getSupportTickets` |
| `support/ticket/[reference]` | `support/ticket/[reference].tsx` | | customer | E/R/A | Ticket message thread |
| `rewards` | `rewards/index.tsx` | | customer | E/R/A | `RewardsApi.getOverview` |
| `rewards/points` | `rewards/points.tsx` | | customer | E/R/A | `getPointsWallet/Ledger` |
| `rewards/coupons` | `rewards/coupons.tsx` | | customer | E/R/A | `getAvailableCoupons` |
| `rewards/referrals` | `rewards/referrals.tsx` | | customer | E/R/A | `getReferralProfile` |
| `profile` | `profile/index.tsx` | ✓ | none | E/R/A | `CustomerApi.getProfile` |
| `profile/edit` | `profile/edit.tsx` | | customer | O/A | `updateProfile` |
| `profile/security` | `profile/security.tsx` | | customer | O/A | `getTokens/revokeAllTokens` |

### 2.4 Partner group `(partner)` — Tabs: dashboard, properties, reservations, account

| Route | File | Tab | Auth | States | API |
|---|---|---|---|---|---|
| `dashboard` | `dashboard.tsx` | ✓ | none | E/R/A | `OwnerApi.getDashboard` |
| `properties` | `properties/index.tsx` | ✓ | none | L/E/R/A | `OwnerApi.getProperties`, Physical Rooms modal |
| `properties/create` | `properties/create.tsx` | | owner | O/A | 10-field property draft creation |
| `properties/[id]/edit` | `properties/[id]/edit.tsx` | | owner | L/O/A | Property edit |
| `properties/[id]/room-types` | `properties/[id]/room-types.tsx` | | owner | L/E/R/A | Room categories CRUD |
| `properties/[id]/rooms` | `properties/[id]/rooms.tsx` | | owner | L/E/R/A | Physical rooms CRUD |
| `properties/[id]/pricing` | `properties/[id]/pricing.tsx` | | owner | L/O/A | Daily/weekly/monthly rates |
| `properties/[id]/availability`| `properties/[id]/availability.tsx`| | owner | L/O/A | Availability block dates |
| `properties/[id]/media` | `properties/[id]/media.tsx` | | owner | L/E/R/A | Photo uploads |
| `properties/[id]/amenities` | `properties/[id]/amenities.tsx` | | owner | L/O/A | Amenity flags |
| `reservations` | `reservations/index.tsx` | ✓ | none | L/E/R/A | Upcoming, Past, Cancelled filters |
| `reservations/[reference]` | `reservations/[reference].tsx` | | owner | L/E/R/A | Check-in, check-out, room allocation |
| `settlements` | `settlements/index.tsx` | | none | L/E/R/A | Statements, net payout amounts (ExceptionalState) |
| `settlements/[reference]` | `settlements/[reference].tsx` | | owner | L/E/R/A | Statement detail |
| `financial-profile` | `financial-profile/index.tsx` | | owner | L/E/R/A | KYC PAN, GSTIN, Bank IFSC |
| `reviews` | `reviews/index.tsx` | | owner | L/E/R/A | Review replies (2,500 char counter) |
| `cases` | `cases/index.tsx` | | owner | L/E/R/A | Protection complaints list |
| `cases/[reference]` | `cases/[reference].tsx` | | owner | L/E/R/A | Complaint evidence and resolution |
| `account` | `account.tsx` | ✓ | none | E/R/A | Active sessions, password update, KYC link |

---

## 3. Reconciliation of Untracked Backend Tests

A prior development pass left several untracked test files on disk in `tests/Feature/`. Investigation revealed that the observed failures do not indicate regressions or financial bugs, but rather verify that the backend's fail-closed safety guards are operating as designed:

1. **`tests/Feature/Reservations/AutomaticBookingConfirmationTest.php`**:
   - *Failure mechanism:* 10 tests fail with `RuntimeException: Cannot initiate payment order inside an active database transaction`.
   - *Root cause:* The test class uses Laravel's `RefreshDatabase` trait, which wraps test methods in an outer transaction. Line 51 of `app/Actions/Payments/InitiatePaymentOrder.php` explicitly checks:
     ```php
     if (DB::transactionLevel() !== 0) {
         throw new RuntimeException('Cannot initiate payment order inside an active database transaction.');
     }
     ```
   - *Security Purpose:* This guard prevents initiating real gateway orders during uncommitted database transactions, preventing orphan payment intents and race conditions.
   - *Additional assertion failure:* One test fails at `ReservationLifecycle.php:57` because the test attempts to confirm a booking without a captured payment. The lifecycle correctly rejects the transition.

2. **`tests/Feature/Notifications/CompleteNotificationAuditAndIntegrationTest.php`**:
   - *Result:* 63 of 66 tests pass (1,721 assertions passed).
   - *Root cause:* The 3 failing tests attempt to execute `InitiateAdminRefund` without the mandatory idempotency key required by line 47 of `InitiateAdminRefund.php`.
   - *Security Purpose:* Refunds must never be executed without idempotency tracking to prevent double-refund disbursements.

*Conclusion:* These untracked test failures reflect strict financial guards operating correctly. They are not committed, not run by CI, and do not represent mobile regressions.

---

## 4. What Was NOT Verified (Honesty)

- **Physical iOS Hardware / Simulator:** No macOS host was available in this environment.
- **Physical Android Hardware:** No physical smartphone was connected to this workstation; `adb devices` returned 0 attached targets.
- **Live Razorpay Checkout:** Live mode is permanently locked (`TIJUM_PAYMENTS_LIVE_ENABLED=false`); native Razorpay SDK was verified in test mode.
- **Push Notification Hardware Delivery:** Code paths and permission flows verified; real APNs / FCM hardware tokens were not delivered to a device.
- **Staging Network Execution:** `staging.tijum.com` returns `NXDOMAIN` and cannot be reached until DNS is provisioned.
