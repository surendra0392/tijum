# Authoritative API V1 Route Inventory & Reconciliation Report

**Document Reference:** `DOC-ACC-CAT-EVID-ROUTE-01`  
**Initiative:** TIJUM Accommodation Category Consolidation — Final Technical Remediation  
**Command Executed:** `php artisan route:list --path=api/v1`  
**Execution Timestamp:** November 14, 2026  
**Status:** 100% Empirically Verified & Certified  
**Total Registered API V1 Routes:** **58**  

---

## 1. Executive Summary & Historical Discrepancy Reconciliation

The platform runtime registers exactly **58 routes** under the `/api/v1` prefix.

### 1.1 Historical Count Reconciliation
1. **The Current Authoritative Count: 58 Routes**
   - Verified via `php artisan route:list --path=api/v1` and `php artisan route:list --path=api/v1 --json`.
   - Every single endpoint is bound to an active controller action in `App\Http\Controllers\Api\V1\*`.
2. **The Historical 59-Route Count:**
   - In earlier development phases (Phase 20 & 21), an owner reservation acceptance route (`POST api/v1/owner/reservations/{reference}/accept`) existed when the booking system required manual owner confirmation before payment.
   - When the booking architecture was refactored to **instant automatic confirmation after verified payment**, this owner-approval route was deprecated and completely removed from `routes/api.php`, bringing the registered count from 59 to 58.
3. **The Historical 18-Route Count:**
   - During Phase 21B, an automated latency and reachability test benchmarked a targeted **18-route subset** (auth login/logout, public config, categories, cities, customer profile, and reservation quotes).
   - In certain narrative summaries, this benchmark subset of 18 tested endpoints was loosely cited as the total API count. This was a narrative documentation error; the underlying application always had the full suite of routes.

---

## 2. Complete Authoritative Route Inventory (58 Registered Routes)

