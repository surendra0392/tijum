# TIJUM Mobile Phase M10A.1 — Property Media & Amenities Verification Report

**Document Reference:** `docs/mobile/M10A1_OWNER_PROPERTY_MEDIA_AMENITIES_REPORT.md`  
**Milestone:** M10A.1 (Visual Media & Catalogue Compliance)  
**Target Screens:** `(partner)/properties/[id]/media.tsx` & `(partner)/properties/[id]/amenities.tsx`  
**Date:** November 20, 2026  
**Status:** **COMPLETE & VERIFIED**

---

## 1. Property Media Gallery Management

The dedicated media management screen (`apps/mobile/app/(partner)/properties/[id]/media.tsx`) provides complete photo lifecycle control for accommodation partners.

### 1.1 Native File Upload Architecture
Previous mobile implementations failed during photograph upload because `ApiClient` unconditionally passed JSON headers (`Content-Type: application/json`) and serialized bodies with `JSON.stringify(body)`. This stripped boundary metadata from multipart payloads.

In Phase M10A.1, `apps/mobile/src/api/client.ts` was upgraded with dynamic `FormData` detection:
```typescript
const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...customHeaders,
};
```
When `body instanceof FormData`, the native React Native fetch engine attaches the correct `multipart/form-data; boundary=...` header, enabling seamless camera and gallery photograph uploads.

### 1.2 Photo Categories & Moderation
Photographs are categorized into 8 canonical property sections:
- `exterior`: Building facade and street view.
- `entrance`: Main gate, security booth, and approach road.
- `reception`: Front desk and lobby area.
- `common_area`: Lounge, library, TV hall, terrace, gym.
- `dining`: Cafeteria, dining hall, or kitchen facility.
- `room_interior`: Bedroom layout, wardrobes, study desks.
- `bathroom`: En-suite or common washroom facilities.
- `other`: Parking, laundry, power backup, or solar installations.

### 1.3 Photo Actions & Reordering
- **Set as Primary Cover:** Partners can designate any photograph as the primary listing cover photo. The backend (`UpdatePropertyMediaDetails`) atomically unsets the previous cover and flags the chosen image.
- **Alt Text Editing:** Partners can update accessibility alt text to assist visually impaired guests and improve search engine rankings.
- **Gallery Sequence Reordering:** Partners can reorder gallery images via `OwnerApi.reorderMedia(propertyId, orderedIds)` mapped to `POST /api/v1/owner/properties/{id}/media/reorder`.
- **Photo Deletion:** Safe deletion modal calling `OwnerApi.deleteMedia(propertyId, mediaId)` mapped to `DELETE /api/v1/owner/properties/{id}/media/{mediaId}`.

---

## 2. Property Amenities Management

The dedicated amenities management screen (`apps/mobile/app/(partner)/properties/[id]/amenities.tsx`) connects partners to TIJUM's approved amenities catalogue.

### 2.1 Verification Status Badging
Assigned amenities display standard status badges reflecting their moderation state:
- `Approved` / `Verified` (Green Badge): Authenticated by TIJUM inspection; visible to prospective guests on public marketplace listings.
- `Draft` (Yellow Badge): Saved by host; awaiting verification submission.
- `Under Review` (Blue Badge): Currently undergoing administrator review.
- `Rejected` (Red Badge): Did not meet platform criteria (host notified with explanation).

### 2.2 Strict Zero-Surcharge Policy
In compliance with Phase 09A, amenities are strictly non-billable inclusions. The screen prominently displays:
> "All listed amenities are included in direct room-type pricing without extra charges to guests."

The concept of `supports_additional_charge` has been completely eliminated from the mobile UI.

### 2.3 Catalogue Assignment & Deactivation
- **Add Amenity Modal:** Displays available catalogue amenities grouped by category (Safety & Security, Facilities & Infrastructure, Dining, Services). Partners select an item, input optional notes (e.g. "RO water dispenser on every floor"), and submit via `OwnerApi.assignAmenity()`.
- **Remove / Deactivate Action:** Partners can remove an assigned amenity with confirmation, which triggers `OwnerApi.deleteAmenity(propertyId, assignmentId)` calling `DELETE /api/v1/owner/properties/{id}/amenities/{assignmentId}`, safely marking the assignment inactive (`is_current = false, status = Inactive`).

---

## 3. Route & Navigation Integration

Both screens are registered in `apps/mobile/app/(partner)/_layout.tsx`:
- `properties/[id]/media` (`href: null, headerShown: false`)
- `properties/[id]/amenities` (`href: null, headerShown: false`)

Navigation chips for "Photos" and "Amenities" are surfaced directly on the property management cards in `apps/mobile/app/(partner)/properties/index.tsx`.
