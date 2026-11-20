# TIJUM Phase M10C.2 — Search Availability & Date Validation Report

## 1. Context & Objectives

The public property search endpoint (`GET /api/v1/public/properties`) serves both web and mobile search flows.
Prior to M10C.2:
1. When clients passed incomplete, malformed, or inverted stay dates (e.g., check-in without checkout, past dates, or checkout before check-in), the controller silently swallowed the exception and executed an unconstrained query, returning inaccurate property lists.
2. The search query only checked `PropertyAvailabilityBlock` records (blackout dates), ignoring confirmed bookings and active payment holds. As a result, properties with 100% occupied rooms were displayed as available to customers.

---

## 2. Implementation in `PublicPropertyController.php`

### 2.1 Strict Date Validation & HTTP 422 Responses
When any stay date query parameter (`check_in_date`, `check_in`, `check_out_date`, `check_out`) is present, strict validation is enforced:

1. **Both Dates Required:** If check-in is provided without checkout, or checkout without check-in:
   - Returns HTTP 422 `VALIDATION_ERROR` with structured field messages.
2. **Format Validity:** Both dates must parse as valid date strings (`YYYY-MM-DD` or ISO-8601).
   - Returns HTTP 422 `VALIDATION_ERROR` if unparseable.
3. **No Past Dates:** Check-in date cannot be prior to today (`check_in < today`).
   - Returns HTTP 422 `VALIDATION_ERROR`: `"Check-in date cannot be in the past."`.
4. **Chronological Validity:** Checkout date must be strictly after check-in (`check_out <= check_in`).
   - Returns HTTP 422 `VALIDATION_ERROR`: `"Check-out date must be strictly after check-in date."`.

### 2.2 Dual-Tier Availability Engine
To guarantee zero-overbooking search accuracy:

1. **SQL Pre-Filter Tier:**
   Filters out properties with active property-level blackout blocks overlapping the stay window:
   ```php
   $query->whereDoesntHave('availabilityBlocks', function ($q) use ($start, $endInclusive): void {
       $q->where('scope', PropertyAvailabilityBlockScope::Property->value)
           ->where('status', PropertyAvailabilityBlockStatus::Active->value)
           ->whereDate('start_date', '<=', $endInclusive)
           ->whereDate('end_date', '>=', $start);
   });
   ```
2. **Authoritative Capacity Filter Tier (`ReservationAvailabilityService`):**
   For all surviving candidates, each property's active room-types are evaluated using `ReservationAvailabilityService::stayCapacity`:
   ```php
   $properties = $properties->filter(function (Property $property) use ($stayFilterCheckIn, $stayFilterCheckOut, $requestedQuantity, $availabilityService): bool {
       foreach ($property->roomTypes as $roomType) {
           if (! $roomType->is_active) {
               continue;
           }

           $stay = $availabilityService->stayCapacity(
               $roomType,
               $stayFilterCheckIn->toDateString(),
               $stayFilterCheckOut->toDateString(),
               $requestedQuantity,
           );

           if ($stay['available']) {
               return true;
           }
       }

       return false;
   })->values();
   ```
   This verifies across every single day of the stay:
   - Active physical rooms (`operational_status = Active`).
   - Room-level availability blocks.
   - Confirmed reservations occupying the stay.
   - Active 15-minute payment holds (`ReservationStatus::AwaitingPayment` with unexpired `payment_deadline_at`).
   - Ensures `minimum_remaining >= $requestedQuantity`.

If all rooms of all room-types in a property are occupied or held, the property is dropped from search results prior to pagination and distance sorting.

---

## 3. Test Verification Matrix

Automated verification in `tests/Feature/Api/V1/PhaseM10C2FinancialAndSlaTest.php`:

| Scenario | Request Parameters | Expected Status / Behavior | Verification |
|---|---|---|---|
| **Missing Checkout** | `?check_in_date=2026-12-01` | HTTP 422 `VALIDATION_ERROR` | **PASS** |
| **Missing Check-in** | `?check_out_date=2026-12-05` | HTTP 422 `VALIDATION_ERROR` | **PASS** |
| **Malformed Date** | `?check_in_date=invalid-date&check_out_date=2026-12-05` | HTTP 422 `VALIDATION_ERROR` | **PASS** |
| **Past Check-in Date** | `?check_in_date=2020-01-01&check_out_date=2020-01-05` | HTTP 422 `VALIDATION_ERROR` | **PASS** |
| **Inverted Date Range** | `?check_in_date=2026-12-10&check_out_date=2026-12-05` | HTTP 422 `VALIDATION_ERROR` | **PASS** |
| **Equal Dates (0 Nights)** | `?check_in_date=2026-12-10&check_out_date=2026-12-10` | HTTP 422 `VALIDATION_ERROR` | **PASS** |
| **Fully Booked (Confirmed)** | Property A with 1 room booked by confirmed reservation | Excluded from search results | **PASS** |
| **Fully Booked (Payment Hold)** | Property B with 1 room held by 15-minute payment hold | Excluded from search results | **PASS** |
| **Available Inventory** | Property C with 1 room unreserved | Included in search results | **PASS** |
