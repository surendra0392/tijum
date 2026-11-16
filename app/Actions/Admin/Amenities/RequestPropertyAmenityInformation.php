<?php

declare(strict_types=1);

namespace App\Actions\Admin\Amenities;

use App\Enums\AmenityAssignmentEventType;
use App\Enums\AmenityVerificationStatus;
use App\Models\Admin;
use App\Models\AmenityAssignmentEvent;
use App\Models\PropertyAmenity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequestPropertyAmenityInformation
{
    public function execute(
        Admin $actingAdmin,
        PropertyAmenity $assignment,
        string $requestedInformation,
        ?string $internalReviewerNotes = null,
    ): PropertyAmenity {
        $message = trim($requestedInformation);
        if ($message === '') {
            throw ValidationException::withMessages(['requested_information' => 'Explain what additional information or corrections are required.']);
        }

        return DB::transaction(function () use ($actingAdmin, $assignment, $message, $internalReviewerNotes): PropertyAmenity {
            $locked = PropertyAmenity::query()->whereKey($assignment->id)->lockForUpdate()->firstOrFail();

            if (! $locked->status->canRequestInformation()) {
                throw ValidationException::withMessages(['amenity' => 'Information can only be requested while the assignment is under review.']);
            }

            $previous = $locked->status;
            $locked->forceFill([
                'status' => AmenityVerificationStatus::NeedsInformation,
                'requested_information' => $message,
                'internal_reviewer_notes' => is_string($internalReviewerNotes) && trim($internalReviewerNotes) !== ''
                    ? trim($internalReviewerNotes)
                    : $locked->internal_reviewer_notes,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'reviewed_at' => now(),
            ])->save();

            AmenityAssignmentEvent::record(
                assignment: $locked,
                eventType: AmenityAssignmentEventType::InformationRequested,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previous->value,
                newStatus: AmenityVerificationStatus::NeedsInformation->value,
                notes: $message,
            );

            return $locked->fresh(['amenity.category', 'property']) ?? $locked;
        });
    }
}
