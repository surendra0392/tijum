<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyVerificationEventType: string
{
    case DraftCreated = 'draft_created';
    case PropertyUpdated = 'property_updated';
    case RoomTypeAdded = 'room_type_added';
    case RoomTypeUpdated = 'room_type_updated';
    case RoomTypeDeactivated = 'room_type_deactivated';
    case RoomAdded = 'room_added';
    case RoomUpdated = 'room_updated';
    case RoomStatusChanged = 'room_status_changed';
    case MediaUploaded = 'media_uploaded';
    case MediaUpdated = 'media_updated';
    case MediaReordered = 'media_reordered';
    case MediaApproved = 'media_approved';
    case MediaRejected = 'media_rejected';
    case MediaPublished = 'media_published';
    case MediaUnpublished = 'media_unpublished';
    case MediaRemoved = 'media_removed';
    case DocumentUploaded = 'document_uploaded';
    case DocumentReplaced = 'document_replaced';
    case DocumentDeleted = 'document_deleted';
    case DocumentReviewed = 'document_reviewed';
    case ApplicationSubmitted = 'application_submitted';
    case ApplicationResubmitted = 'application_resubmitted';
    case ReviewerAssigned = 'reviewer_assigned';
    case ReviewStarted = 'review_started';
    case InformationRequested = 'information_requested';
    case ApplicationApproved = 'application_approved';
    case ApplicationRejected = 'application_rejected';
    case ApplicationWithdrawn = 'application_withdrawn';
    case AmendmentStarted = 'amendment_started';
    case AmendmentUpdated = 'amendment_updated';
    case AmendmentCancelled = 'amendment_cancelled';
    case AmendmentPromoted = 'amendment_promoted';
    case PropertyOperationalStatusChanged = 'property_operational_status_changed';
    case PropertySuspended = 'property_suspended';
    case PropertyReinstated = 'property_reinstated';
    case DocumentViewed = 'document_viewed';
    case DocumentDownloaded = 'document_downloaded';

    public function label(): string
    {
        return match ($this) {
            self::DraftCreated => 'Property Draft Created',
            self::PropertyUpdated => 'Property Details Updated',
            self::RoomTypeAdded => 'Room Type Added',
            self::RoomTypeUpdated => 'Room Type Updated',
            self::RoomTypeDeactivated => 'Room Type Deactivated',
            self::RoomAdded => 'Physical Room Added',
            self::RoomUpdated => 'Physical Room Updated',
            self::RoomStatusChanged => 'Room Operational Status Updated',
            self::MediaUploaded => 'Photograph Uploaded to Private Storage',
            self::MediaUpdated => 'Photograph Metadata Updated',
            self::MediaReordered => 'Photograph Order Updated',
            self::MediaApproved => 'Photograph Moderation Approved',
            self::MediaRejected => 'Photograph Moderation Rejected',
            self::MediaPublished => 'Photograph Published to Public Disk',
            self::MediaUnpublished => 'Photograph Unpublished from Public Disk',
            self::MediaRemoved => 'Photograph Removed',
            self::DocumentUploaded => 'Verification Document Uploaded',
            self::DocumentReplaced => 'Verification Document Replaced',
            self::DocumentDeleted => 'Verification Document Removed',
            self::DocumentReviewed => 'Verification Document Reviewed',
            self::ApplicationSubmitted => 'Property Verification Submitted',
            self::ApplicationResubmitted => 'Property Verification Resubmitted',
            self::ReviewerAssigned => 'Reviewer Assigned',
            self::ReviewStarted => 'Verification Review Started',
            self::InformationRequested => 'Additional Information Requested',
            self::ApplicationApproved => 'Property Verification Approved',
            self::ApplicationRejected => 'Property Verification Rejected',
            self::ApplicationWithdrawn => 'Property Verification Withdrawn',
            self::AmendmentStarted => 'Re-Verification Amendment Started',
            self::AmendmentUpdated => 'Amendment Draft Updated',
            self::AmendmentCancelled => 'Re-Verification Amendment Cancelled',
            self::AmendmentPromoted => 'Approved Amendment Promoted',
            self::PropertyOperationalStatusChanged => 'Operational Status Changed',
            self::PropertySuspended => 'Property Suspended by Administration',
            self::PropertyReinstated => 'Property Reinstated',
            self::DocumentViewed => 'Document Viewed by Admin',
            self::DocumentDownloaded => 'Document Downloaded by Admin',
        };
    }

    public function isVisibleToOwner(): bool
    {
        return ! in_array($this, [self::DocumentViewed, self::DocumentDownloaded], true);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $type): string => $type->value,
            self::cases(),
        );
    }
}
