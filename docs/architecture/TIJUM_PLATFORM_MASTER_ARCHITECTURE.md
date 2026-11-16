# TIJUM PLATFORM MASTER ARCHITECTURE SPECIFICATION

**Document Reference:** `TIJUM-ARCH-V1.0-2026`  
**Status:** Authoritative Architectural Standard  
**Framework Version:** Laravel 13.42.0 | PHP 8.4.27 | MySQL 8.0 InnoDB  
**Frontend Stacks:** Inertia.js v3 + React 19 + TypeScript + Tailwind CSS v4 (Web) | Expo SDK 52 + React Native 0.81 (Mobile)  

---

## 1. SYSTEM TOPOLOGY & COMPONENT ARCHITECTURE

TIJUM is structured as a modular monolith optimized for concurrency safety, data consistency, and low-latency response times across multiple consumer touchpoints:

```
                      ┌────────────────────────────────────────┐
                      │            CLIENT PLATFORMS            │
                      │                                        │
                      │  ┌────────────────┐  ┌──────────────┐  │
                      │  │  Inertia/React │  │  Expo Mobile │  │
                      │  │    Web Client  │  │ (iOS/Android)│  │
                      │  └───────┬────────┘  └──────┬───────┘  │
                      └──────────┼──────────────────┼──────────┘
                                 │                  │
                                 │ Cookie/Session   │ Bearer Token
                                 ▼                  ▼
       ┌──────────────────────────────────────────────────────────────┐
       │                       HTTP ROUTING LAYER                     │
       │                                                              │
       │   / (Web Routes)            /api/v1 (REST API Routes)        │
       │   - Public Catalog / CMS    - Public Mobile Catalog          │
       │   - Customer Booking Flow   - Customer Sanctum API (v1)      │
       │   - Partner Portal (/owner) - Owner Sanctum API (v1)         │
       │   - Admin Dashboard (/admin)- Webhook Ingress (HMAC signed)  │
       └──────────────────────────────┬───────────────────────────────┘
                                      │
                                      ▼
       ┌──────────────────────────────────────────────────────────────┐
       │                     AUTHENTICATION GUARDS                    │
       │   web (User)   owner (Owner)   admin (Admin)  sanctum (API)  │
       └──────────────────────────────┬───────────────────────────────┘
                                      │
                                      ▼
       ┌──────────────────────────────────────────────────────────────┐
       │                   BUSINESS & DOMAIN SERVICES                 │
       │                                                              │
       │  ┌───────────────────────┐       ┌────────────────────────┐  │
       │  │  Reservation Lifecycle│       │  Rewards Engine        │  │
       │  │  - Atomic Hold (15m)  │       │  - Coupon Validator    │  │
       │  │  - Pricing Engine     │       │  - Referral Attributor │  │
       │  │  - Payment Verifier   │       │  - Loyalty Points Ledg │  │
       │  └───────────┬───────────┘       └───────────┬────────────┘  │
       │              │                               │               │
       │  ┌───────────▼───────────┐       ┌───────────▼────────────┐  │
       │  │  Financial Engine     │       │  Customer Protection   │  │
       │  │  - Commission Split   │       │  - 4-Hour SLA Grievance│  │
       │  │  - Settlement Calc    │       │  - Relocation Engine   │  │
       │  │  - Razorpay Route     │       │  - Escrow Freeze       │  │
       │  └───────────┬───────────┘       └───────────┬────────────┘  │
       │              │                               │               │
       │  ┌───────────▼───────────────────────────────▼────────────┐  │
       │  │             Notification Dispatcher (Multi-Channel)    │  │
       │  │       WhatsApp (Meta)  SMS (Twilio)  Email  Push (Expo)│  │
       │  └────────────────────────────────────────────────────────┘  │
       └──────────────────────────────┬───────────────────────────────┘
                                      │
                                      ▼
       ┌──────────────────────────────────────────────────────────────┐
       │                   PERSISTENCE LAYER (MySQL 8)                │
       │   - 88 Migrations (Integer Paise, Foreign Keys, Indexes)     │
       │   - Row-level Locks (FOR UPDATE) for Concurrency Safety      │
       │   - Double-entry Ledgers for Loyalty Points & Transactions   │
       └──────────────────────────────────────────────────────────────┘
```

---

## 2. MULTI-GUARD AUTHENTICATION & SESSION ISOLATION

TIJUM enforces strict cryptographic and session boundary separation across four distinct user roles:

| Guard | Model Class | Session / Auth Mechanism | Storage Scope |
| :--- | :--- | :--- | :--- |
| `web` | `App\Models\User` | Laravel State Session (HTTP-only cookie) | Customer web bookings & profiles |
| `owner` | `App\Models\Owner` | Isolated Owner Session Cookie | Partner onboarding & property management |
| `admin` | `App\Models\Admin` | Isolated Admin Session Cookie | Platform administration, moderation & finance |
| `sanctum` | `User` / `Owner` | Personal Access Tokens (Bearer Token) | Mobile App (Customer & Owner workflows) |

### Session Separation Invariants:
1. **No Shared Cookies:** The `web`, `owner`, and `admin` sessions use unique cookie names, preventing privilege escalation.
2. **Sanctum Multi-Ability Scopes:** API tokens issued to Customers carry `role:customer` abilities; tokens issued to Owners carry `role:owner` abilities. Middleware explicitly verifies token abilities on protected endpoints.
3. **Session Revocation:** Users can revoke specific tokens or trigger `/revoke-all` upon password change or security events.

