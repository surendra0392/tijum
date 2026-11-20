<?php

declare(strict_types=1);

namespace App\Enums;

enum CasePriority: string
{
    case Low = 'low';
    case Standard = 'standard';
    case Medium = 'medium';
    case High = 'high';
    case Urgent = 'urgent';

    public function label(): string
    {
        return match ($this) {
            self::Low => 'Low',
            self::Standard, self::Medium => 'Medium Priority',
            self::High => 'High Priority',
            self::Urgent => 'Urgent / Safety',
        };
    }

    public function firstActionSlaHours(): int
    {
        return match ($this) {
            self::Urgent => 2,
            self::High => 4,
            self::Standard, self::Medium => 24,
            self::Low => 48,
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
