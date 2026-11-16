<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $provider
 * @property string|null $provider_event_id
 * @property string|null $provider_message_id
 * @property string $event_type
 * @property array<string, mixed> $payload
 * @property bool $processed
 * @property CarbonImmutable|null $processed_at
 * @property string|null $error_message
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
class NotificationWebhookEvent extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'provider',
        'provider_event_id',
        'provider_message_id',
        'event_type',
        'payload',
        'processed',
        'processed_at',
        'error_message',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'processed' => 'boolean',
            'processed_at' => 'datetime',
        ];
    }
}
