<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketingCampaignDelivery extends Model
{
    protected $fillable = [
        'email_campaign_id',
        'subscriber_id',
        'email',
        'status',
        'sent_at',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<MarketingEmailCampaign, $this>
     */
    public function emailCampaign(): BelongsTo
    {
        return $this->belongsTo(MarketingEmailCampaign::class, 'email_campaign_id');
    }

    /**
     * @return BelongsTo<MarketingSubscriber, $this>
     */
    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(MarketingSubscriber::class, 'subscriber_id');
    }
}
