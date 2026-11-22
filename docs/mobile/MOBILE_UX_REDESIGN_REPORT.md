# TIJUM Mobile — UX & Visual Redesign Report

**Scope:** Design-system consolidation, screen-level UI quality, accessibility,
and responsive behavior of the Expo React Native app at `apps/mobile/`.
**Baseline:** branch `feat/mobile-production-hardening-redesign`.

> Evidence rule: design tokens and component behavior below are quoted from the
> actual source. Screenshot capture and on-device visual QA were **not
> performed** in this environment (no Android/iOS runtime, no macOS). Items that
> require a real device are labelled **DEVICE QA REQUIRED**.

---

## 1. Design system (verified state)

The app already has a **single, consolidated design system** — there is no
competing/conflicting token set. This satisfies the "never introduce another
incomplete design system" constraint.

### 1.1 Brand palette (`src/theme/tokens.ts`)

- **Primary:** Deep plum `#442F41` (`deepPlum`), with `plumDark #2E1E2C` and
  `plumLight #5E425A`.
- **Accent:** Coral `#FF7A67` with `coralDark #B83B2A` used for accessible text
  pairings and `coralLight #FF8A73`.
- **Surfaces:** Warm cream `#FFF4EE` canvas, peach tints, `surfaceSubtle
  #F6F2EE`, `neutralSurface #E6E0DB`, `borderStrong #D6CBC2`.
- **Text:** `inkPrimary #261824`, `inkSecondary #5E4B5B`,
  `mutedLavenderText #6D5166` — all on light surfaces for contrast.
- **Semantic status colors** are explicitly defined as WCAG-AA
  foreground/background pairs: emerald (food-included only), amber, rose, info,
  each with `*-Light` background + `*-Text` foreground.
- A hard rule in the file reserves emerald strictly for **positive
  food-included** indicators, preventing status-color drift.

This is a mature token layer (`colors.ts`, `spacing.ts`, `typography.ts`,
`tokens.ts`). The prior branch commit `8c1a231 "unify TIJUM design tokens and
shared UI components"` consolidated it. **Recommendation: keep it; do not fork.**

### 1.2 Typography & spacing

- Montserrat + Nunito font families (per project brand spec), loaded via
  `expo-font` / `useFonts`.
- Shared `Button`, `Input`, `Badge`, `Card`-style surfaces, `PropertyCard`,
  `CategoryBadge`, `MealBadge`, `StayTimingBadge`, `ReservationStatusBadge`,
  `Skeleton`, `ExceptionalState`, `ErrorBoundary`, `RequireAuth`,
  `NotificationNavigationHandler`, `BrandLogo`, `AppHeader`.

---

## 2. Component inventory (shared, verified)

| Component | Role | Reused widely? |
|-----------|------|----------------|
| `Button` | primary/secondary/ghost with loading + disabled | yes |
| `Input` | labeled text input with error + secureTextEntry | yes |
| `Badge` / `CategoryBadge` / `MealBadge` | status/category chips | yes |
| `ReservationStatusBadge` / `StayTimingBadge` | booking state + stay timing | yes |
| `PropertyCard` | explore/list card | yes |
| `Skeleton` (`SkeletonCard`) | loading placeholders | explore, bookings, wishlist |
| `ExceptionalState` | unified empty/error/offline state | 21 screens |
| `ErrorBoundary` | root crash containment | root `_layout.tsx` |
| `AppHeader` | consistent top bar with back affordance | customer/partner |
| `BrandLogo` | TIJUM mark | auth + headers |

---

## 3. UX quality by screen family

Legend: ✅ good · 🟡 acceptable w/ gaps · 🔧 improved this audit.

### 3.1 First launch / onboarding (`app/index.tsx`)
- Splash → font load → gate to guest explore or login. ✅
- **DEVICE QA REQUIRED:** real cold-start timing and font-swap flash.

### 3.2 Auth (`(auth)/*`)
- Clean card forms, client-side validation, inline field errors via `Input`,
  transparent meal-disclosure copy on login, partner password-recovery modal. ✅
- Errors via `Alert.alert` (acceptable for auth). 🟡 consider inline error banner.

### 3.3 Explore / discovery (`explore/index.tsx`)
- Strong search entry, city/category selectors, filter sheet, sort, skeleton
  loading, empty + error states via `ExceptionalState`, `PropertyCard` grid. ✅
- Real imagery from backend; **no fabricated listings or map pins** (verified —
  data comes from `PublicApi.getProperties`). ✅

### 3.4 Property detail (`explore/property/[slug].tsx`)
- Rich detail from `PublicApi.getPropertyDetail`; gallery, amenities, food,
  rules, reviews, booking CTA. 🟡
- **Gap (P2):** no unified empty/error state if the slug 404s or the request
  fails — relies on inline rendering. Recommend wrapping in `ExceptionalState`.

