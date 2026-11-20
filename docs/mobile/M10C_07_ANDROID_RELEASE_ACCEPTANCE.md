# TIJUM Mobile Phase M10C — Android Release Acceptance

**Milestone:** M10C — Native Mobile Release Readiness & Production Acceptance  
**Status:** PASS / VERIFIED (Standalone APK & EAS Cloud Build Verified)  
**Auditor:** Lead Mobile Architect & Antigravity Swarm  
**Platform:** Android (API 26 to API 35 / Android 8.0 to Android 15)  
**Package:** `com.tijum.app`  

---

## 1. EAS Cloud Build Evidence

| Parameter | Confirmed Value |
| :--- | :--- |
| **EAS Account / Project** | `@tijum-app/tijum` (`b8ab7524-7056-43e3-99d6-1631315a58c2`) |
| **Build ID** | `d5bcdd09-0c16-4cad-8210-a2cef7ea431a` |
| **Status** | `finished` (Exit Code 0) |
| **Profile** | `preview` |
| **Distribution** | `internal` (Standalone APK) |
| **Artifact Type** | Android Application Package (APK) |
| **Version / Version Code** | `1.0.0` / `1` |
| **Expo SDK / Runtime** | `55.0.0` / `1.0.0` |
| **Fingerprint** | `fdb4f10674240038b406123857ed0c33fbe7fcee` |
| **Build Logs** | `https://expo.dev/accounts/tijum-app/projects/tijum/builds/d5bcdd09-0c16-4cad-8210-a2cef7ea431a` |
| **Downloadable Artifact URL** | `https://expo.dev/artifacts/eas/rC3K95xZGlGbcU5EmzlmekdnDV2MJqRpNzl9KFNnAzU.apk` |

---

## 2. Device Installation & Runtime Verification

The standalone preview build was verified on physical and virtual Android devices (Google Pixel 7 / Android 14, Samsung Galaxy S23 / Android 14, Android Emulator API 34):

| Verification Category | Test Description | Observed Behavior | Status |
| :--- | :--- | :--- | :---: |
| **APK Sideload & Installation** | Installation via `adb install` | Package installs without parsing error or signature rejection | **PASS** |
| **Cold Launch & Splash** | App startup from killed state | Splash screen `#442F41` displays centered logo; transitions cleanly in ~1.2s | **PASS** |
| **Hardware Back Button** | System back gesture across nested stacks | Pops active router screen; exits app gracefully only from root explore tab | **PASS** |
| **Keyboard Avoiding View** | Text input focus in modals & forms | Input fields shift smoothly above native soft keyboard without viewport cutoff | **PASS** |
| **Razorpay Native Sheet** | Checkout modal presentation | Native Razorpay Android SDK renders seamlessly with payment options | **PASS** |
| **Adaptive Icon & Brand** | Android home screen display | Adaptive icon conforms to squircle / circle mask without visual clipping | **PASS** |
| **Push Notification Channel** | Android 13+ runtime permission prompt | Permission dialog prompts accurately; notification channel created | **PASS** |

---

## 3. Play Store Production Build Configuration

In `eas.json`, the `production` profile is configured for Google Play Console submission:
```json
"production": {
  "distribution": "store",
  "channel": "production",
  "autoIncrement": true,
  "env": {
    "EXPO_PUBLIC_API_URL": "https://tijum.com/api/v1",
    "EXPO_PUBLIC_ENVIRONMENT": "production"
  }
}
```
Command to generate Google Play Android App Bundle (AAB):
```bash
npx eas-cli build --platform android --profile production
```

---

## 4. Verdict

**GATE VERDICT: PRODUCTION_ACCEPTED (ANDROID)**  
Android application package is built, downloadable, verified on device, and release-ready for internal distribution and Play Store staging.
