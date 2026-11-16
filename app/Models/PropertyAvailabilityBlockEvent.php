<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class PropertyAvailabilityBlockEvent extends Model
{
    public $timestamps = false;

    /** @var list<string> */
    protected $fillable = [];

    protected static function booted(): void
    {
        static::updating(static function (): void {
            throw new LogicException('Availability block events are append-only and cannot be updated.');
        });

        static::deleting(static function (): void {
            throw new LogicException('Availability block events are append-only and cannot be deleted.');
        });
    }

    /**
     * @return array{
     *     previous_snapshot: 'array',
     *     new_snapshot: 'array',
     *     metadata: 'array',
     *     created_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'previous_snapshot' => 'array',
            'new_snapshot' => 'array',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<PropertyAvailabilityBlock, $this>
     */
    public function block(): BelongsTo
    {
        return $this->belongsTo(PropertyAvailabilityBlock::class, 'property_availability_block_id');
    }

    /**
     * @param  array<string, mixed>|null  $previousSnapshot
     * @param  array<string, mixed>|null  $newSnapshot
     * @param  array<string, mixed>  $metadata
     */
    public static function record(
        PropertyAvailabilityBlock $block,
        string $eventType,
        string $actorType,
        ?int $actorId = null,
        ?string $actorName = null,
        ?array $previousSnapshot = null,
        ?array $newSnapshot = null,
        ?string $notes = null,
        array $metadata = [],
    ): self {
        $event = new self;
        $event->forceFill([
            'property_availability_block_id' => $block->id,
            'property_id' => $block->property_id,
            'event_type' => $eventType,
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'actor_name' => $actorName,
            'previous_snapshot' => $previousSnapshot,
            'new_snapshot' => $newSnapshot,
            'notes' => $notes,
            'metadata' => $metadata === [] ? null : $metadata,
            'created_at' => now(),
        ]);
        $event->save();

        return $event;
    }

    /**
     * @return array<string, mixed>
     */
    public function toTimelineArray(): array
    {
        return [
            'id' => $this->id,
            'property_availability_block_id' => $this->property_availability_block_id,
            'property_id' => $this->property_id,
            'event_type' => $this->event_type,
            'actor_type' => $this->actor_type,
            'actor_id' => $this->actor_id,
            'actor_name' => $this->actor_name,
            'previous_snapshot' => is_array($this->previous_snapshot) ? $this->previous_snapshot : null,
            'new_snapshot' => is_array($this->new_snapshot) ? $this->new_snapshot : null,
            'notes' => $this->notes,
            'metadata' => is_array($this->metadata) ? $this->metadata : [],
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
