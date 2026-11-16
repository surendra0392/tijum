# TIJUM — API V1 CONTRACT AND SECURITY RECONCILIATION (PHASE 21)
## REST API V1 Route Inventory, Role Isolation, Schemas, Rate Limits & Mobile Compatibility

> **SUPERSEDED NOTICE:** As of the Booking Architecture Correction, TIJUM operates on an instant-confirmation, inventory-controlled booking model. Owner approval before payment has been removed. Reservations are automatically confirmed upon successful payment verification. See `docs/booking-architecture-correction/` for the authoritative architecture.

**Project:** TIJUM — Food-Inclusive Accommodation Marketplace  
**Phase:** 21  
**Date:** November 13, 2026  
**Auditor:** Senior Backend Architect & API Lead  

---

## 1. Registered API Route Inventory

A complete automated inspection of `routes/api.php` via `php artisan route:list --path=api/v1` confirmed exactly **59 registered endpoints** organized across 4 primary domains:

### 1.1 Public Marketplace (10 Routes)
| Method | URI | Route Name | Action Controller | Middleware |
|---|---|---|---|---|
| `GET` | `api/v1/public/config` | `api.v1.public.config` | `PublicConfigController` | `api` |
| `GET` | `api/v1/public/cities` | `api.v1.public.cities.index` | `PublicCityController@index` | `api` |
| `GET` | `api/v1/public/cities/{slug}` | `api.v1.public.cities.show` | `PublicCityController@show` | `api` |
| `GET` | `api/v1/public/properties` | `api.v1.public.properties.index` | `PublicPropertyController@index` | `api` |
| `GET` | `api/v1/public/properties/{slug}` | `api.v1.public.properties.show` | `PublicPropertyController@show` | `api` |
| `GET` | `api/v1/public/pages/{slug}` | `api.v1.public.pages.show` | `PublicContentController@page` | `api` |
| `GET` | `api/v1/public/blog` | `api.v1.public.blog.index` | `PublicContentController@blogIndex` | `api` |
| `GET` | `api/v1/public/blog/{slug}` | `api.v1.public.blog.show` | `PublicContentController@blogShow` | `api` |
| `GET` | `api/v1/public/faqs` | `api.v1.public.faqs` | `PublicContentController@faqs` | `api` |
| `GET` | `api/v1/public/banners` | `api.v1.public.banners` | `PublicContentController@banners` | `api` |

### 1.2 Customer Authentication (6 Routes)
| Method | URI | Route Name | Action Controller | Middleware |
|---|---|---|---|---|
| `POST` | `api/v1/auth/customer/register` | `api.v1.auth.customer.register` | `CustomerAuthController@register` | `api` |
| `POST` | `api/v1/auth/customer/login` | `api.v1.auth.customer.login` | `CustomerAuthController@login` | `api`, `throttle:5,1` |
| `POST` | `api/v1/auth/customer/logout` | `api.v1.auth.customer.logout` | `CustomerAuthController@logout` | `api`, `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/auth/customer/revoke-all` | `api.v1.auth.customer.revoke-all` | `CustomerAuthController@revokeAll` | `api`, `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/auth/customer/tokens` | `api.v1.auth.customer.tokens` | `CustomerAuthController@tokens` | `api`, `auth:sanctum`, `auth.customer` |
| `DELETE`| `api/v1/auth/customer/tokens/{tokenId}` | `api.v1.auth.customer.tokens.delete` | `CustomerAuthController@deleteToken` | `api`, `auth:sanctum`, `auth.customer` |

