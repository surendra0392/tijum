# TIJUM Mobile REST API Integration Matrix

**Document Reference:** `docs/mobile/TIJUM_MOBILE_API_INTEGRATION_MATRIX.md`  
**API Specification:** REST API V1 (`routes/api.php`)  
**Base URL:** `https://tijum.com/api/v1` (or local emulator host `http://10.0.2.2:8000/api/v1`)  
**Authentication Scheme:** Bearer Token (Laravel Sanctum)  
**Total Registered Routes:** **111 Authoritative Routes** (`php artisan route:list --path=api/v1`)  
**Date:** November 20, 2026 (Phase M10A Reconciled & Certified)  
**Status:** **ACTIVE, COMPLETE & VERIFIED**

---

## 1. Complete Mobile API Endpoints Directory

### 1.1 Authentication & Session Security (Customer & Owner)
| HTTP Method | API V1 Route | Controller Action | Mobile Client Method | Auth Guard | Description |
|---|---|---|---|---|---|
| **POST** | `/api/v1/auth/customer/login` | `CustomerAuthController@login` | `CustomerApi.login` | Guest | Customer credentials login |
| **POST** | `/api/v1/auth/customer/register` | `CustomerAuthController@register` | `CustomerApi.register` | Guest | Customer signup with phone normalization |
| **POST** | `/api/v1/auth/customer/forgot-password` | `ForgotPasswordController@customerForgotPassword` | `PublicApi.forgotPassword` | Guest (`throttle:api-auth`) | Customer password reset link |
| **POST** | `/api/v1/auth/customer/logout` | `CustomerAuthController@logout` | `CustomerApi.logout` | `auth:sanctum` | Customer token revocation |
| **POST** | `/api/v1/auth/customer/revoke-all` | `CustomerAuthController@revokeAll` | `ApiClient.post` | `auth:sanctum` | Revoke all customer sessions |
| **GET** | `/api/v1/auth/customer/tokens` | `CustomerAuthController@tokens` | `ApiClient.get` | `auth:sanctum` | List active customer devices |
| **DELETE** | `/api/v1/auth/customer/tokens/{id}` | `CustomerAuthController@delete` | `ApiClient.delete` | `auth:sanctum` | Revoke specific customer device |
| **POST** | `/api/v1/auth/owner/login` | `OwnerAuthController@login` | `OwnerApi.login` | Guest | Partner credentials login |
| **POST** | `/api/v1/auth/owner/register` | `OwnerAuthController@register` | `OwnerApi.register` | Guest | Partner onboarding registration |
| **POST** | `/api/v1/auth/owner/forgot-password` | `ForgotPasswordController@ownerForgotPassword` | `PublicApi.forgotPassword` | Guest (`throttle:api-auth`) | Partner password reset link |
| **POST** | `/api/v1/auth/owner/logout` | `OwnerAuthController@logout` | `OwnerApi.logout` | `auth:sanctum` | Partner token revocation |
| **POST** | `/api/v1/auth/owner/revoke-all` | `OwnerAuthController@revokeAll` | `ApiClient.post` | `auth:sanctum` | Revoke all partner sessions |
| **GET** | `/api/v1/auth/owner/tokens` | `OwnerAuthController@tokens` | `ApiClient.get` | `auth:sanctum` | List active partner devices |
| **DELETE** | `/api/v1/auth/owner/tokens/{id}` | `OwnerAuthController@delete` | `ApiClient.delete` | `auth:sanctum` | Revoke specific partner device |

