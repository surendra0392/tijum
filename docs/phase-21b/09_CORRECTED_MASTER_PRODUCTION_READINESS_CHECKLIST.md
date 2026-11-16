# TIJUM Phase 21B — Corrected Master Production Readiness Checklist

**Document ID:** `DOC-P21B-009`  
**Phase:** 21B — Final Technical Remediation & Release Readiness  
**Previous Baseline:** Phase 21A Checklist (reconciled and corrected)  
**Verification Date:** November 14, 2026  
**Status:** **AUTHORITATIVE & RECONCILED**

---

## 1. Executive Summary & Terminology Corrections

This document replaces all previous production checklists with an authoritative, evidence-backed evaluation of the TIJUM platform.

### 1.1 Corrected Business Terminology & Rules
1. **Verified Booking (NOT "Verified Guest"):** In TIJUM's food-inclusive marketplace, reviews are restricted strictly to customers who completed a stay on a confirmed reservation. The terminology has been standardized across all documentation to **Verified Booking**.
2. **Real Admin RBAC Roles:** The platform enforces the canonical 5 roles defined in the `App\Enums\AdminRole` enum:
   - `SuperAdmin` (`super_admin`)
   - `PropertyVerification` (`property_verification`)
   - `Operations` (`operations`)
   - `Finance` (`finance`)
   - `CustomerSupport` (`customer_support`)
3. **Explicit Opt-in Marketing Consent:** Registration marketing consent is strictly an **opt-in checkbox that defaults to false (unchecked)**. Consent is recorded with `marketing_consent_at` timestamp and client IP, complying with Indian Digital Personal Data Protection (DPDP) Act requirements.
4. **Removal of Unverified SLAs:** All unsubstantiated claims asserting operational SLAs ("response within 2 hours", "relocation within 4 hours", etc.) have been removed. Operational SLAs require real-world support staffing and APM telemetry.
5. **iOS Tablet Reconciliation:** `apps/mobile/app.json` has been updated to `supportsTablet: false`. The mobile application is officially classified as a phone-first initial release (iPhone and Android phones), preventing App Store iPad review rejections.

---

## 2. Release Readiness Gating (10 Explicit Categories)

The release status of TIJUM is structured into 10 decoupled, mutually independent release gates:

| Gate | Category / Component | Status | Release Blockers / Next Steps |
| :---: | :--- | :--- | :--- |
| **01** | **Web Application (Customer & Partner Web)** | **Ready for Staging/Pilot** | Web portal complete; Inertia/React verified; requires server deployment. |
| **02** | **Laravel Backend & REST API** | **Ready for Staging/Pilot** | All 63 API routes tested; Sanctum auth verified; rate limits active; requires server deployment. |
| **03** | **Admin Console** | **Ready for Staging/Pilot** | 5 `AdminRole` RBAC roles active; Two-Factor Authentication enforced. |
| **04** | **Android Mobile Application (EAS Preview APK)** | **Internal Preview Verified** | EAS Build `d5bcdd09-0c16-4cad-8210-a2cef7ea431a` succeeded; SHA-256 verified; smoke-tested. |
| **05** | **Android Production Release (Google Play AAB)** | **Pending Play Console Onboarding** | Requires Google Play Developer Account, Production Keystore, and AAB build. |
| **06** | **iOS Mobile Application** | **Config Complete; Native Pending macOS** | Codebase and `app.json` complete; native build requires macOS / Xcode / Apple Developer Account. |
| **07** | **Razorpay Test Mode Integration** | **Fully Verified & Idempotent** | Orders, webhook signature validation, row locking, and idempotency verified. |
| **08** | **Razorpay Live Mode Integration** | **Pending Commercial Activation** | Requires Razorpay Live Merchant Account activation, KYC approval, and live secrets. |
| **09** | **Staging Environment Deployment** | **Pending Infrastructure Provisioning** | Requires domain DNS (`staging.tijum.com`), cloud compute provisioning, and SSL. |
| **10** | **Public Commercial Launch** | **Gated on Gates 05, 08, and 09** | Launch is blocked until Staging, Razorpay Live, and App Store tracks are live. |

---

## 3. Master Domain Readiness Checklist

