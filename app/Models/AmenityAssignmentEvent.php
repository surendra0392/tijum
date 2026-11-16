<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AmenityAssignmentEventType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AmenityAssignmentEvent extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [];

    public $timestamps = false;

    /**
     * @return array{
     *     event_type: 'App\\Enums\\AmenityAssignmentEventType',
     *     metadata: 'array',
     *     created_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'event_type' => AmenityAssignmentEventType::class,
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function assignable(): MorphTo
    {
        return $this->morphTo();
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
     * @return BelongsTo<Amenity, $this>
     */
    public function amenity(): BelongsTo
    {
        return $this->belongsTo(Amenity::class);
    }

    /**
     * @param  array<string, mixed>|null  $metadata
     */
    public static function record(
        PropertyAmenity|PropertyRoomTypeAmenity $assignment,
        AmenityAssignmentEventType $eventType,
        string $actorType,
        ?int $actorId = null,
        ?string $actorName = null,
        ?string $previousStatus = null,
        ?string $newStatus = null,
        ?string $notes = null,
        ?array $metadata = null,
    ): self {
        $event = new self;
        $event->forceFill([
            'assignable_type' => $assignment instanceof PropertyAmenity ? 'property_amenity' : 'room_type_amenity',
            'assignable_id' => $assignment->id,
            'property_id' => $assignment->property_id,
            'property_room_type_id' => $assignment instanceof PropertyRoomTypeAmenity ? $assignment->property_room_type_id : null,
            'amenity_id' => $assignment->amenity_id,
            'event_type' => $eventType,
            'previous_status' => $previousStatus,
            'new_status' => $newStatus,
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'actor_name' => $actorName,
            'notes' => $notes,
            'metadata' => $metadata,
            'created_at' => now(),
        ])->save();

        return $event;
    }

    /**
     * @return array<string, mixed>
     */
    public function toPortalArray(): array
    {
        return [
            'id' => $this->id,
            'assignable_type' => $this->assignable_type,
            'assignable_id' => $this->assignable_id,
            'event_type' => $this->event_type->value,
            'event_type_label' => $this->event_type->label(),
            'previous_status' => $this->previous_status,
            'new_status' => $this->new_status,
            'actor_type' => $this->actor_type,
            'actor_name' => $this->actor_name,
            'notes' => $this->notes,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
