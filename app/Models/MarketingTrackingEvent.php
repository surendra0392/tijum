<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketingTrackingEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'event_type',
        'event_key',
        'page_url',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'campaign_id',
        'ip_hash',
        'user_agent',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<MarketingCampaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MarketingCampaign::class, 'campaign_id');
    }
}
