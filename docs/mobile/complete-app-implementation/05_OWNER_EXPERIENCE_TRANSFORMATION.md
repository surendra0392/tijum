# TIJUM Mobile — Accommodation Partner (Host) Experience Transformation
**Milestone:** Complete Mobile Application UI/UX Transformation & Implementation  
**Document ID:** `docs/mobile/complete-app-implementation/05_OWNER_EXPERIENCE_TRANSFORMATION.md`  
**Generated At:** 2026-11-20  
**Target Codebase:** `apps/mobile/app/(partner)` & `apps/mobile/src`  
**API Parity:** Full Integration with `/api/v1/owner/*` Endpoints

---

## 1. Partner Persona Purpose & Architecture

The Accommodation Partner portal provides property operators, hostel wardens, and homestay hosts with a comprehensive operational management command center on mobile.

The portal enforces clean architectural boundaries:
- **Physical Room Isolation:** While customers book room categories, hosts manage physical room assets (`PropertyRoom`), assign physical room numbers (e.g., Room 102), and maintain room readiness states.
- **Front-Desk Lifecycle:** Real-time state transitions from `confirmed` $\rightarrow$ `checked_in` $\rightarrow$ `checked_out`, recording timestamps and turnover clearance notes.
- **Financial Transparency:** Comprehensive visibility into gross bookings, commission deductions, Section 393(1) TDS deductions, 18% GST allocation, and net bank payouts.
- **Single-Active Session Integrity:** Host authentication tokens are bound to a single active device, preventing unauthorized multi-operator access without re-authentication.

---

## 2. Host Command Center (`dashboard.tsx`)

### 2.1 Operational Metrics Grid
The dashboard displays three high-visibility performance metric cards:
1. **Confirmed Stays:** Real-time count of active and upcoming guest reservations.
2. **Active Stays:** Total verified property listings currently open for booking.
3. **This Month's Payout:** Gross and net earnings in rupees (derived from integer paise).

### 2.2 Operational Shortcuts & Navigation
The command center surfaces one-tap shortcuts to:
- **All Bookings (`/reservations/index`):** Access to front-desk check-in and reservation records.
- **My Stays (`/properties/index`):** Property listings and physical room inventory.
- **Payouts (`/settlements/index`):** Payout history and bank remittance records.
- **Guest Reviews (`/reviews/index`):** Feedback monitoring and host response publisher.

---

## 3. Front Desk Operations & Room Allocation (`reservations/*`)

### 3.1 Reservation Feed & Filter Tabs (`reservations/index.tsx`)
Reservations are filtered via five standard status tabs:
- **All:** Complete history of all reservation activity.
- **Confirmed:** Bookings with confirmed payment awaiting guest arrival.
- **Awaiting Payment:** Active 15-minute temporary holds.
- **Checked In:** Currently in-house guests.
- **History:** Completed (`checked_out`) and cancelled stays.

### 3.2 Physical Room Allocation Workflow (`reservations/[reference].tsx`)
Before or upon guest arrival, hosts can allocate a specific physical room to a confirmed booking:
- The host opens the *Allocate Room* modal which queries `OwnerApi.getPropertyRooms(propertyId)`.
- The modal displays available rooms matching the booked category.
- Selecting an active room updates the reservation's `physical_room_id` and marks the physical room as assigned, preventing double allocation.
- Occupied or inactive rooms cannot be assigned to another reservation.

### 3.3 Guest Check-In & Check-Out Lifecycle
- **Check-In (`handleCheckIn`):** Advances booking to `checked_in`, records the arrival timestamp, captures front-desk operational notes (e.g., ID proof verified), and transitions room status to `occupied`.
- **Check-Out (`handleCheckOut`):** Advances booking to `checked_out`, records departure timestamp, captures housekeeping clearance notes, and releases the room for cleaning.

---

## 4. Physical Rooms Inventory Management (`properties/[id]/rooms.tsx`)

### 4.1 Room Asset Ledger
Hosts manage their physical room inventory through a dedicated rooms screen:
- Lists all physical rooms with identifiers (e.g., `R-101`, `R-102`), category badge, floor number, and status indicator dots.
- Statuses:
  - **`active` (Available):** Emerald dot — ready for guest allocation.
  - **`occupied`:** Deep plum dot — guest currently checked in.
  - **`cleaning`:** Amber dot — guest checked out, awaiting turnover clearance.
  - **`maintenance`:** Grey/Rose dot — undergoing repair, unavailable for booking.

### 4.2 Room Creation & Status Updates
- **Add Room:** Modal allowing entry of room number, room category selection, floor number, and wing.
- **Status Modal:** One-tap status updates with required operational reason notes when placing rooms in maintenance or taking them offline.

---

## 5. Financial Profile, Settlements & Agreements (`financial-profile/*` & `settlements/*`)

### 5.1 Financial Profile & Tax Credentials (`financial-profile/index.tsx`)
- Displays verified business entity details, PAN verification status, GSTIN, and linked settlement bank account (Bank Name, Account Number, IFSC code).

### 5.2 Electronic Commission Agreement Acceptance (`financial-profile/agreements.tsx`)
The app complies with marketplace intermediary regulations:
- Renders active and pending commission agreements with terms version (e.g., `v1.2`), commission percentage rate, and SHA-256 terms hash.
- **One-Tap Acceptance:** Host reviews legal terms and clicks *"Accept & Sign"*. The API records:
  - Authenticated Host ID
  - Agreement ID
  - SHA-256 terms hash
  - Timestamp of acceptance
  - Client IP address and User Agent string

### 5.3 Settlement Reconciliation & TDS Verification (`settlements/index.tsx`)
Itemized payout cards display:
- Gross booking value
- TIJUM marketplace commission
- 18% GST on marketplace commission
- Section 393(1) / Section 194O TDS withholding
- Net remittance amount to host's registered bank account with bank UTR reference.

---

## 6. Review Management & Public Response (`reviews/index.tsx`)

Hosts can monitor and respond to guest reviews:
- View overall star rating and subcategory scores (Food, Cleanliness, Amenities, Value).
- **Host Response Modal:** Allows submitting a public host response with a strict **2,500-character limit** and real-time character counter.
- Responses are published publicly alongside the review on the property details page.
