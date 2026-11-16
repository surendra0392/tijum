<?php

declare(strict_types=1);

namespace App\Actions\Admin\Amenities;

use App\Enums\AmenityAssignmentEventType;
use App\Models\Admin;
use App\Models\AmenityAssignmentEvent;
use App\Models\PropertyRoomTypeAmenity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignPropertyRoomTypeAmenityReviewer
{
    public function execute(Admin $actingAdmin, PropertyRoomTypeAmenity $assignment, Admin $reviewer): PropertyRoomTypeAmenity
    {
        return DB::transaction(function () use ($actingAdmin, $assignment, $reviewer): PropertyRoomTypeAmenity {
            $locked = PropertyRoomTypeAmenity::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();
            if (! $locked->status->isInReview()) {
                throw ValidationException::withMessages(['assigned_admin_id' => 'Reviewers can only be assigned to submitted or under-review amenity assignments.']);
            }
            if (! $reviewer->isActive()) {
                throw ValidationException::withMessages(['assigned_admin_id' => 'Select an active review administrator.']);
            }
            $locked->forceFill(['assigned_admin_id' => $reviewer->id])->save();
            AmenityAssignmentEvent::record(
                assignment: $locked,
                eventType: AmenityAssignmentEventType::Updated,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                notes: sprintf('Assigned reviewer %s.', $reviewer->name),
                metadata: ['assigned_admin_id' => $reviewer->id],
            );

            return $locked->fresh(['amenity.category', 'property', 'roomType']) ?? $locked;
        });
    }
}
