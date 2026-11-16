<?php

declare(strict_types=1);

namespace App\Enums;

enum CouponOfferType: string
{
    case FixedAmount = 'fixed_amount';
    case Percentage = 'percentage';
    case PointsReward = 'points_reward';
    case Combined = 'combined';

    public function label(): string
    {
        return match ($this) {
            self::FixedAmount => 'Fixed Discount (₹)',
            self::Percentage => 'Percentage Discount (%)',
            self::PointsReward => 'Points Reward Only',
            self::Combined => 'Discount + Points Bonus',
        };
    }

    public function providesDiscount(): bool
    {
        return in_array($this, [self::FixedAmount, self::Percentage, self::Combined], true);
    }

    public function providesPoints(): bool
    {
        return in_array($this, [self::PointsReward, self::Combined], true);
    }
}