### 1.2 Public Discovery, Content & Configuration
| HTTP Method | API V1 Route | Controller Action | Mobile Client Method | Auth Guard | Description |
|---|---|---|---|---|---|
| **GET** | `/api/v1/public/config` | `PublicConfigController` | `PublicApi.getConfig` | Guest | Currency & stay timing policy |
| **GET** | `/api/v1/public/cities` | `PublicCityController@index` | `PublicApi.getCities` | Guest | Active launch cities list |
| **GET** | `/api/v1/public/cities/{slug}` | `PublicCityController@show` | `ApiClient.get` | Guest | City details and coordinates |
| **GET** | `/api/v1/public/categories` | `PublicCategoryController@index` | `PublicApi.getCategories` | Guest | Canonical accommodation categories |
| **GET** | `/api/v1/public/properties` | `PublicPropertyController@index` | `PublicApi.getProperties` | Guest | Filtered property search feed |
| **GET** | `/api/v1/public/properties/{slug}` | `PublicPropertyController@show` | `PublicApi.getPropertyBySlug` | Guest | Property details, amenities, rooms |
| **POST** | `/api/v1/public/properties/{id}/quote` | `PublicPropertyController@quote` | `CustomerApi.quoteReservation` | Guest | Public stay pricing quote |
| **GET** | `/api/v1/public/properties/{slug}/reviews` | `PublicPropertyController@reviews` | `ApiClient.get` | Guest | Public property reviews feed |
| **POST** | `/api/v1/public/contact` | `PublicContentController@contact` | `PublicApi.submitContact` | Guest | Public contact inquiry form |
| **GET** | `/api/v1/public/banners` | `PublicContentController@banners` | `ApiClient.get` | Guest | Home promotional banner slides |
| **GET** | `/api/v1/public/faqs` | `PublicContentController@faqs` | `ApiClient.get` | Guest | Help and FAQ items |
| **GET** | `/api/v1/public/blog` | `PublicContentController@blogIndex` | `ApiClient.get` | Guest | Editorial blog posts index |
| **GET** | `/api/v1/public/blog/{slug}` | `PublicContentController@blogShow` | `ApiClient.get` | Guest | Editorial blog article details |
| **GET** | `/api/v1/public/pages/{slug}` | `PublicContentController@page` | `ApiClient.get` | Guest | Static CMS legal / policy pages |
| **GET** | `/api/v1/public/geocode/reverse` | `PublicGeocodeController@reverse` | `ApiClient.get` | Guest | Reverse geocode coordinates to city |
| **GET** | `/api/v1/public/locations/autocomplete` | `PublicLocationController@autocomplete` | `ApiClient.get` | Guest | Locality search suggestions |
| **POST** | `/api/v1/public/validate-contact` | `PublicGuestContactValidator` | `ApiClient.post` | Guest | Pre-checkout phone & email validation |

