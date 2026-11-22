# TIJUM Mobile — UX & Visual Redesign Report

**Scope:** Design-system consolidation, screen-level UI quality, accessibility, visual evidence, and responsive behavior of the Expo React Native app at `apps/mobile/`.  
**Baseline:** Branch `feat/mobile-production-hardening-redesign` under review on GitHub PR #2 ([surendra0392/tijum/pull/2](https://github.com/surendra0392/tijum/pull/2)).  
**Date:** 2026-11-23  

---

## 1. Design System Consolidation (Verified State)

The app utilizes a **single, consolidated design token architecture** across colors, typography, spacing, and surface elevations. No competing or forked design systems exist.

### 1.1 Brand Palette (`src/theme/tokens.ts` & `src/theme/colors.ts`)

- **Primary:** Deep plum `#442F41` (`deepPlum`), with `plumDark #2E1E2C` and `plumLight #5E425A`.
- **Accent:** Coral `#FF7A67` (`coralPrimary`), with `coralDark #B83B2A` used for accessible text pairings and `coralLight #FF8A73`.
- **Surfaces:** Warm cream `#FFF4EE` canvas, peach tints, `surfaceSubtle #F6F2EE`, `neutralSurface #E6E0DB`, `borderStrong #D6CBC2`.
- **Text:** `inkPrimary #261824`, `inkSecondary #5E4B5B`, `mutedLavenderText #6D5166` — strictly maintaining high contrast on light surfaces.
- **Semantic Status Colors:** Explicitly defined WCAG-AA foreground/background pairs:
  - Food-Included Emerald: `#ECFDF5` background, `#059669` foreground (strictly reserved for positive meal inclusions per brand rules).
  - Amber (Pending / Warning): `#FFFBEB` background, `#D97706` foreground.
  - Rose (Error / Cancelled / Urgent): `#FFF1F2` background, `#E11D48` foreground.
  - Info / Secondary: `#F3F4F6` background, `#374151` foreground.

### 1.2 Typography & Spacing

- Fonts: Montserrat (headings and accents: 600, 700, 800) and Nunito (body text: 400, 600, 700), loaded via `expo-font`.
- Spacing: Geometric scale based on 4px grid (`xs: 4`, `sm: 8`, `md: 12`, `base: 16`, `lg: 20`, `xl: 24`, `xxl: 32`).
- Touch Hit Targets: Minimum 44x44 points for all buttons and interactive icon targets.

---

## 2. Hardened Production Components

| Component | Architecture & Purpose | Hardening Applied |
|---|---|---|
| `ErrorBoundary` | Root crash containment for unexpected React runtime errors | Stripped raw stack traces and exception messages from end-user UI. Generates unique privacy-safe diagnostic references (`ERR-<timestamp>-<rand>`), presents sanitized recovery copy, reload CTA, and one-tap clipboard copy for customer support. |
| `ExceptionalState` | Standardized empty, loading, error, and offline UI | Replaced raw unstyled text and missing error screens in Property Detail, Customer Bookings, and Partner Settlements with animated illustrations, clear user action buttons, and retry affordances. |
| `Skeleton` / `SkeletonCard` | Content-shaped animated shimmer loading placeholders | Integrated into Explore screen, Booking Detail, and Wishlist to prevent layout shift during asynchronous data hydration. |
| `StayTimingBadge` | Check-in / check-out policy presentation | Standardized display of check-in (09:00 AM) and checkout (08:00 AM) policies with meal buffer disclosures. |
| `CategoryBadge` | Canonical accommodation category indicator | Strictly enforces the 3 canonical categories: `hostels-pg`, `homestays`, `co-living`. |
| `BrandLogo` | Vector-accurate TIJUM mark | Supports light and dark surface variants with correct aspect ratio preservation. |

---

## 3. Screen-by-Screen Visual Quality & Audit Results

### 3.1 Onboarding & First Launch (`app/index.tsx`)
- High-resolution photography carousel with transparent meal disclosure copy ("Verified daily, weekly & monthly stays with transparent meal inclusions").
- Skip button (`testID="onboarding-skip-btn"`) routes directly to guest explore.
- *Visual QA Evidence:* Verified in `01-onboarding.png` (226 KB).

### 3.2 Authentication (`(auth)/*`)
- **Customer Sign In & Register:** Clean segmented role switch, phone or email login support, password visibility toggle, and instant error feedback.
- **Partner Sign In & Register:** Distinct partner badge, 10-field partner property onboarding form with canonical category selection.
- *Visual QA Evidence:* Verified in `02-customer-login.png`, `03-customer-register.png`, `04-owner-login.png`, and `05-owner-register.png`.

### 3.3 Explore & Property Discovery (`(customer)/explore/index.tsx`)
- Canonical category pills (`All Stays`, `Hostels/PG`, `Homestays`, `Co-Living`) with active highlight states.
- Search input (`testID="explore-search-input"`) with instant query clearing (`testID="explore-search-clear-btn"`).
- Advanced filter modal sheet with AC, meal inclusions, sharing type, and price range filters.
- *Visual QA Evidence:* Verified in `06-explore-stays.png`.