---

## 3. TWO-TIER INVENTORY & ROOM ALLOCATION ARCHITECTURE

TIJUM decouples commercial sellable capacity from operational physical room tracking:
$$\text{Property} \xrightarrow{\text{hasMany}} \text{Room Type} \xrightarrow{\text{hasMany}} \text{Physical Rooms}$$

1. **Room Types (`room_types`):**
   - Configures maximum guests, pricing, amenities, and meal inclusions (`meals_included`, `breakfast_included`, etc.).
   - Specifies `total_rooms` available for sale.
2. **Physical Rooms (`rooms`):**
   - Stores operational room identifiers (`room_number`), floor, building wing, and housekeeping state (`clean`, `inspected`, `maintenance`).
3. **Dynamic Availability Engine:**
   - Evaluated atomically without allocating physical rooms to customers during booking.
   - Database queries use MySQL row-level locking (`SELECT ... FOR UPDATE`) on the `room_types` row to prevent double-booking race conditions during simultaneous checkouts.
4. **Internal Owner Allocation:**
   - Post-payment confirmation, property managers allocate specific physical rooms via the Owner Portal (`/owner/reservations/{id}/allocate`).

---

## 4. BOOKING, HOLD & PAYMENT STATE MACHINE

1. **Atomic Hold Generation:**
   - Customer checkout generates an unconfirmed reservation with status `hold` and an expiration timestamp ($t_0 + 15\text{ minutes}$).
   - The hold immediately decrements available capacity for those dates.
2. **Automatic Payment Verification:**
   - Payment order created via Razorpay Payment Gateway.
   - Upon completion, the client triggers `POST api/v1/customer/reservations/{reference}/payment/verify` or Razorpay sends `payment.captured` webhook.
   - Verification calculates HMAC SHA256 of `razorpay_order_id + "|" + razorpay_payment_id` against the secret key.
   - Upon verification match, status immediately transitions to `confirmed`.
   - **No owner approval gate exists prior to confirmation.**

---

## 5. MONETARY ENGINE & ZERO FLOATING-POINT MATH

All financial and points values across the platform are strictly modeled using integer arithmetic:

| Dimension | Storage Unit | Precision | Invariant |
| :--- | :--- | :--- | :--- |
| **Monetary Values** | Indian Paise (INR Minor) | Integer ($1\text{ INR} = 100\text{ paise}$) | Zero floating-point (`round()`, `float`) math allowed |
| **Loyalty Points** | Integer Points | Integer ($1\text{ Point} = ₹1.00 = 100\text{ paise}$) | Integer division (`intdiv`) for earnings and caps |
| **Tax Rates (GST)** | Integer Basis Points | Integer ($1\% = 100\text{ bps}$) | Standard Indian GST slabs (500 bps, 1200 bps, 1800 bps) |

### Settlement Protection Rule:
Platform discounts (Coupons funded by TIJUM, Loyalty Points redemptions) are **absorbed by TIJUM platform revenue** and are not deducted from the partner's base room tariff. Partner net payout is guaranteed:
$$\text{Net Payout} = \text{Gross Tariff} - \text{Agreed Commission} - \text{TDS (Section 194-O)}$$

---

## 6. REWARDS & LOYALTY ECOSYSTEM ARCHITECTURE

The rewards engine comprises three interconnected sub-systems:

1. **Coupon Engine:**
   - Evaluates campaign validity, category applicability (`hostels-pg`, `homestays`, `co-living`), city restrictions, minimum booking amounts, and customer usage limits.
   - Supports fixed rupee discounts or percentage discounts with maximum caps.
2. **Referral Attribution Engine:**
   - Generates unique alpha-numeric referral codes for registered customers.
   - Attributions are tracked at user registration.
   - Referral rewards are unlocked and credited as TIJUM points only after the referred user completes their initial booking.
3. **Double-Entry Loyalty Points Ledger:**
   - Every point movement (credit, hold, debit, expire, refund) creates an immutable ledger entry in `loyalty_points_ledger`.
   - Temporary holds on points during active checkout prevent double-spend across parallel devices.

---

## 7. MULTI-CHANNEL NOTIFICATION ENGINE

The `NotificationDispatcher` routes critical lifecycle alerts across five channels:

```
                          NotificationDispatcher
                                    │
       ┌──────────────┬─────────────┼──────────────┬──────────────┐
       ▼              ▼             ▼              ▼              ▼
     Email           SMS         WhatsApp       In-App          Push
  (Laravel Mails) (Twilio/AWS) (Meta Cloud)  (Database DB)  (Expo Push API)
```

- **Idempotency:** All notifications utilize idempotency keys to prevent duplicate dispatches during queue retries.
- **Webhook Ingress:** Inbound webhooks for WhatsApp and SMS delivery reports enforce HMAC SHA256 signature verification.

---

## 8. MOBILE APPLICATION CLIENT ARCHITECTURE

- **Framework:** Expo SDK 52 with React Native 0.81 running Hermes JS engine.
- **State & Networking:** TanStack React Query v5 for server state caching; centralized `ApiClient` with automatic Bearer token injection from `expo-secure-store`.
- **Session Security:** Biometric authentication support, automatic token refresh, and instant local token purging upon 401 Unauthorized responses.
- **Offline Safety:** Network status monitoring with user-friendly retry banners and zero cached stale payment operations.
