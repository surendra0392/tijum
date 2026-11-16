<?php

declare(strict_types=1);

namespace App\Actions\Owner\Properties;

use App\Enums\PropertyOwnershipArrangement;
use App\Enums\PropertyVerificationEventType;
use App\Enums\PropertyVerificationStatus;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyVerificationApplication;
use App\Models\PropertyVerificationEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StartPropertyRevisionApplication
{
    public function __construct(
        public readonly CreatePropertyApplicationRecord $createApplicationRecord,
        public readonly StartPropertyAmendment $startPropertyAmendment,
    ) {}

    public function execute(Owner $owner, Property $property): PropertyVerificationApplication
    {
        $property->loadMissing('latestVerificationApplication');

        if ($property->hasApprovedBaseline()) {
            return $this->startPropertyAmendment->execute($owner, $property);
        }

        return DB::transaction(function () use ($owner, $property): PropertyVerificationApplication {
            $lockedProperty = Property::query()
                ->whereKey($property->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages([
                    'application' => 'You are not authorised to start a new verification revision for this property.',
                ]);
            }

            if ($lockedProperty->activeVerificationApplication()->lockForUpdate()->exists()) {
                throw ValidationException::withMessages([
                    'application' => 'An active verification draft or application already exists.',
                ]);
            }

            $latest = $lockedProperty->latestVerificationApplication;
            if (
                $latest instanceof PropertyVerificationApplication
                && ! in_array($latest->status, [
                    PropertyVerificationStatus::Rejected,
                    PropertyVerificationStatus::Withdrawn,
                ], true)
            ) {
                throw ValidationException::withMessages([
                    'application' => 'A revision application may only be started after rejection or withdrawal.',
                ]);
            }

            $nextRevision = max((int) $lockedProperty->verificationApplications()->max('revision_number') + 1, 2);

            $application = $this->createApplicationRecord->execute(
                property: $lockedProperty,
                revisionNumber: $nextRevision,
                isAmendment: false,
                parentApplication: $latest,
                arrangement: $latest instanceof PropertyVerificationApplication
                    ? $latest->ownership_arrangement
                    : PropertyOwnershipArrangement::OwnerOperator,
            );

            PropertyVerificationEvent::record(
                property: $lockedProperty,
                application: $application,
                eventType: PropertyVerificationEventType::DraftCreated,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                newStatus: PropertyVerificationStatus::Draft,
                notes: sprintf('Created revision #%d (%s) after previous application ended.', $nextRevision, $application->application_number),
            );

            return $application;
        });
    }
}
