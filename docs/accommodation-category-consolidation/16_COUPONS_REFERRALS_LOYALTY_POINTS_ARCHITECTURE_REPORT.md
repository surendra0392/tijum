# TIJUM — Complete Coupon, Referral & Loyalty Points Ecosystem Architecture Report

**Document Reference:** `DOC-ACC-CAT-16`  
**Phase:** Promotions, Referral & Loyalty Points Ecosystem  
**Author:** Platform Content & SEO Specialist (`@content-seo`)  
**Contributors:** Platform Auditor (`@auditor`), Backend & Database Engineer (`@backend-db`), Web UI Engineer (`@web-ui`), Mobile App Engineer (`@mobile-app`), QA & Test Verifier (`@verifier`), Swarm Coordinator (`@coordinator`)  
**Status:** Architecture Complete & Certified ✅  
**Date:** November 14, 2026  
**Audience:** Platform Architects, Engineering Swarm, Product Design, Finance, Operations & Legal Counsel

---

## 1. Executive Summary & Strategic Imperative

Following Swarm Brief #49, TIJUM has implemented a comprehensive, production-grade **Promotions, Referral & Loyalty Ecosystem** purpose-built for student, trainee, and young professional accommodation in South Indian university and IT hubs (Hyderabad, Guntur, Vijayawada, and Visakhapatnam).

The ecosystem unites three promotional pillars under a single mathematical **Central Promotion Engine**:
1. **Targeted Coupon Management:** Multi-tier discounts with platform, property, or split funding, row-locked reservation holds, and category/location targeting.
2. **Referral Programme:** Peer-to-peer referral links (`/r/{code}`) with points-only rewards qualifying strictly upon completed stays.
3. **Loyalty Points System:** Immutable append-only ledger, FEFO point expiration, and rupee-equivalent redemption at checkout.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   TIJUM PROMOTIONS & LOYALTY ENGINE                    │
├────────────────────┬────────────────────┬──────────────────────────────┤
│  COUPON ENGINE     │  REFERRAL ENGINE   │    LOYALTY POINTS ENGINE     │
│  - Fixed / % Off   │  - /r/{code} Links │    - Append-Only Ledger      │
│  - Points Rewards  │  - Dual Rewards    │    - Available / Pending     │
│  - Category/City   │  - Stay-Qualified  │    - 15-Min Checkout Holds   │
│  - 15-Min Hold     │  - Anti-Fraud Gate │    - FEFO Expiry Schedule    │
└────────────────────┴────────────────────┴──────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   CENTRAL PROMOTION PRICING PIPELINE                   │
│   Accommodation Subtotal                                               │
│   (-) Coupon Discount (Capped to Subtotal)                             │
│   (+) Applicable Taxes                                                 │
│   (-) Points Redemption (INR Credit, Capped to Policy Limit)           │
│   (=) Final Payable Total via Razorpay                                 │
│                                                                        │
│   [🛡️ Owner Settlement Protection: Platform Discounts Subsidized]      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Coupon Management Architecture

### 2.1 Offer Types & Discount Logic
The coupon system supports four distinct promotional mechanisms via `CouponOfferType`:
- **Fixed Amount (`fixed_amount`):** Flat rupee discount deducted from accommodation subtotal (e.g. ₹500 off).
- **Percentage Discount (`percentage`):** Proportional discount calculated on subtotal, governed by an optional maximum cap (`max_discount_minor`).
- **Points Reward (`points_reward`):** Grants bonus loyalty points to the customer's wallet upon completed stay rather than deducting upfront cash.
- **Combined (`combined`):** Provides an immediate subtotal discount plus future bonus points upon checkout.

### 2.2 Targeting & Validity Parameters
Coupons can be scoped dynamically to prevent margin leakage:
- **Scope Levels:** Project-wide, City/Locality-specific, Property-specific, or Canonical Category-specific (`hostels-pg`, `homestays`, `co-living`).
- **Time Windows:** Strict validity schedules (`starts_at`, `ends_at`) supporting seasonal, festival (e.g., Sankranti, Diwali), and semester-start campaigns.
- **Minimum Subtotal Thresholds:** Enforces minimum stay value requirements before coupons activate.
- **Usage Limits:** Global redemptions limit (`max_redemptions`) and per-customer usage cap (`max_redemptions_per_customer`).

### 2.3 Funding Models & Owner Settlement Protection
Coupons are categorized under `CouponFundingSource`:
1. **Platform-Funded (`platform`):** 100% subsidized by TIJUM marketing budget. The discount is absorbed as platform promotional expense; property partner settlements are calculated on full base rates without reduction.
2. **Property-Funded (`property`):** Subsidized by participating property owners who opt into promotional discounts to boost occupancy.
3. **Split-Funded (`split`):** Shared cost distribution based on an agreed percentage ratio (e.g., 50% platform / 50% partner).

