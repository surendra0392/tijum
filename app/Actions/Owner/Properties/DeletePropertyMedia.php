<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Services\PropertyMediaProcessor;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeletePropertyMedia
{
    public function __construct(
        public readonly PropertyMediaProcessor $mediaProcessor,
    ) {}

    public function execute(Owner $owner, Property $property, PropertyMedia $media): void
    {
        DB::transaction(function () use ($owner, $property, $media): void {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();
            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages(['media' => 'Unauthorized media removal.']);
            }

            $activeApp = $lockedProperty->activeVerificationApplication()->lockForUpdate()->first();
            $editable = $lockedProperty->hasApprovedBaseline()
                ? ($activeApp instanceof PropertyVerificationApplication && $activeApp->is_amendment && $activeApp->status->isEditableByOwner())
                : (! $activeApp instanceof PropertyVerificationApplication || $activeApp->status->isEditableByOwner());

            if (! $editable) {
                throw ValidationException::withMessages([
                    'media' => 'Photographs cannot be deleted outside an editable draft or amendment revision.',
                ]);
            }

            $lockedMedia = PropertyMedia::query()
                ->where('property_id', $lockedProperty->id)
                ->whereKey($media->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedMedia->publication_status === PropertyMediaPublicationStatus::Published) {
                // Keep immutable published file live until the Amendment promotes; mark pending removal.
                if (! $activeApp instanceof PropertyVerificationApplication) {
                    throw ValidationException::withMessages([
                        'media' => 'Published photographs require an active amendment to schedule removal.',
                    ]);
                }

                $lockedMedia->forceFill([
                    'pending_removal_in_application_id' => $activeApp->id,
                ])->save();

                PropertyVerificationEvent::record(
                    property: $lockedProperty,
                    application: $activeApp,
                    eventType: PropertyVerificationEventType::MediaRemoved,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    notes: sprintf('Scheduled removal of published photograph "%s" upon amendment promotion.', $lockedMedia->original_filename),
                    metadata: ['media_id' => $lockedMedia->id],
                );

                return;
            }

            $mediaSnapshot = clone $lockedMedia;
            $lockedMedia->delete();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $activeApp,
                eventType: PropertyVerificationEventType::MediaRemoved,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                notes: sprintf('Removed unpublished draft photograph "%s".', $mediaSnapshot->original_filename),
            );

            DB::afterCommit(function () use ($mediaSnapshot): void {
                $this->mediaProcessor->deletePrivateAssets($mediaSnapshot);
            });
        });
    }
}
