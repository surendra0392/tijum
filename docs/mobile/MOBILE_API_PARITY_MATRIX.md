# TIJUM Mobile — API Parity Matrix

**Scope:** Every mobile API client method → Laravel API v1 route, with guard,
request/response contract, and verification status.
**Sources:** `apps/mobile/src/api/*.ts`, `routes/api.php`,
`app/Http/Controllers/Api/V1/**`, `app/Http/Resources/Api/V1/**`.
**Baseline:** branch `feat/mobile-production-hardening-redesign`.

Status key: ✅ match · 🟢 match (verified via tests) · 🔧 fixed this pass ·
🟡 minor note · 🔒 disabled by policy.

## Base URL / environment resolution (verified)

`apps/mobile/src/api/client.ts` `resolveApiBaseUrl`:

- **production** build requires explicit `EXPO_PUBLIC_API_URL`, must be HTTPS,
  and is the only environment allowed to target `tijum.com`.
- **preview** build requires HTTPS and may **not** target `tijum.com`
  (`UNSAFE_PRODUCTION_TARGET`); `eas.json` points preview at
  `https://staging.tijum.com/api/v1`.
- **development** falls back to `http://127.0.0.1:8000/api/v1` (or
  `10.0.2.2:8000` for Android emulator per `eas.json`); may not target prod.
- `NODE_ENV=test` also blocks production hosts.

Conclusion: **dev/preview builds cannot accidentally hit production**, and a
missing prod URL fails closed rather than defaulting to prod. Verified by code
inspection of `client.ts`.

> `eas.json` preview → `staging.tijum.com` which currently **does not resolve**
> (release blocker; see release-readiness doc).

## Legend for guards

- **customer** = `auth:sanctum` + `auth.customer`
- **owner** = `auth:sanctum` + `auth.owner`
- **public** = no auth (some throttled)

---

## 1. Public endpoints (`src/api/public.ts`) — all ✅

| Mobile method | Verb + Path | Backend | Guard | Status |
|---|---|---|---|---|
| `getConfig` | GET `public/config` | api.php:46 | public | ✅ |
| `getCategories` | GET `public/categories` | :47 | public | ✅ |
| `getCities` | GET `public/cities` | :48 | public | ✅ |
| `getCity` | GET `public/cities/{slug}` | :49 | public | ✅ |
| `getProperties` | GET `public/properties` | :50 | public | ✅ |
| `getPropertyDetail` / `getProperty` | GET `public/properties/{slug}` | :51 | public | ✅ (two aliases, one route — 🟡 redundant) |
| `getPropertyReviews` | GET `public/properties/{slug}/reviews` | :52 | public | ✅ |
| `quoteStay` | POST `public/properties/{id}/quote` | :53 | public | ✅ |
| `reverseGeocode` | GET `public/geocode/reverse` | :54 | public | ✅ |
| `validateGuestContact` | POST/GET `public/validate-contact` | :57 (`Route::match`) | public | ✅ |
| `autocompleteLocations` | GET `public/locations/autocomplete` | :60 | public | ✅ |
| `getPage` | GET `public/pages/{slug}` | :65 | public | ✅ |
| `getFaqs` | GET `public/faqs` | :68 | public | ✅ |
| `getBanners` | GET `public/banners` | :69 | public | ✅ |
| `submitContact` | POST `public/contact` | :70 | public | ✅ |
| `forgotPassword` (customer/owner) | POST `auth/{customer\|owner}/forgot-password` | :77 / :90 | public (throttle) | ✅ |

## 2. Auth / session (`customer.ts`, `owner.ts`) — P0 FIXED

| Mobile method | Verb + Path (corrected) | Backend | Guard | Status |
|---|---|---|---|---|
| `CustomerApi.getTokens` | GET `auth/customer/tokens` | api.php:82 | customer | 🔧 fixed (was `customer/auth/tokens` → 404) |
| `CustomerApi.revokeAllTokens` | POST `auth/customer/revoke-all` | api.php:81 | customer | 🔧 fixed (was `.../tokens/revoke-all` → 404) |
| `OwnerApi.getTokens` | GET `auth/owner/tokens` | api.php:95 | owner | 🔧 fixed (was `owner/auth/tokens` → 404) |
| `OwnerApi.revokeAllTokens` | POST `auth/owner/revoke-all` | api.php:94 | owner | 🔧 fixed (was `.../tokens/revoke-all` → 404) |
| (token delete single) | DELETE `auth/{customer\|owner}/tokens/{tokenId}` | :83 / :96 | customer/owner | ✅ route exists (no dedicated client method yet — 🟡) |

