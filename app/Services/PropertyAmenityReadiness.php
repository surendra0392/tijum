<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AmenityApplicabilityScope;
use App\Enums\AmenityVerificationStatus;
use App\Models\Amenity;
use App\Models\Property;
use App\Models\PropertyAmenity;
use App\Models\PropertyRoomType;
use App\Models\PropertyRoomTypeAmenity;

class PropertyAmenityReadiness
{
    /**
     * Evaluate amenity readiness for a property without fabricating status.
     *
     * @return array<string, mixed>
     */
    public function evaluate(Property $property): array
    {
        $property->loadMissing([
            'owner',
            'roomTypes',
            'amenityAssignments.amenity.category',
            'roomTypeAmenityAssignments.amenity.category',
            'roomTypeAmenityAssignments.roomType',
        ]);

        $ownerActive = $property->owner !== null && $property->owner->canPublishProperties();
        $propertyApproved = $property->hasApprovedBaseline();

        $propertyAssignments = $property->amenityAssignments->where('is_current', true)->values();
        $roomTypeAssignments = $property->roomTypeAmenityAssignments->where('is_current', true)->values();

        $applicablePropertyAmenityCount = Amenity::query()
            ->active()
            ->whereIn('applicability_scope', [
                AmenityApplicabilityScope::Property->value,
                AmenityApplicabilityScope::Both->value,
            ])
            ->count();

        $activeRoomTypes = $property->roomTypes->where('is_active', true)->values();

        $missingRequirements = [];
        $adminMissingApprovals = [];

        if (! $ownerActive) {
            $missingRequirements[] = 'The partner account must remain Active and email verified.';
        }

        if (! $propertyApproved) {
            $missingRequirements[] = 'The accommodation property must complete TIJUM verification before amenity assignments can be reviewed or published.';
        }

        $draftCount = 0;
        $submittedCount = 0;
        $underReviewCount = 0;
        $needsInformationCount = 0;
        $approvedCount = 0;
        $rejectedCount = 0;
        $inactiveCount = 0;

        $countStatuses = static function (iterable $assignments) use (&$draftCount, &$submittedCount, &$underReviewCount, &$needsInformationCount, &$approvedCount, &$rejectedCount, &$inactiveCount): void {
            foreach ($assignments as $assignment) {
                /** @var PropertyAmenity|PropertyRoomTypeAmenity $assignment */
                match ($assignment->status) {
                    AmenityVerificationStatus::Draft => $draftCount++,
                    AmenityVerificationStatus::Submitted => $submittedCount++,
                    AmenityVerificationStatus::UnderReview => $underReviewCount++,
                    AmenityVerificationStatus::NeedsInformation => $needsInformationCount++,
                    AmenityVerificationStatus::Approved => $approvedCount++,
                    AmenityVerificationStatus::Rejected => $rejectedCount++,
                    AmenityVerificationStatus::Inactive => $inactiveCount++,
                };
            }
        };

        $countStatuses($propertyAssignments);
        $countStatuses($roomTypeAssignments);

        $pendingReviewCount = $submittedCount + $underReviewCount;
        $hasNeedsInformation = $needsInformationCount > 0;

        if ($hasNeedsInformation) {
            $missingRequirements[] = 'Provide requested information for amenity assignments marked Needs Information.';
            $adminMissingApprovals[] = 'Some amenity assignments require partner information before approval.';
        }

        if ($pendingReviewCount > 0) {
            $adminMissingApprovals[] = sprintf(
                'Review and decide all amenity assignments awaiting verification (%d pending).',
                $pendingReviewCount,
            );
        }

        $assignmentIntegrityIssues = [];
        foreach ($propertyAssignments as $assignment) {
            $amenity = $assignment->amenity;
            if (! $amenity instanceof Amenity || ! $amenity->applicability_scope->appliesToProperty()) {
                $assignmentIntegrityIssues[] = sprintf('Property assignment #%d uses an amenity not applicable to properties.', $assignment->id);
            }
        }

        foreach ($roomTypeAssignments as $assignment) {
            $amenity = $assignment->amenity;
            if (! $amenity instanceof Amenity || ! $amenity->applicability_scope->appliesToRoomType()) {
                $assignmentIntegrityIssues[] = sprintf('Room-type assignment #%d uses an amenity not applicable to room types.', $assignment->id);
            }
            $roomType = $assignment->roomType;
            if (! $roomType instanceof PropertyRoomType || $roomType->property_id !== $property->id) {
                $assignmentIntegrityIssues[] = sprintf('Room-type assignment #%d is not linked to a valid room type for this property.', $assignment->id);
            }
        }

        foreach ($assignmentIntegrityIssues as $issue) {
            $missingRequirements[] = $issue;
            $adminMissingApprovals[] = $issue;
        }

        $readyForSubmission = $ownerActive
            && $propertyApproved
            && $missingRequirements === []
            && ($propertyAssignments->isNotEmpty() || $roomTypeAssignments->isNotEmpty());

        $readyForAdminApproval = $ownerActive
            && $propertyApproved
            && $assignmentIntegrityIssues === []
            && $pendingReviewCount === 0
            && $needsInformationCount === 0
            && $approvedCount > 0;

        return [
            'owner_active' => $ownerActive,
            'property_approved' => $propertyApproved,
            'applicable_property_amenities_count' => $applicablePropertyAmenityCount,
            'active_room_types_count' => $activeRoomTypes->count(),
            'property_assignments_count' => $propertyAssignments->count(),
            'room_type_assignments_count' => $roomTypeAssignments->count(),
            'approved_count' => $approvedCount,
            'pending_review_count' => $pendingReviewCount,
            'needs_information_count' => $needsInformationCount,
            'rejected_count' => $rejectedCount,
            'inactive_count' => $inactiveCount,
            'draft_count' => $draftCount,
            'missing_requirements' => array_values(array_unique($missingRequirements)),
            'admin_missing_approvals' => array_values(array_unique($adminMissingApprovals)),
            'ready_for_submission' => $readyForSubmission,
            'ready_for_admin_approval' => $readyForAdminApproval,
        ];
    }
}
