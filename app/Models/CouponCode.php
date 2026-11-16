<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $campaign_id
 * @property string $code
 * @property string|null $description
 * @property CouponOfferType $offer_type
 * @property int $discount_amount_minor
 * @property float $discount_percentage
 * @property int|null $max_discount_amount_minor
 * @property int $bonus_points
 * @property CouponFundingSource $funding_source
 * @property float $property_funding_percentage
 * @property int $min_booking_amount_minor
 * @property bool $is_active
 * @property CarbonImmutable|null $starts_at
 * @property CarbonImmutable|null $expires_at
 * @property int|null $total_usage_limit
 * @property int $per_user_limit
 * @property int $total_used_count
 * @property array<int>|null $applies_to_category_ids
 * @property array<int>|null $applies_to_city_ids
 * @property array<int>|null $applies_to_property_ids
 * @property bool $first_booking_only
 * @property int $min_stay_days
 * @property array<string, mixed>|null $metadata
 * @property-read PromotionalCampaign|null $campaign
 * @property-read Collection<int, CouponRedemption> $redemptions
 */
class CouponCode extends Model
{
    protected $fillable = [
        'campaign_id',
        'code',
        'description',
        'offer_type',
        'discount_amount_minor',
        'discount_percentage',
        'max_discount_amount_minor',
        'bonus_points',
        'funding_source',
        'property_funding_percentage',
        'min_booking_amount_minor',
        'is_active',
        'starts_at',
        'expires_at',
        'total_usage_limit',
        'per_user_limit',
        'total_used_count',
        'applies_to_category_ids',
        'applies_to_city_ids',
        'applies_to_property_ids',
        'first_booking_only',
        'min_stay_days',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'offer_type' => CouponOfferType::class,
            'funding_source' => CouponFundingSource::class,
            'discount_amount_minor' => 'integer',
            'discount_percentage' => 'float',
            'max_discount_amount_minor' => 'integer',
            'bonus_points' => 'integer',
            'property_funding_percentage' => 'float',
            'min_booking_amount_minor' => 'integer',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'total_usage_limit' => 'integer',
            'per_user_limit' => 'integer',
            'total_used_count' => 'integer',
            'applies_to_category_ids' => 'array',
            'applies_to_city_ids' => 'array',
            'applies_to_property_ids' => 'array',
            'first_booking_only' => 'boolean',
            'min_stay_days' => 'integer',
            'metadata' => 'array',
        ];
    }

    /**
     * @return BelongsTo<PromotionalCampaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(PromotionalCampaign::class, 'campaign_id');
    }

    /**
     * @return HasMany<CouponHold, $this>
     */
    public function holds(): HasMany
    {
        return $this->hasMany(CouponHold::class, 'coupon_code_id');
    }

    /**
     * @return HasMany<CouponRedemption, $this>
     */
    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class, 'coupon_code_id');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->where(function (Builder $sub) {
                $sub->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function (Builder $sub) {
                $sub->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            });
    }

    public function isAvailable(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->starts_at && $this->starts_at->isFuture()) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        if ($this->total_usage_limit !== null && $this->total_used_count >= $this->total_usage_limit) {
            return false;
        }

        return $this->campaign === null || $this->campaign->isAvailable();
    }
}
