<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Services\Rewards\LoyaltyPointsService;
use App\Services\Rewards\ReferralService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class QualifyPendingRewardsCommand extends Command
{
    protected $signature = 'tijum:rewards:qualify-pending';

    protected $description = 'Qualify pending booking loyalty points and customer referrals upon completed stay';

    public function handle(
        LoyaltyPointsService $pointsService,
        ReferralService $referralService,
    ): int {
        $today = CarbonImmutable::now('Asia/Kolkata')->toDateString();

        $completedReservations = Reservation::query()
            ->where('status', ReservationStatus::Confirmed)
            ->whereDate('checkout_date', '<=', $today)
            ->where(function ($sub) {
                $sub->where(function ($q) {
                    $q->where('points_awarded_potential', '>', 0)
                        ->where('points_awarded_credited', 0);
                })
                    ->orWhereHas('user.referralReceived', function ($rq) {
                        $rq->where('status', 'registered');
                    });
            })
            ->get();

        $pointsActivated = 0;
        $referralsQualified = 0;

        foreach ($completedReservations as $reservation) {
            // 1. Activate pending booking points
            if ($reservation->points_awarded_potential > 0 && $reservation->points_awarded_credited === 0) {
                $activated = $pointsService->activatePendingPoints($reservation);
                if ($activated !== null) {
                    $pointsActivated++;
                }
            }

            // 2. Qualify referral rewards
            $qualifiedRef = $referralService->qualifyReferralOnCompletedStay($reservation);
            if ($qualifiedRef !== null) {
                $referralsQualified++;
            }
        }

        $this->info("Qualified {$pointsActivated} pending points rewards and {$referralsQualified} referral completions.");

        return self::SUCCESS;
    }
}
