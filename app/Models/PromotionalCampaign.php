<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CampaignStatus;
use App\Enums\CampaignType;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $campaign_reference
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property CampaignType $type
 * @property CampaignStatus $status
 * @property CarbonImmutable|null $starts_at
 * @property CarbonImmutable|null $ends_at
 * @property int|null $budget_minor
 * @property int $spent_minor
 * @property int|null $created_by_admin_id
 * @property array<string, mixed>|null $metadata
 * @property int|null $coupon_codes_count
 * @property-read Admin|null $createdByAdmin
 * @property-read Collection<int, CouponCode> $couponCodes
 */
class PromotionalCampaign extends Model
{
    protected $fillable = [
        'campaign_reference',
        'name',
        'slug',
        'description',
        'type',
        'status',
        'starts_at',
        'ends_at',
        'budget_minor',
        'spent_minor',
        'created_by_admin_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'type' => CampaignType::class,
            'status' => CampaignStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'budget_minor' => 'integer',
            'spent_minor' => 'integer',
            'metadata' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function createdByAdmin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'created_by_admin_id');
    }

    /**
     * @return HasMany<CouponCode, $this>
     */
    public function couponCodes(): HasMany
    {
        return $this->hasMany(CouponCode::class, 'campaign_id');
    }

    /**
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', CampaignStatus::Active)
            ->where(function (Builder $sub) {
                $sub->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function (Builder $sub) {
                $sub->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            });
    }

    public function isAvailable(): bool
    {
        if ($this->status !== CampaignStatus::Active) {
            return false;
        }

        if ($this->starts_at && $this->starts_at->isFuture()) {
            return false;
        }

        if ($this->ends_at && $this->ends_at->isPast()) {
            return false;
        }

        if ($this->budget_minor !== null && $this->spent_minor >= $this->budget_minor) {
            return false;
        }

        return true;
    }
}
