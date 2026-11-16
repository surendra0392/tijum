<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ReservationRoomAllocationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $reservation_id
 * @property int $property_room_id
 * @property int $allocated_quantity
 * @property-read Reservation $reservation
 * @property-read PropertyRoom $room
 */
class ReservationRoomAllocation extends Model
{
    /** @use HasFactory<ReservationRoomAllocationFactory> */
    use HasFactory;

    /**
     * Allocations are synced via controlled domain actions.
     *
     * @var list<string>
     */
    protected $guarded = [];

    /**
     * @return array{
     *     allocated_quantity: 'integer',
     * }
     */
    protected function casts(): array
    {
        return [
            'allocated_quantity' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * @return BelongsTo<PropertyRoom, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(PropertyRoom::class, 'property_room_id');
    }
}
