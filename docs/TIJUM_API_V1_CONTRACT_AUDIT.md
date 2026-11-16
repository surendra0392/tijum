# TIJUM API V1 Contract & Security Route Audit

**Phase:** Phase 20A — Mobile Stabilization, Framework Upgrade, Security Hardening & Production Readiness  
**Target URI Prefix:** `/api/v1/*`  
**Total Registered Routes:** Exactly 59 routes  
**Authentication Standard:** Laravel Sanctum Bearer Token (`personal_access_tokens`)  
**Currency Minor Unit Standard:** Indian Paise (100 Paise = ₹1.00 INR)

---

## 1. Executive Summary

As part of Phase 20A, all registered API endpoints under the `/api/v1` namespace were audited for architectural consistency, strict role isolation, route name conventions, rate limiting, and parameter integrity.

The audit verified:
1. **59 Active Registered Routes**: Exactly matching the design specifications across public, customer, and partner surfaces.
2. **Strict Cross-Tenant Isolation**: Verified by automated test suites. Customer tokens are barred from owner routes, and partner tokens are barred from customer routes.
3. **Zero Secrets Leakage**: Public endpoints expose no database credentials, payment gateway keys, or third-party notification secrets.
4. **Standardized Integer Arithmetic**: All financial values are communicated strictly in integer paise (`total_amount_paise`, `commission_amount_paise`, `owner_payable_paise`).

---

## 2. API V1 Route Registry (59 Routes)

### 2.1 Public Marketplace Endpoints (10 Routes)
Accessible without authentication.

| Method | Endpoint | Route Name | Controller & Action |
|---|---|---|---|
| `GET` | `/api/v1/public/config` | `api.v1.public.config` | `PublicConfigController` |
| `GET` | `/api/v1/public/cities` | `api.v1.public.cities.index` | `PublicCityController@index` |
| `GET` | `/api/v1/public/cities/{slug}` | `api.v1.public.cities.show` | `PublicCityController@show` |
| `GET` | `/api/v1/public/properties` | `api.v1.public.properties.index` | `PublicPropertyController@index` |
| `GET` | `/api/v1/public/properties/{slug}` | `api.v1.public.properties.show` | `PublicPropertyController@show` |
| `GET` | `/api/v1/public/pages/{slug}` | `api.v1.public.pages.show` | `PublicContentController@page` |
| `GET` | `/api/v1/public/blog` | `api.v1.public.blog.index` | `PublicContentController@blogIndex` |
| `GET` | `/api/v1/public/blog/{slug}` | `api.v1.public.blog.show` | `PublicContentController@blogShow` |
| `GET` | `/api/v1/public/faqs` | `api.v1.public.faqs` | `PublicContentController@faqs` |
| `GET` | `/api/v1/public/banners` | `api.v1.public.banners` | `PublicContentController@banners` |

---

### 2.2 Customer Authentication & Token Lifecycle (6 Routes)

| Method | Endpoint | Route Name | Controller & Action | Middleware |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/customer/register` | `api.v1.auth.customer.register` | `CustomerAuthController@register` | `throttle:6,1` |
| `POST` | `/api/v1/auth/customer/login` | `api.v1.auth.customer.login` | `CustomerAuthController@login` | `throttle:10,1` |
| `POST` | `/api/v1/auth/customer/logout` | `api.v1.auth.customer.logout` | `CustomerAuthController@logout` | `auth:sanctum`, `auth.customer` |
| `POST` | `/api/v1/auth/customer/revoke-all` | `api.v1.auth.customer.revoke-all` | `CustomerAuthController@revokeAll` | `auth:sanctum`, `auth.customer` |
| `GET` | `/api/v1/auth/customer/tokens` | `api.v1.auth.customer.tokens` | `CustomerAuthController@tokens` | `auth:sanctum`, `auth.customer` |
| `DELETE` | `/api/v1/auth/customer/tokens/{id}` | `api.v1.auth.customer.tokens.delete`| `CustomerAuthController@deleteToken` | `auth:sanctum`, `auth.customer` |

---

### 2.3 Partner / Host Authentication & Token Lifecycle (5 Routes)

| Method | Endpoint | Route Name | Controller & Action | Middleware |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/owner/login` | `api.v1.auth.owner.login` | `OwnerAuthController@login` | `throttle:10,1` |
| `POST` | `/api/v1/auth/owner/logout` | `api.v1.auth.owner.logout` | `OwnerAuthController@logout` | `auth:sanctum`, `auth.owner` |
| `POST` | `/api/v1/auth/owner/revoke-all` | `api.v1.auth.owner.revoke-all` | `OwnerAuthController@revokeAll` | `auth:sanctum`, `auth.owner` |
| `GET` | `/api/v1/auth/owner/tokens` | `api.v1.auth.owner.tokens` | `OwnerAuthController@tokens` | `auth:sanctum`, `auth.owner` |
| `DELETE` | `/api/v1/auth/owner/tokens/{id}` | `api.v1.auth.owner.tokens.delete` | `OwnerAuthController@deleteToken` | `auth:sanctum`, `auth.owner` |

---

### 2.4 Customer Authenticated Operations (19 Routes)
Protected by `auth:sanctum` and `auth.customer` (`EnsureCustomerToken`).

