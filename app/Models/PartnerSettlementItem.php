<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SettlementItemType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerSettlementItem extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'partner_settlement_id',
        'reservation_id',
        'reservation_payment_id',
        'item_type',
        'gross_amount_minor',
        'commission_amount_minor',
        'commission_tax_amount_minor',
        'tax_deduction_minor',
        'refund_deduction_minor',
        'net_payable_minor',
        'notes',
    ];

    /**
     * @return array{
     *     item_type: 'App\\Enums\\SettlementItemType',
     *     gross_amount_minor: 'integer',
     *     commission_amount_minor: 'integer',
     *     commission_tax_amount_minor: 'integer',
     *     tax_deduction_minor: 'integer',
     *     refund_deduction_minor: 'integer',
     *     net_payable_minor: 'integer',
     * }
     */
    protected function casts(): array
    {
        return [
            'item_type' => SettlementItemType::class,
            'gross_amount_minor' => 'integer',
            'commission_amount_minor' => 'integer',
            'commission_tax_amount_minor' => 'integer',
            'tax_deduction_minor' => 'integer',
            'refund_deduction_minor' => 'integer',
            'net_payable_minor' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<PartnerSettlement, $this>
     */
    public function settlement(): BelongsTo
    {
        return $this->belongsTo(PartnerSettlement::class, 'partner_settlement_id');
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * @return BelongsTo<ReservationPayment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(ReservationPayment::class, 'reservation_payment_id');
    }
}
