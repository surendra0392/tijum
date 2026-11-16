<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyAvailabilityBlockStatus: string
{
    case Active = 'active';
    case Cancelled = 'cancelled';
    case Expired = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Cancelled => 'Cancelled',
            self::Expired => 'Expired',
        };
    }
}
