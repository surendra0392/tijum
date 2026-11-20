# TIJUM Mobile Phase M10A.1 — Reservation Management, Allocation & Front-Desk Report

**Document Reference:** `docs/mobile/M10A1_OWNER_RESERVATION_ALLOCATION_FRONT_DESK_REPORT.md`  
**Milestone:** M10A.1 (Front-Desk & Guest Stay Operations)  
**Target Screens:** `(partner)/reservations/index.tsx` & `(partner)/reservations/[reference].tsx`  
**Date:** November 20, 2026  
**Status:** **COMPLETE & VERIFIED**

---

## 1. Front-Desk Command Center

The TIJUM partner mobile application provides an operations command center for property managers, eliminating paperwork and enabling mobile check-in/check-out at the property gate or reception desk.

### 1.1 Reservation Lifecycle State Machine

```
[ Awaiting Payment ] ---> (Native Razorpay Webhook)
                                  |
                                  v
                            [ Confirmed ]
                                  |
                                  +---> [ Allocate Physical Room ]
                                  |
                                  v
                            [ Checked In ] (checked_in_at recorded)
                                  |
                                  v
                            [ Checked Out ] (checked_out_at recorded)
                                  |
                                  v
                       [ Turnover & Settlement ]
```

---

## 2. Reservation Search & Filtering (`reservations/index.tsx`)

The reservations index enables hosts to locate guests and check arrivals instantly:
- **Status Filtering Tabs:**
  - `Confirmed`: Bookings paid and guaranteed; awaiting guest arrival.
  - `Checked In`: Active in-house guests currently staying at the property.
  - `Checked Out`: Completed stays cleared from physical rooms.
  - `Cancelled`: Bookings cancelled prior to check-in.
  - `All`: Complete historical reservation ledger.
- **Search Capabilities:** Search by guest full name, contact phone number, or booking reference (e.g., `TIJ-2026-XYZ`).

---

## 3. Front-Desk Operations (`reservations/[reference].tsx`)

The stay detail screen provides complete guest context and execution actions:
1. **Guest Identity & Stay Details:**
   - Guest name, contact phone, check-in date, check-out date, total duration (days/nights).
   - Booked room type category, guest count, and meal inclusions.
   - Financial breakdown: Total booking amount in INR, payment transaction ID.

2. **Physical Room Allocation Action:**
   - Displayed when a `confirmed` booking has no assigned room (`physical_room_id === null`).
   - Tapping **"Allocate Physical Room"** queries `OwnerApi.getPropertyRooms()` and displays active, vacant rooms belonging to the booked room type.
   - Selecting a room number and submitting calls `OwnerApi.allocateRoom(reference, physicalRoomId)`.

3. **Guest Arrival & Key Handover (Check-In):**
   - Active when the booking is `confirmed` and a physical room has been allocated.
   - Host verifies physical guest identity and hands over keys.
   - Host enters optional check-in notes (e.g. "Identity card verified; key tag #4 issued").
   - Submitting calls `OwnerApi.checkInReservation(reference, notes)` mapped to `POST /api/v1/owner/reservations/{ref}/check-in`.
   - Backend transitions status to `checked_in`, stamps `checked_in_at = now()`, and records an audit log event.

4. **Guest Departure & Room Turnover (Check-Out):**
   - Active when the booking is `checked_in`.
   - Host inspects room inventory, collects keys, and enters optional departure notes.
   - Submitting calls `OwnerApi.checkOutReservation(reference, notes)` mapped to `POST /api/v1/owner/reservations/{ref}/check-out`.
   - Backend transitions status to `checked_out`, stamps `checked_out_at = now()`, marks the stay complete, and releases the physical room for housekeeping turnover.

---

## 4. Concurrency & Race-Condition Safeguards

To prevent double-allocation under high-volume walk-in and online check-in scenarios:
- The backend action `AllocatePhysicalRoom` runs inside an atomic database transaction.
- The `PropertyRoom` row is acquired with `lockForUpdate()`.
- Overlapping active reservations assigned to the same room are verified:
  ```php
  $overlap = Reservation::query()
      ->where('physical_room_id', $room->id)
      ->where('id', '!=', $reservation->id)
      ->whereIn('status', [ReservationStatus::Confirmed, ReservationStatus::CheckedIn])
      ->where(function ($query) use ($reservation) {
          $query->where('check_in_date', '<', $reservation->checkout_date)
                ->where('checkout_date', '>', $reservation->check_in_date);
      })
      ->exists();
  ```
- If an overlap is detected, the transaction aborts with HTTP 422, ensuring zero room double-booking.
