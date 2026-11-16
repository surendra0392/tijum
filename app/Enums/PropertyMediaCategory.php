<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyMediaCategory: string
{
    case Exterior = 'exterior';
    case Entrance = 'entrance';
    case Reception = 'reception';
    case CommonArea = 'common_area';
    case Dining = 'dining';
    case Bathroom = 'bathroom';
    case RoomInterior = 'room_interior';
    case RoomArrangement = 'room_arrangement';
    case RoomFurniture = 'room_furniture';
    case RoomBathroom = 'room_bathroom';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Exterior => 'Property Exterior',
            self::Entrance => 'Property Entrance',
            self::Reception => 'Reception / Front Desk',
            self::CommonArea => 'Common Area / Lounge',
            self::Dining => 'Dining Area',
            self::Bathroom => 'Shared Bathroom Facilities',
            self::RoomInterior => 'Room Interior',
            self::RoomArrangement => 'Room Sleeping Arrangement',
            self::RoomFurniture => 'Room Furniture & Study',
            self::RoomBathroom => 'Room Attached Bathroom',
            self::Other => 'Other Property Visual',
        };
    }

    public function isRoomCategory(): bool
    {
        return in_array($this, [
            self::RoomInterior,
            self::RoomArrangement,
            self::RoomFurniture,
            self::RoomBathroom,
        ], true);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $category): string => $category->value,
            self::cases(),
        );
    }
}
