# TIJUM Mobile Security Implementation Specification

**Document Reference:** `docs/mobile/TIJUM_MOBILE_SECURITY_IMPLEMENTATION.md`  
**Application Scope:** `apps/mobile/src/auth/`, `apps/mobile/src/api/`, and Backend Owner Security Guard  
**Framework Target:** React Native 0.83.10 / Expo SDK 55  
**Security Standards:** OWASP Mobile Top 10 (2024/2025), Hardware Keystore Storage, Strict Multitenant Isolation  
**Date:** November 20, 2026 (Phase M10A Complete)  
**Status:** **ACTIVE, COMPLETE & VERIFIED**

---

## 1. Mobile Threat Model & Security Posture

The TIJUM Native Mobile application processes financial booking holds, customer personal data (phone numbers, identities, stay locations), and partner operational controls. The security architecture addresses the following risks:
1. **Insecure Credential Storage (OWASP M1):** Mitigated via platform-native SecureStore hardware key isolation.
2. **Insecure Communication (OWASP M3):** Mitigated via HTTPS-only transport, strict Bearer token header injection, and sanitized error logging.
3. **Session Leakage & Domain Confusion:** Mitigated via a **Single Active Session** architecture with explicit role tracking (`customer` vs `owner`).
4. **Offline Token Revocation Failure:** Mitigated via a persistent, self-healing FIFO offline revocation queue.
5. **Brute Force & Enumeration Attacks:** Mitigated via backend rate-limiting middleware (`throttle:api-auth`).
6. **Multi-Tenant Cross-Property Hijacking:** Mitigated via strict `auth.owner` middleware and tenant-boundary scoped database queries.

---

## 2. Hardware Keystore & Secure Token Vault

Authentication credentials are never written to `AsyncStorage` or plain-text files. The application utilizes `expo-secure-store` backed by:
- **iOS:** Apple Keychain Services (`kSecAttrAccessibleAfterFirstUnlock`).
- **Android:** Android Keystore Provider with AES-GCM 256-bit encryption.

### 2.1 Single Active Session Vault Keys
As implemented in `apps/mobile/src/auth/SecureTokenStorage.ts`:
- `tijum_active_session_token`: The single active Sanctum Bearer token.
- `tijum_active_principal_type`: The active principal role (`'customer' | 'owner'`).
- `tijum_active_device_session_id`: Unique device installation UUID generated upon first install.
- `tijum_pending_revocations_queue`: Serialized JSON array of orphaned tokens queued for backend revocation.

Only **one** authenticated principal is permitted in the mobile client at any time. When an account domain switch occurs (e.g. logging into partner account while customer account is active), the previous session token is atomically queued for revocation and cleared from active memory, guaranteeing zero cross-role session contamination.

---

## 3. Partner Multi-Tenant Authorization & Integrity (Phase M10A)

### 3.1 Strict Route Guarding (`auth.owner`)
All partner API routes under `/api/v1/owner/*` enforce dual middleware:
- `auth:sanctum`: Ensures the bearer token is valid, non-expired, and cryptographically verified.
- `auth.owner`: Guarantees the authenticated principal is an instance of `App\Models\Owner`. Any customer token attempting to access `/api/v1/owner/*` is rejected with `403 Forbidden`.

### 3.2 Property Ownership Enforcement
Every property-scoped controller action rigorously scopes queries by the authenticated owner ID:
```php
$property = Property::query()
    ->where('owner_id', $owner->id)
    ->where(function ($query) use ($id): void {
        if (is_numeric($id)) {
            $query->where('id', (int) $id);
        } else {
            $query->where('slug', (string) $id);
        }
    })
    ->first();

if ($property === null) {
    return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
}
```
Any attempt to inspect, edit, or manipulate rooms, rates, blocks, or media of another partner's property returns an ambiguous 404, preventing enumeration of foreign resources.

### 3.3 Concurrency & Pessimistic Row Locking
To prevent double-booking, conflicting room allocations, or overlapping blackout blocks:
- Transactional operations acquire row locks using `lockForUpdate()`.
- Hierarchical lock acquisition sequence:
  `Property -> PropertyRoomType -> Reservation -> PropertyRoom (sorted by ID ASC)`.
- Race conditions during simultaneous check-in or room allocation are trapped and rolled back safely.

---

## 4. Resilient Offline Token Revocation & Self-Healing

When an authenticated user logs out while offline (or in poor connectivity):
1. **Local Eviction:** Session state is immediately cleared from the React tree, preventing unauthorized local device access.
2. **Queue Persistence:** The orphaned Bearer token is pushed to the `tijum_pending_revocations_queue` in SecureStore with a timestamp and retry counter.
3. **Automatic Reconciliation:** On subsequent app launches or when network connectivity is detected, `SecureTokenStorage.reconcileRevocations()` drains the queue:
   - On HTTP `200` / `204`: Token is successfully purged from backend; dropped from queue.
   - On HTTP `401`: Token is already invalid/dead on backend; dropped from queue.
   - On HTTP `429` / `5xx`: Queue is preserved and retried with exponential backoff.
4. **Self-Healing Corrupt Data Protection:** If corrupt or non-JSON data is detected in the revocation queue, the storage layer safely drops corrupted items and heals the queue rather than crashing the application.

---

## 5. API Attack Surface Protection & Rate Limiting

1. **Authentication Rate Limiting:**
   - Public and authentication endpoints (`/api/v1/auth/customer/forgot-password`, `/api/v1/auth/owner/forgot-password`, login) are governed by `throttle:api-auth` preventing brute-force dictionary attacks.
2. **Phone Number Sanitization:**
   - Registration and authentication inputs strip all non-digit characters and eliminate leading country codes (`91`), strictly validating 10-digit formats before sending payloads over the wire.
3. **Input Sanitization:**
   - Review text, front-desk check-in notes, and grievance messages are trimmed and stripped of script tags on the backend to prevent stored XSS attacks.
4. **Partner Response Character Limits:**
   - Host review responses are validated on both client and backend to enforce a 2,500 character / 500 word limit.