### 1.3 Customer Stays, Payments, Reviews & Loyalty
| HTTP Method | API V1 Route | Controller Action | Mobile Client Method | Auth Guard | Description |
|---|---|---|---|---|---|
| **POST** | `/api/v1/customer/reservations/quote/{id}`| `CustomerReservationController@quote`| `CustomerApi.quoteReservation`| `auth:sanctum` | Authenticated booking quote |
| **POST** | `/api/v1/customer/reservations` | `CustomerReservationController@store`| `CustomerApi.createReservation`| `auth:sanctum` | 15-minute booking hold creation |
| **GET** | `/api/v1/customer/reservations` | `CustomerReservationController@index`| `CustomerApi.getReservations` | `auth:sanctum` | Customer reservations list |
| **GET** | `/api/v1/customer/reservations/{ref}` | `CustomerReservationController@show` | `CustomerApi.getReservation` | `auth:sanctum` | Customer reservation details |
| **POST** | `/api/v1/customer/reservations/{ref}/cancel`| `CustomerReservationController@cancel`| `CustomerApi.cancelReservation`| `auth:sanctum` | Customer booking cancellation |
| **POST** | `/api/v1/customer/reservations/{ref}/payment/initiate` | `CustomerPaymentController@initiate` | `CustomerApi.initiatePayment`| `auth:sanctum` | Razorpay order creation |
| **POST** | `/api/v1/customer/reservations/{ref}/payment/verify` | `CustomerPaymentController@verify` | `CustomerApi.verifyPayment` | `auth:sanctum` | Razorpay signature verification |
| **GET** | `/api/v1/customer/reservations/{ref}/payment/status` | `CustomerPaymentController@status` | `ApiClient.get` | `auth:sanctum` | Real-time payment verification check |
| **GET** | `/api/v1/customer/wishlist` | `CustomerWishlistController@index` | `CustomerApi.getWishlist` | `auth:sanctum` | Saved accommodations list |
| **POST** | `/api/v1/customer/wishlist/toggle` | `CustomerWishlistController@toggle` | `CustomerApi.toggleWishlist` | `auth:sanctum` | Add/remove stay from wishlist |
| **POST** | `/api/v1/customer/reviews/{ref}` | `CustomerReviewController@store` | `CustomerApi.submitReview` | `auth:sanctum` | 4-category stay review submission |
| **GET** | `/api/v1/customer/reviews/eligible` | `CustomerReviewController@eligible`| `CustomerApi.getEligibleReviews`| `auth:sanctum` | Eligible completed stays for review |
| **GET** | `/api/v1/customer/rewards/points` | `CustomerRewardsController@points` | `RewardsApi.getPoints` | `auth:sanctum` | FEFO loyalty points balance & lots |
| **GET** | `/api/v1/customer/rewards/referrals` | `CustomerRewardsController@referrals`| `RewardsApi.getReferrals` | `auth:sanctum` | Referral code & referrals count |
| **GET** | `/api/v1/customer/rewards/coupons` | `CustomerRewardsController@coupons`| `RewardsApi.getCoupons` | `auth:sanctum` | Active coupon discounts |
| **POST** | `/api/v1/checkout/quote-promotions` | `CustomerRewardsController@quote` | `RewardsApi.quote` | `auth:sanctum` | Pre-checkout coupon & points stack |
| **POST** | `/api/v1/customer/cases` | `CustomerProtectionController@store` | `CustomerApi.createCase` | `auth:sanctum` | Grievance ticket lodgement |
| **GET** | `/api/v1/customer/cases` | `CustomerProtectionController@index` | `CustomerApi.getCases` | `auth:sanctum` | Customer grievances list |
| **GET** | `/api/v1/customer/cases/{ref}` | `CustomerProtectionController@show` | `ApiClient.get` | `auth:sanctum` | Grievance case details & events |
| **POST** | `/api/v1/customer/devices/register` | `CustomerDeviceController@register` | `Notifications.registerDevice`| `auth:sanctum` | Push notification token register |
| **DELETE** | `/api/v1/customer/devices/unregister`| `CustomerDeviceController@unregister`| `Notifications.unregisterDevice`| `auth:sanctum`| Push notification token unregister |
| **GET** | `/api/v1/customer/notifications` | `CustomerNotificationController@index` | `Notifications.getNotifications` | `auth:sanctum` | Notification inbox |
| **POST** | `/api/v1/customer/notifications/{id}/read` | `CustomerNotificationController@read` | `Notifications.markRead` | `auth:sanctum` | Mark notification read |
| **POST** | `/api/v1/customer/notifications/mark-all-read` | `CustomerNotificationController@markAllRead` | `Notifications.markAllRead` | `auth:sanctum` | Mark all notifications read |
| **GET** | `/api/v1/customer/profile` | `CustomerProfileController@show` | `CustomerApi.getProfile` | `auth:sanctum` | Customer profile data |
| **PUT** | `/api/v1/customer/profile` | `CustomerProfileController@update` | `CustomerApi.updateProfile` | `auth:sanctum` | Customer profile update |
| **PUT** | `/api/v1/customer/password` | `CustomerProfileController@updatePassword` | `CustomerApi.changePassword` | `auth:sanctum` | Customer password update |

