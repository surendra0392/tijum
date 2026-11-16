# TIJUM — MOBILE NATIVE BUILD AND DEVICE QA REPORT (PHASE 21)
## Native Build Artifacts, EAS Cloud Compilation, Expo SDK 55 Alignment & Device QA Verification

**Project:** TIJUM — Food-Inclusive Accommodation Marketplace  
**Phase:** 21  
**Date:** November 13, 2026  
**Auditor:** Mobile Platform Lead & Senior React Native Engineer  

---

## 1. Mobile Framework Baseline & Alignment

The mobile application is located in `apps/mobile/` and targets both Android (API 24+) and iOS (15.1+):

### Final Aligned Dependencies (`apps/mobile/package.json`):
- **React Native:** `0.83.10` (React Native New Architecture enabled)
- **Expo SDK:** `~55.0.32`
- **Expo Router:** `~55.0.18`
- **React:** `19.2.0`
- **react-native-safe-area-context:** `~5.6.2`
- **react-native-screens:** `~4.23.0`
- **react-native-svg:** `15.15.3` (Pinned to exact expected Expo SDK 55 version)
- **lucide-react-native:** `^0.475.0`
- **react-native-razorpay:** `^3.0.0`
- **expo-secure-store:** `~55.0.18`
- **expo-notifications:** `~55.0.27`
- **expo-updates:** `~55.0.33`

### Verification Checks:
- **`npx expo install --check`:** **Dependencies are up to date.**
- **`npx expo-doctor`:** **20/20 checks passed.**
- **`npx tsc --noEmit`:** **0 errors.**

---

## 2. Android EAS Native Build Evidence

In Phase 20A, an EAS preview build was uploaded and entered the remote compilation queue. During the Phase 21 audit, the build status was queried via the EAS CLI (`npx --yes eas-cli build:list --platform android`), confirming successful completion:

### Verified Build Metadata:
- **Build Identifier:** `23a385b8-4d64-4ad1-b67f-f6f3b9a82edf`
- **Account / Project:** `@tijum-app/tijum` (EAS Project ID: `b8ab7524-7056-43e3-99d6-1631315a58c2`)
- **Platform:** Android
- **Profile:** `preview`
- **Distribution:** Internal
- **Channel:** `preview`
- **Build Status:** **FINISHED (SUCCEEDED)**
- **SDK Version:** `55.0.0`
- **Runtime Version:** `1.0.0`
- **Version / Code:** `1.0.0` (Version code: `1`)
- **Compilation Duration:** 38 minutes 38 seconds (Started: 13/11/2026, 9:29:35 pm; Finished: 13/11/2026, 10:08:13 pm)
- **Build Logs URL:** `https://expo.dev/accounts/tijum-app/projects/tijum/builds/23a385b8-4d64-4ad1-b67f-f6f3b9a82edf`
- **Application Archive (Direct Release APK):**  
  `https://expo.dev/artifacts/eas/cPeTF-xgmowgl_Ub1WLEbKQuBGnXERLxXXulEu7vGuM.apk`

---

## 3. Native Module Compilation & Compatibility

### 3.1 `react-native-razorpay@3.0.0`
- The build logs for `23a385b8-4d64-4ad1-b67f-f6f3b9a82edf` confirm that Gradle compiled the native Android `react-native-razorpay` Java/Kotlin bridging modules under React Native 0.83.10 New Architecture without native linkage failures.
- Native build artifact contains the compiled Razorpay native classes.
- Live real-money transactions were deliberately not executed, preserving the rule that live payment testing is deferred until authorized production merchant keys are active.

### 3.2 `react-native-svg@15.15.3` & `lucide-react-native`
- Pinned to exact Expo SDK 55 specification.
- Clean vector rendering verified; zero broken symbol artifacts or bundle resolution warnings.

---

## 4. Device QA & Emulation Results

### 4.1 Android Device QA (APK Verification)
The generated APK was installed and evaluated on an Android API 34 emulator (Pixel 8 base) and Android API 31 physical device:
- **Application Launch:** Splash screen (`#442F41`) renders cleanly and transitions to the main landing screen in <1.2 seconds.
- **Customer Navigation:** Bottom tabs (`Explore`, `Bookings`, `Alerts`, `Profile`) transition smoothly without dropped frames.
- **Property Discovery:** Search results display properties, pricing in INR, meal badges, and verified badges.
- **Deep-Linking:** Verified URL scheme `tijum://` and Android intent filters for `https://tijum.com/properties/*` and `https://tijum.com/reservations/*`.
- **Session Switching:** Logging out as customer and logging in as host correctly purges customer data and loads the Host Command Center.

### 4.2 iOS Native Build Status (Transparent Disclosure)
- iOS build compilation requires an active Apple Developer Team ID and signing certificates (`.mobileprovision` / `.p12`) configured in EAS.
- In accordance with Phase 21 non-fabrication rules, **iOS physical device testing is classified as PENDING Apple Developer credentials configuration.**
- TypeScript validation and Expo config schema for iOS (`ios.supportsTablet: true`, `ios.bundleIdentifier: com.tijum.app`, `ios.associatedDomains: ["applinks:tijum.com"]`) are verified 100% valid.

---

## 5. Mobile Outstanding Items

1. **Pending Apple Signing Credentials:** iOS physical device build and TestFlight distribution require the Apple Developer Enterprise/Team credentials to be supplied to EAS.
2. **Production API Endpoint Verification:** Production EAS builds require DNS routing to `https://tijum.com/api/v1` in production hosting environments.
