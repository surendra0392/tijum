<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\RefundStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $reservation_payment_id
 * @property int $reservation_id
 * @property int $initiated_by_admin_id
 * @property string|null $gateway_refund_id
 * @property string $idempotency_key
 * @property int $amount_minor
 * @property string $currency
 * @property RefundStatus $status
 * @property string $reason
 * @property CarbonImmutable|null $gateway_processed_at
 * @property string|null $failure_reason
 * @property array<string, mixed>|null $metadata
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read ReservationPayment $payment
 * @property-read Reservation $reservation
 * @property-read Admin $initiatedByAdmin
 */
class ReservationRefund extends Model
{
    protected $guarded = [];

    /**
     * @return array{
     *     status: 'App\\Enums\\RefundStatus',
     *     amount_minor: 'integer',
     *     metadata: 'array',
     *     gateway_processed_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'status' => RefundStatus::class,
            'amount_minor' => 'integer',
            'metadata' => 'array',
            'gateway_processed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<ReservationPayment, $this>
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(ReservationPayment::class, 'reservation_payment_id');
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
    public function initiatedByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'initiated_by_admin_id');
    }

    /**
     * @return BelongsTo<CustomerProtectionCase, $this>
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(CustomerProtectionCase::class, 'customer_protection_case_id');
    }
}
