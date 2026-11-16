<?php

declare(strict_types=1);

namespace App\Services\Promotions;

use App\Enums\CouponFundingSource;
use App\Enums\CouponOfferType;
use App\Models\CouponCode;
use App\Models\CouponHold;
use App\Models\CouponRedemption;
use App\Models\Property;
use App\Models\Reservation;
use App\Models\User;
use Carbon\CarbonImmutable;

class CouponValidationService
{
    /**
     * @return array{
     *     is_valid: bool,
     *     error: string|null,
     *     coupon: CouponCode|null,
     *     discount_amount_minor: int,
     *     bonus_points: int,
     *     funding_source: CouponFundingSource|null,
     *     platform_funded_amount_minor: int,
     *     property_funded_amount_minor: int,
     * }
     */
    public function validate(
        string $code,
        User $user,
        Property $property,
        int $bookingSubtotalMinor,
        int $stayDays = 1,
        ?Reservation $reservation = null,
    ): array {
        $normalizedCode = strtoupper(trim($code));

        /** @var CouponCode|null $coupon */
        $coupon = CouponCode::query()
            ->with('campaign')
            ->where('code', $normalizedCode)
            ->first();

        if ($coupon === null) {
            return $this->invalid('Invalid coupon code.');
        }

        if (! $coupon->is_active) {
            return $this->invalid('This coupon code is currently disabled.');
        }

        $now = CarbonImmutable::now();

        if ($coupon->starts_at && $now->lessThan($coupon->starts_at)) {
            return $this->invalid('This coupon is not active yet.');
        }

        if ($coupon->expires_at && $now->greaterThan($coupon->expires_at)) {
            return $this->invalid('This coupon has expired.');
        }

        // Campaign availability check
        if (! $coupon->campaign->isAvailable()) {
            return $this->invalid('This promotional campaign is no longer available.');
        }

        // Global usage limit check
        if ($coupon->total_usage_limit !== null && $coupon->total_used_count >= $coupon->total_usage_limit) {
            return $this->invalid('This coupon has reached its maximum redemption limit.');
        }

        // Per-user usage limit check (completed redemptions + active holds)
        $userRedemptionsCount = CouponRedemption::query()
            ->where('coupon_code_id', $coupon->id)
            ->where('user_id', $user->id)
            ->where('is_reverted', false)
            ->count();

        $activeHoldsCount = CouponHold::query()
            ->where('coupon_code_id', $coupon->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('expires_at', '>', $now)
            ->when($reservation !== null, fn ($q) => $q->where('reservation_id', '!=', $reservation->id))
            ->count();

        if (($userRedemptionsCount + $activeHoldsCount) >= $coupon->per_user_limit) {
            return $this->invalid('You have already reached the maximum usage limit for this coupon.');
        }

        // Minimum booking value
        if ($bookingSubtotalMinor < $coupon->min_booking_amount_minor) {
            $minInr = number_format($coupon->min_booking_amount_minor / 100, 2);

            return $this->invalid("This coupon requires a minimum booking amount of ₹{$minInr}.");
        }

        // Minimum stay days
        if ($stayDays < $coupon->min_stay_days) {
            return $this->invalid("This coupon requires a minimum stay of {$coupon->min_stay_days} days.");
        }

        // First booking only check
        if ($coupon->first_booking_only) {
            $hasPreviousBookings = Reservation::query()
                ->where('user_id', $user->id)
                ->whereIn('status', ['confirmed', 'awaiting_payment'])
                ->when($reservation !== null, fn ($q) => $q->where('id', '!=', $reservation->id))
                ->exists();

            if ($hasPreviousBookings) {
                return $this->invalid('This coupon is valid only for your first booking on TIJUM.');
            }
        }

        // Property category restrictions
        if (! empty($coupon->applies_to_category_ids)) {
            if (! in_array($property->property_category_id, $coupon->applies_to_category_ids, true)) {
                return $this->invalid('This coupon is not valid for the selected accommodation category.');
            }
        }

        // City restrictions
        if (! empty($coupon->applies_to_city_ids)) {
            if (! in_array($property->city_id, $coupon->applies_to_city_ids, true)) {
                return $this->invalid('This coupon is not applicable in this city.');
            }
        }

        // Property restrictions
        if (! empty($coupon->applies_to_property_ids)) {
            if (! in_array($property->id, $coupon->applies_to_property_ids, true)) {
                return $this->invalid('This coupon is not valid for this specific property.');
            }
        }

        // Calculate discount
        $discountAmountMinor = 0;
        $bonusPoints = $coupon->bonus_points;

        if ($coupon->offer_type === CouponOfferType::FixedAmount) {
            $discountAmountMinor = min($coupon->discount_amount_minor, $bookingSubtotalMinor);
        } elseif ($coupon->offer_type === CouponOfferType::Percentage) {
            $calcDiscount = (int) round($bookingSubtotalMinor * ($coupon->discount_percentage / 100));
            if ($coupon->max_discount_amount_minor !== null && $coupon->max_discount_amount_minor > 0) {
                $calcDiscount = min($calcDiscount, $coupon->max_discount_amount_minor);
            }
            $discountAmountMinor = min($calcDiscount, $bookingSubtotalMinor);
        } elseif ($coupon->offer_type === CouponOfferType::Combined) {
            $calcDiscount = (int) round($bookingSubtotalMinor * ($coupon->discount_percentage / 100));
            if ($coupon->max_discount_amount_minor !== null && $coupon->max_discount_amount_minor > 0) {
                $calcDiscount = min($calcDiscount, $coupon->max_discount_amount_minor);
            }
            $discountAmountMinor = min($calcDiscount + $coupon->discount_amount_minor, $bookingSubtotalMinor);
        }

        // Calculate funding split
        $propertyShareMinor = 0;
        $platformShareMinor = $discountAmountMinor;

        if ($coupon->funding_source === CouponFundingSource::Property) {
            $propertyShareMinor = $discountAmountMinor;
            $platformShareMinor = 0;
        } elseif ($coupon->funding_source === CouponFundingSource::Split) {
            $propertyShareMinor = (int) round($discountAmountMinor * ($coupon->property_funding_percentage / 100));
            $platformShareMinor = max(0, $discountAmountMinor - $propertyShareMinor);
        }

        return [
            'is_valid' => true,
            'error' => null,
            'coupon' => $coupon,
            'discount_amount_minor' => $discountAmountMinor,
            'bonus_points' => $bonusPoints,
            'funding_source' => $coupon->funding_source,
            'platform_funded_amount_minor' => $platformShareMinor,
            'property_funded_amount_minor' => $propertyShareMinor,
        ];
    }

    /**
     * @return array{
     *     is_valid: false,
     *     error: string,
     *     coupon: null,
     *     discount_amount_minor: 0,
     *     bonus_points: 0,
     *     funding_source: null,
     *     platform_funded_amount_minor: 0,
     *     property_funded_amount_minor: 0,
     * }
     */
    private function invalid(string $message): array
    {
        return [
            'is_valid' => false,
            'error' => $message,
            'coupon' => null,
            'discount_amount_minor' => 0,
            'bonus_points' => 0,
            'funding_source' => null,
            'platform_funded_amount_minor' => 0,
            'property_funded_amount_minor' => 0,
        ];
    }
}