### 1.3 Owner / Partner Authentication (5 Routes)
| Method | URI | Route Name | Action Controller | Middleware |
|---|---|---|---|---|
| `POST` | `api/v1/auth/owner/login` | `api.v1.auth.owner.login` | `OwnerAuthController@login` | `api`, `throttle:5,1` |
| `POST` | `api/v1/auth/owner/logout` | `api.v1.auth.owner.logout` | `OwnerAuthController@logout` | `api`, `auth:sanctum`, `auth.owner` |
| `POST` | `api/v1/auth/owner/revoke-all` | `api.v1.auth.owner.revoke-all` | `OwnerAuthController@revokeAll` | `api`, `auth:sanctum`, `auth.owner` |
| `GET` | `api/v1/auth/owner/tokens` | `api.v1.auth.owner.tokens` | `OwnerAuthController@tokens` | `api`, `auth:sanctum`, `auth.owner` |
| `DELETE`| `api/v1/auth/owner/tokens/{tokenId}` | `api.v1.auth.owner.tokens.delete` | `OwnerAuthController@deleteToken` | `api`, `auth:sanctum`, `auth.owner` |

### 1.4 Customer Operations (23 Routes)
| Method | URI | Route Name | Action Controller | Middleware |
|---|---|---|---|---|
| `GET` | `api/v1/customer/profile` | `api.v1.customer.profile.show` | `CustomerProfileController@show` | `auth:sanctum`, `auth.customer` |
| `PUT` | `api/v1/customer/profile` | `api.v1.customer.profile.update` | `CustomerProfileController@update` | `auth:sanctum`, `auth.customer` |
| `PUT` | `api/v1/customer/password` | `api.v1.customer.password.update` | `CustomerProfileController@updatePassword` | `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/customer/reservations` | `api.v1.customer.reservations.index` | `CustomerReservationController@index` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/reservations` | `api.v1.customer.reservations.store` | `CustomerReservationController@store` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/reservations/quote/{property}` | `api.v1.customer.reservations.quote` | `CustomerReservationController@quote` | `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/customer/reservations/{reference}` | `api.v1.customer.reservations.show` | `CustomerReservationController@show` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/reservations/{reference}/cancel` | `api.v1.customer.reservations.cancel` | `CustomerReservationController@cancel` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/reservations/{reference}/payment/initiate` | `api.v1.customer.payment.initiate` | `CustomerPaymentController@initiate` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/reservations/{reference}/payment/verify` | `api.v1.customer.payment.verify` | `CustomerPaymentController@verify` | `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/customer/reservations/{reference}/payment/status` | `api.v1.customer.payment.status` | `CustomerPaymentController@status` | `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/customer/reviews` | `api.v1.customer.reviews.index` | `CustomerReviewController@index` | `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/customer/reviews/eligible` | `api.v1.customer.reviews.eligible` | `CustomerReviewController@eligible` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/reviews/{reference}` | `api.v1.customer.reviews.store` | `CustomerReviewController@store` | `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/customer/cases` | `api.v1.customer.cases.index` | `CustomerProtectionController@index` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/cases` | `api.v1.customer.cases.store` | `CustomerProtectionController@store` | `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/customer/cases/{reference}` | `api.v1.customer.cases.show` | `CustomerProtectionController@show` | `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/customer/notifications` | `api.v1.customer.notifications.index` | `CustomerNotificationController@index` | `auth:sanctum`, `auth.customer` |
| `GET` | `api/v1/customer/notifications/unread-count` | `api.v1.customer.notifications.unread-count` | `CustomerNotificationController@unreadCount` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/notifications/{id}/read` | `api.v1.customer.notifications.read` | `CustomerNotificationController@markRead` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/notifications/mark-all-read` | `api.v1.customer.notifications.mark-all-read` | `CustomerNotificationController@markAllRead` | `auth:sanctum`, `auth.customer` |
| `POST` | `api/v1/customer/devices/register` | `api.v1.customer.devices.register` | `CustomerDeviceController@register` | `auth:sanctum`, `auth.customer` |
| `DELETE`| `api/v1/customer/devices/unregister` | `api.v1.customer.devices.unregister` | `CustomerDeviceController@unregister` | `auth:sanctum`, `auth.customer` |

### 1.5 Owner / Partner Operations (15 Routes)
| Method | URI | Route Name | Action Controller | Middleware |
|---|---|---|---|---|
| `GET` | `api/v1/owner/dashboard` | `api.v1.owner.dashboard` | `OwnerDashboardController` | `auth:sanctum`, `auth.owner` |
| `GET` | `api/v1/owner/properties` | `api.v1.owner.properties.index` | `OwnerPropertyController@index` | `auth:sanctum`, `auth.owner` |
| `GET` | `api/v1/owner/properties/{id}` | `api.v1.owner.properties.show` | `OwnerPropertyController@show` | `auth:sanctum`, `auth.owner` |
| `GET` | `api/v1/owner/reservations` | `api.v1.owner.reservations.index` | `OwnerReservationController@index` | `auth:sanctum`, `auth.owner` |
| `GET` | `api/v1/owner/reservations/{reference}` | `api.v1.owner.reservations.show` | `OwnerReservationController@show` | `auth:sanctum`, `auth.owner` |
| `POST` | `api/v1/owner/reservations/{reference}/accept` | `api.v1.owner.reservations.accept` | `OwnerReservationController@accept` | `auth:sanctum`, `auth.owner` |
| `POST` | `api/v1/owner/reservations/{reference}/decline` | `api.v1.owner.reservations.decline` | `OwnerReservationController@decline` | `auth:sanctum`, `auth.owner` |
| `GET` | `api/v1/owner/financial/summary` | `api.v1.owner.financial.summary` | `OwnerFinancialController@summary` | `auth:sanctum`, `auth.owner` |
| `GET` | `api/v1/owner/financial/settlements` | `api.v1.owner.financial.settlements` | `OwnerFinancialController@settlements` | `auth:sanctum`, `auth.owner` |
| `GET` | `api/v1/owner/notifications` | `api.v1.owner.notifications.index` | `OwnerNotificationController@index` | `auth:sanctum`, `auth.owner` |
| `GET` | `api/v1/owner/notifications/unread-count` | `api.v1.owner.notifications.unread-count` | `OwnerNotificationController@unreadCount` | `auth:sanctum`, `auth.owner` |
| `POST` | `api/v1/owner/notifications/{id}/read` | `api.v1.owner.notifications.read` | `OwnerNotificationController@markRead` | `auth:sanctum`, `auth.owner` |
| `POST` | `api/v1/owner/notifications/mark-all-read` | `api.v1.owner.notifications.mark-all-read` | `OwnerNotificationController@markAllRead` | `auth:sanctum`, `auth.owner` |
| `POST` | `api/v1/owner/devices/register` | `api.v1.owner.devices.register` | `OwnerDeviceController@register` | `auth:sanctum`, `auth.owner` |
| `DELETE`| `api/v1/owner/devices/unregister` | `api.v1.owner.devices.unregister` | `OwnerDeviceController@unregister` | `auth:sanctum`, `auth.owner` |

---

## 2. API Security Reconciliation & Findings

1. **Role Middleware Enforcement:** All customer endpoints are protected by `EnsureCustomerToken`; all owner endpoints are protected by `EnsureOwnerToken`. Cross-actor token misuse is rejected with HTTP 403 `INVALID_ACCOUNT_TYPE`.
2. **Public Configuration Safety:** `GET /api/v1/public/config` returns strictly public settings (`app_name`, `currency_code: "INR"`, `standard_check_in: "09:00"`, `standard_check_out: "08:00"`). Zero server secrets, database credentials, or private provider keys are returned.
3. **Sensitive Field Exclusion:** `CustomerProfileResource` and `User` serialization exclude `password`, `remember_token`, `two_factor_secret`, and internal timestamps.
4. **Mobile Client Alignment:** Mobile API client (`apps/mobile/src/api/client.ts`) attaches `Authorization: Bearer <token>` and `X-Request-ID` headers to all requests. Automatic session purge is triggered on HTTP 401.
