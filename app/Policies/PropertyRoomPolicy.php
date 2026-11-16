<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoom;

class PropertyRoomPolicy
{
    public function createByOwner(Owner $owner, Property $property): bool
    {
        return (new PropertyPolicy)->manageRoomOperationsByOwner($owner, $property);
    }

    public function updateByOwner(Owner $owner, PropertyRoom $room): bool
    {
        $room->loadMissing('property');

        return $room->property instanceof Property
            && (new PropertyPolicy)->manageRoomOperationsByOwner($owner, $room->property);
    }
}
