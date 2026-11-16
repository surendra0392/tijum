<?php

declare(strict_types=1);

namespace App\Enums;

enum PointsTransactionType: string
{
    case BookingEarned = 'booking_earned';
    case ReferralBonusReferrer = 'referral_bonus_referrer';
    case ReferralBonusReferred = 'referral_bonus_referred';
    case PromotionalBonus = 'promotional_bonus';
    case BookingRedeemed = 'booking_redeemed';
    case AdminAdjustment = 'admin_adjustment';
    case PointsExpired = 'points_expired';
    case PointsReversed = 'points_reversed';

    public function label(): string
    {
        return match ($this) {
            self::BookingEarned => 'Booking Reward Earned',
            self::ReferralBonusReferrer => 'Referral Bonus (Referrer)',
            self::ReferralBonusReferred => 'Referral Welcome Bonus',
            self::PromotionalBonus => 'Promotional Coupon Bonus',
            self::BookingRedeemed => 'Redeemed on Booking',
            self::AdminAdjustment => 'Administrative Adjustment',
            self::PointsExpired => 'Points Expired',
            self::PointsReversed => 'Points Reversed / Refunded',
        };
    }

    public function isCredit(): bool
    {
        return in_array($this, [
            self::BookingEarned,
            self::ReferralBonusReferrer,
            self::ReferralBonusReferred,
            self::PromotionalBonus,
            self::PointsReversed,
        ], true);
    }

    public function isDebit(): bool
    {
        return in_array($this, [
            self::BookingRedeemed,
            self::PointsExpired,
        ], true);
    }
}
