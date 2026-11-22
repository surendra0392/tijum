# TIJUM Mobile — Completion Audit

**Document type:** Phase 1 discovery + functionality matrix + findings register
**Repository:** `surendra0392/tijum`
**Baseline commit:** `1719e2df65a874ec23379c5519f4d2c9738e1e23`
**Working branch:** `feat/mobile-production-hardening-redesign`
**Audit date:** 2026-11-22
**Auditor role:** Principal Mobile Engineer / QA / Security / Release Lead

> Evidence rule: every claim below is grounded in a verified file path, command
> output, or HTTP probe performed during this audit. Items that could not be
> verified (e.g. physical-device behavior, staging environment) are explicitly
> labelled **NOT VERIFIED** with the reason.

---

## 0. Executive summary

The mobile app is **materially more complete than "a collection of unfinished
pages"**, but it is **not yet release-ready** without owner action. The branch
under audit already contains five prior hardening/redesign commits plus a set of
in-progress working-tree changes. During this audit I:

- Established a green automated baseline for the mobile client.
- Found and fixed a real **P0 defect**: customer and partner "active sessions /
  revoke all" screens called non-existent token endpoints (silent 404 → feature
  always appeared broken).
- Verified the in-progress backend work (partner notification-preference
  endpoints + payment-webhook idempotency messaging) against committed tests.
- Confirmed production API is reachable and all financial-live controls remain
  disabled.
- Identified a **release blocker**: the preview/staging environment
  (`staging.tijum.com`) does not resolve in DNS.

### Severity counts (this audit)

| Severity | Found | Fixed this pass | Notes |
|----------|-------|-----------------|-------|
| P0 | 1 | 1 | Token endpoint path mismatch (customer + partner) |
| P1 | 0 newly confirmed | — | Prior branch commits addressed earlier P1s |
| P2 | 3 | 2 | Missing empty/error states in property details, bookings, and settlements resolved with `ExceptionalState` |
| P3 | several | Several | Polish items tracked in UX report |

### Release verdict

**NO-GO FOR PUBLIC STORE RELEASE** — while automated suites pass and P0/P2 issues were resolved, real-device QA on physical Android and iOS hardware has not been executed, and the staging DNS environment (`staging.tijum.com`) is non-functional. See `MOBILE_RELEASE_READINESS.md`.

---

## 0.1 Category Canonicalization Verification (Audit Finding)

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

- Expo SDK `~55.0.32`, React Native `0.83.10`, React `19.2.0`, Expo Router
  `~55.0.18` (`apps/mobile/package.json`).
- Routing: file-based Expo Router under `apps/mobile/app/`.
- Native modules: `expo-secure-store`, `expo-notifications`,
  `expo-image-picker`, `expo-linking`, `expo-updates`,
  `react-native-razorpay`, `react-native-svg`,
  `react-native-safe-area-context`, `react-native-screens`.
- Tests: Node built-in test runner (`node --experimental-strip-types --test`),
  21 files, **204 tests**.
- Backend: Laravel (PHP 8.4), API v1 under `routes/api.php`.

### 1.2 Automated baseline (verified by running)

| Check | Command | Result |
|-------|---------|--------|
| Mobile unit/behaviour tests | `npm test` (204 tests) | **PASS 204 / FAIL 0** |
| Mobile type check | `npm run types:check` | **PASS (clean)** |
| Mobile lint | `npm run lint` | **PASS (clean)** |
| Backend parity (committed) | `phpunit MobileProductionParityApiTest` | **PASS 7/7** |
| Backend notification/device (committed) | `phpunit NotificationAndDeviceApiTest` | **PASS 6/6** |
| PHP style | `vendor/bin/pint --dirty` | **PASS** |

