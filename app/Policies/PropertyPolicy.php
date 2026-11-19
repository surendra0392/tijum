<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\PropertyOperationalStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;

class PropertyPolicy
{
    public function viewAnyByOwner(Owner $owner): bool
    {
        return $owner->canSignIn() && $owner->hasVerifiedEmail();
    }

    public function createByOwner(Owner $owner): bool
    {
        return $owner->canPublishProperties();
    }

    public function viewByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id && $owner->canSignIn();
    }

    public function updateByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id && $owner->canPublishProperties();
    }

    public function updateDetailsByOwner(Owner $owner, Property $property): bool
    {
        if ($property->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
            return false;
        }

        $activeApplication = $property->activeVerificationApplication()->first();

        return $property->canEditDirectlyWithoutAmendment(
            $activeApplication instanceof PropertyVerificationApplication ? $activeApplication : null,
        );
    }

    public function manageOperationalStatusByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id
            && $owner->canPublishProperties()
            && $property->status !== PropertyOperationalStatus::Suspended;
    }

    public function manageInventoryByOwner(Owner $owner, Property $property): bool
    {
        if ($property->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
            return false;
        }

        if (! $property->hasApprovedBaseline()) {
            $activeApplication = $property->activeVerificationApplication()->first();

            return ! $activeApplication instanceof PropertyVerificationApplication
                || $activeApplication->status->isEditableByOwner();
        }

        $activeApplication = $property->activeVerificationApplication()->first();

        return $activeApplication instanceof PropertyVerificationApplication
            && $activeApplication->is_amendment
            && $activeApplication->status->isEditableByOwner();
    }

    public function manageRoomOperationsByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id && $owner->canPublishProperties();
    }

    public function startAmendmentByOwner(Owner $owner, Property $property): bool
    {
        if ($property->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
            return false;
        }

        if (! $property->hasApprovedBaseline()) {
            return false;
        }

        return ! $property->activeVerificationApplication()->exists();
    }

    public function viewQueueByAdmin(Admin $admin): bool
    {
        return $admin->isActive() && $admin->hasPermission('properties.view');
    }

    public function viewByAdmin(Admin $admin, Property $property): bool
    {
        return $admin->isActive() && $admin->hasPermission('properties.view');
    }

    public function manageOperationalStatusByAdmin(Admin $admin, Property $property): bool
    {
        return $admin->isActive() && $admin->hasPermission('properties.manage_status');
    }

    public function suspendByAdmin(Admin $admin, Property $property): bool
    {
        return $admin->isActive() && $admin->hasPermission('properties.suspend');
    }
}
