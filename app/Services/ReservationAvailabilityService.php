<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\ReservationStatus;
use App\Models\Property;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\Reservation;
use App\Models\ReservationRoomAllocation;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Derives bookable capacity from active physical rooms only and measures it
 * against consuming (pending/confirmed) reservations over half-open stays.
 */
class ReservationAvailabilityService
{
    public function __construct(private readonly StayTimingPolicy $timing) {}

    /**
     * Capacity of a room type for a single date, honouring active rooms and
     * active property / room-type / room blocks with inclusive end dates.
     */
    public function capacityForDate(PropertyRoomType $roomType, string $date): int
    {
        $roomType->loadMissing('property');

        if (! $roomType->is_active || ! $roomType->property instanceof Property) {
            return 0;
        }

        if ($this->propertyBlockedOnDate($roomType->property, $date)) {
            return 0;
        }

        if ($this->roomTypeBlockedOnDate($roomType, $date)) {
            return 0;
        }

        return (int) $roomType->rooms()->where('operational_status', PropertyRoomStatus::Active->value)
            ->whereDoesntHave('availabilityBlocks', function (Builder $q) use ($date): void {
                $q->whereDate('start_date', '<=', $date)
                    ->whereDate('end_date', '>=', $date)
                    ->where('scope', PropertyAvailabilityBlockScope::Room->value)
                    ->where('status', PropertyAvailabilityBlockStatus::Active->value);
            })
            ->count() * $this->placesPerRoom($roomType);
    }

    /**
     * @return array{
     *     dates: array<string, array{capacity: int, occupied: int, remaining: int}>,
     *     capacity: int,
     *     occupied: int,
     *     remaining: int,
     *     minimum_remaining: int,
     *     available: bool,
     * }
     */
    public function stayCapacity(
        PropertyRoomType $roomType,
        string $checkInDate,
        string $checkoutDate,
        int $requestedQuantity,
    ): array {
        $checkIn = CarbonImmutable::parse($checkInDate, $this->timing->timezone())->startOfDay();
        $checkout = CarbonImmutable::parse($checkoutDate, $this->timing->timezone())->startOfDay();

        if (! $checkIn->lessThan($checkout)) {
            return [
                'dates' => [],
                'capacity' => 0,
                'occupied' => 0,
                'remaining' => 0,
                'minimum_remaining' => 0,
                'available' => false,
            ];
        }

        $roomType->loadMissing('property');
        $propertyBlocks = $roomType->property->availabilityBlocks()
            ->where('scope', PropertyAvailabilityBlockScope::Property->value)
            ->where('status', PropertyAvailabilityBlockStatus::Active->value)
            ->whereDate('start_date', '<', $checkout->toDateString())
            ->whereDate('end_date', '>=', $checkIn->toDateString())
            ->get();
        $roomTypeBlocks = $roomType->availabilityBlocks()
            ->where('scope', PropertyAvailabilityBlockScope::RoomType->value)
            ->where('status', PropertyAvailabilityBlockStatus::Active->value)
            ->whereDate('start_date', '<', $checkout->toDateString())
            ->whereDate('end_date', '>=', $checkIn->toDateString())
            ->get();
        $rooms = $roomType->rooms()
            ->where('operational_status', PropertyRoomStatus::Active->value)
            ->with(['availabilityBlocks' => function ($query) use ($checkIn, $checkout): void {
                $query->where('scope', PropertyAvailabilityBlockScope::Room->value)
                    ->where('status', PropertyAvailabilityBlockStatus::Active->value)
                    ->whereDate('start_date', '<', $checkout->toDateString())
                    ->whereDate('end_date', '>=', $checkIn->toDateString());
            }])
            ->get();
        $reservations = $this->consumingOverlapping(
            $roomType,
            $checkIn->toDateString(),
            $checkout->toDateString(),
        )->get(['check_in_date', 'checkout_date', 'quantity']);

        $dates = [];
        $minimumRemaining = null;
        $date = $checkIn->copy();

        while ($date->lessThan($checkout)) {
            $dateString = $date->toDateString();
            $globallyBlocked = $propertyBlocks->contains(
                fn ($block): bool => $this->blockCoversDate($block->start_date, $block->end_date, $date),
            ) || $roomTypeBlocks->contains(
                fn ($block): bool => $this->blockCoversDate($block->start_date, $block->end_date, $date),
            );
            $availableRoomCount = $globallyBlocked
                ? 0
                : $rooms->filter(fn (PropertyRoom $room): bool => ! $room->availabilityBlocks->contains(
                    fn ($block): bool => $this->blockCoversDate($block->start_date, $block->end_date, $date),
                ))->count();
            $capacity = $availableRoomCount * $this->placesPerRoom($roomType);
            $occupied = (int) $reservations
                ->filter(fn (Reservation $reservation): bool => CarbonImmutable::parse(
                    $reservation->check_in_date->toDateString(),
                    $this->timing->timezone(),
                )->startOfDay()->lte($date)
                    && CarbonImmutable::parse(
                        $reservation->checkout_date->toDateString(),
                        $this->timing->timezone(),
                    )->startOfDay()->gt($date))
                ->sum('quantity');
            $remaining = max(0, $capacity - $occupied);

            $dates[$dateString] = [
                'capacity' => $capacity,
                'occupied' => $occupied,
                'remaining' => $remaining,
            ];

            $minimumRemaining = $minimumRemaining === null
                ? $remaining
                : min($minimumRemaining, $remaining);

            $date = $date->addDay();
        }

        $minimumRemaining = $minimumRemaining ?? 0;

        return [
            'dates' => $dates,
            'capacity' => array_sum(array_column($dates, 'capacity')),
            'occupied' => array_sum(array_column($dates, 'occupied')),
            'remaining' => array_sum(array_column($dates, 'remaining')),
            'minimum_remaining' => $minimumRemaining,
            'available' => $minimumRemaining >= $requestedQuantity,
        ];
    }

