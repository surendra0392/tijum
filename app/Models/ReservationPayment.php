<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PaymentStatus;
use App\Enums\RefundStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $reservation_id
 * @property int $user_id
 * @property string $gateway
 * @property string $gateway_order_id
 * @property string|null $gateway_payment_id
 * @property string $idempotency_key
 * @property int $amount_minor
 * @property string $currency
 * @property PaymentStatus $status
 * @property string|null $failure_code
 * @property string|null $failure_description
 * @property CarbonImmutable|null $gateway_order_created_at
 * @property CarbonImmutable|null $captured_at
 * @property array<string, mixed>|null $metadata
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read Reservation $reservation
 * @property-read User $user
 * @property-read Collection<int, ReservationRefund> $refunds
 */
class ReservationPayment extends Model
{
    protected $guarded = [];

    /**
     * @return array{
     *     status: 'App\\Enums\\PaymentStatus',
     *     amount_minor: 'integer',
     *     metadata: 'array',
     *     gateway_order_created_at: 'datetime',
     *     captured_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'status' => PaymentStatus::class,
            'amount_minor' => 'integer',
            'metadata' => 'array',
            'gateway_order_created_at' => 'datetime',
            'captured_at' => 'datetime',
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
     * @return HasMany<ReservationRefund, $this>
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(ReservationRefund::class, 'reservation_payment_id')
            ->orderBy('id');
    }

    public function isCaptured(): bool
    {
        return in_array($this->status, [
            PaymentStatus::Captured,
            PaymentStatus::RefundPending,
            PaymentStatus::PartiallyRefunded,
            PaymentStatus::Refunded,
        ], true);
    }

    public function totalRefundedAmount(): int
    {
        return (int) $this->refunds()
            ->where('status', RefundStatus::Processed->value)
            ->sum('amount_minor');
    }

    public function getPaymentMethodAttribute(): ?string
    {
        return $this->metadata['gateway_payment']['method']
            ?? $this->metadata['method']
            ?? null;
    }

    public function getFailureReasonAttribute(): ?string
    {
        return $this->failure_description;
    }

    public function getFailedAtAttribute(): ?CarbonImmutable
    {
        return $this->status === PaymentStatus::Failed ? $this->updated_at : null;
    }

    public function getRefundedAmountMinorAttribute(): int
    {
        return $this->totalRefundedAmount();
    }

    public function pendingRefundAmount(): int
    {
        return (int) $this->refunds()
            ->whereIn('status', [
                RefundStatus::Pending->value,
                RefundStatus::Processing->value,
                RefundStatus::Approved->value,
            ])
            ->sum('amount_minor');
    }

    public function remainingRefundableAmount(): int
    {
        $nonRefundable = $this->totalRefundedAmount() + $this->pendingRefundAmount();

        return max(0, $this->amount_minor - $nonRefundable);
    }

    public function refundableBalanceMinor(): int
    {
        return $this->remainingRefundableAmount();
    }
}
