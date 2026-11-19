# TIJUM Partner Mobile Application Feature Specification

**Document Reference:** `docs/mobile/TIJUM_OWNER_APP_FEATURE_SPECIFICATION.md`  
**Application Scope:** `apps/mobile/app/(partner)/` and `(auth)/owner-*`  
**Framework:** React Native 0.83.10 / Expo SDK 55 (Expo Router 55, React 19.2.0)  
**Target Audience:** Accommodation hosts, property managers, and front-desk operators  
**Date:** November 20, 2026 (Phase M9 Reconciled)  
**Status:** **ACTIVE, RECONCILED & CERTIFIED**

---

## 1. Feature Overview

The Partner Mobile Application empowers accommodation hosts across Andhra Pradesh & Telangana to run front-desk operations, manage real-time inventory, allocate physical rooms to incoming guests, inspect physical room inventories, respond to guest reviews, inspect financial settlements, and maintain property performance on mobile devices.

---

## 2. Core Operational Modules

### 2.1 Partner Authentication & Onboarding
- **Partner Login (`app/(auth)/owner-login.tsx`):**
  - Sign in using host email or phone + password.
  - "Forgot Password?" dialog providing host email password reset via `PublicApi.forgotPassword(email, 'owner')`.
- **Partner Registration (`app/(auth)/owner-register.tsx`):**
  - 10-field host onboarding registration:
    * Legal business entity name & display name.
    * Primary contact person name & phone.
    * Operating city & property locality.
    * Accommodation type selector (Hostels/PG, Homestay, Co-Living).
    * Initial room inventory count.

### 2.2 Operational Dashboard
- **KPI Metrics (`(partner)/dashboard.tsx`):**
  - Total active listings count.
  - Occupancy rate percentage across active rooms.
  - Incoming guest check-ins scheduled for today.
  - Scheduled check-outs requiring room turnover.
  - Unsettled partner payouts in paise.
  - Quick action card navigating directly to Guest Reviews management.

### 2.3 Front-Desk Operations & Reservation Management
- **Reservations List (`(partner)/reservations/index.tsx`):**
  - Filter by lifecycle status: *All*, *Confirmed*, *Checked In*, *Checked Out*, *Cancelled*.
  - Search by guest name, phone, or booking reference.
- **Stay Details & Front-Desk Actions (`(partner)/reservations/[reference].tsx`):**
  - **Guest Arrival & Check-In Action:**
    * When status is `confirmed`, renders "Check In Guest" action.
    * Prompts for optional check-in notes (e.g. "Keys handed over, Room 204 allocated").
    * Calls `OwnerApi.checkInReservation()` to update status to `checked_in` and stamps `checked_in_at`.
  - **Guest Departure & Check-Out Action:**
    * When status is `checked_in`, renders "Check Out Guest" action.
    * Prompts for optional checkout inspection notes (e.g. "Room inspected, keys returned").
    * Calls `OwnerApi.checkOutReservation()` to update status to `checked_out`, releases inventory for housekeeping, and stamps `checked_out_at`.
  - **Timestamps & Audit Trail:**
    * Displays `checked_in_at` and `checked_out_at` on the stay specifications card.

### 2.4 Physical Room Allocation
- **Room Allocation Sheet (`(partner)/reservations/[reference].tsx`):**
  - For confirmed stays without assigned rooms, renders "Assign Physical Room" button.
  - Queries property physical rooms via `OwnerApi.getPropertyRooms(propertyId)`.
  - Displays room number, floor number, matching room type badge, and availability status.
  - Submits selection via `OwnerApi.allocateRoom(reference, physicalRoomId)`.
  - Re-allocation: Allows changing assigned rooms on confirmed stays before check-in.

### 2.5 Property & Physical Room Inventory Inspection
- **Properties Hub (`(partner)/properties/index.tsx`):**
  - Lists verified partner properties with approval and operational badges.
  - Shows active room categories, daily/monthly rates, and operational status.
  - **Physical Rooms Viewer:** Interactive drawer/modal displaying all individual physical rooms per property (room number, floor, room type, active status) querying `OwnerApi.getPropertyRooms(property.id)`.

### 2.6 Partner Review Management
- **Reviews Hub (`(partner)/reviews/index.tsx`):**
  - Lists all guest reviews across properties owned by the partner querying `OwnerApi.getReviews()`.
  - Displays overall rating and 4 subcategory breakdowns (Cleanliness, Food & Dining, Communication, Value).
  - Displays guest display name, stay dates (check-in / check-out), and property name.
  - Shows existing partner responses with moderation status.
  - **Review Response Modal:**
    * Textarea supporting host responses up to 2,500 characters (~500 words).
    * Real-time character counter (`${len}/2500`).
    * Submission action calling `OwnerApi.replyToReview(reviewId, response)`.

### 2.7 Account Profile & Security Settings
- **Partner Account (`(partner)/account.tsx`):**
  - **Primary Partner Contact Card:**
    * Displays and updates host full name and contact phone number.
    * Saves changes via `OwnerApi.updateProfile({ name, phone })`.
    * Displays registered administrative email notice.
  - **Security & Credentials Card:**
    * Current password, new password (min. 8 characters), and password confirmation inputs.
    * Submits credentials update via `OwnerApi.changePassword()`.
  - **Dynamic Host Business Display:**
    * Displays registered `business_name` dynamically with "VERIFIED HOST" badge.
  - **Secure Sign-Out:**
    * Clears partner vault token from SecureStore and redirects to login portal.
