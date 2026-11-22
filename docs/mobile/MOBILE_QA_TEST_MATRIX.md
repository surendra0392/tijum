# TIJUM Mobile — QA Test Matrix

**Purpose:** Real, executable test cases (not existence checks) for customer,
partner, payment, offline, and role-isolation behavior — plus a clear record of
what was actually run in this audit vs. what still requires a device.

Legend for **Run** column:
- ✅ **Automated-now** — covered by the 204-test Node suite / committed PHPUnit
  tests, executed green this audit.
- 🎭 **E2E-authored** — a Maestro flow exists but requires a device/emulator to
  run (NOT executed here).
- 📱 **Device-required** — must be executed on real hardware (NOT run here).

---

## 1. Automated tests executed this audit (verified green)

| Command | Scope | Result |
|---|---|---|
| `cd apps/mobile && npm test` | 21 files / 204 tests (auth, storage, search, booking, payments, rewards, deep links, parity, brand) | **PASS 204 / 0** |
| `cd apps/mobile && npm run types:check` | TypeScript strict | **PASS** |
| `cd apps/mobile && npm run lint` | correctness lint | **PASS** |
| `phpunit MobileProductionParityApiTest` | mobile↔API parity | **PASS 7/7** |
| `phpunit NotificationAndDeviceApiTest` | notifications + device tokens | **PASS 6/6** |
| `vendor/bin/pint --dirty` | PHP style | **PASS** |

### Representative automated behaviors already covered (from suite names)
- Secure token storage + **role session isolation** (`secureStorageAndAuthState`,
  `offlineRevocation`).
- API client safe parsing + revocation (`apiClientSafeParsing`,
  `apiClientAndRevocation`).
- Deep-link sanitizer + routing (`deepLinkSanitizer`, `deepLinksAndNotifications`).
- Razorpay order + payment state machine (`razorpayAndPaymentState`,
  `endToEndPaymentLifecycle`).
- Rewards/loyalty/promotion integrity (`rewardsEcosystem`).
- Review eligibility at checkout, physical room allocation rules, forgot-password
  targeting (`stageM3Extensions`).
- Brand/truth-in-advertising copy parity + front-desk (`brandParityAndFrontDesk`).

---

## 2. Customer journeys

| # | Case | Steps (summary) | Expected | Run |
|---|------|-----------------|----------|-----|
| C-1 | First launch, guest browse | cold start → explore loads | no blank/infinite spinner; listings from API | 📱 |
| C-2 | Register → verify → login | register, (verify email), login | session stored in secure store; lands on explore | ✅ (auth) + 📱 |
| C-3 | Session restore after kill | login, kill app, relaunch | still authenticated; no ex-user data | ✅ (offlineRevocation) |
| C-4 | Logout then account switch | logout customer → login partner | no customer data leaks into partner session | ✅ (role isolation) |
| C-5 | Search + filters + sort | apply city/category/price/food filters | results match backend; empty state on no results | ✅ + 🎭 (01) |
| C-6 | Property detail accuracy | open property | title/verified/amenities/price from backend; no fake pins | 🎭 (01) |
| C-7 | Booking: quote → create → hold | select dates, quote, create | server-authoritative price; 15-min hold shown | ✅ (booking) + 🎭 (02) |
| C-8 | Payment success (test mode) | initiate → Razorpay test → verify | reservation Confirmed only after backend verify | ✅ (razorpay state) + 📱 |
| C-9 | Payment cancel/fail/timeout | cancel sheet / decline | reservation not confirmed; retry safe; no double charge | ✅ (payment lifecycle) |
| C-10 | App killed during payment | kill at Razorpay sheet, relaunch | reconcile via `getPaymentStatus`; truthful state | 📱 |
| C-11 | Cancellation + refund status | cancel eligible booking | correct eligibility + truthful refund status (no fake completion) | ✅ (refund states) |
| C-12 | Review eligibility + submit | at/after checkout | eligible paid confirmed booking reviewable; 4 subcategories | ✅ (m3 review) |
| C-13 | Rewards/coupon apply | view points, validate coupon | backend-calculated amounts; no invented balance | ✅ (rewards) |
| C-14 | Support ticket + protection case | create ticket/case, add message | persists; timeline visible | 🎭 (02) |
| C-15 | Sessions: list + revoke all | profile/security | real tokens listed; revoke-all succeeds (F-1 fix) | ✅ (types/tests) + 📱 |
| C-16 | 2FA / recovery codes | enable 2FA, TOTP, recovery | challenge + recovery flow works | ✅ (auth tests) + 📱 |

