# TIJUM Mobile — Security, Storage & Session Architecture
**Milestone:** Complete Mobile Application UI/UX Transformation & Implementation  
**Document ID:** `docs/mobile/complete-app-implementation/07_SECURITY_AND_SESSION_ARCHITECTURE.md`  
**Generated At:** 2026-11-20  
**Target Codebase:** `apps/mobile/src/auth/*`, `apps/mobile/src/api/*`, `apps/mobile/src/utils/*`

---

## 1. Security Architecture Principles

The TIJUM mobile security architecture enforces strict protection of user credentials, financial transactions, and operational records across both Customer and Partner personas:
1. **Encrypted At-Rest Storage:** Hardware-backed Keystore (Android) and Keychain (iOS) for all persistent authentication credentials.
2. **Single Active Session Constraint:** One active device session per principal, with immediate revocation on remote login or role switch.
3. **Deep Link Defense-in-Depth:** Mandatory sanitization, canonical scheme enforcement, and destination allowlisting.
4. **Resilient Network Transport:** HTML/Nginx error page isolation, strict JSON parsing, and graceful timeout handling.
5. **Zero Secrets in Binary:** Production builds contain zero private keys, API secrets, or gateway passwords.

---

## 2. Secure Token Storage (`SecureTokenStorage.ts`)

### 2.1 Hardware-Backed Keychain & Keystore
Tokens are stored using `expo-secure-store`:
- **Android:** Encrypted using Android Keystore with AES-256 GCM encryption.
- **iOS:** Stored in the iOS Keychain with `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` access control.

```typescript
export const SecureTokenStorage = {
    async setToken(token: string): Promise<void> { ... },
    async getToken(): Promise<string | null> { ... },
    async removeToken(): Promise<void> { ... },
    async setPrincipalType(type: 'customer' | 'partner'): Promise<void> { ... },
    async getPrincipalType(): Promise<'customer' | 'partner' | null> { ... },
};
```

### 2.2 In-Memory Fallback
For headless test environments (Node.js test runner) where native storage bridges are unavailable, `SecureTokenStorage` gracefully falls back to an encrypted in-memory map, ensuring complete testability without mock brittleness.

---

## 3. Single-Active-Session Enforcement

The application enforces strict single-active-session semantics:
- Every successful login issues a cryptographically secure token stored under `tijum_active_session_token`.
- The token is tagged with its principal type (`customer` or `partner`).
- When a user logs in on a new device or switches roles, the previous session token is revoked by the backend.
- Any subsequent request using an invalidated token receives an HTTP 401 Unauthorized response, triggering the `SessionExpired` workflow which purges local storage and displays the re-authentication modal.

---

## 4. Deep Link Sanitization & Validation (`deepLinkSanitizer.ts`)

Incoming deep links and universal links (`tijum://` or `https://tijum.com`) are sanitized before processing:
- **Allowed Schemes:** Strictly `tijum:` and `https:`.
- **Allowed Hosts:** Strictly `tijum.com` or empty for custom scheme links.
- **Route Whitelist:** Only mapped routes are permitted:
  - `/explore`, `/explore/property/[slug]`
  - `/bookings`, `/bookings/[reference]`
  - `/support`, `/support/[reference]`
  - `/rewards`, `/wishlist`
  - `/dashboard`, `/reservations/[reference]`
- **Rejection of Open Redirects:** Any URL containing external domains (e.g., `https://evil.com`), JavaScript schemes (`javascript:`), or directory traversal patterns (`../`) is rejected immediately and logged to diagnostic telemetry.

---

## 5. Network Client Resiliency & Safe Parsing (`client.ts`)

The API client (`apps/mobile/src/api/client.ts`) handles network failure modes gracefully:
- **Non-JSON Error Handling:** If an intermediary proxy (Nginx, Cloudflare) returns an HTML error page (e.g., HTTP 500 Internal Server Error, 502 Bad Gateway, 504 Gateway Timeout), the client prevents JSON parser crashes and returns a clean, structured `SERVER_ERROR` payload.
- **HTTP 204 No Content:** Handled cleanly without attempting to parse empty responses.
- **Authentication Header Injection:** Automatically attaches `Authorization: Bearer <token>` and `Accept: application/json` headers on all authenticated requests.
- **Dynamic API Base URL:** Configured via `process.env.EXPO_PUBLIC_API_URL` with safe fallback to `https://tijum.com/api/v1`.
