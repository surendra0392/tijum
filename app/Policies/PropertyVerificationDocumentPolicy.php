<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Admin;
use App\Models\Owner;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;

class PropertyVerificationDocumentPolicy
{
    public function viewByOwner(Owner $owner, PropertyVerificationDocument $document): bool
    {
        $document->loadMissing('application.property');

        return $document->application instanceof PropertyVerificationApplication
            && $document->application->property !== null
            && $document->application->property->owner_id === $owner->id
            && $owner->canSignIn();
    }

    public function deleteByOwner(Owner $owner, PropertyVerificationDocument $document): bool
    {
        $document->loadMissing('application.property');

        return $document->application instanceof PropertyVerificationApplication
            && $document->application->property !== null
            && $document->application->property->owner_id === $owner->id
            && $owner->canPublishProperties()
            && $document->application->status->isEditableByOwner();
    }

    public function viewByAdmin(Admin $admin, PropertyVerificationDocument $document): bool
    {
        return $admin->isActive() && $admin->hasPermission('properties.view_documents');
    }
}
