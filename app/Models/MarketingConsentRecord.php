<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketingConsentRecord extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'marketing_subscriber_id',
        'action',
        'channel',
        'source',
        'ip_address',
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
     * @return BelongsTo<MarketingSubscriber, $this>
     */
    public function subscriber(): BelongsTo
    {
        return $this->belongsTo(MarketingSubscriber::class, 'marketing_subscriber_id');
    }
}
