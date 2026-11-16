<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Owner;
use App\Models\OwnerBusinessProfile;

class OwnerBusinessProfilePolicy
{
    public function viewByOwner(Owner $owner, OwnerBusinessProfile $profile): bool
    {
        return $profile->owner_id === $owner->id;
    }

    public function updateByOwner(Owner $owner, OwnerBusinessProfile $profile): bool
    {
        return $profile->owner_id === $owner->id && $owner->canSignIn();
    }
}
