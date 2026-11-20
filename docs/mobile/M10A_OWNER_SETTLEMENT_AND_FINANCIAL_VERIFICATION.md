# TIJUM Mobile Phase M10A: Owner Settlement & Financial Verification Report

**Document Reference:** `docs/mobile/M10A_OWNER_SETTLEMENT_AND_FINANCIAL_VERIFICATION.md`  
**Application Scope:** `(partner)/settlements/*`, `OwnerSettlementController`, and Financial State  
**Date:** November 20, 2026  
**Status:** **ACTIVE, COMPLIANT & CERTIFIED**

---

## 1. Financial Settlement Architecture

The TIJUM platform provides accommodation hosts with transparent financial settlements, payouts tracking, and commission calculations directly on mobile devices.

### 1.1 Integer Paise Representation
All monetary quantities in the settlement domain are stored and processed as integer paise (`amount_minor`):
- `gross_amount_minor`: Total guest booking value.
- `platform_fee_minor`: Platform service commission.
- `net_payout_minor`: Net amount transferred to host bank account.
- `tax_withheld_minor`: Applicable tax deductions (TDS).

On the mobile client, all values are safely divided by 100 for display in Indian Rupees (₹) with formatted thousands separators.

---

## 2. Partner Settlements Hub

As implemented in `apps/mobile/app/(partner)/settlements/index.tsx`:
- **Financial Summary Metrics:**
  * **Total Earnings:** Cumulative gross revenue earned across completed stays.
  * **Processed Payouts:** Funds successfully disbursed to host bank accounts.
  * **Pending Payouts:** Unsettled amounts queued for the next settlement cycle.
- **Payout Batches List:**
  * Settlement reference number (e.g. `SET-2026-XXXX`).
  * Bank account destination mask (e.g. `HDFC Bank •••• 4021`).
  * Settlement lifecycle status: `Processing`, `Paid`, `Failed`.
  * Date stamps: Generation date and disbursement date.
  * Line item count of included reservations.

---

## 3. Financial Endpoints & Contract

- `GET /api/v1/owner/settlements`
  - Returns paginated list of settlement payout records.
  - Handled via `OwnerSettlementController@index`.
  - Mapped to `OwnerApi.getSettlements()`.

- `GET /api/v1/owner/settlements/summary`
  - Returns aggregate financial totals (gross earnings, net payouts, pending balance).
  - Handled via `OwnerSettlementController@summary`.
  - Mapped to `OwnerApi.getFinancialSummary()`.

---

## 4. Financial Integrity Guarantees

1. **Immutable History:** Disbursed settlement records are read-only and immutable.
2. **Reconciliation Traceability:** Every payout references underlying reservation IDs, providing end-to-end auditability.
3. **No Client Calculations:** Financial aggregates are computed exclusively on the backend; the mobile app functions as a secure, high-fidelity visualizer.
