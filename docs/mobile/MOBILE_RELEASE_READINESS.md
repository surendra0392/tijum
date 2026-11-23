# TIJUM Mobile — Release Readiness Assessment

**Branch:** `feat/mobile-production-hardening-redesign`  
**GitHub Pull Request:** [PR #2 (surendra0392/tijum/pull/2)](https://github.com/surendra0392/tijum/pull/2)  
**Baseline Commit:** `1719e2df65a874ec23379c5519f4d2c9738e1e23`  
**Verdict:** **NO-GO FOR PUBLIC STORE RELEASE** (Automated checks, 0-warning lint, authenticated 27-screen visual QA, 7 live backend mutations, and Hermes Android/iOS exports all pass; physical device execution and reachable `staging.tijum.com` DNS remain open blockers)  
**Assessment Date:** 2026-11-23  

---

## 1. Release Verdict & Policy Posture

**Public production release verdict remains strictly NO-GO.**

Although automated quality gates, strict TypeScript checking, zero-warning ESLint, authenticated visual QA against a real isolated Laravel backend, 7 live end-to-end backend mutations, and Android/iOS Hermes production exports all pass, TIJUM mobile **must not be submitted to Google Play or Apple App Store** until:
1. Real Android and iOS physical device QA is executed across critical booking, payment, upload, and front-desk journeys.
2. Isolated staging infrastructure (`staging.tijum.com`) resolves via DNS with TLS so internal preview APKs can be tested end-to-end on hardware.
3. Live payment and payout controls remain disabled until explicit owner sign-off.

---

## 2. Six-Way Verification Partitioning

### 2.1 Tests Actually Executed
All checks below were executed directly in this environment on the Pass-4 codebase:

| Gate / Suite | Runner / Command | Count / Scope | Result |
|---|---|---|---|
| Mobile Behavioral & Unit Tests | `cd apps/mobile && npm test` | 21 test files / 205 tests / 85 suites | **PASS 205 / FAIL 0** |
| Mobile TypeScript Strict Check | `cd apps/mobile && npm run types:check` | Full mobile codebase (51 routes + services) | **PASS (0 errors)** |
| Mobile ESLint Quality Gate | `cd apps/mobile && npm run lint` | Flat config (`eslint.config.cjs`), `app` + `src` | **PASS (0 errors, 0 warnings)** |
| Mobile Expo Project Doctor | `cd apps/mobile && npx expo-doctor` | 20 Expo SDK 55 config & dependency checks | **PASS (20/20 clean)** |
| Android Hermes Bytecode Export | `npx expo export -p android` (`preview` env) | Compiled Hermes bytecode (`.hbc`) | **PASS** |
| iOS Hermes Bytecode Export | `npx expo export -p ios` (`preview` env) | Compiled Hermes bytecode (`.hbc`) | **PASS** |
| Authenticated Visual QA Harness | `python scripts/capture_screens.py` | 23 populated screens + 4 explicit empty/auth/error states against isolated SQLite Laravel API | **PASS (27/27 screens, 0 broken images, 0 JS exceptions, 0 overflow)** |
| Live Isolated Backend Mutations | `scripts/cdp_verify_and_capture.mjs` (via `capture_screens.py`) | UI customer login, booking hold + status + cancel, support case creation, partner property draft, room addition, front-desk check-in/out, partner KYC update | **PASS (7/7 mutations verified in backend DB)** |
| Backend API V1 PHPUnit Suite | `vendor/bin/phpunit tests/Feature/Api/V1` | 113 tests / 881 assertions (in-memory SQLite) | **PASS 113 / FAIL 0** |
| Backend PHP Style | `vendor/bin/pint scripts/seed_mobile_qa.php --format agent` | QA seeder PHP script | **PASS** |

### 2.2 Native Builds Compiled & EAS Cloud Records
- **Local Compilation:** Android and iOS Hermes production bytecode (`.hbc`) and Expo web bundles compile cleanly with verified static `process.env.EXPO_PUBLIC_API_URL` inlining.
- **Local Native Binaries (`.apk` / `.aab` / `.ipa`):** **NOT compiled locally** (Android SDK/Gradle and macOS Xcode are not installed on this workstation).
- **EAS Cloud Build Account:** `@tijum-app` (`tijum` / `tijum.official@gmail.com`), Project ID `b8ab7524-7056-43e3-99d6-1631315a58c2`.
- **Previous Historical Builds on Record (Pre-PR #2):**
  - `f3b03fc4-0366-4d25-b907-41a878ddda21`: Android `preview` internal APK built on 2026-11-20 from older commit `dc2511f2152fe4980158436da5df6b99f47d45be` (does **not** contain PR #2 fixes).
  - `d293d94d-6d28-460b-8add-2e5846093cc6`: Android `production` AAB built on 2026-11-20 (pre-PR #2, **do not distribute**).
- **Pass-4 Internal Android Preview APK:** Queued/triggered on EAS (`--profile preview --platform android`, `distribution: internal`, `buildType: apk`, `EXPO_PUBLIC_API_URL=https://staging.tijum.com/api/v1`, `EXPO_PUBLIC_ENVIRONMENT=preview`) directly from the pushed PR #2 commit SHA. Exact Build ID and real-time EAS status are reported in the PR #2 delivery report. No production build distributed and no `eas update` published.

### 2.3 Tests Actually Run on Physical Devices / Emulators
- **Physical Device / Emulator Count:** **0 devices / 0 emulators**.
- **Reason:** Android SDK (`adb`, `emulator`), Maestro CLI, and macOS/Xcode Simulator are not installed on this Windows workstation, and no physical smartphone is attached.

### 2.4 Maestro E2E Flows Written (Not Executed on Native Device)
All 3 Maestro E2E flows in `apps/mobile/.maestro/` were upgraded to deterministic mutating flows with **zero hardcoded fixture passwords** (credentials injected via `.maestro/.env.local` / `-e KEY=VALUE`; see `apps/mobile/.maestro/env.example`) and paired with 6 backend assertion scripts (`apps/mobile/.maestro/scripts/assert-*.js`):

| Flow File | Real Mutations & Backend Assertions | Native Maestro Execution |
|---|---|---|
| `01-guest-explore-and-property.yaml` | Onboarding dismissal → canonical categories (`hostels-pg`, `homestays`, `co-living`, `all`) → city search → filter sheet → property details | **NOT EXECUTED** (no Android/iOS device/Maestro CLI) |
| `02-customer-auth-booking-and-support.yaml` | Customer login (env creds) → booking hold creation → test-mode Razorpay open & safe dismissal → real reservation cancellation (`assert-booking-cancelled.js`) → real protection case submission via `support-submit-btn` (`assert-case-created.js`) | **NOT EXECUTED** on native device (equivalent mutations verified via CDP + PHPUnit) |
| `03-partner-dashboard-operations-and-kyc.yaml` | Partner login (env creds) → 3-step property draft creation (`assert-property-created.js`) → physical room addition (`assert-room-added.js`) → front-desk check-in & check-out (`assert-checkin-checkout.js`) → financial KYC update (`assert-kyc-updated.js`) | **NOT EXECUTED** on native device (equivalent mutations verified via CDP + PHPUnit) |

### 2.5 Untested Native-Only Behaviors (Require Physical Hardware)
1. Dynamic Island / notch / gesture-bar safe-area insets on physical iPhones and Android phones.
2. System Accessibility font scaling (200%+ Dynamic Type / Largest font size).
3. Hardware Android back gesture across nested modals and payment sheets.
4. Native Razorpay SDK checkout sheet & UPI app-switch intent handoff on real Android/iOS builds.
5. Camera / photo-library OS permission dialogs and multipart upload under mobile network handoffs.
6. Push notification hardware token delivery (FCM / APNs).

### 2.6 Infrastructure & Safety Controls
1. **Staging DNS Blocker (Verified 2026-11-23):**
   - `nslookup staging.tijum.com` returns **`Non-existent domain` (NXDOMAIN)**.
   - Internal preview APKs target `https://staging.tijum.com/api/v1` and therefore cannot reach a live staging API until DNS + TLS + isolated `tijum_staging` DB are provisioned (never point preview builds at production `tijum.com`).
2. **Production Financial Controls (Verified Locked):**
   - `TIJUM_PAYMENTS_LIVE_ENABLED=false`
   - `TIJUM_PARTNER_SETTLEMENTS_ENABLED=false`
   - `TIJUM_RAZORPAY_ROUTE_ENABLED=false`
   - `RAZORPAY_MODE=test`

---

## 3. Authenticated Visual QA Screenshot Inventory

All screenshots were captured at mobile viewport (`390x844 @2x`) against a live isolated SQLite Laravel backend via `python scripts/capture_screens.py` (which hard-fails on API errors, unexpected sign-in gates, uncaught JS exceptions, broken images, or horizontal overflow) and visually inspected:

### 3.1 Populated Customer, Partner, Auth & Public Screens (`docs/mobile/screenshots/`)
| # | File | Auth Role | Verified Real Data Rendered |
|---|---|---|---|
| 01 | `01-onboarding.png` | Guest | Welcome carousel, TIJUM mark, Skip/Next/Host Portal actions |
| 02 | `02-customer-login.png` | Guest | Customer/Partner switcher, login inputs, Sign Up link |
| 03 | `03-customer-register.png` | Guest | Full registration form, terms consent, CTA |
| 04 | `04-owner-login.png` | Guest | Partner login form, forgot password, Register as Partner |
| 05 | `05-owner-register.png` | Guest | 10-field onboarding, canonical categories, all 4 wrapped API cities (`Hyderabad`, `Guntur`, `Vijayawada`, `Visakhapatnam`) |
| 06 | `06-explore-stays.png` | Customer | Canonical category cards (`Hostels/PG`, `Homestays`, `Co-Living`) with TIJUM room imagery + real verified property cards with prices & ratings (`15` loaded images) |
| 07 | `07-property-details.png` | Customer | `Sri Sai Balaji Executive Hostel & PG`, 3 room categories with Daily/Weekly/Monthly pricing, horizontal meal badges, inline checkmark amenities, verified review card (`19 Nov 2026`) |
| 08 | `08-booking-create.png` | Customer | Live room category selection, dates/duration, loyalty points balance (`750 pts`), authoritative quote (`₹850`) |
| 09 | `09-customer-bookings.png` | Customer | 3 real populated reservations (`TJR-2026-TODAY-QA02`, `TJR-2026-ACTIVE-02`, `TJR-2026-UPCOMING-01`) with real thumbnails & totals |
| 10 | `10-booking-detail-hold.png` | Customer | Active `TJR-2026-HOLD-QA01` hold with live `14:xx` countdown, horizontal meal pills, `3 Days`, single-line sticky payment bar (`₹2,550`, `Status`, `Pay with Razorpay`), `Cancel Reservation` |
| 11 | `11-customer-support.png` | Customer | Authenticated Support Hub with seeded protection case `CASE-2026-QA001`, SLA policy trigger, official helpline |
| 12 | `12-customer-profile.png` | Customer | Authenticated `Rahul Sharma` (`customer@tijum.com`), Email Verified badge, Wishlist count (`2`), full account menu |
| 13 | `13-customer-rewards.png` | Customer | `750 pts` wallet, `4 ACTIVE` coupons, formatted activity date (`23 Nov 2026`) |
| 14 | `14-customer-wishlist.png` | Customer | 2 saved stays with real property photography and ratings |
| 15 | `15-partner-dashboard.png` | Partner | Authenticated `Hello, Kalyan Chakravarthy`, `Confirmed Stays: 2`, `Monthly Earnings: ₹12,861`, `1 Arrivals Today`, `7 properties / 127 rooms`, `Unsettled payout: ₹2,915.16`, 4 recent bookings |
| 16 | `16-partner-properties.png` | Partner | 7 active verified properties with real cover photos, room category summaries, meal disclosures, `Inspect Physical Rooms` & management tools |
| 17 | `17-partner-reservations.png` | Partner | Authenticated upcoming guest bookings with real payouts (`₹2,915.16` and `₹5,950`), `View Details`, `Manage Booking` |
| 18 | `18-partner-reservation-detail.png` | Partner | `TJR-2026-TODAY-QA02`, `4 Days`, horizontal meal obligations, Gross `₹3,400`, Commission `-₹408`, Estimated Host Payout `₹2,915.16`, Allocated `Room #102`, `Check In Guest` action |
| 19 | `19-partner-financial-profile.png` | Partner | Verified `Sri Sai Balaji Hospitality Private Limited`, `Private Limited Company`, `Hospitality Service Provider`, PAN `ABCDE1234F`, GSTIN `36ABCDE1234F1Z5`, HDFC Bank `XXXXXX4892`, visible white Edit header button |
| 20 | `20-partner-settlements.png` | Partner | Summary cards (`Total Settled: ₹12,861`, `Pending Payouts: ₹2,915.16`), formatted dates (`23 Nov 2026`, `13 Nov 2026`), amber `approved` vs emerald `settled` badges |
| 21 | `21-partner-settlement-detail.png` | Partner | Unclipped `Settlement Statement` header + `Settled` pill, `₹12,861.00` net payout, `trf_qa_settled_001`, full deduction math (`₹15,000 - ₹1,800 - ₹324 - ₹15`) |
| 22 | `22-help-faq.png` | Guest | API-loaded FAQs + support contact card |
| 23 | `23-legal-terms.png` | Guest | Formatted Terms & Conditions |

### 3.2 Explicitly Categorized Empty, Auth-Gate & Error States (`docs/mobile/screenshots/states/`)
| File | Scenario Verified |
|---|---|
| `states/state-empty-customer-bookings.png` | Authenticated zero-booking customer (`empty.customer@tijum.test`) sees clean "No upcoming bookings" empty state with "Explore Stays" CTA |
| `states/state-empty-partner-properties.png` | Authenticated zero-property partner (`empty.partner@tijum.test`) sees clean "No properties listed" empty state with "+ Add New Property" CTA |
| `states/state-auth-gate-partner-dashboard.png` | Unauthenticated guest visiting `/(partner)/dashboard` sees intentional "Partner Access Required" gate |
| `states/state-error-explore-api-down.png` | Simulated HTTP 503 outage on `/api/v1/*` renders clean "Unable to Load Stays" recovery state with "Tap to Retry" CTA |
