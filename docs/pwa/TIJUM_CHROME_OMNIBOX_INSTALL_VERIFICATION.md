# TIJUM Chrome Desktop Native PWA Install Icon Verification Report

**Date:** 2026-11-17  
**Browser Audited:** Google Chrome Desktop `157.0.8103.51` (Windows) — Fresh non-incognito user profile (`--user-data-dir`)  
**Live Domain Tested:** `https://tijum.com`  
**Local Production Build Tested:** `http://localhost:8098/` (built `public/build/`, `public/hot` excluded)

---

## 1. Executive Verdict

- **Local Updated Codebase (Ready for Chrome Omnibox Installability):** Passes every technical Chrome installability and manifest requirement (`manifestErrors: []`, `installabilityErrors: []` on `/` and `/search`, Service Worker `activated` and controlling `/sw.js` with scope `/`, `beforeinstallprompt` firing with `platforms: ["web"]`).
- **Live Domain (`https://tijum.com`) — BLOCKED / NOT YET DEPLOYED:** The production server currently serving `https://tijum.com` has **not yet deployed** the PWA commit (`cd7fcfd`) or subsequent updates. As a result, `https://tijum.com` fails Chrome's `no-manifest` installability check today until deployment occurs.
- **Visual Omnibox Pixel Screenshot Status:** While CDP telemetry (`Page.getAppManifest`, `Page.getInstallabilityErrors`, `beforeinstallprompt`, `navigator.serviceWorker`) ran inside headed Chrome `157.0.8103.51`, outer browser window frame capture via Windows GDI (`CopyFromScreen` / `PrintWindow`) failed in this non-interactive background session (`Win32Exception: The handle is invalid`), so visual pixel confirmation of Chrome's outer address bar strip cannot be claimed from this session and must be visually confirmed on your desktop after deploying to `https://tijum.com`.

---

## 2. Live Production Domain Audit (`https://tijum.com`)

Inspected via `curl.exe -sSI -L` and Chrome `157.0.8103.51` DevTools CDP against `https://tijum.com/`:

| Resource / Check | Live Response (`https://tijum.com`) | Status vs Requirement |
| --- | --- | --- |
| `https://tijum.com/` | HTTP `200 OK` (`text/html`), serves pre-PWA bundle (`app-CLDJCUPW.js`, `app-BcjbHoB-.css`), `<meta name="theme-color" content="#FFF4EE">` | **Fail — No `<link rel="manifest">` in HTML** (`manifestHref: null`) |
| `https://tijum.com/manifest.webmanifest` | **HTTP `404 Not Found`** | **Fail — Manifest missing on server** |
| `https://tijum.com/sw.js` | **HTTP `404 Not Found`** | **Fail — Service Worker missing on server** |
| `https://tijum.com/pwa/icon-192x192.png` | **HTTP `404 Not Found`** | **Fail — 192×192 PNG missing on server** |
| `https://tijum.com/pwa/icon-512x512.png` | **HTTP `404 Not Found`** | **Fail — 512×512 PNG missing on server** |
| `https://tijum.com/pwa/icon-maskable-512x512.png` | **HTTP `404 Not Found`** | **Fail — Maskable icon missing on server** |
| `https://tijum.com/apple-touch-icon.png` | HTTP `200 OK` (`image/png`) | Pass |
| `https://tijum.com/site.webmanifest` | HTTP `200 OK`, `Content-Type: application/octet-stream`, stale JSON (`theme_color: #5C2D54`, missing `id`, missing `192x192`, combined `purpose: "any maskable"`) | **Fail — Old stale manifest & wrong MIME type** |
| Chrome `Page.getInstallabilityErrors()` (`https://tijum.com/`) | `[{"errorId": "no-manifest", "errorArguments": []}]` (`swRegistrations: []`) | **Fail until deployment** |

