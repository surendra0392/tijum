<?php

declare(strict_types=1);

namespace App\Enums;

enum CasePriority: string
{
    case Standard = 'standard';
    case High = 'high';
    case Urgent = 'urgent';

    public function label(): string
    {
        return match ($this) {
            self::Standard => 'Standard',
            self::High => 'High Priority',
            self::Urgent => 'Urgent / Safety',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $p): string => $p->value, self::cases());
    }
}
