<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomTypeAmenity;

class PropertyRoomTypeAmenityPolicy
{
    public function viewAnyByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id && $owner->canSignIn();
    }

    public function createByOwner(Owner $owner, Property $property): bool
    {
        return $property->owner_id === $owner->id && $owner->canPublishProperties();
    }

    public function viewByOwner(Owner $owner, PropertyRoomTypeAmenity $assignment): bool
    {
        $assignment->loadMissing('property');

        return $assignment->property?->owner_id === $owner->id && $owner->canSignIn();
    }

    public function updateByOwner(Owner $owner, PropertyRoomTypeAmenity $assignment): bool
    {
        $assignment->loadMissing('property');

        return $assignment->property?->owner_id === $owner->id
            && $owner->canPublishProperties()
            && $assignment->status->isEditableByOwner();
    }

    public function submitByOwner(Owner $owner, PropertyRoomTypeAmenity $assignment): bool
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

    public function viewByAdmin(Admin $admin, PropertyRoomTypeAmenity $assignment): bool
    {
        return $admin->isActive() && $admin->hasPermission('amenities.view');
    }

    public function assignByAdmin(Admin $admin, PropertyRoomTypeAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.assign')
            && $assignment->status->isInReview();
    }

    public function startReviewByAdmin(Admin $admin, PropertyRoomTypeAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.review')
            && $assignment->status->canStartReview();
    }

    public function requestInformationByAdmin(Admin $admin, PropertyRoomTypeAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.request_information')
            && $assignment->status->canRequestInformation();
    }

    public function approveByAdmin(Admin $admin, PropertyRoomTypeAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.approve')
            && $assignment->status->canApprove();
    }

    public function rejectByAdmin(Admin $admin, PropertyRoomTypeAmenity $assignment): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('amenities.reject')
            && $assignment->status->canReject();
    }
}
