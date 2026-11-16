# TIJUM DATABASE SCHEMA & DATA DICTIONARY SPECIFICATION

**Document Reference:** `TIJUM-DB-V1.0-2026`  
**Database Engine:** MySQL 8.0 InnoDB (Strict SQL Mode)  
**Total Migrations:** 88 Migrations (Executed & Verified)  
**Monetary Standard:** All monetary amounts denominated in Integer Paise (`BIGINT` / `INT UNSIGNED`)  

---

## 1. MIGRATION LEDGER & ENGINE ARCHITECTURE

The TIJUM schema consists of 88 sequential migrations establishing normalized relational structures, strict foreign key constraints, composite performance indexes, and database-level invariants.

Key Engine Settings:
- `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
- `ENGINE=InnoDB` for all transactional tables supporting ACID row-level locking (`FOR UPDATE`).
- Cascading deletes are restricted on financial, reservation, and ledger tables.

---

## 2. CORE TABLE SPECIFICATIONS

### 2.1 Identity & Authentication Tables

#### `users` (Customer Accounts)
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `name`: `VARCHAR(255)`
- `email`: `VARCHAR(255) UNIQUE`
- `phone`: `VARCHAR(20) UNIQUE`
- `password`: `VARCHAR(255)`
- `referral_code`: `VARCHAR(32) UNIQUE` (Unique code used for inviting others)
- `referred_by_id`: `BIGINT UNSIGNED NULL` (Foreign key to `users.id`)
- `two_factor_secret`, `two_factor_recovery_codes`: 2FA authentication state
- `timestamps`: `created_at`, `updated_at`

#### `owners` (Partner / Property Host Accounts)
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `name`: `VARCHAR(255)`
- `email`: `VARCHAR(255) UNIQUE`
- `phone`: `VARCHAR(20) UNIQUE`
- `password`: `VARCHAR(255)`
- `business_name`: `VARCHAR(255) NULL`
- `verification_status`: `ENUM('unverified', 'pending', 'verified', 'rejected')`
- `razorpay_account_id`: `VARCHAR(255) NULL` (Linked Razorpay Route account)
- `timestamps`: `created_at`, `updated_at`

#### `admins` (Platform Operators)
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `name`: `VARCHAR(255)`
- `email`: `VARCHAR(255) UNIQUE`
- `role`: `ENUM('super_admin', 'support_agent', 'finance_officer', 'content_editor')`
- `password`: `VARCHAR(255)`
- `timestamps`: `created_at`, `updated_at`

---

### 2.2 Taxonomy & Geographic Tables

#### `categories` (Strictly 3 Canonical Categories)
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `name`: `VARCHAR(100)` (e.g., 'Hostels & PG', 'Homestays', 'Co-Living')
- `slug`: `VARCHAR(100) UNIQUE` (`hostels-pg`, `homestays`, `co-living`)
- `is_active`: `BOOLEAN DEFAULT TRUE`
- `display_order`: `INT DEFAULT 0`
- `timestamps`: `created_at`, `updated_at`

#### `cities`
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `name`: `VARCHAR(100)` (e.g., 'Hyderabad', 'Vijayawada', 'Visakhapatnam', 'Guntur')
- `slug`: `VARCHAR(100) UNIQUE`
- `state`: `VARCHAR(100)`
- `latitude`: `DECIMAL(10, 7) NULL`
- `longitude`: `DECIMAL(10, 7) NULL`
- `is_active`: `BOOLEAN DEFAULT TRUE`
- `display_order`: `INT DEFAULT 0`
- `timestamps`: `created_at`, `updated_at`

---

### 2.3 Property & Inventory Tables

#### `properties`
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `owner_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES owners(id)`)
- `category_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES categories(id)`)
- `city_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES cities(id)`)
- `name`: `VARCHAR(255)`
- `slug`: `VARCHAR(255) UNIQUE`
- `address`: `TEXT`
- `latitude`, `longitude`: `DECIMAL(10, 7)`
- `status`: `ENUM('draft', 'pending_verification', 'published', 'suspended')`
- `is_featured`: `BOOLEAN DEFAULT FALSE`
- `rating_average`: `DECIMAL(3, 2) DEFAULT 0.00`
- `rating_count`: `INT UNSIGNED DEFAULT 0`
- `timestamps`: `created_at`, `updated_at`

#### `room_types` (Sellable Tier Capacity)
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `property_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES properties(id) ON DELETE CASCADE`)
- `name`: `VARCHAR(150)` (e.g., 'Deluxe AC Single', 'Standard 4-Sharing')
- `base_price_minor`: `BIGINT UNSIGNED` (Base rate in paise)
- `capacity`: `INT UNSIGNED DEFAULT 1`
- `total_rooms`: `INT UNSIGNED DEFAULT 1` (Total physical room inventory)
- `meals_included`: `BOOLEAN DEFAULT FALSE`
- `breakfast_included`: `BOOLEAN DEFAULT FALSE`
- `lunch_included`: `BOOLEAN DEFAULT FALSE`
- `dinner_included`: `BOOLEAN DEFAULT FALSE`
- `kitchen_access`: `BOOLEAN DEFAULT FALSE`
- `timestamps`: `created_at`, `updated_at`

#### `rooms` (Physical Maintenance Units)
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `room_type_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES room_types(id) ON DELETE CASCADE`)
- `room_number`: `VARCHAR(50)`
- `floor`: `VARCHAR(20) NULL`
- `status`: `ENUM('clean', 'inspected', 'occupied', 'maintenance') DEFAULT 'clean'`
- `timestamps`: `created_at`, `updated_at`

---

### 2.4 Reservations & Pricing Tables

#### `reservations`
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `booking_reference`: `VARCHAR(32) UNIQUE` (e.g., `TIJUM-2026-XXXXX`)
- `user_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES users(id)`)
- `property_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES properties(id)`)
- `room_type_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES room_types(id)`)
- `room_id`: `BIGINT UNSIGNED NULL` (`FOREIGN KEY REFERENCES rooms(id)`) (Assigned by owner post-confirmation)
- `check_in_date`: `DATE`
- `check_out_date`: `DATE`
- `early_arrival_requested`: `BOOLEAN DEFAULT FALSE` (07:00 AM request flag; ₹0 surcharge)
- `status`: `ENUM('hold', 'awaiting_payment', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired')`
- `hold_expires_at`: `DATETIME NULL` (15-minute expiration lock)
- `base_amount_minor`: `BIGINT UNSIGNED` (Base tariff in paise)
- `tax_amount_minor`: `BIGINT UNSIGNED` (GST in paise)
- `discount_amount_minor`: `BIGINT UNSIGNED` (Coupons + Points discount in paise)
- `total_amount_minor`: `BIGINT UNSIGNED` (Net payable by customer in paise)
- `timestamps`: `created_at`, `updated_at`

---

### 2.5 Payments & Settlements Tables

#### `payments`
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `reservation_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES reservations(id)`)
- `transaction_reference`: `VARCHAR(100) UNIQUE`
- `gateway`: `ENUM('razorpay', 'cash') DEFAULT 'razorpay'`
- `gateway_order_id`: `VARCHAR(100) NULL`
- `gateway_payment_id`: `VARCHAR(100) NULL`
- `amount_minor`: `BIGINT UNSIGNED` (Amount paid in paise)
- `currency`: `VARCHAR(3) DEFAULT 'INR'`
- `status`: `ENUM('pending', 'captured', 'failed', 'refunded', 'partially_refunded')`
- `captured_at`: `DATETIME NULL`
- `timestamps`: `created_at`, `updated_at`