### 2.4 Checkout Reservation Hold Lifecycle
To prevent coupon over-subscription during simultaneous checkout attempts:
1. Customer inputs code at checkout $\to$ system validates eligibility and places a **15-minute row-level lock** (`coupon_holds`).
2. When Razorpay payment verifies $\to$ hold converts to permanent `coupon_redemptions` record and increments counters.
3. If checkout expires, cancels, or fails $\to$ hold is immediately released, returning the slot to the active pool.

---

## 3. Referral Programme Architecture

### 3.1 Referral Identification & Link Attribution
- **Unique Referral Code:** Each registered customer receives a deterministic, alphanumeric referral code (e.g., `TIJUM-AB1234`) generated upon first access.
- **Short Link Gateway (`/r/{code}`):** Shareable link routes to a dedicated referral landing controller that records attribution in an encrypted 30-day cookie and session, redirecting the prospect to customer registration.
- **Attribution Immutability:** Once a referred customer registers with a referral code, the attribution is permanently stored in `customer_referral_profiles` and cannot be overridden by subsequent referral links.

### 3.2 Dual Reward & Stay-Qualified Model
To eliminate referral fraud and artificial sign-up spam:
- **Points-Only Incentives:** Rewards are granted exclusively in TIJUM Loyalty Points—never direct cash payouts.
- **Stay-Completion Qualification:** Points are **NOT** credited upon account creation or reservation booking. Rewards are placed in `Pending` status and qualify **strictly after the referred customer completes their stay** (operational checkout verified by the platform).
- **Dual Credit:** Upon stay completion:
  - Referrer receives configurable referral points (e.g. 500 points).
  - Referred guest receives completion bonus points (e.g. 250 points).

### 3.3 Anti-Fraud & Self-Referral Prevention
The system enforces automated fraud detection rules:
- **Self-Referral Gate:** Users cannot refer their own phone numbers, email addresses, or existing account IDs.
- **Device & IP Clustering:** Shared browser fingerprints and localized payment method matching trigger administrative fraud review.
- **Review Queue:** Flagged referrals enter `ReferralStatus::UnderReview` for administrative inspection before points can qualify.

---

## 4. Loyalty Points System & Append-Only Wallet

### 4.1 Wallet Balances & Ledger Anatomy
Customer points are maintained in `customer_points_wallets` backed by an immutable `customer_points_ledger`:

| Balance Dimension | Description |
|:---|:---|
| **Available Balance** | Points currently accessible for checkout redemption. |
| **Pending Balance** | Earned points awaiting stay completion (standard booking earnings or referral rewards). |
| **Reserved Balance** | Points temporarily locked during active 15-minute checkout reservation windows. |
| **Redeemed Total** | Cumulative lifetime points spent on stay discounts. |
| **Expired Total** | Points forfeited due to passing expiration time limits. |
| **Reversed Total** | Points revoked due to booking cancellations, refund reversals, or fraud disqualification. |

### 4.2 Append-Only Transaction Ledger
Every point movement creates an immutable ledger entry with:
- Transaction UUID and timestamp
- Reference Type (`Reservation`, `Referral`, `Promotion`, `AdminAdjustment`, `Expiry`) and Reference ID
- Points delta (positive or negative)
- Wallet balance before and after
- Monetary value equivalent in Indian Rupees (INR)
- Administrative audit reason for manual adjustments

### 4.3 Earning, Redemption & FEFO Expiration
- **Earning Mechanism:** Customers earn standard points on verified stays based on net accommodation subtotal (e.g. 2% reward rate).
- **Redemption Conversion:** Points translate to rupee discounts at checkout (e.g. 1 point = ₹1.00).
- **Redemption Boundaries:** Configurable minimum points threshold required to redeem (e.g. min 100 points) and maximum percentage cap of subtotal (e.g. up to 25% of subtotal).
- **First-Earned, First-Out (FEFO) Expiration:** Points carry a validity period (e.g. 180 days). Scheduled background command (`ProcessPointsExpiryCommand`) evaluates point batches by earn date, forfeiting unredeemed expired points with automated customer notifications.

---

## 5. Central Promotion Engine & Mathematical Pipeline

The `CentralPromotionEngine` unifies pricing calculation across Customer Web, Mobile API, and Checkout:

