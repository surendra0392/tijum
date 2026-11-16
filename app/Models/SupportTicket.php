<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SupportTicketPriority;
use App\Enums\SupportTicketStatus;
use App\Enums\SupportTicketType;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $ticket_reference
 * @property SupportTicketType $ticket_type
 * @property int|null $user_id
 * @property int|null $owner_id
 * @property int|null $property_id
 * @property int|null $reservation_id
 * @property string $subject
 * @property string $category
 * @property SupportTicketStatus $status
 * @property SupportTicketPriority $priority
 * @property string $message
 * @property int|null $assigned_admin_id
 * @property CarbonImmutable|null $sla_due_at
 * @property CarbonImmutable|null $resolved_at
 * @property string|null $resolution_summary
 * @property CarbonImmutable|null $closed_at
 * @property CarbonImmutable|null $last_reply_at
 * @property string|null $last_reply_by_type
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read User|null $user
 * @property-read Owner|null $owner
 * @property-read Property|null $property
 * @property-read Reservation|null $reservation
 * @property-read Admin|null $assignedAdmin
 * @property-read Collection<int, SupportTicketMessage> $messages
 */
class SupportTicket extends Model
{
    protected $guarded = [];

    /**
     * Look up by public ticket reference in routes.
     */
    public function getRouteKeyName(): string
    {
        return 'ticket_reference';
    }

    protected function casts(): array
    {
        return [
            'ticket_type' => SupportTicketType::class,
            'status' => SupportTicketStatus::class,
            'priority' => SupportTicketPriority::class,
            'sla_due_at' => 'datetime',
            'resolved_at' => 'datetime',
            'closed_at' => 'datetime',
            'last_reply_at' => 'datetime',
        ];
    }

    public static function generateReference(SupportTicketType $type): string
    {
        $prefix = $type->prefix();
        $year = now()->format('Y');
        $random = strtoupper(Str::random(6));

        return sprintf('%s-%s-%s', $prefix, $year, $random);
    }

    public function isOverdue(): bool
    {
        if ($this->status->isTerminal()) {
            return false;
        }

        return $this->sla_due_at !== null && $this->sla_due_at->isPast();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'assigned_admin_id');
    }

    /**
     * @return HasMany<SupportTicketMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(SupportTicketMessage::class)->orderBy('created_at');
    }
}
