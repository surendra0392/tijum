<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxConfiguration extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'code',
        'name',
        'legal_reference',
        'supplier_type',
        'rate_bps',
        'calculation_base',
        'threshold_minor',
        'is_exempt',
        'effective_from',
        'effective_until',
        'is_approved',
        'approved_by_admin_id',
        'ca_approval_reference',
        'notes',
    ];

    /**
     * @return array{
     *     rate_bps: 'integer',
     *     threshold_minor: 'integer',
     *     is_exempt: 'boolean',
     *     effective_from: 'date',
     *     effective_until: 'date',
     *     is_approved: 'boolean',
     * }
     */
    protected function casts(): array
    {
        return [
            'rate_bps' => 'integer',
            'threshold_minor' => 'integer',
            'is_exempt' => 'boolean',
            'effective_from' => 'date',
            'effective_until' => 'date',
            'is_approved' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function approvedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'approved_by_admin_id');
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

        return $this->is_approved;
    }
}
