# TIJUM Mobile Phase M10A.1 — Financial Profile, Commission Agreements & Settlements Report

**Document Reference:** `docs/mobile/M10A1_OWNER_FINANCIAL_PROFILE_SETTLEMENT_REPORT.md`  
**Milestone:** M10A.1 (Financial KYC, Commission Agreements & Payouts)  
**Target Screens:** `financial-profile/index.tsx`, `financial-profile/agreements.tsx`, `settlements/[reference].tsx`  
**Date:** November 20, 2026  
**Status:** **COMPLETE & VERIFIED**

---

## 1. Executive Summary

Milestone M10A.1 completed the partner financial and settlement experience on mobile, addressing critical banking KYC and payout verification requirements established in Phase 15. Partners can now manage their legal business profile, review contractual commission agreements, electronically accept terms, and inspect itemized settlement statements directly from their devices.

---

## 2. Financial Profile & Banking KYC (`financial-profile/index.tsx`)

The financial profile screen provides host legal identity and banking configuration:

### 2.1 Legal Business Constitution
Partners specify their business entity structure from standard corporate classifications:
- `individual`: Individual host or sole proprietorship.
- `partnership`: Registered partnership firm.
- `llp`: Limited Liability Partnership.
- `private_limited`: Private Limited Company.
- `public_limited`: Public Limited Company.
- `trust_society`: Registered charitable trust or non-profit society.

### 2.2 Tax Identity (PAN & GSTIN)
- **Income Tax PAN:** Enforces standard Indian 10-character PAN validation (`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`).
- **GSTIN:** Optional for small exempt hosts; mandatory for registered businesses (`15-character alphanumeric format`).

### 2.3 Settlement Bank Account & Masking
To prevent credential theft and protect financial data:
- The full bank account number is entered during update and encrypted at rest.
- The UI displays a masked representation: `•••• •••• 1234` (only last 4 digits visible).
- Displays Bank Name (e.g. HDFC Bank, State Bank of India) and valid 11-character NEFT/RTGS IFSC code.

### 2.4 Settlement Eligibility & Status
The screen evaluates host readiness and displays live status badges:
- `VERIFIED` / `APPROVED` (Green): Banking details authenticated; automatic weekly settlement payouts active.
- `UNDER REVIEW` / `PENDING` (Blue): Submitted for administrative KYC verification.
- `ACTION REQUIRED` / `REJECTED` (Red): Displays explicit rejection bullet points (e.g., "IFSC does not match bank branch", "PAN name mismatch with bank account name").

---

## 3. Contractual Commission Agreements (`financial-profile/agreements.tsx`)

In compliance with Phase 15 contractual compliance standards:
- **Agreements Listing:** Queries `OwnerApi.getCommissionAgreements()` mapped to `GET /api/v1/owner/commission-agreements`.
- **Contract Terms Display:**
  - Commission rate percentage (e.g., `15.00%`).
  - Base type: Gross Booking Value.
  - GST treatment: Exclusive of GST (18% GST applies to platform fee).
  - Terms version (e.g., `TIJUM-HOST-AGR-V2`).
  - Effective dates and signature timestamps.
- **Electronic Acceptance:** Unaccepted agreements display a prominent "Review & Sign Agreement" CTA. Tapping opens a confirmation dialog stating legal terms; confirming calls `POST /api/v1/owner/commission-agreements/{id}/accept`, which records the host ID, IP address, and timestamp, instantly transitioning the agreement to `ACTIVE`.

---

## 4. Itemized Settlement Statements (`settlements/[reference].tsx`)

Previous releases only showed total payout numbers. Phase M10A.1 delivers an itemized settlement statement screen:

### 4.1 Financial Computation Breakdown
For every settlement period (weekly batch):
$$\text{Gross Booking Value}$$
$$- \quad \text{TIJUM Platform Commission (e.g. 15\%)}$$
$$- \quad \text{GST on Commission (18\% on Commission)}$$
$$- \quad \text{TDS / Statutory Deduction (Section 194-O, 1\% on Gross)}$$
$$- \quad \text{Refund / Relocation Adjustments (if any)}$$
$$= \quad \mathbf{\text{Net Settlement Payout}}$$

### 4.2 Banking Transfer & UTR Tracking
- Displays Provider Transfer ID / Bank UTR number (e.g., `UTR202611200049281`).
- Status chips: `SETTLED` (Green), `PROCESSING` (Yellow), `FAILED` (Red).

### 4.3 Associated Reservation Line Items
Every settlement statement lists the individual customer reservations included in the payout:
- Guest stay dates (e.g. "Nov 12, 2026 – Nov 18, 2026").
- Booking reference and property name.
- Individual gross booking amount, platform commission deduction, TDS deduction, and net payable.
