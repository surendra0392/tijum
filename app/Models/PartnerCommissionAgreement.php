<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CommissionAgreementStatus;
use App\Enums\CommissionBaseType;
use App\Enums\CommissionGstType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PartnerCommissionAgreement extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'agreement_reference',
        'owner_id',
        'property_id',
        'commission_rate_bps',
        'commission_base_type',
        'commission_gst_type',
        'terms_version',
        'status',
        'effective_from',
        'effective_until',
        'terms_hash',
        'admin_notes',
        'created_by_admin_id',
        'approved_by_admin_id',
        'accepted_by_owner_id',
        'accepted_at',
    ];

    /**
     * @return array{
     *     commission_rate_bps: 'integer',
     *     commission_base_type: 'App\\Enums\\CommissionBaseType',
     *     commission_gst_type: 'App\\Enums\\CommissionGstType',
     *     status: 'App\\Enums\\CommissionAgreementStatus',
     *     effective_from: 'date',
     *     effective_until: 'date',
     *     accepted_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'commission_rate_bps' => 'integer',
            'commission_base_type' => CommissionBaseType::class,
            'commission_gst_type' => CommissionGstType::class,
            'status' => CommissionAgreementStatus::class,
            'effective_from' => 'date',
            'effective_until' => 'date',
            'accepted_at' => 'datetime',
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
     * @return BelongsTo<Property, $this>
     */
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'created_by_admin_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function approvedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'approved_by_admin_id');
    }

    /**
     * @return BelongsTo<Owner, $this>
     */
    public function acceptedByOwner(): BelongsTo
    {
        return $this->belongsTo(Owner::class, 'accepted_by_owner_id');
    }

    /**
     * @return HasMany<Reservation, $this>
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class, 'commission_agreement_id');
    }

    public function getCommissionPercentage(): float
    {
        return $this->commission_rate_bps / 100.0;
    }

    public function isEffectiveForDate(\DateTimeInterface $date): bool
    {
        $dateStr = $date->format('Y-m-d');
        if ($this->effective_from->format('Y-m-d') > $dateStr) {
            return false;
        }

        if ($this->effective_until !== null && $this->effective_until->format('Y-m-d') < $dateStr) {
            return false;
        }

        return $this->status === CommissionAgreementStatus::Active;
    }

    public function generateTermsHash(): string
    {
        $payload = implode('|', [
            $this->owner_id,
            $this->property_id ?? 'all',
            $this->commission_rate_bps,
            $this->commission_base_type->value,
            $this->commission_gst_type->value,
            $this->terms_version,
            $this->effective_from->format('Y-m-d'),
        ]);

        return hash('sha256', $payload);
    }
}
