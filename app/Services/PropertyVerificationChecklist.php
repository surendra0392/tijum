<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\OwnerStatus;
use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyRoomStatus;
use App\Enums\PropertyVerificationDocumentStatus;
use App\Enums\PropertyVerificationDocumentType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationDocument;

class PropertyVerificationChecklist
{
    /**
     * Evaluate owner readiness, media & document minimums, and admin approval readiness.
     *
     * @return array<string, mixed>
     */
    public function evaluate(Property $property, ?PropertyVerificationApplication $application = null): array
    {
        $property->loadMissing(['owner', 'category', 'city', 'roomTypes', 'rooms', 'media']);

        if ($application instanceof PropertyVerificationApplication) {
            $application->loadMissing(['documents']);
        }

        $owner = $property->owner;
        $ownerActive = $owner !== null && $owner->status === OwnerStatus::Active && $owner->hasVerifiedEmail();

        $effectiveFields = $property->effectiveFieldsForRevision($application);
        $identityComplete = $property->category !== null
            && $property->city !== null
            && filled($effectiveFields['name'] ?? null)
            && filled($effectiveFields['description'] ?? null)
            && filled($effectiveFields['contact_person_name'] ?? null)
            && filled($effectiveFields['contact_phone'] ?? null)
            && filled($effectiveFields['address_line_1'] ?? null)
            && filled($effectiveFields['locality'] ?? null)
            && filled($effectiveFields['postal_code'] ?? null);

        $activeRoomTypes = $property->roomTypes
            ->filter(function (PropertyRoomType $roomType) use ($application): bool {
                $effective = $roomType->effectiveAttributes($application);

                return (bool) $effective['is_active'];
            })
            ->values();

        $activeRooms = $property->rooms
            ->filter(static fn (PropertyRoom $room): bool => $room->operational_status !== PropertyRoomStatus::Inactive)
            ->values();

        $activeMedia = $property->media
            ->filter(static function (PropertyMedia $media) use ($application): bool {
                if ($media->is_archived) {
                    return false;
                }

                if ($media->moderation_status === PropertyMediaModerationStatus::Rejected) {
                    return false;
                }

                if (
                    $application instanceof PropertyVerificationApplication
                    && $media->pending_removal_in_application_id === $application->id
                ) {
                    return false;
                }

                return true;
            })
            ->values();

        $propertyLevelPhotosCount = $activeMedia
            ->filter(static fn (PropertyMedia $media): bool => ! $media->media_type->isRoomCategory())
            ->count();

        $minPropertyPhotos = (int) config('tijum.property_media.min_property_photos', 3);
        $minRoomPhotosPerType = (int) config('tijum.property_media.min_room_photos_per_type', 1);

        $hasCoverImage = $activeMedia->contains(static fn (PropertyMedia $media): bool => $media->is_cover);

        $roomsById = $property->rooms->keyBy('id');
        $roomTypesMissingPhotos = [];

        foreach ($activeRoomTypes as $roomType) {
            $countForType = $activeMedia
                ->filter(static function (PropertyMedia $media) use ($roomType, $roomsById): bool {
                    if ($media->property_room_type_id === $roomType->id) {
                        return true;
                    }

                    if ($media->property_room_id !== null) {
                        $room = $roomsById->get($media->property_room_id);

                        return $room instanceof PropertyRoom && $room->property_room_type_id === $roomType->id;
                    }

                    return false;
                })
                ->count();

            if ($countForType < $minRoomPhotosPerType) {
                $effectiveType = $roomType->effectiveAttributes($application);
                $roomTypesMissingPhotos[] = (string) ($effectiveType['name'] ?? $roomType->name);
            }
        }

        $documents = $application instanceof PropertyVerificationApplication
            ? $application->documents
            : collect();

        $activeDocumentsByType = [];
        $unresolvedRejectedDocsCount = 0;

        foreach ($documents as $doc) {
            if (! $doc instanceof PropertyVerificationDocument) {
                continue;
            }

            if ($doc->status === PropertyVerificationDocumentStatus::Replaced) {
                continue;
            }

            if ($doc->status === PropertyVerificationDocumentStatus::Rejected) {
                $unresolvedRejectedDocsCount++;
            }

            if (! isset($activeDocumentsByType[$doc->document_type->value])) {
                $activeDocumentsByType[$doc->document_type->value] = $doc;
            }
        }

        $checklist = [];
        $missingRequirements = [];
        $requiredDocumentsMet = true;

        if (! $ownerActive) {
            $missingRequirements[] = 'Owner partner account must remain Active and email verified.';
        }

        if (! $identityComplete) {
            $missingRequirements[] = 'Complete property overview, category, city, full address, and contact information.';
        }

        if ($activeRoomTypes->isEmpty()) {
            $missingRequirements[] = 'Configure at least one active room type (e.g., 4 Sharing AC or Single Room AC).';
        }

        if ($activeRooms->isEmpty()) {
            $missingRequirements[] = 'Add at least one physical room assigned to an active room type.';
        }

        if ($propertyLevelPhotosCount < $minPropertyPhotos) {
            $missingRequirements[] = sprintf(
                'Upload at least %d genuine property-level photographs (currently %d).',
                $minPropertyPhotos,
                $propertyLevelPhotosCount,
            );
        }

        if (! $hasCoverImage) {
            $missingRequirements[] = 'Select one property photograph as the cover image.';
        }

        foreach ($roomTypesMissingPhotos as $missingRoomTypeName) {
            $missingRequirements[] = sprintf(
                'Upload at least %d genuine room photograph for room type "%s".',
                $minRoomPhotosPerType,
                $missingRoomTypeName,
            );
        }

        foreach (PropertyVerificationDocumentType::cases() as $docType) {
            $isRequired = $docType->isUniversallyRequired();
            $activeDoc = $activeDocumentsByType[$docType->value] ?? null;
            $isFulfilled = $activeDoc instanceof PropertyVerificationDocument
                && $activeDoc->status !== PropertyVerificationDocumentStatus::Rejected;

            if ($isRequired && ! $isFulfilled) {
                $requiredDocumentsMet = false;
                if ($activeDoc instanceof PropertyVerificationDocument && $activeDoc->status === PropertyVerificationDocumentStatus::Rejected) {
                    $missingRequirements[] = sprintf('Replace flagged verification document: %s.', $docType->label());
                } else {
                    $missingRequirements[] = sprintf('Upload required verification document: %s.', $docType->label());
                }
            } elseif (! $isRequired && $activeDoc instanceof PropertyVerificationDocument && $activeDoc->status === PropertyVerificationDocumentStatus::Rejected) {
                $missingRequirements[] = sprintf('Replace flagged optional document: %s.', $docType->label());
            }

            $guidance = $docType->guidance();
            if ($docType === PropertyVerificationDocumentType::OwnershipOrLeaseProof && $application instanceof PropertyVerificationApplication) {
                $guidance = $application->ownership_arrangement->ownershipDocumentGuidance();
            }

            $checklist[] = [
                'type' => $docType->value,
                'label' => $docType->label(),
                'guidance' => $guidance,
                'accepted_formats' => $docType->acceptedFormatsLabel(),
                'required' => $isRequired,
                'fulfilled' => $isFulfilled,
                'document' => $activeDoc instanceof PropertyVerificationDocument
                    ? $activeDoc->toOwnerArray($property->id)
                    : null,
            ];
        }

        $documentsComplete = $requiredDocumentsMet && $unresolvedRejectedDocsCount === 0;
        $mediaComplete = $propertyLevelPhotosCount >= $minPropertyPhotos
            && $hasCoverImage
            && $roomTypesMissingPhotos === [];

        $readyForSubmission = $ownerActive
            && $identityComplete
            && $activeRoomTypes->isNotEmpty()
            && $activeRooms->isNotEmpty()
            && $mediaComplete
            && $documentsComplete;

        $pendingModerationMediaCount = $activeMedia
            ->filter(static fn (PropertyMedia $media): bool => $media->moderation_status === PropertyMediaModerationStatus::Pending)
            ->count();

        $approvedMediaCount = $activeMedia
            ->filter(static fn (PropertyMedia $media): bool => $media->moderation_status === PropertyMediaModerationStatus::Approved)
            ->count();

        $adminMissingApprovals = $missingRequirements;
        if ($pendingModerationMediaCount > 0) {
            $adminMissingApprovals[] = sprintf(
                'Moderate all pending property and room photographs before final property approval (%d pending).',
                $pendingModerationMediaCount,
            );
        }

        $readyForAdminApproval = $readyForSubmission
            && $pendingModerationMediaCount === 0
            && $approvedMediaCount >= ($minPropertyPhotos + $activeRoomTypes->count());

        $isSubmittedOrBeyond = $application instanceof PropertyVerificationApplication
            && $application->status !== PropertyVerificationStatus::Draft;

        return [
            'owner_active' => $ownerActive,
            'identity_complete' => $identityComplete,
            'room_types_count' => $activeRoomTypes->count(),
            'rooms_count' => $activeRooms->count(),
            'property_photos_count' => $propertyLevelPhotosCount,
            'min_property_photos' => $minPropertyPhotos,
            'has_cover_image' => $hasCoverImage,
            'room_types_missing_photos' => $roomTypesMissingPhotos,
            'media_complete' => $mediaComplete,
            'documents_complete' => $documentsComplete,
            'unresolved_rejected_documents_count' => $unresolvedRejectedDocsCount,
            'pending_moderation_media_count' => $pendingModerationMediaCount,
            'approved_media_count' => $approvedMediaCount,
            'missing_requirements' => $missingRequirements,
            'admin_missing_approvals' => $adminMissingApprovals,
            'ready_for_submission' => $readyForSubmission,
            'ready_for_admin_approval' => $readyForAdminApproval,
            'checklist' => $checklist,
            'is_submitted_or_beyond' => $isSubmittedOrBeyond,
        ];
    }
}
