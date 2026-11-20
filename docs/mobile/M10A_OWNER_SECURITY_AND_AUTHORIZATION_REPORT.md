# TIJUM Mobile Phase M10A: Owner Security & Authorization Report

**Document Reference:** `docs/mobile/M10A_OWNER_SECURITY_AND_AUTHORIZATION_REPORT.md`  
**Application Scope:** `app/Http/Controllers/Api/V1/Owner/`, Middleware, and Vault Security  
**Date:** November 20, 2026  
**Status:** **ACTIVE, COMPLIANT & CERTIFIED**

---

## 1. Security Architecture & Threat Model

The TIJUM Partner Mobile experience manages sensitive business inventory, pricing schedules, physical room availability, and financial payout destinations. The security implementation ensures total isolation between customer and partner tenants, as well as strict isolation between competing accommodation owners.

---

## 2. Authentication & Guard Enforcements

### 2.1 Dual Layer Guard: Sanctum + Owner Role Guard
Every owner endpoint under `routes/api.php` (`api/v1/owner/*`) enforces:
```php
Route::prefix('v1/owner')
    ->middleware(['auth:sanctum', 'auth.owner'])
    ->group(function () { ... });
```
- `auth:sanctum`: Cryptographically validates bearer token validity and expiration.
- `auth.owner`: Verifies `$request->user() instanceof \App\Models\Owner`. If a customer token attempts access, `403 Forbidden` is returned immediately.

### 2.2 Ownership Verification Scoping
All property-level queries scope explicitly by `owner_id`:
```php
$property = Property::query()
    ->where('owner_id', $owner->id)
    ->where(...)
    ->first();

if ($property === null) {
    return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
}
```
Attempted access to other owners' properties returns HTTP `404 Not Found`, denying attackers confirmation of resource existence.

---

## 3. Physical Room Allocation Safety

When allocating physical rooms (`OwnerRoomController::allocate`):
1. **Ownership Check:** The reservation must belong to a property owned by the authenticated host.
2. **Category Matching:** The allocated physical room must belong to the exact `property_room_type_id` booked by the customer.
3. **Availability Check:** The physical room must be in `active` status and not occupied by an overlapping active reservation or blackout block.
4. **Pessimistic Concurrency Lock:** Acquired using `lockForUpdate()` within an atomic database transaction.

---

## 4. Mobile Token Vault & Session Isolation

As implemented in `apps/mobile/src/auth/SecureTokenStorage.ts`:
- **Hardware Encryption:** Uses iOS Keychain Services (`kSecAttrAccessibleAfterFirstUnlock`) and Android Keystore with AES-GCM 256.
- **Single Active Session:** The mobile application strictly prevents dual simultaneous sessions. Logging in as partner immediately clears any active customer session and vice versa.
- **Offline Revocation Queue:** In the event of logout during connectivity loss, the Bearer token is safely enqueued in hardware storage and automatically revoked with the backend upon network restoration.
