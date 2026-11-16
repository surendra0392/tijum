<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $coupon_code_id
 * @property int $user_id
 * @property int $reservation_id
 * @property int $discount_amount_minor
 * @property int $platform_funded_amount_minor
 * @property int $property_funded_amount_minor
 * @property int $bonus_points_awarded
 * @property CarbonImmutable|null $redeemed_at
 * @property bool $is_reverted
 * @property CarbonImmutable|null $reverted_at
 * @property string|null $reversion_reason
 * @property-read CouponCode|null $couponCode
 * @property-read User|null $user
 * @property-read Reservation|null $reservation
 */
class CouponRedemption extends Model
{
    protected $fillable = [
        'coupon_code_id',
        'user_id',
        'reservation_id',
        'discount_amount_minor',
        'platform_funded_amount_minor',
        'property_funded_amount_minor',
        'bonus_points_awarded',
        'redeemed_at',
        'is_reverted',
        'reverted_at',
        'reversion_reason',
    ];

    protected function casts(): array
    {
        return [
            'discount_amount_minor' => 'integer',
            'platform_funded_amount_minor' => 'integer',
            'property_funded_amount_minor' => 'integer',
            'bonus_points_awarded' => 'integer',
            'redeemed_at' => 'datetime',
            'is_reverted' => 'boolean',
            'reverted_at' => 'datetime',
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
}
