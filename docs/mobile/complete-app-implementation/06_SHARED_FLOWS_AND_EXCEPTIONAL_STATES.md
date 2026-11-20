# TIJUM Mobile — Shared Flows, Authentication & Exceptional States
**Milestone:** Complete Mobile Application UI/UX Transformation & Implementation  
**Document ID:** `docs/mobile/complete-app-implementation/06_SHARED_FLOWS_AND_EXCEPTIONAL_STATES.md`  
**Generated At:** 2026-11-20  
**Target Codebase:** `apps/mobile/app/index.tsx`, `apps/mobile/app/(auth)/*`, `apps/mobile/src/components/ExceptionalState.tsx`

---

## 1. Splash Screen & 3-Step Value Onboarding (`app/index.tsx`)

### 1.1 Brand Architecture & First Launch Experience
The root welcome screen (`app/index.tsx`) implements the visual identity illustrated in `TIJUM Stay, Dine & Belong App Screens.png`:
- **Brand Header:** Deep plum badge with tilted orange roof accent, bold "TIJUM" wordmark, and the authoritative marketplace tagline: *"Stay easy. Eat well. Spend less."*
- **3-Step Carousel:** An interactive swipeable showcase card highlighting the three pillars of the TIJUM value proposition:
  1. **Comfortable Stays:** Verified hostels, homestays, and co-living spaces tailored for students and professionals.
  2. **Delicious Food:** Verified, hygienic meals declared clearly per stay with zero broker fees.
  3. **A Feeling of Home:** Safe, secure, and community-driven living spaces with zero broker fees.
- **Pill Indicators:** Interactive pagination dots with the active indicator styled as an expanded coral pill (`width: 22`, `backgroundColor: Colors.coralPrimary`).

### 1.2 Persona Router
Three distinct action paths are surfaced:
- **Continue as Customer:** Advances to customer explore portal (`/(customer)/explore`).
- **Continue as Accommodation Partner:** Advances to partner sign-in portal (`/(auth)/owner-login`).
- **Browse Stays without Account:** Instant guest access to explore listings without authentication barriers.

---

## 2. Authentication & Identity Lifecycle (`app/(auth)/*`)

### 2.1 Customer Login & Registration
- **Login (`customer-login.tsx`):** Supports dual credential sign-in via either registered email or 10-digit mobile phone number. Includes collapsible *Forgot Password* modal for password recovery instructions.
- **Registration (`customer-register.tsx`):** Captures customer name, email, phone number, password, and mandatory terms and privacy acceptance.

### 2.2 Partner Login & 10-Field Onboarding Wizard
- **Login (`owner-login.tsx`):** Host credential verification with partner password recovery modal.
- **Registration (`owner-register.tsx`):** Captures 10 required and optional onboarding fields:
  - Personal contact: Full Name, Email, Mobile Phone, Password, Password Confirmation.
  - Business identity: Business / Trade Name, Primary Property City, Primary Accommodation Category, Government ID / Business Registration, and Legal Terms Agreement.

### 2.3 Single Active Session Revocation on Role Switch
When a user switches between the Customer and Host portals, the client invokes `logout()` in `AuthContext.tsx`, which purges stored session tokens from SecureStore (`tijum_active_session_token`) and alerts the backend to revoke active device session records. This guarantees that customer and partner privileges never leak across roles.

---

## 3. Push Notification Permission Architecture (`PushNotificationService.ts`)

TIJUM enforces a multi-tier notification permission strategy:
1. **First-Launch Installation Request:** `PushNotificationService.requestInitialPermissionsOnInstall()` is mounted in `app/_layout.tsx` to declare system notification channels on Android and request initial OS permissions.
2. **Contextual Settings Toggle:** In `app/(customer)/notifications/index.tsx`, toggling the Mobile Push switch triggers `requestPushPermissionsContextually('settings_toggle', 'customer', true)`. If permissions are granted, the Expo push token is registered with the backend; if denied, a friendly guidance dialog informs the user how to enable notifications in device settings.
3. **Channel Availability Reflection:** The UI dynamically reflects real backend operational availability for each notification channel (In-App: Active, Email: Active, Push: Active, SMS: Inactive, WhatsApp: Inactive).

---

## 4. Exceptional States Component Architecture (`ExceptionalState.tsx`)

All exceptional and edge cases throughout the mobile app utilize the standardized, accessible `ExceptionalState.tsx` component matching `partner screens/TIJUM Mobile App UI Screens.png`:

| State Type | Trigger Condition | Visual Appearance | Primary Action & Recovery |
| :--- | :--- | :--- | :--- |
| **`no-internet`** | Network fetch failure, timeout, or unreachable host | `WifiOff` icon in coral soft circle (`#FFEBDD`), warm cream card | **"Retry Connection"** / **"Tap to Retry"**: Re-executes the failed API query |
| **`no-results`** | Empty property search or filter mismatch | `SearchX` icon in subtle surface circle, descriptive guidance | **"Reset Filters"**: Resets all city, category, AC, and meal filters to default |
| **`session-expired`** | 401 Unauthorized or remote device logout | `Clock` icon in amber light circle (`#FFF3E0`), security notice | **"Sign In Again"**: Redirects to appropriate login screen and purges stale token |
| **`account-blocked`** | 403 Forbidden or restricted account status | `ShieldAlert` icon in rose circle (`#FFEBEE`), compliance explanation | **"Contact Support"**: Opens email client to `support@tijum.com` |
| **`payment-failed`** | Gateway rejection or user cancellation | `AlertCircle` icon in danger circle, gateway error message | **"Try Payment Again"**: Re-initiates Razorpay checkout with fresh payment token |
| **`resume-booking`** | App reopened with active 15-minute hold | `Clock` icon in peach circle, active countdown timer badge | **"Resume Booking"**: Navigates directly to the checkout screen to complete payment |
