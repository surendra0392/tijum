<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $customer_protection_case_id
 * @property string $sender_type
 * @property int $sender_id
 * @property string $sender_name
 * @property string $message
 * @property string|null $attachment_path
 * @property string|null $attachment_name
 * @property string|null $attachment_mime
 * @property bool $is_internal_note
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 * @property-read CustomerProtectionCase $case
 */
class CustomerProtectionCaseMessage extends Model
{
    protected $guarded = [];

    /**
     * @return array{
     *     is_internal_note: 'boolean',
     * }
     */
    protected function casts(): array
    {
        return [
            'is_internal_note' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<CustomerProtectionCase, $this>
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(CustomerProtectionCase::class, 'customer_protection_case_id');
    }
}
