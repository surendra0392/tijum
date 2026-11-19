# TIJUM Native Mobile Architecture Specification

**Document Reference:** `docs/mobile/TIJUM_NATIVE_MOBILE_ARCHITECTURE.md`  
**Application Target:** `apps/mobile/`  
**Framework:** React Native 0.83.10 / Expo SDK 55 (`expo ~55.0.32`, Expo Router `~55.0.18`, React `19.2.0`)  
**TypeScript Version:** 5.7+ (Strict Mode)  
**Security & State:** Hardware-backed Keystore / Keychain (`expo-secure-store`), Context API, Native Razorpay SDK  
**Architecture Date:** November 20, 2026 (Phase M9 Reconciled)  
**Status:** **ACTIVE, RECONCILED & CERTIFIED**

---

## 1. System Overview

TIJUM Native Mobile is an enterprise-grade, multi-tenant accommodation marketplace application designed for modern Android and iOS devices. The application serves two distinct user personas with complete boundary isolation under a Single Active Session architecture:
1. **Customer Marketplace (`apps/mobile/app/(customer)/`):** Search, browse, wishlist curation, quote calculation, promotional coupon/loyalty points application, online Razorpay booking checkout, and post-stay verified review submission.
2. **Accommodation Partner Portal (`apps/mobile/app/(partner)/`):** Dashboard KPIs, inventory inspection, physical room assignment, front-desk arrival/turnover operations (Check-In / Check-Out), guest dispute resolution, review responses, and security credential management.

```
                              +---------------------------------------+
                              |         Expo Router Root Stack        |
                              |              app/_layout.tsx          |
                              +---------------------------------------+
                                                  |
                    +-----------------------------+-----------------------------+
                    |                                                           |
     +------------------------------+                            +------------------------------+
     |   Customer Flow (customer)   |                            |    Partner Flow (partner)    |
     +------------------------------+                            +------------------------------+
     | • explore/ (Index, Search)   |                            | • dashboard.tsx (KPIs & Ops) |
     | • explore/property/[slug]    |                            | • reservations/ (Index & Ops)|
     | • bookings/ (Create, Holds)  |                            | • reservations/[reference]   |
     | • bookings/[reference] (Rev) |                            | • properties/ (List & Rooms) |
     | • rewards/ (Points, Coupons) |                            | • reviews/ (Host Responses)  |
     | • wishlist/index.tsx         |                            | • account.tsx (Profile & Pwd)|
     | • support/ (Inquiry & Griev) |                            +------------------------------+
     +------------------------------+                                           |
                    |                                                           |
                    +-----------------------------+-----------------------------+
                                                  |
                                    +---------------------------+
                                    |     Core Services src/    |
                                    +---------------------------+
                                    | • auth/ (SecureStore)     |
                                    | • api/ (Client, Owner,    |
                                    |         Customer, Public) |
                                    | • payments/ (Razorpay)    |
                                    | • theme/ (Colors, Tokens) |
                                    | • components/ (Atomic UI) |
                                    +---------------------------+
                                                  |
                                    +---------------------------+
                                    |   Backend REST API V1     |
                                    |     routes/api.php        |
                                    +---------------------------+
```

---

## 2. Directory Structure & Modular Decomposition

