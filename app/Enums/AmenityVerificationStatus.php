<?php

declare(strict_types=1);

namespace App\Enums;

enum AmenityVerificationStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case NeedsInformation = 'needs_information';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Inactive = 'inactive';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Submitted => 'Submitted',
            self::UnderReview => 'Under Review',
            self::NeedsInformation => 'Needs Information',
            self::Approved => 'Approved',
            self::Rejected => 'Rejected',
            self::Inactive => 'Inactive',
        };
    }

    public function isEditableByOwner(): bool
    {
        return in_array($this, [self::Draft, self::NeedsInformation, self::Rejected], true);
    }

    public function canSubmitByOwner(): bool
    {
        return in_array($this, [self::Draft, self::NeedsInformation, self::Rejected], true);
    }

    public function isInReview(): bool
    {
        return in_array($this, [self::Submitted, self::UnderReview], true);
    }

    public function canApprove(): bool
    {
        return $this === self::UnderReview;
    }

    public function canReject(): bool
    {
        return $this === self::UnderReview;
    }

    public function canRequestInformation(): bool
    {
        return in_array($this, [self::Submitted, self::UnderReview], true);
    }

    public function canStartReview(): bool
    {
        return $this === self::Submitted;
    }

    public function isActiveOffer(): bool
    {
        return $this === self::Approved;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(
            static fn (self $status): string => $status->value,
            self::cases(),
        );
    }

    /**
     * @return list<string>
     */
    public static function awaitingReviewValues(): array
    {
        return [self::Submitted->value, self::UnderReview->value];
    }
}
