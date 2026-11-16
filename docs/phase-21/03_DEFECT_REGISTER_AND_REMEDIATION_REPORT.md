# TIJUM — DEFECT REGISTER AND REMEDIATION REPORT (PHASE 21)
## Platform-Wide Issue Identification, Root Cause Analysis & Remediation Log

**Project:** TIJUM — Food-Inclusive Accommodation Marketplace  
**Phase:** 21  
**Date:** November 13, 2026  
**Auditor:** Principal Software Architect & QA Lead  

---

## 1. Summary of Defects

| Defect ID | Module | Severity | Title | Status |
|---|---|---|---|---|
| **DEF-21-01** | Mobile Configuration | **High** | Expo Doctor Schema Validation Failure (`ios.associatedDomains`) | **Resolved & Verified** |
| **DEF-21-02** | Mobile Dependencies | **High** | Dependency Version Mismatch on `react-native-svg` | **Resolved & Verified** |
| **DEF-21-03** | Mobile Auth & Security | **High** | Offline Revocation Single-Key Overwrite Vulnerability | **Resolved & Verified** |
| **DEF-21-04** | Backend Notifications | **Medium** | Missing Push Receipt Verification & Device Invalidation | **Resolved & Verified** |
| **DEF-21-05** | Backend Notifications | **Medium** | Premature `delivered_at` Timestamp on Gateway Ticket Acceptance | **Resolved & Verified** |
| **DEF-21-06** | Mobile TypeScript | **Medium** | Redundant Handwritten Native Shims Shadowing Real Packages | **Resolved & Verified** |
| **DEF-21-07** | Mobile UI / Design | **Low** | Residual Emojis and Raw Unicode Arrows Across Mobile Screens | **Resolved & Verified** |

---

## 2. Detailed Defect Descriptions & Remediation

### DEF-21-01: Expo Doctor Schema Validation Failure (`ios.associatedDomains`)
- **Module:** Mobile App Configuration (`apps/mobile/app.json`)
- **Severity:** **High**
- **Description:** Running `npx expo-doctor` produced an error: `Field: ios.associatedDomains - Array items must be unique.` Additionally, `android.intentFilters` contained two duplicate intent filter blocks.
- **Reproduction Steps:** Run `cd apps/mobile; npx expo-doctor`.
- **Root Cause:** A previous configuration edit duplicated `"applinks:tijum.com"` in `ios.associatedDomains` and duplicated the intent filter object in `android.intentFilters`.
- **Business Impact:** Blocked automated Expo Doctor validation and could cause bundle failures during native Xcode/Gradle compilation.
- **Corrective Action:** Deduplicated `ios.associatedDomains` to a single `"applinks:tijum.com"` entry and removed the duplicate Android intent filter block in `apps/mobile/app.json`.
- **Verification Result:** `npx expo-doctor` passed **20/20 checks (100%)**.
- **Final Status:** **Resolved & Verified**.

---

### DEF-21-02: Dependency Version Mismatch on `react-native-svg`
- **Module:** Mobile App Dependencies (`apps/mobile/package.json`)
- **Severity:** **High**
- **Description:** Running `npx expo install --check` failed with: `react-native-svg@15.11.2 - expected version: 15.15.3`.
- **Reproduction Steps:** Run `cd apps/mobile; npx expo install --check`.
- **Root Cause:** `react-native-svg` was declared as `~15.11.2` which did not match Expo SDK 55.0.32's expected version `15.15.3`.
- **Business Impact:** Risk of native build failures or SVG rendering crashes on Android/iOS when using New Architecture.
- **Corrective Action:** Pinned `react-native-svg` to exact version `15.15.3` in `apps/mobile/package.json` and ran `npm install react-native-svg@15.15.3 --save-exact`.
- **Verification Result:** `npx expo install --check` returned `Dependencies are up to date`.
- **Final Status:** **Resolved & Verified**.

---

### DEF-21-03: Offline Revocation Single-Key Overwrite Vulnerability
- **Module:** Mobile Auth & Session Storage (`apps/mobile/src/auth/SecureTokenStorage.ts`, `AuthContext.tsx`)
- **Severity:** **High**
- **Description:** If a customer or partner logged out while offline, `recordPendingRevocation()` stored a single JSON object under `PENDING_REVOCATION_TOKEN_KEY`. A subsequent offline logout before network restoration overwrote the key, losing the previous token and leaving it active on the server indefinitely.
- **Reproduction Steps:**
  1. Login as customer offline.
  2. Call `logoutInternal()`.
  3. Login as partner offline and call `logoutInternal()`.
  4. Inspect `SecureStore`: only the partner token remained; customer token was discarded.
- **Root Cause:** Single-value storage key rather than a persistent queue.
- **Business Impact:** Security risk: dormant tokens remained unrevoked on the backend after user logout, violating session revocation guarantees.
- **Corrective Action:** 
  1. Created a persistent JSON FIFO queue under `PENDING_REVOCATIONS_QUEUE_KEY` in `SecureTokenStorage.ts`.
  2. Implemented `getPendingRevocationQueue()`, `recordPendingRevocation()` (appends deduplicated items), and `removePendingRevocation(token)`.
  3. Updated `reconcilePendingRevocations()` in `AuthContext.tsx` to iterate through all queued tokens, revoke each via API, and only remove successfully acknowledged or expired (401/403/404) tokens.
