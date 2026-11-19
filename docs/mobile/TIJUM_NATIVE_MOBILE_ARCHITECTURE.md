# TIJUM Native Mobile Architecture Specification

**Document Reference:** `docs/mobile/TIJUM_NATIVE_MOBILE_ARCHITECTURE.md`  
**Application Target:** `apps/mobile/`  
**Framework:** React Native 0.76.7 / Expo SDK 52 (Expo Router 4.0.17)  
**TypeScript Version:** 5.3+ (Strict Mode)  
**Security & State:** Expo SecureStore, Context API, Native Razorpay SDK  
**Architecture Date:** November 20, 2026  
**Status:** **ACTIVE & CERTIFIED**

---

## 1. System Overview

TIJUM Native Mobile is a unified, multi-tenant accommodation marketplace application designed for Android and iOS devices. The application serves two distinct user personas with complete boundary isolation:
1. **Customer Marketplace (`apps/mobile/app/(customer)/`):** Search, browse, wishlist, quote calculation, promotional coupon/loyalty points application, online Razorpay booking checkout, and post-stay verified review submission.
2. **Accommodation Partner Portal (`apps/mobile/app/(partner)/`):** Dashboard KPIs, inventory inspection, front-desk arrival/turnover operations (Check-In / Check-Out), physical room assignment, guest dispute resolution, and security credential management.

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
     | • explore/ (Index, Search)   |                            | • dashboard/ (KPIs & Metrics)|
     | • explore/property/[slug]    |                            | • reservations/ (Index & Ops)|
     | • bookings/ (Create, Holds)  |                            | • reservations/[reference]   |
     | • bookings/[reference] (Rev) |                            | • properties/ (List & Rooms) |
     | • rewards/ (Points, Coupons) |                            | • account.tsx (Profile & Pwd)|
     | • wishlist.tsx               |                            +------------------------------+
     | • support/ (Inquiry & Griev) |                                           |
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
│   ├── index.tsx                       # Portal selector & Brand landing
│   ├── (auth)/
│   │   ├── customer-login.tsx          # Customer credentials + Forgot Password
│   │   ├── customer-register.tsx       # 10-digit phone normalized customer signup
│   │   ├── owner-login.tsx             # Partner credentials + Forgot Password
│   │   └── owner-register.tsx          # 10-field partner verification signup
│   ├── (customer)/
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
│   │   ├── wishlist.tsx                # Saved properties with local/remote sync
│   │   └── support/
│   │       └── index.tsx               # Grievance lodgement & contact inquiry
│   └── (partner)/
│       ├── dashboard.tsx               # Operational metrics & active stays
│       ├── reservations/
│       │   ├── index.tsx               # Host bookings & status filters
│       │   └── [reference].tsx         # Check-in, check-out, physical room allocation
│       ├── properties/
│       │   └── index.tsx               # Listed stays & room category inspection
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
│   │   └── SecureTokenStorage.ts       # SecureStore multi-token retention & self-healing
│   ├── components/                     # Atomic design components (Button, Input, Badge, etc.)
│   ├── payments/
│   │   └── RazorpayService.ts          # Native Razorpay checkout orchestration
│   ├── theme/
│   │   ├── colors.ts                   # Deep Plum, Coral, Warm Cream token palette
│   │   ├── spacing.ts                  # Consistent padding & border radius scale
│   │   └── typography.ts               # Scaled font metrics & weights
│   └── types/
│       └── native-shims.d.ts           # Ambient React Native shims
└── __tests__/                          # 79 automated unit & integration test suites
```

---

## 3. Data Flow & State Management

1. **Token Persistence & Vault Security:**
   - Tokens are persisted strictly in hardware-backed keystores via `expo-secure-store`.
   - Separate vault slots are maintained for customer (`tijum_customer_token`) and partner (`tijum_owner_token`) sessions, completely eliminating session leakage.
   - If offline logout occurs, an offline revocation queue stores orphaned tokens and reconciles with the backend upon network restoration.

2. **Network Resilience & Error Recovery:**
   - `ApiClient` in `src/api/client.ts` uses resilient parsing:
     * Reads `response.text()` first; attempts `JSON.parse()`.
     * If backend returns HTML (e.g. 500/502/503), it extracts status code and creates a structured `ApiError` preserving true HTTP status.
     * Prevents false "Network Offline" dialogs when backend returns standard server errors.

3. **Promotions & Checkout Precedence:**
   - Financial calculation strictly mirrors web backend:
     1. Base amount: `rate * duration * quantity`.
     2. Coupon discount applied first (subject to max cap).
     3. Points redeemed against remaining subtotal (FEFO consumption).
     4. Final payable amount passed to Razorpay order creation.

---

## 4. Verification & Quality Assurance

- **Type Safety:** 100% strict TypeScript (`tsc --noEmit` exits with 0 errors).
- **Automated Tests:** 79 unit/integration tests running under Node.js native test runner with zero external mocking libraries.
- **Code Style:** Formatted and linted with Prettier and ESLint.
