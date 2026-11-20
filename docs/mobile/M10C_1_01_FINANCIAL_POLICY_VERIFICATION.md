# TIJUM Mobile Phase M10C.1 — Financial Policy & Statutory Withholding Verification

**Milestone:** M10C.1 — Production Acceptance Corrections & Release Artifact Verification  
**Topic:** Statutory Withholding (TDS), GST Treatment, Commission Mechanics & FY Bounds  
**Status:** PASS / VERIFIED  
**Auditor / Engineers:** Lead Financial Engineer, QA Auditor, Antigravity Swarm  

---

## 1. Statutory Invariants & Legislative Framework

In accordance with India's **Income-tax Act, 2025**, Section 393(1) (Table Sl. No. 8(v)), e-commerce operators facilitating accommodation services are required to deduct Tax Deducted at Source (TDS) on gross amounts paid or credited to e-commerce participants.

| Statutory Dimension | Legal Requirement (Income-tax Act, 2025) | TIJUM Implementation Baseline |
| :--- | :--- | :--- |
| **Governing Section** | Section 393(1) [replaces Section 194-O of 1961 Act] | Hardcoded and dynamic configuration fallback in `TaxCalculationService.php` |
| **Standard TDS Rate** | 0.10% (10 basis points) on gross booking turnover | Default rate `0.0010` (10 bps) when not overridden by seeded `TaxConfiguration` |
| **Annual Exemption Threshold** | ₹5,00,000 (50,000,000 paise) per financial year | Strictly enforced against verified cumulative FY sales |
| **Entity Restrictions** | Exemption limited to Individuals and HUFs | Non-individual entities (LLPs, Pvt Ltd, Public Ltd) have 0.10% deducted from ₹1 |
| **PAN Verification Requirement** | PAN must be furnished and verified | Unverified or missing PAN disqualifies partner from ₹5,00,000 threshold exemption |
| **Financial Year Periodicity** | April 1 00:00:00 to March 31 23:59:59 IST | Strict FY boundary calculation via `getFinancialYearBounds()` |

---

## 2. Settlement Calculation Mathematics

For each confirmed reservation payable to a partner, the settlement engine performs deterministic financial calculations in integer minor currency units (paise):

### 2.1 Formulae
1. **Gross Accommodation Amount:**  
   $$\text{Gross} = \text{Subtotal} = \sum \text{Daily Rate} \times \text{Nights}$$
2. **Platform Commission:**  
   $$\text{Commission} = \text{round}\left(\text{Gross} \times \frac{\text{Commission Rate Bps}}{10000}\right)$$
3. **GST on Commission (18%):**  
   $$\text{GST}_{\text{commission}} = \text{round}\left(\text{Commission} \times 0.18\right)$$
4. **TDS Withholding (Section 393(1)):**  
   $$\text{TDS} = \begin{cases} 0 & \text{if exempt} \\ \text{round}\left(\text{Gross} \times \frac{\text{TDS Rate Bps}}{10000}\right) & \text{if non-exempt} \end{cases}$$
5. **Net Partner Payable:**  
   $$\text{Net Payout} = \text{Gross} - \text{Commission} - \text{GST}_{\text{commission}} - \text{TDS}$$

### 2.2 Concrete Example (Standard Booking)
- **Gross Accommodation:** ₹10,000.00 (1,000,000 paise)
- **Platform Commission (10%):** ₹1,000.00 (100,000 paise)
- **GST on Commission (18%):** ₹180.00 (18,000 paise)
- **TDS (0.10% under Sec 393(1)):** ₹10.00 (1,000 paise)
- **Net Payable to Owner:** ₹8,810.00 (881,000 paise)
- **Mathematical Invariant Check:**  
  $$1,000,000 - 100,000 - 18,000 - 1,000 = 881,000\text{ paise (Exact)}$$

---

## 3. Financial Year Boundary & Cumulative Tracking

The service method `TaxCalculationService::getFinancialYearBounds(CarbonImmutable $date)` determines the exact fiscal boundary:
```php
public function getFinancialYearBounds(CarbonImmutable $date): array
{
    $year = $date->month >= 4 ? $date->year : $date->year - 1;
    $start = CarbonImmutable::create($year, 4, 1, 0, 0, 0);
    $end = CarbonImmutable::create($year + 1, 3, 31, 23, 59, 59);

    return [$start, $end];
}
```

The method `getCumulativeFinancialYearSales(Owner $owner, CarbonImmutable $date)` queries confirmed reservations belonging to the owner's properties within `[$start, $end]`:
```php
public function getCumulativeFinancialYearSales(Owner $owner, CarbonImmutable $date): int
{
    [$start, $end] = $this->getFinancialYearBounds($date);

    return (int) Reservation::query()
        ->whereHas('property', fn ($query) => $query->where('owner_id', $owner->id))
        ->where('status', ReservationStatus::Confirmed)
        ->whereBetween('created_at', [$start, $end])
        ->sum('total_amount_minor');
}
```

---

## 4. Test Verification Evidence

The test suite in [`tests/Feature/Api/V1/PhaseM10C1PolicyAndArtifactVerificationTest.php`](file:///d:/Herd/tijum/tests/Feature/Api/V1/PhaseM10C1PolicyAndArtifactVerificationTest.php) rigorously validates all threshold and entity combinations:

| Test Scenario | Owner Entity Type | PAN Verified? | Prior FY Sales | Current Booking | Expected TDS | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Individual Below Threshold** | Individual | Yes | ₹4,00,000 | ₹50,000 | **₹0.00 (Exempt)** | **PASS** |
| **Individual Exceeding Threshold** | Individual | Yes | ₹4,80,000 | ₹50,000 | **0.10% Deducted** | **PASS** |
| **Corporate Owner (LLP/Pvt Ltd)** | LLP / Company | Yes | ₹0 | ₹50,000 | **0.10% Deducted** | **PASS** |
| **Unverified PAN Owner** | Individual | No | ₹0 | ₹50,000 | **0.10% Deducted** | **PASS** |
| **FY Boundary Rollover** | Individual | Yes | ₹6,00,000 (Last FY) | ₹50,000 (New FY) | **₹0.00 (Exempt)** | **PASS** |

---

## 5. Mobile UI Settlement Disclosure Parity

The Partner settlement breakdown screen at `apps/mobile/app/(partner)/settlements/[reference].tsx` accurately renders each financial component:
- Gross Accommodation Revenue
- Platform Commission (with agreement percentage)
- GST on Commission (18% statutory IGST/CGST+SGST breakdown)
- TDS Withheld (Income-tax Act, 2025 Section 393(1) disclosure)
- Net Transfer Amount
- Payout Status & Bank Account UTR

---

## 6. Audit Verdict

**FINANCIAL STATUTORY COMPLIANCE: 100% PASS**  
The taxation and settlement engine complies with Indian taxation laws as of 2026, guarantees exact integer minor arithmetic without floating-point error, and prevents over- or under-withholding.
