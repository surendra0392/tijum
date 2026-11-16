<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyAvailabilityBlockScope: string
{
    case Property = 'property';
    case RoomType = 'room_type';
    case Room = 'room';

    public function label(): string
    {
        return match ($this) {
            self::Property => 'Property',
            self::RoomType => 'Room Type',
            self::Room => 'Physical Room',
        };
    }
}
