<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OwnerVerificationDocumentStatus;
use App\Enums\OwnerVerificationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OwnerVerificationApplication extends Model
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
     *     status: 'App\\Enums\\OwnerVerificationStatus',
     *     revision_number: 'integer',
     *     declaration_accepted_at: 'datetime',
     *     submitted_at: 'datetime',
     *     reviewed_at: 'datetime',
     *     requested_changes: 'array',
     * }
     */
    protected function casts(): array
    {
        return [
            'status' => OwnerVerificationStatus::class,
            'revision_number' => 'integer',
            'declaration_accepted_at' => 'datetime',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'requested_changes' => 'array',
        ];
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
     * @return BelongsTo<Admin, $this>
     */
    public function reviewedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'reviewed_by_admin_id');
    }

    /**
     * @return HasMany<OwnerVerificationDocument, $this>
     */
    public function documents(): HasMany
    {
        return $this->hasMany(OwnerVerificationDocument::class, 'application_id')
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<OwnerVerificationDocument, $this>
     */
    public function activeDocuments(): HasMany
    {
        return $this->hasMany(OwnerVerificationDocument::class, 'application_id')
            ->where('status', '!=', OwnerVerificationDocumentStatus::Replaced->value)
            ->orderByDesc('id');
    }

    /**
     * @return HasMany<OwnerVerificationEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(OwnerVerificationEvent::class, 'verification_application_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    /**
     * @return array{
     *     id: int,
     *     application_number: string,
     *     status: string,
     *     status_label: string,
     *     revision_number: int,
     *     is_active: bool,
     *     is_editable: bool,
     *     can_submit: bool,
     *     can_withdraw: bool,
     *     can_start_revision: bool,
     *     declaration_version: string|null,
     *     declaration_accepted_at: string|null,
     *     submitted_at: string|null,
     *     reviewed_at: string|null,
     *     requested_information: string|null,
     *     requested_changes: list<array<string, mixed>>,
     *     decision_reason: string|null,
     *     created_at: string|null,
     *     updated_at: string|null,
     * }
     */
    public function toOwnerArray(): array
    {
        $requestedChanges = is_array($this->requested_changes)
            ? array_values(array_filter($this->requested_changes, 'is_array'))
            : [];

        return [
            'id' => $this->id,
            'application_number' => $this->application_number,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'revision_number' => $this->revision_number,
            'is_active' => $this->status->isActive(),
            'is_editable' => $this->status->isEditableByOwner(),
            'can_submit' => $this->status->canSubmitByOwner(),
            'can_withdraw' => $this->status->canWithdrawByOwner(),
            'can_start_revision' => in_array($this->status, [
                OwnerVerificationStatus::Rejected,
                OwnerVerificationStatus::Withdrawn,
            ], true),
            'declaration_version' => $this->declaration_version,
            'declaration_accepted_at' => $this->declaration_accepted_at?->toISOString(),
            'submitted_at' => $this->submitted_at?->toISOString(),
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'requested_information' => $this->requested_information,
            'requested_changes' => $requestedChanges,
            'decision_reason' => $this->decision_reason,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
