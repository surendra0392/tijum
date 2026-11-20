# TIJUM Native Mobile Architecture Specification

**Document Reference:** `docs/mobile/TIJUM_NATIVE_MOBILE_ARCHITECTURE.md`  
**Application Target:** `apps/mobile/`  
**Framework:** React Native 0.83.10 / Expo SDK 55 (`expo ~55.0.32`, Expo Router `~55.0.18`, React `19.2.0`)  
**TypeScript Version:** 5.7+ (Strict Mode)  
**Security & State:** Hardware-backed Keystore / Keychain (`expo-secure-store`), Context API, Native Razorpay SDK  
**Architecture Date:** November 20, 2026 (Phase M10A Complete)  
**Status:** **ACTIVE, COMPLETE & VERIFIED**

---

## 1. System Overview

TIJUM Native Mobile is an enterprise-grade, multi-tenant accommodation marketplace application designed for modern Android and iOS devices. The application serves two distinct user personas with complete boundary isolation under a Single Active Session architecture:
1. **Customer Marketplace (`apps/mobile/app/(customer)/`):** Search, browse, wishlist curation, quote calculation, promotional coupon/loyalty points application, online Razorpay booking checkout, and post-stay verified review submission.
2. **Accommodation Partner Portal (`apps/mobile/app/(partner)/`):** Comprehensive property management, onboarding wizard, verification applications, room type configurations, discrete physical room inventory, rate plans and pricing in integer paise, calendar blackout availability blocks, front-desk arrival/turnover operations (Check-In / Check-Out, physical room allocation), guest dispute resolution, review responses, settlement payouts, and security credential management.

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
     | • explore/property/[slug]    |                            | • properties/ (List & Hub)   |
     | • bookings/ (Create, Holds)  |                            | • properties/create.tsx (Wiz)|
     | • bookings/[reference] (Rev) |                            | • properties/[id]/edit.tsx   |
     | • rewards/ (Points, Coupons) |                            | • properties/[id]/room-types |
     | • wishlist/index.tsx         |                            | • properties/[id]/rooms.tsx  |
     | • support/ (Inquiry & Griev) |                            | • properties/[id]/pricing    |
     +------------------------------+                            | • properties/[id]/avail      |
                    |                                            | • properties/[id]/media.tsx  |
                    |                                            | • properties/[id]/amenities  |
                    |                                            | • reservations/ (Index & Ops)|
                    |                                            | • reservations/[reference]   |
                    |                                            | • settlements/ (Payouts)     |
                    |                                            | • settlements/[reference]    |
                    |                                            | • financial-profile/ (KYC)   |
                    |                                            | • cases/ (Support & Cases)   |
                    |                                            | • reviews/ (Host Responses)  |
                    |                                            | • account.tsx (Profile & Pwd)|
                    |                                            +------------------------------+
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
│       ├── _layout.tsx                 # Partner Stack navigation (sub-routes hidden with href: null)
│       ├── dashboard.tsx               # Operational metrics & active stays
│       ├── properties/
│       │   ├── index.tsx               # Listed stays & physical room inventory viewer
│       │   ├── create.tsx              # 5-step property onboarding wizard
│       │   └── [id]/
│       │       ├── edit.tsx            # Property details & verification status application
│       │       ├── room-types.tsx      # Room categories, modes & capacity management
│       │       ├── rooms.tsx           # Discrete physical rooms & operational status switches
│       │       ├── pricing.tsx         # Rate plans, currency paise & meal inclusion toggles
│       │       └── availability.tsx    # Blackout date ranges & maintenance block manager
│       ├── reservations/
│       │   ├── index.tsx               # Host bookings & status filters
│       │   └── [reference].tsx         # Check-in, check-out, physical room allocation
│       ├── settlements/
│       │   └── index.tsx               # Financial settlement batches & earnings summary
│       ├── reviews/
│       │   └── index.tsx               # Partner review management & 2,500-char response modal
│       └── account.tsx                 # Partner contact update & password change
├── src/
│   ├── api/
│   │   ├── client.ts                   # Fetch wrapper with safe JSON recovery, PUT/PATCH/DELETE
│   │   ├── customer.ts                 # Customer REST API V1 methods
│   │   ├── owner.ts                    # Partner REST API V1 methods (M10A extended)
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
└── __tests__/                          # Automated unit & integration test suites (112 tests)
```

---

## 3. Strict Domain Architecture: Inventory & Hierarchy

### 3.1 Non-Negotiable Anti-Bed Architecture
The platform model operates on a strict three-tier physical hierarchy:
`Property -> PropertyRoomType -> PropertyRoom`
- **No Bed Models:** Under no circumstances are individual beds modeled, tracked, or allocated as distinct entities.
- **Sharing Capacity:** Shared accommodations (Hostels/PG or Co-Living) define a `sharing_capacity` integer on the room type (e.g. 2-sharing, 4-sharing) and an `accommodation_mode` (`private` or `shared`).
- **Physical Inventory:** Stays track discrete physical rooms with identifiable room numbers (e.g., Room 101, Room B-204). Stays allocate physical rooms during front-desk operations.

### 3.2 Canonical Categories Consolidation
Accommodations are strictly classified into exactly 3 canonical categories:
1. `hostels-pg`: Hostels and Paying Guest accommodations.
2. `homestays`: Local homestay residencies.
3. `co-living`: Modern shared community co-living spaces.

### 3.3 Currency & Minor Unit Handling
All currency calculations and API representations use integer minor units (paise, 1 INR = 100 paise):
- `daily_rate_minor`, `weekly_rate_minor`, `monthly_rate_minor`.
- UI inputs convert Rupee amounts into integer paise on submit (`amount * 100`) and format backend minor units for display (`amount / 100`).

---

## 4. Data Flow & Security State Management

### 4.1 Single Active Session Architecture
As implemented in `src/auth/SecureTokenStorage.ts`, TIJUM enforces a **Single Active Session** security model on mobile devices:
- Only **one** authenticated principal (Customer OR Partner) is active at any time.
- Active vault keys:
  * `tijum_active_session_token`: Hardware-encrypted Sanctum Bearer token.
  * `tijum_active_principal_type`: Current authenticated role (`'customer' | 'owner'`).
  * `tijum_active_device_session_id`: Unique device installation UUID.
- Logging in as a partner when a customer session exists automatically triggers local eviction and queues the customer token for revocation, preventing cross-role token confusion.

### 4.2 Resilient Multi-Token Offline Revocation Queue
- When logout occurs offline, the token is evicted from memory and stored in `tijum_pending_revocations_queue`.
- The queue retains tokens up to 7 days (`MAX_REVOCATION_RETENTION_MS`) or 10 retry attempts (`MAX_REVOCATION_RETRIES`).
- Upon network restoration, `SecureTokenStorage.reconcileRevocations()` automatically drains the queue against `/api/v1/auth/{principal}/logout`.
- Self-healing JSON parsing safely discards corrupted queue entries without crashing the UI.

### 4.3 Network Resilience & Error Recovery
- `ApiClient` (`src/api/client.ts`) parses response text safely:
  * Distinguishes valid JSON payloads from upstream HTML error responses (500/502/503).
  * Preserves true HTTP status codes so the UI can render appropriate recovery screens.

### 4.4 Promotional Precedence & Checkout Protection
- Checkout strictly applies calculations in authoritative backend sequence:
  1. Base price: `rate * duration * quantity`.
  2. Coupon discount applied first (subject to campaign caps).
  3. Points redeemed against remaining subtotal balance (FEFO engine).
  4. Final balance charged through native Razorpay SDK.

---

## 5. Verification & Quality Assurance

- **Type Safety:** 100% strict TypeScript (`tsc --noEmit` exits with 0 errors).
- **Automated Tests:** 112 comprehensive unit and integration tests executing under Node.js native test runner (100% pass rate).
- **Backend Tests:** 70 API V1 feature tests passing with 421 assertions.
- **Code Style:** 100% compliant with project formatting standards (Laravel Pint and Prettier).
