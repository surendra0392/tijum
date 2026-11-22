# TIJUM Mobile — Release Readiness

**Branch:** `feat/mobile-production-hardening-redesign`
**Baseline:** `1719e2df65a874ec23379c5519f4d2c9738e1e23`
**Verdict:** **CONDITIONAL GO**
**Date:** 2026-11-22

> This document separates **verified facts** from **owner actions** and
> **environment-blocked items**. No production deployment, OTA publish, store
> submission, or live-money enablement was performed.

---

## 1. Automated quality gates (verified green)

| Gate | Command | Status |
|------|---------|--------|
| Mobile unit/behaviour tests (204) | `npm test` | ✅ PASS |
| Mobile type check | `npm run types:check` | ✅ PASS |
| Mobile lint | `npm run lint` | ✅ PASS |
| Backend parity (committed) | `phpunit MobileProductionParityApiTest` | ✅ 7/7 |
| Backend notifications/devices (committed) | `phpunit NotificationAndDeviceApiTest` | ✅ 6/6 |
| PHP style | `vendor/bin/pint --dirty` | ✅ PASS |
| app.json validity | JSON parse | ✅ valid |

CI (`.github/workflows/tests.yml`) runs the above mobile job plus backend/web
jobs. The in-progress edit added `npm run lint` to the mobile CI job.

---

## 2. Release configuration audit

| Item | Value (app.json / eas.json) | Status |
|------|------------------------------|--------|
| Expo SDK | `~55.0.32` | ✅ current |
| React Native | `0.83.10` | ✅ |
| React | `19.2.0` | ✅ |
| App name | `TIJUM` | ✅ |
| Scheme | `tijum` | ✅ |
| iOS bundle id | `com.tijum.app` | ✅ |
| Android package | `com.tijum.app` | ✅ |
| Version / build | `1.0.0` / versionCode `3` / iOS build `3` | ✅ |
| Icon / adaptive icon / notification icon / splash | all assets present | ✅ |
| Splash bg | `#442F41` (deep plum) | ✅ on-brand |
| iOS usage descriptions | camera / photos / location added | ✅ (WIP) |
| iOS `ITSAppUsesNonExemptEncryption` | false | ✅ |
| Android permissions | `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS` | ✅ minimal |
| Deep-link intent filters (Android) | properties, reservations, owner, customer, help, legal | ✅ |
| iOS associated domains | `applinks:tijum.com` | ✅ |
| EAS projectId | set | ✅ |
| runtimeVersion policy | `appVersion` | ✅ |
| OTA updates url | `u.expo.dev/...` | ✅ configured |
| Razorpay native config plugin | `./plugins/withRazorpayConfig.cjs` (iOS UPI schemes + Android ProGuard) | ✅ (WIP) |
| Maestro appId | corrected to `com.tijum.app` | ✅ (fixed this pass) |

### Environment separation (eas.json)
- **development** → `http://10.0.2.2:8000/api/v1` (emulator loopback).
- **preview** → `https://staging.tijum.com/api/v1` (⚠️ staging down — see §4).
- **production** → `https://tijum.com/api/v1` (store).
- `src/api/client.ts` guards: production requires HTTPS + explicit URL;
  preview/development cannot target `tijum.com`; `NODE_ENV=test` blocks prod.
  Verified — **production builds cannot silently fall back to a dev URL, and
  dev/preview cannot hit production.**

---

## 3. Financial safety controls (verified disabled)

| Control | Value | Source |
|---------|-------|--------|
| `TIJUM_PAYMENTS_LIVE_ENABLED` | `false` | `.env:81`, `config/tijum.php:89` default |
| `TIJUM_PARTNER_SETTLEMENTS_ENABLED` | `false` | `config/tijum.php:128` default |
| `TIJUM_RAZORPAY_ROUTE_ENABLED` | `false` | `config/tijum.php:129` default |
| `RAZORPAY_MODE` | `test` | `.env:79` |

No mobile UI exposes a payout-bypass or live-money toggle. ✅

---

## 4. Blockers & required owner actions

### B-1 (Blocker for preview builds) — Staging environment unavailable
- `staging.tijum.com` **does not resolve** in DNS (`No such host is known`);
  production `tijum.com` returns HTTP 200.
- `eas.json` preview profile targets `https://staging.tijum.com/api/v1`.
- **Owner action:** provision `staging.tijum.com` (DNS + TLS + API + test data +
  test accounts) **or** repoint the preview profile to a working test API before
  building preview artifacts. Do **not** silently point preview at production.

### B-2 (Blocker for store submission) — Device & E2E QA not executed
- No physical iOS device / macOS toolchain in this environment; no Android
  device session used; Maestro flows authored but not run.
- **Owner action:** run Maestro flows 01–03 and the device matrix (small/large
  Android, modern/smaller iPhone, font scaling, safe areas, keyboard, offline)
  on real hardware; capture before/after screenshots per screen family.

### B-3 (Pre-existing, out of scope) — Untracked backend test files
- The working tree has many untracked test files from a prior session; two have
  pre-existing failures (`AutomaticBookingConfirmationTest`,
  `CompleteNotificationAuditAndIntegrationTest`). Not committed, not in CI.
- **Owner action:** finish-and-commit with proper mocks, or remove. Do not leave
  half-finished tests in the tree.

---

## 5. Fixes delivered this audit

1. **P0 — Token endpoints (customer + partner) corrected** to
   `auth/{customer,owner}/tokens` and `.../revoke-all`. Previously 404; the
   "active sessions / revoke all" screens were silently broken. Files:
   `src/api/customer.ts`, `src/api/owner.ts`.
2. **P2 — Maestro appId corrected** from `com.tijum.mobile` → `com.tijum.app`
   across `config.yaml` and all three flow files; the E2E suite could not target
   the real build before.
3. **Verified (no change needed)** — WIP notification-preference alignment
   (`channels_available`), partner notification-preference endpoints + routes,
   webhook idempotency messaging, iOS privacy descriptions, deep-link intent
   filters, Razorpay config plugin. All consistent with backend; committed tests
   pass.

---

## 6. Platform coverage

| Platform | Build config | Runtime QA | Store-ready |
|----------|--------------|-----------|-------------|
| Android | ✅ (package, versionCode, icons, intent filters, ProGuard) | 📱 not run | 🟡 pending B-2 |
| iOS | ✅ (bundle, buildNumber, usage desc, associated domains) | 📱 not run (no macOS) | 🟡 pending B-2 |
| Preview/staging | ⚠️ configured | ❌ staging down | 🔴 blocked (B-1) |

---

## 7. Pre-submission checklist

- [x] Automated client tests/types/lint green.
- [x] Committed backend parity + notification tests green.
- [x] Financial live controls disabled; test mode enforced.
- [x] Environment separation prevents dev/preview → prod.
- [x] P0 session-management defect fixed.
- [x] E2E appId corrected.
- [ ] Staging API reachable (B-1).
- [ ] Device + Maestro QA executed with screenshots (B-2).
- [ ] Accessibility screen-reader + font-scaling pass on device.
- [ ] Resolve/remove untracked backend test files (B-3).
- [ ] Owner approval before any deploy / store submit / live-money enablement.

---

## 8. Recommendation

**CONDITIONAL GO.** The mobile client is in good automated shape, a real P0
(session management) was fixed, and all production-safety controls are intact.
Release should proceed to device QA and staging validation next; **do not submit
to stores or enable live payments** until B-1 and B-2 are closed and the owner
grants explicit approval.