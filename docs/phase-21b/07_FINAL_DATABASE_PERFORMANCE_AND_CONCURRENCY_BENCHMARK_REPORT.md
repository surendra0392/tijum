# TIJUM Phase 21B — Final Database Performance & Concurrency Benchmark Report

**Document ID:** `DOC-P21B-007`  
**Phase:** 21B — Final Technical Remediation & Release Readiness  
**Target Environment:** Isolated MySQL 8.0 (`tijum_test`) InnoDB  
**Engine & Driver:** MySQL InnoDB (Row-level Locking) via PHP 8.4 PDO  
**Benchmark Test:** `tests/Feature/Performance/DatabaseBenchmarkTest.php`  
**Metrics Output:** `storage/benchmark_results.json`  
**Verification Date:** November 14, 2026  
**Status:** **VERIFIED COMPLETE**

---

## 1. Executive Summary & Objective

Phase 21A's performance documentation contained extrapolated projections for Linux production servers (e.g. "< 10ms on production Linux") without real measurement evidence.

Phase 21B eliminates all speculative projections and reports real, measured transaction durations executed against an isolated MySQL 8.0 InnoDB database (`tijum_test`) on the actual host environment. 

Each of the 5 core transactional paths was executed for 25 complete, independent iterations under full relational constraints, row locking, and tax/fee calculations.

---

## 2. Benchmark Methodology

- **Timing Mechanism:** High-resolution monotonic timer (`hrtime(true)` in nanoseconds, converted to milliseconds).
- **Isolation:** Dedicated MySQL database (`tijum_test`) on `127.0.0.1:3306`, completely separate from the development database.
- **Scope of Timing:** Measures the entire database transaction and action lifecycle:
  - Input resolution
  - Exclusive row locking (`SELECT ... FOR UPDATE`)
  - Domain validations and status checks
  - Relational inserts/updates across child tables
  - Commit and transaction finalize
- **Statistical Measures Reported:**
  - **Minimum (Min):** Best-case latency observed
  - **Median (p50):** Typical operational latency
  - **Mean:** Average transaction time across all iterations
  - **95th Percentile (p95):** Latency experienced under upper boundary conditions
  - **Maximum (Max):** Worst-case latency (includes cold-start JIT and query compilation)

---

## 3. Authoritative Benchmark Results

The following data is extracted directly from the verified execution of `DatabaseBenchmarkTest.php` and recorded in `storage/benchmark_results.json`:

| Core Transaction Path | Min (ms) | Median (ms) | Mean (ms) | p95 (ms) | Max (ms) | Sample Size |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`CreateReservation`** | **119.51** | **138.20** | 246.30 | **228.43** | 2,449.41 | 25 |
| **`VerifyCheckoutPayment`** | **115.66** | **134.55** | 224.63 | **197.14** | 2,265.60 | 25 |
| **`ProcessRelocationDecision`** | **13.76** | **16.16** | 17.26 | **27.38** | 28.22 | 25 |
| **`CreatePartnerSettlement`** | **43.40** | **50.55** | 57.32 | **83.69** | 176.95 | 25 |
| **`ReleasePartnerSettlement`** | **25.09** | **32.77** | 36.03 | **47.86** | 101.40 | 25 |

---

## 4. Architectural Analysis of Results

### 4.1 Reservation Creation & Payment Verification (~135ms median)
- **`CreateReservation` (Median: 138.20 ms):** Executes a compound multi-table transaction that:
  1. Checks idempotency via `submission_token`.
  2. Acquires row lock on property and room type availability.
  3. Evaluates pricing policy, duration multipliers, early check-in surcharges, and guest composition rules.
  4. Snapshots 14 immutable property fields (food policy, amenities, name, room type details).
  5. Inserts reservation row and creates initial snapshot records.
- **`VerifyCheckoutPayment` (Median: 134.55 ms):**
  1. Acquires row lock on reservation and payment rows simultaneously.
  2. Reconciles gateway order status with local state.
  3. Confirms payment and updates `captured_at` atomically.
  4. Transitions reservation to `Confirmed` and triggers allocation.
- **Cold-Start Outlier:** The first iteration of `CreateReservation` (2,449 ms) and `VerifyCheckoutPayment` (2,265 ms) reflect one-time PHP 8.4 JIT compilation, Laravel container resolution, and MySQL InnoDB buffer pool warming. The 95th percentile stabilizes at ~228 ms and ~197 ms respectively.

### 4.2 Relocation Decision (~16ms median)
- **`ProcessRelocationDecision` (Median: 16.16 ms):**
  - Ultra-fast transaction duration (p95: 27.38 ms, max: 28.22 ms).
  - Row locking on `reservation_relocations` and parent reservation, updating status to `declined`, and cascading state to customer protection case.

### 4.3 Settlement Processing (~32ms – 50ms median)
- **`CreatePartnerSettlement` (Median: 50.55 ms, p95: 83.69 ms):**
  - Evaluates owner financial profile eligibility.
  - Queries all eligible completed reservations past the 24-hour hold policy.
  - Evaluates Section 393(1) TDS and platform GST withholdings.
  - Generates settlement master row and line items inside InnoDB transaction.
- **`ReleasePartnerSettlement` (Median: 32.77 ms, p95: 47.86 ms):**
  - Locks settlement and payment rows.
  - Performs double-transfer verification check against prior transfers and completed refunds.
  - Records provider transfer with idempotency key.
  - Transitions settlement to `Settled` and records ledger entry.

---

## 5. Elimination of Unsupported Projections

In compliance with Closure 06:
- All hypothetical claims (e.g. "< 5ms on production Linux servers") have been **permanently removed**.
- Production capacity planning must rely strictly on real APM telemetry (such as Laravel Pulse or Datadog) once deployed to target cloud infrastructure.

---

## 6. Closure Conclusion

| Audit Item | Status | Verified Evidence |
| :--- | :--- | :--- |
| **Closure 06: Database Performance Benchmarking** | **VERIFIED COMPLETE** | 125 benchmark transactions measured on MySQL 8.0 InnoDB; output recorded in `storage/benchmark_results.json` |
