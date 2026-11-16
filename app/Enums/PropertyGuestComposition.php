<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyGuestComposition: string
{
    case Individuals = 'individuals';
    case Families = 'families';
    case Couples = 'couples';
    case Groups = 'groups';

    public function label(): string
    {
        return match ($this) {
            self::Individuals => 'Individuals',
            self::Families => 'Families',
            self::Couples => 'Couples',
            self::Groups => 'Permitted Groups',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $composition): string => $composition->value,
            self::cases(),
        );
    }
}
