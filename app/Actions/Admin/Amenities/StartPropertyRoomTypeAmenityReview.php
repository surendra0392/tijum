<?php

declare(strict_types=1);

namespace App\Actions\Admin\Amenities;

use App\Enums\AmenityAssignmentEventType;
use App\Enums\AmenityVerificationStatus;
use App\Models\Admin;
use App\Models\AmenityAssignmentEvent;
use App\Models\PropertyRoomTypeAmenity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StartPropertyRoomTypeAmenityReview
{
    public function execute(Admin $actingAdmin, PropertyRoomTypeAmenity $assignment): PropertyRoomTypeAmenity
    {
        return DB::transaction(function () use ($actingAdmin, $assignment): PropertyRoomTypeAmenity {
            $locked = PropertyRoomTypeAmenity::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();
            if (! $locked->status->canStartReview()) {
                throw ValidationException::withMessages(['amenity' => 'Only submitted room-type amenity assignments can enter review.']);
            }
            $previous = $locked->status;
            $locked->forceFill([
                'status' => AmenityVerificationStatus::UnderReview,
                'assigned_admin_id' => $locked->assigned_admin_id ?? $actingAdmin->id,
                'under_review_at' => now(),
            ])->save();
            AmenityAssignmentEvent::record(
                assignment: $locked,
                eventType: AmenityAssignmentEventType::ReviewStarted,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previous->value,
                newStatus: AmenityVerificationStatus::UnderReview->value,
                notes: 'Room-type amenity assignment moved to Under Review.',
            );

            return $locked->fresh(['amenity.category', 'property', 'roomType']) ?? $locked;
        });
    }
}
