<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $coupon_code_id
 * @property int $user_id
 * @property int|null $reservation_id
 * @property string $hold_reference
 * @property int $discount_amount_minor
 * @property CarbonImmutable|null $expires_at
 * @property string $status
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read CouponCode $couponCode
 * @property-read User $user
 * @property-read Reservation|null $reservation
 */
class CouponHold extends Model
{
    protected $fillable = [
        'coupon_code_id',
        'user_id',
        'reservation_id',
        'hold_reference',
        'discount_amount_minor',
        'expires_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'discount_amount_minor' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<CouponCode, $this>
     */
    public function couponCode(): BelongsTo
    {
        return $this->belongsTo(CouponCode::class, 'coupon_code_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class, 'reservation_id');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->where('expires_at', '>', now());
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
