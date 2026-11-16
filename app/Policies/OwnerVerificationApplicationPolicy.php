<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;

class OwnerVerificationApplicationPolicy
{
    public function viewByOwner(Owner $owner, OwnerVerificationApplication $application): bool
    {
        return $application->owner_id === $owner->id && $owner->canSignIn();
    }

    public function updateByOwner(Owner $owner, OwnerVerificationApplication $application): bool
    {
        return $application->owner_id === $owner->id
            && $owner->canSignIn()
            && $application->status->isEditableByOwner();
    }

    public function submitByOwner(Owner $owner, OwnerVerificationApplication $application): bool
    {
        return $application->owner_id === $owner->id
            && $owner->canSignIn()
            && $owner->hasVerifiedEmail()
            && $application->status->canSubmitByOwner();
    }

    public function withdrawByOwner(Owner $owner, OwnerVerificationApplication $application): bool
    {
        return $application->owner_id === $owner->id
            && $owner->canSignIn()
            && $application->status->canWithdrawByOwner();
    }

    public function viewQueueByAdmin(Admin $admin): bool
    {
        return $admin->isActive() && $admin->hasPermission('partners.view');
    }

    public function viewByAdmin(Admin $admin, OwnerVerificationApplication $application): bool
    {
        return $admin->isActive() && $admin->hasPermission('partners.view');
    }

    public function assignByAdmin(Admin $admin, OwnerVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('partners.assign')
            && $application->status->canAssignReviewer();
    }

    public function startReviewByAdmin(Admin $admin, OwnerVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('partners.review')
            && $application->status->canStartReview();
    }

    public function requestInformationByAdmin(Admin $admin, OwnerVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('partners.request_information')
            && $application->status->canRequestInformation();
    }

    public function approveByAdmin(Admin $admin, OwnerVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('partners.approve')
            && $application->status->canApprove();
    }

    public function rejectByAdmin(Admin $admin, OwnerVerificationApplication $application): bool
    {
        return $admin->isActive()
            && $admin->hasPermission('partners.reject')
            && $application->status->canReject();
    }
}