## 3. Customer operations (`customer.ts`) — all ✅

| Mobile method | Verb + Path | Backend | Guard | Status |
|---|---|---|---|---|
| `getProfile` | GET `customer/profile` | :103 | customer | ✅ |
| `updateProfile` | PUT `customer/profile` | :104 | customer | ✅ |
| `changePassword` | PUT `customer/password` | :105 | customer | ✅ |
| `resendEmailVerification` | POST `customer/email/verification-notification` | :106 | customer (throttle 6,1) | ✅ |
| `getReservations` | GET `customer/reservations` | :111 | customer | ✅ |
| `quoteReservation` | POST `customer/reservations/quote/{property}` | :112 | customer | ✅ |
| `createReservation` | POST `customer/reservations` | :113 | customer | ✅ |
| `getReservation` | GET `customer/reservations/{reference}` | :114 | customer | ✅ |
| `cancelReservation` | POST `customer/reservations/{reference}/cancel` | :115 | customer | ✅ |
| `initiatePayment` | POST `customer/reservations/{reference}/payment/initiate` | :118 | customer | ✅ 🔒 live disabled |
| `verifyPayment` | POST `customer/reservations/{reference}/payment/verify` | :119 | customer | ✅ backend-authoritative |
| `getPaymentStatus` | GET `customer/reservations/{reference}/payment/status` | :120 | customer | ✅ |
| `getReviews` / `getEligibleReviews` / `submitReview` | customer/reviews… | :123-125 | customer | ✅ |
| `getCases` / `getCase` / `createCase` / `addCaseMessage` | customer/cases… | :128-131 | customer | ✅ |
| `getSupportTickets` (+ detail/create/message) | customer/support-tickets… | :134-138 | customer | ✅ |
| `getNotifications` / unread-count / markRead / markAllRead | customer/notifications… | :141-145 | customer | ✅ |
| `getNotificationPreferences` / `updateNotificationPreferences` | GET/PUT `customer/notifications/preferences` | :146 | customer | ✅ aligned to `channels_available` |
| `registerDevice` | POST `customer/devices/register` | :149 | customer | ✅ |
| `unregisterDevice` | DELETE `customer/devices/unregister` | :150 | customer | ✅ |
| `getWishlist` / `addToWishlist` / `removeFromWishlist` | customer/wishlist… | :153-156 | customer | ✅ |

## 4. Rewards (`rewards.ts`) — all ✅

| Mobile method | Verb + Path | Backend | Guard | Status |
|---|---|---|---|---|
| `getOverview` | GET `customer/rewards/overview` | :159 | customer | ✅ |
| `getPointsWallet` | GET `customer/rewards/points` | :160 | customer | ✅ |
| `getPointsLedger` | GET `customer/rewards/points/ledger` | :161 | customer | ✅ |
| `getReferralProfile` | GET `customer/rewards/referrals` | :162 | customer | ✅ |
| `getAvailableCoupons` | GET `customer/coupons` | :164 | customer | ✅ |
| `validateCoupon` | POST `customer/coupons/validate` | :165 | customer | ✅ |
| `quotePromotions` | POST `checkout/quote-promotions` | :169 | customer | ✅ (backend also has `customer/rewards/quote` :166, unused — 🟡 dual surface) |

## 5. Partner / owner operations (`owner.ts`) — all ✅