```
  [1] Accommodation Subtotal (Room Night Rate x Nights / Days)
  [-] Coupon Discount: min(CouponAmount, Accommodation Subtotal)
  -------------------------------------------------------------
  [=] Discounted Subtotal
  [+] Applicable GST / Taxes
  -------------------------------------------------------------
  [=] Tax-Inclusive Subtotal
  [-] Loyalty Points Redemption: min(PointsToInr, MaxAllowedPointsDiscount)
  -------------------------------------------------------------
  [=] Final Payable Amount via Razorpay Gateway
```

### 5.1 Owner Settlement Invariance
When calculating partner settlements in `SettlementCalculationService`:
```
  Gross Property Payable = Accommodation Subtotal - PropertyFundedDiscounts
  Net Owner Payout = Gross Property Payable - PlatformCommission + PropertyAddons
```
Platform-funded coupons and points redemptions are explicitly excluded from partner deductions, guaranteeing that property partner earnings are preserved in full.

---

## 6. Customer Web & Mobile Touchpoints

### 6.1 Customer Web Experience (`resources/js/pages/customer/rewards/`)
1. **Rewards Dashboard (`index.tsx`):**
   - Live available balance card with estimated INR conversion value.
   - Pending rewards breakdown with upcoming qualification dates.
   - Expiring points warning alert showing points expiring within 30 days.
   - Quick navigation to Points Ledger, Refer & Earn, and Available Coupons.
2. **Points Wallet & Ledger (`points.tsx`):**
   - Complete transaction history table with filterable badges (Earned, Redeemed, Pending, Expired).
3. **Refer & Earn (`referrals.tsx`):**
   - Prominent copyable referral code and one-click share link (`/r/{code}`).
   - Summary cards: Total Friends Referred, Points Earned, Pending Rewards.
   - Detailed status list of referred friends (Registered, Stay Completed, Points Credited).
4. **Coupons Explorer (`coupons.tsx`):**
   - Grid of active public and user-eligible promotional codes with validity badges and minimum booking conditions.

### 6.2 Checkout Rewards Integration (`resources/js/pages/reservations/create.tsx`)
- **Promotions Input Section:**
  - Coupon entry field with real-time validation and applied discount pill.
  - Points redemption slider/toggle displaying available points, maximum usable points, and rupee savings.
  - Transparent pricing ledger updating in real-time as coupons and points are applied.

### 6.3 Mobile Application (`apps/mobile/app/(customer)/rewards/`)
- Native parity across Rewards Dashboard, Points Ledger, Native Share Sheet for Referrals, and Discover Coupons.
- Mobile checkout integration with coupon verification and point slider.

---

## 7. Administrator Rewards Console (`resources/js/pages/admin/rewards/`)

1. **Executive Overview Dashboard (`index.tsx`):**
   - Total marketing discounts disbursed across active campaigns.
   - Total outstanding points liability (INR equivalent).
   - Referral program ROI metrics (CAC reduction, referral conversion rate).
2. **Campaign Manager (`campaigns/`):**
   - 4-step campaign creation wizard:
     1. Details & Timing (Campaign name, dates, promotional banner).
     2. Offer Structure (Fixed, Percentage, Points, Combined).
     3. Scope & Restrictions (City, Category, Property, Min Subtotal, Usage Limits).
     4. Funding & Coupon Codes (Platform vs Partner funding, code generator).
3. **Referral Manager (`referrals/`):**
   - Audit list of all customer referral attributions.
   - Anti-fraud alert queue with manual approve/disqualify capabilities.
4. **Loyalty Points Settings & Manual Adjustments (`points/`):**
   - Configure global earning rates, redemption ratios, and expiration windows.
   - Secure manual credit/debit adjustment modal requiring mandatory administrative audit reasoning.

---

## 8. Master Quality Verification & Regulatory Compliance

### 8.1 Legal & Consumer Protection Alignment
- **Non-Cash Status:** Terms of Service explicitly establish that loyalty points have no independent cash value, cannot be withdrawn to bank accounts, and do not constitute virtual digital assets (VDA).
- **Truth in Advertising:** Coupon terms, expiration dates, and minimum spend conditions are prominently disclosed before reservation submission.
- **Data Privacy:** Referral invitations are sent strictly by users via native sharing; TIJUM does not harvest non-user contact lists.

### 8.2 Architectural Certification
The complete Coupon, Referral & Loyalty Points Ecosystem satisfies all architectural invariants:
- Zero negative balance risk via row-level locking.
- 15-minute checkout hold idempotency with automatic cleanup.
- Partner settlement protection with zero platform discount deductions.
- Strict stay-completion qualification for referral rewards.

**The Promotions & Loyalty Ecosystem is certified, documented, and ready for deployment.**
