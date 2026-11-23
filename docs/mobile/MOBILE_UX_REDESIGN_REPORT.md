# TIJUM Mobile — UX & Visual QA Report (Pass 4 Verified)

**Scope:** Design-system consistency, authenticated visual QA across 27 rendered states, real UI/contract defects fixed during Pass 4, and remaining native hardware checks.  
**Branch:** `feat/mobile-production-hardening-redesign` ([PR #2](https://github.com/surendra0392/tijum/pull/2))  
**Date:** 2026-11-23  

---

## 1. Design System Consolidation

The mobile app uses one consolidated token architecture (`src/theme/tokens.ts`, `src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/spacing.ts`):
- **Primary:** Deep Plum `#442F41` (`deepPlum`), Coral `#FF7A67` / accessible `#B83B2A` (`coralDark`), Warm Cream canvas `#FFF4EE`.
- **Typography:** Montserrat headings (`600`, `700`, `800`) and Nunito body (`400`, `600`, `700`) loaded via `expo-font`.
- **Canonical Categories:** Strictly `hostels-pg` (`Hostels/PG`), `homestays` (`Homestays`), and `co-living` (`Co-Living`).

---

## 2. Genuine Visual & Data-Rendering Bugs Found and Fixed in Pass 4

Replacing unauthenticated/broken screenshots with a real isolated Laravel backend + full-page authenticated CDP capture (`scripts/capture_screens.py`) and visually inspecting every rendered PNG uncovered **12 real user-visible defects**, all fixed and visually re-verified:

| # | Screen / Component | Defect Found Visually / End-to-End | Fix Applied |
|---|---|---|---|
| 1 | `src/api/client.ts` | Aliased `process.env` parameter prevented Expo Metro/Babel from statically inlining `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_ENVIRONMENT` into compiled bundles (silently falling back to `127.0.0.1:8000`). | Added direct dot-notation `process.env.EXPO_PUBLIC_*` reads + regression test in `apiClientAndRevocation.test.ts`. |
| 2 | `(customer)/_layout.tsx` & `(partner)/_layout.tsx` | Bottom tab bar labels (`Home`, `Bookings`, `Support`, `Profile`, `Properties`) were clipped at the bottom edge across every tabbed screen. | Increased tab bar height (`68 + bottomInset`), added `paddingBottom: bottomInset + 4` and explicit `lineHeight: 15`. |
| 3 | `(partner)/settlements/index.tsx` | Summary header displayed `Total Settled: ₹0` and `Pending Payouts: ₹0` because it read non-existent nested `summary.settlements.*` keys instead of the backend's flat `total_settled_paise` / `pending_payout_paise` fields; also printed raw ISO dates (`2026-11-23T00:00:00.000000Z`) and green checkmarks for pending items. | Mapped backend flat paise fields, added `formatSettlementDate()`, and styled non-settled cycles with amber clock/badge indicators. |
| 4 | `(partner)/financial-profile/index.tsx` | (a) Top-right Edit icon was dark plum on a dark plum `AppHeader` (invisible); (b) `CONSTITUTION_OPTIONS` conflated `business_constitution` with `supplier_legal_classification`, displaying raw snake_case `hospitality_service_provider` and failing HTTP 422 on save. | Changed Edit button to crisp white icon on translucent pill; separated `business_constitution` and GST `supplier_legal_classification` (`unregistered`/`regular`/`composition`) with human-readable labels and bank account confirmation validation. |
| 5 | `(partner)/reservations/index.tsx` & `[reference].tsx` | Partner reservation list cards and detail payout row displayed `₹0` whenever `owner_payable_paise` was `0` (before commission snapshot settlement) because `0 ?? total_amount_paise` evaluated to `0`. | Checked `owner_payable_paise > 0` before using it, falling back to `total_amount_paise` on cards and clear `"Pending Settlement Calc"` state on detail when uncalculated. |
| 6 | `(customer)/bookings/[reference].tsx` | Sticky payment bar squeezed the price column, wrapping `₹2,550` mid-number onto two lines (`₹2,55` / `0`); also printed raw `3 daily` and `male`. | Gave price box `flexShrink: 0` + `minWidth: 88` + `numberOfLines={1} adjustsFontSizeToFit`, compacted button row, and formatted duration (`3 Days`) and gender (`Male`). |
| 7 | `(customer)/explore/property/[slug].tsx` | Amenity chips lacked `flexDirection: 'row'`, stacking checkmarks above labels; meal badges stacked vertically; reviews printed raw ISO timestamps and showed `"No reviews yet"` alongside `4.8 (32)`. | Added horizontal row layout to `amenityChip` and `mealBadgesContainer`, formatted review dates (`19 Nov 2026`), and aligned summary copy when `reviews_count > 0`. |
| 8 | `(customer)/explore/index.tsx` | Stay Category tile 1 read `Hostels PGs` (missing slash) with a pool villa photo, and tile 3 (`Co-Living`) showed a food thali photo. | Bundled official TIJUM accommodation category photos (`assets/categories/hostels-pg.jpg`, `homestays.jpg`, `co-living.jpg`) and standardized label to `Hostels/PG`. |
| 9 | `(customer)/rewards/index.tsx` | Recent Points Activity rendered raw ISO-8601 timestamps (`2026-11-23T00:11:48+00:00`). | Formatted transaction dates into human-readable `en-IN` dates (`23 Nov 2026`). |
| 10 | `(auth)/owner-register.tsx` | Location City selector clipped `Visakhapatnam` off the right edge inside a single-line horizontal scroll row. | Converted city pills to a wrapping `flexWrap: 'wrap'` row so all active cities render clearly. |
| 11 | `(partner)/settlements/[reference].tsx` | Header title truncated to `"Settlement State..."` beside the wide `"Successfully Settled"` pill. | Used compact `"Settled"` status pill in the header so `"Settlement Statement"` renders completely unclipped. |
| 12 | `(customer)/bookings/[reference].tsx` & `(partner)/reservations/[reference].tsx` | Meal inclusion badges stacked vertically instead of wrapping horizontally; raw lowercase gender/duration strings appeared on detail cards. | Added `flexDirection: 'row', flexWrap: 'wrap'` to `mealBadgesContainer` and formatted gender/composition/duration labels cleanly. |

---

## 3. Verified Visual Evidence Archive

All 27 PNGs + machine-readable `verification_manifest.json` are stored under `docs/mobile/screenshots/` (populated screens `01`–`23`) and `docs/mobile/screenshots/states/` (explicit empty, auth-gate, and HTTP 503 error captures). Every capture was verified with 0 broken images, 0 uncaught JS exceptions, 0 unexpected HTTP ≥ 400 API responses, and 0 horizontal overflow (`docOverflow <= 4px`).

---

## 4. Remaining Physical Hardware QA

Native device verification on physical Android and iOS hardware is still required for Dynamic Island safe areas, 200% system font scaling, hardware back gestures across native modals, native Razorpay UPI app switching, and soft-keyboard scrolling on compact devices.
