<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;

class PropertyMediaPolicy
{
    public function uploadByOwner(Owner $owner, Property $property): bool
    {
        return (new PropertyPolicy)->manageInventoryByOwner($owner, $property);
    }

    public function viewByOwner(Owner $owner, PropertyMedia $media): bool
    {
        $media->loadMissing('property');

        return $media->property instanceof Property
            && $media->property->owner_id === $owner->id
            && $owner->canSignIn();
    }

    public function updateByOwner(Owner $owner, PropertyMedia $media): bool
    {
        $media->loadMissing('property');

        return $media->property instanceof Property
            && (new PropertyPolicy)->manageInventoryByOwner($owner, $media->property);
    }

    public function deleteByOwner(Owner $owner, PropertyMedia $media): bool
    {
        return $this->updateByOwner($owner, $media);
    }

    public function viewByAdmin(Admin $admin, PropertyMedia $media): bool
    {
        return $admin->isActive() && $admin->hasPermission('properties.view');
    }

    public function moderateByAdmin(Admin $admin, PropertyMedia $media): bool
    {
        return $admin->isActive() && $admin->hasPermission('properties.review');
    }
}
