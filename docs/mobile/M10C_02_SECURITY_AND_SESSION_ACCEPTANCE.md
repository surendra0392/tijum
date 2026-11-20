# TIJUM Mobile Phase M10C — Security & Session Acceptance

**Milestone:** M10C — Native Mobile Release Readiness & Production Acceptance  
**Status:** PASS / VERIFIED  
**Auditor:** Lead Mobile Architect & Antigravity Swarm  
**Backend Security Tests:** 161 Passed (1,216 Assertions)  
**Mobile Security Tests:** 28 Passed (0 Failed)  

---

## 1. Single Active Session Architecture

### 1.1 Secure Storage Implementation
- **Storage Engine:** `expo-secure-store` backed by Android Keystore (AES-256 GCM) and iOS Keychain (`kSecAttrAccessibleAfterFirstUnlock`).
- **Keys:**
  - `tijum_active_session_token`: Bearer token for authenticated HTTP requests.
  - `tijum_active_principal_type`: Role discriminator (`customer` | `owner`).
- **Storage Isolation:** Neither `AsyncStorage` nor unencrypted filesystem cache holds session credentials.

### 1.2 Mutual Role Exclusivity & Session Switching
```
[User logs in as Customer]
  └─> Writes Customer Token & Principal = 'customer'
[User initiates Partner Login]
  └─> Immediately wipes existing Customer Token & state
  └─> Writes Owner Token & Principal = 'owner'
  └─> Re-routes stack to (partner)/dashboard
```
Verified behavior: The application strictly forbids concurrent dual-role sessions on a single device instance. Switching personas tears down local reactive caches and establishes a fresh cryptographic session.

---

## 2. Token Guards & Cross-Tenant IDOR Prevention

### 2.1 Backend Middleware Guards
- `EnsureSanctumPrincipalIsCustomer`: Restricts `/api/v1/customer/*` routes exclusively to tokens minted by `CustomerAuthController`. Tokens minted for an `Owner` attempting to query customer endpoints immediately return `HTTP 403 Forbidden` (`INSUFFICIENT_PERMISSIONS`).
- `EnsureSanctumPrincipalIsOwner`: Restricts `/api/v1/owner/*` routes strictly to `OwnerAuthController` tokens. Customers calling partner endpoints are rejected with `HTTP 403 Forbidden`.

### 2.2 IDOR & Multi-Tenant Boundary Enforcement
| Resource | Tested Attack Vector | Backend Defense | Result |
| :--- | :--- | :--- | :--- |
| **Customer Reservations** | Customer A queries Customer B's reservation reference | `$customer->reservations()->where('reference', $ref)->firstOrFail()` | `HTTP 404 / 403` |
| **Partner Properties** | Owner A queries / edits Owner B's property ID | `$owner->properties()->where('id', $id)->firstOrFail()` | `HTTP 404 / 403` |
| **Physical Room Inventory** | Owner A assigns room from Owner B's property | Policy checks property ownership matching authenticated owner | `HTTP 403 Forbidden` |
| **Financial Settlements** | Owner A attempts to inspect settlement batch of Owner B | Settlement query scoped strictly to `$owner->id` | `HTTP 404 Not Found` |
| **Customer Support Disputes** | Customer A posts message to Customer B's case reference | Case lookup scoped to `$user->cases()` | `HTTP 404 Not Found` |

---

## 3. Remote Session Invalidation & Token Revocation

Both personas have dedicated token lifecycle endpoints:
- `GET /api/v1/auth/{customer|owner}/tokens`: Lists active sessions with device name, IP address, and last active timestamp.
- `DELETE /api/v1/auth/{customer|owner}/tokens/{id}`: Selectively revokes a single remote session.
- `POST /api/v1/auth/{customer|owner}/revoke-all`: Revokes all active bearer tokens across all devices simultaneously.
- `POST /api/v1/auth/{customer|owner}/logout`: Revokes current device's bearer token.

---

## 4. Deep Link Security & Input Sanitization

### 4.1 Native Intent Filters & Universal Links
- **Android Intent Filters:** Configured with `autoVerify: true` for domain `tijum.com` covering `/properties` and `/reservations`.
- **iOS Associated Domains:** Configured with `applinks:tijum.com`.
- **Custom Scheme:** `tijum://` handled via Expo Linking with strict route parsing.

### 4.2 Malicious Deep Link Traversal Defense
- Deep links targeting private resources (e.g., `tijum://reservations/RES-1234`) check local session state prior to navigation:
  - If unauthenticated: Routes to `/(auth)/customer-login?redirect=...`.
  - If authenticated as wrong role: Denies navigation with error toast and retains active role stack.
  - Parameter injection or script tags in URL query parameters are rejected by TypeScript schema validation and backend route constraints.

---

## 5. Security Audit Verdict

**GATE VERDICT: PASS**  
The application meets enterprise security standards for mobile token management, tenant isolation, and single-session integrity.