### 3.4 Property Details & Room Selection (`explore/property/[slug].tsx`)
- High-res image gallery modal with counter (`1 of N`).
- Comprehensive stay timing badges, food provided / self-catering disclosure, and amenities check-grid.
- Room category cards with live inventory counters ("N rooms left" or "Currently full").
- Sticky bottom booking bar showing starting price and "Book Stay" CTA (`testID="property-book-stay-btn"`).
- Empty/Error handling: Fully wrapped in `ExceptionalState` with retry button.

### 3.5 Customer Booking & Hold Management (`bookings/[reference].tsx`)
- Urgent payment hold countdown banner ("Action Required: Pay to Confirm") with live MM:SS countdown.
- Clear itemized price breakdown (Daily/Monthly rate, security deposit, taxes, and applied coupons).
- Status refresh button and "Pay with Razorpay" button (`testID="booking-pay-btn"`).
- Cancellation option (`testID="booking-cancel-btn"`) with refund progress tracking.
- Post-stay review prompt modal with 4 canonical subcategories (cleanliness, food quality, host communication, value).
- *Visual QA Evidence:* Verified in `07-customer-bookings.png`.

### 3.6 Support Hub & Protection Cases (`support/index.tsx`)
- Prominent Customer Protection Guarantee banner.
- Direct contact touchpoints (Official Support Helpline + WhatsApp Support).
- Protection SLAs documentation modal.
- "Raise a Request" modal (`testID="support-raise-request-btn"`) with booking reference input and category selector.
- *Visual QA Evidence:* Verified in `08-customer-support.png`.

### 3.7 Partner Operations & Front-Desk (`(partner)/*`)
- **Dashboard:** Real business overview metrics (Total earnings, confirmed bookings, arrivals today, occupancy).
- **Properties:** Property cards with category badges, meal summary, and "Inspect Physical Rooms" trigger.
- **Physical Rooms Viewer:** Modal displaying individual room numbers, floor allocations, sharing capacity, and occupancy status.
- **Reservations & Front-Desk:** Tabbed list (Upcoming, Past, Cancelled) with guest check-in / check-out actions.
- **Financial Profile / KYC:** Displays Legal Business Name, PAN, GSTIN, Bank Account & IFSC code.
- *Visual QA Evidence:* Verified in `11-partner-dashboard.png`, `12-partner-properties.png`, `13-partner-reservations.png`, and `14-partner-settlements.png`.

---

## 4. Visual Evidence Archive

All screenshots were generated in headless mobile viewport (390x844) and archived:

```
docs/mobile/screenshots/
├── 01-onboarding.png          (226,390 bytes) - Welcome carousel & entry gate
├── 02-customer-login.png       (44,356 bytes) - Customer auth & role toggle
├── 03-customer-register.png    (45,107 bytes) - Customer account creation
├── 04-owner-login.png          (39,578 bytes) - Partner portal sign-in
├── 05-owner-register.png       (46,972 bytes) - Partner onboarding (10 fields)
├── 06-explore-stays.png        (38,730 bytes) - Canonical category tabs & stays
├── 07-customer-bookings.png    (28,021 bytes) - Customer reservations list
├── 08-customer-support.png     (29,862 bytes) - Customer support & protection SLAs
├── 09-customer-profile.png     (21,650 bytes) - Customer profile & security
├── 10-rewards-referrals.png    (44,356 bytes) - Rewards & referral program
├── 11-partner-dashboard.png    (23,499 bytes) - Partner business overview & metrics
├── 12-partner-properties.png   (24,990 bytes) - Partner property list & tools
├── 13-partner-reservations.png (23,568 bytes) - Front-desk guest reservations
├── 14-partner-settlements.png  (20,522 bytes) - Partner payout history & KYC
├── 15-help-faq.png             (38,663 bytes) - FAQs & inquiry touchpoints
└── 16-legal-terms.png          (49,300 bytes) - Legal policies & platform terms
```

---

## 5. Remaining Physical Hardware QA Requirements

The following behaviors strictly require execution on real physical Android and iOS devices before store submission:
1. **Dynamic Safe Area Margins:** Verifying top header spacing under iPhone Dynamic Island and Android punch-hole cameras.
2. **Dynamic Type Font Scaling:** Testing screen readability when system accessibility font scale is set to 200%.
3. **Android Physical Back Gesture:** Ensuring hardware edge-swipe gestures cleanly dismiss modal sheets without terminating active booking holds.
4. **Biometric Dialogs:** Validating FaceID / TouchID native OS prompts during two-factor authentication.
5. **Physical Keyboard Dismissal:** Verifying form scroll offset when physical or soft keyboards are active on smaller screen form factors (e.g. iPhone SE).
