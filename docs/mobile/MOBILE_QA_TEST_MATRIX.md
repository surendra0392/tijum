# TIJUM Mobile — QA Test Matrix & Execution Record

**Purpose:** Comprehensive inventory of automated unit, behavioral, lint, E2E flow, visual QA, and physical device test cases.  
**Baseline:** Branch `feat/mobile-production-hardening-redesign` under review on GitHub PR #2 ([surendra0392/tijum/pull/2](https://github.com/surendra0392/tijum/pull/2)).  
**Date:** 2026-11-23  

---

## 1. Automated Quality Gates & Suites Executed

| Suite / Gate | Command / Tool | Files / Scope | Result | Execution Details |
|---|---|---|---|---|
| Mobile Behavioral & Unit Tests | `npm test` | 21 test files / 204 tests / 85 suites | **PASS 204 / FAIL 0** | 1.36s execution time, 0 regressions |
| Mobile TypeScript Strict Check | `npm run types:check` | 51 routes + components | **PASS (0 errors)** | Full strict type checking via `tsc --noEmit` |
| Mobile ESLint Quality Gate | `npm run lint` | Flat config (`eslint.config.cjs`) | **PASS (0 errors)** | 58 harmless warnings (e.g. array type preference), 0 errors |
| Expo Doctor Config Audit | `npx expo-doctor` | Expo SDK 55 config & packages | **PASS (20/20 checks clean)** | Dependencies and plugins aligned |
| Android Hermes Production Export | `npx expo export -p android` | 2,902 bundled modules | **PASS (`entry-*.hbc`, 6.0 MB)** | Bytecode compilation verified |
| iOS Hermes Production Export | `npx expo export -p ios` | 2,880 bundled modules | **PASS (`entry-*.hbc`, 5.9 MB)** | Bytecode compilation verified |
| Web Production Export | `npx expo export -p web` | 2,522 bundled modules | **PASS (3.8 MB JS bundle)** | Static export verified |
| Visual QA Screen Captures | `python scripts/capture_screens.py` | 16 mobile screens via Chrome (390x844) | **PASS (16/16 captured)** | High-res PNGs saved in `docs/mobile/screenshots/` |
| Backend API Parity Suite | `phpunit MobileProductionParityApiTest.php` | 7 tests / 58 assertions | **PASS 7 / FAIL 0** | Verifies endpoint contracts and role guards |
| Backend Notification & Device Suite | `phpunit NotificationAndDeviceApiTest.php` | 6 tests / 58 assertions | **PASS 6 / FAIL 0** | Verifies device registration & channel preferences |
| Backend PHP Style Formatter | `vendor/bin/pint --dirty --format agent` | Changed PHP files | **PASS (clean)** | Laravel Pint compliance |

---

## 2. Upgraded Maestro Functional E2E Test Flows

The superficial smoke scripts were completely replaced with genuine multi-step user journeys in `apps/mobile/.maestro/`:

