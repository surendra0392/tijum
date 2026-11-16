<?php

declare(strict_types=1);

namespace App\Enums;

enum ReferralStatus: string
{
    case PendingRegistration = 'pending_registration';
    case Registered = 'registered';
    case Qualified = 'qualified';
    case RewardCredited = 'reward_credited';
    case Disqualified = 'disqualified';

    public function label(): string
    {
        return match ($this) {
            self::PendingRegistration => 'Invite Link Visited',
            self::Registered => 'Registered / Awaiting First Completed Stay',
            self::Qualified => 'Qualified (Stay Completed)',
            self::RewardCredited => 'Rewards Credited',
            self::Disqualified => 'Disqualified / Fraud Policy Action',
        };
    }

    public function isSuccess(): bool
    {
        return in_array($this, [self::Qualified, self::RewardCredited], true);
    }
}