#### `settlements` (Partner Payouts)
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `owner_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES owners(id)`)
- `reference`: `VARCHAR(50) UNIQUE`
- `gross_amount_minor`: `BIGINT UNSIGNED` (Undiscounted partner base tariff in paise)
- `platform_fee_minor`: `BIGINT UNSIGNED` (TIJUM commission in paise)
- `tds_amount_minor`: `BIGINT UNSIGNED` (1% Section 194-O TDS in paise)
- `net_payout_minor`: `BIGINT UNSIGNED` (Transferred to partner in paise)
- `status`: `ENUM('pending', 'processing', 'completed', 'failed', 'on_hold')`
- `payout_channel`: `ENUM('razorpay_route', 'bank_transfer') DEFAULT 'razorpay_route'`
- `timestamps`: `created_at`, `updated_at`

---

### 2.6 Rewards & Loyalty Points Tables

#### `loyalty_wallets`
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `user_id`: `BIGINT UNSIGNED UNIQUE` (`FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE`)
- `balance_points`: `INT UNSIGNED DEFAULT 0` (Active redeemable points)
- `held_points`: `INT UNSIGNED DEFAULT 0` (Points locked in pending checkouts)
- `lifetime_earned`: `INT UNSIGNED DEFAULT 0`
- `lifetime_redeemed`: `INT UNSIGNED DEFAULT 0`
- `timestamps`: `created_at`, `updated_at`

#### `loyalty_points_ledger` (Double-entry Audit Trail)
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `wallet_id`: `BIGINT UNSIGNED` (`FOREIGN KEY REFERENCES loyalty_wallets(id)`)
- `points`: `INT` (Signed integer: positive for credits, negative for debits)
- `running_balance`: `INT UNSIGNED`
- `transaction_type`: `ENUM('earned_booking', 'earned_referral', 'redeemed_booking', 'hold_checkout', 'release_checkout', 'admin_adjustment', 'expired')`
- `reference_id`: `VARCHAR(100) NULL` (e.g., reservation reference or referral ID)
- `description`: `VARCHAR(255)`
- `timestamps`: `created_at`

#### `coupons`
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `code`: `VARCHAR(50) UNIQUE`
- `discount_type`: `ENUM('percentage', 'fixed_amount')`
- `discount_value`: `INT UNSIGNED` (% bps or paise)
- `max_discount_minor`: `BIGINT UNSIGNED NULL`
- `min_booking_minor`: `BIGINT UNSIGNED DEFAULT 0`
- `applicable_category_id`: `BIGINT UNSIGNED NULL` (`FOREIGN KEY REFERENCES categories(id)`)
- `applicable_city_id`: `BIGINT UNSIGNED NULL` (`FOREIGN KEY REFERENCES cities(id)`)
- `usage_limit_total`: `INT UNSIGNED NULL`
- `usage_limit_per_user`: `INT UNSIGNED DEFAULT 1`
- `valid_from`: `DATETIME`
- `valid_until`: `DATETIME`
- `is_active`: `BOOLEAN DEFAULT TRUE`
- `timestamps`: `created_at`, `updated_at`
