# TIJUM Mobile — QA Test Matrix & Execution Record (Pass 4)

**Branch:** `feat/mobile-production-hardening-redesign` ([PR #2](https://github.com/surendra0392/tijum/pull/2))  
**Date:** 2026-11-23  

---

## 1. Automated Quality Gates & Live Backend Verification Executed

| Suite / Gate | Command / Tool | Scope | Result |
|---|---|---|---|
| Mobile Unit & Behavioral Tests | `cd apps/mobile && npm test` | 21 files / 205 tests / 85 suites | **PASS 205 / FAIL 0** |
| Mobile TypeScript Strict Check | `cd apps/mobile && npm run types:check` | All 51 routes + `src/` | **PASS (0 errors)** |
| Mobile ESLint Quality Gate | `cd apps/mobile && npm run lint` | `eslint.config.cjs` (`app` + `src`) | **PASS (0 errors, 0 warnings)** |
| Expo Project Doctor | `cd apps/mobile && npx expo-doctor` | 20 checks | **PASS (20/20 clean)** |
| Android Hermes Bytecode Export | `npx expo export -p android` | Preview env (`staging.tijum.com`) | **PASS** |
| iOS Hermes Bytecode Export | `npx expo export -p ios` | Preview env (`staging.tijum.com`) | **PASS** |
| Authenticated Visual QA Suite | `python scripts/capture_screens.py` | 23 populated screens + 4 explicit empty/auth/error states | **PASS (27/27 screens)** |
| Live Isolated Backend Mutations | `scripts/cdp_verify_and_capture.mjs` | 7 end-to-end customer & partner mutations | **PASS (7/7 verified in DB)** |
| Committed Backend API V1 Tests | `vendor/bin/phpunit tests/Feature/Api/V1` | 113 tests / 881 assertions | **PASS 113 / FAIL 0** |
| Backend PHP Formatter | `vendor/bin/pint scripts/seed_mobile_qa.php --format agent` | Isolated QA seeder | **PASS** |

---

## 2. Live End-to-End Backend Mutations Verified (Isolated SQLite DB)

Executed against a fresh ephemeral SQLite database seeded via `scripts/seed_mobile_qa.php` (fail-closed: refuses production, refuses non-SQLite, refuses if any live financial control is enabled, uses ephemeral per-run random passwords):

| ID | Workflow Mutated | Backend Assertion Executed | Result |
|---|---|---|---|
| M1 | Customer UI Login Form (`/(auth)/customer-login`) | Entered fixture credentials into real DOM inputs (`login-identifier-input`, `login-password-input`), clicked `login-submit-button`, verified real Sanctum bearer token persisted in `sessionStorage` with `principalType='customer'` | **PASS** |
| M2 | Customer Booking Hold, Payment Status & Cancellation | `POST /api/v1/customer/reservations` (UUID `submission_token`) → asserted `status='awaiting_payment'` → checked `GET .../payment/status` → `POST .../cancel` → re-fetched reservation and asserted `status='cancelled'` | **PASS** |
| M3 | Customer Support Protection Case Submission | `POST /api/v1/customer/cases` linked to `TJR-2026-UPCOMING-01` → re-fetched `GET /api/v1/customer/cases` and asserted returned `case_reference` persisted | **PASS** |
| M4 | Partner Property Draft Creation | Loaded `GET /api/v1/owner/reference-data` (`hostels-pg`, `hyderabad`) → `POST /api/v1/owner/properties` → re-fetched `GET /api/v1/owner/properties` and asserted created property ID & name persisted | **PASS** |
| M5 | Partner Physical Room Inventory Mutation | `POST /api/v1/owner/properties/{id}/rooms` → re-fetched `GET /api/v1/owner/properties/{id}/rooms` and asserted added `room_number` persisted | **PASS** |
| M6 | Partner Front-Desk Check-In & Check-Out | `POST /api/v1/owner/reservations/TJR-2026-TODAY-QA02/check-in` → `POST .../check-out` → re-fetched reservation and asserted both `checked_in_at` and `checked_out_at` persisted | **PASS** |
| M7 | Partner Financial KYC Profile Submission | `PUT /api/v1/owner/financial-profile` with `business_constitution='private_limited'`, `supplier_legal_classification='regular'`, PAN `ABCDE1234F`, IFSC `HDFC0001234` → re-fetched `GET /api/v1/owner/financial-profile` and asserted persisted PAN & IFSC | **PASS** |

---

## 3. Upgraded Maestro Functional E2E Flows (Secure Runtime Config)

All hardcoded fixture passwords were removed from `apps/mobile/.maestro/`. Credentials and fixture IDs are now injected at runtime via environment variables documented in `apps/mobile/.maestro/env.example` (with `.maestro/.env.local` git-ignored). Every mutating step runs a fail-closed Maestro JS backend verifier in `apps/mobile/.maestro/scripts/` (which explicitly refuses production `tijum.com`):

| Flow File | Steps & Backend Verifiers | Native Execution Status |
|---|---|---|
| `01-guest-explore-and-property.yaml` | Onboarding skip → canonical category tabs (`hostels-pg`, `homestays`, `co-living`, `all`) → city search → filters modal → property detail inspection | **Authored & selector-verified; NOT executed on native device** (no Android emulator/device or Maestro CLI on host) |
| `02-customer-auth-booking-and-support.yaml` | Customer login (`${MAESTRO_CUSTOMER_EMAIL}` / `${MAESTRO_CUSTOMER_PASSWORD}`) → registration link check (`customer-register-link`) → property selection → booking hold → Razorpay test open & dismissal → real reservation cancellation + `scripts/assert-booking-cancelled.js` → real support case submission via `support-submit-btn` + `scripts/assert-case-created.js` | **Authored & selector-verified; NOT executed on native device** (equivalent backend mutations verified via M1–M3) |
| `03-partner-dashboard-operations-and-kyc.yaml` | Partner login (`${MAESTRO_PARTNER_EMAIL}` / `${MAESTRO_PARTNER_PASSWORD}`) → 3-step property draft creation (`partner-prop-*`) + `scripts/assert-property-created.js` → physical room addition (`partner-room-*`) + `scripts/assert-room-added.js` → front-desk check-in & check-out (`partner-checkin-*`, `partner-checkout-*`) + `scripts/assert-checkin-checkout.js` → financial KYC update (`partner-kyc-*`) + `scripts/assert-kyc-updated.js` | **Authored & selector-verified; NOT executed on native device** (equivalent backend mutations verified via M4–M7) |

---

## 4. ESLint Warning Remediation Summary (58 → 0 Warnings)

All 58 warnings from Pass 3 were individually audited without blind dependency additions or `eslint-disable` suppressions:
- **27 `react-hooks/exhaustive-deps` warnings resolved** with real lifecycle hardening:
  - Fixed cross-property state leakage on `properties/[id]/availability.tsx` and `rooms.tsx` (navigating between properties previously retained the previous property's `selectedRoomTypeId`/`selectedRoomId`).
  - Fixed stale closure on AppState foreground payment reconciliation in `bookings/[reference].tsx`.
  - Added monotonic request sequence guards (`loadSeqRef`/`fetchSeqRef`) across Explore, Customer Bookings/Support/Wishlist/Rewards, and Partner Dashboard/Cases/Reservations/Settlements to eliminate out-of-order response races.
  - Added `sessionEpoch` resets & `hasLoadedRef` guards to prevent stale cross-account data on login/logout switches without triggering refetch loops.
  - Kept Explore search query in `searchQueryRef` so typing does not fire duplicate API requests per keystroke.
- **29 `@typescript-eslint/array-type` warnings** converted cleanly from `Array<T>` to `T[]`.
- **1 unused import** (`ActivityIndicator` in `property/[slug].tsx`) and **1 `import/first`** ordering violation (`partner/cases/index.tsx`) fixed.

---

## 5. Pending Physical Hardware QA Matrix

| ID | Target | Verification Pending |
|---|---|---|
| HW-01 | Physical iPhone (Dynamic Island) & Android | Safe-area notch/gesture-bar visual inspection |
| HW-02 | Physical Android & iOS | 200% accessibility font scaling layout pass |
| HW-03 | Physical Android | System edge-back gesture through nested modals |
| HW-04 | Physical Android & iOS | Native Razorpay test checkout & UPI app-switch flow |
| HW-05 | Physical Android & iOS | Camera / gallery upload permissions & flaky network recovery |
| HW-06 | Physical Android & iOS | Real FCM / APNs push notification token delivery |
