# TIJUM Mobile Phase M10A.1 — Owner Security, Multi-Tenant Isolation & Concurrency Report

**Document Reference:** `docs/mobile/M10A1_OWNER_SECURITY_MYSQL_CONCURRENCY_REPORT.md`  
**Milestone:** M10A.1 (Security Boundaries & Database Integrity)  
**Database Engine:** MySQL 8.0+ / InnoDB (ACID compliant)  
**Date:** November 20, 2026  
**Status:** **COMPLETE & VERIFIED**

---

## 1. Multi-Tenant Authorization & Boundary Isolation

Accommodation partners operate under strict multi-tenant isolation. Under no circumstances can a partner view, mutate, or allocate inventory belonging to another partner.

### 1.1 Dual Middleware Protection
All endpoints under `api/v1/owner/*` are guarded by two mandatory middleware layers:
1. `auth:sanctum`: Cryptographically validates the Bearer token against active tokens in the `personal_access_tokens` table.
2. `auth.owner`: Verifies that `auth()->user()` is an instance of `App\Models\Owner`. If a customer or unauthenticated request targets an owner route, it is rejected with `403 Forbidden`.

### 1.2 Tenant-Scoped Database Queries
Every owner-facing controller action enforces explicit ownership scoping:
```php
$property = Property::query()
    ->where('owner_id', $owner->id)
    ->where('id', (int) $id)
    ->first();

if ($property === null) {
    return $this->error("Property '{$id}' not found or unauthorized.", 'NOT_FOUND', 404);
}
```
Direct primary key queries without `owner_id` scoping are strictly prohibited.

---

## 2. Token Security & Single Active Session Architecture

### 2.1 Hardware Keystore Storage
The mobile client never stores credentials in plaintext or `AsyncStorage`. As implemented in `apps/mobile/src/auth/SecureTokenStorage.ts`:
- **Android:** Uses Android Keystore Provider with AES-GCM 256-bit encryption.
- **iOS:** Uses Apple Keychain Services with `kSecAttrAccessibleAfterFirstUnlock`.

### 2.2 Offline Token Revocation Self-Healing Queue
When a user logs out in offline mode or during network interruption:
1. The token is immediately deleted from active device storage.
2. The token is enqueued into `tijum_pending_revocations_queue` in SecureStore.
3. Upon network reconnection or app relaunch, the queue flushes pending tokens to `/api/v1/auth/owner/revoke-all`, ensuring orphaned tokens are revoked on the server.

---

## 3. MySQL 8 / InnoDB Concurrency & Deadlock Prevention

Concurrent operations—such as simultaneous online customer bookings and front-desk physical room allocations—must not produce race conditions, overbooking, or database deadlocks.

### 3.1 Strict Hierarchical Locking Order
To prevent deadlock cycles between competing transactions, all transactional actions acquire row locks in deterministic ascending order:

$$\text{Property} \longrightarrow \text{PropertyRoomType} \longrightarrow \text{Reservation} \longrightarrow \text{PropertyRoom} \quad (\text{sorted by ID ASC})$$

```php
DB::transaction(function () use ($propertyId, $roomTypeId, $roomId) {
    // 1. Lock Property
    $property = Property::query()->whereKey($propertyId)->lockForUpdate()->firstOrFail();

    // 2. Lock Room Type
    $roomType = PropertyRoomType::query()->whereKey($roomTypeId)->lockForUpdate()->firstOrFail();

    // 3. Lock Physical Room
    $room = PropertyRoom::query()->whereKey($roomId)->lockForUpdate()->firstOrFail();

    // 4. Execute atomic state mutation...
});
```

### 3.2 Date-Range Overlap Concurrency Check
During physical room allocation (`OwnerRoomController@allocate`):
- The physical room is locked via `lockForUpdate()`.
- Overlapping active stays are verified using canonical interval math:
$$\text{check\_in\_date} < \text{new\_checkout} \quad \text{AND} \quad \text{checkout\_date} > \text{new\_check\_in}$$
- If an overlap exists, the transaction rolls back cleanly, returning HTTP 422 with zero partial mutations.

---

## 4. API Rate Limiting & Abuse Prevention

- Authentication routes (`/api/v1/auth/*`) are protected by `throttle:api-auth` (limiting attempts to 10 per minute per IP), preventing credential stuffing attacks.
- Sensitive financial updates (`/api/v1/owner/financial-profile`) require active Sanctum authentication with verified phone credentials.
