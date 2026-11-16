<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $support_ticket_id
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
 * @property-read SupportTicket $ticket
 */
class SupportTicketMessage extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_internal_note' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<SupportTicket, $this>
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'support_ticket_id');
    }
}