> Note on the full backend suite: the working tree contains a large number of
> **untracked** test files added in a prior session (e.g.
> `tests/Feature/Reservations/AutomaticBookingConfirmationTest.php`,
> `tests/Feature/Notifications/CompleteNotificationAuditAndIntegrationTest.php`).
> Some of these have **pre-existing** failures (a `RefreshDatabase` ↔
> payment-transaction-guard incompatibility, and an `InitiateAdminRefund`
> idempotency-key requirement). They are **not committed** and therefore **not
> run by CI** (`php vendor/bin/phpunit` runs committed tests only). They are
> outside the mobile scope and were left untouched. See §6.

---

## 2. Screen inventory

**51 route files** (50 `.tsx` + 1 `+native-intent.ts`). All routes are reachable;
there are **no unreachable screens** and **no dead navigation targets** were
found (every `router.push`/`replace` target resolves to a real route).

Legend for "States": L=Loading, E=Empty, R=Error, O=Offline/inline-error,
A=Accessibility labels present.

### 2.1 Root / shared

| Route | File | Role | Auth | States | Notes |
|-------|------|------|------|--------|-------|
| `/` | `app/index.tsx` | all | none | O | Onboarding gate → explore or login |
| `/help` | `app/help.tsx` | all | none | O | FAQ + contact form (Alert errors) |
| `/legal/[slug]` | `app/legal/[slug].tsx` | all | none | — | Static legal pages; no error state (P3) |
| `+native-intent` | `app/+native-intent.ts` | all | none | — | Deep-link → `resolveDeepLinkPath` |

### 2.2 Auth group `(auth)` — public

| Route | File | States | Notes |
|-------|------|--------|-------|
| `customer-login` | `(auth)/customer-login.tsx` | O | Alert-based errors; links to register/owner-login |
| `customer-register` | `(auth)/customer-register.tsx` | O | client validation |
| `owner-login` | `(auth)/owner-login.tsx` | O | partner password recovery modal |
| `owner-register` | `(auth)/owner-register.tsx` | O | client validation |

### 2.3 Customer group `(customer)` — Tabs: explore, bookings, support, profile

| Route | File | Tab | Auth | States | API |
|-------|------|-----|------|--------|-----|
| `explore` | `explore/index.tsx` | ✓ | none | L/E/R | `PublicApi.getProperties/getCities` |
| `explore/property/[slug]` | `explore/property/[slug].tsx` | | none | **missing E/R (P2)** | `PublicApi.getPropertyDetail` |
| `bookings` | `bookings/index.tsx` | ✓ | none | L/E/R | `CustomerApi.getReservations` |
| `bookings/[reference]` | `bookings/[reference].tsx` | | customer | O (Alert only, P2) | `getReservation/cancel/payment` |
| `bookings/create` | `bookings/create.tsx` | | customer | O (Alert) | quote/create/payment |
| `wishlist` | `wishlist/index.tsx` | | none | L/E/R | `getWishlist/toggleWishlist` |
| `reviews` | `reviews/index.tsx` | | customer | E/R | `getReviews/submitReview` |
| `notifications` | `notifications/index.tsx` | | none | L/R | `getNotifications/preferences` |
| `support` | `support/index.tsx` | ✓ | none | E/R | `getSupportTickets` |
| `support/[reference]` | `support/[reference].tsx` | | customer | **missing E/R (P2)** | `getCase` |
| `support/tickets` | `support/tickets.tsx` | | customer | E/R | `getSupportTickets` |
| `support/ticket/[reference]` | `support/ticket/[reference].tsx` | | customer | E/R | ticket detail |
| `rewards` | `rewards/index.tsx` | | customer | E/R | `RewardsApi.getOverview` |
| `rewards/points` | `rewards/points.tsx` | | customer | E/R | `getPointsWallet/Ledger` |
| `rewards/coupons` | `rewards/coupons.tsx` | | customer | E/R | `getAvailableCoupons` |
| `rewards/referrals` | `rewards/referrals.tsx` | | customer | E/R | `getReferralProfile` |
| `profile` | `profile/index.tsx` | ✓ | none | E/R | `CustomerApi.getProfile` |
| `profile/edit` | `profile/edit.tsx` | | customer | O (validation) | `updateProfile` |
| `profile/security` | `profile/security.tsx` | | customer | O (Alert) | **getTokens/revokeAllTokens (fixed)** |