    /**
     * Consuming reservations for a room type overlapping a stay interval.
     *
     * @return Builder<Reservation>
     */
    public function consumingOverlapping(
        PropertyRoomType $roomType,
        string $checkInDate,
        string $checkoutDate,
    ): Builder {
        return Reservation::query()
            ->where('property_room_type_id', $roomType->id)
            ->consuming()
            ->overlapping($checkInDate, $checkoutDate);
    }

    /**
     * Whether a property-level or room-type-level block overlaps any consuming
     * reservation on the property (optionally scoped to one room type).
     */
    public function blockOverlapsConsumingReservations(
        Property $property,
        ?PropertyRoomType $roomType,
        string $startDate,
        string $endDate,
    ): bool {
        $checkoutExclusive = CarbonImmutable::parse($endDate, $this->timing->timezone())
            ->addDay()
            ->toDateString();
        $query = Reservation::query()
            ->where('property_id', $property->id)
            ->consuming()
            ->overlapping($startDate, $checkoutExclusive);

        if ($roomType instanceof PropertyRoomType) {
            $query->where('property_room_type_id', $roomType->id);
        }

        return $query->exists();
    }

    /**
     * Whether deactivating or blocking a single physical room still leaves
     * enough derived capacity for its room type across the block dates.
     */
    public function roomExclusionCoversOccupancy(
        PropertyRoom $room,
        string $startDate,
        string $endDate,
    ): bool {
        $roomType = $room->roomType;

        if (! $roomType instanceof PropertyRoomType) {
            return false;
        }

        $checkoutExclusive = CarbonImmutable::parse($endDate, $this->timing->timezone())
            ->addDay()
            ->toDateString();

        $hasOverlappingAllocation = ReservationRoomAllocation::query()
            ->join('reservations', 'reservations.id', '=', 'reservation_room_allocations.reservation_id')
            ->where('reservation_room_allocations.property_room_id', $room->id)
            ->where(function (Builder $sub): void {
                $sub->where('reservations.status', ReservationStatus::Confirmed)
                    ->orWhere(function (Builder $q): void {
                        $q->where('reservations.status', ReservationStatus::AwaitingPayment)
                            ->where(function (Builder $d): void {
                                $d->whereNull('reservations.payment_deadline_at')
                                    ->orWhere('reservations.payment_deadline_at', '>=', now());
                            });
                    });
            })
            ->whereDate('reservations.check_in_date', '<', $checkoutExclusive)
            ->whereDate('reservations.checkout_date', '>', $startDate)
            ->exists();

        if ($hasOverlappingAllocation) {
            return false;
        }

        $checkIn = CarbonImmutable::parse($startDate, $this->timing->timezone())->startOfDay();
        $end = CarbonImmutable::parse($endDate, $this->timing->timezone())->startOfDay();
        $date = $checkIn->copy();

        while ($date->lte($end)) {
            $dateString = $date->toDateString();

            $capacity = (int) $roomType->rooms()->where('operational_status', PropertyRoomStatus::Active->value)
                ->where('id', '!=', $room->id)
                ->whereDoesntHave('availabilityBlocks', function (Builder $q) use ($dateString): void {
                    $q->whereDate('start_date', '<=', $dateString)
                        ->whereDate('end_date', '>=', $dateString)
                        ->where('scope', PropertyAvailabilityBlockScope::Room->value)
                        ->where('status', PropertyAvailabilityBlockStatus::Active->value);
                })
                ->count() * $this->placesPerRoom($roomType);

            if ($capacity < $this->occupiedForDate($roomType, $dateString)) {
                return false;
            }

            $date = $date->addDay();
        }

        return true;
    }

    private function occupiedForDate(PropertyRoomType $roomType, string $date): int
    {
        return (int) Reservation::query()
            ->where('property_room_type_id', $roomType->id)
            ->consuming()
            ->whereDate('check_in_date', '<=', $date)
            ->whereDate('checkout_date', '>', $date)
            ->sum('quantity');
    }

    private function propertyBlockedOnDate(Property $property, string $date): bool
    {
        return (bool) $property->availabilityBlocks()
            ->where('scope', PropertyAvailabilityBlockScope::Property->value)
            ->where('status', PropertyAvailabilityBlockStatus::Active->value)
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->exists();
    }

    private function roomTypeBlockedOnDate(PropertyRoomType $roomType, string $date): bool
    {
        return (bool) $roomType->availabilityBlocks()
            ->where('scope', PropertyAvailabilityBlockScope::RoomType->value)
            ->where('status', PropertyAvailabilityBlockStatus::Active->value)
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->exists();
    }

    private function placesPerRoom(PropertyRoomType $roomType): int
    {
        return $roomType->accommodation_mode->value === 'shared'
            ? (int) $roomType->max_guests_per_room
            : 1;
    }

    private function blockCoversDate(mixed $startDate, mixed $endDate, CarbonImmutable $date): bool
    {
        return CarbonImmutable::parse($startDate, $this->timing->timezone())->startOfDay()->lte($date)
            && CarbonImmutable::parse($endDate, $this->timing->timezone())->startOfDay()->gte($date);
    }
}
