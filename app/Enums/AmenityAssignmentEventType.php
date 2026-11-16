<?php

declare(strict_types=1);

namespace App\Enums;

enum AmenityAssignmentEventType: string
{
    case Created = 'created';
    case Updated = 'updated';
    case Submitted = 'submitted';
    case Resubmitted = 'resubmitted';
    case ReviewStarted = 'review_started';
    case InformationRequested = 'information_requested';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Inactivated = 'inactivated';
    case RevisionCreated = 'revision_created';
    case RevisionApproved = 'revision_approved';
    case RevisionSuperseded = 'revision_superseded';

    public function label(): string
    {
        return match ($this) {
            self::Created => 'Created',
            self::Updated => 'Updated',
            self::Submitted => 'Submitted',
            self::Resubmitted => 'Resubmitted',
            self::ReviewStarted => 'Review started',
            self::InformationRequested => 'Information requested',
            self::Approved => 'Approved',
            self::Rejected => 'Rejected',
            self::Inactivated => 'Inactivated',
            self::RevisionCreated => 'Revision created',
            self::RevisionApproved => 'Revision approved',
            self::RevisionSuperseded => 'Revision superseded',
        };
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