**Server Note:** When deploying the updated codebase to `https://tijum.com`, verify your web server serves `.webmanifest` as `application/manifest+json` (already configured in [public/.htaccess](file:///d:/Herd/tijum/public/.htaccess) for Apache/LiteSpeed; if Nginx terminates requests in front, ensure `application/manifest+json webmanifest;` is included in Nginx MIME configuration).

---

## 3. Authoritative Manifest & Icon Validation (Local Codebase)

Inspected [public/manifest.webmanifest](file:///d:/Herd/tijum/public/manifest.webmanifest), [public/site.webmanifest](file:///d:/Herd/tijum/public/site.webmanifest), and [resources/views/app.blade.php](file:///d:/Herd/tijum/resources/views/app.blade.php):

- **Single Authoritative HTML Reference:** `app.blade.php` links exclusively `<link rel="manifest" href="/manifest.webmanifest">`; `public/site.webmanifest` matches identically for legacy requests with no conflicting properties.
- **Required Manifest Members Verified:**
  - `id`: `"/"`
  - `name`: `"TIJUM"`
  - `short_name`: `"TIJUM"`
  - `description`: `"Discover, book and manage your stays with TIJUM."`
  - `start_url`: `"/"`
  - `scope`: `"/"`
  - `display`: `"standalone"`
  - `theme_color`: `"#442F41"`
  - `background_color`: `"#FFF4EE"`
  - `prefer_related_applications`: `false`
- **Icons Verified (Dimensions & Purpose Separated):**
  - `/pwa/icon-192x192.png`: `192x192`, `image/png`, `purpose: "any"`
  - `/pwa/icon-512x512.png`: `512x512`, `image/png`, `purpose: "any"`
  - `/pwa/icon-maskable-512x512.png`: `512x512`, `image/png`, `purpose: "maskable"`
  - `/apple-touch-icon.png`: `180x180`, `image/png`, `purpose: "any"`

---

## 4. Chrome Desktop Installability Diagnostics & Code Audit

### 4.1 Real Fix Made in `resources/js/lib/pwa.ts`

During verification in desktop Chrome `157.0.8103.51`, reviewing [resources/js/lib/pwa.ts](file:///d:/Herd/tijum/resources/js/lib/pwa.ts) revealed a Service Worker registration timing race:

- `initPwaClient()` previously registered `/sw.js` only inside `window.addEventListener('load', ...)`. Because `resources/js/app.tsx` runs inside a deferred ES module (`<script type="module">`), if `document.readyState === 'complete'` by the time `initPwaClient()` ran, the `load` handler never fired and `/sw.js` would not register.
- **Fix Applied:** Added `registerWorker()` to run immediately when `document.readyState === 'complete'`, or attach `{ once: true }` to `window` `load` otherwise, then verified TypeScript (`npm run types:check`) and rebuilt production assets (`npm run build`).

### 4.2 `beforeinstallprompt` & `preventDefault()` Review

Reviewed [resources/js/lib/pwa.ts](file:///d:/Herd/tijum/resources/js/lib/pwa.ts) and [PWAInstallPrompt.tsx](file:///d:/Herd/tijum/resources/js/components/pwa/PWAInstallPrompt.tsx):

- `window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstallPrompt = event; notifyListeners(); })` preserves the deferred prompt for TIJUM's custom install prompt and `PWAInstallButton` without breaking Chrome's desktop installability eligibility (`Page.getInstallabilityErrors()` returned `[]`).
- `appinstalled` listener clears `deferredInstallPrompt` and hides custom install prompts once installed.
- `PWAInstallPrompt` and `PWAInstallButton` both hide automatically when `isStandalone` is `true` and suppress install UI during checkout/payment routes (`isSensitiveTransactionRoute`).

### 4.3 Headed Chrome `157.0.8103.51` Results (Fresh Non-Incognito Profile, Local Production Build)

| Check | Result on `http://localhost:8098/` |
| --- | --- |
| `Page.getAppManifest` URL | `http://localhost:8098/manifest.webmanifest` |
| `Page.getAppManifest` Errors | `[]` |
| `Page.getInstallabilityErrors()` (`/`) | `[]` (no eligibility errors) |
| `Page.getInstallabilityErrors()` (`/search`) | `[]` (no eligibility errors) |
| Service Worker Controller | `http://localhost:8098/sw.js` |
| Service Worker Registrations | `[{"scope": "http://localhost:8098/", "active": "activated"}]` |
| `beforeinstallprompt` Event | Fired (`platforms: ["web"]`, `defaultPrevented: true`) |
| Standalone State | `false` (uninstalled profile) |
| TIJUM Custom Install UI Rendered | `"Install"` button detected in DOM |

---

## 5. Remaining Actions & Verification Items

1. **Deploy Updated Code & Assets to `https://tijum.com`:**
   - Push the latest local commits (including the security hardening fixes and `resources/js/lib/pwa.ts` SW registration timing fix + rebuilt `public/build/`) to GitHub and deploy onto the live server hosting `https://tijum.com` (`php artisan migrate --force`, ensure `public/manifest.webmanifest`, `public/sw.js`, `public/pwa/*`, and `public/build/*` are present and served).
2. **Confirm Native Desktop Address-Bar Install Icon Visually on Desktop Chrome:**
   - Because Chrome's outer OS window toolbar/Omnibox cannot be screen-captured from this non-interactive background session (`CopyFromScreen` threw `The handle is invalid`), open `https://tijum.com` (once deployed) in a normal desktop Chrome window with a clean profile where TIJUM is not already installed and confirm the native Omnibox Install icon on the right side of the address bar, the `"Install TIJUM..."` menu item in Chrome's `⋮` menu, and standalone window launch behavior across `/` -> `/search` -> `/dashboard`.