| Method | Endpoint | Route Name | Description |
|---|---|---|---|
| `GET` | `/api/v1/customer/profile` | `api.v1.customer.profile.show` | Read customer profile |
| `PUT` | `/api/v1/customer/profile` | `api.v1.customer.profile.update` | Update customer name, phone, consent |
| `PUT` | `/api/v1/customer/password` | `api.v1.customer.password.update` | Update customer account password |
| `GET` | `/api/v1/customer/reservations` | `api.v1.customer.reservations.index` | Paginated customer reservations list |
| `POST` | `/api/v1/customer/reservations/quote/{property}` | `api.v1.customer.reservations.quote` | Live pricing quote computation |
| `POST` | `/api/v1/customer/reservations` | `api.v1.customer.reservations.store` | Submit new stay reservation |
| `GET` | `/api/v1/customer/reservations/{reference}` | `api.v1.customer.reservations.show` | Inspect reservation details & countdown |
| `POST` | `/api/v1/customer/reservations/{ref}/cancel` | `api.v1.customer.reservations.cancel` | Customer-initiated booking cancellation |
| `POST` | `/api/v1/customer/reservations/{ref}/payment/order` | `api.v1.customer.reservations.payment.order` | Initiate Razorpay mobile order |
| `POST` | `/api/v1/customer/reservations/{ref}/payment/verify` | `api.v1.customer.reservations.payment.verify` | Verify Razorpay payment signature |
| `GET` | `/api/v1/customer/reservations/{ref}/payment/status` | `api.v1.customer.reservations.payment.status` | Check live payment confirmation |
| `GET` | `/api/v1/customer/reviews` | `api.v1.customer.reviews.index` | List customer's authored reviews |
| `POST` | `/api/v1/customer/reviews/{reservation}` | `api.v1.customer.reviews.store` | Submit verified stay review & ratings |
| `GET` | `/api/v1/customer/protection/grievances` | `api.v1.customer.protection.grievances.index` | Customer grievance cases list |
| `POST` | `/api/v1/customer/protection/grievances/{ref}` | `api.v1.customer.protection.grievances.store` | File food/condition grievance |
| `GET` | `/api/v1/customer/notifications` | `api.v1.customer.notifications.index` | In-app notification messages list |
| `POST` | `/api/v1/customer/notifications/{id}/read` | `api.v1.customer.notifications.read` | Mark individual notification as read |
| `POST` | `/api/v1/customer/devices/register` | `api.v1.customer.devices.register` | Register Expo push notification device |
| `DELETE` | `/api/v1/customer/devices/unregister` | `api.v1.customer.devices.unregister` | Unregister push device on logout |

---

### 2.5 Partner / Host Authenticated Operations (19 Routes)
Protected by `auth:sanctum` and `auth.owner` (`EnsureOwnerToken`).

| Method | Endpoint | Route Name | Description |
|---|---|---|---|
| `GET` | `/api/v1/owner/dashboard` | `api.v1.owner.dashboard` | Host command center operational metrics |
| `GET` | `/api/v1/owner/properties` | `api.v1.owner.properties.index` | Partner listed accommodations |
| `GET` | `/api/v1/owner/properties/{id}` | `api.v1.owner.properties.show` | Inspect property details and rooms |
| `GET` | `/api/v1/owner/reservations` | `api.v1.owner.reservations.index` | Filterable partner bookings list |
| `GET` | `/api/v1/owner/reservations/{reference}` | `api.v1.owner.reservations.show` | Inspect booking details and guest details |
| `POST` | `/api/v1/owner/reservations/{ref}/accept` | `api.v1.owner.reservations.accept` | Accept booking (locks room, starts timer) |
| `POST` | `/api/v1/owner/reservations/{ref}/decline` | `api.v1.owner.reservations.decline` | Decline booking with mandatory reason |
| `GET` | `/api/v1/owner/finances/summary` | `api.v1.owner.finances.summary` | Financial summary & lifetime earnings |
| `GET` | `/api/v1/owner/finances/settlements` | `api.v1.owner.finances.settlements` | Partner settlement statements ledger |
| `GET` | `/api/v1/owner/finances/settlements/{id}` | `api.v1.owner.finances.settlements.show` | Inspect settlement line items & UTR |
| `GET` | `/api/v1/owner/notifications` | `api.v1.owner.notifications.index` | Partner operational alerts inbox |
| `POST` | `/api/v1/owner/notifications/{id}/read` | `api.v1.owner.notifications.read` | Mark alert as read |
| `POST` | `/api/v1/owner/devices/register` | `api.v1.owner.devices.register` | Register host push notification device |
| `DELETE` | `/api/v1/owner/devices/unregister` | `api.v1.owner.devices.unregister` | Unregister host push device on logout |
| `GET` | `/api/v1/owner/profile` | `api.v1.owner.profile.show` | Read partner business profile |
| `PUT` | `/api/v1/owner/profile` | `api.v1.owner.profile.update` | Update partner contact details |
| `GET` | `/api/v1/owner/agreements` | `api.v1.owner.agreements.index` | Active marketplace commission terms |
| `GET` | `/api/v1/owner/calendar` | `api.v1.owner.calendar.index` | 30-day room-type occupancy calendar |
| `POST` | `/api/v1/owner/checkin/{ref}` | `api.v1.owner.checkin.record` | Record guest arrival check-in timestamp |

**Total Count Verification: 10 + 6 + 5 + 19 + 19 = 59 Routes.**
