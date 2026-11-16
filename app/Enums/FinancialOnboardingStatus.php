<?php

declare(strict_types=1);

namespace App\Enums;

enum FinancialOnboardingStatus: string
{
    case NotStarted = 'not_started';
    case DetailsRequired = 'details_required';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case Active = 'active';
    case Rejected = 'rejected';
    case Suspended = 'suspended';

    public function label(): string
    {
        return match ($this) {
            self::NotStarted => 'Not Started',
            self::DetailsRequired => 'Details Required',
            self::Submitted => 'Submitted',
            self::UnderReview => 'Under Review',
            self::Active => 'Active & Verified',
            self::Rejected => 'Rejected',
            self::Suspended => 'Suspended',
        };
    }

    public function isSettlementEligible(): bool
    {
        return $this === self::Active;
    }
}
