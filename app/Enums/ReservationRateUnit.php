<?php

declare(strict_types=1);

namespace App\Enums;

enum ReservationRateUnit: string
{
    case PerGuest = 'per_guest';
    case PerPrivateRoom = 'per_private_room';

    public function label(): string
    {
        return match ($this) {
            self::PerGuest => 'Per Guest',
            self::PerPrivateRoom => 'Per Private Room',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $unit): string => $unit->value,
            self::cases(),
        );
    }
}
