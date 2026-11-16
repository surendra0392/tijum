<?php

declare(strict_types=1);

namespace App\Enums;

enum ConsentStatus: string
{
    case OptedIn = 'opted_in';
    case OptedOut = 'opted_out';

    public function label(): string
    {
        return match ($this) {
            self::OptedIn => 'Opted In',
            self::OptedOut => 'Opted Out',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $s): string => $s->value, self::cases());
    }
}
