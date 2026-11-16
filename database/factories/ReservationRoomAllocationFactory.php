<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\PropertyRoomStatus;
use App\Models\PropertyRoom;
use App\Models\Reservation;
use App\Models\ReservationRoomAllocation;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ReservationRoomAllocation>
 */
class ReservationRoomAllocationFactory extends Factory
{
    protected $model = ReservationRoomAllocation::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reservation_id' => Reservation::factory()->create()->id,
            'property_room_id' => static fn (array $attributes): int => self::resolveRoom((int) $attributes['reservation_id'])->id,
            'allocated_quantity' => $this->faker->numberBetween(1, 3),
        ];
    }

    private static function resolveRoom(int $reservationId): PropertyRoom
    {
        $reservation = Reservation::query()->whereKey($reservationId)->firstOrFail();
        $room = $reservation->roomType?->rooms()
            ->where('operational_status', PropertyRoomStatus::Active->value)
            ->first();

        if ($room instanceof PropertyRoom) {
            return $room;
        }

        $room = new PropertyRoom;
        $room->forceFill([
            'property_id' => $reservation->property_id,
            'property_room_type_id' => $reservation->property_room_type_id,
            'room_number' => 'F-'.Str::upper(Str::random(8)),
            'operational_status' => PropertyRoomStatus::Active->value,
            'is_approved_version' => true,
        ])->save();

        return $room;
    }
}