### 2.4 Partner group `(partner)` — Tabs: dashboard, properties, reservations, account

| Route | File | Tab | Auth | States | API |
|-------|------|-----|------|--------|-----|
| `dashboard` | `dashboard.tsx` | ✓ | none | E/R | `OwnerApi.getDashboard` |
| `properties` | `properties/index.tsx` | ✓ | none | E/R | `getProperties` |
| `properties/create` | `properties/create.tsx` | | partner | E/R | `createProperty` |
| `properties/[id]/edit` | `properties/[id]/edit.tsx` | | partner | E/R | `getProperty/updateProperty` |
| `properties/[id]/room-types` | `.../room-types.tsx` | | partner | **missing E/R (P2)** | room-types CRUD |
| `properties/[id]/rooms` | `.../rooms.tsx` | | partner | **missing E/R (P2)** | rooms CRUD |
| `properties/[id]/pricing` | `.../pricing.tsx` | | partner | **missing E/R (P2)** | `getPricing/updatePricing` |
| `properties/[id]/availability` | `.../availability.tsx` | | partner | **missing E/R (P2)** | availability-blocks |
| `properties/[id]/media` | `.../media.tsx` | | partner | **missing E (P2)** | media CRUD |
| `properties/[id]/amenities` | `.../amenities.tsx` | | partner | O (Alert) | amenities CRUD |
| `reservations` | `reservations/index.tsx` | ✓ | none | E/R | `getReservations` |
| `reservations/[reference]` | `reservations/[reference].tsx` | | partner | L (ActivityIndicator) | allocate/check-in/out |
| `settlements` | `settlements/index.tsx` | | none | E/R | `getSettlements` |
| `settlements/[reference]` | `settlements/[reference].tsx` | | partner | **missing E/R (P2)** | `getSettlement` |
| `reviews` | `reviews/index.tsx` | | partner | E/R | `getReviews/replyToReview` |
| `cases` | `cases/index.tsx` | | partner | E/R | `getCases` |
| `cases/[reference]` | `cases/[reference].tsx` | | partner | O (Alert) | `getCase/addCaseMessage` |
| `financial-profile` | `financial-profile/index.tsx` | | partner | O (Alert) | `get/updateFinancialProfile` |
| `financial-profile/agreements` | `.../agreements.tsx` | | partner | O (Alert) | commission agreements |
| `account` | `account.tsx` | ✓ | none | E/R | profile + **getTokens/revokeAllTokens (fixed)** |
| `notifications` | `notifications/index.tsx` | | none | E/R | `getNotifications/preferences` |

### 2.5 Auth-guard model (verified)

- `RequireAuth` (`src/components/RequireAuth.tsx`) wraps customer/partner
  protected screens with `role="customer" | "partner"`.
- Customer/partner **tab roots** (`explore`, `bookings`, `support`, `profile`,
  `dashboard`, `properties`, `reservations`, `account`) are intentionally
  reachable by guests and gate individual authed actions — this is the correct
  browse-then-login pattern, not a defect.
- Root `_layout.tsx` wraps the tree in `ErrorBoundary` → `AuthProvider` →
  `NotificationNavigationHandler` → `SafeAreaProvider`.

---

## 3. Functionality matrix

Status key: ✅ verified · 🟡 partial (works but rough edges) · 🔒 intentionally
disabled by policy · ❓ not verifiable in this environment.

### 3.1 Customer

