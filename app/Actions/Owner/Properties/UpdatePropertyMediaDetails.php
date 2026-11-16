<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdatePropertyMediaDetails
{
    public function updateMetadata(
        Owner $owner,
        Property $property,
        PropertyMedia $media,
        string $altText,
        ?PropertyMediaCategory $category = null,
        bool $makeCover = false,
    ): PropertyMedia {
        $cleanAlt = trim($altText);
        if ($cleanAlt === '') {
            throw ValidationException::withMessages([
                'alt_text' => 'Descriptive alt text is required.',
            ]);
        }

        return DB::transaction(function () use (
            $owner,
            $property,
            $media,
            $cleanAlt,
            $category,
            $makeCover,
        ): PropertyMedia {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();
            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages(['media' => 'Unauthorized property media update.']);
            }

            $activeApp = $lockedProperty->activeVerificationApplication()->lockForUpdate()->first();
            if ($lockedProperty->hasApprovedBaseline()) {
                if (! $activeApp instanceof PropertyVerificationApplication || ! $activeApp->is_amendment || ! $activeApp->status->isEditableByOwner()) {
                    throw ValidationException::withMessages([
                        'media' => 'Editing approved media requires an active Re-Verification Amendment.',
                    ]);
                }
            } elseif ($activeApp instanceof PropertyVerificationApplication && ! $activeApp->status->isEditableByOwner()) {
                throw ValidationException::withMessages(['media' => 'Media is locked during verification review.']);
            }

            $lockedMedia = PropertyMedia::query()
                ->where('property_id', $lockedProperty->id)
                ->whereKey($media->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($makeCover) {
                $coverScope = PropertyMedia::query()
                    ->where('property_id', $lockedProperty->id)
                    ->where('is_archived', false);

                if ($lockedProperty->hasApprovedBaseline()) {
                    $coverScope->where('property_verification_application_id', $activeApp->id);
                }

                $coverScope->update(['is_cover' => false]);
            }

            $updates = [
                'alt_text' => $cleanAlt,
                'is_cover' => $makeCover ? true : $lockedMedia->is_cover,
            ];
            if ($category instanceof PropertyMediaCategory) {
                $updates['media_type'] = $category;
            }

            $lockedMedia->forceFill($updates)->save();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $activeApp,
                eventType: PropertyVerificationEventType::MediaUpdated,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                notes: sprintf('Updated metadata for photograph "%s".', $lockedMedia->original_filename),
                metadata: ['media_id' => $lockedMedia->id, 'is_cover' => $lockedMedia->is_cover],
            );

            return $lockedMedia->fresh(['roomType', 'room']) ?? $lockedMedia;
        });
    }

    /**
     * Reorder gallery items cleanly with server-side property ownership verification.
     *
     * @param  list<int>  $orderedMediaIds
     */
    public function reorder(Owner $owner, Property $property, array $orderedMediaIds): void
    {
        DB::transaction(function () use ($owner, $property, $orderedMediaIds): void {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();
            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages(['media' => 'Unauthorized gallery reorder.']);
            }

            $activeApp = $lockedProperty->activeVerificationApplication()->lockForUpdate()->first();
            $editable = $lockedProperty->hasApprovedBaseline()
                ? ($activeApp instanceof PropertyVerificationApplication && $activeApp->is_amendment && $activeApp->status->isEditableByOwner())
                : (! $activeApp instanceof PropertyVerificationApplication || $activeApp->status->isEditableByOwner());

            if (! $editable) {
                throw ValidationException::withMessages(['media' => 'Gallery order cannot be changed right now.']);
            }

            $existing = PropertyMedia::query()
                ->where('property_id', $lockedProperty->id)
                ->where('is_archived', false)
                ->pluck('id')
                ->all();

            foreach ($orderedMediaIds as $index => $mediaId) {
                if (in_array($mediaId, $existing, true)) {
                    PropertyMedia::query()
                        ->where('property_id', $lockedProperty->id)
                        ->whereKey($mediaId)
                        ->update(['sort_order' => $index + 1]);
                }
            }

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $activeApp,
                eventType: PropertyVerificationEventType::MediaReordered,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                notes: 'Reordered property gallery sequence.',
            );
        });
    }
}
