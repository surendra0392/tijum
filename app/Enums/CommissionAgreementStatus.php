<?php

declare(strict_types=1);

namespace App\Enums;

enum CommissionAgreementStatus: string
{
    case Draft = 'draft';
    case PendingAcceptance = 'pending_acceptance';
    case Active = 'active';
    case Superseded = 'superseded';
    case Terminated = 'terminated';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::PendingAcceptance => 'Pending Partner Acceptance',
            self::Active => 'Active & Accepted',
            self::Superseded => 'Superseded',
            self::Terminated => 'Terminated',
        };
    }

    public function isActionableForBooking(): bool
    {
        return $this === self::Active;
    }
}
