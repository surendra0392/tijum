# TIJUM API Version 1.0 (REST) Specification

**Version:** 1.0.0  
**Base URL:** `https://tijum.test/api/v1` (Local: `http://localhost:8000/api/v1`)  
**Protocols:** HTTPS, JSON  
**Authentication:** Bearer Token (Laravel Sanctum Personal Access Tokens)  
**Timezone:** `Asia/Kolkata` (IST)  
**Currency:** Indian Rupee (`INR`, `₹`), calculated in integer paise internally  

---

## 1. Architectural Principles & Security Boundary

TIJUM adheres to a unified marketplace backend architecture: one authoritative Laravel backend serving both the web client (Inertia.js + React 19) and native mobile applications (React Native + Expo).

### Key Constraints & System Rules:
1. **No Bed-Based Inventory:** TIJUM manages inventory strictly at the **Property Room Type** level backed by physical room count (`PropertyRoom`). Neither the customer nor the mobile app selects physical room numbers or bed IDs.
2. **Dynamic Food Inclusions:** Food and meal inclusions are derived dynamically from property flags (`food_provided`, `breakfast_included`, `lunch_included`, `dinner_included`) with specific meal serving hours. Universal 3-meal assumptions are strictly forbidden.
3. **Stay Timing Policy:** Standard marketplace check-in is **09:00 AM** and checkout is **08:00 AM**. Early check-in (earliest permitted arrival **07:00 AM**) is subject to room-type availability and policy.
4. **Strict Token Segregation:**
   - Customer tokens (`User` model) are rejected by Partner/Owner endpoints with `403 Forbidden`.
   - Partner tokens (`Owner` model) are rejected by Customer endpoints with `403 Forbidden`.
   - Token-swapping attacks are blocked at framework middleware boundaries (`EnsureCustomerToken` and `EnsureOwnerToken`).
5. **Authoritative Payment Verification:** Mobile clients never confirm reservations directly. The mobile app initiates orders with the backend, opens Razorpay native checkout, and passes signatures back for backend-authoritative verification.

---

## 2. Standard Request & Response Envelope

All API responses return consistent JSON envelopes.

### Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully.",
  "meta": {
    "request_id": "9a7f34c2-6712-411a-82dc-df14728fca11",
    "timestamp": "2026-11-13T18:30:00+05:30",
    "current_page": 1,
    "last_page": 5,
    "total": 48
  }
}
```

### Error Response (`400`, `401`, `403`, `404`, `422`, `429`)
```json
{
  "success": false,
  "message": "The selected room type is not available for the requested stay duration.",
  "error_code": "CAPACITY_UNAVAILABLE",
  "errors": {
    "property_room_type_id": [
        "Capacity depleted for requested dates."
    ]
  },
  "meta": {
    "request_id": "9a7f34c2-6712-411a-82dc-df14728fca11",
    "timestamp": "2026-11-13T18:30:00+05:30"
  }
}
```

---

## 3. Authentication & Account Management

### 3.1 Customer Registration
- **Route:** `POST /api/v1/auth/customer/register`
- **Rate Limit:** 10 requests / min
- **Request Body:**
  ```json
  {
    "name": "Anya Rao",
    "email": "anya@example.test",
    "password": "Password123!",
    "password_confirmation": "Password123!",
    "phone": "+919876543210",
    "marketing_consent": true,
    "device_name": "iPhone 15 Pro"
  }
  ```
- **Response:** Returns Sanctum personal access token (30-day lifetime) and Customer profile.

### 3.2 Customer Login
- **Route:** `POST /api/v1/auth/customer/login`
- **Rate Limit:** 10 requests / min
- **Request Body:**
  ```json
  {
    "email": "anya@example.test",
    "password": "Password123!",
    "device_name": "iPhone 15 Pro"
  }
  ```

### 3.3 Partner / Host Login
- **Route:** `POST /api/v1/auth/owner/login`
- **Rate Limit:** 10 requests / min
- **Request Body:**
  ```json
  {
    "email": "host@property.test",
    "password": "PartnerPass123!",
    "device_name": "Partner iPad"
  }
  ```

### 3.4 Logout (Revoke Token)
- **Route:** `POST /api/v1/auth/customer/logout` or `POST /api/v1/auth/owner/logout`
- **Headers:** `Authorization: Bearer {token}`
- **Behavior:** Revokes and permanently deletes current active access token.

---

## 4. Public Marketplace Endpoints (Unauthenticated)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/public/config` | Global marketplace configuration, stay timing policy, currency, branding colors |
| `GET` | `/api/v1/public/cities` | List of operational South Indian cities (Hyderabad, Vijayawada, Vizag, Guntur) |
| `GET` | `/api/v1/public/properties` | Search & filter bookable properties (city, category, gender, duration, price) |
| `GET` | `/api/v1/public/properties/{slug}` | Comprehensive property detail, food schedule, room types, verified reviews |
| `GET` | `/api/v1/public/pages/{slug}` | Published CMS informational pages (About Us, Terms, Privacy, Safety) |
| `GET` | `/api/v1/public/faqs` | Published FAQ directory by category |
| `GET` | `/api/v1/public/blog` | Marketplace articles and local city guides |
| `GET` | `/api/v1/public/banners` | Active promotional and marketing banners |
| `POST` | `/api/v1/public/contact` | Customer inquiries and contact form submission with WhatsApp routing |

