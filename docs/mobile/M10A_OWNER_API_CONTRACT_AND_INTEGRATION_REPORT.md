# TIJUM Mobile Phase M10A: Owner API Contract & Integration Report

**Document Reference:** `docs/mobile/M10A_OWNER_API_CONTRACT_AND_INTEGRATION_REPORT.md`  
**Application Scope:** `app/Http/Controllers/Api/V1/Owner/`, `routes/api.php`, and `apps/mobile/src/api/owner.ts`  
**Date:** November 20, 2026  
**Status:** **ACTIVE, VERIFIED & CERTIFIED (44 Owner Routes, 111 Total API V1 Routes)**

---

## 1. Executive Summary

Phase M10A completed the backend API parity required for native property management. All owner operations are strictly authenticated using Laravel Sanctum (`auth:sanctum`) and validated against host tenancy (`auth.owner`).

Total registered API V1 routes increased to **111 endpoints**, including **44 dedicated owner routes**.

---

## 2. Owner API V1 Endpoint Directory

### 2.1 Reference Data & Onboarding
- `GET /api/v1/owner/reference-data`
  - Returns canonical categories (`hostels-pg`, `homestays`, `co-living`), active launch cities, room type modes, gender policies, guest compositions, operational statuses, block scopes, block types, and active amenities catalogue.
  - Client method: `OwnerApi.getReferenceData()`.

### 2.2 Property Lifecycle & Verification
- `GET /api/v1/owner/properties`: List host properties with active room types and verification badges (`OwnerApi.getProperties()`).
- `POST /api/v1/owner/properties`: Create accommodation via 5-step wizard (`OwnerApi.createProperty()`).
- `GET /api/v1/owner/properties/{id}`: Show detailed property specifications (`OwnerApi.getProperty()`).
- `PUT /api/v1/owner/properties/{id}`: Update property overview, category, address (`OwnerApi.updateProperty()`).
- `POST /api/v1/owner/properties/{id}/submit-verification`: Submit property application for administrative review (`OwnerApi.submitVerification()`).
- `GET /api/v1/owner/properties/{id}/verification-status`: Evaluate readiness checklist (name, address, cover media, pricing readiness, declarations) (`OwnerApi.getVerificationStatus()`).

### 2.3 Room Categories (Hierarchy Tier 2)
- `GET /api/v1/owner/properties/{id}/room-types`: List room types with sharing capacity and rates (`OwnerApi.getRoomTypes()`).
- `POST /api/v1/owner/properties/{id}/room-types`: Create room type category (`OwnerApi.createRoomType()`).
- `PUT /api/v1/owner/properties/{id}/room-types/{rtId}`: Update room type category (`OwnerApi.updateRoomType()`).
- `DELETE /api/v1/owner/properties/{id}/room-types/{rtId}`: Soft delete or deactivate room category (`OwnerApi.deleteRoomType()`).

### 2.4 Physical Rooms Inventory (Hierarchy Tier 3)
- `GET /api/v1/owner/properties/{id}/rooms`: List discrete physical rooms (`OwnerApi.getPropertyRooms()`).
- `POST /api/v1/owner/properties/{id}/rooms`: Create discrete physical room (`OwnerApi.createRoom()`).
- `PUT /api/v1/owner/properties/{id}/rooms/{roomId}`: Update physical room details (`OwnerApi.updateRoom()`).
- `PATCH /api/v1/owner/properties/{id}/rooms/{roomId}/status`: Change operational status (active, maintenance, blocked, inactive) (`OwnerApi.updateRoomStatus()`).

### 2.5 Pricing, Rate Plans & Meal Inclusions
- `GET /api/v1/owner/properties/{id}/pricing`: Show rate plans, meal flags, and readiness evaluation (`OwnerApi.getPricing()`).
- `PUT /api/v1/owner/properties/{id}/pricing`: Update daily/weekly/monthly rates in integer paise and meal inclusions (`OwnerApi.updatePricing()`).

### 2.6 Calendar Availability & Blackout Blocks
- `GET /api/v1/owner/properties/{id}/availability-blocks`: List blackout date ranges (`OwnerApi.getAvailabilityBlocks()`).
- `POST /api/v1/owner/properties/{id}/availability-blocks`: Create blackout block (`OwnerApi.createAvailabilityBlock()`).
- `DELETE /api/v1/owner/properties/{id}/availability-blocks/{bId}`: Cancel blackout block (`OwnerApi.cancelAvailabilityBlock()`).

### 2.7 Property Media & Amenities
- `GET /api/v1/owner/properties/{id}/media`: List property photographs (`OwnerApi.getMedia()`).
- `POST /api/v1/owner/properties/{id}/media`: Upload photograph (`ApiClient.post()`).
- `DELETE /api/v1/owner/properties/{id}/media/{mId}`: Delete photograph (`OwnerApi.deleteMedia()`).
- `GET /api/v1/owner/properties/{id}/amenities`: List assigned amenities (`OwnerApi.getAmenities()`).
- `POST /api/v1/owner/properties/{id}/amenities`: Assign amenity (`OwnerApi.assignAmenity()`).

### 2.8 Front Desk, Reservations & Operations
- `GET /api/v1/owner/reservations`: List reservations with status filtering (`OwnerApi.getReservations()`).
- `GET /api/v1/owner/reservations/{ref}`: Reservation detail with allocated room (`OwnerApi.getReservation()`).
- `POST /api/v1/owner/reservations/{ref}/allocate`: Allocate discrete physical room (`OwnerApi.allocateRoom()`).
- `POST /api/v1/owner/reservations/{ref}/check-in`: Check-in guest with handover notes (`OwnerApi.checkInReservation()`).
- `POST /api/v1/owner/reservations/{ref}/check-out`: Check-out guest with inspection notes (`OwnerApi.checkOutReservation()`).

### 2.9 Reviews, Settlements & Account
- `GET /api/v1/owner/reviews`: List guest reviews with subcategories (`OwnerApi.getReviews()`).
- `POST /api/v1/owner/reviews/{id}/response`: Reply to guest review (2,500 chars) (`OwnerApi.replyToReview()`).
- `GET /api/v1/owner/settlements`: List settlement payout batches (`OwnerApi.getSettlements()`).
- `GET /api/v1/owner/settlements/summary`: Earnings & payout totals (`OwnerApi.getFinancialSummary()`).
- `GET /api/v1/owner/profile`: Host profile data (`OwnerApi.getProfile()`).
- `PUT /api/v1/owner/profile`: Update contact info (`OwnerApi.updateProfile()`).
- `PUT /api/v1/owner/password`: Update security password (`OwnerApi.changePassword()`).

---

## 3. Contract Schema & Type Guarantees

All endpoints implement TypeScript contracts in `apps/mobile/src/api/types.ts`:
- `OwnerReferenceData`
- `PropertyPricingData`
- `PropertyAvailabilityBlock`
- `PropertyVerificationEvaluation`
- `PropertyMediaItem`
- `PhysicalRoom`
- `RoomType`
- `Reservation`
- `OwnerReview`

All data structures enforce non-nullable fields where mandatory, explicit enums for operational states, and integer minor units for monetary figures.
