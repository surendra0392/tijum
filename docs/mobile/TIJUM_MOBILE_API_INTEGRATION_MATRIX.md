# TIJUM Mobile REST API Integration Matrix

**Document Reference:** `docs/mobile/TIJUM_MOBILE_API_INTEGRATION_MATRIX.md`  
**API Specification:** REST API V1 (`routes/api.php`)  
**Base URL:** `https://tijum.com/api/v1` (or local emulator host `http://10.0.2.2:8000/api/v1`)  
**Authentication Scheme:** Bearer Token (Laravel Sanctum)  
**Date:** November 20, 2026  
**Status:** **ACTIVE & CERTIFIED**

---

## 1. Complete Mobile API Endpoints Directory

| HTTP Method | API V1 Route | Controller Action | Mobile Client Method | Auth Guard | Description |
|---|---|---|---|---|---|
| **POST** | `/api/v1/auth/customer/login` | `CustomerAuthController@login` | `CustomerApi.login` | Guest | Customer credentials login |
| **POST** | `/api/v1/auth/customer/register` | `CustomerAuthController@register` | `CustomerApi.register` | Guest | Customer signup with phone normalization |
| **POST** | `/api/v1/auth/customer/forgot-password` | `ForgotPasswordController@customerForgotPassword` | `PublicApi.forgotPassword` | Guest (throttle) | Customer email password reset link |
| **POST** | `/api/v1/auth/customer/logout` | `CustomerAuthController@logout` | `CustomerApi.logout` | `auth:sanctum` | Customer token revocation |
| **POST** | `/api/v1/auth/owner/login` | `OwnerAuthController@login` | `OwnerApi.login` | Guest | Partner credentials login |
| **POST** | `/api/v1/auth/owner/register` | `OwnerAuthController@register` | `OwnerApi.register` | Guest | Partner onboarding registration |
| **POST** | `/api/v1/auth/owner/forgot-password` | `ForgotPasswordController@ownerForgotPassword` | `PublicApi.forgotPassword` | Guest (throttle) | Partner email password reset link |
| **POST** | `/api/v1/auth/owner/logout` | `OwnerAuthController@logout` | `OwnerApi.logout` | `auth:sanctum` | Partner token revocation |
| **GET** | `/api/v1/public/config` | `PublicConfigController@show` | `PublicApi.getConfig` | Guest | Currency & stay timing policy |
| **GET** | `/api/v1/public/cities` | `PublicCityController@index` | `PublicApi.getCities` | Guest | Active launch cities list |
| **GET** | `/api/v1/public/categories` | `PublicCategoryController@index` | `PublicApi.getCategories` | Guest | Canonical accommodation categories |
| **GET** | `/api/v1/public/properties` | `PublicPropertyController@index` | `PublicApi.getProperties` | Guest | Filtered property search feed |
| **GET** | `/api/v1/public/properties/{slug}` | `PublicPropertyController@show` | `PublicApi.getPropertyBySlug`| Guest | Property details, amenities, rooms |
| **POST** | `/api/v1/public/contact` | `PublicContactController@submit` | `PublicApi.submitContact` | Guest | Public contact inquiry form |
| **POST** | `/api/v1/customer/reservations/quote/{id}`| `CustomerReservationController@quote`| `CustomerApi.quoteReservation`| `auth:sanctum` | Booking pricing calculation |
| **POST** | `/api/v1/customer/reservations` | `CustomerReservationController@store`| `CustomerApi.createReservation`| `auth:sanctum` | 15-minute booking hold creation |
| **GET** | `/api/v1/customer/reservations` | `CustomerReservationController@index`| `CustomerApi.getReservations` | `auth:sanctum` | Customer reservations list |
| **GET** | `/api/v1/customer/reservations/{ref}` | `CustomerReservationController@show` | `CustomerApi.getReservation` | `auth:sanctum` | Customer reservation details |
| **POST** | `/api/v1/customer/reservations/{ref}/cancel`| `CustomerReservationController@cancel`| `CustomerApi.cancelReservation`| `auth:sanctum` | Customer cancellation |
| **POST** | `/api/v1/customer/payments/initiate` | `CustomerPaymentController@initiate` | `CustomerApi.initiatePayment`| `auth:sanctum` | Razorpay order creation |
| **POST** | `/api/v1/customer/payments/verify` | `CustomerPaymentController@verify` | `CustomerApi.verifyPayment` | `auth:sanctum` | Razorpay signature verification |
| **POST** | `/api/v1/customer/reviews/{ref}` | `CustomerReviewController@store` | `CustomerApi.submitReview` | `auth:sanctum` | 4-category stay review submission |
| **GET** | `/api/v1/customer/reviews/eligible` | `CustomerReviewController@eligible`| `CustomerApi.getEligibleReviews`| `auth:sanctum` | Completed stays eligible for review |
| **GET** | `/api/v1/customer/rewards/points` | `CustomerRewardsController@points` | `RewardsApi.getPoints` | `auth:sanctum` | FEFO loyalty points balance |
| **GET** | `/api/v1/customer/rewards/referrals` | `CustomerRewardsController@referrals`| `RewardsApi.getReferrals` | `auth:sanctum` | Referral code & status |
| **GET** | `/api/v1/customer/rewards/coupons` | `CustomerRewardsController@coupons`| `RewardsApi.getCoupons` | `auth:sanctum` | Active promotional coupons |
| **POST** | `/api/v1/customer/cases` | `CustomerProtectionController@store` | `CustomerApi.createCase` | `auth:sanctum` | Grievance ticket lodgement |
| **GET** | `/api/v1/customer/cases` | `CustomerProtectionController@index` | `CustomerApi.getCases` | `auth:sanctum` | Customer grievances list |
| **GET** | `/api/v1/owner/dashboard` | `OwnerDashboardController@index` | `OwnerApi.getDashboard` | `auth:sanctum` | Host operational KPIs |
| **GET** | `/api/v1/owner/properties` | `OwnerPropertyController@index` | `OwnerApi.getProperties` | `auth:sanctum` | Host listed properties |
| **GET** | `/api/v1/owner/properties/{id}/rooms` | `OwnerRoomController@rooms` | `OwnerApi.getPropertyRooms` | `auth:sanctum` | Physical rooms inventory |
| **GET** | `/api/v1/owner/reservations` | `OwnerReservationController@index` | `OwnerApi.getReservations` | `auth:sanctum` | Host bookings list |
| **GET** | `/api/v1/owner/reservations/{ref}` | `OwnerReservationController@show` | `OwnerApi.getReservation` | `auth:sanctum` | Host reservation details |
| **POST** | `/api/v1/owner/reservations/{ref}/check-in` | `OwnerReservationController@checkIn` | `OwnerApi.checkInReservation` | `auth:sanctum` | Guest arrival & key handover |
| **POST** | `/api/v1/owner/reservations/{ref}/check-out`| `OwnerReservationController@checkOut`| `OwnerApi.checkOutReservation`| `auth:sanctum` | Guest departure & turnover |
| **POST** | `/api/v1/owner/reservations/{ref}/allocate` | `OwnerRoomController@allocate` | `OwnerApi.allocateRoom` | `auth:sanctum` | Physical room assignment |
| **GET** | `/api/v1/owner/reviews` | `OwnerReviewController@index` | `OwnerApi.getReviews` | `auth:sanctum` | Property reviews list |
| **POST** | `/api/v1/owner/reviews/{id}/response`| `OwnerReviewController@respond` | `OwnerApi.respondToReview` | `auth:sanctum` | Host response to guest review |
| **POST** | `/api/v1/owner/profile` | `OwnerProfileController@update` | `OwnerApi.updateProfile` | `auth:sanctum` | Host contact information update|
| **POST** | `/api/v1/owner/password` | `OwnerProfileController@changePassword`| `OwnerApi.changePassword` | `auth:sanctum` | Host credentials update |

---

## 2. Error Response Specification

All mobile API endpoints return structured JSON conforming to the standard wrapper:

```json
{
  "success": false,
  "message": "Human-readable failure explanation",
  "error_code": "CANONICAL_ERROR_CODE",
  "errors": {
    "field_name": ["Specific validation error message"]
  }
}
```

HTTP status codes are strictly preserved:
- `401 Unauthorized`: Session expired; triggers mobile token refresh or re-authentication.
- `403 Forbidden`: Resource authorization failure (e.g., trying to allocate room on someone else's property).
- `404 Not Found`: Entity not found.
- `422 Unprocessable Entity`: Input validation failure.
- `429 Too Many Requests`: Rate limit reached.
- `500 / 502 / 503 Server Error`: Server exception; handled gracefully by `ApiClient` without crashing the React Native thread.