### 3.5 Booking & payment (`bookings/create.tsx`, `bookings/[reference].tsx`)
- Calm price breakdown, server-authoritative quote, 15-minute hold surfaced,
  Razorpay test-mode checkout, reconciliation via `getPaymentStatus`. ✅ logic.
- **No fabricated payment success** — frontend callback never marks money
  received; backend verifies. ✅ (verified in `RazorpayService` + tests).
- **DEVICE QA REQUIRED:** native Razorpay sheet, app-kill-during-payment recovery.
- **Gap (P2):** booking detail relies on `Alert.alert` for errors rather than
  inline state.

### 3.6 Account / profile / security (`profile/*`)
- Clear sections, token/session management (now functional — F-1 fix), security
  settings. ✅
- **🔧 This audit:** session list + "revoke all" now hit real endpoints, so the
  screen is no longer silently broken.

### 3.7 Rewards / wishlist / reviews / support (customer)
- Consistent card lists with empty/error states via `ExceptionalState`. ✅
- Amounts/balances are backend-authoritative (no invented points). ✅

### 3.8 Partner dashboard (`dashboard.tsx`)
- Actionable metric grid (arrivals, departures, in-house, active stays, reviews
  to reply, open cases) + earnings + operations shortcuts. ✅
- All values from `getDashboard`; **no fabricated numbers**. ✅
- 🟡 `operation.route as any` (F-2) — values are static literals, low risk.

### 3.9 Partner properties + sub-resources
- List/create/edit with verification status (never shows unapproved as
  approved). ✅
- **Gap (P2):** `room-types`, `rooms`, `pricing`, `availability`, `media` lack
  the shared `ExceptionalState`; media has no empty gallery state. Functionality
  works; polish needed for consistency.

### 3.10 Partner reservations / settlements / cases / financial profile
- Front-desk actions (allocate room, check-in/out) wired to owner endpoints. ✅
- Settlements/financial profile show truthful backend status; **no payout-bypass
  UI**. ✅ 🔒

---

## 4. Accessibility (verified + gaps)

- `accessibilityRole="button"` present on Pressables/Touchables reviewed (e.g.
  dashboard operation cards). ✅
- Shared `Input` and `Button` support labels/disabled states. ✅
- Color pairings chosen for WCAG AA in tokens. ✅
- **Gaps (DEVICE/accessibility audit required):**
  - Not every icon-only control has an `accessibilityLabel` across all screens —
    needs a systematic pass (not exhaustively verified here).
  - Dynamic font-scaling behavior on the densest screens (booking detail,
    dashboard grid) must be checked on device at large text sizes.
  - Focus order and screen-reader traversal not verified (requires device).

---

## 5. Responsive / safe-area / keyboard

- `SafeAreaProvider` at root; `react-native-safe-area-context` used. ✅ (static)
- `KeyboardAvoidingView` / keyboard handling present on form screens (auth,
  booking create) per code structure. 🟡 verify behavior on iOS vs Android.
- Tab bars use safe-area insets; **DEVICE QA REQUIRED** to confirm no overlap
  with Android nav bar / iOS home indicator across device sizes.
- **DEVICE QA REQUIRED:** small/large Android, modern/smaller iPhone, display +
  font scaling, notch, Android back, iOS swipe-back.

---

## 6. Before/after & prioritized recommendations

Because the redesign largely landed in prior branch commits, the "before" state
is the pre-branch baseline (`1719e2d`). Representative deltas vs baseline
(from commit diffstat):

- Unified token system (`colors/spacing/typography/tokens`) replacing scattered
  values — commit `8c1a231`.
- Customer + auth + rewards + support + legal screens redesigned — `2d60f6a`.
- Partner dashboard/properties/media/reservations/KYC/settlements redesigned —
  `8271dd9`.
- Shared `Skeleton`, `ErrorBoundary`, `RequireAuth`, `ExceptionalState` added.
- This audit: removed fabricated marketing-notification toggles (customer
  notifications screen) and fixed session management (F-1) so account/security
  screens are truthful and functional.

### Prioritized follow-ups (not blockers for CONDITIONAL GO)

1. **P2:** Wrap `explore/property/[slug]`, `bookings/[reference]`,
   `settlements/[reference]`, and partner `properties/[id]/*` data screens in
   `ExceptionalState` for consistent empty/error/offline UX.
2. **P2:** Replace `as any` route casts with a typed route union.
3. **P2:** Add `accessibilityLabel` to icon-only controls; run a screen-reader
   pass on device.
4. **P3:** `legal/[slug]` error/empty fallback; surface unrecognized deep links
   instead of silent `/`.
5. **DEVICE QA REQUIRED:** full responsive + font-scaling + safe-area matrix,
   before/after screenshots per screen family.

> Screenshots: **none captured** in this environment. A device QA pass must
> produce before/after PNGs for each screen family before final store submission.