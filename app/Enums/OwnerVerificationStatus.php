<?php

declare(strict_types=1);

namespace App\Enums;

enum OwnerVerificationStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case NeedsInformation = 'needs_information';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Submitted => 'Submitted',
            self::UnderReview => 'Under Review',
            self::NeedsInformation => 'Needs Information',
            self::Approved => 'Approved',
            self::Rejected => 'Rejected',
            self::Withdrawn => 'Withdrawn',
        };
    }

    public function isActive(): bool
    {
        return match ($this) {
            self::Draft,
            self::Submitted,
            self::UnderReview,
            self::NeedsInformation => true,
            self::Approved,
            self::Rejected,
            self::Withdrawn => false,
        };
    }

    public function isTerminal(): bool
    {
        return ! $this->isActive();
    }

    public function isEditableByOwner(): bool
    {
        return in_array($this, [self::Draft, self::NeedsInformation], true);
    }

    public function canSubmitByOwner(): bool
    {
        return in_array($this, [self::Draft, self::NeedsInformation], true);
    }

    public function canWithdrawByOwner(): bool
    {
        return $this->isActive();
    }

    public function canAssignReviewer(): bool
    {
        return in_array($this, [self::Submitted, self::UnderReview, self::NeedsInformation], true);
    }

    public function canStartReview(): bool
    {
        return $this === self::Submitted;
    }

    public function canRequestInformation(): bool
    {
        return in_array($this, [self::Submitted, self::UnderReview], true);
    }

    public function canApprove(): bool
    {
        return $this === self::UnderReview;
    }

    public function canReject(): bool
    {
        return in_array($this, [self::Submitted, self::UnderReview, self::NeedsInformation], true);
    }

    /**
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Draft => [self::Submitted, self::Withdrawn],
            self::Submitted => [self::UnderReview, self::NeedsInformation, self::Rejected, self::Withdrawn],
            self::UnderReview => [self::Approved, self::NeedsInformation, self::Rejected, self::Withdrawn],
            self::NeedsInformation => [self::Submitted, self::Rejected, self::Withdrawn],
            self::Approved,
            self::Rejected,
            self::Withdrawn => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
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
}
