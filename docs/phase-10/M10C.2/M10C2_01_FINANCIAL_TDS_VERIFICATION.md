# TIJUM Phase M10C.2 — Financial & TDS Verification Report

## 1. Statutory Context

Under Section 393(1) of the Income-tax Act, 2025 (formerly Section 194-O of the Income-tax Act, 1961), an e-commerce operator facilitating accommodation bookings must deduct income-tax at source (TDS) at the rate of 0.10% (10 basis points) of the gross booking amount at the time of credit of such sum to the account of the participant or at the time of payment thereof, whichever is earlier.

The proviso to Section 393(1) exempts an individual or Hindu Undivided Family (HUF) whose cumulative gross sales facilitated through the digital platform during the financial year does not exceed ₹5,00,000 (₹50,00,000 minor paise), provided the individual or HUF has furnished a valid, verified Permanent Account Number (PAN).

---

## 2. Hardening Implemented in `TaxCalculationService.php`

### 2.1 Business Constitution & HUF Support
The business constitution check has been expanded to support canonical values:
- `individual`
- `proprietorship`
- `sole proprietorship`
- `huf` (Hindu Undivided Family)

All comparisons are performed using case-insensitive normalization (`strtolower(trim((string) $profile?->business_constitution))`). In the partner onboarding flow, family homestays and individual proprietorships are assigned either `individual` or `proprietorship`, both of which qualify for the Section 393(1) proviso.

### 2.2 Removal of Blanket Exemption Bypass
Previously, `$isExemptFromConfig = $tdsConfig instanceof TaxConfiguration && $tdsConfig->is_exempt;` allowed an unapproved or blanket exemption without verifying PAN validity or entity constitution.

In M10C.2, an order-level exemption through `TaxConfiguration` is strictly conditioned:
```php
$isOrderExempt = $tdsConfig instanceof TaxConfiguration
    && $tdsConfig->is_exempt
    && $tdsConfig->is_approved
    && ! blank($tdsConfig->ca_approval_reference)
    && $hasVerifiedPan;
```
If a partner does not possess a verified PAN (`pan_verified_at !== null && ! blank(pan_number)`), neither statutory exemption nor order-level exemption is granted, and the default 0.10% TDS is applied.

### 2.3 Turnover Date Basis: `confirmed_at` vs `check_in_date`
Because tax withholding attaches at the time of payment capture / credit, cumulative financial year turnover is now evaluated based on `confirmed_at` (the payment confirmation timestamp), falling back to `created_at` for legacy records:
- **Advance Bookings:** A booking confirmed in March for a stay occurring in May is recognized in the March financial year.
- **Cancelled Bookings:** Cancelled reservations (`ReservationStatus::Cancelled`) are strictly excluded from gross turnover calculations.
- **Processed Refunds:** Legitimate service guarantee refunds (`ReservationRefund` with `RefundStatus::Processed`) are deducted from the partner's gross turnover to prevent turnover inflation.

```php
$reservationQuery = Reservation::query()
    ->whereIn('property_id', $propertyIds)
    ->where('status', ReservationStatus::Confirmed)
    ->where(function ($query) use ($fyStart, $fyEnd): void {
        $query->whereBetween('confirmed_at', [$fyStart->toDateTimeString(), $fyEnd->toDateTimeString()])
            ->orWhere(function ($q) use ($fyStart, $fyEnd): void {
                $q->whereNull('confirmed_at')
                    ->whereBetween('created_at', [$fyStart->toDateTimeString(), $fyEnd->toDateTimeString()]);
            });
    });

$grossSales = (int) $reservationQuery->sum('total_amount_minor');

$reservationIds = (clone $reservationQuery)->pluck('id');
$processedRefunds = 0;
if ($reservationIds->isNotEmpty()) {
    $processedRefunds = (int) ReservationRefund::query()
        ->whereIn('reservation_id', $reservationIds)
        ->where('status', RefundStatus::Processed)
        ->sum('amount_minor');
}

return max(0, $grossSales - $processedRefunds);
```

---

## 3. Test Verification Matrix

All scenarios were verified via automated tests in `tests/Feature/Api/V1/PhaseM10C2FinancialAndSlaTest.php`:

| Test Scenario | Profile Details | Turnover Condition | Expected TDS | Result |
|---|---|---|---|---|
| **Eligible Individual** | `individual`, Verified PAN | Projected FY sales ₹40,000 <= ₹5,00,000 | 0% (0 bps, ₹0) | **PASS** |
| **Eligible Proprietorship** | `proprietorship`, Verified PAN | Projected FY sales ₹40,000 <= ₹5,00,000 | 0% (0 bps, ₹0) | **PASS** |
| **Eligible HUF** | `huf`, Verified PAN | Projected FY sales ₹40,000 <= ₹5,00,000 | 0% (0 bps, ₹0) | **PASS** |
| **Exceeded Turnover Individual** | `individual`, Verified PAN | Historical ₹4,80,000 + Current ₹30,000 = ₹5,10,000 | 0.10% (10 bps, ₹30) | **PASS** |
| **Boundary Limit (At Limit)** | `individual`, Verified PAN | Exactly ₹5,00,000 (50,000,000 paise) | 0% (0 bps, ₹0) | **PASS** |
| **Boundary Limit (Exceeded)** | `individual`, Verified PAN | Exactly ₹5,00,001 (50,000,100 paise) | 0.10% (10 bps, ₹500) | **PASS** |
| **Non-Individual Entity** | `private_limited`, Verified PAN | Single booking ₹10,000 | 0.10% (10 bps, ₹10) | **PASS** |
| **Unverified PAN** | `individual`, Missing PAN verification | Single booking ₹10,000 | 0.10% (10 bps, ₹10) | **PASS** |
| **Config `is_exempt` without CA ref** | `private_limited` or Unverified PAN | `is_exempt = true`, `ca_ref = null` | 0.10% (10 bps, ₹10) | **PASS** |
| **Config `is_exempt` with CA ref** | `private_limited`, Verified PAN | `is_exempt = true`, `ca_ref = 'CA-2026'` | 0% (0 bps, ₹0) | **PASS** |
| **Prior FY Credit Isolation** | Confirmed March 2026 for stay May 2026 | Evaluated in FY 2026-27 | Excluded from FY27 | **PASS** |
| **Cancelled Booking Exclusion** | Cancelled reservation in FY 2026-27 | Excluded from FY sales | ₹0 turnover | **PASS** |
| **Processed Refund Deduction** | Confirmed ₹3,00,000 with ₹50,000 refund | Net turnover = ₹2,50,000 | ₹2,50,000 | **PASS** |
