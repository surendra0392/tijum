# TIJUM REST API V1 SPECIFICATION & DEVELOPER REFERENCE

**Document Reference:** `TIJUM-API-REF-V1.0-2026`  
**Base URL:** `https://tijum.com/api/v1` (Local dev: `http://tijum.test/api/v1`)  
**Protocol:** HTTPS | JSON Payloads (`Accept: application/json`, `Content-Type: application/json`)  
**Authentication:** Bearer Tokens via Laravel Sanctum  

---

## 1. GLOBAL STANDARDS & CONVENTIONS

### 1.1 Request Headers
```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer <sanctum_personal_access_token>
X-Device-Platform: android | ios | web
X-App-Version: 1.0.0
```

### 1.2 Response Envelope
All API V1 endpoints return standard response envelopes:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation message",
  "meta": { ... }
}
```

### 1.3 Error Structure
```json
{
  "success": false,
  "message": "Validation failed / Unauthorized / Not found",
  "errors": {
    "field_name": ["Specific validation error message"]
  },
  "error_code": "RESOURCE_NOT_FOUND | UNPROCESSABLE_ENTITY | RATE_LIMIT_EXCEEDED"
}
```

---

## 2. PUBLIC CATALOG & SEARCH APIS

### 2.1 Get Global Configuration
- **Endpoint:** `GET /public/config`
- **Auth:** None (Public)
- **Response:**
```json
{
  "success": true,
  "data": {
    "app_name": "TIJUM",
    "version": "1.0.0",
    "currency": "INR",
    "currency_symbol": "₹",
    "timing_rules": {
      "check_in": "09:00",
      "check_out": "08:00",
      "early_arrival": "07:00",
      "early_arrival_surcharge_paise": 0
    },
    "categories": [
      { "id": 1, "name": "Hostels & PG", "slug": "hostels-pg" },
      { "id": 2, "name": "Homestays", "slug": "homestays" },
      { "id": 3, "name": "Co-Living", "slug": "co-living" }
    ],
    "support_phone": "+91 80000 00000",
    "support_email": "support@tijum.com"
  }
}
```

### 2.2 Property Search & Filters
- **Endpoint:** `GET /public/properties`
- **Query Parameters:**
  - `city`: City ID or slug (e.g. `vijayawada`)
  - `category`: Category slug (`hostels-pg`, `homestays`, `co-living`)
  - `check_in`: Date (`YYYY-MM-DD`)
  - `check_out`: Date (`YYYY-MM-DD`)
  - `min_price`: Integer paise
  - `max_price`: Integer paise
  - `page`: Integer page number
- **Response:** Paginated list of property cards with image URLs, category badges, rating stats, and starting base rates.

---

## 3. CHECKOUT, PRICING QUOTE & RESERVATIONS

### 3.1 Quote Reservation Pricing
- **Endpoint:** `POST /customer/reservations/quote/{property}`
- **Payload:**
```json
{
  "room_type_id": 12,
  "check_in_date": "2026-12-01",
  "check_out_date": "2026-12-05",
  "guests_count": 2,
  "early_arrival_requested": true,
  "coupon_code": "WELCOME10",
  "redeem_points": 500
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "nights": 4,
    "gross_amount_minor": 800000,
    "coupon_discount_minor": 80000,
    "points_discount_minor": 50000,
    "points_redeemed": 500,
    "early_arrival_fee_minor": 0,
    "tax_amount_minor": 80400,
    "total_amount_minor": 750400,
    "currency": "INR"
  }
}
```

### 3.2 Create Reservation (Initiate Hold)
- **Endpoint:** `POST /customer/reservations`
- **Payload:**
```json
{
  "room_type_id": 12,
  "check_in_date": "2026-12-01",
  "check_out_date": "2026-12-05",
  "guests_count": 2,
  "early_arrival_requested": true,
  "guest_name": "Ravi Kumar",
  "guest_phone": "+919876543210",
  "coupon_code": "WELCOME10",
  "redeem_points": 500
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "booking_reference": "TIJUM-2026-928174",
    "status": "hold",
    "hold_expires_at": "2026-11-15T01:25:00Z",
    "payable_amount_minor": 750400
  }
}
```

### 3.3 Verify Payment (Automatic Confirmation)
- **Endpoint:** `POST /customer/reservations/{reference}/payment/verify`
- **Payload:**
```json
{
  "razorpay_order_id": "order_H7xK9l0PmNw",
  "razorpay_payment_id": "pay_K8vL2o0QnRz",
  "razorpay_signature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "booking_reference": "TIJUM-2026-928174",
    "status": "confirmed",
    "confirmed_at": "2026-11-15T01:12:00Z",
    "message": "Payment verified and booking confirmed instantly."
  }
}
```

---

## 4. REWARDS & LOYALTY POINTS APIS

### 4.1 Points Balance & Overview
- **Endpoint:** `GET /customer/rewards/overview`
- **Auth:** Sanctum (`role:customer`)
- **Response:**
```json
{
  "success": true,
  "data": {
    "balance_points": 1250,
    "held_points": 0,
    "lifetime_earned": 3500,
    "lifetime_redeemed": 2250,
    "point_value_inr": 1.0,
    "referral_code": "TIJUM-RAVI99",
    "total_referrals": 4,
    "completed_referrals": 3
  }
}
```

### 4.2 Points Ledger
- **Endpoint:** `GET /customer/rewards/points/ledger`
- **Auth:** Sanctum (`role:customer`)
- **Response:** Double-entry list of points credits, debits, and unexpired balances.
