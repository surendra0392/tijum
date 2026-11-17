# TIJUM Progressive Web App (PWA) Implementation Guide

**Date:** 2026-11-17  
**Platform Stack:** Laravel 13 · PHP 8.4/8.5 · MySQL 8 / InnoDB · React 19 · TypeScript 5.7 · Inertia.js 3 · Tailwind CSS v4 · Vite 8  
**Native Companion App:** Preserved independently in `apps/mobile` (React Native 0.83.10 / Expo SDK 55)

---

## 1. Architecture Summary

TIJUM has been upgraded into a single unified, same-origin Progressive Web App (`scope: "/"`, `start_url: "/"`) spanning:

- **Public Discovery Website:** Home, Search, Explore, City & Category landings, Property & Room details, FAQ, About, Partner onboarding, Legal pages.
- **Customer Portal (`web` guard):** Dashboard, Reservations, Payments, Reviews, Wishlist, Rewards & Referrals, Support Tickets, Profile, Security, Notifications.
- **Partner / Owner Portal (`owner` guard):** Dashboard, Onboarding, Verification, Properties/Rooms/Pricing/Availability, Front Desk, Reservations, Settlements, Financial Profile, Partner Support, Notifications.
- **Administration Console (`admin` guard + TOTP 2FA):** Operations, Reservations, Partner Verification, Properties, Cases & Relocations, Finance & Settlements, Content/CMS, Marketing/SEO, Notification Ops & Template Registry, System Security.

The PWA **augments** the existing Inertia.js 3 web platform without duplicating portals or impacting the separate React Native Expo app (`mobile_devices` table and `/api/v1/*` mobile endpoints remain untouched).

---

## 2. Branding, Icons & Web App Manifest

Derived cleanly from official TIJUM source assets (`public/brand/app/tijum-app-icon.png` and `public/brand/icons/tijum-symbol-light.png`) using Deep Plum `#442F41`, Coral `#FF7A67`, and Cream `#FFF4EE`:

| Artifact | Purpose | Size / Format |
| --- | --- | --- |
| `public/manifest.webmanifest` | Primary Web App Manifest (`id: "/"`, `display: "standalone"`) | JSON (`application/manifest+json`) |
| `public/site.webmanifest` | Synchronized fallback manifest referenced by browsers | JSON (`application/manifest+json`) |
| `public/pwa/icon-192x192.png` | Standard Home Screen / launcher icon | 192×192 PNG |
| `public/pwa/icon-512x512.png` | Splash screen & high-res installer icon | 512×512 PNG |
| `public/pwa/icon-maskable-512x512.png` | Android adaptive maskable icon (64% safe-zone emblem on `#442F41` canvas) | 512×512 PNG |
| `public/apple-touch-icon.png` | iOS/iPadOS Home Screen icon | 180×180 PNG |

### Root HTML & MIME Configuration

- **`resources/views/app.blade.php`:**
  - Viewport updated with `viewport-fit=cover` for notched mobile displays in standalone mode.
  - `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`.
  - `<meta name="mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`, `<meta name="apple-mobile-web-app-title" content="TIJUM">`.
  - Light (`#442F41`) & dark (`#1E131D`) `<meta name="theme-color">` tags synchronized with TIJUM's light-first theme initializer.
- **`public/.htaccess`:** Registers `AddType application/manifest+json .webmanifest` for Apache/Herd hosting.

---

## 3. Unified Service Worker & Security Boundaries (`public/sw.js`)

TIJUM runs a single Service Worker (`public/sw.js`) scoped at `/` with strict caching boundaries tailored to Laravel + Inertia SSR/CSR authentication:

### Strict Network-Only / Non-Cached Surfaces

- **All non-GET requests** (`POST`, `PUT`, `PATCH`, `DELETE`): Never intercepted.
- **All cross-origin requests** (Razorpay checkout scripts/endpoints, Google Maps, third-party fonts/analytics): Never intercepted.
- **Inertia XHR requests (`X-Inertia` header):** Never intercepted so CSRF/session expiry and offline network errors flow cleanly to Inertia's handlers.
- **Document navigations (`request.mode === 'navigate'`):** Strictly **Network-Only** — HTML containing CSRF tokens and `props.auth` is **never cached**. When offline, navigations fall back cleanly to `public/offline.html`.
- **Sensitive path prefixes:** `/login`, `/register`, `/logout`, `/forgot-password`, `/reset-password`, `/two-factor-challenge`, `/email/verify`, `/user/`, `/dashboard`, `/settings`, `/account`, `/notifications`, `/support`, `/my-support`, `/rewards`, `/wishlist`, `/reservations`, `/payments`, `/checkout`, `/webhooks`, `/razorpay`, `/owner`, `/admin`, `/api`, `/sanctum`, `/up`.

### Cache-First Immutable Public Static Assets

- Only static hashed assets and public branding artwork under `/build/assets/`, `/pwa/`, `/brand/`, `/images/public/`, `/offline.html`, `/manifest.webmanifest`, `/apple-touch-icon.png`, and `/favicon*` use `Cache-First` (`tijum-static-2026-11-17-v1`, `tijum-assets-2026-11-17-v1`).
- Old version caches matching `tijum-*` are automatically purged on `activate`.

### Lifecycle & Logout Cleanup

