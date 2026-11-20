# TIJUM Mobile Phase M10A.1 — Room Inventory & Physical Rooms Verification Report

**Document Reference:** `docs/mobile/M10A1_OWNER_ROOM_INVENTORY_VERIFICATION.md`  
**Milestone:** M10A.1 (Inventory & Front-Desk Capacity)  
**Target Screens:** `(partner)/properties/[id]/room-types.tsx` & `(partner)/properties/[id]/rooms.tsx`  
**Date:** November 20, 2026  
**Status:** **COMPLETE & VERIFIED**

---

## 1. Inventory Hierarchy & Integrity

The TIJUM mobile inventory engine enforces a strict two-tier inventory separation:
1. **Tier 1 — Room Type Categories (`property_room_types`):** Market-facing room categories defining capacity, private/shared mode, AC inclusion, and daily/weekly/monthly direct pricing.
2. **Tier 2 — Discrete Physical Rooms (`property_rooms`):** Real-world physical units (e.g., Room 101, Room A-204) tied to a room type, maintaining discrete operational statuses and reservation assignments.

```
+-------------------------------------------------------------+
|              PropertyRoomType (Market Listing)              |
|   e.g. "Deluxe Double Sharing AC Room"                      |
|   sharing_capacity: 2 | mode: shared | AC: true             |
|   daily: ₹1,500 | weekly: ₹9,000 | monthly: ₹30,000         |
+-------------------------------------------------------------+
                               |
            +------------------+------------------+
            |                                     |
+-----------------------+             +-----------------------+
|  PropertyRoom #101    |             |  PropertyRoom #102    |
|  Floor: 1 | Wing: A   |             |  Floor: 1 | Wing: A   |
|  Status: ACTIVE       |             |  Status: MAINTENANCE  |
+-----------------------+             +-----------------------+
```

---

## 2. Room Type Management (`room-types.tsx`)

Partners manage their property's room categories directly from the mobile app:
- **Accommodation Mode:**
  - `private`: Entire room booked by a single party (solo traveler, couple, or family).
  - `shared`: Room shared with other independent guests up to `sharing_capacity`.
- **Capacity Controls:**
  - `sharing_capacity`: Strict integer range between 1 and 8 occupants.
  - `base_occupancy` & `max_occupancy`: Occupancy boundaries for rate qualification.
  - `total_rooms`: Overall count of physical units available in this category.
- **Facility Switches:**
  - `is_ac`: Air conditioning included.
  - `early_check_in_supported`: Accommodation allows early check-in requests.
- **Deactivation:** Partners can safely deactivate room types via `OwnerApi.deleteRoomType()`. The backend prevents deletion if active, non-completed reservations exist.

---

## 3. Physical Room Inventory Management (`rooms.tsx`)

Partners have complete visibility into their real-world property inventory:
- **Discrete Unit Identification:**
  - `room_number`: Physical door number or tag (e.g. "101", "F1-02", "Villa Suite 3").
  - `floor_number`: Floor placement (e.g. Ground, 1st Floor, 2nd Floor).
  - `building_name` / `wing`: Optional building block identifier (e.g. "Block B", "Main Building").
- **Operational Status Management:**
  - `active`: Unit clean, inspected, and ready for guest allocation.
  - `maintenance`: Unit undergoing plumbing, electrical, or structural repair; blocked from assignment.
  - `blocked`: Temporarily reserved for host offline use or emergency reserve.
  - `inactive`: Decommissioned room.
  - Status transitions are executable in one tap via `OwnerApi.updateRoomStatus()`.

---

## 4. Physical Room Allocation Workflow

When a guest books a stay, inventory is reserved at the room-type tier. Upon guest arrival or prior to check-in:
1. Host opens the reservation in `(partner)/reservations/[reference].tsx`.
2. Tapping **"Allocate Physical Room"** loads only active, unoccupied physical rooms belonging to the booked room type.
3. Host selects the physical room number (e.g. Room 104).
4. Submitting calls `POST /api/v1/owner/reservations/{ref}/allocate` via `OwnerApi.allocateRoom()`.
5. The backend locks the room record with `lockForUpdate()`, validates against existing overlapping stay dates, and assigns `physical_room_id` to the reservation.

---

## 5. Anti-Bed Architecture Certification

The mobile codebase was audited to ensure zero bed-level models:
- No database tables named `beds` or `property_beds` are queried.
- No UI components expose bed numbers (e.g. "Bed A", "Lower Bunk 2").
- Capacity in shared rooms is tracked strictly as occupant count within the room entity.
- All allocation endpoints operate on `physical_room_id` (`PropertyRoom`).