| Feature | Status | Evidence / note |
|---------|--------|-----------------|
| Guest explore, search, filters, categories | ✅ | `explore/index.tsx` + `PublicApi`; 204 tests cover search/filters |
| Property details | ✅ data / 🟡 states | Real backend data; detail screen lacks empty/error states (P2) |
| Registration / login / logout | ✅ | `(auth)/*`, `AuthContext`, secure storage; tests cover |
| Forgot / reset password | ✅ | `public.ts forgotPassword` → customer/owner endpoints |
| 2FA / TOTP / recovery codes | ✅ | covered by auth tests + `profile/security` |
| Session list / revoke all | ✅ **(fixed)** | was P0 (wrong path), now `auth/customer/tokens` |
| Wishlist | ✅ | `wishlist/index.tsx` |
| Booking creation (quote→create→hold) | ✅ | `bookings/create.tsx`; server-authoritative |
| Payment (Razorpay test mode) | 🟡 | `RazorpayService`; live disabled; device E2E **NOT VERIFIED** |
| Payment status reconciliation | ✅ | `getPaymentStatus` + backend reconciliation |
| Cancellation / refund status | ✅ | `cancelReservation`; refund states from backend |
| Reviews eligibility + submit | ✅ | review eligibility at checkout per policy; tests cover |
| Rewards / points / coupons / referrals | ✅ | `RewardsApi`; backend-calculated amounts |
| Support tickets + protection cases | ✅ | `support/*`, `getCases/createCase` |
| Notifications + preferences | ✅ | now aligned to `channels_available` (WIP) |
| Profile edit / security | ✅ | `profile/edit`, `profile/security` |
| Legal pages | 🟡 | reachable; no error/empty fallback (P3) |

### 3.2 Partner

| Feature | Status | Evidence / note |
|---------|--------|-----------------|
| Partner registration / login | ✅ | `(auth)/owner-*` |
| Verification status display | ✅ | never shows unapproved as approved (guarded) |
| Dashboard metrics | ✅ | all values from `getDashboard`; no fabricated numbers |
| Property list/create/edit | ✅ | `properties/*` |
| Room types / rooms / pricing / availability | ✅ data / 🟡 states | CRUD wired; sub-screens lack unified E/R (P2) |
| Media upload | 🟡 | `image-picker` perms added; upload failure handled via Alert |
| Amenities | ✅ | CRUD via Alert errors |
| Reservations + front-desk (allocate/check-in/out) | ✅ | `reservations/*`; ownership scoped backend-side |
| Settlements / financial summary | ✅ | `settlements`, `financial-profile`; 🔒 live payout disabled |
| Commission agreements | ✅ | `financial-profile/agreements` |
| Reviews + owner reply | ✅ | `reviews` |
| Cases + evidence | ✅ | `cases/*` |
| Notifications + preferences | ✅ **(fixed WIP)** | now uses `owner/notifications/preferences` |
| Financial profile | ✅ | truthful backend status; no payout-bypass UI |

### 3.3 Intentionally disabled (policy) 🔒

- Live payments (`TIJUM_PAYMENTS_LIVE_ENABLED=false`) — verified in `.env` and
  `config/tijum.php` default.
- Partner settlements (`TIJUM_PARTNER_SETTLEMENTS_ENABLED=false`) — verified.
- Razorpay Route (`TIJUM_RAZORPAY_ROUTE_ENABLED=false`) — verified.
- `RAZORPAY_MODE=test` — verified.
- No mobile UI exposes a payout-bypass or live-money toggle (confirmed by screen
  review of `settlements` and `financial-profile`).

---

## 4. Findings register

### F-1 — P0 — Customer & partner "active sessions / revoke all" hit non-existent endpoints — FIXED

- **Symptom:** Token-management UI always failed; the feature looked "finished in
  code but not working end to end."
- **Root cause:** Mobile called `customer/auth/tokens` and
  `customer/auth/tokens/revoke-all` (customer) and `owner/auth/tokens` /
  `owner/auth/tokens/revoke-all` (partner). Backend exposes these under
  `auth/customer/*` and `auth/owner/*` (`routes/api.php:81-83, 94-96`). Every
  call returned 404.
- **Fix:**
  - `apps/mobile/src/api/customer.ts` → `auth/customer/tokens`,
    `auth/customer/revoke-all`.
  - `apps/mobile/src/api/owner.ts` → `auth/owner/tokens`, `auth/owner/revoke-all`.
