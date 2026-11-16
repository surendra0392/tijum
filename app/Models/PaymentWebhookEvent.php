<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $gateway
 * @property string $event_id
 * @property string $event_type
 * @property string|null $gateway_order_id
 * @property string|null $gateway_payment_id
 * @property string|null $gateway_refund_id
 * @property array<string, mixed> $payload
 * @property string $status
 * @property CarbonImmutable|null $processed_at
 * @property string|null $error_message
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 */
class PaymentWebhookEvent extends Model
{
    protected $guarded = [];

    /**
     * @return array{
     *     payload: 'array',
     *     processed_at: 'datetime',
     * }
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'processed_at' => 'datetime',
        ];
    }
}