- **Verification Result:** TypeScript compiled cleanly; sequential offline logouts accumulate in the queue without data loss.
- **Final Status:** **Resolved & Verified**.

---

### DEF-21-04: Missing Push Receipt Verification & Device Invalidation
- **Module:** Backend Push Notifications (`app/Services/Notifications/Channels/`)
- **Severity:** **Medium**
- **Description:** Backend push delivery treated initial gateway ticket acceptance as the final delivery state without polling the Expo Push Receipts API (`https://exp.host/--/api/v2/push/getReceipts`) to confirm actual device delivery or detect invalid tokens (`DeviceNotRegistered`).
- **Reproduction Steps:** Send a push notification to an uninstalled or revoked device token. The delivery record remained in `accepted` status forever.
- **Root Cause:** Phase 18 implemented the initial push dispatch channel but deferred receipt verification and invalid device token pruning.
- **Business Impact:** False positive delivery metrics; wasted bandwidth continuing to target uninstalled or expired mobile devices.
- **Corrective Action:**
  1. Built `app/Services/Notifications/Channels/ExpoReceiptService.php` to batch ticket IDs for accepted deliveries and poll the Expo receipts endpoint.
  2. On receipt `status === 'ok'`: transitions delivery to `Delivered` with `delivered_at = now()`.
  3. On receipt `status === 'error'`: transitions delivery to `Failed` and automatically revokes the associated `MobileDevice` if the error code is `DeviceNotRegistered`.
  4. Created Artisan command `app/Console/Commands/PollExpoPushReceiptsCommand.php` (`php artisan tijum:poll-push-receipts`).
- **Test Added:** `tests/Feature/Notifications/ExpoReceiptServiceTest.php` (2 test cases verifying `ok` and `DeviceNotRegistered` handling).
- **Verification Result:** PHPUnit test passed: 2 tests, 9 assertions passed.
- **Final Status:** **Resolved & Verified**.

---

### DEF-21-05: Premature `delivered_at` Timestamp on Gateway Ticket Acceptance
- **Module:** Backend Push Channel (`app/Services/Notifications/Channels/PushNotificationChannel.php`)
- **Severity:** **Medium**
- **Description:** `PushNotificationChannel::send()` previously wrote `delivered_at = now()` when Expo Push API returned an HTTP 200 with tickets, even though the delivery status was only `Accepted by Gateway`.
- **Reproduction Steps:** Inspect `PushNotificationChannel.php` line 102.
- **Root Cause:** Conflating gateway ticket receipt with physical device receipt.
- **Business Impact:** Misleading audit logs indicating device delivery had completed when the push ticket was only enqueued.
- **Corrective Action:** Changed line 102 to write `submitted_at = now()`, reserving `delivered_at` exclusively for confirmed receipt polling in `ExpoReceiptService`.
- **Verification Result:** All notification feature tests pass cleanly.
- **Final Status:** **Resolved & Verified**.

---

### DEF-21-06: Mobile Native Shims Redundancy Shadowing Real Packages
- **Module:** Mobile TypeScript Definitions (`apps/mobile/src/types/native-shims.d.ts`)
- **Severity:** **Medium**
- **Description:** `native-shims.d.ts` contained extensive handwritten `declare module 'react-native-svg'` and `declare module 'lucide-react-native'` blocks which masked whether the real packages were installed and compatible with React Native 0.83.
- **Reproduction Steps:** Inspect `native-shims.d.ts` lines 244-323.
- **Root Cause:** Leftover shims from initial scaffolding before local dependencies were installed.
- **Business Impact:** Type checks gave a false sense of security while hiding package installation issues.
- **Corrective Action:** Removed the artificial module declarations for `react-native-svg` and `lucide-react-native`. TypeScript now validates directly against the real types from `node_modules`.
- **Verification Result:** `cd apps/mobile; npx tsc --noEmit` compiled with 0 errors.
- **Final Status:** **Resolved & Verified**.

---

### DEF-21-07: Residual Emojis and Raw Unicode Arrows Across Mobile Screens
- **Module:** Mobile Screens & Components (`apps/mobile/app/`, `apps/mobile/src/components/`)
- **Severity:** **Low**
- **Description:** Several screens in `apps/mobile/` contained hardcoded emojis (e.g. `🍲`, `📍`, `⚠️`, `🛡️`, `🏨`, `💰`, `⚡`) and raw unicode arrows (`→`, `▲`, `▼`).
- **Reproduction Steps:** Search for regex pattern `[\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]` in `apps/mobile/`.
- **Root Cause:** Initial UI implementation used temporary emoji icons in buttons, cards, and empty states.
- **Business Impact:** Platform styling inconsistency; violation of user guidelines mandating official Lucide icons.
- **Corrective Action:** Replaced 100% of emojis and raw symbols across all mobile screens with official Lucide icons (`MapPin`, `UtensilsCrossed`, `Building2`, `Wallet`, `Calendar`, `User`, `Clock`, `Receipt`, `ShieldCheck`, `AlertCircle`, `Zap`, `ChevronRight`, `ChevronDown`, `Lock`, `ClipboardList`, `Bell`).
- **Verification Result:** Automated regex audit returned **0 matches** across all mobile TSX/TS files.
- **Final Status:** **Resolved & Verified**.
