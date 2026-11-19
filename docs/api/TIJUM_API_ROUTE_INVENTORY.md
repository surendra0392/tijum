# TIJUM API V1 COMPLETE ROUTE INVENTORY

**Document Reference:** `TIJUM-API-INVENTORY-V1.0-2026`  
**Status:** Authoritative / Verified Against Route Table  
**Total Registered Routes:** 78 Active Endpoints  
**Base URL:** `/api/v1`  
**Authentication Scheme:** Bearer Token via Laravel Sanctum (Custom abilities `role:customer` & `role:owner`)  

---

## 1. COMPLETE 78-ROUTE INVENTORY TABLE

| # | HTTP Method | Path | Route Name | Controller Action | Auth Guard / Ability | Rate Limit |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PUBLIC CATALOG & CMS (12 ROUTES)** |
| 1 | `GET` | `/api/v1/public/config` | `api.v1.public.config` | `PublicConfigController` | None (Public) | 60/min |
| 2 | `GET` | `/api/v1/public/cities` | `api.v1.public.cities.index` | `PublicCityController@index` | None (Public) | 60/min |
| 3 | `GET` | `/api/v1/public/cities/{slug}` | `api.v1.public.cities.show` | `PublicCityController@show` | None (Public) | 60/min |
| 4 | `GET` | `/api/v1/public/categories` | `api.v1.public.categories.index` | `PublicCategoryController@index` | None (Public) | 60/min |
| 5 | `GET` | `/api/v1/public/properties` | `api.v1.public.properties.index` | `PublicPropertyController@index` | None (Public) | 60/min |
| 6 | `GET` | `/api/v1/public/properties/{slug}`| `api.v1.public.properties.show` | `PublicPropertyController@show` | None (Public) | 60/min |
| 7 | `GET` | `/api/v1/public/banners` | `api.v1.public.banners` | `PublicContentController@banners` | None (Public) | 60/min |
| 8 | `GET` | `/api/v1/public/faqs` | `api.v1.public.faqs` | `PublicContentController@faqs` | None (Public) | 60/min |
| 9 | `GET` | `/api/v1/public/pages/{slug}` | `api.v1.public.pages.show` | `PublicContentController@page` | None (Public) | 60/min |
| 10 | `GET` | `/api/v1/public/blog` | `api.v1.public.blog.index` | `PublicContentController@blogIndex` | None (Public) | 60/min |
| 11 | `GET` | `/api/v1/public/blog/{slug}` | `api.v1.public.blog.show` | `PublicContentController@blogShow` | None (Public) | 60/min |
| 12 | `POST` | `/api/v1/public/contact` | `api.v1.public.contact` | `PublicContentController@contact` | None (Public) | 30/min |
| **AUTHENTICATION SERVICES (12 ROUTES)** |
| 12 | `POST` | `/api/v1/auth/customer/login` | `api.v1.auth.customer.login` | `CustomerAuthController@login` | None | 10/min |
| 13 | `POST` | `/api/v1/auth/customer/register` | `api.v1.auth.customer.register` | `CustomerAuthController@register` | None | 5/min |
| 14 | `POST` | `/api/v1/auth/customer/logout` | `api.v1.auth.customer.logout` | `CustomerAuthController@logout` | `sanctum` (`role:customer`) | 60/min |
| 15 | `POST` | `/api/v1/auth/customer/revoke-all`| `api.v1.auth.customer.revoke-all` | `CustomerAuthController@revokeAll` | `sanctum` (`role:customer`) | 10/min |
| 16 | `GET` | `/api/v1/auth/customer/tokens` | `api.v1.auth.customer.tokens` | `CustomerAuthController@tokens` | `sanctum` (`role:customer`) | 60/min |
| 17 | `DELETE`| `/api/v1/auth/customer/tokens/{id}`| `api.v1.auth.customer.tokens.delete`| `CustomerAuthController@deleteToken` | `sanctum` (`role:customer`) | 60/min |
| 18 | `POST` | `/api/v1/auth/owner/login` | `api.v1.auth.owner.login` | `OwnerAuthController@login` | None | 10/min |
| 19 | `POST` | `/api/v1/auth/owner/register` | `api.v1.auth.owner.register` | `OwnerAuthController@register` | None | 5/min |
| 20 | `POST` | `/api/v1/auth/owner/logout` | `api.v1.auth.owner.logout` | `OwnerAuthController@logout` | `sanctum` (`role:owner`) | 60/min |
| 21 | `POST` | `/api/v1/auth/owner/revoke-all` | `api.v1.auth.owner.revoke-all` | `OwnerAuthController@revokeAll` | `sanctum` (`role:owner`) | 10/min |
| 22 | `GET` | `/api/v1/auth/owner/tokens` | `api.v1.auth.owner.tokens` | `OwnerAuthController@tokens` | `sanctum` (`role:owner`) | 60/min |
| 23 | `DELETE`| `/api/v1/auth/owner/tokens/{id}` | `api.v1.auth.owner.tokens.delete` | `OwnerAuthController@deleteToken` | `sanctum` (`role:owner`) | 60/min |
| **CUSTOMER ACCOUNT & DEVICES (5 ROUTES)** |
| 24 | `GET` | `/api/v1/customer/profile` | `api.v1.customer.profile.show` | `CustomerProfileController@show` | `sanctum` (`role:customer`) | 60/min |
| 25 | `PUT` | `/api/v1/customer/profile` | `api.v1.customer.profile.update` | `CustomerProfileController@update` | `sanctum` (`role:customer`) | 30/min |
| 26 | `PUT` | `/api/v1/customer/password` | `api.v1.customer.password.update` | `CustomerProfileController@updatePassword`| `sanctum` (`role:customer`)| 10/min |
| 27 | `POST` | `/api/v1/customer/devices/register` | `api.v1.customer.devices.register` | `CustomerDeviceController@register`| `sanctum` (`role:customer`) | 60/min |
| 28 | `DELETE`| `/api/v1/customer/devices/unregister`| `api.v1.customer.devices.unregister`| `CustomerDeviceController@unregister`| `sanctum` (`role:customer`)| 60/min |
| **CUSTOMER WISHLIST (4 ROUTES)** |
| 29 | `GET` | `/api/v1/customer/wishlist` | `api.v1.customer.wishlist.index` | `CustomerWishlistController@index` | `sanctum` (`role:customer`) | 60/min |
| 30 | `POST` | `/api/v1/customer/wishlist/{property}` | `api.v1.customer.wishlist.store` | `CustomerWishlistController@store` | `sanctum` (`role:customer`) | 60/min |
| 31 | `DELETE`| `/api/v1/customer/wishlist/{property}` | `api.v1.customer.wishlist.destroy`| `CustomerWishlistController@destroy`| `sanctum` (`role:customer`)| 60/min |
| 32 | `POST` | `/api/v1/customer/wishlist/{property}/toggle`| `api.v1.customer.wishlist.toggle`| `CustomerWishlistController@toggle`| `sanctum` (`role:customer`)| 60/min |
| **REWARDS, COUPONS & LOYALTY (8 ROUTES)** |
| 33 | `POST` | `/api/v1/checkout/quote-promotions` | `api.v1.checkout.quote-promotions` | `CustomerRewardsController@quote` | `sanctum` (`role:customer`) | 60/min |
| 34 | `GET` | `/api/v1/customer/coupons` | `api.v1.customer.coupons.index` | `CustomerRewardsController@coupons`| `sanctum` (`role:customer`) | 60/min |
| 35 | `POST` | `/api/v1/customer/coupons/validate` | `api.v1.customer.coupons.validate` | `CustomerRewardsController@validateCoupon`| `sanctum` (`role:customer`)| 60/min |
| 36 | `GET` | `/api/v1/customer/rewards/overview` | `api.v1.customer.rewards.overview` | `CustomerRewardsController@overview`| `sanctum` (`role:customer`)| 60/min |
| 37 | `GET` | `/api/v1/customer/rewards/points` | `api.v1.customer.rewards.points` | `CustomerRewardsController@points` | `sanctum` (`role:customer`) | 60/min |
| 38 | `GET` | `/api/v1/customer/rewards/points/ledger`| `api.v1.customer.rewards.points.ledger`| `CustomerRewardsController@ledger`| `sanctum` (`role:customer`)| 60/min |
| 39 | `POST` | `/api/v1/customer/rewards/quote` | `api.v1.customer.rewards.quote` | `CustomerRewardsController@quote` | `sanctum` (`role:customer`) | 60/min |
| 40 | `GET` | `/api/v1/customer/rewards/referrals` | `api.v1.customer.rewards.referrals` | `CustomerRewardsController@referrals`| `sanctum` (`role:customer`)| 60/min |
| **RESERVATIONS & PAYMENTS (8 ROUTES)** |
| 41 | `POST` | `/api/v1/customer/reservations/quote/{property}` | `api.v1.customer.reservations.quote` | `CustomerReservationController@quote` | None / Optional Sanctum | 60/min |
| 42 | `GET` | `/api/v1/customer/reservations` | `api.v1.customer.reservations.index` | `CustomerReservationController@index` | `sanctum` (`role:customer`) | 60/min |
| 43 | `POST` | `/api/v1/customer/reservations` | `api.v1.customer.reservations.store` | `CustomerReservationController@store` | `sanctum` (`role:customer`) | 20/min |
| 44 | `GET` | `/api/v1/customer/reservations/{reference}` | `api.v1.customer.reservations.show` | `CustomerReservationController@show` | `sanctum` (`role:customer`) | 60/min |
| 45 | `POST` | `/api/v1/customer/reservations/{reference}/cancel` | `api.v1.customer.reservations.cancel` | `CustomerReservationController@cancel` | `sanctum` (`role:customer`) | 20/min |
| 46 | `POST` | `/api/v1/customer/reservations/{ref}/payment/initiate`| `api.v1.customer.payment.initiate` | `CustomerReservationController@initiatePayment`| `sanctum` (`role:customer`)| 30/min |
| 47 | `GET` | `/api/v1/customer/reservations/{ref}/payment/status` | `api.v1.customer.payment.status` | `CustomerReservationController@paymentStatus` | `sanctum` (`role:customer`)| 60/min |
| 48 | `POST` | `/api/v1/customer/reservations/{ref}/payment/verify` | `api.v1.customer.payment.verify` | `CustomerReservationController@verifyPayment` | `sanctum` (`role:customer`)| 30/min |
| **REVIEWS & GRIEVANCES (6 ROUTES)** |
| 49 | `GET` | `/api/v1/customer/reviews` | `api.v1.customer.reviews.index` | `CustomerReviewController@index` | `sanctum` (`role:customer`) | 60/min |
| 50 | `GET` | `/api/v1/customer/reviews/eligible` | `api.v1.customer.reviews.eligible` | `CustomerReviewController@eligible` | `sanctum` (`role:customer`) | 60/min |
| 51 | `POST` | `/api/v1/customer/reviews/{reference}` | `api.v1.customer.reviews.store` | `CustomerReviewController@store` | `sanctum` (`role:customer`) | 20/min |
| 52 | `GET` | `/api/v1/customer/cases` | `api.v1.customer.cases.index` | `CustomerProtectionController@index` | `sanctum` (`role:customer`) | 60/min |
| 53 | `POST` | `/api/v1/customer/cases` | `api.v1.customer.cases.store` | `CustomerProtectionController@store` | `sanctum` (`role:customer`) | 20/min |
| 54 | `GET` | `/api/v1/customer/cases/{reference}` | `api.v1.customer.cases.show` | `CustomerProtectionController@show` | `sanctum` (`role:customer`) | 60/min |
| **NOTIFICATIONS (4 ROUTES)** |
| 55 | `GET` | `/api/v1/customer/notifications` | `api.v1.customer.notifications.index` | `CustomerNotificationController@index` | `sanctum` (`role:customer`) | 60/min |
| 56 | `GET` | `/api/v1/customer/notifications/unread-count` | `api.v1.customer.notifications.unread-count`| `CustomerNotificationController@unreadCount`| `sanctum` (`role:customer`)| 60/min |
| 57 | `POST` | `/api/v1/customer/notifications/{id}/read` | `api.v1.customer.notifications.read` | `CustomerNotificationController@markRead` | `sanctum` (`role:customer`) | 60/min |
| 58 | `POST` | `/api/v1/customer/notifications/mark-all-read` | `api.v1.customer.notifications.mark-all-read` | `CustomerNotificationController@markAllRead` | `sanctum` (`role:customer`) | 60/min |
| **OWNER PORTAL API (19 ROUTES)** |
| 59 | `GET` | `/api/v1/owner/profile` | `api.v1.owner.profile.show` | `OwnerProfileController@show` | `sanctum` (`role:owner`) | 60/min |
| 60 | `PUT` | `/api/v1/owner/profile` | `api.v1.owner.profile.update` | `OwnerProfileController@update` | `sanctum` (`role:owner`) | 30/min |
| 61 | `PUT` | `/api/v1/owner/password` | `api.v1.owner.password.update` | `OwnerProfileController@updatePassword` | `sanctum` (`role:owner`) | 10/min |
| 62 | `GET` | `/api/v1/owner/dashboard` | `api.v1.owner.dashboard` | `OwnerDashboardController` | `sanctum` (`role:owner`) | 60/min |
| 63 | `GET` | `/api/v1/owner/properties` | `api.v1.owner.properties.index` | `OwnerPropertyController@index` | `sanctum` (`role:owner`) | 60/min |
| 64 | `GET` | `/api/v1/owner/properties/{id}` | `api.v1.owner.properties.show` | `OwnerPropertyController@show` | `sanctum` (`role:owner`) | 60/min |
| 65 | `GET` | `/api/v1/owner/reservations` | `api.v1.owner.reservations.index` | `OwnerReservationController@index` | `sanctum` (`role:owner`) | 60/min |
| 66 | `GET` | `/api/v1/owner/reservations/{reference}` | `api.v1.owner.reservations.show` | `OwnerReservationController@show` | `sanctum` (`role:owner`) | 60/min |
| 67 | `POST` | `/api/v1/owner/reservations/{reference}/check-in` | `api.v1.owner.reservations.check-in` | `OwnerReservationController@checkIn` | `sanctum` (`role:owner`) | 30/min |
| 68 | `POST` | `/api/v1/owner/reservations/{reference}/check-out` | `api.v1.owner.reservations.check-out` | `OwnerReservationController@checkOut` | `sanctum` (`role:owner`) | 30/min |
| 69 | `GET` | `/api/v1/owner/financial/summary` | `api.v1.owner.financial.summary` | `OwnerFinancialController@summary` | `sanctum` (`role:owner`) | 60/min |
| 70 | `GET` | `/api/v1/owner/financial/settlements` | `api.v1.owner.financial.settlements` | `OwnerFinancialController@settlements` | `sanctum` (`role:owner`) | 60/min |
| 71 | `POST` | `/api/v1/owner/devices/register` | `api.v1.owner.devices.register` | `OwnerDeviceController@register` | `sanctum` (`role:owner`) | 60/min |
| 72 | `DELETE`| `/api/v1/owner/devices/unregister` | `api.v1.owner.devices.unregister` | `OwnerDeviceController@unregister` | `sanctum` (`role:owner`) | 60/min |
| 73 | `GET` | `/api/v1/owner/notifications` | `api.v1.owner.notifications.index` | `OwnerNotificationController@index` | `sanctum` (`role:owner`) | 60/min |
| 74 | `GET` | `/api/v1/owner/notifications/unread-count` | `api.v1.owner.notifications.unread-count` | `OwnerNotificationController@unreadCount` | `sanctum` (`role:owner`) | 60/min |
| 75 | `POST` | `/api/v1/owner/notifications/{id}/read` | `api.v1.owner.notifications.read` | `OwnerNotificationController@markRead` | `sanctum` (`role:owner`) | 60/min |
| 76 | `POST` | `/api/v1/owner/notifications/mark-all-read` | `api.v1.owner.notifications.mark-all-read` | `OwnerNotificationController@markAllRead` | `sanctum` (`role:owner`) | 60/min |
| 77 | `GET` | `/api/v1/customer/rewards/coupons` | `api.v1.customer.rewards.coupons` | `CustomerRewardsController@coupons` | `sanctum` (`role:customer`) | 60/min |

---
*Verified against Laravel Route Registrar: 78 routes active.*
