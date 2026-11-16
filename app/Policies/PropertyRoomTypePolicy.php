<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomType;

class PropertyRoomTypePolicy
{
    public function createByOwner(Owner $owner, Property $property): bool
    {
        return (new PropertyPolicy)->manageInventoryByOwner($owner, $property);
    }

    public function updateByOwner(Owner $owner, PropertyRoomType $roomType): bool
    {
        $roomType->loadMissing('property');

        return $roomType->property instanceof Property
            && (new PropertyPolicy)->manageInventoryByOwner($owner, $roomType->property);
    }

    public function deleteByOwner(Owner $owner, PropertyRoomType $roomType): bool
    {
        return $this->updateByOwner($owner, $roomType);
    }
}
