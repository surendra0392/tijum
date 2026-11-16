<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\OwnerVerificationDocumentStatus;
use App\Models\Admin;
use App\Models\Owner;
use App\Models\OwnerVerificationApplication;
use App\Models\OwnerVerificationDocument;

class OwnerVerificationDocumentPolicy
{
    public function viewByOwner(Owner $owner, OwnerVerificationDocument $document): bool
    {
        return $document->application !== null
            && $document->application->owner_id === $owner->id
            && $owner->canSignIn();
    }

    public function uploadForApplication(Owner $owner, OwnerVerificationApplication $application): bool
    {
        return $application->owner_id === $owner->id
            && $owner->canSignIn()
            && $application->status->isEditableByOwner();
    }

    public function deleteByOwner(Owner $owner, OwnerVerificationDocument $document): bool
    {
        $application = $document->application;

        if (! $application instanceof OwnerVerificationApplication) {
            return false;
        }

        return $application->owner_id === $owner->id
            && $owner->canSignIn()
            && $application->status->isEditableByOwner()
            && $document->status !== OwnerVerificationDocumentStatus::Replaced;
    }

    public function viewByAdmin(Admin $admin, OwnerVerificationDocument $document): bool
    {
        return $admin->isActive()
            && $admin->hasTwoFactorEnabled()
            && $admin->hasPermission('partners.view_documents');
    }
}
