<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OwnerVerificationEventType;
use App\Enums\OwnerVerificationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class OwnerVerificationEvent extends Model
{
    public $timestamps = false;

    /**
     * Audit events are append-only via OwnerVerificationEvent::record().
     *
     * @var list<string>
     */
    protected $fillable = [];

    protected static function booted(): void
    {
        static::updating(static function (): void {
            throw new LogicException('Owner verification events are append-only and cannot be updated.');
        });

        static::deleting(static function (): void {
            throw new LogicException('Owner verification events are append-only and cannot be deleted.');
        });
    }

    /**
     * @return array{
     *     event_type: 'App\\Enums\\OwnerVerificationEventType',
     *     metadata: 'array',
     *     created_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'event_type' => OwnerVerificationEventType::class,
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<OwnerVerificationApplication, $this>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(OwnerVerificationApplication::class, 'verification_application_id');
    }

    /**
     * Append an immutable audit event for a partner verification application.
     *
     * @param  array<string, mixed>  $metadata
     */
    public static function record(
        OwnerVerificationApplication $application,
        OwnerVerificationEventType $eventType,
        string $actorType,
        ?int $actorId = null,
        ?string $actorName = null,
        ?OwnerVerificationStatus $previousStatus = null,
        ?OwnerVerificationStatus $newStatus = null,
        ?string $notes = null,
        array $metadata = [],
    ): self {
        $event = new self;
        $event->forceFill([
            'verification_application_id' => $application->id,
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
     *     event_type: string,
     *     event_label: string,
     *     previous_status: string|null,
     *     new_status: string|null,
     *     actor_type: string,
     *     actor_name: string|null,
     *     notes: string|null,
     *     created_at: string|null,
     * }
     */
    public function toOwnerArray(): array
    {
        $actorLabel = match ($this->actor_type) {
            'admin' => 'TIJUM Verification Team',
            'owner' => $this->actor_name ?? 'Owner',
            default => 'System',
        };

        return [
            'id' => $this->id,
            'event_type' => $this->event_type->value,
            'event_label' => $this->event_type->label(),
            'previous_status' => $this->previous_status,
            'new_status' => $this->new_status,
            'actor_type' => $this->actor_type,
            'actor_name' => $actorLabel,
            'notes' => $this->notes,
            'created_at' => $this->created_at->toISOString(),
        ];
    }

    /**
     * @return array{
     *     id: int,
     *     event_type: string,
     *     event_label: string,
     *     previous_status: string|null,
     *     new_status: string|null,
     *     actor_type: string,
     *     actor_id: int|null,
     *     actor_name: string|null,
     *     notes: string|null,
     *     metadata: array<string, mixed>,
     *     created_at: string|null,
     * }
     */
    public function toAdminArray(): array
    {
        return [
            'id' => $this->id,
            'event_type' => $this->event_type->value,
            'event_label' => $this->event_type->label(),
            'previous_status' => $this->previous_status,
            'new_status' => $this->new_status,
            'actor_type' => $this->actor_type,
            'actor_id' => $this->actor_id,
            'actor_name' => $this->actor_name,
            'notes' => $this->notes,
            'metadata' => is_array($this->metadata) ? $this->metadata : [],
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
