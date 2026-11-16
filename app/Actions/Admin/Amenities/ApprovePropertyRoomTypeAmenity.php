<?php

declare(strict_types=1);

namespace App\Actions\Admin\Amenities;

use App\Enums\AmenityAssignmentEventType;
use App\Enums\AmenityVerificationStatus;
use App\Models\Admin;
use App\Models\Amenity;
use App\Models\AmenityAssignmentEvent;
use App\Models\Property;
use App\Models\PropertyRoomTypeAmenity;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApprovePropertyRoomTypeAmenity
{
    public function execute(Admin $actingAdmin, PropertyRoomTypeAmenity $assignment, ?string $decisionReason = null, ?string $internalReviewerNotes = null): PropertyRoomTypeAmenity
    {
        return DB::transaction(function () use ($actingAdmin, $assignment, $decisionReason, $internalReviewerNotes): PropertyRoomTypeAmenity {
            /** @var PropertyRoomTypeAmenity $locked */
            $locked = PropertyRoomTypeAmenity::query()->whereKey($assignment->id)->with(['amenity.category', 'property', 'roomType'])->lockForUpdate()->firstOrFail();
            if (! $locked->status->canApprove()) {
                throw ValidationException::withMessages(['amenity' => 'Amenity assignment must be Under Review before approval.']);
            }
            if (! $locked->property instanceof Property || ! $locked->property->hasApprovedBaseline()) {
                throw ValidationException::withMessages(['amenity' => 'The property must be verified before amenity assignments can be approved.']);
            }
            $previousActive = PropertyRoomTypeAmenity::query()
                ->where('assignment_group_id', $locked->assignment_group_id)
                ->whereKeyNot($locked->id)
                ->where('is_current', true)
                ->where('status', AmenityVerificationStatus::Approved->value)
                ->lockForUpdate()
                ->first();
            $previousStatus = $locked->status;
            $now = now();
            $snapshot = [
                'approved_at' => $now->toISOString(),
                'revision_number' => $locked->revision_number,
                'assignment_reference' => $locked->assignment_reference,
                'property_id' => $locked->property_id,
                'property_room_type_id' => $locked->property_room_type_id,
                'amenity' => $locked->amenity instanceof Amenity ? $locked->amenity->toAdminArray() : null,
                'availability' => $locked->availability->value,
                'is_customer_visible' => $locked->is_customer_visible,
                'details' => $locked->details,
            ];
            $cleanDecisionReason = is_string($decisionReason) && trim($decisionReason) !== '' ? trim($decisionReason) : 'Room-type amenity assignment approved.';
            $cleanInternalNotes = is_string($internalReviewerNotes) && trim($internalReviewerNotes) !== '' ? trim($internalReviewerNotes) : $locked->internal_reviewer_notes;
            $locked->forceFill([
                'status' => AmenityVerificationStatus::Approved,
                'is_current' => true,
                'approved_at' => $now,
                'under_review_at' => $locked->under_review_at ?? $now,
                'reviewed_at' => $now,
                'assigned_admin_id' => $locked->assigned_admin_id ?? $actingAdmin->id,
                'reviewed_by_admin_id' => $actingAdmin->id,
                'requested_information' => null,
                'decision_reason' => $cleanDecisionReason,
                'internal_reviewer_notes' => $cleanInternalNotes,
                'approved_snapshot' => $snapshot,
                'superseded_by_property_room_type_amenity_id' => null,
            ])->save();
            if ($previousActive instanceof PropertyRoomTypeAmenity) {
                $previousActive->forceFill([
                    'is_current' => false,
                    'superseded_by_property_room_type_amenity_id' => $locked->id,
                ])->save();
                AmenityAssignmentEvent::record(
                    assignment: $previousActive,
                    eventType: AmenityAssignmentEventType::RevisionSuperseded,
                    actorType: 'admin',
                    actorId: $actingAdmin->id,
                    actorName: $actingAdmin->name,
                    previousStatus: $previousActive->status->value,
                    newStatus: $previousActive->status->value,
                    notes: sprintf('Superseded by approved revision %s.', $locked->assignment_reference),
                    metadata: ['superseded_by_property_room_type_amenity_id' => $locked->id],
                );
            }
            AmenityAssignmentEvent::record(
                assignment: $locked,
                eventType: $locked->revision_number > 1 ? AmenityAssignmentEventType::RevisionApproved : AmenityAssignmentEventType::Approved,
                actorType: 'admin',
                actorId: $actingAdmin->id,
                actorName: $actingAdmin->name,
                previousStatus: $previousStatus->value,
                newStatus: AmenityVerificationStatus::Approved->value,
                notes: $cleanDecisionReason,
            );

            return $locked->fresh(['amenity.category', 'property', 'roomType']) ?? $locked;
        });
    }
}
