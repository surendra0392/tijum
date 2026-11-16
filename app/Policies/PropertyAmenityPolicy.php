<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyAmenity;

class PropertyAmenityPolicy
{
    public function viewAnyByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id && $owner->canSignIn();
    }

    public function createByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id && $owner->canPublishProperties();
    }

    public function viewByOwner(Owner $owner, PropertyAmenity $assignment): bool
    {
        $assignment->loadMissing('property');

        return $assignment->property?->owner_id === $owner->id && $owner->canSignIn();
    }

    public function updateByOwner(Owner $owner, PropertyAmenity $assignment): bool
    {
        $assignment->loadMissing('property');

        return $assignment->property?->owner_id === $owner->id
            && $owner->canPublishProperties()
            && $assignment->status->isEditableByOwner();
    }

    public function submitByOwner(Owner $owner, PropertyAmenity $assignment): bool
    {
        $assignment->loadMissing('property');

        return $assignment->property?->owner_id === $owner->id
            && $owner->canPublishProperties()
            && $assignment->status->canSubmitByOwner();
    }

    public function viewAnyByAdmin(Admin $admin): bool
    {
        return $admin->isActive() && $admin->hasPermission('amenities.view');
    }

    public function viewByAdmin(Admin $admin, PropertyAmenity $assignment): bool
    {
        return $admin->isActive() && $admin->hasPermission('amenities.view');
    }

    public function assignByAdmin(Admin $admin, PropertyAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.assign')
            && $assignment->status->isInReview();
    }

    public function startReviewByAdmin(Admin $admin, PropertyAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.review')
            && $assignment->status->canStartReview();
    }

    public function requestInformationByAdmin(Admin $admin, PropertyAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.request_information')
            && $assignment->status->canRequestInformation();
    }

    public function approveByAdmin(Admin $admin, PropertyAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.approve')
            && $assignment->status->canApprove();
    }

    public function rejectByAdmin(Admin $admin, PropertyAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.reject')
            && $assignment->status->canReject();
    }
}
