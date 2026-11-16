<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CampaignStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketingCampaign extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'objective',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'target_landing_url',
        'status',
        'starts_at',
        'ends_at',
        'admin_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => CampaignStatus::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Admin, $this>
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class, 'admin_id');
    }

    /**
     * @return HasMany<MarketingBanner, $this>
     */
    public function banners(): HasMany
    {
        return $this->hasMany(MarketingBanner::class, 'campaign_id');
    }

    /**
     * @return HasMany<MarketingEmailCampaign, $this>
     */
    public function emailCampaigns(): HasMany
    {
        return $this->hasMany(MarketingEmailCampaign::class, 'campaign_id');
    }

    /**
     * @return HasMany<MarketingTrackingEvent, $this>
     */
    public function trackingEvents(): HasMany
    {
        return $this->hasMany(MarketingTrackingEvent::class, 'campaign_id');
    }

    /**
     * @param  Builder<MarketingCampaign>  $query
     * @return Builder<MarketingCampaign>
     */
    public function scopeActive(Builder $query): Builder
    {
        $now = now();

        return $query->where('status', CampaignStatus::Active->value)
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            });
    }

    public function generateTrackingUrl(?string $baseUrl = null): string
    {
        $url = $baseUrl ?? $this->target_landing_url;
        $separator = str_contains($url, '?') ? '&' : '?';

        $params = http_build_query([
            'utm_source' => $this->utm_source,
            'utm_medium' => $this->utm_medium,
            'utm_campaign' => $this->utm_campaign,
            'utm_content' => $this->utm_content ?: null,
        ]);

        return $url.$separator.$params;
    }
}
