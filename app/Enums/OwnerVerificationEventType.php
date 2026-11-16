<?php

declare(strict_types=1);

namespace App\Enums;

enum OwnerVerificationEventType: string
{
    case ApplicationCreated = 'application_created';
    case BusinessProfileSaved = 'business_profile_saved';
    case OperatingCitiesUpdated = 'operating_cities_updated';
    case DocumentUploaded = 'document_uploaded';
    case DocumentReplaced = 'document_replaced';
    case DocumentDeleted = 'document_deleted';
    case ApplicationSubmitted = 'application_submitted';
    case ApplicationResubmitted = 'application_resubmitted';
    case ReviewerAssigned = 'reviewer_assigned';
    case ReviewStarted = 'review_started';
    case InformationRequested = 'information_requested';
    case ApplicationApproved = 'application_approved';
    case ApplicationRejected = 'application_rejected';
    case ApplicationWithdrawn = 'application_withdrawn';
    case DocumentViewed = 'document_viewed';
    case DocumentDownloaded = 'document_downloaded';

    public function label(): string
    {
        return match ($this) {
            self::ApplicationCreated => 'Application Created',
            self::BusinessProfileSaved => 'Business Profile Saved',
            self::OperatingCitiesUpdated => 'Operating Cities Updated',
            self::DocumentUploaded => 'Document Uploaded',
            self::DocumentReplaced => 'Document Replaced',
            self::DocumentDeleted => 'Document Removed',
            self::ApplicationSubmitted => 'Application Submitted',
            self::ApplicationResubmitted => 'Application Resubmitted',
            self::ReviewerAssigned => 'Reviewer Assigned',
            self::ReviewStarted => 'Review Started',
            self::InformationRequested => 'Additional Information Requested',
            self::ApplicationApproved => 'Application Approved',
            self::ApplicationRejected => 'Application Rejected',
            self::ApplicationWithdrawn => 'Application Withdrawn',
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
