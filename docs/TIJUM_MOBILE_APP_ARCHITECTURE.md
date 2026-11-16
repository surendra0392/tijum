# TIJUM Mobile Application Architecture

**Application:** TIJUM Mobile (iOS & Android)  
**Location:** `apps/mobile/`  
**Package:** `com.tijum.app`  
**Framework:** React Native `0.76.7`, Expo SDK `52`, Expo Router `4`  
**Language:** TypeScript `5.3+`  
**Target Platforms:** Android (API 24+) and iOS (15.1+)  

---

## 1. High-Level Architectural Overview

TIJUM Mobile is engineered as a unified cross-platform application providing two distinct, strictly segregated user experiences within a single binary distribution:

1. **Customer App Experience:** Focuses on discovery, property exploration, food inclusion transparency, reservation lifecycle management, Razorpay online payments, and grievance support.
2. **Partner (Host) Experience:** Focuses on property monitoring, incoming reservation review, acceptance/decline capacity locks, payout inspection, and operational alert delivery.

The application communicates exclusively with the versioned REST API at `/api/v1/*` using Laravel Sanctum Bearer tokens.

```
+------------------------------------------------------------------------------------+
|                                TIJUM Mobile App                                    |
|                                (`apps/mobile/`)                                    |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  +---------------------------+                      +---------------------------+  |
|  |     Customer Portal       |                      |      Partner Portal       |  |
|  |  (app/(customer)/*)       |                      |   (app/(partner)/*)       |  |
|  +---------------------------+                      +---------------------------+  |
|  | - Explore Stays           |                      | - Host Command Center     |  |
|  | - Meal Badges & Timing    |                      | - Review Bookings         |  |
|  | - 15-min Payment Window   |                      | - Accept / Decline        |  |
|  | - Grievance Support       |                      | - Payouts & Settlements   |  |
|  +---------------------------+                      +---------------------------+  |
|                \                                                  /                |
|                 +------------------------------------------------+                 |
|                 |          AuthContext & SecureTokenStorage      |                 |
|                 |          (Keychain / Android Keystore)         |                 |
|                 +------------------------------------------------+                 |
|                                         |                                          |
|                 +------------------------------------------------+                 |
|                 |       ApiClient (`apps/mobile/src/api/*`)      |                 |
|                 +------------------------------------------------+                 |
|                        |                                  |                        |
|            +-----------------------+          +-----------------------+            |
|            |    Razorpay Native    |          |   Expo Notifications  |            |
|            |    Checkout SDK       |          |   (APNs & FCM Push)   |            |
|            +-----------------------+          +-----------------------+            |
+------------------------|----------------------------------|------------------------+
                         |                                  |
                         v                                  v
+------------------------------------------------------------------------------------+
|                               TIJUM Backend API                                    |
|                              (`https://tijum.com`)                                 |
|                                                                                    |
|  - Laravel 13 & PHP 8.4                 - Route Middleware:                        |
|  - Laravel Sanctum Personal Access        * `auth.customer` (Strict User Model)    |
|  - MySQL 8 Relational Database            * `auth.owner` (Strict Owner Model)      |
+------------------------------------------------------------------------------------+
```

---

## 2. Directory Layout & Modular Structure

```
apps/mobile/
├── app/                               # Expo Router File-Based Routing
│   ├── _layout.tsx                    # Root Layout with AuthProvider
│   ├── index.tsx                      # Gateway Screen (Customer / Host / Guest)
│   ├── (auth)/                        # Authentication Route Group
│   │   ├── _layout.tsx                # Auth Stack Navigator
│   │   ├── customer-login.tsx         # Customer Sign-in
│   │   ├── customer-register.tsx      # Customer Registration
│   │   └── owner-login.tsx            # Partner Sign-in
│   ├── (customer)/                    # Customer Experience Route Group
│   │   ├── _layout.tsx                # Customer Bottom Tab Navigator
│   │   ├── explore/
│   │   │   ├── index.tsx              # Stay Explorer & Filter
│   │   │   └── property/[slug].tsx    # Property Details & Meal Schedule
│   │   ├── bookings/
│   │   │   ├── index.tsx              # My Reservations List
│   │   │   ├── [reference].tsx        # Reservation Details & 15-min Pay Window
│   │   │   └── create.tsx             # Booking Creation Flow
│   │   ├── notifications/index.tsx    # Customer In-app Notification Inbox
│   │   ├── profile/index.tsx          # Profile & Password Management
│   │   └── support/index.tsx          # Customer Protection & Grievance Tickets
│   └── (partner)/                     # Partner Experience Route Group
│       ├── _layout.tsx                # Partner Bottom Tab Navigator
│       ├── dashboard.tsx              # Command Center Metrics
│       ├── reservations/
│       │   ├── index.tsx              # Bookings List
│       │   └── [reference].tsx        # Reservation Accept / Decline Inspection
│       ├── properties/index.tsx       # Listed Stays & Room Categories
│       ├── settlements/index.tsx      # Payout Statements & UTR Tracking
│       ├── notifications/index.tsx    # Partner Operational Alerts
│       └── account.tsx                # Host Profile & Business Details
├── src/                               # Application Core Logic
│   ├── api/                           # Typed API Clients
│   │   ├── client.ts                  # Axios/Fetch Base with Interceptors
│   │   ├── types.ts                   # DTOs & Domain Interfaces
│   │   ├── public.ts                  # Public Marketplace Calls
│   │   ├── customer.ts                # Customer Authenticated Calls
│   │   └── owner.ts                   # Partner Authenticated Calls
│   ├── auth/                          # Authentication Subsystem
│   │   ├── AuthContext.tsx            # React Context & State Machine
│   │   └── SecureTokenStorage.ts      # Expo SecureStore Wrapper
│   ├── components/                    # Reusable Design System Components
│   │   ├── Button.tsx                 # Primary, Secondary, Outline Buttons
│   │   ├── Input.tsx                  # Floating Label Text Inputs
│   │   ├── Badge.tsx                  # Semantic Status Tags
│   │   ├── MealBadge.tsx              # Dynamic Breakfast/Lunch/Dinner Tags
│   │   ├── StayTimingBadge.tsx        # Standard 09:00 AM / 08:00 AM Tag
│   │   ├── ReservationStatusBadge.tsx # Color-coded Lifecycle Badges
│   │   └── PropertyCard.tsx           # Standardized Property Card
│   ├── notifications/                 # Push Notification Engine
│   │   └── PushNotificationService.ts # Device Token Registration with Backend
│   ├── payments/                      # Mobile Payment Gateway
│   │   └── RazorpayService.ts         # Native Checkout & Signature Verification
│   └── theme/                         # Design Tokens
│       ├── colors.ts                  # Brand Palette
│       ├── typography.ts              # Font Scales & Weights
│       └── spacing.ts                 # 4pt Grid Spacing System
├── app.json                           # Expo Application Configuration
├── eas.json                           # Expo Application Services Build Profiles
├── package.json                       # Mobile Dependencies & Scripts
└── tsconfig.json                      # Strict TypeScript Configuration
```

---

## 3. Authentication & Token Management

1. **Storage Security:** Tokens are stored using `expo-secure-store` which maps to **iOS Keychain** and **Android EncryptedSharedPreferences** backed by KeyStore hardware. Plaintext `AsyncStorage` is never used for sensitive tokens.
2. **Account Segregation:** The application manages two independent token slots:
   - `customer_auth_token`
   - `owner_auth_token`
   When switching between Customer and Partner views, the active token is switched in memory while retaining device identity.
3. **Session Resiliency:** The API client automatically handles `401 Unauthorized` responses by clearing the expired token and redirecting the user to the appropriate login portal.

---

## 4. Native Payment Workflow (Razorpay)

The mobile payment flow guarantees transactional integrity and prevents client-side bypass:

1. **Host Acceptance:** Host accepts booking request, transitioning status to `awaiting_payment` and starting a 15-minute expiration countdown.
2. **Order Initiation:** Mobile calls `CustomerApi.initiatePayment(reference)`. The backend creates a Razorpay Order and returns `order_id`, `amount_paise`, `key_id`, and `currency`.
3. **Native Checkout:** `RazorpayService.openCheckout(payload)` displays the native Razorpay modal on Android (UPI intent apps, Netbanking, Cards) and iOS (Apple Pay, Cards, Netbanking).
4. **Signature Verification:** When payment finishes, Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
5. **Authoritative Confirmation:** The mobile client passes these parameters to `CustomerApi.verifyPayment(reference, data)`. The backend computes HMAC SHA-256 using the server-side secret and transitions the reservation status to `confirmed`.

---

## 5. Mobile Push Notifications

1. **Device Registration:** On application startup, `PushNotificationService.registerForPushNotificationsAsync()` requests user permission and retrieves an Expo Push Token (`ExponentPushToken[...]`).
2. **Encrypted Backend Storage:** The push token is transmitted to `/api/v1/{domain}/devices/register` with platform, device model, and a persistent installation UUID.
3. **Backend Encryption:** The backend encrypts tokens at rest in the `mobile_devices` table using Laravel Eloquent encrypted casts.
4. **Event Dispatch:** When reservations transition status, the Phase 18 notification dispatcher queues jobs to the `PushNotificationChannel`, sending HTTP payloads to `https://exp.host/--/api/v2/push/send`.
