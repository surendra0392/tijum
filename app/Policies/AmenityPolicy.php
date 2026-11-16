<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Admin;
use App\Models\Amenity;

class AmenityPolicy
{
    public function viewAnyByAdmin(Admin $admin): bool
    {
        return $admin->isActive() && $admin->hasPermission('amenities.view');
    }

    public function viewByAdmin(Admin $admin, Amenity $amenity): bool
    {
        return $admin->isActive() && $admin->hasPermission('amenities.view');
    }

    public function manageByAdmin(Admin $admin): bool
    {
        return $admin->isActive() && $admin->hasPermission('amenities.assign');
    }
}
