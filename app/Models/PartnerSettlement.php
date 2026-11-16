<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SettlementStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PartnerSettlement extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'settlement_reference',
        'owner_id',
        'owner_financial_profile_id',
        'period_start',
        'period_end',
        'currency',
        'gross_booking_value_minor',
        'commission_amount_minor',
        'commission_tax_amount_minor',
        'statutory_deductions_minor',
        'refund_adjustments_minor',
        'relocation_adjustments_minor',
        'other_adjustments_minor',
        'net_settlement_amount_minor',
        'status',
        'approved_by_admin_id',
        'approved_at',
        'transfer_initiated_at',
        'settled_at',
        'provider_transfer_id',
        'provider_status',
        'failure_reason',
        'admin_notes',
        'reconciled_at',
    ];

    /**
     * @return array{
     *     period_start: 'date',
     *     period_end: 'date',
     *     gross_booking_value_minor: 'integer',
     *     commission_amount_minor: 'integer',
     *     commission_tax_amount_minor: 'integer',
     *     statutory_deductions_minor: 'integer',
     *     refund_adjustments_minor: 'integer',
     *     relocation_adjustments_minor: 'integer',
     *     other_adjustments_minor: 'integer',
     *     net_settlement_amount_minor: 'integer',
     *     status: 'App\\Enums\\SettlementStatus',
     *     approved_at: 'datetime',
     *     transfer_initiated_at: 'datetime',
     *     settled_at: 'datetime',
     *     reconciled_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'gross_booking_value_minor' => 'integer',
            'commission_amount_minor' => 'integer',
            'commission_tax_amount_minor' => 'integer',
            'statutory_deductions_minor' => 'integer',
            'refund_adjustments_minor' => 'integer',
            'relocation_adjustments_minor' => 'integer',
            'other_adjustments_minor' => 'integer',
            'net_settlement_amount_minor' => 'integer',
            'status' => SettlementStatus::class,
            'approved_at' => 'datetime',
            'transfer_initiated_at' => 'datetime',
            'settled_at' => 'datetime',
            'reconciled_at' => 'datetime',
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
     * @return BelongsTo<OwnerFinancialProfile, $this>
     */
    public function financialProfile(): BelongsTo
    {
        return $this->belongsTo(OwnerFinancialProfile::class, 'owner_financial_profile_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function approvedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'approved_by_admin_id');
    }

    /**
     * @return HasMany<PartnerSettlementItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PartnerSettlementItem::class);
    }

    /**
     * @return HasMany<ProviderTransfer, $this>
     */
    public function providerTransfers(): HasMany
    {
        return $this->hasMany(ProviderTransfer::class);
    }
}
