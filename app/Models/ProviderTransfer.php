<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ProviderTransferStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProviderTransfer extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'transfer_reference',
        'partner_settlement_id',
        'reservation_payment_id',
        'gateway',
        'gateway_transfer_id',
        'destination_account_id',
        'amount_minor',
        'currency',
        'idempotency_key',
        'status',
        'processed_at',
        'error_code',
        'error_description',
        'raw_response',
    ];

    /**
     * @return array{
     *     amount_minor: 'integer',
     *     status: 'App\\Enums\\ProviderTransferStatus',
     *     processed_at: 'datetime',
     *     raw_response: 'array',
     * }
     */
    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'status' => ProviderTransferStatus::class,
            'processed_at' => 'datetime',
            'raw_response' => 'array',
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
     * @return BelongsTo<ReservationPayment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(ReservationPayment::class, 'reservation_payment_id');
    }

    /**
     * @return HasMany<ProviderTransferReversal, $this>
     */
    public function reversals(): HasMany
    {
        return $this->hasMany(ProviderTransferReversal::class);
    }
}