| Mobile method | Verb + Path | Backend | Guard | Status |
|---|---|---|---|---|
| `getProfile` / `updateProfile` / `changePassword` | owner/profile, owner/password | :174-176 | owner | ✅ |
| `getDashboard` | GET `owner/dashboard` | :179 | owner | ✅ |
| `getProperties` / `getProperty` / `createProperty` / `updateProperty` | owner/properties… | :182-186 | owner | ✅ |
| `submitVerification` / `submitPropertyVerification` | POST owner/properties/{id}/submit-verification | :187 | owner | ✅ (alias — 🟡) |
| `getVerificationStatus` / `getPropertyVerification` | GET …/verification-status | :188 | owner | ✅ (alias — 🟡) |
| `getPropertyDocuments` / `uploadPropertyDocument` / `deletePropertyDocument` | owner/properties/{id}/documents… | :189-191 | owner | ✅ |
| `getRoomTypes` / create / update / delete | owner/properties/{id}/room-types… | :194-197 | owner | ✅ |
| `getPropertyRooms` / `createRoom` / `updateRoom` / `updateRoomStatus` | owner/properties/{id}/rooms… | :200-203 | owner | ✅ |
| `getPricing` / `updatePricing` | owner/properties/{id}/pricing | :206-207 | owner | ✅ |
| `getAvailabilityBlocks` / create / cancel | …/availability-blocks… | :210-212 | owner | ✅ |
| `getMedia` / upload / update / reorder / delete | …/media… | :215-219 | owner | ✅ (getMedia alias — 🟡) |
| `getAmenities` / `assignAmenity` / `deleteAmenity` | …/amenities… | :222-224 | owner | ✅ |
| `getReservations` / `getReservation` | owner/reservations… | :227-228 | owner | ✅ |
| `allocateRoom` | POST owner/reservations/{reference}/allocate-room | :231 (OwnerRoomController) | owner | ✅ |
| `checkInReservation` / `checkOutReservation` | owner/reservations/{reference}/check-in\|check-out | :229-230 | owner | ✅ |
| `getReviews` / `replyToReview` | owner/reviews… | :234-235 | owner | ✅ |
| `getFinancialSummary` | GET owner/financial/summary | :238 | owner | ✅ 🔒 |
| `getSettlements` | GET owner/financial/settlements | :239 | owner | ✅ 🔒 |
| `getSettlement` | GET owner/settlements/{reference} | :242 | owner | ✅ 🔒 |
| `getFinancialProfile` / `updateFinancialProfile` | owner/financial-profile | :243-244 | owner | ✅ 🔒 |
| `getCommissionAgreements` / `acceptCommissionAgreement` | owner/commission-agreements… | :245-246 | owner | ✅ |
| `getCases` / `getCase` / `addCaseMessage` | owner/cases… | :249-251 | owner | ✅ |
| `getNotifications` / unread / read / read-all | owner/notifications… | :254-258 | owner | ✅ |
| `getNotificationPreferences` / `updateNotificationPreferences` | GET/PUT owner/notifications/preferences | :254-255 (added WIP) | owner | ✅ fixed WIP (was wrong `owner/notification-preferences`) |
| `registerDevice` / `unregisterDevice` | owner/devices/register\|unregister | :262-263 | owner | ✅ |

---

## Authorization & IDOR posture (verified)

- **Role separation:** customer routes (`auth.customer`) and owner routes
  (`auth.owner`) are distinct Sanctum guards; cross-role tokens are rejected
  backend-side. The mobile client attaches whatever token is in secure storage;
  isolation depends on backend guard rejection (acceptable, but the client does
  not pre-gate by role — 🟡 note).
- **Ownership scoping:** owner resource routes use numeric `{id}`/`{property}`/
  `{roomId}`/`{mediaId}` path params with no route-level policy middleware;
  ownership is enforced in controllers (not visible in the route file). Flagged
  for controller-level review — **not a confirmed defect**, but the pattern
  warrants a dedicated IDOR test pass (carried to QA matrix).
- **Financial endpoints:** all settlement/transfer data is read-only from the
  mobile client; live payout/settlement are disabled by config. No client method
  triggers a payout.

## Verification performed

- Path/verb/guard cross-checked for ~90 methods against `routes/api.php`.
- Token endpoint fix verified by type-check + full mobile test run (204 pass).
- Partner notification-preference endpoints covered by committed backend tests
  (`NotificationAndDeviceApiTest`, `MobileProductionParityApiTest` — 13 pass).
- No live/production financial mutation was executed against any environment.