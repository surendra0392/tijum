<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAvailabilityBlock;

class PropertyAvailabilityBlockPolicy
{
    public function viewAnyByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id && $owner->canSignIn();
    }

    public function createByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id && $owner->canPublishProperties();
    }

    public function viewByOwner(Owner $owner, PropertyAvailabilityBlock $block): bool
    {
        $block->loadMissing('property');

        return $block->property?->owner_id === $owner->id && $owner->canSignIn();
    }

    public function cancelByOwner(Owner $owner, PropertyAvailabilityBlock $block): bool
    {
        $block->loadMissing('property');

        return $block->property?->owner_id === $owner->id
            && $owner->canPublishProperties();
    }

    public function viewAnyByAdmin(Admin $admin): bool
    {
        return $admin->isActive() && $admin->hasPermission('availability.view');
    }

    public function viewByAdmin(Admin $admin, PropertyAvailabilityBlock $block): bool
    {
        return $admin->isActive() && $admin->hasPermission('availability.view');
    }

    public function createByAdmin(Admin $admin): bool
    {
        return $admin->isActive() && $admin->hasPermission('availability.manage_restrictions');
    }

    public function cancelByAdmin(Admin $admin, PropertyAvailabilityBlock $block): bool
    {
        return $admin->isActive() && $admin->hasPermission('availability.manage_restrictions');
    }
}