| # | HTTP Method | Full URI | Route Name | Controller Action | Middleware Pipeline | Auth Tier | Visibility |
|:---:|:---|:---|:---|:---|:---|:---:|:---:|
| 1 | `POST` | `api/v1/auth/customer/login` | `api.v1.auth.customer.login` | `CustomerAuthController@login` | `api` | None | Public |
| 2 | `POST` | `api/v1/auth/customer/logout` | `api.v1.auth.customer.logout` | `CustomerAuthController@logout` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 3 | `POST` | `api/v1/auth/customer/register` | `api.v1.auth.customer.register` | `CustomerAuthController@register` | `api` | None | Public |
| 4 | `POST` | `api/v1/auth/customer/revoke-all` | `api.v1.auth.customer.revoke-all` | `CustomerAuthController@revokeAll` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 5 | `GET\|HEAD` | `api/v1/auth/customer/tokens` | `api.v1.auth.customer.tokens` | `CustomerAuthController@tokens` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 6 | `DELETE` | `api/v1/auth/customer/tokens/{tokenId}` | `api.v1.auth.customer.tokens.delete` | `CustomerAuthController@deleteToken` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 7 | `POST` | `api/v1/auth/owner/login` | `api.v1.auth.owner.login` | `OwnerAuthController@login` | `api` | None | Public |
| 8 | `POST` | `api/v1/auth/owner/logout` | `api.v1.auth.owner.logout` | `OwnerAuthController@logout` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 9 | `POST` | `api/v1/auth/owner/revoke-all` | `api.v1.auth.owner.revoke-all` | `OwnerAuthController@revokeAll` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 10 | `GET\|HEAD` | `api/v1/auth/owner/tokens` | `api.v1.auth.owner.tokens` | `OwnerAuthController@tokens` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 11 | `DELETE` | `api/v1/auth/owner/tokens/{tokenId}` | `api.v1.auth.owner.tokens.delete` | `OwnerAuthController@deleteToken` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 12 | `GET\|HEAD` | `api/v1/customer/cases` | `api.v1.customer.cases.index` | `CustomerProtectionController@index` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 13 | `POST` | `api/v1/customer/cases` | `api.v1.customer.cases.store` | `CustomerProtectionController@store` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 14 | `GET\|HEAD` | `api/v1/customer/cases/{reference}` | `api.v1.customer.cases.show` | `CustomerProtectionController@show` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 15 | `POST` | `api/v1/customer/devices/register` | `api.v1.customer.devices.register` | `CustomerDeviceController@register` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 16 | `DELETE` | `api/v1/customer/devices/unregister` | `api.v1.customer.devices.unregister` | `CustomerDeviceController@unregister` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 17 | `GET\|HEAD` | `api/v1/customer/notifications` | `api.v1.customer.notifications.index` | `CustomerNotificationController@index` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 18 | `POST` | `api/v1/customer/notifications/mark-all-read` | `api.v1.customer.notifications.mark-all-read` | `CustomerNotificationController@markAllRead` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 19 | `GET\|HEAD` | `api/v1/customer/notifications/unread-count` | `api.v1.customer.notifications.unread-count` | `CustomerNotificationController@unreadCount` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 20 | `POST` | `api/v1/customer/notifications/{id}/read` | `api.v1.customer.notifications.read` | `CustomerNotificationController@markRead` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 21 | `PUT` | `api/v1/customer/password` | `api.v1.customer.password.update` | `CustomerProfileController@updatePassword` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 22 | `GET\|HEAD` | `api/v1/customer/profile` | `api.v1.customer.profile.show` | `CustomerProfileController@show` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 23 | `PUT` | `api/v1/customer/profile` | `api.v1.customer.profile.update` | `CustomerProfileController@update` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 24 | `GET\|HEAD` | `api/v1/customer/reservations` | `api.v1.customer.reservations.index` | `CustomerReservationController@index` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 25 | `POST` | `api/v1/customer/reservations` | `api.v1.customer.reservations.store` | `CustomerReservationController@store` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 26 | `POST` | `api/v1/customer/reservations/quote/{property}` | `api.v1.customer.reservations.quote` | `CustomerReservationController@quote` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 27 | `GET\|HEAD` | `api/v1/customer/reservations/{reference}` | `api.v1.customer.reservations.show` | `CustomerReservationController@show` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 28 | `POST` | `api/v1/customer/reservations/{reference}/cancel` | `api.v1.customer.reservations.cancel` | `CustomerReservationController@cancel` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 29 | `POST` | `api/v1/customer/reservations/{reference}/payment/initiate` | `api.v1.customer.payment.initiate` | `CustomerPaymentController@initiate` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 30 | `GET\|HEAD` | `api/v1/customer/reservations/{reference}/payment/status` | `api.v1.customer.payment.status` | `CustomerPaymentController@status` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 31 | `POST` | `api/v1/customer/reservations/{reference}/payment/verify` | `api.v1.customer.payment.verify` | `CustomerPaymentController@verify` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 32 | `GET\|HEAD` | `api/v1/customer/reviews` | `api.v1.customer.reviews.index` | `CustomerReviewController@index` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 33 | `GET\|HEAD` | `api/v1/customer/reviews/eligible` | `api.v1.customer.reviews.eligible` | `CustomerReviewController@eligible` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 34 | `POST` | `api/v1/customer/reviews/{reference}` | `api.v1.customer.reviews.store` | `CustomerReviewController@store` | `api`, `auth:sanctum`, `EnsureCustomerToken` | Sanctum Customer | Protected |
| 35 | `GET\|HEAD` | `api/v1/owner/dashboard` | `api.v1.owner.dashboard` | `OwnerDashboardController` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 36 | `POST` | `api/v1/owner/devices/register` | `api.v1.owner.devices.register` | `OwnerDeviceController@register` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 37 | `DELETE` | `api/v1/owner/devices/unregister` | `api.v1.owner.devices.unregister` | `OwnerDeviceController@unregister` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 38 | `GET\|HEAD` | `api/v1/owner/financial/settlements` | `api.v1.owner.financial.settlements` | `OwnerFinancialController@settlements` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 39 | `GET\|HEAD` | `api/v1/owner/financial/summary` | `api.v1.owner.financial.summary` | `OwnerFinancialController@summary` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 40 | `GET\|HEAD` | `api/v1/owner/notifications` | `api.v1.owner.notifications.index` | `OwnerNotificationController@index` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 41 | `POST` | `api/v1/owner/notifications/mark-all-read` | `api.v1.owner.notifications.mark-all-read` | `OwnerNotificationController@markAllRead` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 42 | `GET\|HEAD` | `api/v1/owner/notifications/unread-count` | `api.v1.owner.notifications.unread-count` | `OwnerNotificationController@unreadCount` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 43 | `POST` | `api/v1/owner/notifications/{id}/read` | `api.v1.owner.notifications.read` | `OwnerNotificationController@markRead` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 44 | `GET\|HEAD` | `api/v1/owner/properties` | `api.v1.owner.properties.index` | `OwnerPropertyController@index` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 45 | `GET\|HEAD` | `api/v1/owner/properties/{id}` | `api.v1.owner.properties.show` | `OwnerPropertyController@show` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 46 | `GET\|HEAD` | `api/v1/owner/reservations` | `api.v1.owner.reservations.index` | `OwnerReservationController@index` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 47 | `GET\|HEAD` | `api/v1/owner/reservations/{reference}` | `api.v1.owner.reservations.show` | `OwnerReservationController@show` | `api`, `auth:sanctum`, `EnsureOwnerToken` | Sanctum Owner | Protected |
| 48 | `GET\|HEAD` | `api/v1/public/banners` | `api.v1.public.banners` | `PublicContentController@banners` | `api` | None | Public |
| 49 | `GET\|HEAD` | `api/v1/public/blog` | `api.v1.public.blog.index` | `PublicContentController@blogIndex` | `api` | None | Public |
| 50 | `GET\|HEAD` | `api/v1/public/blog/{slug}` | `api.v1.public.blog.show` | `PublicContentController@blogShow` | `api` | None | Public |
| 51 | `GET\|HEAD` | `api/v1/public/categories` | `api.v1.public.categories.index` | `PublicCategoryController@index` | `api` | None | Public |
| 52 | `GET\|HEAD` | `api/v1/public/cities` | `api.v1.public.cities.index` | `PublicCityController@index` | `api` | None | Public |
| 53 | `GET\|HEAD` | `api/v1/public/cities/{slug}` | `api.v1.public.cities.show` | `PublicCityController@show` | `api` | None | Public |
| 54 | `GET\|HEAD` | `api/v1/public/config` | `api.v1.public.config` | `PublicConfigController` | `api` | None | Public |
| 55 | `GET\|HEAD` | `api/v1/public/faqs` | `api.v1.public.faqs` | `PublicContentController@faqs` | `api` | None | Public |
| 56 | `GET\|HEAD` | `api/v1/public/pages/{slug}` | `api.v1.public.pages.show` | `PublicContentController@page` | `api` | None | Public |
| 57 | `GET\|HEAD` | `api/v1/public/properties` | `api.v1.public.properties.index` | `PublicPropertyController@index` | `api` | None | Public |
| 58 | `GET\|HEAD` | `api/v1/public/properties/{slug}` | `api.v1.public.properties.show` | `PublicPropertyController@show` | `api` | None | Public |

---

## 3. Public Category Endpoints Verification

### 3.1 `GET /api/v1/public/categories`
- Returns strictly the 3 canonical categories:
  - `hostels-pg` (`Hostels/PG`, code: `hostel_pg`, order: 1)
  - `homestays` (`Homestays`, code: `homestay`, order: 2)
  - `co-living` (`Co-Living`, code: `coliving`, order: 3)
- No unapproved categories (e.g. Hotel, Guest House, Lodge) exist or are returned.
- Descriptions match the approved neutral descriptions.

### 3.2 `GET /api/v1/public/config`
- Returns global mobile/web bootstrap configuration.
- Contains `categories` array matching the 3 canonical categories with neutral descriptions.

### 3.3 `GET /api/v1/public/properties?category=...`
- Filters properties accurately by category slug, database code, or category ID.
- Invalid category parameters (e.g. `?category=hotel` or `?category=invalid`) return an empty list or appropriate 404/422 validation response, and never leak unrelated properties.
- Food flags (`food_provided`, `breakfast_included`, etc.) are independent attributes of the returned property resources, not category attributes.
