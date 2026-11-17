# TIJUM Progressive Web App (PWA) Verification & Test Report

**Date:** 2026-11-17  
**Environment:** PHP 8.4/8.5 · Laravel 13 · MySQL 8 (`tijum_test`) + SQLite test runner · Node / Vite+ 8 · Chrome Headless (CDP)

---

## 1. Automated Verification Summary

| Verification Check | Scope | Result | Details |
| --- | --- | --- | --- |
| **PWA PHPUnit Feature Suite** (`tests/Feature/Pwa`) | Manifest JSON & icon dimensions, SW boundaries, `NoStoreSensitiveResponses`, VAPID leak check, multi-guard WebPush subscriptions, RFC 8291 encryption & ES256 VAPID signing, 410 revocation, `SendNotificationDeliveryJob` | **PASSED** | 8 tests, 132 assertions passed |
| **MySQL Concurrency & PWA Suite** (`tijum_test` MySQL 8) | `tests/Feature/Pwa` + `CompleteNotificationAuditAndIntegrationTest.php` (including InnoDB row-lock & concurrency tests) | **PASSED** | 20 tests, 1,409 assertions passed (0 skipped) |
| **Phase 18 Notification Suite** (`tests/Feature/Notifications`) | Existing in-app, email, push, preferences, admin ops, webhooks, reminders (SMS & WhatsApp disabled) | **PASSED** | 66 tests, 1,738 assertions passed |
| **Core Web Regression Suite** (`PublicWebsiteTest`, `SitemapAndRobotsTest`, `Auth`, `Payments`, `Reservations`) | Public catalog/SEO, multi-guard auth flows, Razorpay payments & webhooks, reservation flows | **PASSED** | 197 passed (1,337 assertions; 10 MySQL-only concurrency tests skipped under SQLite default config, verified above on `tijum_test` MySQL) |
| **Laravel Pint** (`vendor/bin/pint --dirty --format agent`) | All modified & created PHP files | **PASSED** | Clean formatting |
| **PHPStan / Larastan** | `WebPushSubscriptionController`, `NoStoreSensitiveResponses`, `HandleInertiaRequests`, `SendNotificationDeliveryJob`, `WebPushSubscription`, `WebPushChannel` | **PASSED** | 0 errors |
| **TypeScript Type Check** (`npm run types:check`) | Full frontend TypeScript (`tsc --noEmit`) | **PASSED** | 0 errors |
| **Vite+ Frontend Lint** (`npx vp lint`) | All PWA modules & `WebPushToggle.tsx` | **PASSED** | 0 errors in PWA files |
| **Production Build** (`npm run build`) | Full Wayfinder + Vite 8 + Tailwind CSS v4 bundle (`vp build`) | **PASSED** | Generated `public/build/manifest.json` & chunked assets cleanly |
| **Database Migration** (`php artisan migrate`) | `2026_11_17_140000_create_web_push_subscriptions_table` | **PASSED** | Applied cleanly in 441.91ms |

---

## 2. Headless Chromium Runtime Verification (CDP)

Executed against the built Laravel + Vite application served over local HTTP (`http://127.0.0.1:8099/`) using installed Google Chrome (`--headless=new` via Chrome DevTools Protocol):

- **Manifest Validation (`Page.getAppManifest`):**
  - Manifest URL resolved: `http://127.0.0.1:8099/manifest.webmanifest`
  - Manifest validation errors: **`[]` (zero errors)**
- **Service Worker Activation & Scope:**
  - `navigator.serviceWorker.ready` resolved cleanly (`supported: true`, `scope: "http://127.0.0.1:8099/"`, `activeState: "activated"`).
  - `Notification.permission` remained `"default"` (confirming no automatic permission prompt on page load).
- **Cache Boundary Verification (`caches.keys()`):**
  - Active caches: `["tijum-static-2026-11-17-v1", "tijum-assets-2026-11-17-v1"]`.
  - Cached entries contained exclusively `/offline.html`, `/manifest.webmanifest`, `/pwa/*`, `/brand/*`, `/images/public/*`, `/favicon-32x32.png`, and `/build/assets/*` JS/CSS/font bundles. Zero HTML documents, zero CSRF payloads, zero auth/checkout/owner/admin routes were cached.
- **Runtime Errors:**
  - Uncaught JS exceptions: `[]`
  - Console errors: `[]`
- **Offline UX Banner:**
  - Transitioning network state to offline surfaced the accessible `PWAOfflineBanner` alert warning users that bookings, payments, and account actions require connectivity and offering one-click retry.

*(Note: After headless Chrome inspection exited, `npm run build` & `vp lint` were re-run after fixing one floating-promise ESLint warning in `WebPushToggle.tsx`; temporary CDP profile cleanup hit a Windows file-lock `EPERM` after printing metrics and was outside the workspace.)*

---

## 3. Environment Limitations & Manual Hardware Verification Items

The following items cannot be fully automated in a local Windows workstation environment without live domain HTTPS, production VAPID keys, and physical mobile hardware, and are reported transparently as unverified end-to-end against third-party push gateways/hardware:

1. **Live Push Gateway Delivery (FCM / Mozilla Push / Apple Web Push APNs):**
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` are currently unset in `.env`.
   - RFC 8291 payload encryption and ES256 VAPID JWT signing were cryptographically tested in PHPUnit using ephemeral OpenSSL P-256 keys against mocked HTTP push responses (`201` success & `410` revocation). Actual delivery to live Chrome FCM, Edge WNS, Firefox Autopush, or Apple Push services awaits setting production VAPID env vars on an HTTPS domain.
2. **Physical Hardware Install & Standalone Testing:**
   - **iPhone / iPad Safari (iOS 16.4+):** `Add to Home Screen`, safe-area notch layout, standalone navigation, and Web Push inside installed iOS Home Screen PWA should be verified manually on physical iOS hardware over HTTPS.
   - **Android Chrome / Edge:** `Install app` APK/WebAPK installation banner, adaptive maskable icon crop, and background push notification tap navigation should be verified on a physical Android device over HTTPS.
   - **macOS Safari / Chrome Desktop:** Desktop standalone window installation should be verified on macOS hardware.
   - **Lighthouse CLI Audit:** Chrome headless CDP manifest & SW checks passed; standalone Lighthouse CLI score was not separately executed.
