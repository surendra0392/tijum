<?php

declare(strict_types=1);

namespace App\Enums;

enum CommissionGstType: string
{
    case Exclusive = 'exclusive';
    case Inclusive = 'inclusive';
    case Exempt = 'exempt';

    public function label(): string
    {
        return match ($this) {
            self::Exclusive => 'Exclusive (Added to Commission)',
            self::Inclusive => 'Inclusive (Included in Rate)',
            self::Exempt => 'Exempt / Not Applicable',
        };
    }
}
