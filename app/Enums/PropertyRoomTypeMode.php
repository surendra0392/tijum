<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyRoomTypeMode: string
{
    case Shared = 'shared';
    case Private = 'private';

    public function label(): string
    {
        return match ($this) {
            self::Shared => 'Shared Occupancy',
            self::Private => 'Private Room (Single Occupancy)',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Shared => 'Guests book 2, 3, or 4 Sharing places without selecting physical room or bed identifiers.',
            self::Private => 'Guests book an entire private Single Room strictly limited to 1 occupant in Phase 06.',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $mode): string => $mode->value,
            self::cases(),
        );
    }
}
