<?php

declare(strict_types=1);

namespace App\Enums;

enum NotificationDeliveryStatus: string
{
    case Queued = 'queued';
    case Sending = 'sending';
    case Accepted = 'accepted';
    case Delivered = 'delivered';
    case Read = 'read';
    case Retrying = 'retrying';
    case Failed = 'failed';
    case Suppressed = 'suppressed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Queued => 'Queued',
            self::Sending => 'Sending',
            self::Accepted => 'Accepted by Gateway',
            self::Delivered => 'Delivered',
            self::Read => 'Read',
            self::Retrying => 'Retrying',
            self::Failed => 'Failed Permanently',
            self::Suppressed => 'Suppressed by Policy/Preference',
            self::Cancelled => 'Cancelled',
        };
    }

    public function isTerminal(): bool
    {
        return match ($this) {
            self::Delivered, self::Read, self::Failed, self::Suppressed, self::Cancelled => true,
            default => false,
        };
    }

    public function canRetry(): bool
    {
        return in_array($this, [self::Failed, self::Retrying], true);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $s): string => $s->value, self::cases());
    }
}
