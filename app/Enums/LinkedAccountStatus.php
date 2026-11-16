<?php

declare(strict_types=1);

namespace App\Enums;

enum LinkedAccountStatus: string
{
    case Uncreated = 'uncreated';
    case Created = 'created';
    case UnderReview = 'under_review';
    case Active = 'active';
    case Suspended = 'suspended';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Uncreated => 'Not Created',
            self::Created => 'Created',
            self::UnderReview => 'Under Provider Review',
            self::Active => 'Active',
            self::Suspended => 'Suspended',
            self::Rejected => 'Rejected',
        };
    }

    public function canReceiveTransfers(): bool
    {
        return $this === self::Active;
    }
}
