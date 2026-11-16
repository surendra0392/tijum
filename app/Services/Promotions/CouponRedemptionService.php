<?php

declare(strict_types=1);

namespace App\Services\Promotions;

use App\Models\CouponCode;
use App\Models\CouponHold;
use App\Models\CouponRedemption;
use App\Models\Reservation;
use App\Models\RewardsSetting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class CouponRedemptionService
{
    /**
     * Create a 15-minute row-locked checkout reservation hold.
     */
    public function createHold(
        CouponCode $coupon,
        User $user,
        int $discountAmountMinor,
        ?Reservation $reservation = null,
    ): CouponHold {
        return DB::transaction(function () use ($coupon, $user, $discountAmountMinor, $reservation): CouponHold {
            /** @var CouponCode $lockedCoupon */
            $lockedCoupon = CouponCode::query()->lockForUpdate()->findOrFail($coupon->id);

            // Re-check global limit inside transaction lock
            if ($lockedCoupon->total_usage_limit !== null && $lockedCoupon->total_used_count >= $lockedCoupon->total_usage_limit) {
                throw new RuntimeException('Coupon has reached its maximum usage limit.');
            }

            // Release any existing active hold for this user & coupon
            CouponHold::query()
                ->where('coupon_code_id', $lockedCoupon->id)
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->update(['status' => 'released']);

            $holdDuration = (int) RewardsSetting::get('hold_duration_minutes', 15);
            $holdRef = 'HLD-CPN-'.strtoupper(Str::random(10));

            return CouponHold::create([
                'coupon_code_id' => $lockedCoupon->id,
                'user_id' => $user->id,
                'reservation_id' => $reservation?->id,
                'hold_reference' => $holdRef,
                'discount_amount_minor' => $discountAmountMinor,
                'expires_at' => CarbonImmutable::now()->addMinutes($holdDuration),
                'status' => 'active',
            ]);
        });
    }

    /**
     * Commit the coupon hold upon successful payment capture.
     */
    public function commitHold(CouponHold $hold, Reservation $reservation): CouponRedemption
    {
        return DB::transaction(function () use ($hold, $reservation): CouponRedemption {
            /** @var CouponHold $lockedHold */
            $lockedHold = CouponHold::query()->lockForUpdate()->findOrFail($hold->id);

            if ($lockedHold->status === 'committed') {
                /** @var CouponRedemption $existing */
                $existing = CouponRedemption::query()->where('reservation_id', $reservation->id)->firstOrFail();

                return $existing;
            }

            /** @var CouponCode $lockedCoupon */
            $lockedCoupon = CouponCode::query()->lockForUpdate()->findOrFail($lockedHold->coupon_code_id);

            // Calculate funding shares
            $discountAmount = $lockedHold->discount_amount_minor;
            $propertyShare = (int) ($reservation->coupon_property_share_minor ?? 0);
            $platformShare = max(0, $discountAmount - $propertyShare);

            // Increment usage count
            $lockedCoupon->increment('total_used_count');

            // Update campaign spent budget if applicable
            if ($lockedCoupon->campaign_id > 0 && $platformShare > 0) {
                $lockedCoupon->campaign()->increment('spent_minor', $platformShare);
            }

            // Mark hold committed
            $lockedHold->update([
                'status' => 'committed',
                'reservation_id' => $reservation->id,
            ]);

            return CouponRedemption::create([
                'coupon_code_id' => $lockedCoupon->id,
                'user_id' => $lockedHold->user_id,
                'reservation_id' => $reservation->id,
                'discount_amount_minor' => $discountAmount,
                'platform_funded_amount_minor' => $platformShare,
                'property_funded_amount_minor' => $propertyShare,
                'bonus_points_awarded' => $lockedCoupon->bonus_points,
                'redeemed_at' => CarbonImmutable::now(),
            ]);
        });
    }

    /**
     * Release an active hold (e.g. checkout abandoned or expired).
     */
    public function releaseHold(CouponHold|int $hold): void
    {
        $id = $hold instanceof CouponHold ? $hold->id : $hold;

        DB::transaction(function () use ($id): void {
            /** @var CouponHold|null $lockedHold */
            $lockedHold = CouponHold::query()->lockForUpdate()->find($id);

            if ($lockedHold !== null && $lockedHold->status === 'active') {
                $lockedHold->update(['status' => 'released']);
            }
        });
    }

    /**
     * Revert a redemption on reservation cancellation.
     */
    public function revertRedemption(CouponRedemption $redemption, string $reason): void
    {
        DB::transaction(function () use ($redemption, $reason): void {
            /** @var CouponRedemption $lockedRedemption */
            $lockedRedemption = CouponRedemption::query()->lockForUpdate()->findOrFail($redemption->id);

            if ($lockedRedemption->is_reverted) {
                return;
            }

            /** @var CouponCode $lockedCoupon */
            $lockedCoupon = CouponCode::query()->lockForUpdate()->findOrFail($lockedRedemption->coupon_code_id);

            if ($lockedCoupon->total_used_count > 0) {
                $lockedCoupon->decrement('total_used_count');
            }

            if ($lockedCoupon->campaign_id > 0 && $lockedRedemption->platform_funded_amount_minor > 0) {
                $campaign = $lockedCoupon->campaign()->lockForUpdate()->first();
                if ($campaign && $campaign->spent_minor >= $lockedRedemption->platform_funded_amount_minor) {
                    $campaign->decrement('spent_minor', $lockedRedemption->platform_funded_amount_minor);
                }
            }

            $lockedRedemption->update([
                'is_reverted' => true,
                'reverted_at' => CarbonImmutable::now(),
                'reversion_reason' => $reason,
            ]);
        });
    }
}
