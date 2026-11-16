<?php

declare(strict_types=1);

namespace App\Actions\Admin\Properties;

use App\Enums\PropertyMediaModerationStatus;
use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyVerificationEventType;
use App\Models\Admin;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyVerificationEvent;
use App\Services\PropertyMediaProcessor;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ModeratePropertyMedia
{
    public function __construct(
        public readonly PropertyMediaProcessor $mediaProcessor,
    ) {}

    public function execute(
        Admin $actingAdmin,
        Property $property,
        PropertyMedia $media,
        PropertyMediaModerationStatus $targetStatus,
        ?string $note = null,
    ): PropertyMedia {
        if ($targetStatus === PropertyMediaModerationStatus::Rejected && (! is_string($note) || trim($note) === '')) {
            throw ValidationException::withMessages([
                'moderation_note' => 'A clear reason is required when rejecting a property or room photograph.',
            ]);
        }

        return DB::transaction(function () use (
            $actingAdmin,
            $property,
            $media,
            $targetStatus,
            $note,
        ): PropertyMedia {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();
            $lockedMedia = PropertyMedia::query()
                ->where('property_id', $lockedProperty->id)
                ->whereKey($media->id)
                ->lockForUpdate()
                ->firstOrFail();

            $cleanNote = is_string($note) && trim($note) !== '' ? trim($note) : null;
            $wasPublished = $lockedMedia->publication_status === PropertyMediaPublicationStatus::Published;

            $lockedMedia->forceFill([
                'moderation_status' => $targetStatus,
                'moderation_note' => $cleanNote,
                'moderated_by_admin_id' => $actingAdmin->id,
                'moderated_at' => now(),
                'is_cover' => $targetStatus === PropertyMediaModerationStatus::Rejected ? false : $lockedMedia->is_cover,
            ])->save();

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $lockedProperty->activeVerificationApplication()->first(),
                eventType: $targetStatus === PropertyMediaModerationStatus::Approved
                    ? PropertyVerificationEventType::MediaApproved
                    : PropertyVerificationEventType::MediaRejected,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                notes: sprintf(
                    '%s photograph #%d (%s)%s',
                    $targetStatus === PropertyMediaModerationStatus::Approved ? 'Approved' : 'Rejected',
                    $lockedMedia->id,
                    $lockedMedia->original_filename,
                    $cleanNote !== null ? ": {$cleanNote}" : '.',
                ),
                metadata: [
                    'media_id' => $lockedMedia->id,
                    'moderation_status' => $targetStatus->value,
                ],
            );

            if ($targetStatus === PropertyMediaModerationStatus::Rejected && $wasPublished) {
                $mediaId = $lockedMedia->id;
                DB::afterCommit(function () use ($mediaId): void {
                    $this->mediaProcessor->scheduleUnpublication($mediaId);
                });
            }

            return $lockedMedia->fresh() ?? $lockedMedia;
        });
    }
}