```
apps/mobile/
├── app/
│   ├── _layout.tsx                     # Global Stack, AuthProvider, StatusBar
│   ├── index.tsx                       # Portal selector, Brand landing & Official Channels
│   ├── (auth)/
│   │   ├── customer-login.tsx          # Customer credentials + Forgot Password
│   │   ├── customer-register.tsx       # 10-digit phone normalized customer signup
│   │   ├── owner-login.tsx             # Partner credentials + Forgot Password
│   │   └── owner-register.tsx          # 10-field partner verification signup
│   ├── (customer)/
│   │   ├── _layout.tsx                 # Customer Stack navigation
│   │   ├── explore/
│   │   │   ├── index.tsx               # Canonical category feeds, search & filters
│   │   │   └── property/[slug].tsx     # Stay details, food badges, room rates
│   │   ├── bookings/
│   │   │   ├── index.tsx               # Customer reservations & status tabs
│   │   │   ├── create.tsx              # Checkout, holds, coupons, points redemption
│   │   │   └── [reference].tsx         # Stay details & 4-category review modal
│   │   ├── rewards/
│   │   │   ├── index.tsx               # Loyalty balance & rewards hub
│   │   │   ├── points.tsx              # FEFO points ledger breakdown
│   │   │   ├── referrals.tsx           # Referral code share & rewards tracker
│   │   │   └── coupons.tsx             # Active promotional campaigns & codes
│   │   ├── wishlist/
│   │   │   └── index.tsx               # Dedicated saved properties curation
│   │   └── support/
│   │       └── index.tsx               # Grievance lodgement (48h/30d SLA) & contact inquiry
│   └── (partner)/
│       ├── _layout.tsx                 # Partner Stack navigation
│       ├── dashboard.tsx               # Operational metrics & active stays
│       ├── reservations/
│       │   ├── index.tsx               # Host bookings & status filters
│       │   └── [reference].tsx         # Check-in, check-out, physical room allocation
│       ├── properties/
│       │   └── index.tsx               # Listed stays & physical room inventory viewer
│       ├── reviews/
│       │   └── index.tsx               # Partner review management & 2,500-char response modal
│       └── account.tsx                 # Partner contact update & password change
├── src/
│   ├── api/
│   │   ├── client.ts                   # Fetch wrapper with safe JSON recovery & status preservation
│   │   ├── customer.ts                 # Customer REST API V1 methods
│   │   ├── owner.ts                    # Partner REST API V1 methods
│   │   ├── public.ts                   # Public discovery & contact methods
│   │   ├── rewards.ts                  # Coupons, points & referral API calls
│   │   └── types.ts                    # Canonical TypeScript interfaces & data contracts
│   ├── auth/
│   │   ├── AuthContext.tsx             # Session state, auto-refresh & switching
│   │   └── SecureTokenStorage.ts       # SecureStore single active token & multi-token revocation
│   ├── components/                     # Atomic design components (Button, Input, Badge, etc.)
│   ├── payments/
│   │   └── RazorpayService.ts          # Native Razorpay checkout orchestration
│   ├── theme/
│   │   ├── colors.ts                   # Deep Plum, Coral, Warm Cream token palette
│   │   ├── spacing.ts                  # Consistent padding & border radius scale
│   │   └── typography.ts               # Scaled font metrics & weights
│   └── types/
│       └── native-shims.d.ts           # Ambient React Native shims
└── __tests__/                          # Automated unit & integration test suites
```

---

## 3. Data Flow & Security State Management

### 3.1 Single Active Session Architecture
As implemented in `src/auth/SecureTokenStorage.ts`, TIJUM enforces a **Single Active Session** security model on mobile devices:
- Only **one** authenticated principal (Customer OR Partner) is active at any time.
- Active vault keys:
  * `tijum_active_session_token`: Hardware-encrypted Sanctum Bearer token.
  * `tijum_active_principal_type`: Current authenticated role (`'customer' | 'owner'`).
  * `tijum_active_device_session_id`: Unique device installation UUID.
- Logging in as a partner when a customer session exists automatically triggers local eviction and queues the customer token for revocation, preventing cross-role token confusion.

### 3.2 Resilient Multi-Token Offline Revocation Queue
- When logout occurs offline, the token is evicted from memory and stored in `tijum_pending_revocations_queue`.
- The queue retains tokens up to 7 days (`MAX_REVOCATION_RETENTION_MS`) or 10 retry attempts (`MAX_REVOCATION_RETRIES`).
- Upon network restoration, `SecureTokenStorage.reconcileRevocations()` automatically drains the queue against `/api/v1/auth/{principal}/logout`.
- Self-healing JSON parsing safely discards corrupted queue entries without crashing the UI.

### 3.3 Network Resilience & Error Recovery
- `ApiClient` (`src/api/client.ts`) parses response text safely:
  * Distinguishes valid JSON payloads from upstream HTML error responses (500/502/503).
  * Preserves true HTTP status codes so the UI can render appropriate recovery screens.

### 3.4 Promotional Precedence & Checkout Protection
- Checkout strictly applies calculations in authoritative backend sequence:
  1. Base price: `rate * duration * quantity`.
  2. Coupon discount applied first (subject to campaign caps).
  3. Points redeemed against remaining subtotal balance (FEFO engine).
  4. Final balance charged through native Razorpay SDK.

---

## 4. Verification & Quality Assurance

- **Type Safety:** 100% strict TypeScript (`tsc --noEmit` exits with 0 errors).
- **Automated Tests:** Comprehensive unit and integration tests executing under Node.js native test runner.
- **Code Style:** 100% compliant with project formatting standards.
