<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CaseCategory;
use App\Enums\CasePriority;
use App\Enums\CaseStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $case_reference
 * @property int $reservation_id
 * @property int $user_id
 * @property int $property_id
 * @property int $owner_id
 * @property CaseCategory $category
 * @property CaseStatus $status
 * @property CasePriority $priority
 * @property string $description
 * @property int|null $assigned_admin_id
 * @property CarbonImmutable|null $acknowledged_at
 * @property CarbonImmutable|null $sla_due_at
 * @property CarbonImmutable|null $resolved_at
 * @property string|null $resolution_type
 * @property string|null $resolution_summary
 * @property CarbonImmutable|null $closed_at
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read Reservation $reservation
 * @property-read User $user
 * @property-read Property $property
 * @property-read Owner $owner
 * @property-read Admin|null $assignedAdmin
 * @property-read Collection<int, CustomerProtectionCaseMessage> $messages
 * @property-read Collection<int, ReservationRelocation> $relocations
 * @property-read Collection<int, ReservationRefund> $refunds
 */
class CustomerProtectionCase extends Model
{
    protected $guarded = [];

    /**
     * @var list<string>
     */
    protected $appends = [
        'first_action_due_at',
        'acknowledgement_due_at',
        'resolution_due_at',
        'first_action_target_hours',
    ];

    /**
     * @return array{
     *     category: 'App\\Enums\\CaseCategory',
     *     status: 'App\\Enums\\CaseStatus',
     *     priority: 'App\\Enums\\CasePriority',
     *     acknowledged_at: 'datetime',
     *     sla_due_at: 'datetime',
     *     resolved_at: 'datetime',
     *     closed_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'category' => CaseCategory::class,
            'status' => CaseStatus::class,
            'priority' => CasePriority::class,
            'acknowledged_at' => 'datetime',
            'sla_due_at' => 'datetime',
            'resolved_at' => 'datetime',
            'closed_at' => 'datetime',
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
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Owner::class);
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'assigned_admin_id');
    }

    /**
     * @return HasMany<CustomerProtectionCaseMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(CustomerProtectionCaseMessage::class, 'customer_protection_case_id')->orderBy('id');
    }

    /**
     * @return HasMany<ReservationRelocation, $this>
     */
    public function relocations(): HasMany
    {
        return $this->hasMany(ReservationRelocation::class, 'customer_protection_case_id')->orderBy('id');
    }

    /**
     * @return HasMany<ReservationRefund, $this>
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(ReservationRefund::class, 'customer_protection_case_id')->orderBy('id');
    }

    public function isOverdue(): bool
    {
        if ($this->status->isTerminal()) {
            return false;
        }

        return $this->sla_due_at !== null && $this->sla_due_at->isPast();
    }

    public function getFirstActionDueAtAttribute(): CarbonImmutable
    {
        $created = CarbonImmutable::parse($this->created_at);
        $hours = $this->priority->firstActionSlaHours();

        return $created->addHours($hours);
    }

    public function getAcknowledgementDueAtAttribute(): CarbonImmutable
    {
        $created = CarbonImmutable::parse($this->created_at);
        $hours = (int) config('tijum.customer_protection.sla.acknowledgement_hours', 48);

        return $created->addHours($hours);
    }

    public function getResolutionDueAtAttribute(): CarbonImmutable
    {
        $created = CarbonImmutable::parse($this->created_at);
        $days = (int) config('tijum.customer_protection.sla.resolution_days', 30);
        $statutoryDeadline = $created->addDays($days);

        // Legacy sla_due_at field must never truncate or override the statutory 30-day resolution deadline
        if ($this->sla_due_at !== null) {
            $parsedSla = CarbonImmutable::parse($this->sla_due_at);

            return $parsedSla->greaterThan($statutoryDeadline) ? $parsedSla : $statutoryDeadline;
        }

        return $statutoryDeadline;
    }

    public function getFirstActionTargetHoursAttribute(): int
    {
        return $this->priority->firstActionSlaHours();
    }
}
