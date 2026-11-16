<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class PropertyVerificationEvent extends Model
{
    public $timestamps = false;

    /**
     * Audit events are append-only via PropertyVerificationEvent::record().
     *
     * @var list<string>
     */
    protected $fillable = [];

    protected static function booted(): void
    {
        static::updating(static function (): void {
            throw new LogicException('Property verification events are append-only and cannot be updated.');
        });

        static::deleting(static function (): void {
            throw new LogicException('Property verification events are append-only and cannot be deleted.');
        });
    }

    /**
     * @return array{
     *     event_type: 'App\\Enums\\PropertyVerificationEventType',
     *     metadata: 'array',
     *     created_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'event_type' => PropertyVerificationEventType::class,
            'metadata' => 'array',
            'created_at' => 'datetime',
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
     * @return BelongsTo<PropertyVerificationApplication, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(PropertyVerificationApplication::class, 'verification_application_id');
    }

    /**
     * Append an immutable audit event for a property and/or verification revision.
     *
     * @param  array<string, mixed>  $metadata
     */
    public static function record(
        Property $property,
        ?PropertyVerificationApplication $application,
        PropertyVerificationEventType $eventType,
        string $actorType,
        ?int $actorId = null,
        ?string $actorName = null,
        ?PropertyVerificationStatus $previousStatus = null,
        ?PropertyVerificationStatus $newStatus = null,
        ?string $notes = null,
        array $metadata = [],
    ): self {
        $event = new self;
        $event->forceFill([
            'property_id' => $property->id,
            'verification_application_id' => $application?->id,
            'event_type' => $eventType->value,
            'previous_status' => $previousStatus?->value,
            'new_status' => $newStatus?->value,
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'actor_name' => $actorName,
            'notes' => $notes,
            'metadata' => $metadata === [] ? null : $metadata,
            'created_at' => now(),
        ]);
        $event->save();

        return $event;
    }

    /**
     * @return array{
     *     id: int,
     *     property_id: int,
     *     verification_application_id: int|null,
     *     event_type: string,
     *     event_label: string,
     *     previous_status: string|null,
     *     new_status: string|null,
     *     actor_type: string,
     *     actor_name: string|null,
     *     notes: string|null,
     *     metadata: array<string, mixed>,
     *     created_at: string|null,
     * }
     */
    public function toTimelineArray(): array
    {
        $metadata = is_array($this->metadata) ? $this->metadata : [];

        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'verification_application_id' => $this->verification_application_id,
            'event_type' => $this->event_type->value,
            'event_label' => $this->event_type->label(),
            'previous_status' => $this->previous_status,
            'new_status' => $this->new_status,
            'actor_type' => $this->actor_type,
            'actor_name' => $this->actor_name,
            'notes' => $this->notes,
            'metadata' => $metadata,
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
