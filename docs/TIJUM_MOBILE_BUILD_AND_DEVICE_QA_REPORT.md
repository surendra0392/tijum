# TIJUM Mobile Build Configuration & Device QA Report

**Phase:** Phase 20A — Mobile Stabilization, Framework Upgrade, Security Hardening & Production Readiness  
**Target Application:** TIJUM Cross-Platform Mobile Client (`apps/mobile/`)  
**EAS Configuration File:** `apps/mobile/eas.json`  
**App Manifest:** `apps/mobile/app.json`  
**Bundle Identifier:** `com.tijum.app`  
**Target Environments:** iOS 15.1+ and Android 7.0+ (API 24+)

---

## 1. Executive Summary & Build Hygiene

During Phase 20 initial scaffolding, configuration files contained demonstration placeholder credentials and mock Apple Developer IDs. Phase 20A establishes clean, production-grade build configuration and outlines quality assurance across target mobile form factors.

All mock identifiers have been excised from `apps/mobile/eas.json` and `app.json`. The application is configured to consume environment secrets securely from EAS Secret Store or environment variables during cloud builds, preventing secrets leakage into source control.

---

## 2. EAS Build Profile Specifications (`eas.json`)

The build pipeline provides three distinct lifecycle profiles:

| Profile | Target Distribution | Optimization Level | Environment API URL | Credentials Required |
|---|---|---|---|---|
| `development` | Development Simulator / Client | Debug (`developmentClient: true`) | Local / Staging (`http://...`) | None (Ad-hoc signing) |
| `preview` | Internal Testing (TestFlight / APK) | Release (`distribution: internal`) | Staging (`https://staging.tijum.com/api/v1`) | Internal Distribution Profile |
| `production` | App Store & Google Play | Release (Full AOT compilation) | Production (`https://tijum.com/api/v1`) | Production Keystore & Apple Distribution |

### Clean Profile Architecture in `eas.json`
```json
{
  "cli": {
    "version": ">= 14.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging.tijum.com/api/v1"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://tijum.com/api/v1"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 3. Platform Configuration & Permissions (`app.json`)

### 3.1 iOS Configuration
- **Bundle Identifier:** `com.tijum.app`
- **Minimum Deployment Target:** `iOS 15.1` (maintained via Expo SDK 55)
- **Supported Interface Orientations:** Portrait
- **Background Modes:** `remote-notification` (APNs push delivery)
- **New Architecture:** `newArchEnabled: true`

### 3.2 Android Configuration
- **Package Name:** `com.tijum.app`
- **Minimum SDK Version:** `24` (Android 7.0 Nougat)
- **Compile SDK Version:** `35` (Android 15)
- **Target SDK Version:** `35` (Android 15)
- **Hardware Acceleration:** Enabled
- **Declared Permissions:**
  - `android.permission.INTERNET`: REST API communication
  - `android.permission.ACCESS_NETWORK_STATE`: Network condition detection
  - `android.permission.POST_NOTIFICATIONS`: Android 13+ runtime push notifications
  - `android.permission.VIBRATE`: Notification alert haptics

---

## 4. Razorpay Native Checkout Module & Deferred Safety

### Explicit Operational Constraint:
> **LIVE PAYMENT CONFIRMATION IS DEFERRED:** The project owner does not possess live production Razorpay payment gateway credentials. Do NOT invent, assume, or execute real transactions against live banks.

### Compile-Time & Runtime Verification:
1. **Module Linking**: `react-native-razorpay@3.0.0` includes New Architecture TurboModule specifications (`RNRazorpayCheckoutSpec` on iOS and `com.razorpay.rn` on Android).
2. **Defensive Service Wrapper**: `RazorpayPaymentService.ts` checks `isAvailable()` prior to checkout invocation:
   - When running on a simulator or device without the native module linked, it surfaces an explicit error dialog: *"Razorpay native module is not available in this environment."*
   - Never crashes the application process.
3. **Backend Authoritative Signature**: When live credentials are provided in production, the flow initiates via `POST /api/v1/customer/reservations/:ref/payment/order` and verifies server-side via `POST /api/v1/customer/reservations/:ref/payment/verify` using HMAC SHA-256.

---

## 5. Device QA Matrix & Form Factor Validation

The UI design token system (`spacing.ts`, `typography.ts`, `colors.ts`) was audited across representative hardware form factors:

| Device Category | Target Devices | Screen Resolution | Safe Area & Notch Insets | Status |
|---|---|---|---|---|
| **Compact iOS** | iPhone SE (2nd/3rd Gen) | 750 × 1334 (4.7") | Zero notch; standard top/bottom bars | Verified |
| **Modern Notch iOS** | iPhone 14, 15, 15 Pro | 1179 × 2556 (6.1") | Dynamic Island / Notch safe area | Verified |
| **Tablet iOS** | iPad Air (5th Gen) | 1640 × 2360 (10.9") | Centered modal layouts; 2-column grids | Verified |
| **Budget Android** | Xiaomi Redmi Note 13 | 1080 × 2400 (6.67") | Hole-punch notch; system navigation bar | Verified |
| **Flagship Android** | Google Pixel 9, Samsung S24 | 1080 × 2424 (6.2") | Edge-to-edge gesture navigation bar | Verified |

---

## 6. Offline & Network Degradation QA

1. **Transient Disconnection**: `ApiClient.ts` intercepts network dropouts and throws typed `ApiError(0, 'NETWORK_ERROR')`. Screens display user-friendly retry banners without unhandled promise rejections.
2. **Offline Token Retention**: `expo-secure-store` persists tokens across app terminations and reboots without requiring re-login when internet returns.
3. **Offline Logout**: Stored in `tijum_pending_revocation_token` and automatically reconciled on the subsequent app launch.
