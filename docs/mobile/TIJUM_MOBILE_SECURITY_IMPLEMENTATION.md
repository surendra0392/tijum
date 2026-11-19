# TIJUM Mobile Security Implementation Specification

**Document Reference:** `docs/mobile/TIJUM_MOBILE_SECURITY_IMPLEMENTATION.md`  
**Application Scope:** `apps/mobile/src/auth/` and `apps/mobile/src/api/`  
**Security Standards:** OWASP Mobile Top 10 (2024/2025), Hardware Keystore Storage  
**Date:** November 20, 2026  
**Status:** **ACTIVE & CERTIFIED**

---

## 1. Mobile Threat Model & Security Posture

The TIJUM Native Mobile application processes financial booking holds, customer personal data (phone numbers, identities, stay locations), and partner operational controls. The security architecture addresses the following risks:
1. **Insecure Credential Storage (OWASP M1):** Mitigated via platform-native SecureStore hardware key isolation.
2. **Insecure Communication (OWASP M3):** Mitigated via HTTPS-only transport, strict Bearer token header injection, and sanitized error logging.
3. **Session Leakage & Domain Confusion:** Mitigated via discrete customer and partner token storage keys.
4. **Offline Token Revocation Failure:** Mitigated via a persistent, self-healing FIFO offline revocation queue.
5. **Brute Force & Enumeration Attacks:** Mitigated via backend rate-limiting middleware (`throttle:api-auth`).

---

## 2. Hardware Keystore & Secure Token Vault

Authentication credentials are never written to `AsyncStorage` or plain-text files. The application utilizes `expo-secure-store` backed by:
- **iOS:** Apple Keychain Services (`kSecAttrAccessibleAfterFirstUnlock`).
- **Android:** Android Keystore Provider with AES-GCM 256-bit encryption.

```typescript
// Vault Storage Keys
const CUSTOMER_TOKEN_KEY = 'tijum_customer_token';
const OWNER_TOKEN_KEY    = 'tijum_owner_token';
const REVOCATION_QUEUE   = 'tijum_pending_revocation_queue';
```

- **Domain Isolation:** Customer tokens and partner tokens are stored under separate keys. Logging in as an owner does not contaminate or overwrite customer tokens, and account switching strictly resets memory state.

---

## 3. Resilient Offline Token Revocation & Self-Healing

When an authenticated user logs out while offline (or in poor connectivity):
1. **Local Eviction:** Session state is immediately cleared from the React tree, preventing unauthorized local device access.
2. **Queue Persistence:** The orphaned Bearer token is pushed to the `tijum_pending_revocation_queue` in SecureStore with a timestamp and retry counter.
3. **Automatic Reconciliation:** On subsequent app launches or when network connectivity is detected, `SecureTokenStorage.reconcileRevocations()` drains the queue:
   - On HTTP `200` / `204`: Token is successfully purged from backend; dropped from queue.
   - On HTTP `401`: Token is already invalid/dead on backend; dropped from queue.
   - On HTTP `429` / `5xx`: Queue is preserved and retried with exponential backoff.
4. **Self-Healing Corrupt Data Protection:** If corrupt or non-JSON data is detected in the revocation queue, the storage layer safely drops corrupted items and heals the queue rather than crashing the application.

---

## 4. API Attack Surface Protection & Rate Limiting

1. **Authentication Rate Limiting:**
   - Public and authentication endpoints (`/api/v1/auth/customer/forgot-password`, `/api/v1/auth/owner/forgot-password`, login) are governed by `throttle:api-auth` preventing brute-force dictionary attacks.
2. **Phone Number Sanitization:**
   - Registration and authentication inputs strip all non-digit characters and eliminate leading country codes (`91`), strictly validating 10-digit formats before sending payloads over the wire.
3. **Input Sanitization:**
   - Review text, front-desk check-in notes, and grievance messages are trimmed and stripped of script tags on the backend to prevent stored XSS attacks.
