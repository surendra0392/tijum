<?php

declare(strict_types=1);

namespace App\Services\Promotions;

use App\Enums\CouponFundingSource;
use App\Models\CouponCode;
use App\Models\Property;
use App\Models\Reservation;
use App\Models\User;
use App\Services\Rewards\LoyaltyPointsService;

class CentralPromotionEngine
{
    public function __construct(
        private readonly CouponValidationService $couponService,
        private readonly LoyaltyPointsService $pointsService,
    ) {}

    /**
     * Compute authoritative pricing with coupon and loyalty points breakdown.
     *
     * @return array{
     *     subtotal_minor: int,
     *     coupon_applied: bool,
     *     coupon_code: string|null,
     *     coupon_offer_type: string|null,
     *     coupon_discount_minor: int,
     *     coupon_funding_source: string|null,
     *     coupon_platform_share_minor: int,
     *     coupon_property_share_minor: int,
     *     coupon_bonus_points: int,
     *     tax_minor: int,
     *     points_available: int,
     *     points_max_redeemable: int,
     *     points_redeemed: int,
     *     points_discount_minor: int,
     *     total_payable_minor: int,
     *     points_potential_earned: int,
     *     owner_settlement_protected: bool,
     *     is_valid: bool,
     *     error: string|null,
     *     messages: list<string>,
     * }
     */
    public function calculate(
        User $user,
        Property $property,
        int $subtotalMinor,
        int $taxMinor = 0,
        ?string $couponCode = null,
        int $pointsToRedeem = 0,
        int $stayDays = 1,
        ?Reservation $reservation = null,
    ): array {
        $messages = [];
        $error = null;
        $isValid = true;

        $couponApplied = false;
        $appliedCoupon = null;
        $couponDiscountMinor = 0;
        $couponFundingSource = null;
        $couponPlatformShare = 0;
        $couponPropertyShare = 0;
        $couponBonusPoints = 0;

        // 1. Coupon Discount Calculation
        if ($couponCode !== null && trim($couponCode) !== '') {
            $validation = $this->couponService->validate(
                code: $couponCode,
                user: $user,
                property: $property,
                bookingSubtotalMinor: $subtotalMinor,
                stayDays: $stayDays,
                reservation: $reservation,
            );

            if ($validation['is_valid'] && $validation['coupon'] instanceof CouponCode) {
                $couponApplied = true;
                $appliedCoupon = $validation['coupon'];
                $couponDiscountMinor = $validation['discount_amount_minor'];
                $couponFundingSource = $validation['funding_source'] instanceof CouponFundingSource ? $validation['funding_source']->value : CouponFundingSource::Platform->value;
                $couponPlatformShare = $validation['platform_funded_amount_minor'];
                $couponPropertyShare = $validation['property_funded_amount_minor'];
                $couponBonusPoints = $validation['bonus_points'];

                $discountInr = number_format($couponDiscountMinor / 100, 2);
                $messages[] = "Coupon '{$appliedCoupon->code}' applied: ₹{$discountInr} discount.";
                if ($couponBonusPoints > 0) {
                    $messages[] = "+{$couponBonusPoints} bonus loyalty points will be awarded upon checkout.";
                }
            } else {
                $isValid = false;
                $error = $validation['error'];
                $messages[] = (string) $validation['error'];
            }
        }

        $subtotalAfterCoupon = max(0, $subtotalMinor - $couponDiscountMinor);
        $totalBeforePoints = $subtotalAfterCoupon + $taxMinor;

        // 2. Loyalty Points Redemption Calculation
        $wallet = $this->pointsService->getOrCreateWallet($user);
        $pointsAvailable = $wallet->available_points;
        $maxRedeemable = $this->pointsService->getMaxRedeemablePoints($user, $totalBeforePoints);

        $validatedPointsToRedeem = 0;
        $pointsDiscountMinor = 0;

        if ($pointsToRedeem > 0) {
            if ($pointsToRedeem > $maxRedeemable) {
                $validatedPointsToRedeem = $maxRedeemable;
                $messages[] = "Points redemption adjusted to maximum allowed: {$maxRedeemable} points.";
            } else {
                $validatedPointsToRedeem = $pointsToRedeem;
            }

            $pointsDiscountMinor = min(
                $this->pointsService->convertPointsToInrMinor($validatedPointsToRedeem),
                $totalBeforePoints,
            );

            $ptsDiscountInr = number_format($pointsDiscountMinor / 100, 2);
            $messages[] = "Redeemed {$validatedPointsToRedeem} points for ₹{$ptsDiscountInr} discount.";
        }

        // 3. Final Payable
        $finalPayableMinor = max(0, $totalBeforePoints - $pointsDiscountMinor);

        // 4. Potential Loyalty Points Earned for Booking
        $potentialPointsEarned = $this->pointsService->calculatePointsEarnedForBooking($subtotalMinor) + $couponBonusPoints;

        return [
            'subtotal_minor' => $subtotalMinor,
            'coupon_applied' => $couponApplied,
            'coupon_code' => $appliedCoupon !== null ? $appliedCoupon->code : null,
            'coupon_offer_type' => $appliedCoupon !== null ? $appliedCoupon->offer_type->value : null,
            'coupon_discount_minor' => $couponDiscountMinor,
            'coupon_funding_source' => $couponFundingSource,
            'coupon_platform_share_minor' => $couponPlatformShare,
            'coupon_property_share_minor' => $couponPropertyShare,
            'coupon_bonus_points' => $couponBonusPoints,
            'tax_minor' => $taxMinor,
            'points_available' => $pointsAvailable,
            'points_max_redeemable' => $maxRedeemable,
            'points_redeemed' => $validatedPointsToRedeem,
            'points_discount_minor' => $pointsDiscountMinor,
            'total_payable_minor' => $finalPayableMinor,
            'points_potential_earned' => $potentialPointsEarned,
            'owner_settlement_protected' => true,
            'is_valid' => $isValid,
            'error' => $error,
            'messages' => $messages,
        ];
    }
}
