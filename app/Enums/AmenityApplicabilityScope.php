<?php

declare(strict_types=1);

namespace App\Enums;

enum AmenityApplicabilityScope: string
{
    case Property = 'property';
    case RoomType = 'room_type';
    case Both = 'both';

    public function label(): string
    {
        return match ($this) {
            self::Property => 'Property',
            self::RoomType => 'Room type',
            self::Both => 'Property and room type',
        };
    }

    public function appliesToProperty(): bool
    {
        return $this === self::Property || $this === self::Both;
    }

    public function appliesToRoomType(): bool
    {
        return $this === self::RoomType || $this === self::Both;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $scope): string => $scope->value,
            self::cases(),
        );
    }
}