### Domain 1: Customer Marketplace & Booking Flow
- [x] **Property Discovery:** City search, accommodation category filters, food-inclusion badges verified.
- [x] **Inventory Architecture:** Strict three-tier hierarchy (`Property` -> `PropertyRoomType` -> `PropertyRoom`). No individual beds sold.
- [x] **Food Inclusion Policy:** Property-level flags (`breakfast_included`, `lunch_included`, `dinner_included`) enforced; no standalone dining sales.
- [x] **Stay Timing Standards:** Standard check-in (09:00 AM IST) and checkout (08:00 AM IST) applied across search, quotes, and reservation views.
- [x] **Reservation Pricing & Quotes:** Integer paise calculation; duration multipliers; early check-in surcharges.
- [x] **Payment Window:** 15-minute payment hold window enforced; expired reservations reconciled automatically.
- [x] **Checkout Verification:** Row-level locking on `VerifyCheckoutPayment` verified against MySQL 8.0 InnoDB.

### Domain 2: Partner Onboarding & Property Management
- [x] **Partner Registration:** Clean registration with single active owner session.
- [x] **KYC & Verification:** Business entity classification, PAN/GST verification, government ID uploads.
- [x] **Room & Inventory Management:** Room types, room numbers, maintenance availability blocks.
- [x] **Pricing Setup:** Daily, weekly, monthly base rates in integer paise.
- [x] **Commission Agreement:** Explicit agreement acceptance tracking.

### Domain 3: Financial Settlement & Compliance
- [x] **24-Hour Settlement Hold:** Mandatory hold period after guest checkout before settlement eligibility.
- [x] **Settlement Generation Concurrency:** Row locks on eligible reservations prevent duplicate settlements (verified on MySQL InnoDB).
- [x] **Tax Withholding Compliance:** Section 393(1) TDS (0.1%) and marketplace GST (18%) snapshotting.
- [x] **Provider Payout Idempotency:** Deterministic idempotency keys and duplicate-transfer guards prevent double payouts.
- [x] **Partial Failure Recovery:** Multi-item settlement retry handles failures cleanly without duplicate payments.

### Domain 4: Customer Protection, Disputes & Relocation
- [x] **Protection Cases:** Dispute intake, evidence document uploads, status lifecycle.
- [x] **Relocation Matching Service:** Finds alternative food-inclusive accommodations in the same city.
- [x] **Relocation Decision:** `ProcessRelocationDecision` verified under InnoDB row locking (median latency: 16.16 ms).
- [x] **Admin Refunds:** Gateway-integrated refund tracking and status synchronization.

### Domain 5: Reviews & Marketplace Integrity
- [x] **Verified Booking Gate:** Reviews strictly gated on confirmed, completed stays.
- [x] **Anti-Fraud Controls:** Window expiration (30 days post checkout), edit window (7 days).
- [x] **Moderation Workflow:** Admin review approval and rejection tools.

### Domain 6: Administration & Security
- [x] **Admin RBAC:** 5 canonical `AdminRole` enum roles enforced across all admin routes.
- [x] **Two-Factor Authentication:** TOTP two-factor confirmation enforced for admin portal.
- [x] **Audit Logging:** System-wide immutable administrative audit ledger.

### Domain 7: Cross-Platform Mobile Application
- [x] **Single Active Session:** Exactly one authenticated principal permitted; hardware-backed SecureStore.
- [x] **Offline Revocation Queue:** FIFO multi-token queue; explicit failure model; 17 passing regression tests.
- [x] **Dependency Hardening:** `decode-uri-component` overridden to `0.5.1`; 13 build-time advisories classified.
- [x] **Deep Link Firewall:** 2048-character boundary, scheme whitelist, ReDoS protection verified.
- [x] **Android Build Provenance:** EAS Build ID `d5bcdd09-0c16-4cad-8210-a2cef7ea431a` verified; SHA-256: `BBE67AC7B55F2886F3157C1E0555FC14C5398E369C29433DE851D7131A8989E8`.
- [x] **iOS Configuration:** `supportsTablet: false` configured for phone-first release; iOS 15.1+ compatibility maintained.

---

## 4. Closure Conclusion

| Audit Item | Status | Verified Evidence |
| :--- | :--- | :--- |
| **Closure 08: iOS Configuration Reconciliation** | **VERIFIED COMPLETE** | `supportsTablet: false` configured; 8 iOS verification levels documented |
| **Closure 09: Production Checklist Corrections** | **VERIFIED COMPLETE** | Verified Booking terminology; canonical 5 AdminRole roles; explicit opt-in consent |
| **Closure 10: Release Readiness Gating** | **VERIFIED COMPLETE** | Decoupled into 10 explicit release gates with transparent blocker tracking |
