<?php

declare(strict_types=1);

namespace App\Actions\Reservations;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\ReservationQuantityBasis;
use App\Enums\ReservationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationRoomAllocation;
use App\Policies\ReservationPolicy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaveReservationAllocations
{
    public function __construct(private readonly ReservationPolicy $policy) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Owner $owner, Reservation $reservation, array $data): void
    {
        $allocations = is_array($data['allocations'] ?? null) ? $data['allocations'] : [];

        DB::transaction(function () use ($owner, $reservation, $allocations): void {
            // Global lock order: property -> room type -> reservation -> rooms (ascending id).
            $lockedProperty = Property::query()->whereKey($reservation->property_id)->lockForUpdate()->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $this->policy->allocateByOwner($owner, $reservation)) {
                throw ValidationException::withMessages([
                    'reservation' => 'You are not authorised to allocate rooms for this reservation.',
                ]);
            }

            $lockedRoomType = PropertyRoomType::query()->where('property_id', $lockedProperty->id)
                ->whereKey($reservation->property_room_type_id)
                ->lockForUpdate()
                ->firstOrFail();

            $lockedReservation = Reservation::query()->whereKey($reservation->id)->lockForUpdate()->firstOrFail();

            if ($lockedReservation->status !== ReservationStatus::Confirmed) {
                throw ValidationException::withMessages([
                    'reservation' => 'Only confirmed reservations can have room allocations.',
                ]);
            }

            $checkIn = $lockedReservation->check_in_date;
            $checkout = $lockedReservation->checkout_date;

            $selectedRoomIds = array_values(array_filter(
                array_map(static fn (array $allocation): int => (int) ($allocation['property_room_id'] ?? 0), $allocations),
                static fn (int $id): bool => $id > 0,
            ));
            $selectedRoomIds = array_unique($selectedRoomIds);
            $currentRoomIds = $lockedReservation->allocations()
                ->pluck('property_room_id')
                ->map(static fn (mixed $id): int => (int) $id)
                ->all();
            $roomIds = array_values(array_unique(array_merge($selectedRoomIds, $currentRoomIds)));
            sort($roomIds);

            $rooms = PropertyRoom::query()->where('property_id', $lockedProperty->id)
                ->where('property_room_type_id', $lockedRoomType->id)
                ->whereIn('id', $roomIds)
                ->lockForUpdate()
                ->orderBy('id')
                ->get();

            $selectedRooms = $rooms->whereIn('id', $selectedRoomIds);

            if ($selectedRooms->count() !== count($selectedRoomIds)) {
                throw ValidationException::withMessages([
                    'allocations' => 'One or more rooms are invalid for this property and room type.',
                ]);
            }

            $totalRequested = array_sum(array_map(
                static fn (array $allocation): int => (int) ($allocation['allocated_quantity'] ?? 0),
                $allocations,
            ));

            if ($totalRequested > (int) $lockedReservation->quantity) {
                throw ValidationException::withMessages([
                    'allocations' => 'Total allocated quantity cannot exceed the reservation quantity.',
                ]);
            }

            $byRoom = [];
            foreach ($allocations as $allocation) {
                $byRoom[(int) $allocation['property_room_id']] = (int) ($allocation['allocated_quantity'] ?? 0);
            }

            foreach ($selectedRooms as $room) {
                if ($room->operational_status !== PropertyRoomStatus::Active) {
                    throw ValidationException::withMessages([
                        'allocations' => 'Room '.$room->room_number.' is not active.',
                    ]);
                }

                if ($this->isBlockedForStay(
                    $lockedProperty,
                    $lockedRoomType,
                    $room,
                    $checkIn->toDateString(),
                    $checkout->toDateString(),
                )) {
                    throw ValidationException::withMessages([
                        'allocations' => 'Room '.$room->room_number.' is blocked for the stay dates.',
                    ]);
                }

                $requested = $byRoom[$room->id] ?? 0;

                if ($lockedReservation->quantity_basis === ReservationQuantityBasis::PrivateRooms && $requested > 1) {
                    throw ValidationException::withMessages([
                        'allocations' => 'Private rooms accept a single allocation each.',
                    ]);
                }

                $occupiedByOthers = (int) ReservationRoomAllocation::query()
                    ->join('reservations', 'reservations.id', '=', 'reservation_room_allocations.reservation_id')
                    ->where('reservation_room_allocations.property_room_id', $room->id)
                    ->where('reservation_room_allocations.reservation_id', '!=', $lockedReservation->id)
                    ->whereIn('reservations.status', ReservationStatus::consumableValues())
                    ->where(function (Builder $q) use ($checkIn, $checkout): void {
                        $q->whereDate('reservations.check_in_date', '<', $checkout)
                            ->whereDate('reservations.checkout_date', '>', $checkIn);
                    })
                    ->sum('reservation_room_allocations.allocated_quantity');
                $roomCapacity = $lockedReservation->quantity_basis === ReservationQuantityBasis::PrivateRooms
                    ? 1
                    : (int) $lockedRoomType->max_guests_per_room;

                if ($occupiedByOthers + $requested > $roomCapacity) {
                    throw ValidationException::withMessages([
                        'allocations' => 'Room '.$room->room_number.' would exceed room-type capacity for the stay.',
                    ]);
                }
            }

            if (! empty($selectedRoomIds)) {
                $lockedReservation->allocations()->whereNotIn('property_room_id', $selectedRoomIds)->delete();
            } else {
                $lockedReservation->allocations()->delete();
            }

            foreach ($selectedRooms as $room) {
                $requested = $byRoom[$room->id] ?? 0;

                if ($requested < 1) {
                    continue;
                }

                ReservationRoomAllocation::updateOrCreate(
                    ['reservation_id' => $lockedReservation->id, 'property_room_id' => $room->id],
                    ['allocated_quantity' => $requested],
                );
            }
        }, 3);
    }

    private function isBlockedForStay(
        Property $property,
        PropertyRoomType $roomType,
        PropertyRoom $room,
        string $checkIn,
        string $checkout,
    ): bool {
        $overlap = function (Builder $q) use ($checkIn, $checkout): void {
            $q->whereDate('start_date', '<', $checkout)
                ->whereDate('end_date', '>=', $checkIn)
                ->where('status', PropertyAvailabilityBlockStatus::Active->value);
        };

        if ($room->availabilityBlocks()->where($overlap)->exists()) {
            return true;
        }

        if ($roomType->availabilityBlocks()->where($overlap)->exists()) {
            return true;
        }

        return $property->availabilityBlocks()
            ->where($overlap)
            ->where('scope', PropertyAvailabilityBlockScope::Property->value)
            ->exists();
    }
}
