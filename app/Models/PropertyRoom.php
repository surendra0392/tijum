<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PropertyRoomStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PropertyRoom extends Model
{
    /**
     * Physical rooms are mutated via controlled domain actions.
     *
     * @var list<string>
     */
    protected $fillable = [
        'property_id',
        'property_room_type_id',
        'room_number',
        'operational_status',
        'is_approved_version',
    ];

    /**
     * @return array{
     *     is_approved_version: 'boolean',
     *     operational_status: 'App\\Enums\\PropertyRoomStatus',
     * }
     */
    protected function casts(): array
    {
        return [
            'is_approved_version' => 'boolean',
            'operational_status' => PropertyRoomStatus::class,
        ];
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<PropertyRoomType, $this>
     */
    public function roomType(): BelongsTo
    {
        return $this->belongsTo(PropertyRoomType::class, 'property_room_type_id');
    }

    /**
     * @return BelongsTo<PropertyVerificationApplication, $this>
     */
    public function amendmentApplication(): BelongsTo
    {
        return $this->belongsTo(PropertyVerificationApplication::class, 'amendment_application_id');
    }

    /**
     * @return HasMany<PropertyAvailabilityBlock, $this>
     */
    public function availabilityBlocks(): HasMany
    {
        return $this->hasMany(PropertyAvailabilityBlock::class, 'property_room_id')
            ->orderByDesc('start_date')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyMedia, $this>
     */
    public function media(): HasMany
    {
        return $this->hasMany(PropertyMedia::class, 'property_room_id')
            ->where('is_archived', false)
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    /**
     * @return HasMany<ReservationRoomAllocation, $this>
     */
    public function reservationAllocations(): HasMany
    {
        return $this->hasMany(ReservationRoomAllocation::class, 'property_room_id')
            ->orderBy('id');
    }

    public function configuredCapacity(): int
    {
        $this->loadMissing('roomType');

        return $this->roomType instanceof PropertyRoomType
            ? $this->roomType->max_guests_per_room
            : 0;
    }

    /**
     * @return array<string, mixed>
     */
    public function toPortalArray(): array
    {
        $this->loadMissing('roomType');
        $roomType = $this->roomType;

        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'property_room_type_id' => $this->property_room_type_id,
            'room_type_name' => $roomType->name,
            'accommodation_mode' => $roomType->accommodation_mode->value,
            'accommodation_mode_label' => $roomType->accommodation_mode->label(),
            'is_air_conditioned' => $roomType->is_air_conditioned,
            'max_guests_per_room' => $roomType->max_guests_per_room,
            'room_number' => $this->room_number,
            'floor_number' => $this->floor_number,
            'wing_name' => $this->wing_name,
            'building_name' => $this->building_name,
            'description' => $this->description,
            'operational_status' => $this->operational_status->value,
            'operational_status_label' => $this->operational_status->label(),
            'is_approved_version' => $this->is_approved_version,
            'counts_toward_active_capacity' => $this->operational_status->countsTowardActiveCapacity(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
