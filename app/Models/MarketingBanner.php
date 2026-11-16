<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BannerPlacement;
use App\Enums\BannerStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketingBanner extends Model
{
    protected $fillable = [
        'campaign_id',
        'name',
        'headline',
        'description',
        'image_url',
        'cta_text',
        'cta_url',
        'placement',
        'display_order',
        'status',
        'starts_at',
        'ends_at',
        'impression_count',
        'click_count',
        'admin_id',
    ];

    protected function casts(): array
    {
        return [
            'placement' => BannerPlacement::class,
            'status' => BannerStatus::class,
            'display_order' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'impression_count' => 'integer',
            'click_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<MarketingCampaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MarketingCampaign::class, 'campaign_id');
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }

    /**
     * @param  Builder<MarketingBanner>  $query
     * @return Builder<MarketingBanner>
     */
    public function scopeActive(Builder $query): Builder
    {
        $now = now();

        return $query->where('status', BannerStatus::Active->value)
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            });
    }

    /**
     * @param  Builder<MarketingBanner>  $query
     * @return Builder<MarketingBanner>
     */
    public function scopePlacement(Builder $query, BannerPlacement $placement): Builder
    {
        return $query->where('placement', $placement->value);
    }
}
