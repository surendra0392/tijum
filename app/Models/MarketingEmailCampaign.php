<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\EmailCampaignStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketingEmailCampaign extends Model
{
    protected $fillable = [
        'campaign_id',
        'title',
        'subject',
        'preview_text',
        'content_html',
        'content_text',
        'target_segment',
        'status',
        'scheduled_for',
        'sent_at',
        'total_recipients',
        'delivered_count',
        'failed_count',
        'admin_id',
    ];

    protected function casts(): array
    {
        return [
            'status' => EmailCampaignStatus::class,
            'scheduled_for' => 'datetime',
            'sent_at' => 'datetime',
            'total_recipients' => 'integer',
            'delivered_count' => 'integer',
            'failed_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<MarketingCampaign, $this>
     */
    public function marketingCampaign(): BelongsTo
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
     * @return HasMany<MarketingCampaignDelivery, $this>
     */
    public function deliveries(): HasMany
    {
        return $this->hasMany(MarketingCampaignDelivery::class, 'email_campaign_id');
    }
}
