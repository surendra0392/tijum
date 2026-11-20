# TIJUM Phase M10C.2 — Baseline & Defect Audit

## 1. Overview & Objective

Phase **M10C.2** is the final defect-closure and native production release acceptance milestone for TIJUM, following the M10C.1 policy reconciliation.

This milestone ensures complete financial integrity, statutory Customer Protection SLA compliance, strict search date validation and inventory availability filtering, native notification lifecycle management, and verified production artifact generation for Android release.

---

## 2. Repository & Baseline Synchronization

- **Repository:** `D:\Herd\tijum`
- **Remote Origin:** `https://github.com/surendra0392/tijum.git`
- **Active Branch:** `main`
- **Baseline Commits:**
  - `dc2511f` — M10C.1 statutory policy reconciliation and release artifact baseline.
  - `9d55767` — Production API URL correction (`https://tijum.com/api/v1`) for preview APK, fallback guarding against invalid staging hostnames, and first-launch permission prompt.
  - `e4a4dc2` — M10C.2 core financial hardening, SLA isolation, and strict search availability.
  - `311be6d` — Production Android versionCode bump to `3` (`app.json`).

---

## 3. Pre-Execution Defect Audit

An independent code-level inspection of the M10C.1 baseline identified four critical areas requiring hardening:

### 3.1 Financial Integrity & TDS Evaluation
- **Issue 1 (Business Constitution):** In `TaxCalculationService.php`, only `individual` and `proprietorship` strings were checked. Indian homestay and family properties frequently operate under Hindu Undivided Family (HUF) or sole proprietorship variants.
- **Issue 2 (`is_exempt` Blanket Bypass):** `TaxConfiguration::is_exempt` was treated as an unconditional bypass, exempting corporate entities or partners with unverified/blank PAN numbers without requiring an approved CA reference.
- **Issue 3 (Turnover Date Basis):** Section 393(1) of the Income-tax Act, 2025 mandates withholding at the time of credit or payment. Cumulative FY turnover was previously measured against `check_in_date`, which distorted turnover for advance bookings, included cancelled reservations, and failed to deduct processed refunds.

### 3.2 Customer Protection SLA Deadlines
- **Issue:** `CustomerProtectionCase::getResolutionDueAtAttribute()` previously returned `$this->sla_due_at` when present. When legacy tickets had `sla_due_at` populated with operational first-action targets (e.g., 2 hours or 4 hours), the statutory 30-day resolution window under consumer protection law was inadvertently truncated.

### 3.3 Public Search Availability & Date Validation
- **Issue 1 (Swallowed Validation):** `PublicPropertyController::index` silently caught unparseable dates or single date queries, falling back to an unconstrained search without notifying the client.
- **Issue 2 (Inventory Booking Blindspot):** The SQL date query only checked `PropertyAvailabilityBlock` records. Properties whose rooms were fully consumed by confirmed reservations or active 15-minute payment holds remained visible as available in search results.

### 3.4 Mobile Push Notification Lifecycle
- **Issue:** On fresh install, notification permissions were not prompted on launch, requiring manual settings toggling. Furthermore, Android 13+ `POST_NOTIFICATIONS` permission was not explicitly declared in `app.json`.

---

## 4. Remediation Plan

1. Harden `TaxCalculationService.php` to support `individual`, `proprietorship`, `sole proprietorship`, and `huf`, require verified PAN and approved CA reference for any order-level exemption, and calculate FY turnover based on `confirmed_at` (with `created_at` fallback), excluding cancelled bookings and subtracting processed refunds.
2. Update `CustomerProtectionCase::getResolutionDueAtAttribute()` so legacy `sla_due_at` cannot truncate the statutory 30-day resolution deadline.
3. Update `PublicPropertyController.php` to strictly validate stay dates (returning HTTP 422 for single dates, past check-in, or checkout <= check-in) and filter results using `ReservationAvailabilityService::stayCapacity` to eliminate fully booked inventory.
4. Verify native push notification prompt on install and `POST_NOTIFICATIONS` declaration in `app.json`.
5. Execute full regression testing across PHPUnit, MySQL concurrency, Expo TypeScript, Jest, and Expo Doctor.
6. Dispatch and verify a clean EAS production AAB build.
