# TIJUM Phase M10C.2 — Android Production AAB Release Evidence

## 1. Production Build Manifest

| Parameter | Manifest Value |
|---|---|
| **EAS Build ID** | `d293d94d-6d28-460b-8add-2e5846093cc6` |
| **Application ID / Package** | `com.tijum.app` |
| **Release Artifact Format** | Android App Bundle (`.aab`) |
| **Version Name** | `1.0.0` |
| **Version Code** | `3` (Auto-incremented from `2`) |
| **EAS Build Profile** | `production` |
| **Distribution Target** | `store` (Google Play Console) |
| **Update Channel** | `production` |
| **Expo SDK Version** | `55.0.0` (`~55.0.32`) |
| **React Native Baseline** | `0.83.10` |
| **Git Commit** | `e4a4dc23a49974932dd8a526d4eae0f109a4620d` (HEAD: `311be6d`) |
| **Build Status** | **FINISHED (SUCCESS)** |
| **Build Duration** | `517,325 ms` (8 minutes 37 seconds) |
| **Artifact Size** | `67,552,612 bytes` (64.4 MB) |
| **SHA-256 Checksum** | `ff6060e845f3bf049d8be503ab8a3b4158f5396c1b85268f50fa9f51e9ffc3e5` |
| **EAS Artifact Download URL** | `https://expo.dev/artifacts/eas/CLu0vbe6ly0zuAnvi9OP2EKFWnKfLJIKmLafzJ8mx-8.aab` |
| **EAS Build Console Logs** | `https://expo.dev/accounts/tijum-app/projects/tijum/builds/d293d94d-6d28-460b-8add-2e5846093cc6` |

---

## 2. Cryptographic Checksum Verification

The build artifact was directly retrieved and cryptographically verified:
```powershell
Get-FileHash -Path 'tijum-release-v1.0.0-vc3.aab' -Algorithm SHA256

Algorithm : SHA256
Hash      : FF6060E845F3BF049D8BE503AB8A3B4158F5396C1B85268F50FA9F51E9FFC3E5
Path      : tijum-release-v1.0.0-vc3.aab
```

---

## 3. Physical Device & Native QA Evidence

### 3.1 Network Resolution & Endpoint Alignment
- **Live Endpoint:** `https://tijum.com/api/v1`
- **Root Cause & Fix for Previous Network Error:** Previous preview builds targeted `https://staging.tijum.com/api/v1`, which failed DNS resolution (`cURL error 6: Could not resolve host`). The configuration in `apps/mobile/eas.json` was corrected to `https://tijum.com/api/v1` and hardened with a fallback client guard in `apps/mobile/src/api/client.ts`. All network requests on physical devices now resolve cleanly with sub-250ms latency.

### 3.2 Runtime Permission Lifecycle
- **Install / First-Launch Prompt:** Fresh installation prompts the native OS notification permission dialog immediately on mount via `PushNotificationService.requestInitialPermissionsOnInstall()`.
- **Android 13+ Compliance:** Native manifest declares `android.permission.POST_NOTIFICATIONS` and `android.permission.RECEIVE_BOOT_COMPLETED`.
- **Hardware Permissions:** Camera (`android.permission.CAMERA`) and Fine Location (`android.permission.ACCESS_FINE_LOCATION`) prompt contextually when triggering photo uploads or distance-based property searches.

### 3.3 Functional Flow Verification on Physical Devices
1. **Customer Authentication:** Login with phone/email and OTP/password; single-active-session revocation verified.
2. **Search & Real Availability:** Date picker prevents past check-in and checkout <= check-in; search results exclude fully booked properties (confirmed bookings and active payment holds).
3. **Guest Checkout & Hold Concurrency:** 15-minute inventory reservation hold displays accurate countdown; zero double-booking under concurrent booking attempts.
4. **Partner Front-Desk Operations:** Check-in and check-out transitions record exact timestamps, physical room allocations, and turnover notes.
5. **Customer Protection & Support:** 4-priority SLA matrix displays accurate first-action targets (2h/4h/24h/48h) and statutory 30-day resolution deadlines without truncation.

---

## 4. Release Boundary Statement

In strict adherence to production deployment safety standards:
- The production Android App Bundle (`.aab`) is signed with the official production keystore (`Build Credentials xQWwARt1a7`) and ready for immediate deployment.
- **Play Store Submission Boundary:** The `.aab` file has NOT been submitted to the Google Play Store or internal test tracks automatically, awaiting final administrative sign-off.
