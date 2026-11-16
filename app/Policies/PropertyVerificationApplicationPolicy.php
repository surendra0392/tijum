<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\PropertyVerificationApplication;

class PropertyVerificationApplicationPolicy
{
    public function submitByOwner(Owner $owner, PropertyVerificationApplication $application): bool
    {
        $application->loadMissing('property');

        return $application->property !== null
            && $application->property->owner_id === $owner->id
            && $owner->canPublishProperties()
            && $application->status->canSubmitByOwner();
    }

    public function withdrawByOwner(Owner $owner, PropertyVerificationApplication $application): bool
    {
        $application->loadMissing('property');

        return $application->property !== null
            && $application->property->owner_id === $owner->id
            && $owner->canPublishProperties()
            && $application->status->canWithdrawByOwner();
    }

    public function assignByAdmin(Admin $admin, PropertyVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('properties.assign')
            && $application->status->canAssignReviewer();
    }

    public function startReviewByAdmin(Admin $admin, PropertyVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('properties.review')
            && $application->status->canStartReview();
    }

    public function requestInformationByAdmin(Admin $admin, PropertyVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('properties.request_information')
            && $application->status->canRequestInformation();
    }

    public function approveByAdmin(Admin $admin, PropertyVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('properties.approve')
            && $application->status->canApprove();
    }

    public function rejectByAdmin(Admin $admin, PropertyVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('properties.reject')
            && $application->status->canReject();
    }
}
