<?php

declare(strict_types=1);

namespace App\Enums;

enum ReviewReportStatus: string
{
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case ActionTaken = 'action_taken';
    case NoViolationFound = 'no_violation_found';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Submitted => 'Report Submitted',
            self::UnderReview => 'Under Investigation',
            self::ActionTaken => 'Action Taken (Content Moderated)',
            self::NoViolationFound => 'No Violation Found (Review Retained)',
            self::Closed => 'Report Closed',
        };
    }

    public function isResolved(): bool
    {
        return in_array($this, [self::ActionTaken, self::NoViolationFound, self::Closed], true);
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $status): string => $status->value, self::cases());
    }
}
