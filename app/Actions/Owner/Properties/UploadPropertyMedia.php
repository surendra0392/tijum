<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyMediaCategory;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyVerificationEventType;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Services\PropertyMediaProcessor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class UploadPropertyMedia
{
    public function __construct(
        public readonly PropertyMediaProcessor $mediaProcessor,
    ) {}

    public function execute(
        Owner $owner,
        Property $property,
        UploadedFile $file,
        PropertyMediaCategory $category,
        string $altText,
        ?int $roomTypeId = null,
        ?int $roomId = null,
        bool $makeCover = false,
        ?int $replacesMediaId = null,
    ): PropertyMedia {
        $trimmedAlt = trim($altText);
        if ($trimmedAlt === '') {
            throw ValidationException::withMessages([
                'alt_text' => 'Provide descriptive alt text for accessibility and property clarity.',
            ]);
        }

        if ($category->isRoomCategory() && $roomTypeId === null && $roomId === null) {
            throw ValidationException::withMessages([
                'property_room_type_id' => 'Room photographs must be linked to a configured Room Type or Physical Room.',
            ]);
        }

        $processed = $this->mediaProcessor->processPrivateUpload($property->id, $file);
        $rawOriginalName = trim(basename($file->getClientOriginalName()));
        $safeOriginal = $rawOriginalName !== '' ? substr($rawOriginalName, 0, 200) : 'property-photo.webp';

        try {
            return DB::transaction(function () use (
                $owner,
                $property,
                $category,
                $trimmedAlt,
                $roomTypeId,
                $roomId,
                $makeCover,
                $replacesMediaId,
                $processed,
                $safeOriginal,
            ): PropertyMedia {
                $lockedProperty = Property::query()
                    ->whereKey($property->id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                    throw ValidationException::withMessages([
                        'image' => 'You are not authorised to upload photographs for this property.',
                    ]);
                }

                $activeApp = $lockedProperty->activeVerificationApplication()->lockForUpdate()->first();
                $hasApproved = $lockedProperty->hasApprovedBaseline();

                if ($hasApproved && (! $activeApp instanceof PropertyVerificationApplication || ! $activeApp->is_amendment || ! $activeApp->status->isEditableByOwner())) {
                    throw ValidationException::withMessages([
                        'image' => 'Uploading or replacing photographs on an approved property requires an active Re-Verification Amendment.',
                    ]);
                }

                if (! $hasApproved && $activeApp instanceof PropertyVerificationApplication && ! $activeApp->status->isEditableByOwner()) {
                    throw ValidationException::withMessages([
                        'image' => 'Photographs cannot be modified while verification is currently in review.',
                    ]);
                }

                $maxImages = (int) config('tijum.property_media.max_images_per_property', 50);
                $currentCount = PropertyMedia::query()
                    ->where('property_id', $lockedProperty->id)
                    ->where('is_archived', false)
                    ->count();

                if ($currentCount >= $maxImages) {
                    throw ValidationException::withMessages([
                        'image' => sprintf('Maximum configured limit (%d images) reached for this property.', $maxImages),
                    ]);
                }

                $resolvedRoomTypeId = $roomTypeId;
                $resolvedRoomId = null;

                if ($roomId !== null) {
                    $room = PropertyRoom::query()
                        ->where('property_id', $lockedProperty->id)
                        ->whereKey($roomId)
                        ->first();
                    if (! $room instanceof PropertyRoom) {
                        throw ValidationException::withMessages([
                            'property_room_id' => 'Selected physical room does not belong to this property.',
                        ]);
                    }
                    $resolvedRoomId = $room->id;
                    $resolvedRoomTypeId ??= $room->property_room_type_id;
                }

                if ($resolvedRoomTypeId !== null) {
                    $roomTypeExists = PropertyRoomType::query()
                        ->where('property_id', $lockedProperty->id)
                        ->whereKey($resolvedRoomTypeId)
                        ->exists();
                    if (! $roomTypeExists) {
                        throw ValidationException::withMessages([
                            'property_room_type_id' => 'Selected room type does not belong to this property.',
                        ]);
                    }
                }

                $replacedTarget = null;
                if ($replacesMediaId !== null) {
                    $replacedTarget = PropertyMedia::query()
                        ->where('property_id', $lockedProperty->id)
                        ->where('is_archived', false)
                        ->whereKey($replacesMediaId)
                        ->lockForUpdate()
                        ->first();

                    if ($replacedTarget instanceof PropertyMedia && $activeApp instanceof PropertyVerificationApplication) {
                        if ($replacedTarget->publication_status === PropertyMediaPublicationStatus::Published) {
                            $replacedTarget->forceFill([
                                'pending_removal_in_application_id' => $activeApp->id,
                            ])->save();
                        }
                    }
                }

                // Do not unset an already-published cover during an Amendment until Amendment promotes;
                // during initial Draft, clear existing draft cover cleanly.
                if ($makeCover && ! $hasApproved) {
                    PropertyMedia::query()
                        ->where('property_id', $lockedProperty->id)
                        ->where('is_archived', false)
                        ->update(['is_cover' => false]);
                } elseif ($makeCover && $hasApproved) {
                    PropertyMedia::query()
                        ->where('property_id', $lockedProperty->id)
                        ->where('property_verification_application_id', $activeApp->id)
                        ->update(['is_cover' => false]);
                }

                $nextOrder = ((int) PropertyMedia::query()
                    ->where('property_id', $lockedProperty->id)
                    ->max('sort_order')) + 1;

                $media = new PropertyMedia;
                $media->forceFill([
                    'property_id' => $lockedProperty->id,
                    'property_room_type_id' => $resolvedRoomTypeId,
                    'property_room_id' => $resolvedRoomId,
                    'property_verification_application_id' => $activeApp?->id,
                    'replaces_media_id' => $replacedTarget?->id,
                    'media_type' => $category,
                    'original_filename' => $safeOriginal,
                    'storage_path' => $processed['storage_path'],
                    'optimized_private_path' => $processed['optimized_private_path'],
                    'thumbnail_path' => $processed['thumbnail_path'],
                    'mime_type' => $processed['mime_type'],
                    'file_size' => $processed['file_size'],
                    'width' => $processed['width'],
                    'height' => $processed['height'],
                    'alt_text' => $trimmedAlt,
                    'sort_order' => $nextOrder,
                    'is_cover' => $makeCover,
                    'moderation_status' => PropertyMediaModerationStatus::Pending,
                    'publication_status' => PropertyMediaPublicationStatus::Private,
                    'is_archived' => false,
                ]);
                $media->save();

                PropertyVerificationEvent::record(
                    property: $lockedProperty,
                    application: $activeApp,
                    eventType: PropertyVerificationEventType::MediaUploaded,
                    actorType: 'owner',
                    actorId: $owner->id,
                    actorName: $owner->name,
                    notes: sprintf('Uploaded %s photograph "%s" to private media storage.', $category->label(), $safeOriginal),
                    metadata: [
                        'media_id' => $media->id,
                        'media_type' => $category->value,
                        'width' => $processed['width'],
                        'height' => $processed['height'],
                    ],
                );

                return $media->fresh(['roomType', 'room']) ?? $media;
            });
        } catch (Throwable $exception) {
            // Roll back private media derivatives cleanly on any DB failure.
            $tempMedia = new PropertyMedia;
            $tempMedia->forceFill([
                'storage_path' => $processed['storage_path'],
                'optimized_private_path' => $processed['optimized_private_path'],
                'thumbnail_path' => $processed['thumbnail_path'],
            ]);
            $this->mediaProcessor->deletePrivateAssets($tempMedia);

            throw $exception;
        }
    }
}
