# TIJUM — Stay Easy. Eat Well. Spend Less.

[![PHP Version](https://img.shields.io/badge/PHP-8.5-777BB4?logo=php)](https://php.net)
[![Laravel Framework](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel)](https://laravel.com)
[![React Version](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Inertia.js](https://img.shields.io/badge/Inertia.js-v3-9553E9?logo=inertia)](https://inertiajs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite Engine](https://img.shields.io/badge/Vite-v8.3.5-646CFF?logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)

**TIJUM** is a modern accommodation aggregation and booking marketplace purpose-built for South Indian university and commercial hubs, currently active in **Hyderabad, Guntur, Vijayawada, and Visakhapatnam**. The platform connects students, trainees, remote workers, and traveling families with verified Hostels/PG, Homestays, and Co-Living spaces featuring transparent pricing, property-specific food arrangements, and instant confirmed bookings with zero broker fees.

---

## 🏛️ Core Architecture & Principles

### 1. Canonical Three-Category Taxonomy

All platform interfaces, database records, API payloads, and marketing touchpoints are strictly consolidated into **three canonical accommodation categories**:

- **Hostels/PG (`hostels-pg` / `hostel_pg`):** Structured hostel and paying-guest accommodations with study facilities, house rules, and flexible occupancy.
- **Homestays (`homestays` / `homestay`):** Residential home accommodations hosted directly by local homeowners featuring authentic home-style hospitality.
- **Co-Living (`co-living` / `coliving`):** Modern shared-living spaces for remote workers and young professionals with ergonomic workstations and community amenities.

### 2. Property-Specific Food Flags & Orthogonality

In compliance with ASCI and Consumer Protection truth-in-advertising guidelines, TIJUM completely eliminates blanket dining claims. Food offerings are **property-specific** and orthogonal to category classification:

- `food_provided`: Indicates general on-premise dining or canteen availability.
- `breakfast_included`: Morning meal covered in base room rate.
- `lunch_included`: Daytime meal covered in base room rate.
- `dinner_included`: Evening home-style meal covered in base room rate.

### 3. Modern Instant-Booking Engine

TIJUM operates on a non-gatekeeper instant booking architecture:

1. **15-Minute Inventory Hold:** Selecting an available room starts a temporary 15-minute inventory hold (`PropertyAvailabilityBlock`).
2. **Automatic Payment Confirmation:** Payment verification via Razorpay automatically transitions the booking to `ReservationStatus::Confirmed` without waiting for manual host gatekeeper approval.
3. **Room Allocation Fulfillment:** Property partners fulfill confirmed bookings by assigning specific physical rooms (`/owner/reservations/{reservation}/allocations`).

---

## 💻 Tech Stack

| Layer                       | Technologies                                                                                         |
| :-------------------------- | :--------------------------------------------------------------------------------------------------- |
| **Backend Framework**       | Laravel 12, PHP 8.5 (Constructor Promotion, Enums, Strict Types)                                     |
| **Database & Cache**        | MySQL 8.0 (InnoDB Row-Locking, Transactions), Redis / Database Cache                                 |
| **Authentication**          | Laravel Fortify (Email & Phone dual-identifier login, 2FA/TOTP), Laravel Sanctum (Mobile API tokens) |
| **Web Frontend**            | React 19, Inertia.js v3 (Standalone HTTP, Optimistic Rollback), Wayfinder                            |
| **Styling & Design Tokens** | Tailwind CSS v4, Lucide React, Radix UI, Official TIJUM Brand Palette                                |
| **Asset Compilation**       | Vite 8 (`v8.3.5` via Vite Plus Core `1.4.0` / Rolldown)                                              |
| **Mobile Application**      | React Native, Expo SDK 52, Expo Router v4, Expo SecureStore                                          |
| **Integrations**            | Razorpay Payment Gateway, WhatsApp Cloud API, Transactional SMS Gateway                              |

---

## 👥 Platform Portals & Security

### 1. Customer Experience (`/`, `/search`, `/dashboard`)

- **Dual-Identifier Auth:** Register and sign in using **Email OR Mobile Phone**, with SMS OTP verification.
- **Interactive Search & Map View:** Search with date/duration filters, gender preference (`Men`, `Women`, `Any/All`), and interactive map view with custom TIJUM price markers.
- **Wishlist & Property Comparison:** Save stays with one-tap heart toggle; compare up to 4 properties side-by-side in a persistent comparison drawer.
- **Customer Protection:** Statutory Grievance Redressal mechanism, relocation assistance, and review submission for completed stays.

### 2. Partner Portal (`/owner`)

- **10-Field Partner Onboarding:** Streamlined property registration capturing Owner Name, Email, Mandatory Mobile Number, Property Name, Category, Gender Eligibility, City, Locality, Description, and Terms Acceptance.
- **Inventory & Pricing:** Manage room types, daily/weekly/monthly rates, property-specific meal inclusions, and blackout dates.
- **Stay Fulfillment:** Real-time confirmed booking notifications and physical room assignment.
- **Financial Settlements:** Track net payouts, commissions, and double-entry ledger summaries.

### 3. Administrator Console (`/admin`)

- **Role-Based Access Control (RBAC):** Exactly 5 canonical `AdminRole` enum roles:
    1. `SuperAdmin`: Unrestricted root platform management.
    2. `PropertyVerification`: Verification applications, document checks, property approvals.
    3. `Operations`: Booking oversight, status overrides, marketing campaigns, content publishing.
    4. `Finance`: Payout releases, commission reconciliation, refund processing.
    5. `CustomerSupport`: Grievance resolution, customer tickets, relocation subsidies.
- **Security:** Mandatory TOTP Two-Factor Authentication, strict IP audit logging, and automated session revocation.

---

## 🚀 Getting Started

### Prerequisites

- **PHP:** `^8.4` with `bcmath`, `curl`, `mbstring`, `pdo_mysql`, `sodium`, `zip`
- **Composer:** `^2.8`
- **Node.js:** `^22.0.0` & **npm:** `^10.0`
- **MySQL:** `^8.0`

### Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/tijum/tijum.git
    cd tijum
    ```

2. **Install PHP and Node dependencies:**

    ```bash
    composer install
    npm install
    ```

3. **Configure environment:**

    ```bash
    cp .env.example .env
    php artisan key:generate
    ```

    _Update database credentials (`DB_DATABASE=tijum`, `DB_USERNAME`, `DB_PASSWORD`) and payment secrets in `.env`._

4. **Run migrations and reference seeders:**

    ```bash
    php artisan migrate
    php artisan db:seed --class=PropertyCategorySeeder
    php artisan db:seed --class=CitySeeder
    php artisan db:seed --class=AmenityCatalogueSeeder
    php artisan db:seed --class=CategoryRedirectSeeder
    ```

5. **Generate Wayfinder typed route bindings:**

    ```bash
    php artisan wayfinder:generate
    ```

6. **Start local development servers:**
    ```bash
    # Run all processes concurrently (Web server, queue worker, and Vite bundler)
    composer run dev
    ```
    _Visit `http://127.0.0.1:8000` in your browser._

---

## 🧪 Testing & Quality Assurance

TIJUM enforces automated regression testing and strict static analysis across all layers:

```bash
# Run full PHPUnit test suite (SQLite in-memory)
php artisan test --compact

# Run dedicated feature suites
php artisan test tests/Feature/Categories/AccommodationCategoryConsolidationTest.php
php artisan test tests/Feature/AuthAndUx/CustomerAndPartnerAuthOverhaulTest.php
php artisan test tests/Feature/SeoAndMarketing/CategoryConsolidationContentAndRedirectsTest.php

# PHP Static Analysis (PHPStan Level 6)
vendor/bin/phpstan analyse

# Code Formatting (Laravel Pint)
vendor/bin/pint --format agent

# Web TypeScript Static Analysis
npm run types:check

# Web Frontend Lint & Code Quality
npm run check

# Mobile App Test Suite (apps/mobile)
npm test --prefix apps/mobile

# Mobile TypeScript Static Analysis
npm run types:check --prefix apps/mobile
```

---

## 📚 Master Documentation Catalogue

The platform features an authoritative, synchronized master documentation suite located in `docs/`:

### Master Architecture, Business & API Specifications (2026 Core Suite)

- 📋 [**Full Project Technical Audit Report**](docs/audit/TIJUM_FULL_PROJECT_AUDIT_REPORT.md) (`docs/audit/TIJUM_FULL_PROJECT_AUDIT_REPORT.md`): Complete inventory, category consolidation state, business invariant certifications, and QA test metrics.
- 🏛️ [**Platform Master Architecture**](docs/architecture/TIJUM_PLATFORM_MASTER_ARCHITECTURE.md) (`docs/architecture/TIJUM_PLATFORM_MASTER_ARCHITECTURE.md`): System topology, multi-guard session isolation, decoupled inventory, state machines, and mobile client architecture.
- 📜 [**Business Rules & Invariants**](docs/business/TIJUM_BUSINESS_RULES.md) (`docs/business/TIJUM_BUSINESS_RULES.md`): Authoritative 10-domain business rule book covering 3 categories, 09:00/08:00/07:00 rules, ₹0 early arrival fee, food flags, integer paise, and rewards.
- 🗄️ [**Database Schema & Dictionary**](docs/architecture/TIJUM_DATABASE_SCHEMA.md) (`docs/architecture/TIJUM_DATABASE_SCHEMA.md`): 88-migration ledger, table schemas, foreign keys, indexes, and integer paise storage.
- 🔌 [**REST API V1 Reference**](docs/api/TIJUM_API_REFERENCE.md) (`docs/api/TIJUM_API_REFERENCE.md`): Endpoints, request/response JSON contracts, validation rules, and error envelopes.
- 🗺️ [**API V1 Route Inventory**](docs/api/TIJUM_API_ROUTE_INVENTORY.md) (`docs/api/TIJUM_API_ROUTE_INVENTORY.md`): Comprehensive table of all 72 registered REST API endpoints.

### Phase & Functional Audit Archive

Indexed in [`docs/TIJUM_ACCOMMODATION_CATEGORY_CONSOLIDATION_INDEX.md`](docs/TIJUM_ACCOMMODATION_CATEGORY_CONSOLIDATION_INDEX.md):

| Reference  | Document                                                                                                                                                                   | Focus Scope                                                                    |
| :--------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **DOC-01** | [`01_ACCOMMODATION_CATEGORY_AUDIT_REPORT.md`](docs/accommodation-category-consolidation/01_ACCOMMODATION_CATEGORY_AUDIT_REPORT.md)                                         | Initial database, route, and legacy nomenclature audit.                        |
| **DOC-02** | [`02_CANONICAL_ACCOMMODATION_CATEGORY_ARCHITECTURE.md`](docs/accommodation-category-consolidation/02_CANONICAL_ACCOMMODATION_CATEGORY_ARCHITECTURE.md)                     | Official 3-category taxonomy, brand tokens, and design hierarchy.              |
| **DOC-03** | [`03_CATEGORY_DATABASE_MIGRATION_AND_DATA_RECONCILIATION.md`](docs/accommodation-category-consolidation/03_CATEGORY_DATABASE_MIGRATION_AND_DATA_RECONCILIATION.md)         | Forward-only database migrations and Eloquent enum mapping.                    |
| **DOC-06** | [`06_CONTENT_SEO_AND_MARKETING_RECONCILIATION.md`](docs/accommodation-category-consolidation/06_CONTENT_SEO_AND_MARKETING_RECONCILIATION.md)                               | Marketing copy, food flags, JSON-LD schemas, and 301 redirects.                |
| **DOC-07** | [`07_API_ANALYTICS_AND_REPORTING_RECONCILIATION.md`](docs/accommodation-category-consolidation/07_API_ANALYTICS_AND_REPORTING_RECONCILIATION.md)                           | Authoritative API V1 contract specifications and BI SQL metrics.               |
| **DOC-12** | [`12_FINAL_TECHNICAL_VERIFICATION_AND_ACCEPTANCE.md`](docs/accommodation-category-consolidation/12_FINAL_TECHNICAL_VERIFICATION_AND_ACCEPTANCE.md)                         | Safety reconciliation, 9-case food matrix, and snapshot preservation.          |
| **DOC-13** | [`13_AUTH_OVERHAUL_SEARCH_MAP_AND_UX_FEATURES.md`](docs/accommodation-category-consolidation/13_AUTH_OVERHAUL_SEARCH_MAP_AND_UX_FEATURES.md)                               | Legal pages (/terms, /privacy), dual auth, gender filters, and map view.       |
| **DOC-14** | [`14_CUSTOMER_PARTNER_AUTH_SEARCH_MAP_AUDIT_REPORT.md`](docs/accommodation-category-consolidation/14_CUSTOMER_PARTNER_AUTH_SEARCH_MAP_AUDIT_REPORT.md)                     | Audit certification for Customer & Partner Auth, Search Map, and Wishlist.     |
| **DOC-15** | [`15_OPENCODE_AUDIT_RESOLUTION_AND_PLATFORM_HARDENING_REPORT.md`](docs/accommodation-category-consolidation/15_OPENCODE_AUDIT_RESOLUTION_AND_PLATFORM_HARDENING_REPORT.md) | Comprehensive resolution report for High, Medium, and Low audit findings.      |
| **DOC-16** | [`16_COUPONS_REFERRALS_LOYALTY_POINTS_ARCHITECTURE_REPORT.md`](docs/accommodation-category-consolidation/16_COUPONS_REFERRALS_LOYALTY_POINTS_ARCHITECTURE_REPORT.md)       | Coupons, referrals (/r/{code}), loyalty points ledger, and promotion pipeline. |

---

## ⚖️ License

The TIJUM platform code and documentation are proprietary and confidential. Unauthorized copying, distribution, or commercial use is strictly prohibited. © 2026 TIJUM. All rights reserved.
