<?php

declare(strict_types=1);

namespace App\Enums;

enum RelocationSubsidyStatus: string
{
    case Calculated = 'calculated';
    case PendingApproval = 'pending_approval';
    case Approved = 'approved';
    case FundingPending = 'funding_pending';
    case Funded = 'funded';
    case Failed = 'failed';
    case OnHold = 'on_hold';

    public function label(): string
    {
        return match ($this) {
            self::Calculated => 'Calculated',
            self::PendingApproval => 'Pending Finance Approval',
            self::Approved => 'Approved by Finance',
            self::FundingPending => 'Funding Pending',
            self::Funded => 'Funded by Platform',
            self::Failed => 'Funding Failed',
            self::OnHold => 'On Operational Hold',
        };
    }
}