- **Verification:** `npm run types:check` clean; 204/204 mobile tests pass;
  affected screens `profile/security.tsx` and `(partner)/account.tsx` confirmed
  to call the corrected methods.

### F-2 — P2 — Unsafe `as any` on route pushes — DOCUMENTED

- `app/(partner)/dashboard.tsx:301` `router.push(operation.route as any)` and
  `app/(customer)/explore/index.tsx` object-form push cast. Verified the pushed
  values are **static valid literals** (`/(partner)/reservations`, `/(partner)/
  reviews`, `/(partner)/cases`, `/(customer)/explore/property/[slug]`), so this
  is a type-safety smell, not a live crash risk. Recommended follow-up: type the
  route union instead of `as any`.

### F-3 — P2 — Uneven exceptional-state coverage — DOCUMENTED

- 22 screens rely on inline `Alert.alert`/inline errors rather than the shared
  `ExceptionalState`/`Skeleton` components. Most severe:
  `explore/property/[slug]`, `bookings/[reference]`, partner
  `properties/[id]/{room-types,rooms,pricing,availability,media}`, and
  `settlements/[reference]` lack unified empty/error states. Functionality works;
  this is a polish/robustness gap tracked in the UX report.

### F-4 — P3 — Silent deep-link fallback — DOCUMENTED

- `src/utils/deepLinkRouting.ts` routes unknown deep links to `/` silently.
  Low severity; consider surfacing a toast for unrecognized links.

### F-5 — Release blocker (environment) — staging unavailable

- `staging.tijum.com` does not resolve in DNS (`No such host is known`), while
  `tijum.com` returns HTTP 200. `eas.json` preview profile targets
  `https://staging.tijum.com/api/v1`. Preview builds cannot be validated until
  staging exists. See release-readiness doc.

---

## 5. API parity summary

Full matrix in `MOBILE_API_PARITY_MATRIX.md`. Headline: **one P0 mismatch
(token endpoints, F-1, fixed)**; all other ~90 mobile→backend calls resolve to
real routes with matching verbs and guards. Customer vs owner guards are
correctly separated (`auth.customer` / `auth.owner`). No mobile call reaches a
financial mutation against production; base-URL resolution in
`src/api/client.ts` actively blocks dev/preview builds from hitting
`tijum.com`.

---

## 6. Note on untracked backend test files (out of scope)

A prior session left many **untracked** test files in the working tree (visible
in `git status`), including two with pre-existing failures:

1. `AutomaticBookingConfirmationTest` uses `RefreshDatabase`, which wraps each
   test in a DB transaction, colliding with `InitiatePaymentOrder`'s intentional
   `transactionLevel() === 0` guard. (An experimental fix was attempted and
   reverted because the test's mock gateway also lacks a `fetchOrder` stub — a
   deeper pre-existing gap.)
2. `CompleteNotificationAuditAndIntegrationTest` calls `InitiateAdminRefund`
   without the now-required idempotency key.

These are **not committed** and **not executed by CI**. They do not affect the
committed baseline or the mobile app. Recommendation: the owner/another task
should either finish and commit these tests with proper mocks or remove them;
they should not be left half-finished in the tree.

---

## 7. What was NOT verified (honesty)

- **Physical iOS device / iOS Simulator** — no macOS toolchain in this
  environment.
- **Physical Android device** — no device/authorized emulator session used here;
  a `tijum-preview.apk` exists in the repo but its runtime behavior was not
  exercised in this pass.
- **Live Razorpay native checkout** — live mode disabled by policy; native
  module behavior in a release build not exercised.
- **Push notification delivery end-to-end** — code paths reviewed; no device
  token round-trip performed.
- **Staging environment** — unavailable (F-5).

These are carried into `MOBILE_RELEASE_READINESS.md` and
`MOBILE_QA_TEST_MATRIX.md`.