### 1.4 Partner / Property Owner Operations (Phase M10A Complete)
| HTTP Method | API V1 Route | Controller Action | Mobile Client Method | Auth Guard | Description |
|---|---|---|---|---|---|
| **GET** | `/api/v1/owner/reference-data` | `OwnerPropertyController@referenceData` | `OwnerApi.getReferenceData` | `auth:sanctum,auth.owner` | Onboarding cities, categories, enums |
| **GET** | `/api/v1/owner/dashboard` | `OwnerDashboardController@index` | `OwnerApi.getDashboard` | `auth:sanctum,auth.owner` | Host operational KPIs & metrics |
| **GET** | `/api/v1/owner/properties` | `OwnerPropertyController@index` | `OwnerApi.getProperties` | `auth:sanctum,auth.owner` | Host owned properties list |
| **POST** | `/api/v1/owner/properties` | `OwnerPropertyController@store` | `OwnerApi.createProperty` | `auth:sanctum,auth.owner` | Onboard new property (5-step wizard) |
| **GET** | `/api/v1/owner/properties/{id}` | `OwnerPropertyController@show` | `OwnerApi.getProperty` | `auth:sanctum,auth.owner` | Host property details |
| **PUT** | `/api/v1/owner/properties/{id}` | `OwnerPropertyController@update` | `OwnerApi.updateProperty` | `auth:sanctum,auth.owner` | Update property details |
| **POST** | `/api/v1/owner/properties/{id}/submit-verification` | `OwnerPropertyController@submitVerification` | `OwnerApi.submitVerification` | `auth:sanctum,auth.owner` | Submit property for verification |
| **GET** | `/api/v1/owner/properties/{id}/verification-status` | `OwnerPropertyController@verificationStatus` | `OwnerApi.getVerificationStatus` | `auth:sanctum,auth.owner` | Evaluation checklist for verification |
| **GET** | `/api/v1/owner/properties/{id}/room-types` | `OwnerRoomTypeController@index` | `OwnerApi.getRoomTypes` | `auth:sanctum,auth.owner` | List room categories |
| **POST** | `/api/v1/owner/properties/{id}/room-types` | `OwnerRoomTypeController@store` | `OwnerApi.createRoomType` | `auth:sanctum,auth.owner` | Create room category |
| **PUT** | `/api/v1/owner/properties/{id}/room-types/{rtId}` | `OwnerRoomTypeController@update` | `OwnerApi.updateRoomType` | `auth:sanctum,auth.owner` | Update room category |
| **DELETE** | `/api/v1/owner/properties/{id}/room-types/{rtId}` | `OwnerRoomTypeController@destroy` | `OwnerApi.deleteRoomType` | `auth:sanctum,auth.owner` | Soft delete/deactivate room type |
| **GET** | `/api/v1/owner/properties/{id}/rooms` | `OwnerRoomController@rooms` | `OwnerApi.getPropertyRooms` | `auth:sanctum,auth.owner` | List physical rooms |
| **POST** | `/api/v1/owner/properties/{id}/rooms` | `OwnerRoomController@store` | `OwnerApi.createRoom` | `auth:sanctum,auth.owner` | Create physical room |
| **PUT** | `/api/v1/owner/properties/{id}/rooms/{roomId}` | `OwnerRoomController@update` | `OwnerApi.updateRoom` | `auth:sanctum,auth.owner` | Update physical room |
| **PATCH** | `/api/v1/owner/properties/{id}/rooms/{roomId}/status` | `OwnerRoomController@updateStatus` | `OwnerApi.updateRoomStatus` | `auth:sanctum,auth.owner` | Update operational status |
| **GET** | `/api/v1/owner/properties/{id}/pricing` | `OwnerPricingController@show` | `OwnerApi.getPricing` | `auth:sanctum,auth.owner` | Pricing readiness & rate plans |
| **PUT** | `/api/v1/owner/properties/{id}/pricing` | `OwnerPricingController@update` | `OwnerApi.updatePricing` | `auth:sanctum,auth.owner` | Update daily/weekly/monthly rates |
| **GET** | `/api/v1/owner/properties/{id}/availability-blocks` | `OwnerAvailabilityBlockController@index` | `OwnerApi.getAvailabilityBlocks` | `auth:sanctum,auth.owner` | List blackout availability blocks |
| **POST** | `/api/v1/owner/properties/{id}/availability-blocks` | `OwnerAvailabilityBlockController@store` | `OwnerApi.createAvailabilityBlock` | `auth:sanctum,auth.owner` | Create blackout availability block |
| **DELETE** | `/api/v1/owner/properties/{id}/availability-blocks/{bId}` | `OwnerAvailabilityBlockController@destroy` | `OwnerApi.cancelAvailabilityBlock` | `auth:sanctum,auth.owner` | Cancel blackout availability block |
| **GET** | `/api/v1/owner/properties/{id}/media` | `OwnerMediaController@index` | `OwnerApi.getMedia` | `auth:sanctum,auth.owner` | List property media & covers |
| **POST** | `/api/v1/owner/properties/{id}/media` | `OwnerMediaController@store` | `ApiClient.post` | `auth:sanctum,auth.owner` | Upload property photograph |
| **DELETE** | `/api/v1/owner/properties/{id}/media/{mId}` | `OwnerMediaController@destroy` | `OwnerApi.deleteMedia` | `auth:sanctum,auth.owner` | Remove property photograph |
| **GET** | `/api/v1/owner/properties/{id}/amenities` | `OwnerAmenityController@index` | `OwnerApi.getAmenities` | `auth:sanctum,auth.owner` | List amenities & catalog |
| **POST** | `/api/v1/owner/properties/{id}/amenities` | `OwnerAmenityController@store` | `OwnerApi.assignAmenity` | `auth:sanctum,auth.owner` | Assign amenity to property |
| **GET** | `/api/v1/owner/reservations` | `OwnerReservationController@index` | `OwnerApi.getReservations` | `auth:sanctum,auth.owner` | Host bookings list |
| **GET** | `/api/v1/owner/reservations/{ref}` | `OwnerReservationController@show` | `OwnerApi.getReservation` | `auth:sanctum,auth.owner` | Host reservation details |
| **POST** | `/api/v1/owner/reservations/{ref}/allocate` | `OwnerRoomController@allocate` | `OwnerApi.allocateRoom` | `auth:sanctum,auth.owner` | Physical room assignment |
| **POST** | `/api/v1/owner/reservations/{ref}/check-in` | `OwnerReservationController@checkIn` | `OwnerApi.checkInReservation` | `auth:sanctum,auth.owner` | Guest check-in & key handover |
| **POST** | `/api/v1/owner/reservations/{ref}/check-out`| `OwnerReservationController@checkOut`| `OwnerApi.checkOutReservation`| `auth:sanctum,auth.owner` | Guest check-out & turnover |
| **GET** | `/api/v1/owner/reviews` | `OwnerReviewController@index` | `OwnerApi.getReviews` | `auth:sanctum,auth.owner` | Property guest reviews list |
| **POST** | `/api/v1/owner/reviews/{id}/response`| `OwnerReviewController@respond` | `OwnerApi.replyToReview` | `auth:sanctum,auth.owner` | Host reply to guest review (2,500 chars) |
| **GET** | `/api/v1/owner/settlements` | `OwnerSettlementController@index` | `OwnerApi.getSettlements` | `auth:sanctum,auth.owner` | Financial settlement payouts |
| **GET** | `/api/v1/owner/settlements/summary` | `OwnerSettlementController@summary` | `OwnerApi.getFinancialSummary` | `auth:sanctum,auth.owner` | Earnings & payout totals |
| **GET** | `/api/v1/owner/profile` | `OwnerProfileController@show` | `OwnerApi.getProfile` | `auth:sanctum,auth.owner` | Host profile data |
| **PUT** | `/api/v1/owner/profile` | `OwnerProfileController@update` | `OwnerApi.updateProfile` | `auth:sanctum,auth.owner` | Host contact information update |
| **PUT** | `/api/v1/owner/password` | `OwnerProfileController@changePassword`| `OwnerApi.changePassword` | `auth:sanctum,auth.owner` | Host credentials update |
| **POST** | `/api/v1/owner/devices/register` | `OwnerDeviceController@register` | `Notifications.registerDevice`| `auth:sanctum,auth.owner` | Push notification token register |
| **DELETE** | `/api/v1/owner/devices/unregister` | `OwnerDeviceController@unregister` | `Notifications.unregisterDevice`| `auth:sanctum,auth.owner` | Push notification token unregister |
| **GET** | `/api/v1/owner/notifications` | `OwnerNotificationController@index` | `Notifications.getNotifications` | `auth:sanctum,auth.owner` | Notification inbox |
| **POST** | `/api/v1/owner/notifications/{id}/read` | `OwnerNotificationController@read` | `Notifications.markRead` | `auth:sanctum,auth.owner` | Mark notification read |
| **POST** | `/api/v1/owner/notifications/mark-all-read` | `OwnerNotificationController@markAllRead` | `Notifications.markAllRead` | `auth:sanctum,auth.owner` | Mark all notifications read |

---

## 2. Response Standard & Concurrency Locking Specification

All mobile API endpoints return structured JSON conforming to the standard wrapper:

```json
{
  "success": true,
  "message": "Human-readable status description",
  "data": { ... }
}
```

### Deterministic Concurrency Locking Order
To prevent deadlock cycles under high-concurrency booking and room allocation traffic across PostgreSQL and MySQL InnoDB engines, transactional actions adhere to strict hierarchical locking:
`Property -> PropertyRoomType -> Reservation -> PropertyRoom (sorted ascending by primary key ID)`
All date-interval checks verify overlaps against existing confirmed reservations and active host availability blocks.
