# TIJUM — MOBILE PHASE M10B
# CUSTOMER API PARITY & CONTRACT MATRIX

**Platform:** TIJUM Food-Inclusive Accommodation Marketplace  
**Milestone:** Phase M10B — Complete Customer Application & API Parity  
**Backend:** Laravel 13 • REST API V1 • MySQL 8 / InnoDB  
**Mobile App:** React Native 0.83.10 • Expo SDK 55 • TypeScript 5.7+  
**Target Client:** `apps/mobile/src/api/customer.ts`, `apps/mobile/src/api/public.ts`, `apps/mobile/src/api/rewards.ts`  
**Date:** November 2026

---

## 1. EXECUTIVE SUMMARY

Phase M10B delivers complete API parity between the TIJUM backend REST API V1 and the TIJUM native mobile customer application. All customer-facing features—including exploration, multi-criteria filtering, canonical inventory selection, authoritative quotes, Razorpay checkout, refund tracking, verified reviews, dispute handling with priority SLAs, and channel notification preferences—are wired to genuine server endpoints with zero fake mock fallbacks.

---

## 2. COMPREHENSIVE CUSTOMER API ENDPOINT MATRIX

| # | Domain | HTTP Verb | Route Path | Request Payload / Params | Response Schema | Client Handler | Screen Binding |
|---|--------|-----------|------------|--------------------------|-----------------|----------------|----------------|
| 1 | Auth | POST | `/api/v1/auth/customer/register` | `name`, `email`, `phone`, `password`, `terms_accepted` | `{ user, token, principal_type }` | `AuthApi.registerCustomer` | `app/(auth)/register.tsx` |
| 2 | Auth | POST | `/api/v1/auth/login` | `login` (email/phone), `password`, `device_name` | `{ user, token, principal_type }` | `AuthApi.login` | `app/(auth)/login.tsx` |
| 3 | Auth | POST | `/api/v1/auth/logout` | None (Bearer token) | `{ message: "Logged out" }` | `AuthApi.logout` | `app/(customer)/profile/index.tsx` |
| 4 | Auth | GET | `/api/v1/auth/profile` | None (Bearer token) | `{ user: UserProfile }` | `AuthApi.getProfile` | `app/(customer)/profile/index.tsx` |
| 5 | Auth | PUT | `/api/v1/auth/profile` | `name`, `email`, `phone`, `marketing_opt_in` | `{ user: UserProfile }` | `AuthApi.updateProfile` | `app/(customer)/profile/index.tsx` |
| 6 | Auth | PUT | `/api/v1/auth/profile/password` | `current_password`, `password`, `password_confirmation` | `{ message: "Password updated" }` | `AuthApi.updatePassword` | `app/(customer)/profile/index.tsx` |
| 7 | Discovery | GET | `/api/v1/public/categories` | None | `{ data: CanonicalCategory[] }` | `PublicApi.getCategories` | `app/(customer)/explore/index.tsx` |
| 8 | Discovery | GET | `/api/v1/public/cities` | None | `{ data: City[] }` | `PublicApi.getCities` | `app/(customer)/explore/index.tsx` |
| 9 | Discovery | GET | `/api/v1/public/properties` | `city`, `category`, `locality`, `ac`, `gender`, `breakfast`, `lunch`, `dinner`, `sharing_capacity`, `min_price`, `max_price`, `check_in_date`, `check_out_date` | `{ data: PropertyCard[] }` | `PublicApi.getProperties` | `app/(customer)/explore/index.tsx` |
| 10 | Discovery | GET | `/api/v1/public/properties/{slug}` | Slug or ID | `{ data: PropertyDetail }` | `PublicApi.getProperty` | `app/(customer)/explore/property/[slug].tsx` |
| 11 | Quotes | POST | `/api/v1/public/properties/{property}/quote` | `property_room_type_id`, `check_in_date`, `duration_type`, `duration_quantity`, `quantity`, `requested_arrival_time` | `{ quote: StayQuote }` | `PublicApi.quoteStay` | `app/(customer)/explore/property/[slug].tsx` |
| 12 | Bookings | POST | `/api/v1/customer/reservations/quote` | `property_id`, `property_room_type_id`, `check_in_date`, `duration_type`, `duration_quantity`, `quantity` | `{ quote: StayQuote }` | `CustomerApi.quoteReservation` | `app/(customer)/bookings/create.tsx` |
| 13 | Bookings | POST | `/api/v1/checkout/quote-promotions` | `property_id`, `subtotal_paise`, `coupon_code`, `points_to_redeem` | `{ data: PromotionQuoteResult }` | `RewardsApi.quotePromotions` | `app/(customer)/bookings/create.tsx` |
| 14 | Coupons | POST | `/api/v1/customer/coupons/validate` | `code`, `subtotal_paise`, `property_id` | `{ valid: bool, coupon, discount_amount_paise }` | `RewardsApi.validateCoupon` | `app/(customer)/bookings/create.tsx` |
| 15 | Bookings | POST | `/api/v1/customer/reservations` | `property_id`, `property_room_type_id`, `check_in_date`, `duration_type`, `duration_quantity`, `quantity`, `guest_gender`, `coupon_code`, `points_to_redeem` | `{ data: Reservation }` | `CustomerApi.createReservation` | `app/(customer)/bookings/create.tsx` |
| 16 | Bookings | GET | `/api/v1/customer/reservations` | `status`, `page`, `per_page` | `{ data: Reservation[], meta }` | `CustomerApi.getReservations` | `app/(customer)/bookings/index.tsx` |
| 17 | Bookings | GET | `/api/v1/customer/reservations/{ref}` | `booking_reference` | `{ data: Reservation }` | `CustomerApi.getReservation` | `app/(customer)/bookings/[reference].tsx` |
| 18 | Bookings | POST | `/api/v1/customer/reservations/{ref}/cancel` | `reason` | `{ data: Reservation }` | `CustomerApi.cancelReservation` | `app/(customer)/bookings/[reference].tsx` |
| 19 | Payments | POST | `/api/v1/customer/reservations/{ref}/payment/initiate` | None | `{ razorpay_order_id, amount_paise, currency, key_id }` | `CustomerApi.initiatePayment` | `app/(customer)/bookings/[reference].tsx` |
| 20 | Payments | POST | `/api/v1/customer/reservations/{ref}/payment/verify` | `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` | `{ data: Reservation }` | `CustomerApi.verifyPayment` | `app/(customer)/bookings/[reference].tsx` |
| 21 | Reviews | GET | `/api/v1/customer/reviews` | `page` | `{ data: Review[], meta }` | `CustomerApi.getReviews` | `app/(customer)/profile/index.tsx` |
| 22 | Reviews | GET | `/api/v1/customer/reviews/eligible` | None | `{ data: EligibleStay[] }` | `CustomerApi.getEligibleReviews` | `app/(customer)/bookings/index.tsx` |
| 23 | Reviews | POST | `/api/v1/customer/reviews/{ref}` | `overall_rating`, `cleanliness_rating`, `food_quality_rating`, `communication_rating`, `value_rating`, `title`, `content` | `{ data: Review }` | `CustomerApi.submitReview` | `app/(customer)/bookings/[reference].tsx` |
| 24 | Support | GET | `/api/v1/customer/cases` | `page` | `{ data: CaseSummary[] }` | `CustomerApi.getCases` | `app/(customer)/support/index.tsx` |
| 25 | Support | POST | `/api/v1/customer/cases` | `booking_reference`, `category`, `description` | `{ data: CaseSummary }` | `CustomerApi.createCase` | `app/(customer)/support/index.tsx` |
| 26 | Support | GET | `/api/v1/customer/cases/{ref}` | `reference` | `{ case: CaseDetail }` | `CustomerApi.getCase` | `app/(customer)/support/[reference].tsx` |
| 27 | Support | POST | `/api/v1/customer/cases/{ref}/messages` | `message` (2–3000 chars) | `{ data: MessageItem }` | `CustomerApi.addCaseMessage` | `app/(customer)/support/[reference].tsx` |
| 28 | Alerts | GET | `/api/v1/customer/notifications` | `page` | `{ data: NotificationItem[] }` | `CustomerApi.getNotifications` | `app/(customer)/notifications/index.tsx` |
| 29 | Alerts | POST | `/api/v1/customer/notifications/{id}/read` | None | `{ message: "Marked read" }` | `CustomerApi.markRead` | `app/(customer)/notifications/index.tsx` |
| 30 | Alerts | POST | `/api/v1/customer/notifications/read-all` | None | `{ message: "All marked read" }` | `CustomerApi.markAllRead` | `app/(customer)/notifications/index.tsx` |
| 31 | Alerts | GET | `/api/v1/customer/notifications/preferences` | None | `{ preferences, channels_status }` | `CustomerApi.getNotificationPreferences` | `app/(customer)/notifications/index.tsx` |
| 32 | Alerts | PUT | `/api/v1/customer/notifications/preferences` | `in_app_operational`, `email_operational`, `sms_operational`, `whatsapp_opted_in` | `{ preferences, channels_status }` | `CustomerApi.updateNotificationPreferences` | `app/(customer)/notifications/index.tsx` |
| 33 | Wishlist | GET | `/api/v1/customer/wishlist` | None | `{ data: PropertyCard[] }` | `CustomerApi.getWishlist` | `app/(customer)/wishlist/index.tsx` |
| 34 | Wishlist | POST | `/api/v1/customer/wishlist/{id}` | None | `{ message: "Added" }` | `CustomerApi.addToWishlist` | `app/(customer)/explore/index.tsx` |
| 35 | Wishlist | DELETE | `/api/v1/customer/wishlist/{id}` | None | `{ message: "Removed" }` | `CustomerApi.removeFromWishlist` | `app/(customer)/explore/index.tsx` |
| 36 | Rewards | GET | `/api/v1/customer/rewards/overview` | None | `{ data: RewardsOverviewResponse }` | `RewardsApi.getOverview` | `app/(customer)/rewards/index.tsx` |
| 37 | Rewards | GET | `/api/v1/customer/rewards/points` | None | `{ data: { wallet: PointsWallet } }` | `RewardsApi.getPointsWallet` | `app/(customer)/rewards/points.tsx` |
| 38 | Rewards | GET | `/api/v1/customer/rewards/points/ledger` | `page`, `type` | `{ data: { ledger: PointsLedgerItem[], wallet } }` | `RewardsApi.getPointsLedger` | `app/(customer)/rewards/points.tsx` |
| 39 | Rewards | GET | `/api/v1/customer/rewards/referrals` | None | `{ data: { profile, referrals } }` | `RewardsApi.getReferralProfile` | `app/(customer)/rewards/referrals.tsx` |
| 40 | Coupons | GET | `/api/v1/customer/coupons` | `property_id`, `category` | `{ data: CouponItem[] }` | `RewardsApi.getAvailableCoupons` | `app/(customer)/rewards/coupons.tsx` |

---

## 3. ARCHITECTURE CONFORMANCE HIGHLIGHTS

1. **Zero Mock Fallbacks:** Error scenarios across rewards and bookings strictly display native retry buttons and genuine server error messages.
2. **Canonical Inventory Model:** Customer selects room categories (`PropertyRoomType`) with transparent sharing capacity and pricing. Physical room numbering and room allocations are reserved exclusively for partner front-desk operations.
3. **Food-Inclusive Disclosures:** 4 independent canonical flags (`food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`) are preserved without bundled or retired food package assumptions.
4. **Channel Policy:** Only operational channels (`in_app`) are displayed as active. Inactive email, SMS, and WhatsApp channels are truthfully disclosed per Rule 3.9 without clickable dead ends.
