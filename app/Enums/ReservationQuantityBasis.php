<?php

declare(strict_types=1);

namespace App\Enums;

enum ReservationQuantityBasis: string
{
    case GuestPlaces = 'guest_places';
    case PrivateRooms = 'private_rooms';

    public function label(): string
    {
        return match ($this) {
            self::GuestPlaces => 'Guest Places',
            self::PrivateRooms => 'Private Rooms',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $basis): string => $basis->value,
            self::cases(),
        );
    }
}
