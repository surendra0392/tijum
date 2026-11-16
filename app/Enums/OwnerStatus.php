<?php

declare(strict_types=1);

namespace App\Enums;

enum OwnerStatus: string
{
    case PendingVerification = 'pending_verification';
    case PendingReview = 'pending_review';
    case Active = 'active';
    case Rejected = 'rejected';
    case Suspended = 'suspended';

    public function label(): string
    {
        return match ($this) {
            self::PendingVerification => 'Pending Email Verification',
            self::PendingReview => 'Pending Review',
            self::Active => 'Active',
            self::Rejected => 'Rejected',
            self::Suspended => 'Suspended',
        };
    }

    public function canSignIn(): bool
    {
        return match ($this) {
            self::PendingVerification, self::PendingReview, self::Active => true,
            self::Rejected, self::Suspended => false,
        };
    }

    public function canPublishProperties(): bool
    {
        return $this === self::Active;
    }

    public function accessDeniedMessage(): string
    {
        return match ($this) {
            self::Rejected => 'Your partner application has been rejected. Contact TIJUM partner support for further details.',
            self::Suspended => 'Your partner account has been suspended. Contact TIJUM partner support for assistance.',
            default => 'Your partner account does not currently have portal access.',
        };
    }
}
