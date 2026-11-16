<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProviderTransferReversal extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'reversal_reference',
        'provider_transfer_id',
        'reservation_refund_id',
        'gateway_reversal_id',
        'amount_minor',
        'currency',
        'status',
        'reason',
        'processed_at',
    ];

    /**
     * @return array{
     *     amount_minor: 'integer',
     *     processed_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'processed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<ProviderTransfer, $this>
     */
    public function transfer(): BelongsTo
    {
        return $this->belongsTo(ProviderTransfer::class, 'provider_transfer_id');
    }

    /**
     * @return BelongsTo<ReservationRefund, $this>
     */
    public function refund(): BelongsTo
    {
        return $this->belongsTo(ReservationRefund::class, 'reservation_refund_id');
    }
}
