<?php

declare(strict_types=1);

namespace App\Enums;

enum SupportTicketPriority: string
{
    case Low = 'low';
    case Standard = 'standard';
    case High = 'high';
    case Urgent = 'urgent';

    public function label(): string
    {
        return match ($this) {
            self::Low => 'Low',
            self::Standard => 'Standard',
            self::High => 'High',
            self::Urgent => 'Urgent',
        };
    }

    public function defaultSlaHours(): int
    {
        return match ($this) {
            self::Urgent => 2,
            self::High => 4,
            self::Standard => 24,
            self::Low => 48,
        };
    }
}
