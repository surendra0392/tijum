<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ConsentAction;
use App\Enums\ConsentStatus;
use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class NotificationConsentRecord extends Model
{
    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'notifiable_type',
        'notifiable_id',
        'channel',
        'category',
        'consent_status',
        'consent_action',
        'source',
        'policy_version',
        'ip_address',
        'user_agent',
        'notes',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channel' => NotificationChannel::class,
            'category' => NotificationCategory::class,
            'consent_status' => ConsentStatus::class,
            'consent_action' => ConsentAction::class,
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }
}
