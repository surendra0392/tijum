<?php

declare(strict_types=1);

namespace App\Enums;

enum ConsentAction: string
{
    case Granted = 'granted';
    case Withdrawn = 'withdrawn';
    case Updated = 'updated';
    case Reaffirmed = 'reaffirmed';

    public function label(): string
    {
        return match ($this) {
            self::Granted => 'Granted Consent',
            self::Withdrawn => 'Withdrawn Consent',
            self::Updated => 'Updated Consent',
            self::Reaffirmed => 'Reaffirmed Consent',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $a): string => $a->value, self::cases());
    }
}