---

## 5. Customer Experience Endpoints (`auth:sanctum`, `auth.customer`)

### 5.1 Profile & Preferences
- `GET /api/v1/customer/profile` — Get authenticated customer profile.
- `PUT /api/v1/customer/profile` — Update personal details and marketing consent.
- `PUT /api/v1/customer/password` — Change account password.

### 5.2 Reservation Lifecycle
- `POST /api/v1/customer/reservations/quote/{property}` — Calculate live price breakdown for dates and room type without booking.
- `POST /api/v1/customer/reservations` — Submit reservation request to host.
- `GET /api/v1/customer/reservations` — List customer reservations (filter by status).
- `GET /api/v1/customer/reservations/{reference}` — Inspect reservation details and timing.
- `POST /api/v1/customer/reservations/{reference}/cancel` — Cancel eligible reservation.

### 5.3 Authoritative Payment Gateway (Razorpay)
- `POST /api/v1/customer/reservations/{reference}/payment/initiate` — Create/retrieve authoritative Razorpay order ID. Active only during the 15-minute payment window after owner acceptance.
- `POST /api/v1/customer/reservations/{reference}/payment/verify` — Verify HMAC SHA-256 signature from Razorpay mobile checkout and confirm reservation.
- `GET /api/v1/customer/reservations/{reference}/payment/status` — Check payment transaction status.

### 5.4 Verified Reviews & Ratings
- `GET /api/v1/customer/reviews` — Customer's submitted reviews.
- `GET /api/v1/customer/reviews/eligible` — Bookings eligible for verified review submission.
- `POST /api/v1/customer/reviews/{reference}` — Submit review with 1-5 star ratings across cleanliness, food, value, and staff.

### 5.5 Customer Protection & Grievance
- `GET /api/v1/customer/cases` — List customer protection support tickets.
- `POST /api/v1/customer/cases` — Lodge grievance (food quality, room condition, emergency relocation).

### 5.6 In-App Notifications & Push Devices
- `GET /api/v1/customer/notifications` — Notification inbox.
- `GET /api/v1/customer/notifications/unread-count` — Real-time unread badge count.
- `POST /api/v1/customer/notifications/{id}/read` — Mark notification read.
- `POST /api/v1/customer/notifications/mark-all-read` — Mark all read.
- `POST /api/v1/customer/devices/register` — Register device Expo Push token.
- `DELETE /api/v1/customer/devices/unregister` — Unregister device push token.

---

## 6. Partner (Host) Endpoints (`auth:sanctum`, `auth.owner`)

### 6.1 Host Command Center
- `GET /api/v1/owner/dashboard` — Command center metrics (pending requests, confirmed stays, active listings, monthly earnings).
- `GET /api/v1/owner/properties` — Host's listed properties and room categories.
- `GET /api/v1/owner/properties/{id}` — Individual property inspection.

### 6.2 Host Reservation Operations
- `GET /api/v1/owner/reservations` — List incoming and active reservations across all host properties.
- `GET /api/v1/owner/reservations/{reference}` — Inspect booking request.
- `POST /api/v1/owner/reservations/{reference}/accept` — Accept booking. Starts customer's 15-minute payment window and locks room inventory.
- `POST /api/v1/owner/reservations/{reference}/decline` — Decline booking with reason and release held inventory.

### 6.3 Financial Settlements (Read-Only)
- `GET /api/v1/owner/financial/summary` — Lifetime settled amount, pending payout balance, payout schedule.
- `GET /api/v1/owner/financial/settlements` — Paginated settlement ledger statements with UTR numbers.

### 6.4 Host Operational Alerts & Push Devices
- `GET /api/v1/owner/notifications` — Host operational alerts inbox.
- `GET /api/v1/owner/notifications/unread-count` — Host unread count.
- `POST /api/v1/owner/notifications/{id}/read` — Mark notification read.
- `POST /api/v1/owner/notifications/mark-all-read` — Mark all read.
- `POST /api/v1/owner/devices/register` — Register host device Expo Push token.
- `DELETE /api/v1/owner/devices/unregister` — Unregister host push token.

### 6.5 Host Profile & Security
- `GET /api/v1/owner/profile` — Retrieve host partner profile and verification status.
- `PUT /api/v1/owner/profile` — Update host primary contact details and mobile number.
- `PUT /api/v1/owner/password` — Update partner portal password with current password verification.

---

## 7. Rate Limiting Policy

| Target Domain | Limit | Decay |
|---|---|---|
| Public Endpoints | 60 requests / minute | Per IP address |
| Authentication Endpoints | 10 requests / minute | Per IP address + Email |
| Customer Authenticated APIs | 120 requests / minute | Per User ID |
| Partner Authenticated APIs | 120 requests / minute | Per Owner ID |
