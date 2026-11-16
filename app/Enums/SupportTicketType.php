<?php

declare(strict_types=1);

namespace App\Enums;

enum SupportTicketType: string
{
    case Customer = 'customer';
    case Partner = 'partner';

    public function label(): string
    {
        return match ($this) {
            self::Customer => 'Customer Support',
            self::Partner => 'Partner Support',
        };
    }

    public function prefix(): string
    {
        return match ($this) {
            self::Customer => 'TJC-SUP',
            self::Partner => 'TJP-SUP',
        };
    }
}
