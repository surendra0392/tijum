# TIJUM Mobile Security & Session Management Guide

**Phase:** Phase 20A — Mobile Stabilization, Framework Upgrade, Security Hardening & Production Readiness  
**Target Systems:** TIJUM Mobile Application (`apps/mobile/`) and Laravel API Layer (`routes/api.php`)  
**Security Boundary:** Customer (`User`) vs. Partner / Owner (`Owner`) Sanctum Personal Access Tokens

---

## 1. Executive Security Architecture

Mobile applications face unique attack surfaces including physical device sharing, concurrent profile collisions, stale tokens in persistent local storage, and unauthorized role elevation. 

To eliminate session confusion and privilege crossover, TIJUM Phase 20A establishes a **Strict Single Active Session Architecture**. The mobile client permits strictly **one** authenticated principal at any given time. Customers and property partners operate within isolated execution domains, backed by hardware-level secure enclave storage, server-side token revocation, and strict cross-tenant middleware.

```
       ┌────────────────────────────────────────────────────────┐
       │                TIJUM Mobile Client                     │
       └───────────────────────────┬────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   [ Customer Session ]                      [ Partner Session ]
   - Single Active Token                     - Single Active Token
   - Hardware Encrypted                      - Hardware Encrypted
   - Role: User (Customer)                   - Role: Owner (Partner)
              │                                         │
              └────────────────────┬────────────────────┘
                                   │ Bearer Token
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │            Laravel Sanctum API Boundary              │
        │             `/api/v1/customer/*` (EnsureCustomer)    │
        │             `/api/v1/owner/*`    (EnsureOwner)       │
        └──────────────────────────────────────────────────────┘
```

---

## 2. Single Active Session Protocol (`SecureTokenStorage.ts`)

In Phase 20, tokens were stored in isolated keys. Phase 20A replaces this with an enforced single active slot model:

1. **Storage Keys**:
   - `tijum_active_session_token`: The active Bearer token.
   - `tijum_active_principal_type`: The active principal role (`'customer' | 'owner'`).
   - `tijum_active_device_session_id`: Unique installation session identifier.
   - `tijum_pending_revocation_token`: Token queued for offline revocation reconciliation.
2. **Legacy Slot Purging**:
   - Any legacy keys (`tijum_mobile_auth_token`, `tijum_mobile_account_type`) detected on launch are automatically purged to prevent dormant credential retention attacks.
3. **Session Switching Invariant**:
   - It is structurally impossible to switch between Customer and Partner roles without executing a complete logout sequence. Switching roles unregisters device push notifications, deletes the active token from the database, flushes local storage, and redirects the user to the gateway authentication screen.

---

## 3. Auth State Machine (`AuthContext.tsx`)

The authentication lifecycle is governed by a 6-state deterministic machine:

| State | Description | Permitted Actions |
|---|---|---|
| `idle` | Initial application boot and credential restoration | Background session verification |
| `guest` | Unauthenticated visitor | Browse stays, view public CMS, login/register |
| `customer_authenticated` | Verified Customer session active | Book stays, pay with Razorpay, file grievances |
| `owner_authenticated` | Verified Partner session active | Accept/decline bookings, view settlements |
| `logging_out` | Active teardown of session, device unregistration | Teardown network calls, token deletion |
| `session_expired` | Server returned 401 or token was invalidated | Notification to user, fallback to guest |

### Session Verification on Boot
Whenever the mobile application boots or resumes from the background:
1. `restoreAndVerifySession()` reads the token from `expo-secure-store`.
2. If present, it executes a live profile validation against `GET /api/v1/customer/profile` or `GET /api/v1/owner/dashboard`.
3. If the server returns `401 Unauthorized` (e.g. if the user revoked tokens from the web dashboard or admin terminated the account), the mobile client instantly purges all local storage and transitions to `session_expired`.

---

## 4. Token Revocation & Offline Resilience

Sanctum tokens represent persistent API authority. Phase 20A enforces comprehensive revocation:

### 4.1 Server-Side Destruction
When a user logs out:
- `POST /api/v1/auth/customer/logout` or `POST /api/v1/auth/owner/logout` executes `$request->user()->currentAccessToken()->delete()`.
- The token record is physically erased from the `personal_access_tokens` table. Any subsequent request with that token fails with `401 Unauthorized`.

### 4.2 Offline Revocation Queue
If an active user logs out while offline or experiencing a transient network disconnection:
1. The token and principal role are written to `tijum_pending_revocation_token` in `expo-secure-store`.
2. Local authentication state is immediately wiped so the device is secure.
3. On the subsequent application boot with active internet connectivity, `reconcilePendingRevocations()` pops the pending token and dispatches the revocation request to the backend.

### 4.3 All-Devices Revocation (`revoke-all`)
Both customer and owner APIs provide panic revocation endpoints:
- `POST /api/v1/auth/customer/revoke-all`
- `POST /api/v1/auth/owner/revoke-all`
- Executes `$user->tokens()->delete()`, invalidating every active mobile, tablet, and desktop session associated with that identity.

---

## 5. Defensive API Security & Tenant Isolation

### 5.1 Strict Cross-Tenant Isolation
- **Customer Endpoints (`/api/v1/customer/*`)**: Protected by `EnsureCustomerToken` middleware. If an `Owner` token attempts access, the server returns `403 Forbidden` (`INVALID_ACCOUNT_TYPE`).
- **Partner Endpoints (`/api/v1/owner/*`)**: Protected by `EnsureOwnerToken` middleware. If a `User` (Customer) token attempts access, the server returns `403 Forbidden` (`INVALID_ACCOUNT_TYPE`).

### 5.2 Zero Secrets Exposure in Public Config
The `GET /api/v1/public/config` endpoint is strictly audited to ensure zero backend credentials leak:
- **Exposed**: App name, brand primary/secondary colors, operational cities, check-in policy (`09:00:00`), checkout policy (`08:00:00`), currency code (`INR`), and payment gateway provider (`razorpay`).
- **Strictly Blocked**: Razorpay `key_secret`, webhook secret, MSG91 auth key, WhatsApp access token, database password, encryption keys, and JWT secrets.

### 5.3 Affirmative Privacy & Marketing Consent
In compliance with Indian Digital Personal Data Protection (DPDP) principles:
- Customer registration (`POST /api/v1/auth/customer/register`) defaults `marketing_consent` to `false` unless explicitly submitted as `true`.
- Marketing consent state is visible and mutable within the customer profile.

---

## 6. Deep Link Navigation Protection (`PushNotificationService.ts`)

Incoming push notification payloads or URI schemes (`tijum://`) are validated prior to navigation:
1. **Scheme & Target Sanitization**: Rejects dangerous schemes (`javascript:`, `data:`, `file:`) and ensures paths start with `/`.
2. **Session Authorization Check**:
   - Customer paths (`/customer/*`, `/bookings/*`) require `currentPrincipalType === 'customer'`. If accessed by a partner or unauthenticated guest, navigation redirects to `/login`.
   - Partner paths (`/partner/*`, `/settlements/*`) require `currentPrincipalType === 'owner'`. If accessed by a customer or guest, navigation redirects to `/login`.
   - Public paths (`/search`, `/property/*`, `/city/*`) are permitted for all session types.
