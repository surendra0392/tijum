# TIJUM Phase 21B — Production API & Platform Release Verification Report

> **SUPERSEDED NOTICE:** As of the Booking Architecture Correction, TIJUM operates on an instant-confirmation, inventory-controlled booking model. Owner approval before payment has been removed. Reservations are automatically confirmed upon successful payment verification. See `docs/booking-architecture-correction/` for the authoritative architecture.

**Document ID:** `DOC-P21B-008`  
**Phase:** 21B — Final Technical Remediation & Release Readiness  
**Target Domains:** `api.tijum.com`, `tijum.com`, `staging.tijum.com`  
**Verification Method:** DNS resolution audit, SSL certificate check, routing analysis  
**Verification Date:** November 14, 2026  
**Status:** **RECONCILED & VERIFIED (Infrastructure Pending Provisioning)**

---

## 1. Executive Summary & Objective

In Phase 21A, `08_PRODUCTION_API_AND_SECURITY_ASSESSMENT.md` reported `https://api.tijum.com/api/v1/customer/profile` and `https://tijum.com/api/v1/owner/dashboard` as "Live Production / Verified Accessible" endpoints.

Phase 21B conducted an authoritative reachability and DNS audit from the host environment, proving that public DNS records do not yet resolve and SSL certificates are not yet provisioned. This report reconciles the documentation with the actual infrastructure status, ensuring that unprovisioned environments are marked honestly as **Pending Infrastructure Provisioning**.

---

## 2. Infrastructure & Reachability Audit

### 2.1 DNS Resolution Audit

| Hostname | DNS Query Type | Audit Command | Result | Status |
| :--- | :---: | :--- | :--- | :--- |
| **`api.tijum.com`** | A / CNAME | `Resolve-DnsName api.tijum.com` | `DNS_ERROR_RCODE_NAME_ERROR` (NXDOMAIN) | **Pending Infrastructure** |
| **`tijum.com`** | A / CNAME | `Resolve-DnsName tijum.com` | `DNS_ERROR_RCODE_NAME_ERROR` (NXDOMAIN) | **Pending Infrastructure** |
| **`staging.tijum.com`** | A / CNAME | `Resolve-DnsName staging.tijum.com` | `DNS_ERROR_RCODE_NAME_ERROR` (NXDOMAIN) | **Pending Infrastructure** |

### 2.2 Environment Status Reclassification

| Environment | Base URL | Routing & API Status | Public Accessibility | Reclassified Status |
| :--- | :--- | :--- | :--- | :--- |
| **Local / Test** | `http://tijum.test`<br>`http://127.0.0.1:8000` | All 63 `/api/v1/*` routes registered; Sanctum auth verified; rate limiters active | Localhost / Intranet | **Verified Functional** |
| **Staging** | `https://staging.tijum.com` | Application code deploy-ready; Nginx config drafted | Unreachable (No DNS/SSL) | **Pending Infrastructure Provisioning** |
| **Production** | `https://api.tijum.com`<br>`https://tijum.com` | Application code deploy-ready; Nginx config drafted | Unreachable (No DNS/SSL) | **Pending Infrastructure Provisioning** |

---

## 3. Verified API Route Inventory & Rate Limiting (`/api/v1/*`)

The versioned REST API registers exactly **63 routes** under `/api/v1/*` (`php artisan route:list --path=api/v1`).

### 3.1 Rate Limiting Architecture
Rate limiting is configured in `bootstrap/app.php` and `app/Providers/AppServiceProvider.php`:
1. **Public/Default API (`throttleApi()` / `api`):** 60 requests/minute per IP; 120 requests/minute for authenticated Sanctum users.
2. **Authentication Gateways (`throttle:api-auth`):** 10 requests/minute per email/IP for registration and login endpoints.
3. **Search & Exploration (`throttle:api-search`):** 120 requests/minute for search and catalog exploration endpoints.

### 3.2 Category-Grouped Route Counts (63 Routes Total)
- **Public Marketplace & Discovery (12 routes):** `/config`, `/categories`, `/cities`, `/cities/{slug}`, `/properties`, `/properties/{slug}`, `/banners`, `/blog`, `/blog/{slug}`, `/faqs`, `/pages/{slug}`.
- **Customer Authentication & Tokens (6 routes):** Register, Login, Logout, Revoke-All, Tokens Index, Delete Token.
- **Partner Authentication & Tokens (6 routes):** Register, Login, Logout, Revoke-All, Tokens Index, Delete Token.
- **Customer Profile & Devices (4 routes):** Profile Show, Profile Update, Password Update, Device Register/Unregister.
- **Customer Reservations & Payment (8 routes):** Reservations Index, Store, Show, Cancel, Quote, Payment Initiate, Status, Verify.
- **Customer Protection & Grievances (3 routes):** Cases Index, Store, Show.
- **Customer Reviews (3 routes):** Reviews Index, Eligible Reviews, Store Review.
- **Customer Wishlist (3 routes):** Wishlist Index, Toggle, Destroy.
- **Customer Notifications (4 routes):** Index, Read, Mark-All-Read, Unread-Count.
- **Owner Dashboard & Properties (3 routes):** Dashboard, Properties Index, Properties Show.
- **Owner Reservations (2 routes):** Reservations Index, Reservations Show (instant-booking model; legacy gatekeeper accept/decline eradicated).
- **Owner Financial & Settlements (2 routes):** Summary, Settlements Index.
- **Owner Notifications & Devices (6 routes):** Device Register/Unregister, Notifications Index, Read, Mark-All-Read, Unread-Count.

> **Full Route Specifications:** For exhaustive parameter definitions, payloads, and response contracts, consult `docs/TIJUM_API_V1_DOCUMENTATION.md` and `docs/accommodation-category-consolidation/07_API_ANALYTICS_AND_REPORTING_RECONCILIATION.md`.

---

## 4. Pre-Requisites for Live Domain Activation

Before transitioning `api.tijum.com` or `staging.tijum.com` to "Live", the following infrastructure steps must be executed:
1. **DNS Management:** Create `A` / `AAAA` or `CNAME` records in DNS provider (e.g. Cloudflare or AWS Route 53) pointing to target server IP.
2. **TLS / SSL Certificates:** Provision Let's Encrypt or managed SSL certificates for `tijum.com`, `api.tijum.com`, and `staging.tijum.com`.
3. **Web Server / Ingress:** Configure Nginx / Traefik reverse proxy to forward traffic to PHP-FPM / Laravel Octane.
4. **Environment Secrets:** Provision production `.env` with production `APP_KEY`, MySQL credentials, and Razorpay Live API keys.

---

## 5. Closure Conclusion

| Audit Item | Status | Verified Evidence |
| :--- | :--- | :--- |
| **Closure 07: API Routing & Reachability** | **VERIFIED COMPLETE** | Public DNS and reachability audited; unprovisioned environments honestly reclassified as Pending Infrastructure Provisioning |
