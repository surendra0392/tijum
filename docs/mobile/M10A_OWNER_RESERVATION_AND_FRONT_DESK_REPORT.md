# TIJUM Mobile Phase M10A: Owner Reservation & Front-Desk Operations Report

**Document Reference:** `docs/mobile/M10A_OWNER_RESERVATION_AND_FRONT_DESK_REPORT.md`  
**Application Scope:** `(partner)/reservations/*`, Front-Desk State Machine, and Operations Lifecycle  
**Date:** November 20, 2026  
**Status:** **ACTIVE, COMPLIANT & CERTIFIED**

---

## 1. Instant Confirmation Booking Model

The TIJUM marketplace operates on an **Instant Confirmation** model:
- Customers initiate 15-minute booking holds and pay via Razorpay.
- Upon successful payment verification, the reservation immediately transitions to `confirmed`.
- **No Accept / Decline Steps:** Accommodation partners do NOT accept or decline reservations. Once a guest books and pays, the reservation is final and confirmed.

---

## 2. Front-Desk Lifecycle State Machine

The native mobile application implements a deterministic state machine for front-desk operations in `apps/mobile/app/(partner)/reservations/[reference].tsx`:

```
[Awaiting Payment] (Customer hold)
        │
        ▼ (Payment Verified)
   [CONFIRMED] ──────────────────────────┐
        │                                │
        │ [Allocate Physical Room]       │
        │ [Check-In Guest Action]        │
        ▼                                │
  [CHECKED_IN]                           │ [Cancel / No-Show]
        │                                │
        │ [Check-Out Guest Action]       │
        ▼                                ▼
  [CHECKED_OUT]                     [CANCELLED]
```

### 2.1 Physical Room Allocation
- When a reservation is `confirmed`, the host assigns a physical room before or during arrival.
- Tapping "Assign Physical Room" loads available rooms belonging to the property and room type via `OwnerApi.getPropertyRooms()`.
- Once selected, submits via `OwnerApi.allocateRoom(reference, physicalRoomId)`.
- Re-allocation is permitted while in `confirmed` status if guest requests room change prior to check-in.

### 2.2 Guest Arrival & Check-In
- Standard check-in time: **09:00 AM IST** (`Asia/Kolkata`).
- Front desk staff selects "Check In Guest".
- Optional check-in notes field records details (e.g. "Govt ID verified, keys to Room 102 issued").
- Calls `OwnerApi.checkInReservation(reference, notes)`.
- Backend records `checked_in_at` timestamp and transitions status to `checked_in`.

### 2.3 Guest Departure & Check-Out
- Standard checkout time: **08:00 AM IST** (`Asia/Kolkata`).
- Front desk staff selects "Check Out Guest".
- Optional checkout inspection notes field records departure feedback (e.g. "Room key returned, no damages").
- Calls `OwnerApi.checkOutReservation(reference, notes)`.
- Backend records `checked_out_at` timestamp, transitions status to `checked_out`, and releases the room for housekeeping turnover.

---

## 3. Reservation Search & Filtering

As implemented in `apps/mobile/app/(partner)/reservations/index.tsx`:
- Quick filter tabs: *All*, *Confirmed*, *Checked In*, *Checked Out*, *Cancelled*.
- Real-time text search: Filters by guest name, phone number, or booking reference (`TBR-*`).
- Detailed card view: Check-in/out dates, guest count, room category, assigned room number, payment status, and total amount.
