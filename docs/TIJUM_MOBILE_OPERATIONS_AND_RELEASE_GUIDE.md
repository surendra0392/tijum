# TIJUM Mobile Operations & Release Guide

**Scope:** Android (Google Play) & iOS (Apple App Store) Deployment  
**Build System:** EAS (Expo Application Services)  
**App ID:** `com.tijum.app`  

---

## 1. Prerequisites & Environment Setup

### 1.1 Developer Tooling
Ensure the following tools are installed in your build environment:
- Node.js `20.x` or `22.x` (LTS)
- npm `10.x+`
- Expo CLI (`npx expo`)
- EAS CLI (`npm install -g eas-cli`)

### 1.2 Environment Variables
The mobile application relies on public and private environment configuration during the build phase:

| Variable | Description | Example |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the versioned TIJUM REST API | `https://api.tijum.com/api/v1` |
| `EXPO_PUBLIC_RAZORPAY_KEY_ID` | Public Razorpay key ID for in-app checkout | `rzp_live_xxxxxxxxxxxx` |
| `EXPO_PUBLIC_APP_SCHEME` | Custom deep-link URI scheme | `tijum` |

---

## 2. EAS Build Profiles (`eas.json`)

`eas.json` defines three build profiles:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://10.0.2.2:8000/api/v1"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging.tijum.com/api/v1"
      }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.tijum.com/api/v1"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./keys/google-play-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "appstore@tijum.com",
        "ascAppId": "6440000000",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

---

## 3. Building for Android

### 3.1 Generate Android App Bundle (.aab) for Google Play
Run EAS build from `apps/mobile/`:
```powershell
cd apps/mobile
eas build --platform android --profile production
```

### 3.2 Google Play Store Submission
1. **Google Play Console:** Create app with package name `com.tijum.app`.
2. **Category:** Travel & Local / Accommodation.
3. **App Content & Declarations:**
   - Target Audience: 18+
   - Permissions: Internet, Notifications (`POST_NOTIFICATIONS` for Android 13+).
   - Financial Features: Online payment gateway (Razorpay) for accommodation bookings.
4. **Automated Submission:**
   ```powershell
   eas submit --platform android --profile production
   ```

---

## 4. Building for iOS

### 4.1 Generate iOS Binary (.ipa) for App Store / TestFlight
```powershell
cd apps/mobile
eas build --platform ios --profile production
```

### 4.2 Apple App Store Submission
1. **App Store Connect:** Create new app record for `com.tijum.app` under your Apple Developer Account.
2. **Capabilities Required:**
   - Push Notifications (APNs)
   - Associated Domains (`applinks:tijum.com`)
3. **App Review Information:**
   - Provide test customer credentials (`demo.customer@tijum.com` / `DemoCustomer123!`)
   - Provide test partner credentials (`demo.host@tijum.com` / `DemoHost123!`)
   - Highlight that accommodation bookings include dynamic food provisions as declared per property.
4. **Automated Submission:**
   ```powershell
   eas submit --platform ios --profile production
   ```

---

## 5. Push Notifications Configuration

1. **Apple Developer Portal:** Generate an **Apple Push Notifications key (.p8)** and upload to EAS credentials.
2. **Firebase Cloud Messaging:** Create a Firebase project for `com.tijum.app` and upload `google-services.json` (Android) and `GoogleService-Info.plist` (iOS).
3. **Backend Service:** Ensure `TIJUM_EXPO_PUSH_URL=https://exp.host/--/api/v2/push/send` is configured in production `.env`.
