# TIJUM — TEST EXECUTION AND REGRESSION REPORT (PHASE 21)
## Automated Test Suites, Manual Workflow Verification, Skipped Tests Analysis & Regression Results

**Project:** TIJUM — Food-Inclusive Accommodation Marketplace  
**Phase:** 21  
**Date:** November 13, 2026  
**Auditor:** QA Lead & Senior Software Engineer  

---

## 1. Automated Test Suite Results

### 1.1 Backend PHPUnit Execution Summary
The complete Laravel feature and unit test suite was executed using `php artisan test --compact`:

```json
{
  "tool": "phpunit",
  "result": "passed",
  "tests": 476,
  "passed": 472,
  "assertions": 4221,
  "duration_ms": 40262,
  "skipped": 4,
  "failed": 0,
  "errors": 0
}
```

- **Total Tests Executed:** 476
- **Passed:** 472
- **Failed:** 0
- **Skipped:** 4
- **Total Assertions:** 4,221
- **Execution Duration:** 40.26 seconds

---

## 2. Analysis of Skipped Tests

In accordance with Phase 21 audit rules, all skipped tests were independently investigated to document their exact location, purpose, and reason for exclusion:

| Test File | Test Method | Reason for Skip |
|---|---|---|
| `tests/Feature/Reservations/MySqlReservationLockingTest.php` | `test_concurrent_create_reservation_hits_real_room_type_lock_without_overselling` | `Requires an isolated MySQL database ending in _test.` |
| `tests/Feature/Payments/MySqlPaymentConcurrencyTest.php` | `test_concurrent_payment_verification_locks_and_prevents_duplicate_capture` | `Requires an isolated MySQL database ending in _test.` |
| `tests/Feature/Protection/MySqlRelocationConcurrencyTest.php` | `test_concurrent_relocation_acceptance_locks_and_prevents_double_booking` | `Requires an isolated MySQL database ending in _test.` |
| `tests/Feature/Financial/MySqlSettlementConcurrencyTest.php` | `test_concurrent_settlement_generation_locks_and_prevents_duplicate_payout` | `Requires an isolated MySQL database ending in _test.` |

### Justification:
These 4 tests explicitly validate MySQL InnoDB row-level locking (`SELECT ... FOR UPDATE`) across parallel database connections. When run against the standard automated test configuration (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`), SQLite's database-level lock causes instant table deadlocks rather than true row-level queuing. Therefore, these tests feature a guard:
```php
if (DB::getDriverName() !== 'mysql' || ! str_ends_with((string) DB::getDatabaseName(), '_test')) {
    $this->markTestSkipped('Requires an isolated MySQL database ending in _test.');
}
```
This skip condition is deliberate, valid, and architecturally appropriate. Zero application logic tests are skipped.

---

## 3. Regression Tests Added in Phase 21

To verify the push notification receipt polling and device revocation architecture (DEF-21-04), a new feature test was implemented:

### `tests/Feature/Notifications/ExpoReceiptServiceTest.php`
1. `test_poll_receipts_updates_delivery_to_delivered_on_ok_status`:
   - Fakes HTTP call to `https://exp.host/--/api/v2/push/getReceipts`.
   - Creates a delivery in `accepted` status with an Expo ticket ID.
   - Executes `ExpoReceiptService::pollReceipts()`.
   - Asserts delivery transitions to `NotificationDeliveryStatus::Delivered` and records `delivered_at`.
2. `test_poll_receipts_revokes_device_on_device_not_registered`:
   - Creates an active `MobileDevice` with a push token.
   - Mocks an Expo receipt error `DeviceNotRegistered`.
   - Asserts delivery transitions to `NotificationDeliveryStatus::Failed` with error code `DeviceNotRegistered`.
   - Asserts the device's `is_active` flag is set to `false` and `revoked_at` is populated.

**Result:** Passed (2 tests, 9 assertions).

---

## 4. Frontend & Mobile Build Validations

### 4.1 Root Web TypeScript (`npm run types:check`)
- Command: `tsc --noEmit`
- Result: **0 errors.**

### 4.2 Web Production Build (`npm run build`)
- Tool: Vite 8.0.3 with Wayfinder plugin
- Result: **2,605 modules transformed in 18.17s. 0 errors.**

### 4.3 Mobile TypeScript (`cd apps/mobile; npx tsc --noEmit`)
- Command: `tsc --noEmit` (against Expo SDK 55.0.32 typings)
- Result: **0 errors.**

### 4.4 Mobile Expo Doctor (`cd apps/mobile; npx expo-doctor`)
- Checks: 20 checks covering package compatibility, Git status, app.json schema, and duplicate dependencies.
- Result: **20/20 checks passed. No issues detected!**

### 4.5 Mobile Dependencies (`cd apps/mobile; npx expo install --check`)
- Command: `npx expo install --check`
- Result: **Dependencies are up to date.**

---

## 5. Code Quality & Style Analysis

### Laravel Pint Formatter:
- Command: `vendor/bin/pint --dirty --format agent`
- Result: **Passed 100% clean.** Zero formatting anomalies detected.