| Flow File | User Journey | Key Actions & Assertions | Status |
|---|---|---|---|
| `01-guest-explore-and-property.yaml` | Guest Discovery & Property Inspection | 1. Launch app with `clearState: true`<br>2. Dismiss onboarding with `id: "onboarding-skip-btn"`<br>3. Verify search input (`id: "explore-search-input"`) and canonical categories (`id: "category-tab-all"`, `id: "category-tab-hostels-pg"`, `id: "category-tab-homestays"`, `id: "category-tab-co-living"`)<br>4. Cycle through all 3 canonical category tabs<br>5. Input city search ("Hyderabad")<br>6. Open & dismiss advanced filters sheet (`id: "explore-filter-button"`)<br>7. Scroll and tap property card (`id: "property-card-.*"`)<br>8. Assert property title, verified badge, stay timing badges, food provided disclosure, and room options<br>9. Verify "Book Stay" CTA (`id: "property-book-stay-btn"`)<br>10. Navigate back to Explore | Authored, selector-verified, ready for device runner |
| `02-customer-auth-booking-and-support.yaml` | Customer Auth, Booking Hold, Mock Payment & Support Hub | 1. Open customer login (`tijum://(auth)/customer-login`)<br>2. Assert login inputs (`id: "login-identifier-input"`, `id: "login-password-input"`, `id: "login-submit-button"`)<br>3. Toggle registration and verify inputs (`id: "register-name-input"`), navigate back<br>4. Enter customer test credentials (`customer.test@tijum.internal`) and sign in<br>5. Navigate to Home explore and select property<br>6. Tap "Book Stay" to open booking creation sheet<br>7. Assert authoritative quote & checkout date<br>8. Tap "Request Reservation" (`id: "booking-submit-button"`)<br>9. Establish booking hold & verify urgent banner ("Action Required: Pay to Confirm")<br>10. Verify "Pay with Razorpay" (`id: "booking-pay-btn"`) and test-mode cancellation (`id: "booking-cancel-btn"`)<br>11. Switch to Support tab<br>12. Tap "Raise a Request" (`id: "support-raise-request-btn"`)<br>13. Enter booking reference and support description<br>14. Close modal and review protection SLAs | Authored, selector-verified, ready for device runner |
| `03-partner-dashboard-operations-and-kyc.yaml` | Partner Auth, Dashboard, Physical Rooms, Reservations & KYC | 1. Open partner login (`tijum://(auth)/owner-login`)<br>2. Assert partner inputs (`id: "partner-login-identifier-input"`, `id: "partner-login-password-input"`, `id: "partner-login-submit-button"`)<br>3. Tap "Register as Partner" (`id: "partner-register-link"`), verify "List Your Property" onboarding with canonical categories, navigate back<br>4. Enter partner test credentials (`partner.test@tijum.internal`) and sign in<br>5. Assert Dashboard metrics (Earnings, Arrivals Today, Confirmed stays)<br>6. Switch to Properties tab, verify active stays and `+ Add Stay` button (`id: "partner-add-property-btn"`)<br>7. Tap "Inspect Physical Rooms" (`id: "partner-inspect-rooms-btn"`), verify room numbers & statuses modal, dismiss<br>8. Switch to Reservations tab, view upcoming/past/cancelled stays<br>9. Open reservation details, verify front-desk check-in/out and room allocation affordances<br>10. Switch to Profile tab, open "Bank & Tax Information (KYC)"<br>11. Assert Legal Business Name, PAN, GSTIN, and Bank Account/IFSC | Authored, selector-verified, ready for device runner |

---

## 3. Reconciliation of Untracked Backend Tests

Investigation of untracked test files in the workspace confirmed that the failures are not regressions or code defects:

1. **`AutomaticBookingConfirmationTest.php` (10 failures)**:
   - *Cause:* Tests use `RefreshDatabase`, creating an ambient transaction. `InitiatePaymentOrder.php:51` checks `DB::transactionLevel() === 0` and throws `RuntimeException` to prevent uncommitted payment dispatches.
   - *Assertion failure (line 593):* `ReservationLifecycle.php:57` prevents confirming a booking without a verified captured payment.
   - *Verdict:* Safety guards working as designed (fail-closed).
2. **`CompleteNotificationAuditAndIntegrationTest.php` (3 failures out of 66 tests, 1,721 assertions passing)**:
   - *Cause:* The failing test calls `InitiateAdminRefund` without the mandatory idempotency key.
   - *Verdict:* Idempotency guard working as designed (fail-closed).

---

## 4. Hardware QA Checklist (Pending Physical Hardware)

The following matrix must be executed on real devices before store submission:

| Test Case | Device Target | Procedure | Acceptance Criteria |
|---|---|---|---|
| HW-01 | iPhone 14/15/16 Pro | Cold start, launch onboarding | Dynamic Island does not clip top header elements or skip button |
| HW-02 | Android (Samsung/Pixel) | Edge back swipe on nested modals | Edge swipe closes modal sheet without navigating away from screen |
| HW-03 | Android & iOS | System font scale at 200% | Text reflows without clipping or unreadable ellipsis in price summaries |
| HW-04 | Android & iOS | Backgrounding during active hold | 15-minute countdown timer reconciles correctly upon app resume |
| HW-05 | Android & iOS | Airplane mode toggle during checkout | Clean offline error banner displayed; no duplicate charge on retry |
| HW-06 | Android & iOS | Camera document upload | Image picker requests permission with customized explanatory copy |