- **Safe Updates (`SKIP_WAITING`):** `PWAUpdateBanner` notifies users when a new worker waits, and suppresses both update prompts and `controllerchange` reloads during `/checkout`, `/payments`, `/reservations/create`, and payment routes so active transactions are never interrupted.
- **Logout Cleanup (`CLEAR_USER_CACHES`):** Calling `clearPwaUserCaches()` on Customer (`user-menu-content.tsx`), Owner (`owner-layout.tsx`), and Admin (`admin-layout.tsx`) sign-out — plus automatic detection when `props.auth` drops across Inertia visits in `resources/js/app.tsx` — flushes non-static worker caches.
- **Server Cache Headers (`app/Http/Middleware/NoStoreSensitiveResponses.php`):** Appends `Cache-Control: no-store, no-cache, must-revalidate, max-age=0, private`, `Pragma: no-cache`, and `Expires: 0` globally to authenticated requests (`web`, `owner`, `admin` guards) as well as auth, checkout, payments, bookings, owner, admin, and authenticated mobile API routes, while leaving public SEO/catalogue pages cacheable.

---

## 4. Installability, Offline UX & Portal Integration

- **`resources/js/lib/pwa.ts`:**
  - Registers `/sw.js` with `updateViaCache: 'none'`.
  - Captures Chromium `beforeinstallprompt` events cleanly without auto-prompting and detects iOS/iPadOS Safari (`isIosSafariBrowser`) + installed mode (`isStandalonePwa`).
  - Tracks current Inertia route via `router.on('navigate')` (`useCurrentRoutePath`) so overlays work at root level without requiring `PageContext`.
- **`resources/js/components/pwa/PWAInstallPrompt.tsx`:**
  - Exports `<PWAInstallPrompt />` (delayed non-blocking banner with 14-day localStorage dismiss cooldown, hidden when installed or on checkout/payment routes) and reusable `<PWAInstallButton />` (including a step-by-step Safari Share → Add to Home Screen modal for iOS/iPadOS).
  - Integrated into `resources/js/app.tsx` `withApp()`, `PublicLayout` mobile drawer, `MobileAppFloating` modal, and `UserMenuContent`.
- **`resources/js/components/pwa/PWAUpdateBanner.tsx` & `PWAOfflineBanner.tsx`:**
  - `PWAOfflineBanner` listens to browser `online`/`offline` and Inertia `networkError` events, warns that bookings/payments require connectivity, and triggers `router.reload()` once online.
- **`resources/css/app.css`:** Adds standalone `overscroll-behavior-y: contain` and `env(safe-area-inset-top/bottom)` classes (`.tijum-safe-bottom`).

---

## 5. Phase 18 Web Push Integration

Preserves the Phase 18 Central Notification Architecture (`NotificationDispatcher` -> `NotificationDelivery` -> `SendNotificationDeliveryJob`):

- **Database Isolation:**
  - Migration `database/migrations/2026_11_17_140000_create_web_push_subscriptions_table.php` and model `app/Models/WebPushSubscription.php` store browser PushSubscriptions (`endpoint_hash`, `endpoint`, `public_key`, encrypted `auth_token`, `content_encoding`, polymorphic `notifiable`) strictly separate from Expo `mobile_devices`.
- **Multi-Guard Authenticated Subscription Routes (`app/Http/Controllers/Notifications/WebPushSubscriptionController.php`):**
  - Customer (`web`): `POST/DELETE /notifications/push-subscriptions`
  - Owner (`owner`): `POST/DELETE /owner/notifications/push-subscriptions`
  - Admin (`admin` + 2FA): `POST/DELETE /admin/notifications/push-subscriptions`
- **Pure-PHP RFC 8291/8292 Push Transport (`app/Services/Notifications/Channels/WebPushChannel.php`):**
  - Implements ECDH P-256 + HKDF-SHA-256 + AES-128-GCM (`aes128gcm`) payload encryption and ES256 VAPID JWT signing using PHP's native `openssl` extension (zero unapproved Composer dependencies).
  - Strips sensitive fields (`otp_code`, `password`, `token`, `secret`) before encryption; handles `404`/`410` gateway responses by revoking stale browser subscriptions; updates `notification_deliveries` when dispatching browser push or coexists alongside native Expo devices inside `SendNotificationDeliveryJob::dispatchPushChannels()`.
  - `HandleInertiaRequests` exposes only `pwa.webPushEnabled` and `pwa.webPushPublicKey` — `VAPID_PRIVATE_KEY` never leaves the server.
- **UI Controls (`resources/js/components/pwa/WebPushToggle.tsx`):**
  - Embedded in Customer notification settings (`resources/js/pages/settings/notifications.tsx`), Owner notification settings (`resources/js/pages/owner/settings/notifications.tsx`), and Notification Center headers (`customer`, `owner`, `admin`).
  - Strictly user-initiated on button click (never prompts `Notification.requestPermission()` on page load), while SMS and WhatsApp remain disabled per platform configuration.

---

## 6. Deployment & Production Checklist

1. Ensure migrations have been applied on production (`php artisan migrate --force`).
2. Run `npm run build` during deployment so `public/build/manifest.json` and Vite hashed chunks are up to date.
3. To enable live browser Web Push delivery across Chrome/Edge/Firefox/Safari PWA in production, generate a VAPID P-256 keypair and add to `.env`:
   - `WEB_PUSH_ENABLED=true`
   - `VAPID_PUBLIC_KEY=<base64url-uncompressed-65-byte-p256-public-key>`
   - `VAPID_PRIVATE_KEY=<base64url-32-byte-scalar-or-pem>`
   - `VAPID_SUBJECT=mailto:notifications@tijum.com`
4. Serve the site exclusively over HTTPS in production (required by browsers for Service Workers and Push API outside localhost).
