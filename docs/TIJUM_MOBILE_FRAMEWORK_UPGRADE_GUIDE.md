# TIJUM Mobile Framework Upgrade & New Architecture Guide

**Phase:** Phase 20A — Mobile Stabilization, Framework Upgrade, Security Hardening & Production Readiness  
**Target Application:** TIJUM Cross-Platform Mobile Application (`apps/mobile/`)  
**Target Platforms:** iOS 15.1+ and Android 7.0+ (API Level 24+)  
**Framework Milestone:** Expo SDK 55 (`55.0.32`) / React Native `0.83.10` / React `19.2.0`  
**Architecture:** React Native New Architecture (`newArchEnabled: true`, TurboModules + Fabric)

---

## 1. Executive Summary & Version Selection Strategy

As part of Phase 20A, TIJUM upgraded its cross-platform mobile application from the initial Phase 20 baseline to the stable, production-verified **Expo SDK 55** ecosystem.

### Why Expo SDK 55 (and not SDK 56+)?
A critical architectural constraint for TIJUM is maintaining support for **iOS 15.1+**. Starting with Expo SDK 56, Expo and React Native raised the minimum iOS deployment target to **iOS 16.4+**, which drops support for older iPhones (including iPhone 6s, iPhone 7, and original iPhone SE) widely used across Indian regional student and working-professional demographics. 

Expo SDK 55 (`55.0.32`) represents the optimal balance:
1. **iOS 15.1+ compatibility**: Fully preserves the minimum OS constraint.
2. **React 19 & React Native 0.83**: Delivers concurrent rendering, latest microtask scheduling, and zero hydration mismatch on mobile.
3. **TurboModule & Fabric New Architecture**: Full native support for the New Architecture (`newArchEnabled: true`).
4. **Active Maintenance & Security Patches**: Comprehensive vulnerability hardening across upstream native dependencies.

---

## 2. Dependency Alignment Matrix

The following dependency versions have been locked and verified in `apps/mobile/package.json`:

| Package | Phase 20 Baseline | Phase 20A Production Milestone | Architectural Role |
|---|---|---|---|
| `expo` | `^52.0.0` | `~55.0.32` | Core managed runtime & native module ecosystem |
| `react-native` | `0.76.7` | `0.83.10` | Cross-platform native runtime with New Architecture enabled |
| `react` | `18.3.1` | `19.2.0` | Declarative UI layer matching web frontend React 19 baseline |
| `expo-router` | `~4.0.0` | `~55.0.18` | File-based typed native routing & navigation stack |
| `react-native-razorpay` | `^2.3.0` | `^3.0.0` | Native payment checkout TurboModule |
| `expo-secure-store` | `~14.0.0` | `~55.0.18` | Hardware-backed secure keychain storage |
| `expo-notifications` | `~0.29.0` | `~55.0.27` | Push notification service & system tray handler |
| `react-native-safe-area-context`| `^5.0.0` | `^5.2.0` | Inset & notch management supporting Fabric |
| `react-native-screens` | `^4.4.0` | `^4.8.0` | Native view controllers supporting Fabric |
| `typescript` | `^5.3.3` | `^5.7.2` | Static type analysis matching web codebase |

---

## 3. React Native New Architecture Migration

In `apps/mobile/app.json`, the New Architecture flag is explicitly enabled:

```json
{
  "expo": {
    "name": "TIJUM",
    "slug": "tijum",
    "version": "1.0.0",
    "newArchEnabled": true,
    "ios": {
      "deploymentTarget": "15.1"
    },
    "android": {
      "minSdkVersion": 24,
      "compileSdkVersion": 35,
      "targetSdkVersion": 35
    }
  }
}
```

### 3.1 TurboModule Compatibility: `react-native-razorpay@3.0.0`
Prior versions of `react-native-razorpay` relied on the legacy Bridge architecture. In Phase 20A:
- Upgraded to `react-native-razorpay@3.0.0`, which supplies native Codegen specifications (`RNRazorpayCheckoutSpec` on iOS and `com.razorpay.rn` on Android).
- Codegen automatically synthesizes typed C++ JSI bindings, eliminating bridge JSON serialization overhead.
- Wrapped in `RazorpayPaymentService` with defensive availability checks (`isAvailable()`), ensuring safe fallback if the native module is not linked in development or simulator environments.

### 3.2 Fabric Renderer Support
- `react-native-screens` (`v4.8.0`) and `react-native-safe-area-context` (`v5.2.0`) provide native Fabric component descriptors.
- Eliminates layout jumps during view transitions and modal sheets.
- Native navigation transitions run synchronously on the UI thread without crossing the JavaScript thread.

---

## 4. Developer Setup & Cache Clearing Workflow

When pulling framework updates, developers should follow this deterministic build process:

```bash
# 1. Navigate to mobile workspace
cd apps/mobile

# 2. Clean install dependencies
npm install

# 3. Clear Metro bundler cache
npx expo start -c

# 4. Generate clean native prebuilds (if using bare workflow / native run)
npx expo prebuild --clean

# 5. Run on iOS Simulator (requires macOS + Xcode 16+)
npx expo run:ios

# 6. Run on Android Emulator (requires Android SDK 35+)
npx expo run:android
```

---

## 5. Deprecations & Breaking Changes Handled

1. **`newArchEnabled` default flip:** Fabric is now primary. Custom native components must implement `RCTComponentViewProtocol` (iOS) or `ViewManager` with Fabric descriptors (Android).
2. **React 19 JSX Transform:** React Native 0.83 uses the automatic JSX runtime (`react/jsx-runtime`). Explicit `import React from 'react'` is no longer required for pure JSX files.
3. **Expo Notifications Handler:** `Notifications.setNotificationHandler` now requires explicit async resolution returning `{ shouldShowAlert, shouldPlaySound, shouldSetBadge }`.
4. **Strict SecureStore string serialization:** Non-string payloads must be serialized via `JSON.stringify` before passing to `SecureStore.setItemAsync`.