## 3. Partner journeys

| # | Case | Steps | Expected | Run |
|---|------|-------|----------|-----|
| P-1 | Register → pending → login | register property/business | never shows unapproved as approved | 🎭 (03) + ✅ |
| P-2 | Dashboard numbers | open dashboard | every metric from `getDashboard`; no fabricated data | 🎭 (03) |
| P-3 | Property create/edit + submit verification | full form | draft preserved; validation; moderation-gated publish | 🎭 (03) |
| P-4 | Room type / room / pricing / availability | CRUD each | conflicts guarded; reflects to customer search | ✅ (owner ops) + 📱 |
| P-5 | Reservation front-desk | allocate room, check-in, check-out | valid transitions only; no cross-partner access | ✅ (m10a owner ops) |
| P-6 | Financial profile + settlements | view profile, settlements | truthful backend status; **no payout-bypass UI** | ✅ + 🔒 |
| P-7 | Reviews reply + cases | reply, add evidence | persists; correct visibility | 🎭 (03) |
| P-8 | Notification preferences | toggle channels | aligned to `channels_available` (WIP fix) | ✅ (NotificationAndDevice) |

## 4. Payment / financial integrity (critical)

| # | Case | Expected | Run |
|---|------|----------|-----|
| F-1 | Amount is backend-generated | client cannot tamper amount | ✅ |
| F-2 | No client-side success fabrication | callback alone never marks paid | ✅ (razorpay state tests) |
| F-3 | Duplicate callback / double tap | idempotent; no double charge | ✅ |
| F-4 | Uncertain state → reconcile | safe reconciliation via status endpoint | ✅ |
| F-5 | No unverified refund completion | refund status strictly from backend | ✅ |
| F-6 | Live controls disabled | `live_enabled/settlements/route=false`, mode=test | ✅ (config + env verified) |
| F-7 | No payout-bypass path in app | settlement screens read-only | ✅ (screen review) |

## 5. Offline / error / resilience

| # | Case | Expected | Run |
|---|------|----------|-----|
| O-1 | No network at startup | truthful offline state, not infinite spinner | ✅ (apiClient) |
| O-2 | Network lost mid-booking | no mutation corruption; retry safe | ✅ |
| O-3 | HTTP 401/403/404/409/422/429/500/503 | mapped to useful messages; 429 throttling handled | ✅ (safeParsing) |
| O-4 | Expired session | clean re-auth, token revocation honored | ✅ (offlineRevocation) |
| O-5 | Invalid JSON / missing fields | no crash; safe parse | ✅ |
| O-6 | Rapid repeated taps | no duplicate submissions (esp. financial) | ✅ (idempotency) |
| O-7 | Background→foreground | state preserved; no stale override of server truth | 📱 |

## 6. Role isolation / security

| # | Case | Expected | Run |
|---|------|----------|-----|
| S-1 | Customer token on partner endpoint | rejected (403/401) | ✅ (backend guards) |
| S-2 | Partner token on customer endpoint | rejected | ✅ |
| S-3 | Cross-account resource access (IDOR) | ownership enforced backend-side | ⚠️ controller-level pass recommended (see parity doc) |
| S-4 | No secrets in `EXPO_PUBLIC_*` | only public URLs/ids present | ✅ (.env/app.json review) |
| S-5 | Secure token storage | tokens in Keychain/Keystore, not AsyncStorage | ✅ (SecureTokenStorage) |
| S-6 | Dev/preview cannot hit prod | base-URL guard blocks `tijum.com` | ✅ (client.ts review) |

---

## 7. E2E (Maestro) flows authored — DEVICE REQUIRED

Located at `apps/mobile/.maestro/` (appId corrected to `com.tijum.app` this
audit; previously `com.tijum.mobile` → flows could not target the real build):

1. `01-guest-explore-and-property.yaml` — guest onboarding, explore, filters,
   property details.
2. `02-customer-auth-booking-and-support.yaml` — customer auth, booking,
   payment, support.
3. `03-partner-dashboard-operations-and-kyc.yaml` — partner dashboard,
   operations, KYC.

**Status:** 🎭 authored, **not executed** (requires emulator/device + test
accounts + reachable API). Must be run before final release.

## 8. Gaps / not run (honesty)

- All 📱 items: physical iOS (no macOS), physical Android (no device session
  this pass).
- Native Razorpay checkout in a real dev/preview build (live disabled by policy).
- Push notification device round-trip.
- Staging API validation — `staging.tijum.com` does not resolve (blocker).