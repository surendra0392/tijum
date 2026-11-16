<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PropertyVerificationApplication extends Model
{
    /**
     * Workflow fields are managed exclusively via transactional actions.
     *
     * @var list<string>
     */
    protected $fillable = [];

    /**
     * Internal notes must never serialize into default or owner responses.
     *
     * @var list<string>
     */
    protected $hidden = [
        'internal_reviewer_notes',
    ];

    /**
     * @return array{
     *     status: 'App\\Enums\\PropertyVerificationStatus',
     *     revision_number: 'integer',
     *     is_amendment: 'boolean',
     *     ownership_arrangement: 'App\\Enums\\PropertyOwnershipArrangement',
     *     proposed_property_data: 'array',
     *     baseline_snapshot: 'array',
     *     approved_snapshot: 'array',
     *     declaration_accepted_at: 'datetime',
     *     submitted_at: 'datetime',
     *     reviewed_at: 'datetime',
     *     requested_changes: 'array',
     * }
     */
    protected function casts(): array
    {
        return [
            'status' => PropertyVerificationStatus::class,
            'revision_number' => 'integer',
            'is_amendment' => 'boolean',
            'ownership_arrangement' => PropertyOwnershipArrangement::class,
            'proposed_property_data' => 'array',
            'baseline_snapshot' => 'array',
            'approved_snapshot' => 'array',
            'declaration_accepted_at' => 'datetime',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'requested_changes' => 'array',
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
     * @return BelongsTo<self, $this>
     */
    public function parentApplication(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_application_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'assigned_admin_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function reviewedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'reviewed_by_admin_id');
    }

    /**
     * @return HasMany<PropertyVerificationDocument, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(PropertyVerificationDocument::class, 'application_id')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyVerificationDocument, $this>
     */
    public function activeDocuments(): HasMany
    {
        return $this->hasMany(PropertyVerificationDocument::class, 'application_id')
            ->where('status', '!=', PropertyVerificationDocumentStatus::Replaced->value)
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<PropertyVerificationEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(PropertyVerificationEvent::class, 'verification_application_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * @return array<string, mixed>
     */
    public function toOwnerArray(): array
    {
        $requestedChanges = is_array($this->requested_changes)
            ? array_values(array_filter($this->requested_changes, 'is_array'))
            : [];

        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'application_number' => $this->application_number,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'revision_number' => $this->revision_number,
            'is_amendment' => $this->is_amendment,
            'ownership_arrangement' => $this->ownership_arrangement->value,
            'ownership_arrangement_label' => $this->ownership_arrangement->label(),
            'is_active' => $this->status->isActive(),
            'is_editable' => $this->status->isEditableByOwner(),
            'can_submit' => $this->status->canSubmitByOwner(),
            'can_withdraw' => $this->status->canWithdrawByOwner() && ! $this->is_amendment,
            'can_cancel_amendment' => $this->is_amendment && $this->status === PropertyVerificationStatus::Draft,
            'can_start_revision' => in_array($this->status, [
                PropertyVerificationStatus::Rejected,
                PropertyVerificationStatus::Withdrawn,
            ], true),
            'declaration_version' => $this->declaration_version,
            'declaration_accepted_at' => $this->declaration_accepted_at?->toISOString(),
            'submitted_at' => $this->submitted_at?->toISOString(),
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'requested_information' => $this->requested_information,
            'requested_changes' => $requestedChanges,
            'decision_reason' => $this->decision_reason,
            'proposed_property_data' => $this->proposed_property_data,
            'baseline_snapshot' => $this->baseline_snapshot,
            'approved_snapshot' => $this->approved_snapshot,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
