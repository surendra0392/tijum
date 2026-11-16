<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\NotificationCategory;
use App\Enums\NotificationChannel;
use App\Enums\NotificationDeliveryStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property string $event_id
 * @property string $idempotency_key
 * @property string $notifiable_type
 * @property int $notifiable_id
 * @property NotificationChannel $channel
 * @property NotificationCategory $category
 * @property string $template_code
 * @property string|null $template_version
 * @property string|null $recipient_destination
 * @property NotificationDeliveryStatus $status
 * @property string|null $provider
 * @property string|null $provider_message_id
 * @property int $attempts
 * @property string|null $subject
 * @property array<string, mixed> $payload
 * @property string|null $error_code
 * @property string|null $error_description
 * @property string|null $related_type
 * @property int|null $related_id
 * @property string|null $related_reference
 * @property CarbonImmutable|null $submitted_at
 * @property CarbonImmutable|null $delivered_at
 * @property CarbonImmutable|null $read_at
 * @property CarbonImmutable|null $failed_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Model|null $notifiable
 * @property-read Model|null $related
 */
class NotificationDelivery extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'event_id',
        'idempotency_key',
        'notifiable_type',
        'notifiable_id',
        'channel',
        'category',
        'template_code',
        'template_version',
        'recipient_destination',
        'status',
        'provider',
        'provider_message_id',
        'attempts',
        'subject',
        'payload',
        'error_code',
        'error_description',
        'related_type',
        'related_id',
        'related_reference',
        'submitted_at',
        'delivered_at',
        'read_at',
        'failed_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channel' => NotificationChannel::class,
            'category' => NotificationCategory::class,
            'status' => NotificationDeliveryStatus::class,
            'attempts' => 'integer',
            'payload' => 'array',
            'submitted_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function related(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @param  Builder<$this>  $query
     */
    public function scopeFailed(Builder $query): void
    {
        $query->where('status', NotificationDeliveryStatus::Failed->value);
    }

    /**
     * @param  Builder<$this>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->whereIn('status', [
            NotificationDeliveryStatus::Queued->value,
            NotificationDeliveryStatus::Sending->value,
            NotificationDeliveryStatus::Retrying->value,
        ]);
    }

    /**
     * @param  Builder<$this>  $query
     */
    public function scopeForChannel(Builder $query, NotificationChannel|string $channel): void
    {
        $value = $channel instanceof NotificationChannel ? $channel->value : $channel;
        $query->where('channel', $value);
    }

    public function maskedDestination(): string
    {
        $dest = $this->recipient_destination ?? '';
        if ($dest === '') {
            return '—';
        }

        if (str_contains($dest, '@')) {
            $parts = explode('@', $dest, 2);
            $name = $parts[0];
            $domain = $parts[1] ?? '';
            $maskedName = strlen($name) > 2 ? substr($name, 0, 2).str_repeat('*', max(1, strlen($name) - 2)) : $name.'*';

            return "{$maskedName}@{$domain}";
        }

        // Phone number
        $clean = preg_replace('/[^\d+]/', '', $dest) ?? '';
        if (strlen($clean) >= 8) {
            return substr($clean, 0, 3).'*****'.substr($clean, -3);
        }

        return '******';
    }
}
