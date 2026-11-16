<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SubscriberStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $email
 * @property string|null $name
 * @property SubscriberStatus $status
 * @property string|null $confirmation_token
 * @property CarbonImmutable|null $confirmed_at
 * @property string|null $unsubscribe_token
 * @property CarbonImmutable|null $unsubscribed_at
 * @property string $source
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Collection<int, MarketingConsentRecord> $consentRecords
 * @property-read Collection<int, MarketingCampaignDelivery> $campaignDeliveries
 */
class MarketingSubscriber extends Model
{
    protected $fillable = [
        'email',
        'name',
        'status',
        'confirmation_token',
        'confirmed_at',
        'unsubscribe_token',
        'unsubscribed_at',
        'source',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriberStatus::class,
            'confirmed_at' => 'datetime',
            'unsubscribed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $subscriber): void {
            if (empty($subscriber->unsubscribe_token)) {
                $subscriber->unsubscribe_token = Str::random(48);
            }
        });
    }

    /**
     * @return HasMany<MarketingConsentRecord, $this>
     */
    public function consentRecords(): HasMany
    {
        return $this->hasMany(MarketingConsentRecord::class, 'marketing_subscriber_id');
    }

    /**
     * @return HasMany<MarketingCampaignDelivery, $this>
     */
    public function campaignDeliveries(): HasMany
    {
        return $this->hasMany(MarketingCampaignDelivery::class, 'subscriber_id');
    }

    /**
     * @param  Builder<MarketingSubscriber>  $query
     * @return Builder<MarketingSubscriber>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', SubscriberStatus::Subscribed->value);
    }
}
