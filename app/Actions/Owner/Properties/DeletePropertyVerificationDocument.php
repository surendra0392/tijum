<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;
use App\Models\PropertyVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class DeletePropertyVerificationDocument
{
    public function execute(Owner $owner, Property $property, PropertyVerificationDocument $document): void
    {
        DB::transaction(function () use ($owner, $property, $document): void {
            $document->loadMissing('application.property');
            $application = $document->application;

            if (
                ! $application instanceof PropertyVerificationApplication
                || $application->property_id !== $property->id
                || $property->owner_id !== $owner->id
                || ! $owner->canPublishProperties()
            ) {
                throw ValidationException::withMessages([
                    'document' => 'You are not authorised to delete this verification document.',
                ]);
            }

            $lockedApp = PropertyVerificationApplication::query()
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (! $lockedApp->status->isEditableByOwner()) {
                throw ValidationException::withMessages([
                    'document' => 'Documents cannot be deleted once submitted unless clarification is requested.',
                ]);
            }

            if ($document->status === PropertyVerificationDocumentStatus::Replaced) {
                throw ValidationException::withMessages([
                    'document' => 'Historical replaced document records are retained cleanly and cannot be purged.',
                ]);
            }

            $diskName = (string) config('tijum.property_verification.disk', 'property_verification');
            $storagePath = $document->storage_path;
            $label = $document->document_type->label();
            $originalName = $document->original_filename;

            $document->delete();

            $stillReferenced = PropertyVerificationDocument::query()
                ->where('storage_path', $storagePath)
                ->exists();

            PropertyVerificationEvent::record(
                property: $property,
                application: $lockedApp,
                eventType: PropertyVerificationEventType::DocumentDeleted,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                notes: sprintf('Removed %s draft document (%s).', $label, $originalName),
            );

            if (! $stillReferenced) {
                DB::afterCommit(static function () use ($diskName, $storagePath): void {
                    Storage::disk($diskName)->delete($storagePath);
                });
            }
        });
    }
}
