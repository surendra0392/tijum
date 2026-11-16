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

class RejectPropertyRoomTypeAmenity
{
    public function execute(Admin $actingAdmin, PropertyRoomTypeAmenity $assignment, string $decisionReason, ?string $internalReviewerNotes = null): PropertyRoomTypeAmenity
    {
        $reason = trim($decisionReason);
        if ($reason === '') {
            throw ValidationException::withMessages(['decision_reason' => 'Document the rejection reason for the partner and audit history.']);
        }

        return DB::transaction(function () use ($actingAdmin, $assignment, $reason, $internalReviewerNotes): PropertyRoomTypeAmenity {
            $locked = PropertyRoomTypeAmenity::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();
            if (! $locked->status->canReject()) {
                throw ValidationException::withMessages(['amenity' => 'Only Under Review amenity assignments can be rejected.']);
            }
            $previous = $locked->status;
            $locked->forceFill([
                'status' => AmenityVerificationStatus::Rejected,
                'reviewed_at' => now(),
                'assigned_admin_id' => $locked->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'requested_information' => null,
                'decision_reason' => $reason,
                'internal_reviewer_notes' => is_string($internalReviewerNotes) && trim($internalReviewerNotes) !== '' ? trim($internalReviewerNotes) : $locked->internal_reviewer_notes,
            ])->save();
            AmenityAssignmentEvent::record(
                assignment: $locked,
                eventType: AmenityAssignmentEventType::Rejected,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previous->value,
                newStatus: AmenityVerificationStatus::Rejected->value,
                notes: $reason,
            );

            return $locked->fresh(['amenity.category', 'property', 'roomType']) ?? $locked;
        });
    }
}
