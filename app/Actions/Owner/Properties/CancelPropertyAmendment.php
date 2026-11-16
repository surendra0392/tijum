<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyMediaPublicationStatus;
use App\Enums\PropertyOperationalStatus;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyMedia;
use App\Models\PropertyRoom;
use App\Models\PropertyRoomType;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use App\Services\PropertyMediaProcessor;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CancelPropertyAmendment
{
    public function __construct(
        public readonly PropertyMediaProcessor $mediaProcessor,
    ) {}

    public function execute(Owner $owner, Property $property): Property
    {
        return DB::transaction(function () use ($owner, $property): Property {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'amendment' => 'You are not authorised to cancel amendments for this property.',
                ]);
            }

            if (! $lockedProperty->hasApprovedBaseline()) {
                throw ValidationException::withMessages([
                    'amendment' => 'Only amendments against an already-approved property can be cancelled back to the approved baseline.',
                ]);
            }

            $activeApp = $lockedProperty->activeVerificationApplication()->lockForUpdate()->first();
            $latestApp = $lockedProperty->latestVerificationApplication()->lockForUpdate()->first();

            // Support cancelling an unsubmitted Draft amendment OR dismissing a Rejected amendment back to the approved baseline.
            $targetApp = null;
            if (
                $activeApp instanceof PropertyVerificationApplication
                && $activeApp->is_amendment
                && $activeApp->status === PropertyVerificationStatus::Draft
            ) {
                $targetApp = $activeApp;
            } elseif (
                ! $activeApp instanceof PropertyVerificationApplication
                && $latestApp instanceof PropertyVerificationApplication
                && $latestApp->is_amendment
                && $latestApp->status === PropertyVerificationStatus::Rejected
            ) {
                $targetApp = $latestApp;
            }

            if (! $targetApp instanceof PropertyVerificationApplication) {
                throw ValidationException::withMessages([
                    'amendment' => 'No unsubmitted draft or rejected amendment can be cancelled.',
                ]);
            }

            $previousStatus = $targetApp->status;

            $mediaToDeleteFiles = $this->rollbackAmendmentStaging($lockedProperty, $targetApp);

            if ($targetApp->status === PropertyVerificationStatus::Draft) {
                $targetApp->forceFill([
                    'status' => PropertyVerificationStatus::Withdrawn,
                    'active_property_id' => null,
                ])->save();
            }

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $targetApp,
                eventType: PropertyVerificationEventType::AmendmentCancelled,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $previousStatus,
                newStatus: $targetApp->status,
                notes: 'Cancelled amendment and restored previously approved property snapshot cleanly.',
            );

            DB::afterCommit(function () use ($mediaToDeleteFiles): void {
                foreach ($mediaToDeleteFiles as $mediaObj) {
                    $this->mediaProcessor->deletePrivateAssets($mediaObj);
                }
            });

            return $lockedProperty->fresh() ?? $lockedProperty;
        });
    }

    /**
     * Discard staged amendment room types, rooms, media, and restore baseline booking eligibility.
     * Must be invoked inside an open database transaction while holding a lock on $lockedProperty.
     *
     * @return list<PropertyMedia>
     */
    public function rollbackAmendmentStaging(
        Property $lockedProperty,
        PropertyVerificationApplication $targetApp,
    ): array {
        $stagedMedia = PropertyMedia::query()
            ->where('property_id', $lockedProperty->id)
            ->where('property_verification_application_id', $targetApp->id)
            ->where('publication_status', '!=', PropertyMediaPublicationStatus::Published->value)
            ->get();

        $mediaToDeleteFiles = [];
        foreach ($stagedMedia as $mediaItem) {
            $mediaToDeleteFiles[] = clone $mediaItem;
            $mediaItem->delete();
        }

        PropertyMedia::query()
            ->where('property_id', $lockedProperty->id)
            ->where('pending_removal_in_application_id', $targetApp->id)
            ->update(['pending_removal_in_application_id' => null]);

        PropertyRoom::query()
            ->where('property_id', $lockedProperty->id)
            ->where('amendment_application_id', $targetApp->id)
            ->where('is_approved_version', false)
            ->delete();

        $stagedRoomTypeIds = PropertyRoomType::query()
            ->where('property_id', $lockedProperty->id)
            ->where('amendment_application_id', $targetApp->id)
            ->where('is_approved_version', false)
            ->pluck('id');

        if ($stagedRoomTypeIds->isNotEmpty()) {
            PropertyRoom::query()
                ->where('property_id', $lockedProperty->id)
                ->whereIn('property_room_type_id', $stagedRoomTypeIds)
                ->delete();

            PropertyMedia::query()
                ->where('property_id', $lockedProperty->id)
                ->whereIn('property_room_type_id', $stagedRoomTypeIds)
                ->update(['property_room_type_id' => null]);

            PropertyRoomType::query()
                ->whereIn('id', $stagedRoomTypeIds)
                ->delete();
        }

        PropertyRoomType::query()
            ->where('property_id', $lockedProperty->id)
            ->where('pending_changes_application_id', $targetApp->id)
            ->update([
                'pending_amendment_data' => null,
                'pending_changes_application_id' => null,
            ]);

        $lockedProperty->forceFill([
            'booking_eligible' => $lockedProperty->status === PropertyOperationalStatus::Active,
        ])->save();

        return $mediaToDeleteFiles;
    }
}
