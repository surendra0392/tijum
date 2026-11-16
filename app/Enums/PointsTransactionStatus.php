<?php

declare(strict_types=1);

namespace App\Enums;

enum PointsTransactionStatus: string
{
    case Pending = 'pending';
    case Available = 'available';
    case Reserved = 'reserved';
    case Redeemed = 'redeemed';
    case Expired = 'expired';
    case Reversed = 'reversed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending Verification / Stay Completion',
            self::Available => 'Available to Redeem',
            self::Reserved => 'Reserved in Checkout Hold',
            self::Redeemed => 'Redeemed',
            self::Expired => 'Expired',
            self::Reversed => 'Reversed / Cancelled',
        };
    }
}
