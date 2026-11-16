<?php

declare(strict_types=1);

namespace App\Services\Reviews;

use App\Enums\PaymentStatus;
use App\Enums\RelocationStatus;
use App\Enums\ReservationStatus;
use App\Models\Reservation;
use App\Models\ReservationRelocation;
use App\Models\User;
use App\Services\StayTimingPolicy;
use Carbon\CarbonImmutable;

class ReviewEligibilityService
{
    public function __construct(
        private readonly StayTimingPolicy $stayTiming,
    ) {}

    public function checkEligibility(Reservation $reservation, ?User $user = null): ReviewEligibilityResult
    {
        // 1. Authenticated customer ownership check
        if ($user !== null && (int) $reservation->user_id !== (int) $user->id) {
            return ReviewEligibilityResult::ineligible('Reservation does not belong to the authenticated customer.');
        }

        // 2. Already reviewed check (1 review per reservation)
        if ($reservation->review()->exists()) {
            return ReviewEligibilityResult::ineligible('A review has already been submitted for this reservation.');
        }

        // 3. Terminal or non-confirmed status check
        if (in_array($reservation->status, [ReservationStatus::Cancelled, ReservationStatus::Expired], true)) {
            return ReviewEligibilityResult::ineligible("Reservation is {$reservation->status->label()} and cannot be reviewed.");
        }

        // 4. Payment verification: captured payment is mandatory
        $hasCapturedPayment = $reservation->payments()
            ->where('status', PaymentStatus::Captured)
            ->exists();

        if (! $hasCapturedPayment) {
            return ReviewEligibilityResult::ineligible('A verified captured payment is required to submit a review.');
        }

        // 5. Relocation source check: original reservation cancelled via accepted relocation is ineligible
        $isSourceRelocation = ReservationRelocation::query()
            ->where('source_reservation_id', $reservation->id)
            ->where('status', RelocationStatus::Accepted)
            ->exists();

        if ($isSourceRelocation) {
            return ReviewEligibilityResult::ineligible('Original booking cancelled due to accepted alternative relocation is not eligible for accommodation review.');
        }

        // 6. Checkout time evaluation using canonical StayTimingPolicy (08:00 AM Asia/Kolkata)
        $tz = $this->stayTiming->timezone();
        $now = CarbonImmutable::now($tz);
        $checkoutTime = $this->stayTiming->getStandardCheckOutTime();
        $checkoutDateTime = CarbonImmutable::parse(
            $reservation->checkout_date->toDateString().' '.$checkoutTime,
            $tz
        );

        if ($now->lt($checkoutDateTime)) {
            return ReviewEligibilityResult::ineligible(
                "Review is available after scheduled checkout at {$checkoutTime} on {$reservation->checkout_date->format('d M Y')}.",
                $checkoutDateTime
            );
        }

        // 7. Submission window check (default 30 days post-checkout)
        $windowDays = (int) config('tijum.reviews.submission_window_days', 30);
        $windowDeadline = $checkoutDateTime->addDays($windowDays);

        if ($now->gt($windowDeadline)) {
            return ReviewEligibilityResult::ineligible(
                "The {$windowDays}-day review submission window has expired for this reservation.",
                $checkoutDateTime
            );
        }

        $daysRemaining = (int) max(0, $now->diffInDays($windowDeadline, false));

        return ReviewEligibilityResult::eligible(
            checkoutDateTime: $checkoutDateTime,
            windowDeadline: $windowDeadline,
            daysRemaining: $daysRemaining,
        );
    }
}
