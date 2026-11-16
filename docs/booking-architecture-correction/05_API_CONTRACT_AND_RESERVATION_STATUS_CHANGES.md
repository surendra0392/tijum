# TIJUM — API Contract and Reservation Status Changes
## Versioned REST API v1 Specification for Instant Booking and Automatic Confirmation

> **DOCUMENT ID:** `TIJUM-DOC-BAC-05`  
> **STATUS:** Complete & Production Verified  
> **SCOPE:** REST API v1 (`/api/v1/*`), Mobile Apps, External Integrations

---

## 1. Customer Endpoints

### 1.1 Create Reservation (Instant Hold)
Initiates a reservation hold and enters the 15-minute checkout window.

- **Method / Route:** `POST /api/v1/customer/reservations`
- **Auth:** Sanctum Bearer Token (`auth:sanctum`, User)
- **Request Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body:**
  ```json
  {
    "property_id": 14,
    "property_room_type_id": 28,
    "check_in_date": "2026-11-20",
    "checkout_date": "2026-11-25",
    "rooms_count": 1,
    "guest_count": 2,
    "meal_plan": "full_board",
    "special_requests": "Quiet room on upper floor",
    "submission_token": "sub_tok_8f91a27e3c1b"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "message": "Reservation created successfully. Please complete payment within 15 minutes to confirm.",
    "data": {
      "booking_reference": "TIJ-2026-8842",
      "status": "awaiting_payment",
      "payment_deadline_at": "2026-11-14T04:25:00Z",
      "total_amount_minor": 1250000,
      "currency": "INR",
      "property": {
        "id": 14,
        "name": "Green Valley PG & Coliving",
        "city": "Hyderabad"
      },
      "room_type": {
        "id": 28,
        "name": "Deluxe AC Double Room"
      },
      "dates": {
        "check_in": "2026-11-20",
        "checkout": "2026-11-25",
        "nights": 5
      }
    }
  }
  ```

---

### 1.2 Initiate Checkout Payment Order
Generates a Razorpay Gateway Order for the held reservation.

- **Method / Route:** `POST /api/v1/customer/reservations/{reference}/pay`
- **Auth:** Sanctum Bearer Token
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "gateway": "razorpay",
    "order_id": "order_K8dJ109sLq2pZ1",
    "amount_minor": 1250000,
    "currency": "INR",
    "key_id": "rzp_live_xxxxxxxxxxxxxx",
    "deadline_at": "2026-11-14T04:25:00Z",
    "customer": {
      "name": "Siddharth Rao",
      "email": "siddharth@example.com",
      "phone": "+919876543210"
    }
  }
  ```

---

### 1.3 Verify Checkout Payment (Auto-Confirmation)
Verifies Razorpay HMAC signature and confirms the booking.

- **Method / Route:** `POST /api/v1/customer/reservations/{reference}/verify`
- **Auth:** Sanctum Bearer Token
- **Request Body:**
  ```json
  {
    "razorpay_order_id": "order_K8dJ109sLq2pZ1",
    "razorpay_payment_id": "pay_K8dJaa871kLm90",
    "razorpay_signature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Payment verified successfully. Your booking is confirmed!",
    "data": {
      "booking_reference": "TIJ-2026-8842",
      "status": "confirmed",
      "confirmed_at": "2026-11-14T04:12:00Z",
      "payment": {
        "gateway_payment_id": "pay_K8dJaa871kLm90",
        "amount_minor": 1250000,
        "status": "captured"
      }
    }
  }
  ```

---

## 2. Owner / Partner Endpoints

### 2.1 Get Reservation Details & Capabilities
Returns reservation metadata, guest contact, and actionable capabilities.

- **Method / Route:** `GET /api/v1/owner/reservations/{reference}`
- **Auth:** Sanctum Bearer Token (`auth:sanctum`, Owner)
- **Response `200 OK`:**
  ```json
  {
    "data": {
      "booking_reference": "TIJ-2026-8842",
      "status": "confirmed",
      "check_in_date": "2026-11-20",
      "checkout_date": "2026-11-25",
      "guest": {
        "name": "Siddharth Rao",
        "phone": "+919876543210"
      },
      "room_type_name": "Deluxe AC Double Room",
      "rooms_count": 1,
      "allocated_rooms": [],
      "can_allocate": true,
      "can_check_in": false,
      "can_check_out": false
    }
  }
  ```

---

### 2.2 Removed Legacy Endpoints: Accept & Decline

Property owners can no longer accept or decline reservations. The routes and controller action methods have been completely eradicated from `routes/api.php` and `OwnerReservationController.php`:

- **Method / Route:** `POST /api/v1/owner/reservations/{reference}/accept` — `404 Not Found`
- **Method / Route:** `POST /api/v1/owner/reservations/{reference}/decline` — `404 Not Found`

All mobile and web clients have removed calls to these legacy endpoints. Reservations proceed directly from instant 15-minute hold to automatic confirmation upon payment.

---

### 2.3 Physical Room Allocation
Assigns physical rooms to a confirmed reservation.

- **Method / Route:** `PUT /api/v1/owner/reservations/{reference}/allocations`
- **Auth:** Sanctum Bearer Token (`auth:sanctum`, Owner)
- **Request Body:**
  ```json
  {
    "allocations": [
      {
        "property_room_id": 104,
        "allocated_quantity": 1
      }
    ]
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Physical rooms allocated successfully.",
    "data": {
      "booking_reference": "TIJ-2026-8842",
      "allocated_rooms": [
        {
          "room_id": 104,
          "room_number": "Room 204",
          "floor": 2
        }
      ]
    }
  }
  ```
