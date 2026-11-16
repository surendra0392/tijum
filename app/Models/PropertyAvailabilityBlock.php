<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PropertyAvailabilityBlockScope;
use App\Enums\PropertyAvailabilityBlockStatus;
use App\Enums\PropertyAvailabilityBlockType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PropertyAvailabilityBlock extends Model
{
    /** @var list<string> */
    protected $fillable = [];

    /**
     * @return array{
     *     scope: 'App\\Enums\\PropertyAvailabilityBlockScope',
     *     block_type: 'App\\Enums\\PropertyAvailabilityBlockType',
     *     status: 'App\\Enums\\PropertyAvailabilityBlockStatus',
     *     start_date: 'date',
     *     end_date: 'date',
     *     cancelled_at: 'datetime',
     *     is_admin_restriction: 'boolean',
     * }
     */
    protected function casts(): array
    {
        return [
            'scope' => PropertyAvailabilityBlockScope::class,
            'block_type' => PropertyAvailabilityBlockType::class,
            'status' => PropertyAvailabilityBlockStatus::class,
            'start_date' => 'date',
            'end_date' => 'date',
            'cancelled_at' => 'datetime',
            'is_admin_restriction' => 'boolean',
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
     * @return BelongsTo<PropertyRoom, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(PropertyRoom::class, 'property_room_id');
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function createdByOwner(): BelongsTo
    {
        return $this->belongsTo(Owner::class, 'created_by_owner_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'created_by_admin_id');
    }

    /**
     * @return HasMany<PropertyAvailabilityBlockEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(PropertyAvailabilityBlockEvent::class)->orderByDesc('created_at')->orderByDesc('id');
    }

    public function isEffective(): bool
    {
        return $this->status === PropertyAvailabilityBlockStatus::Active;
    }

    /**
     * @return array<string, mixed>
     */
    public function toPortalArray(bool $includeInternal = false): array
    {
        $this->loadMissing(['roomType:id,name', 'room:id,room_number,property_room_type_id']);

        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'scope' => $this->scope->value,
            'scope_label' => $this->scope->label(),
            'property_room_type_id' => $this->property_room_type_id,
            'room_type_name' => $this->roomType?->name,
            'property_room_id' => $this->property_room_id,
            'room_number' => $this->room?->room_number,
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date->toDateString(),
            'block_type' => $this->block_type->value,
            'block_type_label' => $this->block_type->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_admin_restriction' => $this->is_admin_restriction,
            'reason' => $includeInternal ? $this->reason : null,
            'cancellation_reason' => $includeInternal ? $this->cancellation_reason : null,
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
