# TIJUM Mobile — Release Readiness Assessment

**Branch:** `feat/mobile-production-hardening-redesign`  
**GitHub Pull Request:** [PR #2 (surendra0392/tijum/pull/2)](https://github.com/surendra0392/tijum/pull/2)  
**Baseline Commit:** `1719e2df65a874ec23379c5519f4d2c9738e1e23`  
**Working Commit:** Under review on PR #2  
**Verdict:** **NO-GO FOR PUBLIC STORE RELEASE** (Automated checks green, lint clean, Hermes exports verified; physical hardware QA and staging DNS resolution pending)  
**Assessment Date:** 2026-11-23  

---

## 1. Release Verdict & Policy Posture

**Public production release verdict is strictly NO-GO.**

While all automated tests, type checks, lint checks, visual screenshot captures, and Hermes production bytecode exports are fully green, the application **cannot and must not be submitted to Google Play or Apple App Store** until:
1. Physical device QA is completed on real Android and iOS hardware across critical user journeys.
2. The isolated staging infrastructure (`staging.tijum.com`) is operational with DNS and SSL configured.
3. Live payment and payout controls remain securely disabled per mandatory safety rules.

---

## 2. Six-Way Verification Partitioning

### 2.1 Tests Actually Executed
The following test suites and quality gates were executed directly in this environment and verified 100% passing:

| Gate / Suite | Runner / Command | Count / Scope | Result |
|---|---|---|---|
| Mobile Behavioral & Unit Tests | `node --test __tests__/*.test.ts` | 21 test files / 204 tests / 85 suites | **PASS 204 / FAIL 0** (1.36s) |
| Mobile TypeScript Strict Check | `tsc --noEmit` in `apps/mobile/` | Full mobile codebase (51 routes + components) | **PASS (0 errors)** |
| Mobile ESLint Quality Gate | `eslint --config eslint.config.cjs app src` | Flat config (`eslint-config-expo/flat`), 51 routes + components | **PASS (0 errors, 58 warnings)** |
| Mobile Expo Project Doctor | `npx expo-doctor` in `apps/mobile/` | 20 configuration and dependency checks | **PASS (20/20 clean)** |
| Android Hermes Production Bytecode | `npx expo export --platform android` | 2,902 bundled modules | **PASS (`entry-*.hbc`, 6MB)** |
| iOS Hermes Production Bytecode | `npx expo export --platform ios` | 2,880 bundled modules | **PASS (`entry-*.hbc`, 5.9MB)** |
| Web Production Export | `npx expo export --platform web` | 2,522 bundled modules | **PASS (3.8MB JS)** |
| Visual QA Screen Captures | `python scripts/capture_screens.py` | 16 mobile screens rendered via Chrome headless (390x844) | **PASS (16/16 captured)** |
| Backend API Parity Suite | `phpunit MobileProductionParityApiTest.php` | 7 tests / 58 assertions | **PASS 7 / FAIL 0** |
| Backend Notification & Device Suite | `phpunit NotificationAndDeviceApiTest.php` | 6 tests / 58 assertions | **PASS 6 / FAIL 0** |
| Backend PHP Style | `vendor/bin/pint --dirty --format agent` | Changed PHP files | **PASS (clean)** |

### 2.2 Native Builds Actually Compiled & EAS Cloud History
- **Local Compilation Level:** JavaScript, assets, and Hermes bytecode compilation (`.hbc`) succeeded cleanly for Android, iOS, and Web targets.
- **Local Binary Compilation (`.apk`, `.aab`, `.ipa`):** **NOT COMPILED LOCALLY**. Full local binary compilation requires native Android SDK/NDK/Gradle on Linux/macOS/Windows and Xcode on macOS.
- **EAS Cloud Build Account & Verified Records:**
  - Authenticated Account: `@tijum-app` (User: `tijum`, Email: `tijum.official@gmail.com`)
  - EAS Project ID: `b8ab7524-7056-43e3-99d6-1631315a58c2`
  - Verified Cloud Builds on Record (`npx eas-cli build:list`):
    1. **Android Production (Store AAB)**:
       - Build ID: `d293d94d-6d28-460b-8add-2e5846093cc6`
       - Status: `finished` | Version: `1.0.0` (code `3`) | Channel: `production`
       - Artifact: `https://expo.dev/artifacts/eas/CLu0vbe6ly0zuAnvi9OP2EKFWnKfLJIKmLafzJ8mx-8.aab`
    2. **Android Internal Preview (APK)**:
       - Build ID: `f3b03fc4-0366-4d25-b907-41a878ddda21`
       - Status: `finished` | Version: `1.0.0` (code `2`) | Channel: `preview`
       - Artifact: `https://expo.dev/artifacts/eas/Wy0TveE3GjZ8boPjVhGN2DpLEvLBo-jV2CeI_aTlCM4.apk`
    3. **Android Production Earlier (Store AAB)**:
       - Build ID: `15cd47f2-9f4b-410c-999a-ba627b2b663e`
       - Status: `finished` | Version: `1.0.0` (code `2`) | Channel: `production`
       - Artifact: `https://expo.dev/artifacts/eas/lkbdulMHMKE24_ee7vZNsU22mjh42i9e5S56lRKVu5Y.aab`

### 2.3 Tests Actually Run on Physical Devices
- **Physical Device Count:** **0 devices**.
- **Execution Record:** No real Android smartphone or physical iPhone was connected to this workstation. No emulator daemon (`adb devices` returned no targets) was active.
- **Truthful Status:** Zero physical touch, thermal, biometric, or battery tests were conducted on hardware.

### 2.4 Tests Written and Upgraded (Maestro E2E Flows)
The superficial smoke tests were completely replaced with genuine multi-step functional user journeys equipped with stable accessibility identifiers (`testID`):

| Test Flow File | Target Journey | Steps Covered | Execution Status |
|---|---|---|---|
| `apps/mobile/.maestro/01-guest-explore-and-property.yaml` | Guest Onboarding, Explore, Category Discovery & Property Details | Onboarding skip → canonical category switching (`hostels-pg`, `homestays`, `co-living`, `all`) → city search → filter sheet open/dismiss → property card selection → room options & amenities inspection | Ready for runner with attached device/emulator |
| `apps/mobile/.maestro/02-customer-auth-booking-and-support.yaml` | Customer Auth, Booking Hold, Mock Payment & Support Tickets | Customer login (`customer.test@tijum.internal`) → toggle registration → explore stays → select room & request hold → authoritative quote verification → 15-min countdown verification → Razorpay mock dismissal / cancellation → support hub inquiry creation | Ready for runner with attached device/emulator |
| `apps/mobile/.maestro/03-partner-dashboard-operations-and-kyc.yaml` | Partner Auth, Dashboard, Physical Rooms, Reservations & KYC | Partner login (`partner.test@tijum.internal`) → onboarding toggle ("List Your Property") → Dashboard metrics inspection → Properties list & Physical Rooms inspection modal → front-desk reservations review → KYC PAN, GSTIN & bank IFSC verification | Ready for runner with attached device/emulator |

### 2.5 Untested Screens & Workflows (Physical Device Dependency)
1. **Dynamic Safe Areas:** iPhone Dynamic Island / notch clipping on physical iPhone 14/15/16 Pro displays.
2. **Accessibility Font Scaling:** Layout reflow and text truncation when iOS "Larger Accessibility Sizes" (200%+) or Android "Font Size: Largest" is enabled.
3. **Android Physical Back Button:** Back navigation state handling through deep nested modal sheets.
4. **Biometric Auth Integration:** FaceID / Fingerprint hardware prompt behavior during 2FA challenge.
5. **Live Network Degradation:** Edge network drop/reconnect during active payment checkout or multipart image upload.

### 2.6 Infrastructure & Policy Blockers
1. **Staging DNS Resolution (NXDOMAIN):**
   - Domain: `staging.tijum.com`
   - Current Status: `nslookup staging.tijum.com` returns `NXDOMAIN`.
   - Impact: `eas.json` preview profile targets `https://staging.tijum.com/api/v1`. Any preview build distributed to internal testers fails on network calls until staging DNS resolves.
   - Exact Deployment Prerequisites (Without Touching Production):
     - Provision DNS `A` record for `staging.tijum.com` pointing to the isolated staging server IP.
     - Configure Nginx / Caddy virtual host with Let's Encrypt TLS certificate.
     - Provision dedicated MySQL database `tijum_staging` with isolated credentials (never pointed at `tijum_production`).
     - Deploy backend code with `.env.staging` containing `APP_ENV=staging`, `TIJUM_PAYMENTS_LIVE_ENABLED=false`, `RAZORPAY_MODE=test`, `TIJUM_PARTNER_SETTLEMENTS_ENABLED=false`, `TIJUM_RAZORPAY_ROUTE_ENABLED=false`.
2. **Financial Safety Controls (Mandatory Lock):**
   - `TIJUM_PAYMENTS_LIVE_ENABLED=false` (Verified)
   - `TIJUM_PARTNER_SETTLEMENTS_ENABLED=false` (Verified)
   - `TIJUM_RAZORPAY_ROUTE_ENABLED=false` (Verified)
   - `RAZORPAY_MODE=test` (Verified)

---

## 3. Visual QA Screen Capture Index

All 16 core customer, partner, auth, and legal screens were captured at mobile viewport (390x844) and archived in `docs/mobile/screenshots/`:

| Screen # | Artifact Filename | Route / View | Verification Highlights |
|---|---|---|---|
| 01 | `01-onboarding.png` | `/` | Carousel, brand mark, skip and continue buttons |
| 02 | `02-customer-login.png` | `/(auth)/customer-login` | Input fields, role switch, password recovery |
| 03 | `03-customer-register.png` | `/(auth)/customer-register` | Full customer registration form, terms agreement |
| 04 | `04-owner-login.png` | `/(auth)/owner-login` | Partner portal sign in, partner badge |
| 05 | `05-owner-register.png` | `/(auth)/owner-register` | 10-field partner onboarding, canonical categories |
| 06 | `06-explore-stays.png` | `/(customer)/explore` | Canonical category pills, search bar, filters button |
| 07 | `07-customer-bookings.png` | `/(customer)/bookings` | Bookings list filter tabs (upcoming, past, cancelled) |
| 08 | `08-customer-support.png` | `/(customer)/support` | Official support helpline, SLA link, raise request |
| 09 | `09-customer-profile.png` | `/(customer)/profile` | Profile details, security settings, wishlist navigation |
| 10 | `10-rewards-referrals.png` | `/(customer)/rewards/referrals` | Referral code, share button, rewards overview |
| 11 | `11-partner-dashboard.png` | `/(partner)/dashboard` | Business overview, arrivals today, occupancy |
| 12 | `12-partner-properties.png` | `/(partner)/properties` | Property cards, inspect physical rooms, add stay |
| 13 | `13-partner-reservations.png` | `/(partner)/reservations` | Guest bookings list, status badges, manage booking |
| 14 | `14-partner-settlements.png` | `/(partner)/settlements` | Payout history, statements, settlement statuses |
| 15 | `15-help-faq.png` | `/help` | FAQs, customer protection guidance, contact inquiry |
| 16 | `16-legal-terms.png` | `/legal/terms` | Formatted terms of service, platform guarantees |

---

## 4. Release Configuration Status

| Attribute | Specification | Status |
|---|---|---|
| Package / Bundle ID | `com.tijum.app` (Android & iOS) | ✅ Aligned |
| App Version / VersionCode | `1.0.0` / versionCode `3` / buildNumber `3` | ✅ Incremented |
| App Icon | 1024x1024 24-bit opaque RGB PNG (no alpha) | ✅ Apple ITMS-90717 compliant |
| Razorpay Plugin | `./plugins/withRazorpayConfig.cjs` (iOS UPI schemes + ProGuard) | ✅ Verified |
| iOS Usage Descriptions | Camera, Photo Library, Location When In Use | ✅ Configured |
| Android Permissions | `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS` | ✅ Minimal scope |
| Deep-Link Intent Filters | `https://tijum.com` (`/properties/*`, `/reservations/*`, `/owner/*`, etc.) | ✅ Configured |
