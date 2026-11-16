<?php

declare(strict_types=1);

namespace App\Actions\Owner\Amenities;

use App\Enums\AmenityAssignmentEventType;
use App\Enums\AmenityVerificationStatus;
use App\Models\AmenityAssignmentEvent;
use App\Models\Owner;
use App\Models\Property;
use App\Models\PropertyRoomTypeAmenity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitPropertyRoomTypeAmenityAssignment
{
    public function execute(Owner $owner, Property $property, PropertyRoomTypeAmenity $assignment, bool $declarationAccepted): PropertyRoomTypeAmenity
    {
        if (! $declarationAccepted) {
            throw ValidationException::withMessages([
                'declaration_accepted' => 'Confirm the amenity declaration before submitting for verification.',
            ]);
        }

        return DB::transaction(function () use ($owner, $property, $assignment): PropertyRoomTypeAmenity {
            $lockedProperty = Property::query()->whereKey($property->id)->lockForUpdate()->firstOrFail();
            if ($lockedProperty->owner_id !== $owner->id || ! $owner->canPublishProperties()) {
                throw ValidationException::withMessages(['amenity' => 'You are not authorised to submit this amenity.']);
            }

            $locked = PropertyRoomTypeAmenity::query()->whereKey($assignment->id)->lockForUpdate()->with('amenity')->firstOrFail();
            if ($locked->property_id !== $lockedProperty->id) {
                throw ValidationException::withMessages(['amenity' => 'Amenity assignment not found for this property.']);
            }
            if (! $locked->status->canSubmitByOwner()) {
                throw ValidationException::withMessages(['amenity' => 'This amenity assignment cannot be submitted in its current state.']);
            }
            if (! $lockedProperty->hasApprovedBaseline()) {
                throw ValidationException::withMessages(['amenity' => 'Complete property verification before submitting amenity assignments.']);
            }

            $previous = $locked->status;
            $isResubmission = $previous !== AmenityVerificationStatus::Draft;
            $now = now();

            $locked->forceFill([
                'status' => AmenityVerificationStatus::Submitted,
                'declaration_version' => (string) config('tijum.amenity_management.declaration_version', '2026.1'),
                'declaration_accepted_at' => $now,
                'submitted_at' => $now,
                'requested_information' => null,
                'decision_reason' => null,
            ])->save();

            AmenityAssignmentEvent::record(
                assignment: $locked,
                eventType: $isResubmission ? AmenityAssignmentEventType::Resubmitted : AmenityAssignmentEventType::Submitted,
                actorType: 'owner',
                actorId: $owner->id,
                actorName: $owner->name,
                previousStatus: $previous->value,
                newStatus: AmenityVerificationStatus::Submitted->value,
                notes: $isResubmission ? 'Room-type amenity assignment resubmitted for verification.' : 'Room-type amenity assignment submitted for verification.',
            );

            return $locked->fresh(['amenity.category', 'roomType']) ?? $locked;
        });
    }
}
